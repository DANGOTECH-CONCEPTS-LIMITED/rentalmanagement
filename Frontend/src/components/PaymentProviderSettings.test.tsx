import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import axios from 'axios';
import PaymentProviderSettings from './PaymentProviderSettings';

jest.mock('axios');
const http = axios as jest.Mocked<typeof axios>;
const props = { apiUrl: 'https://example.invalid/api/User', authToken: 'test-token' };
const endpoint = 'https://example.invalid/api/PaymentProviderSettings';

beforeEach(() => {
  jest.resetAllMocks();
  http.get.mockResolvedValue({ data: { provider: 'Collecto', dangoConfigured: true } });
  http.put.mockResolvedValue({ data: { provider: 'DangoPayment', dangoConfigured: true } });
});

async function load() {
  render(<PaymentProviderSettings {...props} />);
  await screen.findByRole('combobox', { name: 'Provider for new transactions' });
}

test('loads persisted settings with authentication and explains transaction affinity', async () => {
  await load();
  expect(http.get).toHaveBeenCalledWith(endpoint, {
    headers: { Authorization: 'Bearer test-token' }, signal: expect.any(AbortSignal),
  });
  expect(screen.getByRole('combobox')).toHaveValue('Collecto');
  expect(screen.getByText(/Already submitted transactions stay with their original provider/)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Save payment provider' })).toBeDisabled();
});

test('saves a manual switch and displays the confirmed provider', async () => {
  await load();
  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'DangoPayment' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save payment provider' }));
  await screen.findByText(/Payment provider saved/);
  expect(http.put).toHaveBeenCalledWith(endpoint, { provider: 'DangoPayment' }, {
    headers: { Authorization: 'Bearer test-token' },
  });
  expect(screen.getByRole('button', { name: 'Save payment provider' })).toBeDisabled();
});

test('loads an active Dango provider and switches back to Collecto', async () => {
  http.get.mockResolvedValue({ data: { provider: 'DangoPayment', dangoConfigured: true } });
  http.put.mockResolvedValue({ data: { provider: 'Collecto', dangoConfigured: true } });
  await load();
  expect(screen.getByRole('combobox')).toHaveValue('DangoPayment');
  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Collecto' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save payment provider' }));
  await screen.findByText(/Payment provider saved/);
  expect(screen.getByRole('combobox')).toHaveValue('Collecto');
  expect(http.put.mock.calls[0][1]).toEqual({ provider: 'Collecto' });
});

test('disables Dango until the server is configured', async () => {
  http.get.mockResolvedValue({ data: { provider: 'Collecto', dangoConfigured: false } });
  await load();
  expect(screen.getByRole('option', { name: 'Dango Payment API' })).toBeDisabled();
  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'DangoPayment' } });
  expect(screen.getByRole('button', { name: 'Save payment provider' })).toBeDisabled();
  expect(http.put).not.toHaveBeenCalled();
});

test('does not display a successful switch when persistence fails and permits reloading', async () => {
  http.put.mockRejectedValueOnce(new Error('offline'));
  await load();
  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'DangoPayment' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save payment provider' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Unable to change payment provider');
  expect(screen.queryByText(/Payment provider saved/)).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Reload provider settings' }));
  await waitFor(() => expect(screen.getByRole('combobox')).toHaveValue('Collecto'));
});

test('allows retry after a load failure without permitting a blind switch', async () => {
  http.get.mockRejectedValueOnce(new Error('offline'));
  render(<PaymentProviderSettings {...props} />);
  expect(await screen.findByRole('alert')).toHaveTextContent('Unable to load');
  expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Reload provider settings' }));
  expect(await screen.findByRole('combobox')).toHaveValue('Collecto');
});

test('saves operator prefix rules and network codes while Collecto remains active', async () => {
  const mobileNetworks = [{ name: 'MTN', prefixes: ['25677'], networkCode: '' }, { name: 'Airtel', prefixes: ['25670'], networkCode: '' }];
  http.get.mockResolvedValue({ data: { provider: 'Collecto', dangoConfigured: false, mobileNetworks } });
  const updated = [{ name: 'MTN', prefixes: ['25677', '25678'], networkCode: 'mtn-code' }, mobileNetworks[1]];
  http.put.mockResolvedValue({ data: { provider: 'Collecto', dangoConfigured: false, mobileNetworks: updated } });
  await load();
  fireEvent.change(screen.getByLabelText('MTN network code'), { target: { value: 'mtn-code' } });
  fireEvent.change(screen.getByLabelText('MTN prefixes'), { target: { value: '25677, 25678' } });
  expect(screen.getByRole('button', { name: 'Save payment provider' })).toBeEnabled();
  fireEvent.click(screen.getByRole('button', { name: 'Save payment provider' }));
  await screen.findByText(/Payment provider saved/);
  expect(http.put.mock.calls[0][1]).toEqual({ provider: 'Collecto', mobileNetworks: updated });
  expect(screen.getByRole('combobox')).toHaveValue('Collecto');
  expect(screen.getByLabelText('MTN network code')).toHaveValue('mtn-code');
});

test('does not request settings without authentication', async () => {
  render(<PaymentProviderSettings {...props} authToken="" />);
  expect(await screen.findByRole('alert')).toHaveTextContent('Sign in');
  expect(http.get).not.toHaveBeenCalled();
});

test('aborts settings loading when unmounted', () => {
  http.get.mockReturnValue(new Promise(() => undefined));
  const { unmount } = render(<PaymentProviderSettings {...props} />);
  const signal = http.get.mock.calls[0][1]?.signal as AbortSignal;
  unmount();
  expect(signal.aborted).toBe(true);
});
