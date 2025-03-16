
import { useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, Search, Plus, Edit, Trash2, Eye, Filter, Download, FilePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent } from '@/components/ui/dialog';
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
    <div className="space-y-6">
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

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Rental Contracts</h1>
        <Button 
          className="flex items-center gap-2"
          onClick={() => setShowContractGenerator(true)}
        >
          <FilePlus className="h-4 w-4" />
          <span>Add New Contract</span>
        </Button>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
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
              className="p-2 border border-gray-300 rounded-md text-sm"
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
          <table className="w-full">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left">Contract ID</th>
                <th className="px-6 py-3 text-left">Tenant</th>
                <th className="px-6 py-3 text-left">Property</th>
                <th className="px-6 py-3 text-left">Period</th>
                <th className="px-6 py-3 text-left">Rent</th>
                <th className="px-6 py-3 text-left">Status</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredContracts.length > 0 ? (
                filteredContracts.map((contract) => (
                  <motion.tr 
                    key={contract.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                    className="hover:bg-gray-50"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">{contract.id}</td>
                    <td className="px-6 py-4">{contract.tenant}</td>
                    <td className="px-6 py-4">{contract.property}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {contract.startDate} to {contract.endDate}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-medium">${contract.rentAmount}/mo</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(contract.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
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
                    </td>
                  </motion.tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-gray-500">
                    <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No contracts found</p>
                    <p className="text-sm mt-1">Try adjusting your search criteria</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Contract Generator Dialog */}
      <Dialog open={showContractGenerator} onOpenChange={setShowContractGenerator}>
        <DialogContent className="max-w-5xl">
          <ContractGenerator onClose={() => setShowContractGenerator(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RentalContracts;
