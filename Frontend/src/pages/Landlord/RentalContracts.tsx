import { SearchableNativeSelect } from '@/components/ui/searchable-native-select';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, Search, Plus, Trash2, Eye, Filter, Download, RefreshCw, Ban, FilePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { api, getUser } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { useCurrencyFormatter } from '@/hooks/use-currency-formatter';
import jsPDF from 'jspdf';

interface Contract {
  id: number;
  tenantId: number;
  propertyId: number;
  startDate: string;
  endDate: string;
  rentAmount: number;
  deposit: number;
  status: string;
  createdAt: string;
  terminatedAt?: string | null;
  terminationReason?: string | null;
  tenant?: { id: number; fullName: string; email: string; phoneNumber: string };
  property?: { id: number; name: string; address: string; ownerId: number };
}

interface TenantOption {
  id: number;
  fullName: string;
  propertyId: number;
  property?: { ownerId: number };
}

interface PropertyOption {
  id: number;
  name: string;
  ownerId: number;
}

const STATUSES = ['PENDING', 'ACTIVE', 'EXPIRED', 'TERMINATED'];

const RentalContracts = () => {
  const { toast } = useToast();
  const formatCurrency = useCurrencyFormatter();

  const [contracts, setContracts] = useState<Contract[]>([]);
  const [properties, setProperties] = useState<PropertyOption[]>([]);
  const [tenants, setTenants] = useState<TenantOption[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [loading, setLoading] = useState(true);

  const [showAdd, setShowAdd] = useState(false);
  const [selected, setSelected] = useState<Contract | null>(null);
  const [renewing, setRenewing] = useState<Contract | null>(null);
  const [terminating, setTerminating] = useState<Contract | null>(null);

  const [form, setForm] = useState({
    tenantId: '',
    propertyId: '',
    startDate: '',
    endDate: '',
    rentAmount: '',
    deposit: '',
    status: 'PENDING',
  });
  const [newEndDate, setNewEndDate] = useState('');
  const [terminationReason, setTerminationReason] = useState('');
  const [saving, setSaving] = useState(false);

  const landlordId = getUser()?.id ?? null;

  const load = async () => {
    if (!landlordId) return;
    setLoading(true);
    try {
      const [contractsRes, propertiesRes, tenantsRes] = await Promise.all([
        api.get<Contract[]>(`/GetRentalContractsByLandlordId/${landlordId}`),
        api.get<PropertyOption[]>(`/GetPropertiesByLandLordId/${landlordId}`),
        api.get<TenantOption[]>('/GetAllTenants'),
      ]);
      setContracts(contractsRes.data ?? []);
      setProperties(propertiesRes.data ?? []);
      setTenants((tenantsRes.data ?? []).filter((t) => t.property?.ownerId === landlordId));
    } catch {
      toast({ title: 'Error', description: 'Unable to load contracts.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [landlordId]);

  const filteredContracts = contracts.filter(
    (contract) =>
      ((contract.tenant?.fullName ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (contract.property?.name ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(contract.id).includes(searchTerm.toLowerCase())) &&
      (filterStatus === 'all' || contract.status === filterStatus)
  );

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      ACTIVE: 'bg-green-100 text-green-800',
      EXPIRED: 'bg-red-100 text-red-800',
      TERMINATED: 'bg-slate-200 text-slate-700',
      PENDING: 'bg-yellow-100 text-yellow-800',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs ${styles[status] ?? 'bg-gray-100 text-gray-800'}`}>
        {status.charAt(0) + status.slice(1).toLowerCase()}
      </span>
    );
  };

  const submitAdd = async () => {
    if (!form.tenantId || !form.propertyId || !form.startDate || !form.endDate || !form.rentAmount) {
      toast({ title: 'Missing fields', description: 'Tenant, property, dates and rent are required.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      await api.post('/AddRentalContract', {
        tenantId: Number(form.tenantId),
        propertyId: Number(form.propertyId),
        startDate: form.startDate,
        endDate: form.endDate,
        rentAmount: Number(form.rentAmount),
        deposit: Number(form.deposit || 0),
        status: form.status,
      });
      toast({ title: 'Contract created', description: 'The rental contract has been saved.' });
      setShowAdd(false);
      setForm({ tenantId: '', propertyId: '', startDate: '', endDate: '', rentAmount: '', deposit: '', status: 'PENDING' });
      await load();
    } catch (error) {
      toast({ title: 'Error', description: error?.response?.data?.message ?? 'Unable to create contract.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const submitRenew = async () => {
    if (!renewing || !newEndDate) return;
    setSaving(true);
    try {
      await api.put(`/RenewRentalContract/${renewing.id}`, { newEndDate });
      toast({ title: 'Contract renewed', description: 'End date updated and contract reactivated.' });
      setRenewing(null);
      setNewEndDate('');
      await load();
    } catch (error) {
      toast({ title: 'Error', description: error?.response?.data?.message ?? 'Unable to renew contract.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const submitTerminate = async () => {
    if (!terminating) return;
    setSaving(true);
    try {
      await api.put(`/TerminateRentalContract/${terminating.id}`, { reason: terminationReason });
      toast({ title: 'Contract terminated', description: 'The contract is now terminated.' });
      setTerminating(null);
      setTerminationReason('');
      await load();
    } catch (error) {
      toast({ title: 'Error', description: error?.response?.data?.message ?? 'Unable to terminate contract.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const deleteContract = async (contract: Contract) => {
    if (!confirm(`Delete contract ${contract.id}?`)) return;
    try {
      await api.delete(`/DeleteRentalContract/${contract.id}`);
      toast({ title: 'Deleted', description: 'The contract has been removed.' });
      await load();
    } catch (error) {
      toast({ title: 'Error', description: error?.response?.data?.message ?? 'Unable to delete contract.', variant: 'destructive' });
    }
  };

  const downloadPdf = (contract: Contract) => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('RENTAL AGREEMENT', 105, 20, { align: 'center' });
    doc.setFontSize(11);
    let y = 40;
    const line = (label: string, value: string) => {
      doc.text(`${label}: ${value}`, 20, y);
      y += 8;
    };
    line('Tenant', contract.tenant?.fullName ?? '-');
    line('Property', contract.property?.name ?? '-');
    line('Start date', new Date(contract.startDate).toLocaleDateString());
    line('End date', new Date(contract.endDate).toLocaleDateString());
    line('Monthly rent', `${formatCurrency(contract.rentAmount)}`);
    line('Deposit', `${formatCurrency(contract.deposit)}`);
    line('Status', contract.status);
    if (contract.terminationReason) line('Termination reason', contract.terminationReason);
    doc.save(`rental_contract_${contract.id}.pdf`);
  };

  return (
    <div className="space-y-8">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/landlord-dashboard">Dashboard</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Rental Contracts</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <section className="page-hero">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <span className="inline-flex w-fit items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              Contract Desk
            </span>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Rental Contracts</h1>
              <p className="mt-2 text-sm text-muted-foreground md:text-base">
                Create, renew, terminate and download rental agreements in one place.
              </p>
            </div>
          </div>
          <Button className="flex items-center gap-2" onClick={() => setShowAdd(true)}>
            <FilePlus className="h-4 w-4" />
            <span>Add New Contract</span>
          </Button>
        </div>
      </section>

      <Card className="data-surface border-none shadow-none">
        <CardContent className="p-6 md:p-7">
          <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
            <div className="relative w-full md:max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input
                type="text"
                placeholder="Search by tenant, property, or contract ID"
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <SearchableNativeSelect
                className="input-field h-12 py-3 text-sm"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="all">All Status</option>
                {STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status.charAt(0) + status.slice(1).toLowerCase()}
                  </option>
                ))}
              </SearchableNativeSelect>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Contract ID</TableHead>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Property</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Rent</TableHead>
                  <TableHead>Deposit</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!loading && filteredContracts.length > 0 ? (
                  filteredContracts.map((contract) => (
                    <motion.tr
                      key={contract.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.3 }}
                      className="hover:bg-gray-50"
                    >
                      <TableCell className="font-medium">RC-{contract.id}</TableCell>
                      <TableCell>{contract.tenant?.fullName ?? '-'}</TableCell>
                      <TableCell>{contract.property?.name ?? '-'}</TableCell>
                      <TableCell>
                        {new Date(contract.startDate).toLocaleDateString()} to {new Date(contract.endDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="font-medium">{formatCurrency(contract.rentAmount)}/mo</TableCell>
                      <TableCell>{formatCurrency(contract.deposit)}</TableCell>
                      <TableCell>{getStatusBadge(contract.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-1">
                          <Button variant="ghost" size="sm" onClick={() => setSelected(contract)} aria-label="View">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => { setRenewing(contract); setNewEndDate(contract.endDate.slice(0, 10)); }} aria-label="Renew">
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => downloadPdf(contract)} aria-label="Download PDF">
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => { setTerminating(contract); setTerminationReason(''); }} aria-label="Terminate">
                            <Ban className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="text-red-600" onClick={() => deleteContract(contract)} aria-label="Delete">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </motion.tr>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="py-10 text-center text-gray-500">
                      <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>{loading ? 'Loading contracts...' : 'No contracts found'}</p>
                      {!loading && <p className="text-sm mt-1">Try adjusting your search criteria</p>}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add contract dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Rental Contract</DialogTitle>
            <DialogDescription>Link a tenant to a property with lease terms.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1 sm:col-span-2">
              <Label>Property</Label>
              <Select value={form.propertyId} onValueChange={(value) => setForm({ ...form, propertyId: value })}>
                <SelectTrigger><SelectValue placeholder="Select property" /></SelectTrigger>
                <SelectContent>
                  {properties.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label>Tenant</Label>
              <Select value={form.tenantId} onValueChange={(value) => setForm({ ...form, tenantId: value })}>
                <SelectTrigger><SelectValue placeholder="Select tenant" /></SelectTrigger>
                <SelectContent>
                  {tenants.map((t) => (
                    <SelectItem key={t.id} value={String(t.id)}>{t.fullName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Start date</Label>
              <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>End date</Label>
              <Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Monthly rent</Label>
              <Input type="number" value={form.rentAmount} onChange={(e) => setForm({ ...form, rentAmount: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Deposit</Label>
              <Input type="number" value={form.deposit} onChange={(e) => setForm({ ...form, deposit: e.target.value })} />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(value) => setForm({ ...form, status: value })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>{status.charAt(0) + status.slice(1).toLowerCase()}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button disabled={saving} onClick={submitAdd}>{saving ? 'Saving...' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View dialog */}
      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Contract RC-{selected?.id}</DialogTitle>
            <DialogDescription>{selected?.property?.name ?? ''}</DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-2 text-sm">
              <p><strong>Tenant:</strong> {selected.tenant?.fullName ?? '-'}</p>
              <p><strong>Start date:</strong> {new Date(selected.startDate).toLocaleDateString()}</p>
              <p><strong>End date:</strong> {new Date(selected.endDate).toLocaleDateString()}</p>
              <p><strong>Monthly rent:</strong> {formatCurrency(selected.rentAmount)}</p>
              <p><strong>Deposit:</strong> {formatCurrency(selected.deposit)}</p>
              <p><strong>Status:</strong> {selected.status}</p>
              {selected.terminationReason && <p><strong>Termination reason:</strong> {selected.terminationReason}</p>}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Renew dialog */}
      <Dialog open={!!renewing} onOpenChange={(open) => !open && setRenewing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renew Contract</DialogTitle>
            <DialogDescription>Set a new end date to reactivate this contract.</DialogDescription>
          </DialogHeader>
          <div className="space-y-1">
            <Label>New end date</Label>
            <Input type="date" value={newEndDate} onChange={(e) => setNewEndDate(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenewing(null)}>Cancel</Button>
            <Button disabled={saving} onClick={submitRenew}>{saving ? 'Saving...' : 'Renew'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Terminate dialog */}
      <Dialog open={!!terminating} onOpenChange={(open) => !open && setTerminating(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Terminate Contract</DialogTitle>
            <DialogDescription>Provide a reason for termination.</DialogDescription>
          </DialogHeader>
          <div className="space-y-1">
            <Label>Reason</Label>
            <Input value={terminationReason} onChange={(e) => setTerminationReason(e.target.value)} placeholder="e.g. Lease ended early" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTerminating(null)}>Cancel</Button>
            <Button disabled={saving} onClick={submitTerminate}>{saving ? 'Saving...' : 'Terminate'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RentalContracts;
