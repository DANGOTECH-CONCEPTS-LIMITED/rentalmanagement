import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import axios from 'axios';
import ArrearsAnalytics from './ArrearsAnalytics';

jest.mock('axios');
jest.mock('../../lib/api', () => ({ apiUrl: 'https://example.invalid/api/User/' }));

const http = axios as jest.Mocked<typeof axios>;
const base = 'https://example.invalid/api/Analytics';

const aging = {
  generatedAtUtc: '2026-11-08T00:00:00Z',
  totalOutstanding: 1700000,
  overdueAmount: 1200000,
  buckets: [
    { label: 'Not yet due', fromDaysLate: null, toDaysLate: 0, count: 1, amount: 500000 },
    { label: '1-30 days', fromDaysLate: 1, toDaysLate: 30, count: 1, amount: 500000 },
    { label: '90+ days', fromDaysLate: 91, toDaysLate: null, count: 1, amount: 700000 },
  ],
};

const collections = [
  { month: '2026-10', billed: 500000, collected: 500000, invoices: 1, paidInvoices: 1, collectionRate: 100 },
  { month: '2026-11', billed: 500000, collected: 250000, invoices: 1, paidInvoices: 0, collectionRate: 50 },
];

const debtors = {
  total: 1,
  items: [
    { tenantId: 200, tenantName: 'Jane Tenant', phoneNumber: '256770000001', invoices: 2, outstanding: 900000, oldestDaysLate: 64 },
  ],
};

beforeEach(() => {
  jest.resetAllMocks();
  http.get.mockImplementation((url: string) => {
    if (url.endsWith('/arrears')) return Promise.resolve({ data: aging });
    if (url.endsWith('/collections')) return Promise.resolve({ data: collections });
    if (url.endsWith('/debtors')) return Promise.resolve({ data: debtors });
    return Promise.reject(new Error(`Unexpected url ${url}`));
  });
});

test('loads aging, collections and debtors from the analytics endpoints', async () => {
  render(<ArrearsAnalytics />);

  expect(await screen.findByText('Jane Tenant')).toBeInTheDocument();
  expect(screen.getByText('64')).toBeInTheDocument();

  expect(http.get).toHaveBeenCalledWith(`${base}/arrears`);
  expect(http.get).toHaveBeenCalledWith(`${base}/collections`, { params: { months: 6 } });
  expect(http.get).toHaveBeenCalledWith(`${base}/debtors`, { params: { limit: 10 } });

  // Totals render as whole-shilling currency strings.
  const outstanding = screen.getAllByText(/1,700,000/);
  expect(outstanding.length).toBeGreaterThan(0);
});

test('shows an empty state when nobody owes rent', async () => {
  http.get.mockImplementation((url: string) => {
    if (url.endsWith('/arrears')) {
      return Promise.resolve({ data: { ...aging, totalOutstanding: 0, overdueAmount: 0, buckets: [] } });
    }
    if (url.endsWith('/collections')) return Promise.resolve({ data: [] });
    return Promise.resolve({ data: { items: [], total: 0 } });
  });

  render(<ArrearsAnalytics />);

  expect(
    await screen.findByText('No outstanding balances. Every invoice is settled.'),
  ).toBeInTheDocument();
});
