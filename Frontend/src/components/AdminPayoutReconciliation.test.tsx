import '@testing-library/jest-dom';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import axios from 'axios';
import AdminPayoutReconciliation from './AdminPayoutReconciliation';

jest.mock('axios');
const http = axios as jest.Mocked<typeof axios>;
const props = { apiUrl: 'https://example.invalid/api/User/', authToken: 'test-token' };
const endpoint = 'https://example.invalid/api/AdminPayoutReconciliation';
const payout = { id: 42, transactionId: 'PAYOUT-42', amount: 1500, status: 'PENDING', vendorReference: 'DANGO-42', owner: 'Owner One' };
const page = { items: [payout], page: 1, pageSize: 20, hasMore: false };

beforeEach(() => {
  jest.resetAllMocks();
  http.get.mockResolvedValue({ data: page });
  http.post.mockResolvedValue({ data: { transactionId: payout.transactionId, status: 'REVERSED', amount: payout.amount } });
});

async function load() {
  render(<AdminPayoutReconciliation {...props} />);
  await screen.findByRole('button', { name: 'Review reversal for PAYOUT-42' });
}

function openConfirmation() {
  fireEvent.click(screen.getByRole('button', { name: 'Review reversal for PAYOUT-42' }));
  return within(screen.getByRole('dialog'));
}

function fillConfirmation() {
  const dialog = openConfirmation();
  fireEvent.change(dialog.getByLabelText('Reason and verification evidence'), { target: { value: '  Verified unpaid with provider support  ' } });
  fireEvent.change(dialog.getByLabelText('Type the transaction ID to confirm'), { target: { value: payout.transactionId } });
  fireEvent.click(dialog.getByRole('checkbox'));
  return dialog;
}

test('loads authenticated pending payouts from the normalized base without reversing automatically', async () => {
  await load();
  expect(http.get).toHaveBeenCalledWith(endpoint, {
    headers: { Authorization: 'Bearer test-token' }, params: { page: 1, pageSize: 20 }, signal: expect.any(AbortSignal),
  });
  expect(screen.getByText('Owner One')).toBeInTheDocument();
  expect(screen.getByText('1,500')).toBeInTheDocument();
  expect(screen.getByText(/404 \/ not-found response is not automatically terminal/)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Previous payouts' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Next payouts' })).toBeDisabled();
  expect(http.post).not.toHaveBeenCalled();
});

test('requires reason, exact transaction ID and explicit unpaid acknowledgment; cancellation does nothing', async () => {
  await load();
  const dialog = openConfirmation();
  expect(dialog.getByText('PAYOUT-42')).toBeInTheDocument();
  expect(dialog.getByText('DANGO-42')).toBeInTheDocument();
  expect(dialog.getByText('Owner One')).toBeInTheDocument();
  expect(dialog.getByText('1,500')).toBeInTheDocument();
  expect(dialog.getByText(/late payout could still arrive/)).toBeInTheDocument();
  const submit = dialog.getByRole('button', { name: 'Fail payout and refund' });
  expect(submit).toBeDisabled();
  fireEvent.change(dialog.getByLabelText('Reason and verification evidence'), { target: { value: '   ' } });
  fireEvent.click(dialog.getByRole('checkbox'));
  fireEvent.change(dialog.getByLabelText('Type the transaction ID to confirm'), { target: { value: payout.transactionId } });
  expect(submit).toBeDisabled();
  fireEvent.change(dialog.getByLabelText('Reason and verification evidence'), { target: { value: 'Verified with support' } });
  fireEvent.change(dialog.getByLabelText('Type the transaction ID to confirm'), { target: { value: 'wrong' } });
  expect(submit).toBeDisabled();
  fireEvent.change(dialog.getByLabelText('Type the transaction ID to confirm'), { target: { value: payout.transactionId } });
  fireEvent.click(dialog.getByRole('checkbox'));
  expect(submit).toBeDisabled();
  fireEvent.click(dialog.getByRole('checkbox'));
  expect(submit).toBeEnabled();
  fireEvent.click(dialog.getByRole('button', { name: 'Cancel' }));
  expect(http.post).not.toHaveBeenCalled();
  const reopened = openConfirmation();
  expect(reopened.getByRole('checkbox')).not.toBeChecked();
  expect(reopened.getByLabelText('Reason and verification evidence')).toHaveValue('');
});

