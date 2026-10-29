import '@testing-library/jest-dom';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import axios from 'axios';
import AdminUtilityAccountWorkspace from './AdminUtilityAccountWorkspace';

jest.mock('axios');
jest.mock('./MeterLienPanel', () => ({
  __esModule: true,
  default: ({ meterId, apiUrl, authToken }: { meterId: number; apiUrl: string; authToken: string }) => <div data-testid="lien-panel">Lien meter {meterId}; {apiUrl}; {authToken}<input aria-label="Lien draft" /></div>,
}));
const http = axios as jest.Mocked<typeof axios>;
const props = { apiUrl: 'https://example.invalid/api/User', authToken: 'admin-test-token' };
const accounts = [
  { id: 11, fullName: 'Utility Alice', email: 'alice@example.invalid', systemRoleId: 4 },
  { id: 22, fullName: 'Utility Bob', systemRoleId: 4 },
  { id: 33, fullName: 'Not utility', systemRoleId: 2 },
  { id: 44, fullName: 'Administrator', systemRoleId: 1 },
];
const meter = { id: 101, landLordId: 11, meterType: 'Water', meterNumber: 'ALICE-001', nwscAccount: 'NW-1', nwscRegisteredName: 'Alice Nwsc', locationOfNwscMeter: 'Kampala', utilityMeterLocation: 'Meter at Kampala' };
const secondMeter = { ...meter, id: 102, meterNumber: 'ALICE-002' };
const bobMeter = { ...meter, id: 202, landLordId: 22, meterNumber: 'BOB-001' };
const fees = { monthlyFee: 100, outstandingBalance: 80, charges: [{ id: 1, meterNumber: 'ALICE-001', period: '2026-10', amount: 100, amountPaid: 20 }] };
const authConfig = expect.objectContaining({ headers: { Authorization: `Bearer ${props.authToken}` }, signal: expect.any(AbortSignal) });

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}
function renderWorkspace(wallet = false) {
  return render(<MemoryRouter><AdminUtilityAccountWorkspace {...props} renderWallet={wallet ? (account) => <div>Wallet {account.id}: {account.fullName}</div> : undefined} /></MemoryRouter>);
}
beforeAll(() => {
  // Radix uses pointer and layout APIs that jsdom does not implement.
  window.PointerEvent = MouseEvent as typeof PointerEvent;
  HTMLElement.prototype.hasPointerCapture = () => false;
  HTMLElement.prototype.setPointerCapture = () => undefined;
  HTMLElement.prototype.releasePointerCapture = () => undefined;
  HTMLElement.prototype.scrollIntoView = jest.fn();
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

function nativeSelect(label: string) {
  const native = screen.getByLabelText(label).previousElementSibling;
  expect(native).toMatchObject({ tagName: 'SELECT' });
  expect(native).toHaveAttribute('data-searchable-native-select');
  expect(native).toHaveAttribute('aria-hidden', 'true');
  return native as HTMLSelectElement;
}
async function waitForMeter(name: RegExp) {
  await waitFor(() => expect(within(nativeSelect('Account meter')).getByRole('option', { name, hidden: true })).toBeInTheDocument());
}
async function chooseAccount(id = '11') {
  const select = nativeSelect('Utility-payment account');
  await waitFor(() => expect(within(select).getByRole('option', { name: /Utility Alice/, hidden: true })).toBeInTheDocument());
  fireEvent.change(select, { target: { value: id } });
}
async function loadAlice() {
  renderWorkspace();
  await chooseAccount();
  await waitForMeter(/ALICE-001/);
  await screen.findByLabelText('Monthly fee per meter');
}
async function selectMeter(id = '101') {
  await waitFor(() => expect(screen.getByLabelText('Account meter')).toBeEnabled());
  fireEvent.change(nativeSelect('Account meter'), { target: { value: id } });
  await screen.findByTestId('lien-panel');
}
function fillMeter(number = 'NEW-001') {
  fireEvent.change(screen.getByLabelText('Meter type'), { target: { value: 'Electricity' } });
  fireEvent.change(screen.getByLabelText('Meter number'), { target: { value: number } });
  fireEvent.change(screen.getByLabelText('NWSC account'), { target: { value: 'NW-NEW' } });
  fireEvent.change(screen.getByLabelText('Registered name'), { target: { value: 'Alice Nwsc' } });
  fireEvent.change(screen.getByLabelText('Location of NWSC meter'), { target: { value: ' Entebbe ' } });
  fireEvent.change(screen.getByLabelText('Utility meter location'), { target: { value: ' Meter at Entebbe ' } });
}
beforeEach(() => {
  jest.resetAllMocks();
  http.get.mockImplementation((url) => {
    if (url.endsWith('/GetAllUsers')) return Promise.resolve({ data: accounts });
    if (url.endsWith('/GetUtilityMetersByLandLordId/11')) return Promise.resolve({ data: [meter, secondMeter, { ...bobMeter, id: 999 }] });
    if (url.endsWith('/GetUtilityMetersByLandLordId/22')) return Promise.resolve({ data: [bobMeter] });
    if (url.endsWith('/GetUtilityMonthlyFee/11')) return Promise.resolve({ data: fees });
    if (url.endsWith('/GetUtilityMonthlyFee/22')) return Promise.resolve({ data: { monthlyFee: 0, outstandingBalance: 7, charges: [] } });
    return Promise.reject(new Error(`Unexpected request: ${url}`));
  });
  http.post.mockResolvedValue({ data: {} });
  http.put.mockResolvedValue({ data: {} });
  http.delete.mockResolvedValue({ data: {} });
});

test('filters and searches utility accounts inside the dropdown without auto-selecting or requesting meters', async () => {
  const user = userEvent.setup();
  renderWorkspace();
  await waitFor(() => expect(screen.getByRole('combobox', { name: 'Utility-payment account' })).toBeEnabled());
  expect(nativeSelect('Utility-payment account')).toHaveValue('');
  expect(http.get).toHaveBeenCalledTimes(1);
  expect(http.get).toHaveBeenCalledWith(`${props.apiUrl}/GetAllUsers`, authConfig);
  expect(screen.queryByLabelText('Account meter')).not.toBeInTheDocument();
  await user.click(screen.getByRole('combobox', { name: 'Utility-payment account' }));
  expect(await screen.findByRole('option', { name: /Utility Alice/ })).toBeVisible();
  expect(screen.getByRole('option', { name: /Utility Bob/ })).toBeVisible();
  expect(screen.queryByRole('option', { name: /Not utility|Administrator/ })).not.toBeInTheDocument();
  await user.type(screen.getByRole('textbox', { name: 'Search options' }), 'alice@example');
  expect(screen.queryByRole('option', { name: /Utility Bob/ })).not.toBeInTheDocument();
  expect(screen.getByRole('option', { name: /Utility Alice/ })).toBeVisible();
  expect(http.get).toHaveBeenCalledTimes(1);
  await user.click(screen.getByRole('option', { name: /Utility Alice/ }));
  await waitForMeter(/ALICE-001/);
  expect(screen.getByRole('combobox', { name: 'Utility-payment account' })).toHaveTextContent('Utility Alice');
  expect(nativeSelect('Utility-payment account')).toHaveValue('11');
});

test('requests only account-owned meters with admin auth and searches inside the dropdown to select a specific meter', async () => {
  const user = userEvent.setup();
  await loadAlice();
  expect(http.get).toHaveBeenCalledWith(`${props.apiUrl}/GetUtilityMetersByLandLordId/11`, authConfig);
  expect(http.get).toHaveBeenCalledWith(`${props.apiUrl}/GetUtilityMonthlyFee/11`, authConfig);
  expect(http.get.mock.calls.some(([url]) => /GetAllUtilityMeters|GetLandlords/.test(url))).toBe(false);
  expect(screen.queryByTestId('lien-panel')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Edit meter' })).toBeDisabled();
  await user.click(screen.getByRole('combobox', { name: 'Account meter' }));
  expect(await screen.findByRole('option', { name: /ALICE-001/ })).toBeVisible();
  expect(screen.queryByRole('option', { name: /BOB-001/ })).not.toBeInTheDocument();
  await user.type(screen.getByRole('textbox', { name: 'Search options' }), 'ALICE-002');
  expect(screen.queryByRole('option', { name: /ALICE-001/ })).not.toBeInTheDocument();
  await user.click(screen.getByRole('option', { name: /ALICE-002/ }));
  expect(await screen.findByTestId('lien-panel')).toHaveTextContent(`Lien meter 102; ${props.apiUrl}; ${props.authToken}`);
  expect(screen.getByRole('link', { name: /payments, tokens and reports/ })).toHaveAttribute('href', '/admin-dashboard/utility-payment-dashboard?accountId=11&meterNumber=ALICE-002');
  await user.click(screen.getByRole('combobox', { name: 'Account meter' }));
  expect(screen.getByRole('textbox', { name: 'Search options' })).toHaveValue('');
  await user.type(screen.getByRole('textbox', { name: 'Search options' }), 'no match');
  expect(screen.queryAllByRole('option')).toHaveLength(0);
  expect(screen.getByLabelText('Account meter')).toHaveTextContent('ALICE-002');
  await user.keyboard('{Escape}');
  expect(nativeSelect('Account meter')).toHaveValue('102');
  expect(screen.getByTestId('lien-panel')).toHaveTextContent('Lien meter 102');
});

test.each(['Water', 'NW-1', 'Kampala', 'Utility Alice'])('searches meter metadata %s inside the dropdown', async (query) => {
  const user = userEvent.setup();
  await loadAlice();
  await user.click(screen.getByRole('combobox', { name: 'Account meter' }));
  await user.type(await screen.findByRole('textbox', { name: 'Search options' }), query);
  expect(screen.getByRole('option', { name: /ALICE-001/ })).toBeVisible();
  expect(screen.getByRole('option', { name: /ALICE-002/ })).toBeVisible();
  expect(screen.queryByRole('option', { name: /BOB-001/ })).not.toBeInTheDocument();
});

test('registers a meter using the selected account without an editable owner field', async () => {
  await loadAlice();
  fireEvent.click(screen.getByRole('button', { name: 'Register meter' }));
  const dialog = screen.getByRole('dialog', { name: 'Register meter' });
  expect(within(dialog).getByText(/ownership cannot be transferred/)).toBeInTheDocument();
  expect(within(dialog).queryByRole('combobox')).not.toBeInTheDocument();
  fillMeter();
  fireEvent.click(screen.getByRole('button', { name: 'Save meter' }));
  await screen.findByText('Meter registered.');
  expect(http.post).toHaveBeenCalledWith(`${props.apiUrl}/AddUtilityMeter`, {
    meterType: 'Electricity', meterNumber: 'NEW-001', nwscAccount: 'NW-NEW', nwscRegisteredName: 'Alice Nwsc', locationOfNwscMeter: 'Entebbe', utilityMeterLocation: 'Meter at Entebbe', landLordId: 11,
  }, authConfig);
});

test('edits the specific owned meter and preserves owner in its payload', async () => {
  await loadAlice();
  await selectMeter('102');
  fireEvent.click(screen.getByRole('button', { name: 'Edit meter' }));
  expect(screen.getByLabelText('Meter number')).toHaveValue('ALICE-002');
  fireEvent.change(screen.getByLabelText('Meter number'), { target: { value: 'ALICE-EDITED' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save meter' }));
  await screen.findByText('Meter updated.');
  expect(http.put).toHaveBeenCalledWith(`${props.apiUrl}/UpdateUtilityMeter/102`, { ...meter, id: undefined, meterNumber: 'ALICE-EDITED' }, authConfig);
  expect(http.post).not.toHaveBeenCalled();
});

test('rejects blank required fields and retains failed edit details and server errors', async () => {
  http.put.mockRejectedValueOnce({ isAxiosError: true, response: { data: { message: 'Meter number already exists.' } } });
  http.isAxiosError.mockImplementation((error) => Boolean((error as { isAxiosError?: boolean })?.isAxiosError));
  await loadAlice();
  await selectMeter();
  fireEvent.click(screen.getByRole('button', { name: 'Edit meter' }));
  fireEvent.change(screen.getByLabelText('Meter number'), { target: { value: '   ' } });
  fireEvent.submit(screen.getByRole('button', { name: 'Save meter' }).closest('form')!);
  expect(await screen.findByRole('alert')).toHaveTextContent('All meter fields are required.');
  expect(http.put).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText('Meter number'), { target: { value: 'DUPLICATE' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save meter' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Meter number already exists.');
  expect(screen.getByLabelText('Meter number')).toHaveValue('DUPLICATE');
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(screen.getByRole('alert')).toHaveTextContent('Meter number already exists.');
});

test('requires explicit delete confirmation and retains deletion errors for retry', async () => {
  http.delete.mockRejectedValueOnce(new Error('offline'));
  await loadAlice();
  await selectMeter();
  fireEvent.click(screen.getByRole('button', { name: 'Delete meter' }));
  expect(screen.getByRole('dialog', { name: 'Confirm meter deletion' })).toHaveTextContent('ALICE-001 owned by Utility Alice');
  expect(http.delete).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(http.delete).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Delete meter' }));
  fireEvent.click(screen.getByRole('button', { name: 'Confirm delete' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Unable to delete meter.');
  await waitFor(() => expect(screen.getByRole('button', { name: 'Confirm delete' })).toBeEnabled());
  fireEvent.click(screen.getByRole('button', { name: 'Confirm delete' }));
  await screen.findByText('Meter deleted.');
  expect(http.delete).toHaveBeenCalledWith(`${props.apiUrl}/DeleteUtilityMeter/101`, authConfig);
  expect(screen.queryByTestId('lien-panel')).not.toBeInTheDocument();
});

test('resets meter search, dialog, lien draft, fees and wallet scope on account change', async () => {
  const user = userEvent.setup();
  renderWorkspace(true);
  await chooseAccount();
  await waitForMeter(/ALICE-001/);
  await selectMeter();
  fireEvent.change(screen.getByLabelText('Lien draft'), { target: { value: 'old lien' } });
  await user.click(screen.getByRole('combobox', { name: 'Account meter' }));
  await user.type(await screen.findByRole('textbox', { name: 'Search options' }), 'ALICE');
  await user.keyboard('{Escape}');
  fireEvent.change(screen.getByLabelText('Monthly fee per meter'), { target: { value: '999' } });
  fireEvent.click(screen.getByRole('button', { name: 'Edit meter' }));
  await chooseAccount('22');
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(screen.queryByTestId('lien-panel')).not.toBeInTheDocument();
  expect(screen.queryByText(/Wallet 11/)).not.toBeInTheDocument();
  await waitForMeter(/BOB-001/);
  await user.click(screen.getByRole('combobox', { name: 'Account meter' }));
  expect(await screen.findByRole('textbox', { name: 'Search options' })).toHaveValue('');
  expect(screen.getByRole('option', { name: /BOB-001/ })).toBeVisible();
  expect(screen.queryByRole('option', { name: /ALICE-/ })).not.toBeInTheDocument();
  await user.keyboard('{Escape}');
  expect(screen.getByLabelText('Monthly fee per meter')).toHaveValue('0');
  expect(screen.getByText('Wallet 22: Utility Bob')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /payments, tokens and reports/ })).toHaveAttribute('href', '/admin-dashboard/utility-payment-dashboard?accountId=22');
  await selectMeter('202');
  expect(screen.getByLabelText('Lien draft')).toHaveValue('');
  expect(screen.getByTestId('lien-panel')).toHaveTextContent('Lien meter 202');
  await chooseAccount();
  await waitForMeter(/ALICE-001/);
  expect(screen.queryByTestId('lien-panel')).not.toBeInTheDocument();
});

test('aborts and ignores stale meter and fee responses after switching accounts', async () => {
  const pendingMeters = deferred<{ data: typeof meter[] }>();
  const pendingFees = deferred<{ data: typeof fees }>();
  const defaultGet = http.get.getMockImplementation()!;
  http.get.mockImplementation((url, config) => {
    if (url.endsWith('/GetUtilityMetersByLandLordId/11')) return pendingMeters.promise;
    if (url.endsWith('/GetUtilityMonthlyFee/11')) return pendingFees.promise;
    return defaultGet(url, config);
  });
  renderWorkspace();
  await chooseAccount();
  expect(screen.getByRole('button', { name: 'Register meter' })).toBeDisabled();
  await chooseAccount('22');
  await waitForMeter(/BOB-001/);
  const oldCalls = http.get.mock.calls.filter(([url]) => url.endsWith('/11'));
  expect(oldCalls).toHaveLength(2);
  oldCalls.forEach(([, config]) => expect(config?.signal?.aborted).toBe(true));
  await act(async () => { pendingMeters.resolve({ data: [meter] }); pendingFees.resolve({ data: fees }); });
  expect(within(nativeSelect('Account meter')).queryByRole('option', { name: /ALICE-/, hidden: true })).not.toBeInTheDocument();
  expect(screen.getByLabelText('Monthly fee per meter')).toHaveValue('0');
  expect(screen.queryByText('80.00')).not.toBeInTheDocument();
});

test('disables meter mutations on failed loading and permits retry', async () => {
  const defaultGet = http.get.getMockImplementation()!;
  http.get.mockImplementation((url, config) => url.endsWith('/GetUtilityMetersByLandLordId/11') ? Promise.reject(new Error('offline')) : defaultGet(url, config));
  await loadAliceWithoutMeters();
  expect(await screen.findByRole('alert')).toHaveTextContent('Unable to load this account’s meters.');
  for (const name of ['Register meter', 'Edit meter', 'Delete meter']) expect(screen.getByRole('button', { name })).toBeDisabled();
  expect(screen.queryByTestId('lien-panel')).not.toBeInTheDocument();
  http.get.mockImplementation(defaultGet);
  fireEvent.click(screen.getByRole('button', { name: 'Retry meters' }));
  await waitForMeter(/ALICE-001/);
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});
async function loadAliceWithoutMeters() {
  renderWorkspace();
  await chooseAccount();
  await screen.findByLabelText('Monthly fee per meter');
}

test.each(['-1', '1.001', '', 'NaN', '1e3'])('rejects invalid fee %s', async (value) => {
  await loadAlice();
  fireEvent.change(screen.getByLabelText('Monthly fee per meter'), { target: { value } });
  fireEvent.click(screen.getByRole('button', { name: 'Save monthly fee' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Monthly fee must be zero or positive with at most two decimal places.');
  expect(http.put).not.toHaveBeenCalled();
});

test.each(['0', '123.45'])('saves a valid monthly fee %s with visible outstanding charges', async (value) => {
  await loadAlice();
  expect(screen.getByText('Outstanding fees:')).toHaveTextContent('80.00');
  expect(screen.getByRole('cell', { name: '2026-10' })).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Monthly fee per meter'), { target: { value } });
  fireEvent.click(screen.getByRole('button', { name: 'Save monthly fee' }));
  await screen.findByText('Monthly fee saved.');
  expect(http.put).toHaveBeenCalledWith(`${props.apiUrl}/SetUtilityMonthlyFee/11`, { monthlyFee: Number(value) }, authConfig);
});

test('retains failed fee input and errors, then resets them for a different account', async () => {
  http.put.mockRejectedValueOnce(new Error('offline'));
  await loadAlice();
  fireEvent.change(screen.getByLabelText('Monthly fee per meter'), { target: { value: '125.50' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save monthly fee' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Unable to save monthly fee.');
  expect(screen.getByLabelText('Monthly fee per meter')).toHaveValue('125.50');
  expect(screen.getByText('Outstanding fees:')).toHaveTextContent('80.00');
  await chooseAccount('22');
  await screen.findByLabelText('Monthly fee per meter');
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  expect(screen.getByLabelText('Monthly fee per meter')).toHaveValue('0');
});

test('does not permit setting fees when the initial fee request failed', async () => {
  const defaultGet = http.get.getMockImplementation()!;
  http.get.mockImplementation((url, config) => url.endsWith('/GetUtilityMonthlyFee/11') ? Promise.reject(new Error('offline')) : defaultGet(url, config));
  renderWorkspace();
  await chooseAccount();
  expect(await screen.findByRole('alert')).toHaveTextContent('Unable to load monthly fees.');
  expect(screen.queryByRole('button', { name: 'Save monthly fee' })).not.toBeInTheDocument();
  http.get.mockImplementation(defaultGet);
  fireEvent.click(screen.getByRole('button', { name: 'Retry fees' }));
  await screen.findByLabelText('Monthly fee per meter');
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

test('aborts account loading on unmount and provides retry on errors', async () => {
  http.get.mockRejectedValueOnce(new Error('offline'));
  const view = renderWorkspace();
  expect(await screen.findByRole('alert')).toHaveTextContent('Unable to load utility-payment accounts.');
  expect(screen.getByLabelText('Utility-payment account')).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Retry accounts' }));
  await waitFor(() => expect(within(nativeSelect('Utility-payment account')).getByRole('option', { name: /Utility Alice/, hidden: true })).toBeInTheDocument());
  const config = http.get.mock.calls[1][1];
  view.unmount();
  expect(config?.signal?.aborted).toBe(true);
});
