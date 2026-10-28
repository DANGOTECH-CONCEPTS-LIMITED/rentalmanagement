import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface Props {
  apiUrl: string;
  authToken: string;
}
interface Payout {
  id: number;
  transactionId: string;
  amount: number;
  status: string;
  vendorReference: string;
  owner: string;
}
interface PayoutPage {
  items: Payout[];
  page: number;
  pageSize: number;
  hasMore: boolean;
}

function isPayoutPage(data: PayoutPage): boolean {
  return !!data && Array.isArray(data.items) && Number.isInteger(data.page) && data.page > 0 &&
    data.pageSize === 20 && typeof data.hasMore === 'boolean' && data.items.every(item =>
      item && Number.isSafeInteger(item.id) && item.id > 0 && typeof item.transactionId === 'string' &&
      item.transactionId.length > 0 && Number.isFinite(item.amount) && item.amount > 0 &&
      typeof item.status === 'string' && typeof item.vendorReference === 'string' && typeof item.owner === 'string');
}

export default function AdminPayoutReconciliation(props: Props) {
  // Changing credentials or API must discard any previously selected payout and confirmation.
  return <Reconciliation key={JSON.stringify([props.apiUrl, props.authToken])} {...props} />;
}

function Reconciliation({ apiUrl, authToken }: Props) {
  const endpoint = `${apiUrl.replace(/\/+$/, '').replace(/\/api(?:\/.*)?$/i, '')}/api/AdminPayoutReconciliation`;
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState({ reference: '', page: 1, reload: 0 });
  const [result, setResult] = useState<PayoutPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const inFlight = useRef(false);
  const [mustRefresh, setMustRefresh] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [selected, setSelected] = useState<Payout | null>(null);
  const [reason, setReason] = useState('');
  const [confirmedId, setConfirmedId] = useState('');
  const [confirmUnpaid, setConfirmUnpaid] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setResult(null);
    setError('');
    if (!apiUrl || !authToken) {
      setError('Sign in with an administrator account and configure the API URL.');
      setLoading(false);
      return () => controller.abort();
    }
    axios.get<PayoutPage>(endpoint, {
      headers: { Authorization: `Bearer ${authToken}` },
      params: { ...(query.reference ? { reference: query.reference } : {}), page: query.page, pageSize: 20 },
      signal: controller.signal,
    }).then(({ data }) => {
      if (!isPayoutPage(data) || data.page !== query.page) throw new Error('Invalid payout list');
      if (!controller.signal.aborted) {
        setResult(data);
        setMustRefresh(false);
      }
    }).catch(() => {
      if (!controller.signal.aborted) setError('Unable to load payouts. Refresh the list before taking any action.');
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [apiUrl, authToken, endpoint, query]);

  const loadPage = (page: number, reference = query.reference) => {
    if (inFlight.current) return;
    setLoading(true);
    setSelected(null);
    setNotice('');
    setQuery(current => ({ reference, page, reload: current.reload + 1 }));
  };

  const reverse = async () => {
    if (!selected || loading || mustRefresh || inFlight.current || !reason.trim() || !confirmUnpaid || confirmedId !== selected.transactionId) return;
    inFlight.current = true;
    setProcessing(true);
    setError('');
    setNotice('');
    try {
      const { data } = await axios.post<{ transactionId: string; status: string; amount: number }>(
        `${endpoint}/${selected.id}/fail-and-reverse`,
        { reason: reason.trim(), confirmUnpaid, confirmedTransactionId: confirmedId },
        { headers: { Authorization: `Bearer ${authToken}` } },
      );
      if (!data || data.status !== 'REVERSED' || data.transactionId !== selected.transactionId || data.amount !== selected.amount) {
        throw new Error('Unconfirmed reversal');
      }
      setResult(current => current ? { ...current, items: current.items.filter(item => item.id !== selected.id) } : null);
      setNotice(`Transaction ${data.transactionId} reversed. Refund amount: ${data.amount.toLocaleString()}. No payout was resubmitted.`);
    } catch (failure) {
      setMustRefresh(true);
      const conflict = axios.isAxiosError(failure) && failure.response?.status === 409;
      setError(`${conflict ? 'Reversal blocked: payout status or provider response changed.' : 'Unable to confirm reversal; the request may have completed.'} Refresh the list before retrying. Do not blindly retry or resubmit the payout.`);
    } finally {
      setSelected(null);
      inFlight.current = false;
      setProcessing(false);
    }
  };

  return (
    <section className="space-y-4 border-t pt-6" aria-label="Dango payout reconciliation">
      <div>
        <h3 className="font-medium">Payout reconciliation</h3>
        <p className="text-sm text-muted-foreground">Pending Dango payouts only. A provider 404 / not-found response is not automatically terminal and is not proof that a payout is unpaid. Verify independently before manually failing a payout and refunding its wallet. No automatic reversal or payout resubmission occurs.</p>
      </div>
      <form className="flex flex-wrap items-end gap-2" onSubmit={event => { event.preventDefault(); loadPage(1, search); }}>
        <div className="space-y-1">
          <Label htmlFor="payout-reference">Exact reference</Label>
          <Input id="payout-reference" value={search} onChange={event => setSearch(event.target.value)} disabled={processing} />
        </div>
        <Button type="submit" variant="outline" disabled={loading || processing}>Search payouts</Button>
        <Button type="button" variant="outline" onClick={() => loadPage(query.page)} disabled={loading || processing}>Refresh payouts</Button>
      </form>
      {loading && <p role="status">Loading payouts…</p>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      {mustRefresh && <p className="text-sm">Actions are locked until the payout list is successfully refreshed.</p>}
      {result && !loading && <>
        {result.items.length === 0 ? <p>No pending Dango payouts found.</p> : <Table>
          <TableHeader><TableRow>
            <TableHead>Transaction</TableHead><TableHead>Vendor reference</TableHead><TableHead>Owner</TableHead>
            <TableHead>Refund amount</TableHead><TableHead>Status</TableHead><TableHead>Action</TableHead>
          </TableRow></TableHeader>
          <TableBody>{result.items.map(item => <TableRow key={item.id}>
            <TableCell>{item.transactionId}</TableCell><TableCell>{item.vendorReference}</TableCell><TableCell>{item.owner}</TableCell>
            <TableCell>{item.amount.toLocaleString()}</TableCell><TableCell>{item.status}</TableCell>
            <TableCell><Button variant="destructive" disabled={processing || mustRefresh} aria-label={`Review reversal for ${item.transactionId}`} onClick={() => {
              setSelected(item); setReason(''); setConfirmedId(''); setConfirmUnpaid(false);
            }}>Review reversal</Button></TableCell>
          </TableRow>)}</TableBody>
        </Table>}
        <div className="flex items-center gap-3">
          <Button variant="outline" disabled={processing || result.page <= 1} onClick={() => loadPage(result.page - 1)}>Previous payouts</Button>
          <span>Page {result.page}</span>
          <Button variant="outline" disabled={processing || !result.hasMore} onClick={() => loadPage(result.page + 1)}>Next payouts</Button>
        </div>
      </>}
      <Dialog open={!!selected} onOpenChange={open => { if (!open && !inFlight.current) setSelected(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm payout failure and refund</DialogTitle>
            <DialogDescription>Provider not-found alone is not proof of non-payment. A late payout could still arrive after this refund, causing a double payment. Verify the payout is unpaid before proceeding. The server will freshly check the provider; this does not resubmit the payout.</DialogDescription>
          </DialogHeader>
          {selected && <>
            <dl className="space-y-1 text-sm">
              <dt>Transaction</dt><dd>{selected.transactionId}</dd>
              <dt>Vendor reference</dt><dd>{selected.vendorReference}</dd>
              <dt>Owner</dt><dd>{selected.owner}</dd>
              <dt>Refund amount</dt><dd>{selected.amount.toLocaleString()}</dd>
            </dl>
            <Label htmlFor="payout-reversal-reason">Reason and verification evidence</Label>
            <Textarea id="payout-reversal-reason" value={reason} onChange={event => setReason(event.target.value)} disabled={processing} />
            <Label htmlFor="payout-confirmed-id">Type the transaction ID to confirm</Label>
            <Input id="payout-confirmed-id" value={confirmedId} onChange={event => setConfirmedId(event.target.value)} disabled={processing} autoComplete="off" />
            <div className="flex items-start gap-2">
              <Checkbox id="payout-confirm-unpaid" checked={confirmUnpaid} onCheckedChange={value => setConfirmUnpaid(value === true)} disabled={processing} />
              <Label htmlFor="payout-confirm-unpaid">I independently verified this payout is unpaid. I understand provider not-found alone is not proof and accept the risk of a late payout after refund.</Label>
            </div>
            <DialogFooter>
              <Button variant="outline" disabled={processing} onClick={() => setSelected(null)}>Cancel</Button>
              <Button variant="destructive" disabled={processing || mustRefresh || !reason.trim() || !confirmUnpaid || confirmedId !== selected.transactionId} onClick={reverse}>
                {processing ? 'Reversing…' : 'Fail payout and refund'}
              </Button>
            </DialogFooter>
          </>}
        </DialogContent>
      </Dialog>
    </section>
  );
}
