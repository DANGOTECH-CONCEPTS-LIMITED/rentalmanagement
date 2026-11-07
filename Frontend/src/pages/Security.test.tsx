import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import axios from 'axios';
import Security from './Security';

jest.mock('axios');
jest.mock('../lib/api', () => ({
  apiUrl: 'https://example.invalid',
  getAuthToken: () => 'test-token',
}));

const http = axios as jest.Mocked<typeof axios>;
const headers = { Authorization: 'Bearer test-token' };

beforeEach(() => {
  jest.resetAllMocks();
  http.get.mockResolvedValue({ data: { isEnrolled: false, isEnabled: false, enabledAtUtc: null } });
});

test('shows setup for an account without two-factor and completes enrollment', async () => {
  http.post
    .mockResolvedValueOnce({ data: { secret: 'JBSWY3DPEHPK3PXP', otpAuthUri: 'otpauth://totp/x?secret=JBSWY3DPEHPK3PXP' } })
    .mockResolvedValueOnce({ data: { message: 'enabled' } });

  render(<Security />);

  const setup = await screen.findByRole('button', { name: /set up two-factor/i });
  expect(http.get).toHaveBeenCalledWith('https://example.invalid/Mfa/status', { headers });

  fireEvent.click(setup);

  expect(await screen.findByTestId('mfa-secret')).toHaveTextContent('JBSWY3DPEHPK3PXP');
  expect(http.post).toHaveBeenCalledWith('https://example.invalid/Mfa/enroll', {}, { headers });

  const codeInput = screen.getByLabelText('6-digit code');
  fireEvent.change(codeInput, { target: { value: '123456' } });

  // Status flips to enabled after activation.
  http.get.mockResolvedValue({
    data: { isEnrolled: true, isEnabled: true, enabledAtUtc: new Date().toISOString() },
  });
  fireEvent.click(screen.getByRole('button', { name: /turn on two-factor/i }));

  await waitFor(() =>
    expect(http.post).toHaveBeenCalledWith('https://example.invalid/Mfa/enable', { code: '123456' }, { headers })
  );
  expect(await screen.findByRole('button', { name: /turn off two-factor/i })).toBeInTheDocument();
});

test('an enrolled account can turn two-factor off with a current code', async () => {
  http.get.mockResolvedValue({
    data: { isEnrolled: true, isEnabled: true, enabledAtUtc: new Date().toISOString() },
  });
  http.post.mockResolvedValue({ data: { message: 'disabled' } });

  render(<Security />);

  const disable = await screen.findByRole('button', { name: /turn off two-factor/i });
  expect(disable).toBeDisabled();

  fireEvent.change(screen.getByLabelText('Current 6-digit code'), { target: { value: '654321' } });
  http.get.mockResolvedValue({ data: { isEnrolled: false, isEnabled: false, enabledAtUtc: null } });
  fireEvent.click(disable);

  await waitFor(() =>
    expect(http.post).toHaveBeenCalledWith('https://example.invalid/Mfa/disable', { code: '654321' }, { headers })
  );
  expect(await screen.findByRole('button', { name: /set up two-factor/i })).toBeInTheDocument();
});

test('surfaces the server message when a code is rejected', async () => {
  http.get.mockResolvedValue({ data: { isEnrolled: true, isEnabled: true, enabledAtUtc: null } });
  http.post.mockRejectedValue({
    isAxiosError: true,
    response: { status: 400, data: { message: 'Invalid code.' } },
  });
  jest.spyOn(axios, 'isAxiosError').mockReturnValue(true);

  render(<Security />);

  fireEvent.change(await screen.findByLabelText('Current 6-digit code'), { target: { value: '000000' } });
  fireEvent.click(screen.getByRole('button', { name: /turn off two-factor/i }));

  expect(await screen.findByRole('alert')).toHaveTextContent('Invalid code.');
});
