import { useState } from 'react';
import { BarChart3, Upload } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';

interface MeterRow {
  meterNumber: string;
  grossCollected: number;
  commission: number;
  bankFee: number;
  smsFee: number;
  net: number;
  tokenCount: number;
}

interface ReportDto {
  from: string;
  to: string;
  grossCollected: number;
  commissionIncome: number;
  bankFee: number;
  smsFee: number;
  ussdFee: number;
  net: number;
  tokenCount: number;
  ussdSessionCount: number;
  meters: MeterRow[];
}

interface UssdCharge {
  id: number;
  sessionId: string;
  phoneNumber?: string | null;
  durationSeconds?: number | null;
  charge: number;
  outcome?: string | null;
  billingDate: string;
}

const money = (value: number) => `UGX ${(value ?? 0).toLocaleString()}`;

const FinancialReports = () => {
  const { toast } = useToast();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [report, setReport] = useState<ReportDto | null>(null);
  const [ussdCharges, setUssdCharges] = useState<UssdCharge[]>([]);
  const [ussdPage, setUssdPage] = useState(1);
  const [ussdTotal, setUssdTotal] = useState(0);
  const [ussdHasMore, setUssdHasMore] = useState(false);
  const [meterPage, setMeterPage] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const loadReport = async () => {
    setLoading(true);
    try {
      const { data } = await api.get<ReportDto>('/GetUtilityProfitabilityReport', {
        params: { ...(from ? { from } : {}), ...(to ? { to } : {}) },
      });
      setReport(data);
      setMeterPage(1);
    } catch {
      toast({ title: 'Error', description: 'Unable to load report.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const loadUssd = async (page = 1) => {
    try {
      const { data } = await api.get<{ items: UssdCharge[]; page: number; total: number; hasMore: boolean }>('/GetUssdSessionCharges', {
        params: { page, pageSize: 20, ...(from ? { from } : {}), ...(to ? { to } : {}) },
      });
      setUssdCharges(data.items ?? []);
      setUssdPage(data.page ?? 1);
      setUssdTotal(data.total ?? 0);
      setUssdHasMore(data.hasMore ?? false);
    } catch {
      toast({ title: 'Error', description: 'Unable to load USSD charges.', variant: 'destructive' });
    }
  };

  const upload = async () => {
    if (!file) {
      toast({ title: 'No file', description: 'Choose a CSV file to upload.', variant: 'destructive' });
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (from) formData.append('billingDate', new Date(from).toISOString());
      const { data } = await api.post('/ImportUssdSessionCharges', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast({ title: 'Imported', description: `${data.imported} USSD session charge(s) imported.` });
      setFile(null);
      await loadUssd(1);
      await loadReport();
    } catch (error) {
      toast({ title: 'Error', description: error?.response?.data?.message ?? 'Import failed.', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Financial Reports</h1>
        <p className="text-muted-foreground">Utility profitability: commission vs bank, SMS and USSD fees.</p>
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
        <Button onClick={loadReport} disabled={loading}>{loading ? 'Loading...' : 'Run Report'}</Button>
      </div>

      <Tabs defaultValue="profit">
        <TabsList>
          <TabsTrigger value="profit" onClick={loadReport}>Profitability</TabsTrigger>
          <TabsTrigger value="ussd" onClick={() => loadUssd(1)}>USSD Charges</TabsTrigger>
        </TabsList>

        <TabsContent value="profit" className="space-y-4">
          {report && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <Card><CardHeader><CardTitle className="text-sm">Gross Collected</CardTitle></CardHeader><CardContent className="font-bold">{money(report.grossCollected)}</CardContent></Card>
                <Card><CardHeader><CardTitle className="text-sm">Commission</CardTitle></CardHeader><CardContent className="font-bold text-green-600">{money(report.commissionIncome)}</CardContent></Card>
                <Card><CardHeader><CardTitle className="text-sm">Bank Fee (1.5%)</CardTitle></CardHeader><CardContent className="font-bold text-red-600">{money(report.bankFee)}</CardContent></Card>
                <Card><CardHeader><CardTitle className="text-sm">SMS Fees</CardTitle></CardHeader><CardContent className="font-bold text-red-600">{money(report.smsFee)}</CardContent></Card>
                <Card><CardHeader><CardTitle className="text-sm">USSD Fees</CardTitle></CardHeader><CardContent className="font-bold text-red-600">{money(report.ussdFee)}</CardContent></Card>
                <Card><CardHeader><CardTitle className="text-sm">Net</CardTitle></CardHeader><CardContent className="font-bold">{money(report.net)}</CardContent></Card>
              </div>

              <Card>
                <CardHeader><CardTitle className="text-sm flex items-center gap-2"><BarChart3 className="h-4 w-4" /> Per meter</CardTitle></CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Meter</TableHead>
                        <TableHead className="text-right">Gross</TableHead>
                        <TableHead className="text-right">Commission</TableHead>
                        <TableHead className="text-right">Bank Fee</TableHead>
                        <TableHead className="text-right">SMS Fee</TableHead>
                        <TableHead className="text-right">Tokens</TableHead>
                        <TableHead className="text-right">Net</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {report.meters.slice((meterPage - 1) * 10, meterPage * 10).map((m) => (
                        <TableRow key={m.meterNumber}>
                          <TableCell>{m.meterNumber}</TableCell>
                          <TableCell className="text-right">{money(m.grossCollected)}</TableCell>
                          <TableCell className="text-right">{money(m.commission)}</TableCell>
                          <TableCell className="text-right">{money(m.bankFee)}</TableCell>
                          <TableCell className="text-right">{money(m.smsFee)}</TableCell>
                          <TableCell className="text-right">{m.tokenCount}</TableCell>
                          <TableCell className="text-right">{money(m.net)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {report.meters.length > 10 && (
                    <div className="mt-3 flex items-center gap-3">
                      <Button variant="outline" size="sm" disabled={meterPage <= 1} onClick={() => setMeterPage((p) => Math.max(1, p - 1))}>Previous</Button>
                      <span className="text-sm">Page {meterPage} of {Math.ceil(report.meters.length / 10)}</span>
                      <Button variant="outline" size="sm" disabled={meterPage * 10 >= report.meters.length} onClick={() => setMeterPage((p) => p + 1)}>Next</Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
          {!report && <p className="text-muted-foreground">Choose a period and run the report.</p>}
        </TabsContent>

        <TabsContent value="ussd" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2"><Upload className="h-4 w-4" /> Upload USSD session charges</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap items-end gap-3">
              <div className="space-y-1">
                <Label>CSV file</Label>
                <Input type="file" accept=".csv" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              </div>
              <Button onClick={upload} disabled={uploading}>{uploading ? 'Uploading...' : 'Upload'}</Button>
              <p className="text-xs text-muted-foreground w-full">Operator statement CSV columns: Date, SessionId, Service Code, Phone Number, Hops, Hops Metadata, Duration, Cost, Status, Input</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Billing Date</TableHead>
                    <TableHead>Session</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Outcome</TableHead>
                    <TableHead className="text-right">Charge</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ussdCharges.length > 0 ? (
                    ussdCharges.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell>{new Date(c.billingDate).toLocaleDateString()}</TableCell>
                        <TableCell>{c.sessionId}</TableCell>
                        <TableCell>{c.phoneNumber ?? '-'}</TableCell>
                        <TableCell>{c.outcome ?? '-'}</TableCell>
                        <TableCell className="text-right text-red-600">{money(c.charge)}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow><TableCell colSpan={5} className="py-10 text-center text-gray-500">No USSD charges for this period</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{ussdTotal} session charge(s)</span>
                <div className="flex items-center gap-3">
                  <Button variant="outline" size="sm" disabled={ussdPage <= 1} onClick={() => loadUssd(ussdPage - 1)}>Previous</Button>
                  <span className="text-sm">Page {ussdPage}</span>
                  <Button variant="outline" size="sm" disabled={!ussdHasMore} onClick={() => loadUssd(ussdPage + 1)}>Next</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default FinancialReports;
