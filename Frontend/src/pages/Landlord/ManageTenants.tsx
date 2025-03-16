import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Users, Search, Eye, Edit, Trash, CheckCircle, XCircle, Calendar, Home, CreditCard, XIcon, PhoneIcon } from 'lucide-react';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';

interface Tenant {
  id: string;
  name: string;
  email: string;
  phone: string;
  idNumber: string;
  property: string;
  moveInDate: string;
  rentAmount: number;
  status: 'active' | 'inactive';
  lastPaymentDate: string;
  paymentStatus: 'paid' | 'pending' | 'overdue';
  profileImage: string;
}

const ManageTenants = () => {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);

  useEffect(() => {
    // Simulate API call to fetch tenants
    setTimeout(() => {
      const mockTenants: Tenant[] = [
        {
          id: 'tenant1',
          name: 'John Smith',
          email: 'john.smith@example.com',
          phone: '+256 7123 45678',
          idNumber: 'UG1234567',
          property: 'Sunset Apartments - Unit 101',
          moveInDate: '2023-09-15',
          rentAmount: 1200000,
          status: 'active',
          lastPaymentDate: '2023-10-05',
          paymentStatus: 'paid',
          profileImage: 'https://randomuser.me/api/portraits/men/32.jpg'
        },
        {
          id: 'tenant2',
          name: 'Sarah Johnson',
          email: 'sarah.j@example.com',
          phone: '+256 7789 01234',
          idNumber: 'UG7654321',
          property: 'Bayview Condos - Unit 305',
          moveInDate: '2023-08-01',
          rentAmount: 1500000,
          status: 'active',
          lastPaymentDate: '2023-10-10',
          paymentStatus: 'paid',
          profileImage: 'https://randomuser.me/api/portraits/women/44.jpg'
        },
        {
          id: 'tenant3',
          name: 'Michael Wilson',
          email: 'michael.w@example.com',
          phone: '+256 7345 67890',
          idNumber: 'UG2345678',
          property: 'Sunset Apartments - Unit 102',
          moveInDate: '2023-06-10',
          rentAmount: 1100000,
          status: 'active',
          lastPaymentDate: '2023-09-28',
          paymentStatus: 'overdue',
          profileImage: 'https://randomuser.me/api/portraits/men/67.jpg'
        },
        {
          id: 'tenant4',
          name: 'Emma Davis',
          email: 'emma.d@example.com',
          phone: '+256 7901 23456',
          idNumber: 'UG9876543',
          property: 'Westside Heights - Unit 210',
          moveInDate: '2023-10-01',
          rentAmount: 1300000,
          status: 'active',
          lastPaymentDate: '2023-10-01',
          paymentStatus: 'pending',
          profileImage: 'https://randomuser.me/api/portraits/women/17.jpg'
        },
      ];
      
      setTenants(mockTenants);
      setIsLoading(false);
    }, 1000);
  }, []);

  const filteredTenants = tenants.filter(tenant => 
    tenant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tenant.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tenant.property.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getStatusBadgeClass = (status: string) => {
    if (status === 'paid') return 'bg-green-100 text-green-800';
    if (status === 'pending') return 'bg-yellow-100 text-yellow-800';
    if (status === 'overdue') return 'bg-red-100 text-red-800';
    return '';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
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
            <BreadcrumbPage>Manage Tenants</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Manage Tenants</h1>
          <p className="text-muted-foreground">View and manage all tenants registered in your properties</p>
        </div>
        <Button onClick={() => window.location.href = '/landlord-dashboard/register-tenants'}>
          Add New Tenant
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="mb-6 flex items-center relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or property..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {isLoading ? (
            <div className="py-8 text-center">
              <div className="animate-pulse">Loading tenants...</div>
            </div>
          ) : filteredTenants.length === 0 ? (
            <div className="py-8 flex flex-col items-center justify-center text-center">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No tenants found</h3>
              <p className="text-muted-foreground mt-1">
                {searchTerm ? 'Try adjusting your search query' : 'Start by adding a new tenant'}
              </p>
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tenant</TableHead>
                    <TableHead className="hidden md:table-cell">Property</TableHead>
                    <TableHead className="hidden lg:table-cell">Move-in Date</TableHead>
                    <TableHead>Rent</TableHead>
                    <TableHead>Payment Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTenants.map((tenant) => (
                    <TableRow key={tenant.id}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <div className="h-10 w-10 rounded-full overflow-hidden">
                            <img 
                              src={tenant.profileImage} 
                              alt={tenant.name} 
                              className="h-full w-full object-cover"
                            />
                          </div>
                          <div>
                            <div className="font-medium">{tenant.name}</div>
                            <div className="text-sm text-muted-foreground">{tenant.email}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">{tenant.property}</TableCell>
                      <TableCell className="hidden lg:table-cell">{formatDate(tenant.moveInDate)}</TableCell>
                      <TableCell>{formatCurrency(tenant.rentAmount)}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs ${getStatusBadgeClass(tenant.paymentStatus)}`}>
                          {tenant.paymentStatus.charAt(0).toUpperCase() + tenant.paymentStatus.slice(1)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button 
                            variant="outline" 
                            size="icon"
                            onClick={() => setSelectedTenant(tenant)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="icon">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="icon" className="text-red-500">
                            <Trash className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedTenant && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold">Tenant Details</h2>
                <Button variant="ghost" size="icon" onClick={() => setSelectedTenant(null)}>
                  <XIcon className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-1">
                  <div className="flex flex-col items-center">
                    <div className="h-32 w-32 rounded-full overflow-hidden mb-4">
                      <img 
                        src={selectedTenant.profileImage} 
                        alt={selectedTenant.name} 
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <h3 className="font-semibold text-lg">{selectedTenant.name}</h3>
                    <p className="text-muted-foreground">{selectedTenant.email}</p>
                    <div className={`mt-3 px-3 py-1 rounded-full text-xs ${selectedTenant.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {selectedTenant.status === 'active' ? 'Active Tenant' : 'Inactive'}
                    </div>
                  </div>
                </div>
                
                <div className="md:col-span-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-3">Personal Information</h4>
                      
                      <div className="space-y-3">
                        <div>
                          <span className="text-xs text-muted-foreground">Phone</span>
                          <p className="flex items-center">
                            <PhoneIcon size={14} className="mr-1" />
                            {selectedTenant.phone}
                          </p>
                        </div>
                        
                        <div>
                          <span className="text-xs text-muted-foreground">National ID</span>
                          <p className="flex items-center">
                            <CreditCard size={14} className="mr-1" />
                            {selectedTenant.idNumber}
                            <CheckCircle size={14} className="ml-2 text-green-500" />
                          </p>
                        </div>
                        
                        <div>
                          <span className="text-xs text-muted-foreground">Move-in Date</span>
                          <p className="flex items-center">
                            <Calendar size={14} className="mr-1" />
                            {formatDate(selectedTenant.moveInDate)}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-3">Property & Payment</h4>
                      
                      <div className="space-y-3">
                        <div>
                          <span className="text-xs text-muted-foreground">Property</span>
                          <p className="flex items-center">
                            <Home size={14} className="mr-1" />
                            {selectedTenant.property}
                          </p>
                        </div>
                        
                        <div>
                          <span className="text-xs text-muted-foreground">Monthly Rent</span>
                          <p className="font-semibold">{formatCurrency(selectedTenant.rentAmount)}</p>
                        </div>
                        
                        <div>
                          <span className="text-xs text-muted-foreground">Last Payment</span>
                          <p className="flex items-center">
                            {formatDate(selectedTenant.lastPaymentDate)}
                            <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${getStatusBadgeClass(selectedTenant.paymentStatus)}`}>
                              {selectedTenant.paymentStatus}
                            </span>
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-6 border-t pt-6">
                    <h4 className="text-sm font-medium mb-3">Actions</h4>
                    <div className="flex space-x-3">
                      <Button>Record Payment</Button>
                      <Button variant="outline">Update Information</Button>
                      <Button variant="destructive">
                        <Trash size={14} className="mr-1" />
                        Remove Tenant
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageTenants;
