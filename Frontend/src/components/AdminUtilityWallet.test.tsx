import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import axios from 'axios';
import AdminUtilityWallet from './AdminUtilityWallet';

jest.mock('axios');
jest.mock('@/lib/wallet-statement-export', () => ({ exportWalletStatementCsv: jest.fn(), exportWalletStatementPdf: jest.fn() }));
const http = axios as jest.Mocked<typeof axios>;
const props = { account: { id: 4, fullName: 'Utility Alpha', systemRoleId: 4 }, apiUrl: 'https://example.invalid', authToken: 'admin-test' };
beforeEach(() => {
  jest.resetAllMocks();
  http.get.mockImplementation(async (url) => ({ data: url.includes('GetBalance') ? { balance: 5000 } : [] }));
  http.post.mockResolvedValue({ data: 'Withdrawal successful.' });
});
async function fill() {
  await waitFor(() => expect(screen.getByLabelText('Withdrawal amount')).toBeEnabled());
  fireEvent.change(screen.getByLabelText('Withdrawal amount'), { target: { value: '1000' } });
  fireEvent.change(screen.getByLabelText('Withdrawal reason'), { target: { value: ' Meter repair ' } });
}
test('loads only the selected owner wallet with admin authentication', async () => {
  render(<AdminUtilityWallet {...props} />);
  await fill();
  expect(http.get).toHaveBeenCalledWith(`${props.apiUrl}/GetBalance/4`, expect.objectContaining({ headers: { Authorization: 'Bearer admin-test' }, signal: expect.any(AbortSignal) }));
  expect(http.get).toHaveBeenCalledWith(`${props.apiUrl}/GetStatement/4`, expect.anything());
});
test('requires confirmation and submits once to the explicit admin owner endpoint', async () => {
  render(<AdminUtilityWallet {...props} />);
  await fill();
  fireEvent.click(screen.getByRole('button', { name: 'Review withdrawal' }));
  expect(http.post).not.toHaveBeenCalled();
  const confirm = screen.getByRole('button', { name: 'Confirm withdrawal' });
  fireEvent.click(confirm);
  fireEvent.click(confirm);
  await screen.findByText(/Withdrawal submitted/);
  expect(http.post).toHaveBeenCalledTimes(1);
  expect(http.post).toHaveBeenCalledWith(`${props.apiUrl}/AdminWithdrawUtilityWallet`, { sourceUserId: 4, amount: 1000, description: 'Meter repair' }, expect.objectContaining({ headers: { Authorization: 'Bearer admin-test' } }));
});
test.each(['0', '-1', '5001', '1.001'])('blocks invalid or unaffordable amount %s', async (amount) => {
  render(<AdminUtilityWallet {...props} />);
  await fill();
  fireEvent.change(screen.getByLabelText('Withdrawal amount'), { target: { value: amount } });
  expect(screen.getByRole('button', { name: 'Review withdrawal' })).toBeDisabled();
  expect(http.post).not.toHaveBeenCalled();
});
test('account switch clears pending confirmation, inputs and old wallet responses', async () => {
  const { rerender } = render(<AdminUtilityWallet {...props} />);
  await fill();
  fireEvent.click(screen.getByRole('button', { name: 'Review withdrawal' }));
  rerender(<AdminUtilityWallet {...props} account={{ id: 5, fullName: 'Utility Beta', systemRoleId: 4 }} />);
  await waitFor(() => expect(screen.getByLabelText('Withdrawal amount')).toBeEnabled());
  expect(screen.queryByRole('button', { name: 'Confirm withdrawal' })).not.toBeInTheDocument();
  expect(screen.getByLabelText('Withdrawal amount')).toHaveValue(null);
  expect(screen.getByLabelText('Withdrawal reason')).toHaveValue('');
  expect(http.post).not.toHaveBeenCalled();
  expect(http.get).toHaveBeenCalledWith(`${props.apiUrl}/GetBalance/5`, expect.anything());
});
test('failure does not retry payout automatically and requires refresh before another attempt', async () => {
  http.post.mockRejectedValueOnce(new Error('offline'));
  render(<AdminUtilityWallet {...props} />);
  await fill();
  fireEvent.click(screen.getByRole('button', { name: 'Review withdrawal' }));
  fireEvent.click(screen.getByRole('button', { name: 'Confirm withdrawal' }));
  await screen.findByRole('alert');
  expect(http.post).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('button', { name: 'Review withdrawal' })).toBeDisabled();
});
