import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import axios from 'axios';
import RentInvoices from './RentInvoices';

jest.mock('axios');
jest.mock('../../lib/api', () => ({ apiUrl: 'https://example.invalid/api/User/' }));

const http = axios as jest.Mocked<typeof axios>;
const endpoint = 'https://example.invalid/api/RentInvoices';

const invoice = {
  id: 9,
  invoiceNumber: 'RENT-2026-11-00300',
  period: '2026-11',
  tenantId: 200,
  tenantName: 'Jane Tenant',
  tenantPhone: '256770000001',
  propertyName: 'Plot 12',
  amount: 800000,
  amountPaid: 300000,
  balance: 500000,
  status: 'PARTIALLY_PAID',
  dueDate: '2026-11-05T00:00:00',
  dunningLevel: 0,
  lastDunningAtUtc: null,
};

const summary = {
  totalBilled: 1600000,
  totalPaid: 300000,
  outstanding: 1300000,
  overdue: 0,
  openCount: 1,
  partiallyPaidCount: 1,
  paidCount: 0,
  overdueCount: 0,
};

beforeEach(() => {
  jest.resetAllMocks();
  http.get.mockImplementation((url: string) =>
    Promise.resolve({
      data: url.endsWith('/summary')
        ? summary
        : { items: [invoice], page: 1, pageSize: 25, total: 1 },
    }),
  );
  http.post.mockResolvedValue({ data: { created: 1, message: '1 invoice(s) generated.' } });
});

test('shows the summary, the invoices and their balance', async () => {
  render(<RentInvoices />);

  expect(await screen.findByText('RENT-2026-11-00300')).toBeInTheDocument();
  expect(screen.getByText('Jane Tenant')).toBeInTheDocument();
  expect(screen.getByText('PARTIALLY PAID')).toBeInTheDocument();
  expect(http.get).toHaveBeenCalledWith(endpoint, { params: { status: undefined, page: 1, pageSize: 25 } });
  expect(http.get).toHaveBeenCalledWith(`${endpoint}/summary`);
});

test('generates invoices from the toolbar action', async () => {
  render(<RentInvoices />);
  await screen.findByText('RENT-2026-11-00300');

  fireEvent.click(screen.getByRole('button', { name: /Generate invoices/i }));

  await waitFor(() => expect(http.post).toHaveBeenCalledWith(`${endpoint}/generate`));
});

test('records a payment for the selected invoice', async () => {
  http.post.mockResolvedValueOnce({ data: { applied: 500000, status: 'PAID', balance: 0 } });
  render(<RentInvoices />);
  await screen.findByText('RENT-2026-11-00300');

  fireEvent.click(screen.getByRole('button', { name: 'Record payment for RENT-2026-11-00300' }));
  fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '500000' } });
  fireEvent.click(screen.getByRole('button', { name: /^Record payment$/i }));

  await waitFor(() =>
    expect(http.post).toHaveBeenCalledWith(`${endpoint}/9/pay`, { amount: 500000 }),
  );
});
