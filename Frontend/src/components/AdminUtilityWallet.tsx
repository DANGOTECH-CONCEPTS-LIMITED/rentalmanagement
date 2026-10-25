import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { buildRunningBalanceStatement } from '@/lib/wallet-statement';
import { exportWalletStatementCsv, exportWalletStatementPdf } from '@/lib/wallet-statement-export';
import type { UtilityPaymentAccount } from './AdminUtilityAccountWorkspace';

interface Props { account: UtilityPaymentAccount; apiUrl: string; authToken: string }
interface Entry { amount: number; description: string; transactionDate: string; status?: string }
const currency = (amount: number) => new Intl.NumberFormat('en-UG', { style: 'currency', currency: 'UGX', maximumFractionDigits: 2 }).format(amount);
const errorText = (error: unknown) => {
  if (axios.isAxiosError(error)) {
    if (typeof error.response?.data === 'string') return error.response.data;
    if (typeof error.response?.data?.message === 'string') return error.response.data.message;
  }
  return 'Unable to process the wallet request. Refresh before trying again.';
};

export default function AdminUtilityWallet(props: Props) {
  return <AccountWallet key={`${props.account.id}:${props.authToken}:${props.apiUrl}`} {...props} />;
}

function AccountWallet({ account, apiUrl, authToken }: Props) {
  const [balance, setBalance] = useState<number | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reload, setReload] = useState(0);
  const pending = useRef(false);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => {
    const lifecycle = new AbortController();
    controller.current = lifecycle;
    return () => lifecycle.abort();
  }, []);
  useEffect(() => {
    const request = new AbortController();
    setLoading(true);
    setBalance(null);
    setEntries([]);
    Promise.all([
      axios.get<{ balance: number }>(`${apiUrl}/GetBalance/${account.id}`, { headers: { Authorization: `Bearer ${authToken}` }, signal: request.signal }),
      axios.get<Entry[]>(`${apiUrl}/GetStatement/${account.id}`, { headers: { Authorization: `Bearer ${authToken}` }, signal: request.signal }),
    ]).then(([wallet, statement]) => {
      if (request.signal.aborted) return;
      const value = Number(wallet.data.balance);
      if (!Number.isFinite(value) || !Array.isArray(statement.data)) throw new Error('Invalid wallet response.');
      setBalance(value); setEntries(statement.data); setError('');
    }).catch((err: unknown) => { if (!request.signal.aborted) setError(errorText(err)); })
      .finally(() => { if (!request.signal.aborted) setLoading(false); });
    return () => request.abort();
  }, [account.id, apiUrl, authToken, reload]);

  const validAmount = /^\d+(\.\d{1,2})?$/.test(amount.trim()) && Number(amount) > 0 && balance !== null && Number(amount) <= balance;
  const ready = !loading && !saving && !error && validAmount && !!reason.trim() && reason.trim().length <= 500;
  const withdraw = async () => {
    if (!ready || pending.current || !confirm) return;
    pending.current = true;
    setSaving(true);
    const signal = controller.current!.signal;
    try {
      await axios.post(`${apiUrl}/AdminWithdrawUtilityWallet`, { sourceUserId: account.id, amount: Number(amount), description: reason.trim() }, { headers: { Authorization: `Bearer ${authToken}` }, signal });
      if (signal.aborted) return;
      setNotice('Withdrawal submitted using this account’s saved payout details. Submission does not confirm payout completion.');
      setAmount(''); setReason(''); setConfirm(false); setReload((value) => value + 1);
    } catch (err: unknown) {
      if (!signal.aborted) { setError(errorText(err)); setConfirm(false); }
    } finally {
      pending.current = false;
      if (!signal.aborted) setSaving(false);
    }
  };
  const rows = buildRunningBalanceStatement(entries, balance);
  const exportOptions = { fileNamePrefix: `utility-wallet-${account.id}`, accountName: account.fullName };
  return <Card><CardHeader><CardTitle>Wallet — {account.fullName}</CardTitle></CardHeader><CardContent className="min-w-0 space-y-4">
    {loading && <p role="status">Loading wallet...</p>}
    {error && <p role="alert">{error}</p>}
    {notice && <p role="status">{notice}</p>}
    <p>Available balance: <strong>{balance === null ? '--' : currency(balance)}</strong></p>
    <Button variant="outline" disabled={loading || saving} onClick={() => setReload((value) => value + 1)}>Refresh wallet</Button>
    <form onSubmit={(event) => { event.preventDefault(); if (ready) setConfirm(true); }} className="space-y-3">
      <fieldset disabled={loading || saving || !!error || balance === null} className="space-y-3">
        <Label htmlFor="admin-withdraw-amount">Withdrawal amount</Label>
        <Input id="admin-withdraw-amount" type="number" min="0.01" step="0.01" max={balance ?? undefined} value={amount} onChange={(event) => setAmount(event.target.value)} required />
        <Label htmlFor="admin-withdraw-reason">Withdrawal reason</Label>
        <Input id="admin-withdraw-reason" value={reason} maxLength={500} onChange={(event) => setReason(event.target.value)} required />
        <p className="text-sm text-muted-foreground">Funds are withdrawn from {account.fullName}’s wallet to their saved payout destination, not the administrator’s account.</p>
        <Button type="submit" disabled={!ready}>Review withdrawal</Button>
      </fieldset>
    </form>
    <Dialog open={confirm} onOpenChange={(open) => { if (!saving) setConfirm(open); }}>
      <DialogContent className="w-[calc(100%-2rem)] max-h-[90dvh] overflow-y-auto">
        <DialogHeader><DialogTitle>Confirm utility wallet withdrawal</DialogTitle><DialogDescription>Withdraw {currency(Number(amount))} from {account.fullName} (#{account.id}) using this account’s saved payout details. Reason: {reason}</DialogDescription></DialogHeader>
        <Button variant="outline" disabled={saving} onClick={() => setConfirm(false)}>Cancel</Button>
        <Button disabled={!ready} onClick={() => void withdraw()}>{saving ? 'Submitting...' : 'Confirm withdrawal'}</Button>
      </DialogContent>
    </Dialog>
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" disabled={loading || !!error || !rows.length} onClick={() => exportWalletStatementCsv(rows, exportOptions)}>Export wallet CSV</Button>
      <Button variant="outline" disabled={loading || !!error || !rows.length} onClick={() => exportWalletStatementPdf(rows, { ...exportOptions, title: 'Utility Wallet Statement', formatAmount: currency })}>Export wallet PDF</Button>
    </div>
    <div className="max-h-96 min-w-0 overflow-auto"><Table><TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Description</TableHead><TableHead>Status</TableHead><TableHead>Amount</TableHead><TableHead>Running balance</TableHead></TableRow></TableHeader><TableBody>
      {rows.map((entry, index) => <TableRow key={index}><TableCell>{new Date(entry.transactionDate).toLocaleDateString()}</TableCell><TableCell>{entry.description}</TableCell><TableCell>{entry.status || '--'}</TableCell><TableCell>{currency(entry.amount)}</TableCell><TableCell>{entry.runningBalance === null ? '--' : currency(entry.runningBalance)}</TableCell></TableRow>)}
      {!loading && !error && !rows.length && <TableRow><TableCell colSpan={5}>No wallet transactions.</TableCell></TableRow>}
    </TableBody></Table></div>
  </CardContent></Card>;
}
