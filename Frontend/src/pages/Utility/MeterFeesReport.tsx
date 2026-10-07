import { useEffect, useState } from 'react';
import axios from 'axios';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface MeterFeeReport {
  totalCharged: number;
  totalCollected: number;
  totalOutstanding: number;
  rows: {
    utilityMeterId: number;
    meterNumber: string;
    ownerName?: string | null;
    period: string;
    amount: number;
    amountPaid: number;
    balance: number;
    settledAt?: string | null;
  }[];
}

const ALL_OWNERS = 'all';

const MeterFeesReport = () => {
  const [report, setReport] = useState<MeterFeeReport | null>(null);
  const [fromPeriod, setFromPeriod] = useState('');
  const [toPeriod, setToPeriod] = useState('');
  const [ownerId, setOwnerId] = useState(ALL_OWNERS);
  const [utilityUsers, setUtilityUsers] = useState<{ id: number; fullName: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const Url = import.meta.env.VITE_API_BASE_URL;
  let token = '';
  let systemRoleId = 0;
  try {
    const user = localStorage.getItem('user');
    if (user) {
      const userData = JSON.parse(user);
      token = userData.token;
      systemRoleId = userData.systemRoleId;
    }
  } catch (error) {
    console.error('Error parsing user data:', error);
  }
  const isAdmin = systemRoleId === 1;

  useEffect(() => {
    if (!isAdmin) return;
    axios
      .get<{ id: number; fullName: string; systemRoleId: number }[]>(`${Url}/GetAllUsers`, {
        headers: { accept: '*/*', Authorization: `Bearer ${token}` },
      })
      .then((response) =>
        setUtilityUsers(
          response.data
            .filter((u) => u.systemRoleId === 4)
            .sort((a, b) => a.fullName.localeCompare(b.fullName))
        )
      )
      .catch(() => toast({ variant: 'destructive', title: 'Error', description: 'Failed to load utility users' }));
  }, [isAdmin, Url, token]);

  useEffect(() => {
    const fetchReport = async () => {
      setIsLoading(true);
      try {
        const response = await axios.get<MeterFeeReport>(`${Url}/GetUtilityMeterFeesReport`, {
          headers: { accept: '*/*', Authorization: `Bearer ${token}` },
          params: {
            fromPeriod: fromPeriod || undefined,
            toPeriod: toPeriod || undefined,
            ownerId: isAdmin && ownerId !== ALL_OWNERS ? ownerId : undefined,
          },
        });
        setReport(response.data);
      } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to load monthly fees report' });
      } finally {
        setIsLoading(false);
      }
    };

    fetchReport();
  }, [Url, token, fromPeriod, toPeriod, ownerId, isAdmin]);

  const exportCsv = () => {
    if (!report || report.rows.length === 0) return;
    const escape = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;
    const lines = [
      ['Owner', 'Meter Number', 'Period', 'Charged', 'Collected', 'Balance', 'Settled At'].map(escape).join(','),
      ...report.rows.map((row) =>
        [row.ownerName ?? '', row.meterNumber, row.period, row.amount, row.amountPaid, row.balance, row.settledAt ?? '']
          .map(escape)
          .join(',')
      ),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'monthly-meter-fees-report.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8">
      <section className="page-hero">
        <div className="space-y-3">
          <span className="inline-flex w-fit items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Reports
          </span>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Monthly Fees Report</h1>
        </div>
      </section>

      <Card className="data-surface border-none shadow-none">
        <CardHeader>
          <CardTitle>Monthly meter fees</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            {isAdmin && (
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">Utility user</label>
                <Select value={ownerId} onValueChange={setOwnerId}>
                  <SelectTrigger className="w-64">
                    <SelectValue placeholder="All utility users" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_OWNERS}>All utility users</SelectItem>
                    {utilityUsers.map((user) => (
                      <SelectItem key={user.id} value={String(user.id)}>
                        {user.fullName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">From</label>
              <Input type="month" value={fromPeriod} onChange={(e) => setFromPeriod(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">To</label>
              <Input type="month" value={toPeriod} onChange={(e) => setToPeriod(e.target.value)} />
            </div>
            <Button variant="outline" onClick={exportCsv} disabled={!report || report.rows.length === 0}>
              Export CSV
            </Button>
          </div>

          {isLoading || !report ? (
            <Skeleton className="h-4 w-full" />
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Charged</p>
                  <p className="text-lg font-semibold">{report.totalCharged.toLocaleString()}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Collected</p>
                  <p className="text-lg font-semibold">{report.totalCollected.toLocaleString()}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Outstanding</p>
                  <p className="text-lg font-semibold">{report.totalOutstanding.toLocaleString()}</p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Period</TableHead>
                      {isAdmin && <TableHead>Owner</TableHead>}
                      <TableHead>Meter Number</TableHead>
                      <TableHead>Charged</TableHead>
                      <TableHead>Collected</TableHead>
                      <TableHead>Balance</TableHead>
                      <TableHead>Settled</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.rows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={isAdmin ? 7 : 6} className="text-center text-muted-foreground">
                          No monthly fees charged for this selection.
                        </TableCell>
                      </TableRow>
                    ) : (
                      report.rows.map((row) => (
                        <TableRow key={`${row.utilityMeterId}-${row.period}`}>
                          <TableCell>{row.period}</TableCell>
                          {isAdmin && <TableCell>{row.ownerName || '-'}</TableCell>}
                          <TableCell>{row.meterNumber}</TableCell>
                          <TableCell>{row.amount.toLocaleString()}</TableCell>
                          <TableCell>{row.amountPaid.toLocaleString()}</TableCell>
                          <TableCell>{row.balance.toLocaleString()}</TableCell>
                          <TableCell>{row.settledAt ? new Date(row.settledAt).toLocaleDateString() : 'Pending'}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MeterFeesReport;
