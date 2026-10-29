import { SearchableNativeSelect } from '@/components/ui/searchable-native-select';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import MeterLienPanel from './MeterLienPanel';

export interface UtilityPaymentAccount {
  id: number;
  fullName: string;
  systemRoleId: number;
  email?: string;
  phoneNumber?: string;
}

export interface AdminUtilityAccountWorkspaceProps {
  apiUrl: string;
  authToken: string;
  renderWallet?: (account: UtilityPaymentAccount) => ReactNode;
}

type MeterFields = { meterType: string; meterNumber: string; nwscAccount: string; nwscRegisteredName: string; locationOfNwscMeter: string; utilityMeterLocation: string; customerMobile: string };
type Meter = MeterFields & { id: number; landLordId: number };
type FeeSummary = {
  monthlyFee: number;
  outstandingBalance: number;
  charges: { id: number; meterNumber: string; period: string; amount: number; amountPaid: number }[];
};
const emptyMeter: MeterFields = { meterType: '', meterNumber: '', nwscAccount: '', nwscRegisteredName: '', locationOfNwscMeter: '', utilityMeterLocation: '', customerMobile: '' };
const fieldLabels: Record<keyof MeterFields, string> = {
  meterType: 'Meter type', meterNumber: 'Meter number', nwscAccount: 'NWSC account', nwscRegisteredName: 'Registered name', locationOfNwscMeter: 'Location of NWSC meter', utilityMeterLocation: 'Utility meter location', customerMobile: 'Customer mobile',
};
const money = (value: number) => value.toLocaleString('en-UG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const message = (error: unknown, fallback: string) => {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;
    if (typeof data === 'string' && data) return data;
    if (typeof data?.message === 'string') return data.message;
  }
  return fallback;
};

export default function AdminUtilityAccountWorkspace(props: AdminUtilityAccountWorkspaceProps) {
  return <AccountPicker key={`${props.apiUrl}:${props.authToken}`} {...props} />;
}