test('submits the explicit confirmation once and removes only the reversed row', async () => {
  let resolve: (value: unknown) => void = () => undefined;
  http.post.mockReturnValue(new Promise(done => { resolve = done; }));
  await load();
  const dialog = fillConfirmation();
  const submit = dialog.getByRole('button', { name: 'Fail payout and refund' });
  fireEvent.click(submit);
  fireEvent.click(submit);
  expect(http.post).toHaveBeenCalledTimes(1);
  expect(http.post).toHaveBeenCalledWith(`${endpoint}/42/fail-and-reverse`, {
    reason: 'Verified unpaid with provider support', confirmUnpaid: true, confirmedTransactionId: 'PAYOUT-42',
  }, { headers: { Authorization: 'Bearer test-token' } });
  expect(dialog.getByRole('button', { name: 'Reversing…' })).toBeDisabled();
  expect(dialog.getByRole('button', { name: 'Cancel' })).toBeDisabled();
  fireEvent.click(dialog.getByRole('button', { name: 'Close' }));
  expect(screen.getByRole('dialog')).toBeInTheDocument();
  await act(async () => resolve({ data: { transactionId: payout.transactionId, status: 'REVERSED', amount: payout.amount } }));
  expect(await screen.findByText(/Transaction PAYOUT-42 reversed/)).toHaveTextContent('No payout was resubmitted');
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Review reversal for PAYOUT-42' })).not.toBeInTheDocument();
  expect(http.get).toHaveBeenCalledTimes(1);
});

