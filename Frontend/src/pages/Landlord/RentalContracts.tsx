import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  FileText, Search, Edit, Trash2, Eye, Filter, Download, FilePlus,
  X, Calendar, User, Home, DollarSign, AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import ContractGenerator from '@/components/contract/ContractGenerator';
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList,
  BreadcrumbPage, BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

interface Contract {
  id: string;
  tenant: string;
  property: string;
  startDate: string;
  endDate: string;
  rentAmount: number;
  status: 'active' | 'expired' | 'pending';
}

const emptyForm: Omit<Contract, 'id'> = {
  tenant: '',
  property: '',
  startDate: '',
  endDate: '',
  rentAmount: 0,
  status: 'active',
};

const RentalContracts = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showContractGenerator, setShowContractGenerator] = useState(false);

  const [viewContract, setViewContract] = useState<Contract | null>(null);
  const [editContract, setEditContract] = useState<Contract | null>(null);
  const [editForm, setEditForm] = useState<Omit<Contract, 'id'>>(emptyForm);
  const [deleteContract, setDeleteContract] = useState<Contract | null>(null);

  const [contracts, setContracts] = useState<Contract[]>([
    { id: 'RC-001', tenant: 'John Smith', property: 'Sunset Apartments - Unit 101', startDate: '2023-01-01', endDate: '2023-12-31', rentAmount: 1200, status: 'active' },
    { id: 'RC-002', tenant: 'Sarah Johnson', property: 'Bayview Condos - Unit 305', startDate: '2023-03-15', endDate: '2024-03-14', rentAmount: 1500, status: 'active' },
    { id: 'RC-003', tenant: 'Michael Williams', property: 'Westside Heights - Unit 210', startDate: '2022-06-01', endDate: '2023-05-31', rentAmount: 1350, status: 'expired' },
    { id: 'RC-004', tenant: 'Emily Davis', property: 'Sunset Apartments - Unit 102', startDate: '2023-08-01', endDate: '2024-07-31', rentAmount: 1250, status: 'active' },
    { id: 'RC-005', tenant: 'Robert Miller', property: 'Parkview Residences - Unit 405', startDate: '2023-06-15', endDate: '2023-12-14', rentAmount: 1100, status: 'pending' },
  ]);

  const filteredContracts = contracts.filter(c =>
    (c.tenant.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.property.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.id.toLowerCase().includes(searchTerm.toLowerCase())) &&
    (filterStatus === 'all' || c.status === filterStatus)
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active': return <span className="px-2 py-1 rounded-full bg-green-100 text-green-800 text-xs font-medium">Active</span>;
      case 'expired': return <span className="px-2 py-1 rounded-full bg-red-100 text-red-800 text-xs font-medium">Expired</span>;
      case 'pending': return <span className="px-2 py-1 rounded-full bg-yellow-100 text-yellow-800 text-xs font-medium">Pending</span>;
      default: return null;
    }
  };

  const openEdit = (contract: Contract) => {
    setEditContract(contract);
    setEditForm({
      tenant: contract.tenant,
      property: contract.property,
      startDate: contract.startDate,
      endDate: contract.endDate,
      rentAmount: contract.rentAmount,
      status: contract.status,
    });
  };

  const handleEditSave = () => {
    if (!editContract) return;
    setContracts(prev =>
      prev.map(c => c.id === editContract.id ? { ...c, ...editForm } : c)
    );
    setEditContract(null);
  };

  const handleDelete = () => {
    if (!deleteContract) return;
    setContracts(prev => prev.filter(c => c.id !== deleteContract.id));
    setDeleteContract(null);
  };

  const DetailRow = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) => (
    <div className="flex items-start gap-3 py-3 border-b border-gray-100 last:border-0">
      <div className="mt-0.5 text-primary shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
        <p className="text-sm font-medium text-slate-900">{value}</p>
      </div>
    </div>
  );

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
                Search, review, and generate rental agreements in one place.
              </p>
            </div>
          </div>
          <Button className="flex items-center gap-2" onClick={() => setShowContractGenerator(true)}>
            <FilePlus className="h-4 w-4" />
            <span>Add New Contract</span>
          </Button>
        </div>
      </section>

      <Card className="data-surface border-none shadow-none">
        <CardContent className="p-6 md:p-7">
          <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
            <div className="relative w-full md:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
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
              <select
                className="input-field h-12 py-3 text-sm"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="expired">Expired</option>
                <option value="pending">Pending</option>
              </select>
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
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredContracts.length > 0 ? (
                  filteredContracts.map((contract) => (
                    <motion.tr
                      key={contract.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.3 }}
                      className="hover:bg-gray-50"
                    >
                      <TableCell className="font-medium">{contract.id}</TableCell>
                      <TableCell>{contract.tenant}</TableCell>
                      <TableCell>{contract.property}</TableCell>
                      <TableCell>{contract.startDate} to {contract.endDate}</TableCell>
                      <TableCell className="font-medium">${contract.rentAmount}/mo</TableCell>
                      <TableCell>{getStatusBadge(contract.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-1">
                          <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50" onClick={() => setViewContract(contract)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50" onClick={() => openEdit(contract)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => setDeleteContract(contract)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </motion.tr>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-gray-500">
                      <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>No contracts found</p>
                      <p className="text-sm mt-1">Try adjusting your search criteria</p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* ── Add New Contract ── */}
      <Dialog open={showContractGenerator} onOpenChange={setShowContractGenerator}>
        <DialogContent className="max-w-5xl rounded-[28px] border border-border/70 bg-white shadow-[0_30px_90px_-36px_rgba(15,23,42,0.42)]">
          <ContractGenerator onClose={() => setShowContractGenerator(false)} />
        </DialogContent>
      </Dialog>

      {/* ── View Modal ── */}
      {viewContract && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-primary">Contract Details</p>
                <h2 className="text-lg font-semibold text-slate-900">{viewContract.id}</h2>
              </div>
              <button onClick={() => setViewContract(null)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="px-6 py-4">
              <DetailRow icon={<User size={16} />} label="Tenant" value={viewContract.tenant} />
              <DetailRow icon={<Home size={16} />} label="Property / Unit" value={viewContract.property} />
              <DetailRow
                icon={<Calendar size={16} />}
                label="Contract Period"
                value={`${viewContract.startDate} → ${viewContract.endDate}`}
              />
              <DetailRow icon={<DollarSign size={16} />} label="Monthly Rent" value={`$${viewContract.rentAmount.toLocaleString()}/mo`} />
              <DetailRow icon={<FileText size={16} />} label="Status" value={getStatusBadge(viewContract.status)} />
            </div>
            <div className="px-6 py-4 border-t flex justify-end">
              <Button variant="outline" onClick={() => setViewContract(null)}>Close</Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* ── Edit Modal ── */}
      {editContract && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-primary">Edit Contract</p>
                <h2 className="text-lg font-semibold text-slate-900">{editContract.id}</h2>
              </div>
              <button onClick={() => setEditContract(null)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tenant Name</label>
                <Input value={editForm.tenant} onChange={e => setEditForm(f => ({ ...f, tenant: e.target.value }))} placeholder="Tenant full name" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Property / Unit</label>
                <Input value={editForm.property} onChange={e => setEditForm(f => ({ ...f, property: e.target.value }))} placeholder="Property and unit" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <Input type="date" value={editForm.startDate} onChange={e => setEditForm(f => ({ ...f, startDate: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                  <Input type="date" value={editForm.endDate} onChange={e => setEditForm(f => ({ ...f, endDate: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Rent ($)</label>
                <Input
                  type="number"
                  value={editForm.rentAmount}
                  onChange={e => setEditForm(f => ({ ...f, rentAmount: Number(e.target.value) }))}
                  placeholder="0"
                  min={0}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  className="input-field"
                  value={editForm.status}
                  onChange={e => setEditForm(f => ({ ...f, status: e.target.value as Contract['status'] }))}
                >
                  <option value="active">Active</option>
                  <option value="expired">Expired</option>
                  <option value="pending">Pending</option>
                </select>
              </div>
            </div>

            <div className="px-6 py-4 border-t flex justify-end gap-3 shrink-0">
              <Button variant="outline" onClick={() => setEditContract(null)}>Cancel</Button>
              <Button onClick={handleEditSave}>Save Changes</Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* ── Delete Confirmation ── */}
      {deleteContract && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
          >
            <div className="px-6 pt-6 pb-4 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
                <AlertTriangle className="h-7 w-7 text-red-600" />
              </div>
              <h2 className="text-lg font-semibold text-slate-900 mb-1">Delete Contract</h2>
              <p className="text-sm text-muted-foreground">
                Are you sure you want to delete contract <span className="font-semibold text-slate-800">{deleteContract.id}</span> for{' '}
                <span className="font-semibold text-slate-800">{deleteContract.tenant}</span>? This action cannot be undone.
              </p>
            </div>
            <div className="px-6 pb-6 flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setDeleteContract(null)}>Cancel</Button>
              <Button className="flex-1 bg-red-600 hover:bg-red-700 text-white" onClick={handleDelete}>
                Yes, Delete
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default RentalContracts;
