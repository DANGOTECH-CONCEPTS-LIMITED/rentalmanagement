import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { api, getUser } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ProfitLossDto {
  from: string;
  to: string;
  income: number;
  expenses: number;
  net: number;
  paymentCount: number;
  maintenanceCount: number;
}

const money = (value: number) => `UGX ${(value ?? 0).toLocaleString()}`;

const ProfitLoss = () => {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [report, setReport] = useState<ProfitLossDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const landlordId = getUser()?.id ?? null;

  const load = async () => {
    if (!landlordId) return;
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get<ProfitLossDto>(`/GetLandlordProfitLoss/${landlordId}`, {
        params: { ...(from ? { from } : {}), ...(to ? { to } : {}) },
      });
      setReport(data);
    } catch {
      setError('Unable to load the profit & loss report.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [landlordId]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Income vs Expense</h1>
        <p className="text-muted-foreground">A monthly profit &amp; loss view of your rentals.</p>
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
        <Button onClick={load} disabled={loading}>{loading ? 'Loading...' : 'Run Report'}</Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {report && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="h-4 w-4 text-green-600" /> Income</CardTitle></CardHeader>
              <CardContent className="text-2xl font-bold text-green-600">{money(report.income)}</CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm flex items-center gap-2"><TrendingDown className="h-4 w-4 text-red-600" /> Expenses</CardTitle></CardHeader>
              <CardContent className="text-2xl font-bold text-red-600">{money(report.expenses)}</CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm">Net</CardTitle></CardHeader>
              <CardContent className="text-2xl font-bold">{money(report.net)}</CardContent>
            </Card>
          </div>
          <p className="text-sm text-muted-foreground">
            {report.paymentCount} successful payment(s) and {report.maintenanceCount} resolved maintenance request(s) in this period.
          </p>
        </>
      )}
    </div>
  );
};

export default ProfitLoss;
