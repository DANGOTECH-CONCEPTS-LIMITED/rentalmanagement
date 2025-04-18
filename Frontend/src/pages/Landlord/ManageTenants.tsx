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
import { Users, Search, Eye, Edit, Trash, Calendar, Home, CreditCard, XIcon, PhoneIcon } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface Tenant {
  id: number;
  fullName: string;
  email: string;
  phoneNumber: string;
  active: boolean;
  passportPhoto: string;
  nationalIdNumber: string;
  paymentStatus: string;
  balanceDue: number;
  arrears: number;
  nextPaymentDate: string;
  dateMovedIn: string;
  property: {
    id: number;
    name: string;
    type: string;
    price: number;
    currency: string;
  };
}

const ManageTenants = () => {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const { toast } = useToast();

  const apiUrl = import.meta.env.VITE_API_BASE_URL;

  const getAuthToken = () => {
    try {
      const user = localStorage.getItem('user');
      if (!user) {
        console.error('No user found in localStorage');
        return null;
      }
      const userData = JSON.parse(user);
      return userData.token;
    } catch (error) {
      console.error('Error parsing user data:', error);
      return null;
    }
  };

  useEffect(() => {
    const fetchTenants = async () => {
      const token = getAuthToken();
      if (!token) {
        toast({
          title: 'Error',
          description: 'Authentication token not found',
          variant: 'destructive'
        });
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(`${apiUrl}/GetAllTenants`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'accept': '*/*'
          }
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch tenants: ${response.status}`);
        }

        const data = await response.json();
        setTenants(data);
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to load tenants',
          variant: 'destructive'
        });
        console.error('Error fetching tenants:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTenants();
  }, [toast]);

  const filteredTenants = tenants.filter(tenant =>
    tenant.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tenant.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tenant.property.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (amount: number, currency: string = 'UGX') => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: currency,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getStatusBadgeClass = (active: boolean) => {
    return active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const handleDeleteTenant = async (tenantId: number) => {
    try {
      const response = await fetch(`${apiUrl}/DeleteTenant/${tenantId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
        }
      });

      if (response.ok) {
        setTenants(tenants.filter(tenant => tenant.id !== tenantId));
        toast({
          title: 'Success',
          description: 'Tenant deleted successfully',
        });
      } else {
        throw new Error('Failed to delete tenant');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete tenant',
        variant: 'destructive'
      });
      console.error('Error deleting tenant:', error);
    }
  };

  const PLACEHOLDER_IMAGE = 'https://placehold.co/150?text=No+Image';

  const getImageUrl = (relativePath: string) => {
    if (!relativePath) return PLACEHOLDER_IMAGE;
    if (relativePath.startsWith('http')) return relativePath;

    const token = getAuthToken();
    return `${apiUrl}/${relativePath}${token ? `?token=${token}` : ''}`;
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb and header remain the same */}

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
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTenants.map((tenant) => (
                    <TableRow key={tenant.id}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <div className="h-10 w-10 rounded-full overflow-hidden">
                            selectedTenant
                          </div>
                          <div>
                            <div className="font-medium">{tenant.fullName}</div>
                            <div className="text-sm text-muted-foreground">{tenant.email}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {tenant.property.name}
                        <div className="text-sm text-muted-foreground">{tenant.property.type}</div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {formatDate(tenant.dateMovedIn)}
                      </TableCell>
                      <TableCell>
                        {formatCurrency(tenant.property.price, tenant.property.currency)}
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs ${getStatusBadgeClass(tenant.active)}`}>
                          {tenant.active ? 'Active' : 'Inactive'}
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
                          <Button
                            variant="outline"
                            size="icon"
                            className="text-red-500"
                            onClick={() => handleDeleteTenant(tenant.id)}
                          >
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
                    <div className="h-10 w-10 rounded-full overflow-hidden">
                      <img
                        src={getImageUrl(selectedTenant.passportPhoto)}
                        alt={selectedTenant.fullName}
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = PLACEHOLDER_IMAGE;
                          target.onerror = null; // Prevent infinite loop if placeholder also fails
                        }}
                      />
                    </div>
                    <h3 className="font-semibold text-lg">{selectedTenant.fullName}</h3>
                    <p className="text-muted-foreground">{selectedTenant.email}</p>
                    <div className={`mt-3 px-3 py-1 rounded-full text-xs ${getStatusBadgeClass(selectedTenant.active)}`}>
                      {selectedTenant.active ? 'Active Tenant' : 'Inactive'}
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
                            {selectedTenant.phoneNumber}
                          </p>
                        </div>

                        <div>
                          <span className="text-xs text-muted-foreground">National ID</span>
                          <p className="flex items-center">
                            <CreditCard size={14} className="mr-1" />
                            {selectedTenant.nationalIdNumber}
                          </p>
                        </div>

                        <div>
                          <span className="text-xs text-muted-foreground">Move-in Date</span>
                          <p className="flex items-center">
                            <Calendar size={14} className="mr-1" />
                            {formatDate(selectedTenant.dateMovedIn)}
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
                            {selectedTenant.property.name} ({selectedTenant.property.type})
                          </p>
                        </div>

                        <div>
                          <span className="text-xs text-muted-foreground">Monthly Rent</span>
                          <p className="font-semibold">
                            {formatCurrency(selectedTenant.property.price, selectedTenant.property.currency)}
                          </p>
                        </div>

                        <div>
                          <span className="text-xs text-muted-foreground">Next Payment Due</span>
                          <p className="flex items-center">
                            {formatDate(selectedTenant.nextPaymentDate)}
                          </p>
                        </div>

                        <div>
                          <span className="text-xs text-muted-foreground">Balance Due</span>
                          <p className="font-semibold">
                            {formatCurrency(selectedTenant.balanceDue, selectedTenant.property.currency)}
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
                      <Button
                        variant="destructive"
                        onClick={() => handleDeleteTenant(selectedTenant.id)}
                      >
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