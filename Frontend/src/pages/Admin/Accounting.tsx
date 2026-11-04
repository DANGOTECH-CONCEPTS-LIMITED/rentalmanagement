import { useState } from 'react';
import { Calculator } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';

interface ProfitDto {
  from: string;
  to: string;
  totalIncome: number;
  totalExpense: number;
  netProfit: number;
  breakdown: { accountCode: string; accountName: string; accountType: string; debit: number; credit: number; net: number }[];
}

interface TrialBalanceDto {
  from: string;
  to: string;
  rows: { accountCode: string; accountName: string; debit: number; credit: number }[];
  totalDebit: number;
  totalCredit: number;
}

const money = (value: number) => `UGX ${(value ?? 0).toLocaleString()}`;

const Accounting = () => {
  const { toast } = useToast();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [profit, setProfit] = useState<ProfitDto | null>(null);
  const [trial, setTrial] = useState<TrialBalanceDto | null>(null);
  const [loading, setLoading] = useState(false);

  const loadProfit = async () => {
    setLoading(true);
    try {
      const { data } = await api.get<ProfitDto>('/api/accounting/profit', { params: { from, to } });
      setProfit(data);
    } catch {
      toast({ title: 'Error', description: 'Unable to load profit report.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const loadTrial = async () => {
    setLoading(true);
    try {
      const { data } = await api.get<TrialBalanceDto>('/api/accounting/trial-balance', { params: { from, to } });
      setTrial(data);
    } catch {
      toast({ title: 'Error', description: 'Unable to load trial balance.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Accounting</h1>
        <p className="text-muted-foreground">Profit &amp; loss and trial balance from the general ledger.</p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label>From</Label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" />
        </div>
        <div className="space-y-1">
          <Label>To</Label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" />
        </div>
      </div>

      <Tabs defaultValue="profit">
        <TabsList>
          <TabsTrigger value="profit" onClick={loadProfit}>Profit &amp; Loss</TabsTrigger>
          <TabsTrigger value="trial" onClick={loadTrial}>Trial Balance</TabsTrigger>
        </TabsList>

        <TabsContent value="profit" className="space-y-4">
          {profit && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card><CardHeader><CardTitle className="text-sm">Income</CardTitle></CardHeader><CardContent className="text-2xl font-bold text-green-600">{money(profit.totalIncome)}</CardContent></Card>
                <Card><CardHeader><CardTitle className="text-sm">Expenses</CardTitle></CardHeader><CardContent className="text-2xl font-bold text-red-600">{money(profit.totalExpense)}</CardContent></Card>
                <Card><CardHeader><CardTitle className="text-sm">Net Profit</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{money(profit.netProfit)}</CardContent></Card>
              </div>
              <Card>
                <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Calculator className="h-4 w-4" /> Breakdown</CardTitle></CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader><TableRow><TableHead>Account</TableHead><TableHead>Type</TableHead><TableHead className="text-right">Debit</TableHead><TableHead className="text-right">Credit</TableHead><TableHead className="text-right">Net</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {profit.breakdown.map((row) => (
                        <TableRow key={row.accountCode}>
                          <TableCell>{row.accountName || row.accountCode}</TableCell>
                          <TableCell>{row.accountType}</TableCell>
                          <TableCell className="text-right">{money(row.debit)}</TableCell>
                          <TableCell className="text-right">{money(row.credit)}</TableCell>
                          <TableCell className="text-right">{money(row.net)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          )}
          {!profit && <Button onClick={loadProfit} disabled={loading}>{loading ? 'Loading...' : 'Load Profit & Loss'}</Button>}
        </TabsContent>

        <TabsContent value="trial" className="space-y-4">
          {trial && (
            <Card>
              <CardContent>
                <Table>
                  <TableHeader><TableRow><TableHead>Account</TableHead><TableHead className="text-right">Debit</TableHead><TableHead className="text-right">Credit</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {trial.rows.map((row) => (
                      <TableRow key={row.accountCode}>
                        <TableCell>{row.accountName || row.accountCode}</TableCell>
                        <TableCell className="text-right">{money(row.debit)}</TableCell>
                        <TableCell className="text-right">{money(row.credit)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="mt-4 flex justify-between font-semibold">
                  <span>Total Debit: {money(trial.totalDebit)}</span>
                  <span>Total Credit: {money(trial.totalCredit)}</span>
                </div>
              </CardContent>
            </Card>
          )}
          {!trial && <Button onClick={loadTrial} disabled={loading}>{loading ? 'Loading...' : 'Load Trial Balance'}</Button>}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Accounting;