test.each([409, 500])('locks reversal after a POST %s until a successful fresh list and fresh confirmation', async status => {
  http.isAxiosError.mockReturnValue(true);
  http.post.mockRejectedValueOnce({ response: { status } });
  await load();
  const dialog = fillConfirmation();
  fireEvent.click(dialog.getByRole('button', { name: 'Fail payout and refund' }));
  const alert = await screen.findByRole('alert');
  expect(alert).toHaveTextContent('Refresh the list before retrying');
  expect(alert).toHaveTextContent(status === 409 ? 'status or provider response changed' : 'request may have completed');
  expect(screen.getByRole('button', { name: 'Review reversal for PAYOUT-42' })).toBeDisabled();
  http.get.mockRejectedValueOnce(new Error('offline'));
  fireEvent.click(screen.getByRole('button', { name: 'Refresh payouts' }));
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Unable to load payouts'));
  expect(screen.queryByRole('button', { name: 'Review reversal for PAYOUT-42' })).not.toBeInTheDocument();
  expect(screen.getByText(/Actions are locked/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Refresh payouts' }));
  expect(await screen.findByRole('button', { name: 'Review reversal for PAYOUT-42' })).toBeEnabled();
  const freshDialog = openConfirmation();
  expect(freshDialog.getByRole('button', { name: 'Fail payout and refund' })).toBeDisabled();
  expect(freshDialog.getByRole('checkbox')).not.toBeChecked();
  expect(http.post).toHaveBeenCalledTimes(1);
});

test('treats an unconfirmed success response as uncertain and requires refresh', async () => {
  http.post.mockResolvedValueOnce({ data: { transactionId: 'other-payout', status: 'REVERSED', amount: 1500 } });
  await load();
  const dialog = fillConfirmation();
  fireEvent.click(dialog.getByRole('button', { name: 'Fail payout and refund' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Unable to confirm reversal');
  expect(screen.getByRole('button', { name: 'Review reversal for PAYOUT-42' })).toBeDisabled();
  expect(screen.queryByText(/Transaction PAYOUT-42 reversed/)).not.toBeInTheDocument();
});

test('searches only on submission with an exact reference, paginates, and resets page on a new search', async () => {
  http.get.mockResolvedValue({ data: { ...page, hasMore: true } });
  await load();
  fireEvent.change(screen.getByLabelText('Exact reference'), { target: { value: 'DANGO-42' } });
  expect(http.get).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole('button', { name: 'Search payouts' }));
  await waitFor(() => expect(http.get).toHaveBeenCalledTimes(2));
  expect(http.get.mock.calls[1][1]?.params).toEqual({ reference: 'DANGO-42', page: 1, pageSize: 20 });
  await screen.findByRole('button', { name: 'Review reversal for PAYOUT-42' });
  http.get.mockResolvedValueOnce({ data: { ...page, page: 2 } });
  fireEvent.click(screen.getByRole('button', { name: 'Next payouts' }));
  expect(await screen.findByText('Page 2')).toBeInTheDocument();
  expect(http.get.mock.calls[2][1]?.params).toEqual({ reference: 'DANGO-42', page: 2, pageSize: 20 });
  fireEvent.click(screen.getByRole('button', { name: 'Previous payouts' }));
  expect(await screen.findByText('Page 1')).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Exact reference'), { target: { value: '' } });
  fireEvent.click(screen.getByRole('button', { name: 'Search payouts' }));
  await waitFor(() => expect(http.get).toHaveBeenCalledTimes(5));
  expect(http.get.mock.calls[4][1]?.params).toEqual({ page: 1, pageSize: 20 });
});

test('shows loading and empty results, and supports explicit refresh', async () => {
  http.get.mockReturnValueOnce(new Promise(() => undefined));
  const { unmount } = render(<AdminPayoutReconciliation {...props} />);
  expect(screen.getByRole('status')).toHaveTextContent('Loading payouts');
  expect(screen.getByRole('button', { name: 'Refresh payouts' })).toBeDisabled();
  const signal = http.get.mock.calls[0][1]?.signal as AbortSignal;
  unmount();
  expect(signal.aborted).toBe(true);
  http.get.mockResolvedValue({ data: { ...page, items: [] } });
  render(<AdminPayoutReconciliation {...props} />);
  expect(await screen.findByText('No pending Dango payouts found.')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Refresh payouts' }));
  await waitFor(() => expect(http.get).toHaveBeenCalledTimes(3));
});

test.each([{ ...page, items: [{ ...payout, amount: -1500 }] }, { ...page, items: null }])('fails closed for malformed list data', async data => {
  http.get.mockResolvedValueOnce({ data });
  render(<AdminPayoutReconciliation {...props} />);
  expect(await screen.findByRole('alert')).toHaveTextContent('Unable to load payouts');
  expect(screen.queryByRole('button', { name: 'Review reversal for PAYOUT-42' })).not.toBeInTheDocument();
});

test.each([{ ...props, authToken: '' }, { ...props, apiUrl: '' }])('does not request payouts without API configuration and authentication', async configuration => {
  render(<AdminPayoutReconciliation {...configuration} />);
  expect(await screen.findByRole('alert')).toHaveTextContent('Sign in');
  expect(http.get).not.toHaveBeenCalled();
});

test('discards an open confirmation when credentials change', async () => {
  const { rerender } = render(<AdminPayoutReconciliation {...props} />);
  await screen.findByRole('button', { name: 'Review reversal for PAYOUT-42' });
  fillConfirmation();
  rerender(<AdminPayoutReconciliation {...props} authToken="different-admin" />);
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  await screen.findByRole('button', { name: 'Review reversal for PAYOUT-42' });
  expect(http.get.mock.calls[1][1]?.headers).toEqual({ Authorization: 'Bearer different-admin' });
  expect(http.post).not.toHaveBeenCalled();
});
