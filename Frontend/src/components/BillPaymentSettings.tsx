import { useEffect, useState } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface BillerSettings {
  serviceId: string;
  transtype: string;
  productCode?: string;
  tin?: string;
  uedlid?: string;
  processId?: string;
  location?: string;
  narrative?: string;
  autoBillPaymentsEnabled: boolean;
  configured: boolean;
}
interface Props {
  apiUrl: string;
  authToken: string;
}

const isSettings = (data: BillerSettings) => data &&
  typeof data.serviceId === 'string' && typeof data.transtype === 'string' &&
  typeof data.autoBillPaymentsEnabled === 'boolean' && typeof data.configured === 'boolean';

const blank: BillerSettings = {
  serviceId: '', transtype: '', productCode: '', tin: '', uedlid: '', processId: '',
  location: '', narrative: '', autoBillPaymentsEnabled: false, configured: false,
};

export default function BillPaymentSettings({ apiUrl, authToken }: Props) {
  const [saved, setSaved] = useState<BillerSettings | null>(null);
  const [draft, setDraft] = useState<BillerSettings>(blank);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [reload, setReload] = useState(0);
  const endpoint = `${apiUrl.replace(/\/+$/, '').replace(/\/api(?:\/.*)?$/i, '')}/api/PaymentProviderSettings/biller`;

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    if (!authToken || !apiUrl) {
      setError('Sign in with an administrator account and configure the API URL.');
      setLoading(false);
      return () => controller.abort();
    }
    axios.get<BillerSettings>(endpoint, {
      headers: { Authorization: `Bearer ${authToken}` }, signal: controller.signal,
    }).then(({ data }) => {
      if (!isSettings(data)) throw new Error('Invalid biller settings');
      if (!controller.signal.aborted) {
        setSaved({ ...blank, ...data });
        setDraft({ ...blank, ...data });
      }
    }).catch(() => {
      if (!controller.signal.aborted) setError('Unable to load NWSC biller settings. Please retry.');
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [endpoint, apiUrl, authToken, reload]);

  const changed = JSON.stringify(draft) !== JSON.stringify(saved);
  const save = async () => {
    if (!saved || saving || !changed) return;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const { data } = await axios.put<BillerSettings>(endpoint, draft, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!isSettings(data)) throw new Error('Invalid biller settings');
      setSaved({ ...blank, ...data });
      setDraft({ ...blank, ...data });
      setNotice(data.autoBillPaymentsEnabled
        ? 'Saved. Future meter payments on meters with a real NWSC account will pay the bill automatically.'
        : 'Saved. Automatic NWSC bill payments are disabled.');
    } catch {
      setError('Unable to save biller settings. Check that ServiceId and Transtype are provided, then reload before retrying.');
    } finally {
      setSaving(false);
    }
  };

  const field = (key: keyof BillerSettings, label: string, hint?: string, id = key) => (
    <div className="space-y-1">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} value={String(draft[key] ?? '')} disabled={saving}
        onChange={event => { setDraft(current => ({ ...current, [key]: event.target.value })); setNotice(''); }} />
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );

  return (
    <div className="space-y-4 border-t pt-4">
      <div>
        <h3 className="font-medium">NWSC bill payments</h3>
        <p className="text-sm text-muted-foreground">
          After a meter payment is credited to the utility wallet, a matching meter with a real NWSC account
          (not blank and not N/A) pays its bill through the active Dango provider. The utility wallet is debited
          only after Dango confirms the bill payment succeeded. Automatic bill payments run only while Dango Payment API is active.
        </p>
      </div>
      {loading && <p role="status">Loading NWSC biller settings…</p>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {notice && <p role="status" className="text-sm">{notice}</p>}
      {saved && !loading && (
        <>
          <div className="grid gap-3 md:grid-cols-2">
            {field('serviceId', 'Service ID')}
            {field('transtype', 'Transtype')}
            {field('productCode', 'Product code')}
            {field('tin', 'TIN')}
            {field('uedlid', 'UEDL ID')}
            {field('processId', 'Process ID')}
            {field('location', 'Location')}
            {field('narrative', 'Narrative', 'Defaults to “NWSC bill payment <account>” when blank.')}
          </div>
          <label className="flex items-start gap-2 text-sm">
            <input id="auto-bill-payments" type="checkbox" className="mt-1" disabled={saving}
              checked={draft.autoBillPaymentsEnabled}
              onChange={event => { setDraft(current => ({ ...current, autoBillPaymentsEnabled: event.target.checked })); setNotice(''); }} />
            <span>Enable automatic NWSC bill payments (uses real money and debits the utility wallet after confirmation)</span>
          </label>
          <Button onClick={save} disabled={saving || !changed}>{saving ? 'Saving…' : 'Save biller settings'}</Button>
        </>
      )}
      {!loading && <Button variant="outline" disabled={saving} onClick={() => { setNotice(''); setReload(value => value + 1); }}>Reload biller settings</Button>}
    </div>
  );
}
