import { useEffect, useState } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

export type PaymentProvider = 'Collecto' | 'DangoPayment';
interface MobileNetworkRoute {
  name: string;
  prefixes: string[];
  networkCode: string;
}
interface ProviderSettings {
  provider: PaymentProvider;
  dangoConfigured: boolean;
  mobileNetworks?: MobileNetworkRoute[];
}
interface Props {
  apiUrl: string;
  authToken: string;
}

const isSettings = (data: ProviderSettings) => data &&
  (data.provider === 'Collecto' || data.provider === 'DangoPayment') &&
  typeof data.dangoConfigured === 'boolean' &&
  (data.mobileNetworks === undefined || (Array.isArray(data.mobileNetworks) && data.mobileNetworks.every(network =>
    network && typeof network.name === 'string' && typeof network.networkCode === 'string' &&
    Array.isArray(network.prefixes) && network.prefixes.every(prefix => typeof prefix === 'string'))));

export default function PaymentProviderSettings({ apiUrl, authToken }: Props) {
  const [settings, setSettings] = useState<ProviderSettings | null>(null);
  const [selected, setSelected] = useState<PaymentProvider>('Collecto');
  const [networks, setNetworks] = useState<MobileNetworkRoute[]>([]);
  const networksChanged = JSON.stringify(networks) !== JSON.stringify(settings?.mobileNetworks ?? []);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [reload, setReload] = useState(0);
  const endpoint = `${apiUrl.replace(/\/+$/, '').replace(/\/api(?:\/.*)?$/i, '')}/api/PaymentProviderSettings`;

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setSettings(null);
    setError('');
    if (!authToken || !apiUrl) {
      setError('Sign in with an administrator account and configure the API URL.');
      setLoading(false);
      return () => controller.abort();
    }
    axios.get<ProviderSettings>(endpoint, {
      headers: { Authorization: `Bearer ${authToken}` }, signal: controller.signal,
    }).then(({ data }) => {
      if (!isSettings(data)) throw new Error('Invalid provider settings');
      if (!controller.signal.aborted) {
        setSettings(data);
        setSelected(data.provider);
        setNetworks(data.mobileNetworks ?? []);
      }
    }).catch(() => {
      if (!controller.signal.aborted) setError('Unable to load payment provider settings. Please retry.');
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [endpoint, apiUrl, authToken, reload]);

  const save = async () => {
    if (!settings || saving || (selected === settings.provider && !networksChanged) || (selected === 'DangoPayment' && !settings.dangoConfigured)) return;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const payload = networksChanged ? { provider: selected, mobileNetworks: networks } : { provider: selected };
      const { data } = await axios.put<ProviderSettings>(endpoint, payload, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!isSettings(data)) throw new Error('Invalid provider settings');
      setSettings(data);
      setSelected(data.provider);
      setNetworks(data.mobileNetworks ?? []);
      setNotice('Payment provider saved. New payments and payouts will use the selected provider.');
    } catch {
      setError('Unable to change payment provider. Check that prefixes are unique and nonoverlapping, and that required network codes are configured. Reload settings to confirm the active provider before retrying.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-medium">Payment provider</h3>
        <p className="text-sm text-muted-foreground">
          Manually switch incoming payments and mobile/bank payouts. Already submitted transactions stay with their original provider; switching does not retry or transfer them. Collecto wallet transfers, wallet withdrawals and bill services remain on Collecto.
        </p>
      </div>
      {loading && <p role="status">Loading payment provider settings…</p>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {notice && <p role="status" className="text-sm">{notice}</p>}
      {settings && !loading && (
        <>
          <p className="text-sm">Active provider: <strong>{settings.provider === 'DangoPayment' ? 'Dango Payment API' : 'Collecto'}</strong></p>
          <div className="space-y-2">
            <Label htmlFor="payment-provider">Provider for new transactions</Label>
            <select id="payment-provider" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={selected} onChange={event => { setSelected(event.target.value as PaymentProvider); setNotice(''); }} disabled={saving}>
              <option value="Collecto">Collecto</option>
              <option value="DangoPayment" disabled={!settings.dangoConfigured}>Dango Payment API</option>
            </select>
          </div>
          {networks.length > 0 && <fieldset disabled={saving} className="space-y-3 rounded-md border p-3">
            <legend className="px-1 text-sm font-medium">Mobile network routing</legend>
            <p className="text-sm text-muted-foreground">Use MTN and AIRTEL as the operator codes and enter comma-separated international prefixes (for example 25677). The matching code becomes sourceSystem for merchant collections and network for mobile payouts. Local numbers are normalized before matching. Unknown or overlapping prefixes are rejected. Number-portability exceptions require updating these rules.</p>
            {networks.map((network, index) => <div key={index} className="grid gap-2 md:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor={`network-code-${index}`}>{network.name} network code</Label>
                <Input id={`network-code-${index}`} value={network.networkCode} maxLength={50} onChange={event => {
                  setNetworks(current => current.map((item, i) => i === index ? { ...item, networkCode: event.target.value.trim() } : item));
                  setNotice('');
                }} />
              </div>
              <div className="space-y-1">
                <Label htmlFor={`network-prefixes-${index}`}>{network.name} prefixes</Label>
                <Input id={`network-prefixes-${index}`} value={network.prefixes.join(',')} onChange={event => {
                  setNetworks(current => current.map((item, i) => i === index ? { ...item, prefixes: event.target.value.split(',').map(value => value.trim()) } : item));
                  setNotice('');
                }} />
              </div>
            </div>)}
          </fieldset>}
          {!settings.dangoConfigured && <p className="text-sm text-muted-foreground">Configure Dango on the server and save the mobile-network codes while Collecto is selected before switching.</p>}
          <Button onClick={save} disabled={saving || (selected === settings.provider && !networksChanged) || (selected === 'DangoPayment' && !settings.dangoConfigured)}>
            {saving ? 'Saving…' : 'Save payment provider'}
          </Button>
        </>
      )}
      {!loading && <Button variant="outline" disabled={saving} onClick={() => { setNotice(''); setReload(value => value + 1); }}>Reload provider settings</Button>}
    </div>
  );
}
