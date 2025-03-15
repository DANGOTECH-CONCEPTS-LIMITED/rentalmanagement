
import { useState } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, Calendar, Filter, Search, Download, ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';

interface Payment {
  id: string;
  tenant: string;
  property: string;
  amount: number;
  date: string;
  status: 'paid' | 'pending' | 'late';
  method: 'credit_card' | 'bank_transfer' | 'cash';
}

const TrackPayments = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortField, setSortField] = useState('date');
  const [sortDirection, setSortDirection] = useState('desc');
  
  // Mock data for payments
  const [payments, setPayments] = useState<Payment[]>([
    {
      id: 'PMT-001',
      tenant: 'John Smith',
      property: 'Sunset Apartments - Unit 101',
      amount: 1200,
      date: '2023-04-01',
      status: 'paid',
      method: 'credit_card'
    },
    {
      id: 'PMT-002',
      tenant: 'Sarah Johnson',
      property: 'Bayview Condos - Unit 305',
      amount: 1500,
      date: '2023-04-02',
      status: 'paid',
      method: 'bank_transfer'
    },
    {
      id: 'PMT-003',
      tenant: 'Michael Williams',
      property: 'Westside Heights - Unit 210',
      amount: 1350,
      date: '2023-04-05',
      status: 'pending',
      method: 'credit_card'
    },
    {
      id: 'PMT-004',
      tenant: 'Emily Davis',
      property: 'Sunset Apartments - Unit 102',
      amount: 1250,
      date: '2023-03-30',
      status: 'late',
      method: 'bank_transfer'
    },
    {
      id: 'PMT-005',
      tenant: 'Robert Miller',
      property: 'Parkview Residences - Unit 405',
      amount: 1100,
      date: '2023-03-25',
      status: 'paid',
      method: 'cash'
    }
  ]);

  // Filter payments based on search term and status filter
  let filteredPayments = payments.filter(payment => 
    (payment.tenant.toLowerCase().includes(searchTerm.toLowerCase()) || 
     payment.property.toLowerCase().includes(searchTerm.toLowerCase()) ||
     payment.id.toLowerCase().includes(searchTerm.toLowerCase())) &&
    (filterStatus === 'all' || payment.status === filterStatus)
  );
  
  // Sort payments
  filteredPayments.sort((a, b) => {
    if (sortField === 'date') {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
    } else if (sortField === 'amount') {
      return sortDirection === 'asc' ? a.amount - b.amount : b.amount - a.amount;
    }
    return 0;
  });

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <span className="px-2 py-1 rounded-full bg-green-100 text-green-800 text-xs">Paid</span>;
      case 'pending':
        return <span className="px-2 py-1 rounded-full bg-yellow-100 text-yellow-800 text-xs">Pending</span>;
      case 'late':
        return <span className="px-2 py-1 rounded-full bg-red-100 text-red-800 text-xs">Late</span>;
      default:
        return null;
    }
  };

  const getMethodText = (method: string) => {
    switch (method) {
      case 'credit_card':
        return 'Credit Card';
      case 'bank_transfer':
        return 'Bank Transfer';
      case 'cash':
        return 'Cash';
      default:
        return method;
    }
  };

  // Calculate total amount received
  const totalReceived = payments
    .filter(payment => payment.status === 'paid')
    .reduce((sum, payment) => sum + payment.amount, 0);
  
  // Calculate total pending amount
  const totalPending = payments
    .filter(payment => payment.status === 'pending' || payment.status === 'late')
    .reduce((sum, payment) => sum + payment.amount, 0);

  return (
    <div className="space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/landlord-dashboard">Dashboard</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Track Payments</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Payment Tracking</h1>
        <Button className="flex items-center gap-2">
          <Download className="h-4 w-4" />
          <span>Export</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center mb-4">
            <div className="p-3 rounded-full bg-green-100 mr-4">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-medium">Total Received</h3>
              <p className="text-2xl font-bold">${totalReceived.toFixed(2)}</p>
            </div>
          </div>
          <div className="text-sm text-gray-500">
            <p>From {payments.length} payments</p>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center mb-4">
            <div className="p-3 rounded-full bg-yellow-100 mr-4">
              <Calendar className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <h3 className="text-lg font-medium">Pending / Late</h3>
              <p className="text-2xl font-bold">${totalPending.toFixed(2)}</p>
            </div>
          </div>
          <div className="text-sm text-gray-500">
            <p>From {payments.filter(p => p.status === 'pending' || p.status === 'late').length} payments</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
          <div className="relative w-full md:max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <Input
              type="text"
              placeholder="Search by tenant, property, or payment ID"
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
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="late">Late</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left">Payment ID</th>
                <th className="px-6 py-3 text-left">Tenant</th>
                <th className="px-6 py-3 text-left">Property</th>
                <th className="px-6 py-3 text-left cursor-pointer" onClick={() => handleSort('amount')}>
                  <div className="flex items-center">
                    <span>Amount</span>
                    {sortField === 'amount' && (
                      sortDirection === 'asc' ? <ArrowUp className="ml-1 h-3 w-3" /> : <ArrowDown className="ml-1 h-3 w-3" />
                    )}
                  </div>
                </th>
                <th className="px-6 py-3 text-left cursor-pointer" onClick={() => handleSort('date')}>
                  <div className="flex items-center">
                    <span>Date</span>
                    {sortField === 'date' && (
                      sortDirection === 'asc' ? <ArrowUp className="ml-1 h-3 w-3" /> : <ArrowDown className="ml-1 h-3 w-3" />
                    )}
                  </div>
                </th>
                <th className="px-6 py-3 text-left">Method</th>
                <th className="px-6 py-3 text-left">Status</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredPayments.length > 0 ? (
                filteredPayments.map((payment) => (
                  <motion.tr 
                    key={payment.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                    className="hover:bg-gray-50"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">{payment.id}</td>
                    <td className="px-6 py-4">{payment.tenant}</td>
                    <td className="px-6 py-4">{payment.property}</td>
                    <td className="px-6 py-4 whitespace-nowrap font-medium">${payment.amount.toFixed(2)}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{payment.date}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{getMethodText(payment.method)}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(payment.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <Button variant="ghost" size="sm" className="text-blue-600">
                        <Download className="h-4 w-4" />
                        <span className="ml-1">Receipt</span>
                      </Button>
                    </td>
                  </motion.tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-6 py-10 text-center text-gray-500">
                    <DollarSign className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No payments found</p>
                    <p className="text-sm mt-1">Try adjusting your search criteria</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TrackPayments;
