import { useEffect, useState } from 'react';
import { Wrench, Trash2, Save } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { api, getUser } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface Maintenance {
  id: number;
  subject: string;
  description: string;
  priority: string;
  status: string;
  cost: number;
  resolutionDetails?: string | null;
  propertyId: number;
  tenantId?: number | null;
  createdAt: string;
  property?: { id: number; name: string };
  tenant?: { id: number; fullName: string };
}

const STATUSES = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];

const Maintenance = () => {
  const { toast } = useToast();
  const [requests, setRequests] = useState<Maintenance[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Maintenance | null>(null);
  const [status, setStatus] = useState('OPEN');
  const [cost, setCost] = useState('0');
  const [resolution, setResolution] = useState('');
  const [saving, setSaving] = useState(false);

  const landlordId = getUser()?.id ?? null;

  const load = async () => {
    if (!landlordId) return;
    setLoading(true);
    try {
      const { data } = await api.get<Maintenance[]>(`/GetMaintenanceByLandlordId/${landlordId}`);
      setRequests(data ?? []);
    } catch {
      toast({ title: 'Error', description: 'Unable to load maintenance requests.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [landlordId]);

  const openEdit = (request: Maintenance) => {
    setEditing(request);
    setStatus(request.status);
    setCost(String(request.cost ?? 0));
    setResolution(request.resolutionDetails ?? '');
  };

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      await api.put(`/UpdateMaintenanceRequest/${editing.id}`, {
        status,
        cost: Number(cost || 0),
        resolutionDetails: resolution,
      });
      toast({ title: 'Saved', description: 'Maintenance request updated.' });
      setEditing(null);
      await load();
    } catch (error) {
      toast({ title: 'Error', description: error?.response?.data?.message ?? 'Unable to update request.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (request: Maintenance) => {
    if (!confirm(`Delete request "${request.subject}"?`)) return;
    try {
      await api.delete(`/DeleteMaintenanceRequest/${request.id}`);
      toast({ title: 'Deleted', description: 'Maintenance request removed.' });
      await load();
    } catch (error) {
      toast({ title: 'Error', description: error?.response?.data?.message ?? 'Unable to delete request.', variant: 'destructive' });
    }
  };

  const priorityBadge = (priority: string) => {
    const styles: Record<string, string> = {
      URGENT: 'bg-red-100 text-red-800',
      HIGH: 'bg-orange-100 text-orange-800',
      MEDIUM: 'bg-yellow-100 text-yellow-800',
      LOW: 'bg-blue-100 text-blue-800',
    };
    return <span className={`px-2 py-1 rounded-full text-xs ${styles[priority] ?? 'bg-gray-100'}`}>{priority.charAt(0) + priority.slice(1).toLowerCase()}</span>;
  };

  return (
    <div className="space-y-8">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem><BreadcrumbLink href="/landlord-dashboard">Dashboard</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbPage>Maintenance</BreadcrumbPage></BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <section className="page-hero">
        <span className="inline-flex w-fit items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          Maintenance
        </span>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Maintenance Requests</h1>
        <p className="mt-2 text-sm text-muted-foreground md:text-base">
          Triage and resolve repair requests from your tenants.
        </p>
      </section>

      <Card className="data-surface border-none shadow-none">
        <CardContent className="p-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Subject</TableHead>
                <TableHead>Tenant</TableHead>
                <TableHead>Property</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Cost</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!loading && requests.length > 0 ? (
                requests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell className="font-medium">
                      {request.subject}
                      <p className="text-xs text-muted-foreground font-normal truncate max-w-[240px]">{request.description}</p>
                    </TableCell>
                    <TableCell>{request.tenant?.fullName ?? '-'}</TableCell>
                    <TableCell>{request.property?.name ?? '-'}</TableCell>
                    <TableCell>{priorityBadge(request.priority)}</TableCell>
                    <TableCell>{request.status}</TableCell>
                    <TableCell>{request.cost > 0 ? `UGX ${request.cost.toLocaleString()}` : '-'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => openEdit(request)}>Update</Button>
                        <Button variant="ghost" size="icon" className="text-red-600" onClick={() => remove(request)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-gray-500">
                    <Wrench className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>{loading ? 'Loading...' : 'No maintenance requests'}</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update request</DialogTitle>
            <DialogDescription>{editing?.subject}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Cost (UGX)</Label>
              <Input type="number" value={cost} onChange={(e) => setCost(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Resolution details</Label>
              <Input value={resolution} onChange={(e) => setResolution(e.target.value)} placeholder="How was it resolved?" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button disabled={saving} onClick={save} className="flex items-center gap-2">
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Maintenance;