function AccountPicker({ apiUrl, authToken, renderWallet }: AdminUtilityAccountWorkspaceProps) {
  const [accounts, setAccounts] = useState<UtilityPaymentAccount[]>([]);
  const [accountId, setAccountId] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    axios.get<UtilityPaymentAccount[]>(`${apiUrl}/GetAllUsers`, {
      headers: { Authorization: `Bearer ${authToken}` }, signal: controller.signal,
    }).then(({ data }) => {
      if (controller.signal.aborted) return;
      setAccounts(data.filter((account) => account.systemRoleId === 4));
      setError('');
    }).catch((err: unknown) => {
      if (!controller.signal.aborted) setError(message(err, 'Unable to load utility-payment accounts.'));
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [apiUrl, authToken, reload]);
  const account = accounts.find((item) => String(item.id) === accountId);
  const matches = (item: UtilityPaymentAccount) => `${item.fullName} ${item.email || ''} ${item.phoneNumber || ''} ${item.id}`.toLowerCase().includes(search.toLowerCase().trim());
  return <div className="space-y-6">
    <h2 className="text-xl font-semibold">Utility-payment account workspace</h2>
    <Label htmlFor="utility-account-search">Search utility-payment accounts</Label>
    <Input id="utility-account-search" value={search} onChange={(event) => setSearch(event.target.value)} />
    <Label htmlFor="utility-account">Utility-payment account</Label>
    <SearchableNativeSelect id="utility-account" className="h-10 w-full rounded-md border bg-background px-3" disabled={loading || !!error} value={accountId} onChange={(event) => setAccountId(event.target.value)}>
      <option value="">Select an account</option>
      {accounts.filter((item) => matches(item) || String(item.id) === accountId).map((item) => <option key={item.id} value={item.id} data-search-keywords={`${item.fullName} ${item.email || ''} ${item.phoneNumber || ''} ${item.id}`}>{item.fullName} — #{item.id}{item.email ? ` — ${item.email}` : ''}</option>)}
    </SearchableNativeSelect>
    {loading && <p role="status">Loading accounts...</p>}
    {error && <><p role="alert">{error}</p><Button disabled={loading} onClick={() => setReload((value) => value + 1)}>Retry accounts</Button></>}
    {!account && <p>Select a utility-payment account to manage its meters and fees.</p>}
    {account && !loading && !error && <AccountWorkspace key={account.id} account={account} apiUrl={apiUrl} authToken={authToken} renderWallet={renderWallet} />}
  </div>;
}

function AccountWorkspace({ account, apiUrl, authToken, renderWallet }: Omit<AdminUtilityAccountWorkspaceProps, 'renderWallet'> & { account: UtilityPaymentAccount; renderWallet?: AdminUtilityAccountWorkspaceProps['renderWallet'] }) {
  const [meters, setMeters] = useState<Meter[]>([]);
  const [meterId, setMeterId] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [meterError, setMeterError] = useState('');
  const [actionError, setActionError] = useState('');
  const [notice, setNotice] = useState('');
  const [reload, setReload] = useState(0);
  const [editor, setEditor] = useState<{ id: number | null; fields: MeterFields } | null>(null);
  const [deleting, setDeleting] = useState<Meter | null>(null);
  const [saving, setSaving] = useState(false);
  const [fees, setFees] = useState<FeeSummary | null>(null);
  const [feeInput, setFeeInput] = useState('');
  const [feeLoading, setFeeLoading] = useState(true);
  const [feeSaving, setFeeSaving] = useState(false);
  const [feeError, setFeeError] = useState('');
  const [feeNotice, setFeeNotice] = useState('');
  const [feeReload, setFeeReload] = useState(0);
  const mutations = useRef<AbortController | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    mutations.current = controller;
    return () => controller.abort();
  }, []);
  const headers = { Authorization: `Bearer ${authToken}` };
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    axios.get<Meter[]>(`${apiUrl}/GetUtilityMetersByLandLordId/${account.id}`, {
      headers: { Authorization: `Bearer ${authToken}` }, signal: controller.signal,
    }).then(({ data }) => {
      if (controller.signal.aborted) return;
      const owned = data.filter((meter) => meter.landLordId === account.id);
      setMeters(owned);
      setMeterId((previous) => owned.some((meter) => String(meter.id) === previous) ? previous : '');
      setMeterError('');
    }).catch((err: unknown) => {
      if (!controller.signal.aborted) { setMeters([]); setMeterId(''); setMeterError(message(err, 'Unable to load this account’s meters.')); }
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [account.id, apiUrl, authToken, reload]);
  useEffect(() => {
    const controller = new AbortController();
    setFeeLoading(true);
    axios.get<FeeSummary>(`${apiUrl}/GetUtilityMonthlyFee/${account.id}`, {
      headers: { Authorization: `Bearer ${authToken}` }, signal: controller.signal,
    }).then(({ data }) => {
      if (controller.signal.aborted) return;
      setFees(data); setFeeInput(String(data.monthlyFee)); setFeeError('');
    }).catch((err: unknown) => {
      if (!controller.signal.aborted) setFeeError(message(err, 'Unable to load monthly fees.'));
    }).finally(() => { if (!controller.signal.aborted) setFeeLoading(false); });
    return () => controller.abort();
  }, [account.id, apiUrl, authToken, feeReload]);
  const selected = meters.find((meter) => String(meter.id) === meterId && meter.landLordId === account.id);
  const blocked = loading || !!meterError || saving;
  const owned = (id: number) => meters.some((meter) => meter.id === id && meter.landLordId === account.id);
  const saveMeter = async () => {
    if (!editor || blocked || (editor.id !== null && !owned(editor.id))) return;
    const fields = Object.fromEntries(Object.entries(editor.fields).map(([key, value]) => [key, value.trim()])) as MeterFields;
    if (Object.values(fields).some((value) => !value)) { setActionError('All meter fields are required.'); return; }
    const signal = mutations.current!.signal;
    setSaving(true); setNotice('');
    try {
      const body = { ...fields, landLordId: account.id };
      if (editor.id === null) await axios.post(`${apiUrl}/AddUtilityMeter`, body, { headers, signal });
      else await axios.put(`${apiUrl}/UpdateUtilityMeter/${editor.id}`, body, { headers, signal });
      if (signal.aborted) return;
      setActionError(''); setNotice(editor.id === null ? 'Meter registered.' : 'Meter updated.'); setEditor(null); setReload((value) => value + 1);
    } catch (err: unknown) {
      if (!signal.aborted) setActionError(message(err, 'Unable to save meter.'));
    } finally { if (!signal.aborted) setSaving(false); }
  };
  const deleteMeter = async () => {
    if (!deleting || blocked || !owned(deleting.id)) return;
    const signal = mutations.current!.signal;
    setSaving(true); setNotice('');
    try {
      await axios.delete(`${apiUrl}/DeleteUtilityMeter/${deleting.id}`, { headers, signal });
      if (signal.aborted) return;
      setMeterId(''); setDeleting(null); setActionError(''); setNotice('Meter deleted.'); setReload((value) => value + 1);
    } catch (err: unknown) {
      if (!signal.aborted) setActionError(message(err, 'Unable to delete meter.'));
    } finally { if (!signal.aborted) setSaving(false); }
  };
  const saveFee = async () => {
    if (feeLoading || feeSaving || !fees) return;
    if (!/^\d+(\.\d{1,2})?$/.test(feeInput.trim()) || !Number.isFinite(Number(feeInput))) {
      setFeeError('Monthly fee must be zero or positive with at most two decimal places.'); return;
    }
    const signal = mutations.current!.signal;
    setFeeSaving(true); setFeeNotice('');
    try {
      await axios.put(`${apiUrl}/SetUtilityMonthlyFee/${account.id}`, { monthlyFee: Number(feeInput) }, { headers, signal });
      if (signal.aborted) return;
      setFeeError(''); setFeeNotice('Monthly fee saved.'); setFeeReload((value) => value + 1);
    } catch (err: unknown) {
      if (!signal.aborted) setFeeError(message(err, 'Unable to save monthly fee.'));
    } finally { if (!signal.aborted) setFeeSaving(false); }
  };
  const reports = `/admin-dashboard/utility-payment-dashboard?accountId=${account.id}`;
  return <div className="space-y-6">
    <h3 className="font-semibold">Managing {account.fullName} — #{account.id}</h3>
    <Link className="underline" to={`${reports}${selected && !loading && !meterError ? `&meterNumber=${encodeURIComponent(selected.meterNumber)}` : ''}`}>View payments, tokens and reports</Link>
    <Card><CardHeader><CardTitle>Meters</CardTitle></CardHeader><CardContent className="space-y-3">
      {loading && <p role="status">Loading meters...</p>}
      {meterError && <><p role="alert">{meterError}</p><Button disabled={loading} onClick={() => setReload((value) => value + 1)}>Retry meters</Button></>}
      {notice && <p role="status">{notice}</p>}
      {actionError && !editor && !deleting && <p role="alert">{actionError}</p>}
      <Label htmlFor="utility-meter-search">Search meters</Label>
      <Input id="utility-meter-search" value={search} onChange={(event) => setSearch(event.target.value)} />
      <Label htmlFor="utility-meter">Account meter</Label>
      <SearchableNativeSelect id="utility-meter" className="h-10 w-full rounded-md border bg-background px-3" disabled={blocked} value={meterId} onChange={(event) => setMeterId(event.target.value)}>
        <option value="">Select a meter</option>
        {meters.filter((meter) => meter.id === selected?.id || `${meter.meterNumber} ${meter.meterType} ${meter.nwscAccount} ${meter.locationOfNwscMeter} ${account.fullName}`.toLowerCase().includes(search.toLowerCase().trim())).map((meter) => <option key={meter.id} value={meter.id} data-search-keywords={`${meter.id} ${meter.meterNumber} ${meter.meterType} ${meter.nwscAccount} ${meter.locationOfNwscMeter} ${account.fullName}`}>{meter.meterNumber} — {meter.meterType} — {account.fullName} (#{account.id})</option>)}
      </SearchableNativeSelect>
      {!loading && !meterError && meters.length === 0 && <p>No meters registered for this account.</p>}
      <div className="flex flex-wrap gap-2">
        <Button disabled={blocked} onClick={() => setEditor({ id: null, fields: { ...emptyMeter } })}>Register meter</Button>
        <Button variant="outline" disabled={blocked || !selected} onClick={() => selected && setEditor({ id: selected.id, fields: { meterType: selected.meterType, meterNumber: selected.meterNumber, nwscAccount: selected.nwscAccount, nwscRegisteredName: selected.nwscRegisteredName, locationOfNwscMeter: selected.locationOfNwscMeter, utilityMeterLocation: selected.utilityMeterLocation, customerMobile: selected.customerMobile } })}>Edit meter</Button>
        <Button variant="destructive" disabled={blocked || !selected} onClick={() => selected && setDeleting(selected)}>Delete meter</Button>
      </div>
      {selected && !loading && !meterError && !saving && <section aria-label={`Liens for ${selected.meterNumber}`} className="space-y-3">
        <h4>Liens, policy and history: {selected.meterNumber} — {account.fullName}</h4>
        <MeterLienPanel key={`${account.id}:${selected.id}`} meterId={selected.id} apiUrl={apiUrl} authToken={authToken} />
      </section>}
    </CardContent></Card>
    <Dialog open={!!editor} onOpenChange={(open) => { if (!open && !saving) setEditor(null); }}>
      <DialogContent><DialogHeader><DialogTitle>{editor?.id == null ? 'Register meter' : 'Edit meter'}</DialogTitle><DialogDescription>Owner: {account.fullName} (#{account.id}). Meter ownership cannot be transferred.</DialogDescription></DialogHeader>
        {actionError && <p role="alert">{actionError}</p>}
        <form onSubmit={(event) => { event.preventDefault(); void saveMeter(); }}>
          <fieldset disabled={blocked} className="space-y-3">
            {(Object.keys(fieldLabels) as (keyof MeterFields)[]).map((field) => <div key={field}><Label htmlFor={`edit-${field}`}>{fieldLabels[field]}</Label><Input id={`edit-${field}`} required value={editor?.fields[field] || ''} onChange={(event) => setEditor((previous) => previous && ({ ...previous, fields: { ...previous.fields, [field]: event.target.value } }))} /></div>)}
            <Button type="submit">Save meter</Button>
          </fieldset>
          <Button type="button" variant="outline" disabled={saving} onClick={() => setEditor(null)}>Cancel</Button>
        </form>
      </DialogContent>
    </Dialog>
    <Dialog open={!!deleting} onOpenChange={(open) => { if (!open && !saving) setDeleting(null); }}>
      <DialogContent><DialogHeader><DialogTitle>Confirm meter deletion</DialogTitle><DialogDescription>Delete meter {deleting?.meterNumber} owned by {account.fullName}? This cannot be undone.</DialogDescription></DialogHeader>
        {actionError && <p role="alert">{actionError}</p>}
        <Button variant="outline" disabled={saving} onClick={() => setDeleting(null)}>Cancel</Button>
        <Button variant="destructive" disabled={blocked || !deleting || !owned(deleting.id)} onClick={() => void deleteMeter()}>Confirm delete</Button>
      </DialogContent>
    </Dialog>
    <Card><CardHeader><CardTitle>Monthly fees and outstanding fees</CardTitle></CardHeader><CardContent className="space-y-3">
      {feeLoading && <p role="status">Loading monthly fees...</p>}
      {feeError && <><p role="alert">{feeError}</p><Button disabled={feeLoading || feeSaving} onClick={() => setFeeReload((value) => value + 1)}>Retry fees</Button></>}
      {feeNotice && <p role="status">{feeNotice}</p>}
      {fees && <>
        <p>Outstanding fees: <strong>{money(fees.outstandingBalance)}</strong></p>
        <form onSubmit={(event) => { event.preventDefault(); void saveFee(); }} noValidate>
          <fieldset disabled={feeLoading || feeSaving} className="space-y-2">
            <Label htmlFor="monthly-fee">Monthly fee per meter</Label>
            <Input id="monthly-fee" inputMode="decimal" value={feeInput} onChange={(event) => setFeeInput(event.target.value)} required />
            <Button type="submit">Save monthly fee</Button>
          </fieldset>
        </form>
        <Table><TableHeader><TableRow><TableHead>Meter</TableHead><TableHead>Period</TableHead><TableHead>Amount</TableHead><TableHead>Paid</TableHead><TableHead>Outstanding</TableHead></TableRow></TableHeader>
          <TableBody>{fees.charges.map((charge) => <TableRow key={charge.id}><TableCell>{charge.meterNumber}</TableCell><TableCell>{charge.period}</TableCell><TableCell>{money(charge.amount)}</TableCell><TableCell>{money(charge.amountPaid)}</TableCell><TableCell>{money(charge.amount - charge.amountPaid)}</TableCell></TableRow>)}</TableBody>
        </Table>
      </>}
    </CardContent></Card>
    {renderWallet && <section aria-label={`Withdrawals for ${account.fullName}`}>{renderWallet(account)}</section>}
  </div>;
}
