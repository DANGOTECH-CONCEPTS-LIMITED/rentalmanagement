import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import axios from 'axios';
import MeterLienPanel from './MeterLienPanel';

jest.mock('axios');
const http = axios as jest.Mocked<typeof axios>;
const summary = {
  meterId: 7, meterNumber: 'METER007', totalAmount: 10000, amountPaid: 2000, balance: 8000,
  repaymentMode: 'FullFirst', repaymentPercentage: 100,
  liens: [{ id: 1, amount: 10000, amountPaid: 2000, balance: 8000, description: 'Meter installation', createdAt: '2026-10-22T12:00:00' }],
  repayments: [{ paymentId: 12, transactionId: 'TX12', paymentAmount: 3000, lienAmount: 2000, tokenAmount: 1000, createdAt: '2026-10-22T12:05:00' }],
};
const props = { meterId: 7, apiUrl: 'https://example.invalid/api/User', authToken: 'test-token' };

beforeEach(() => {
  jest.resetAllMocks();
  http.get.mockResolvedValue({ data: summary });
  http.post.mockResolvedValue({ data: summary });
  http.put.mockResolvedValue({ data: summary });
});

async function load() {
  render(<MeterLienPanel {...props} />);
  await screen.findByText('Meter installation');
}

test('loads the selected meter with authorization and displays lien and repayment history', async () => {
  await load();
  expect(http.get).toHaveBeenCalledWith(`${props.apiUrl}/GetMeterLien/7`, expect.objectContaining({
    headers: { Authorization: 'Bearer test-token' }, signal: expect.any(AbortSignal),
  }));
  expect(screen.getByText('TX12')).toBeInTheDocument();
  expect(screen.getAllByText('8,000.00')).toHaveLength(2);
  expect(screen.getByRole('columnheader', { name: 'Token allocation' })).toBeInTheDocument();
});

test('adds a pay-first lien only to the selected meter and clears the form', async () => {
  await load();
  fireEvent.change(screen.getByLabelText('Lien amount'), { target: { value: '5000' } });
  fireEvent.change(screen.getByLabelText('Reason'), { target: { value: ' Repairs ' } });
  fireEvent.click(screen.getByRole('button', { name: 'Add lien' }));
  await screen.findByText('Lien added.');
  expect(http.post).toHaveBeenCalledWith(`${props.apiUrl}/AddMeterLien/7`, {
    amount: 5000, description: 'Repairs', repaymentMode: 'FullFirst', repaymentPercentage: 100,
  }, { headers: { Authorization: 'Bearer test-token' } });
  expect(screen.getByLabelText('Lien amount')).toHaveValue(null);
});

test('saves a configurable percentage policy without creating another lien', async () => {
  await load();
  fireEvent.change(screen.getByLabelText('Repayment mode'), { target: { value: 'Percentage' } });
  fireEvent.change(screen.getByLabelText('Payment towards lien (%)'), { target: { value: '25' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save repayment policy' }));
  await screen.findByText('Repayment policy saved.');
  expect(http.put).toHaveBeenCalledWith(`${props.apiUrl}/SetMeterLienPolicy/7`, {
    repaymentMode: 'Percentage', repaymentPercentage: 25,
  }, { headers: { Authorization: 'Bearer test-token' } });
  expect(http.post).not.toHaveBeenCalled();
});

test.each(['0', '-1', '101', '', '0.001', '25.555'])('rejects invalid repayment percentage %s', async (value) => {
  await load();
  fireEvent.change(screen.getByLabelText('Repayment mode'), { target: { value: 'Percentage' } });
  fireEvent.change(screen.getByLabelText('Payment towards lien (%)'), { target: { value } });
  fireEvent.click(screen.getByRole('button', { name: 'Save repayment policy' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Repayment percentage must be greater than 0');
  expect(http.put).not.toHaveBeenCalled();
});

test.each(['0', '-1', '1.001', ''])('rejects invalid lien amount %s', async (value) => {
  await load();
  fireEvent.change(screen.getByLabelText('Lien amount'), { target: { value } });
  fireEvent.change(screen.getByLabelText('Reason'), { target: { value: 'Repairs' } });
  fireEvent.submit(screen.getByRole('button', { name: 'Add lien' }).closest('form')!);
  expect(await screen.findByRole('alert')).toHaveTextContent('Lien amount must be greater than zero');
  expect(http.post).not.toHaveBeenCalled();
});

test('rejects a blank reason without creating a lien', async () => {
  await load();
  fireEvent.change(screen.getByLabelText('Lien amount'), { target: { value: '1500' } });
  fireEvent.change(screen.getByLabelText('Reason'), { target: { value: '   ' } });
  fireEvent.submit(screen.getByRole('button', { name: 'Add lien' }).closest('form')!);
  expect(await screen.findByRole('alert')).toHaveTextContent('Enter a reason');
  expect(http.post).not.toHaveBeenCalled();
});

test('retains entered lien details when saving fails and permits retry', async () => {
  http.post.mockRejectedValueOnce(new Error('offline'));
  await load();
  fireEvent.change(screen.getByLabelText('Lien amount'), { target: { value: '1500' } });
  fireEvent.change(screen.getByLabelText('Reason'), { target: { value: 'Repairs' } });
  fireEvent.click(screen.getByRole('button', { name: 'Add lien' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Unable to update meter liens');
  expect(screen.getByLabelText('Lien amount')).toHaveValue(1500);
  await waitFor(() => expect(screen.getByRole('button', { name: 'Add lien' })).toBeEnabled());
  fireEvent.click(screen.getByRole('button', { name: 'Add lien' }));
  await screen.findByText('Lien added.');
  expect(http.post).toHaveBeenCalledTimes(2);
});

test('does not offer mutation controls when initial loading fails', async () => {
  http.get.mockRejectedValueOnce(new Error('offline'));
  render(<MeterLienPanel {...props} />);
  await screen.findByRole('alert');
  expect(screen.queryByRole('button', { name: 'Add lien' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
  await screen.findByText('Meter installation');
  expect(http.get).toHaveBeenCalledTimes(2);
});
