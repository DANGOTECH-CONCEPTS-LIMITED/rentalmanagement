import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import axios from 'axios';
import Deposits from './Deposits';

jest.mock('axios');
jest.mock('../../lib/api', () => ({ apiUrl: 'https://example.invalid/api/User/' }));

const http = axios as jest.Mocked<typeof axios>;
const endpoint = 'https://example.invalid/api/Deposits';

const depositRow = {
  id: 1,
  rentalContractId: 300,
  tenantId: 200,
  tenantName: 'Jane Tenant',
  propertyName: 'Plot 12',
  amountHeld: 1000000,
  deductedAmount: 0,
  refundAmount: 0,
  status: 'HELD',
  contractEndDate: '2026-11-30T00:00:00',
  settledAtUtc: null,
};

const statement = {
  rentalContractId: 300,
  depositId: 1,
  status: 'HELD',
  amountHeld: 1000000,
  outstandingArrears: 500000,
  unpaidInvoices: 1,
  deductions: [
    { id: 7, category: 'DAMAGE', amount: 150000, description: 'Broken window', createdAtUtc: '2026-11-01T00:00:00Z', createdBy: 'admin' },
  ],
  totalDeductions: 150000,
  refundable: 350000,
  shortfall: 0,
  contractEndDate: '2026-11-30T00:00:00',
  settledAtUtc: null,
  notes: null,
};

beforeEach(() => {
  jest.resetAllMocks();
  http.get.mockImplementation((url: string) =>
    Promise.resolve({
      data: url === endpoint
        ? { items: [depositRow], page: 1, pageSize: 25, total: 1 }
        : statement,
    }),
  );
  http.post.mockResolvedValue({ data: { status: 'SETTLED', appliedToArrears: 500000, appliedToDeductions: 150000, refund: 350000, shortfall: 0 } });
  http.delete.mockResolvedValue({ data: { message: 'Deduction removed.' } });
});

test('lists held deposits and opens the move-out statement', async () => {
  render(<Deposits />);

  expect(await screen.findByText('Jane Tenant')).toBeInTheDocument();
  expect(screen.getByText('1 currently held')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Open move-out statement for contract 300' }));

  expect(await screen.findByText('Move-out statement')).toBeInTheDocument();
  expect(await screen.findByText('Broken window')).toBeInTheDocument();
  expect(http.get).toHaveBeenCalledWith(`${endpoint}/300`);
});

test('adds a deduction against the deposit', async () => {
  render(<Deposits />);
  await screen.findByText('Jane Tenant');
  fireEvent.click(screen.getByRole('button', { name: 'Open move-out statement for contract 300' }));
  await screen.findByText('Broken window');

  fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '25000' } });
  fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Missing key' } });
  fireEvent.click(screen.getByRole('button', { name: /Add deduction/i }));

  await waitFor(() =>
    expect(http.post).toHaveBeenCalledWith(`${endpoint}/300/deductions`, {
      category: 'DAMAGE',
      amount: 25000,
      description: 'Missing key',
    }),
  );
});

test('settles the deposit and reports the refund', async () => {
  render(<Deposits />);
  await screen.findByText('Jane Tenant');
  fireEvent.click(screen.getByRole('button', { name: 'Open move-out statement for contract 300' }));
  await screen.findByText('Broken window');

  fireEvent.change(screen.getByLabelText('Settlement notes'), { target: { value: 'Keys returned' } });
  fireEvent.click(screen.getByRole('button', { name: /Settle & move out/i }));

  await waitFor(() =>
    expect(http.post).toHaveBeenCalledWith(`${endpoint}/300/settle`, { notes: 'Keys returned' }),
  );
});
