import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import axios from 'axios';
import BillPaymentSettings from './BillPaymentSettings';

jest.mock('axios');
const http = axios as jest.Mocked<typeof axios>;
const props = { apiUrl: 'https://example.invalid/api/User', authToken: 'test-token' };
const endpoint = 'https://example.invalid/api/PaymentProviderSettings/biller';
const loaded = {
  serviceId: 'NWSC', transtype: 'BILLPAY', productCode: 'PROD', tin: 'TIN', uedlid: '', processId: '',
  location: 'Kampala', narrative: 'NWSC bill payment', autoBillPaymentsEnabled: false, configured: true,
};

beforeEach(() => {
  jest.resetAllMocks();
  http.get.mockResolvedValue({ data: loaded });
  http.put.mockResolvedValue({ data: { ...loaded, autoBillPaymentsEnabled: true } });
});

async function load() {
  render(<BillPaymentSettings {...props} />);
  await screen.findByLabelText('Service ID');
}

test('loads saved biller settings with authentication and explains the debit timing', async () => {
  await load();
  expect(http.get).toHaveBeenCalledWith(endpoint, { headers: { Authorization: 'Bearer test-token' }, signal: expect.any(AbortSignal) });
  expect(screen.getByLabelText('Service ID')).toHaveValue('NWSC');
  expect(screen.getByLabelText('Transtype')).toHaveValue('BILLPAY');
  expect(screen.getByText(/debited only after Dango confirms/i)).toBeInTheDocument();
  expect(screen.getByText(/only while Dango Payment API is active/i)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Save biller settings' })).toBeDisabled();
});

test('saves values and reports that automatic bill payments are enabled', async () => {
  await load();
  fireEvent.change(screen.getByLabelText('Product code'), { target: { value: 'NEW-PRODUCT' } });
  fireEvent.click(screen.getByLabelText(/Enable automatic NWSC bill payments/));
  fireEvent.click(screen.getByRole('button', { name: 'Save biller settings' }));
  await screen.findByText(/Future meter payments .* pay the bill automatically/);
  expect(http.put).toHaveBeenCalledWith(endpoint, expect.objectContaining({
    serviceId: 'NWSC', transtype: 'BILLPAY', productCode: 'NEW-PRODUCT', autoBillPaymentsEnabled: true,
  }), { headers: { Authorization: 'Bearer test-token' } });
  expect(screen.getByRole('button', { name: 'Save biller settings' })).toBeDisabled();
});

test('does not report success when saving fails and requires a reload before retrying', async () => {
  http.put.mockRejectedValueOnce(new Error('offline'));
  await load();
  fireEvent.change(screen.getByLabelText('Service ID'), { target: { value: '' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save biller settings' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Unable to save biller settings');
  expect(screen.queryByText(/Saved\./)).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Reload biller settings' }));
  await waitFor(() => expect(screen.getByLabelText('Service ID')).toHaveValue('NWSC'));
});

test('does not request settings without authentication', async () => {
  render(<BillPaymentSettings {...props} authToken="" />);
  expect(await screen.findByRole('alert')).toHaveTextContent('Sign in');
  expect(http.get).not.toHaveBeenCalled();
});
