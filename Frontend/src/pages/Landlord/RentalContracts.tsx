
import { useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, Search, Plus, Edit, Trash2, Eye, Filter, Download, FilePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import ContractGenerator from '@/components/contract/ContractGenerator';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';

interface Contract {
  id: string;
  tenant: string;
  property: string;
  startDate: string;
  endDate: string;
  rentAmount: number;
  status: 'active' | 'expired' | 'pending';
}

const RentalContracts = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showContractGenerator, setShowContractGenerator] = useState(false);
  
  // Mock data for rental contracts
  const [contracts, setContracts] = useState<Contract[]>([
    {
      id: 'RC-001',
      tenant: 'John Smith',
      property: 'Sunset Apartments - Unit 101',
      startDate: '2023-01-01',
      endDate: '2023-12-31',
      rentAmount: 1200,
      status: 'active'
    },
    {
      id: 'RC-002',
      tenant: 'Sarah Johnson',
      property: 'Bayview Condos - Unit 305',
      startDate: '2023-03-15',
      endDate: '2024-03-14',
      rentAmount: 1500,
      status: 'active'
    },
    {
      id: 'RC-003',
      tenant: 'Michael Williams',
      property: 'Westside Heights - Unit 210',
      startDate: '2022-06-01',
      endDate: '2023-05-31',
      status: 'expired',
      rentAmount: 1350
    },
    {
      id: 'RC-004',
      tenant: 'Emily Davis',
      property: 'Sunset Apartments - Unit 102',
      startDate: '2023-08-01',
      endDate: '2024-07-31',
      status: 'active',
      rentAmount: 1250
    },
    {
      id: 'RC-005',
      tenant: 'Robert Miller',
      property: 'Parkview Residences - Unit 405',
      startDate: '2023-06-15',
      endDate: '2023-12-14',
      status: 'pending',
      rentAmount: 1100
    }
  ]);

  // Filter contracts based on search term and status filter
  const filteredContracts = contracts.filter(contract => 
    (contract.tenant.toLowerCase().includes(searchTerm.toLowerCase()) || 
     contract.property.toLowerCase().includes(searchTerm.toLowerCase()) ||
     contract.id.toLowerCase().includes(searchTerm.toLowerCase())) &&
    (filterStatus === 'all' || contract.status === filterStatus)
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <span className="px-2 py-1 rounded-full bg-green-100 text-green-800 text-xs">Active</span>;
      case 'expired':
        return <span className="px-2 py-1 rounded-full bg-red-100 text-red-800 text-xs">Expired</span>;
      case 'pending':
        return <span className="px-2 py-1 rounded-full bg-yellow-100 text-yellow-800 text-xs">Pending</span>;
      default:
        return null;
    }
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
                Search, review, and generate rental agreements in one place.
              </p>
            </div>
          </div>
        <Button 
          className="flex items-center gap-2"
          onClick={() => setShowContractGenerator(true)}
        >
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
                    <TableCell>
                      {contract.startDate} to {contract.endDate}
                    </TableCell>
                    <TableCell className="font-medium">${contract.rentAmount}/mo</TableCell>
                    <TableCell>
                      {getStatusBadge(contract.status)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Button variant="ghost" size="sm" className="text-blue-600">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-blue-600">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-blue-600">
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-red-600">
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

      {/* Contract Generator Dialog */}
      <Dialog open={showContractGenerator} onOpenChange={setShowContractGenerator}>
        <DialogContent className="max-w-5xl rounded-[28px] border border-border/70 bg-white shadow-[0_30px_90px_-36px_rgba(15,23,42,0.42)]">
          <ContractGenerator onClose={() => setShowContractGenerator(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RentalContracts;
