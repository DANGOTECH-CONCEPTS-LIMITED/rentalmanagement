import { SearchableNativeSelect } from '@/components/ui/searchable-native-select';
import { useEffect, useState } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDateTimeDmy } from '@/lib/date-time';

type RepaymentMode = 'FullFirst' | 'Percentage';

interface MeterLienSummary {
  meterId: number;
  meterNumber: string;
  totalAmount: number;
  amountPaid: number;
  balance: number;
  repaymentMode: RepaymentMode;
  repaymentPercentage: number;
  liens: { id: number; amount: number; amountPaid: number; balance: number; description: string; createdAt: string }[];
  repayments: { paymentId: number; transactionId: string; paymentAmount: number; lienAmount: number; tokenAmount: number; createdAt: string }[];
}

interface MeterLienPanelProps {
  meterId: number;
  apiUrl: string;
  authToken: string;
}

const money = (amount: number) => amount.toLocaleString('en-UG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const errorMessage = (error: unknown) => {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;
    if (typeof data === 'string') return data;
    if (typeof data?.message === 'string') return data.message;
  }
  return 'Unable to update meter liens. Please try again.';
};

export default function MeterLienPanel({ meterId, apiUrl, authToken }: MeterLienPanelProps) {
  const [summary, setSummary] = useState<MeterLienSummary | null>(null);
  const [mode, setMode] = useState<RepaymentMode>('FullFirst');
  const [percentage, setPercentage] = useState('20');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [reload, setReload] = useState(0);
  const headers = { Authorization: `Bearer ${authToken}` };

  const applySummary = (data: MeterLienSummary) => {
    setSummary(data);
    setMode(data.repaymentMode);
    setPercentage(String(data.repaymentPercentage));
  };

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    axios.get<MeterLienSummary>(`${apiUrl}/GetMeterLien/${meterId}`, {
      headers: { Authorization: `Bearer ${authToken}` }, signal: controller.signal,
    }).then(({ data }) => {
      if (!controller.signal.aborted) applySummary(data);
    }).catch((err: unknown) => {
      if (!controller.signal.aborted) setError(errorMessage(err));
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [meterId, apiUrl, authToken, reload]);

  const save = async (addLien: boolean) => {
    setError('');
    setNotice('');
    const rate = mode === 'FullFirst' ? 100 : Number(percentage);
    if (!Number.isFinite(rate) || rate <= 0 || rate > 100 || Math.abs(rate * 100 - Math.round(rate * 100)) > 0.000001 || (mode === 'Percentage' && !percentage.trim())) {
      setError('Repayment percentage must be greater than 0 and no more than 100, with at most two decimal places.');
      return;
    }
    const lienAmount = Number(amount);
    if (addLien && (!amount.trim() || !Number.isFinite(lienAmount) || lienAmount <= 0 || Math.abs(lienAmount * 100 - Math.round(lienAmount * 100)) > 0.000001)) {
      setError('Lien amount must be greater than zero with at most two decimal places.');
      return;
    }
    if (addLien && !description.trim()) {
      setError('Enter a reason for the lien.');
      return;
    }
    setSaving(true);
    try {
      const policy = { repaymentMode: mode, repaymentPercentage: rate };
      const response = addLien
        ? await axios.post<MeterLienSummary>(`${apiUrl}/AddMeterLien/${meterId}`, { ...policy, amount: lienAmount, description: description.trim() }, { headers })
        : await axios.put<MeterLienSummary>(`${apiUrl}/SetMeterLienPolicy/${meterId}`, policy, { headers });
      applySummary(response.data);
      if (addLien) {
        setAmount('');
        setDescription('');
      }
      setNotice(addLien ? 'Lien added.' : 'Repayment policy saved.');
    } catch (err: unknown) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        Monthly meter fees are deducted first. The lien policy applies to the remaining payment.
        Pay lien first withholds tokens until the lien is cleared; percentage repayment lets the remainder buy a token.
        Policy changes apply only to payments not yet allocated.
      </p>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {notice && <p role="status" className="text-sm text-green-700">{notice}</p>}
      {loading ? <p role="status">Loading meter liens...</p> : !summary ? (
        <Button variant="outline" onClick={() => setReload((value) => value + 1)}>Retry</Button>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div>Total liens<strong className="block">{money(summary.totalAmount)}</strong></div>
            <div>Repaid<strong className="block">{money(summary.amountPaid)}</strong></div>
            <div>Outstanding<strong className="block">{money(summary.balance)}</strong></div>
          </div>
          <fieldset disabled={saving} className="space-y-3 border rounded-lg p-4">
            <legend className="px-1 font-medium">Meter repayment policy</legend>
            <Label htmlFor="lien-mode">Repayment mode</Label>
            <SearchableNativeSelect id="lien-mode" className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={mode} onChange={(event) => setMode(event.target.value as RepaymentMode)}>
              <option value="FullFirst">Pay lien first</option>
              <option value="Percentage">Percentage per payment</option>
            </SearchableNativeSelect>
            {mode === 'Percentage' && <div className="space-y-2">
              <Label htmlFor="lien-percentage">Payment towards lien (%)</Label>
              <Input id="lien-percentage" type="number" min="0.01" max="100" step="0.01" value={percentage} onChange={(event) => setPercentage(event.target.value)} />
            </div>}
            <Button variant="outline" onClick={() => save(false)}>Save repayment policy</Button>
          </fieldset>
          <form onSubmit={(event) => { event.preventDefault(); void save(true); }}>
            <fieldset disabled={saving} className="space-y-3 border rounded-lg p-4">
              <legend className="px-1 font-medium">Add lien to this meter</legend>
              <Label htmlFor="lien-amount">Lien amount</Label>
              <Input id="lien-amount" type="number" min="0.01" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} required />
              <Label htmlFor="lien-description">Reason</Label>
              <Input id="lien-description" maxLength={500} value={description} onChange={(event) => setDescription(event.target.value)} required />
              <p className="text-xs text-muted-foreground">Adding a lien also saves the policy selected above for this meter.</p>
              <Button type="submit">{saving ? 'Saving...' : 'Add lien'}</Button>
            </fieldset>
          </form>
          <section className="space-y-2">
            <h3 className="font-medium">Liens</h3>
            <div className="overflow-x-auto"><Table>
              <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Reason</TableHead><TableHead>Amount</TableHead><TableHead>Repaid</TableHead><TableHead>Balance</TableHead></TableRow></TableHeader>
              <TableBody>{summary.liens.map((lien) => <TableRow key={lien.id}>
                <TableCell>{formatDateTimeDmy(lien.createdAt)}</TableCell><TableCell>{lien.description}</TableCell><TableCell>{money(lien.amount)}</TableCell><TableCell>{money(lien.amountPaid)}</TableCell><TableCell>{money(lien.balance)}</TableCell>
              </TableRow>)}{!summary.liens.length && <TableRow><TableCell colSpan={5}>No liens on this meter.</TableCell></TableRow>}</TableBody>
            </Table></div>
          </section>
          <section className="space-y-2">
            <div className="flex items-center justify-between"><h3 className="font-medium">Lien repayment history</h3><Button variant="outline" disabled={saving} onClick={() => setReload((value) => value + 1)}>Refresh</Button></div>
            <p className="text-xs text-muted-foreground">Token allocation is the amount available for vending, not confirmation that a token was issued.</p>
            <div className="overflow-x-auto"><Table>
              <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Transaction</TableHead><TableHead>Payment</TableHead><TableHead>Lien repaid</TableHead><TableHead>Token allocation</TableHead></TableRow></TableHeader>
              <TableBody>{summary.repayments.map((repayment) => <TableRow key={repayment.paymentId}>
                <TableCell>{formatDateTimeDmy(repayment.createdAt)}</TableCell><TableCell>{repayment.transactionId || repayment.paymentId}</TableCell><TableCell>{money(repayment.paymentAmount)}</TableCell><TableCell>{money(repayment.lienAmount)}</TableCell><TableCell>{money(repayment.tokenAmount)}</TableCell>
              </TableRow>)}{!summary.repayments.length && <TableRow><TableCell colSpan={5}>No lien repayments yet.</TableCell></TableRow>}</TableBody>
            </Table></div>
          </section>
        </>
      )}
    </div>
  );
}
