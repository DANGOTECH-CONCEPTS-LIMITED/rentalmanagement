import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import axios from 'axios';
import ExceptionQueue from './ExceptionQueue';

jest.mock('axios');
jest.mock('../../lib/api', () => ({ apiUrl: 'https://example.invalid/api/User/' }));

const http = axios as jest.Mocked<typeof axios>;
const endpoint = 'https://example.invalid/api/AdminExceptions';

const emptyCounts = {
  bill_payment_failed: 0,
  bill_payment_unconfirmed: 0,
  bill_payment_undebited: 0,
  bill_payment_stuck_submission: 0,
  collection_not_credited: 0,
  collection_unbilled: 0,
};

const failedItem = {
  category: 'bill_payment_failed',
  id: 7,
  reference: 'DANGO_B_REF_7',
  meterNumber: 'meter-1',
  nwscAccount: '12345678',
  amount: 6000,
  status: 'FAILED',
  reason: 'provider rejected request',
  occurredAtUtc: new Date().toISOString(),
  ageMinutes: 75,
  actionHint: 'Retry it from the wallet statement.',
};

function renderPage() {
  return render(
    <MemoryRouter>
      <ExceptionQueue />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  jest.resetAllMocks();
  http.get.mockResolvedValue({
    data: { generatedAtUtc: new Date().toISOString(), counts: emptyCounts, items: [], total: 0 },
  });
});

test('loads the queue from the normalized base URL and shows the empty state', async () => {
  renderPage();

  await waitFor(() => expect(http.get).toHaveBeenCalled());
  expect(http.get).toHaveBeenCalledWith(endpoint, {
    params: { category: undefined, page: 1, pageSize: 25 },
  });
  expect(await screen.findByText('No exceptions. Every payment flow is settled.')).toBeInTheDocument();
});

test('renders counts and exceptions, and filters by category on click', async () => {
  http.get.mockResolvedValueOnce({
    data: {
      generatedAtUtc: new Date().toISOString(),
      counts: { ...emptyCounts, bill_payment_failed: 1 },
      items: [failedItem],
      total: 1,
    },
  });
  http.get.mockResolvedValue({
    data: {
      generatedAtUtc: new Date().toISOString(),
      counts: { ...emptyCounts, bill_payment_failed: 1 },
      items: [failedItem],
      total: 1,
    },
  });

  renderPage();

  expect(await screen.findByText('DANGO_B_REF_7')).toBeInTheDocument();
  expect(screen.getByText('1h 15m')).toBeInTheDocument();
  expect(screen.getByText('provider rejected request')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: /Bill payment failed/ }));

  await waitFor(() =>
    expect(http.get).toHaveBeenLastCalledWith(endpoint, {
      params: { category: 'bill_payment_failed', page: 1, pageSize: 25 },
    }),
  );
  expect(screen.getByRole('button', { name: /Bill payment failed/ })).toHaveAttribute('aria-pressed', 'true');
});

test('surfaces the server message when the request fails', async () => {
  http.get.mockReset();
  http.get.mockImplementation(() => {
    const error = new Error('Request failed with status code 403');
    Object.assign(error, {
      isAxiosError: true,
      response: { status: 403, data: { message: 'Forbidden: administrator role required.' } },
    });
    return Promise.reject(error);
  });
  const isAxiosError = jest.spyOn(axios, 'isAxiosError').mockReturnValue(true);

  renderPage();

  expect(await screen.findByRole('alert')).toHaveTextContent('Forbidden: administrator role required.');
  isAxiosError.mockRestore();
});
