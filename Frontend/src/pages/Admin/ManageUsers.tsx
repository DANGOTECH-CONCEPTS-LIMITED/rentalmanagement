import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle, XCircle, Edit, Trash, Search, Home, DollarSign, User, Eye, Users } from "lucide-react";
import { Property } from "@/types/property";
import { useCurrencyFormatter } from "@/hooks/use-currency-formatter";

interface User {
  id: string;
  name: string;
  email: string;
  role: "admin" | "landlord" | "tenant";
  status: "active" | "inactive";
  propertyId?: string;
  landlordId?: string;
  rentAmount?: number;
}

interface UserDetailsProps {
  user: User;
  properties: Property[];
  users: User[];
  onClose: () => void;
}

const UserDetails = ({ user, properties, users, onClose }: UserDetailsProps) => {
  const formatCurrency = useCurrencyFormatter();

  const assignedProperty = user.role === 'tenant' && user.propertyId
    ? properties.find(p => p.id === user.propertyId)
    : null;

  const assignedLandlord = user.role === 'tenant' && user.landlordId
    ? users.find(u => u.id === user.landlordId)
    : null;

  const ownedProperties = user.role === 'landlord'
    ? properties.filter(p => p.landlord === user.id)
    : [];

  const tenants = user.role === 'landlord'
    ? users.filter(u => u.role === 'tenant' && u.landlordId === user.id)
    : [];

  return (
    <div className="md:space-y-6">
      <div className="flex items-center space-x-4">
        <div className="bg-primary/10 p-3 rounded-full">
          <User className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">{user.name}</h3>
          <p className="text-sm text-muted-foreground">{user.email}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-1 bg-secondary/20 p-3 rounded-md">
          <div className="text-xs font-medium text-muted-foreground mb-1">Role</div>
          <Badge variant={user.role === "admin" ? "destructive" : user.role === "landlord" ? "default" : "secondary"}>
            {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
          </Badge>
        </div>
        <div className="col-span-1 bg-secondary/20 p-3 rounded-md">
          <div className="text-xs font-medium text-muted-foreground mb-1">Status</div>
          {user.status === "active" ? (
            <span className="flex items-center gap-1 text-green-600 text-sm">
              <CheckCircle className="h-3 w-3" /> Active
            </span>
          ) : (
            <span className="flex items-center gap-1 text-red-600 text-sm">
              <XCircle className="h-3 w-3" /> Inactive
            </span>
          )}
        </div>
        <div className="col-span-1 bg-secondary/20 p-3 rounded-md">
          <div className="text-xs font-medium text-muted-foreground mb-1">User ID</div>
          <div className="text-sm font-mono">{user.id}</div>
        </div>
      </div>

      {user.role === 'tenant' && assignedProperty && (
        <div className="mt-6">
          <h3 className="text-md font-semibold mb-3 flex items-center">
            <Home className="mr-2 h-4 w-4" /> Property Details
          </h3>
          <Card className="p-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs font-medium text-muted-foreground mb-1">Property Name</div>
                <div className="text-sm">{assignedProperty.name}</div>
              </div>
              <div>
                <div className="text-xs font-medium text-muted-foreground mb-1">Property Type</div>
                <div className="text-sm">{assignedProperty.type}</div>
              </div>
              <div>
                <div className="text-xs font-medium text-muted-foreground mb-1">Address</div>
                <div className="text-sm">{assignedProperty.address}</div>
              </div>
              <div>
                <div className="text-xs font-medium text-muted-foreground mb-1">Rent Amount</div>
                <div className="text-sm font-semibold">{formatCurrency(user.rentAmount || assignedProperty.rentAmount)}</div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {user.role === 'tenant' && assignedLandlord && (
        <div className="mt-6">
          <h3 className="text-md font-semibold mb-3 flex items-center">
            <User className="mr-2 h-4 w-4" /> Landlord Details
          </h3>
          <Card className="p-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs font-medium text-muted-foreground mb-1">Name</div>
                <div className="text-sm">{assignedLandlord.name}</div>
              </div>
              <div>
                <div className="text-xs font-medium text-muted-foreground mb-1">Email</div>
                <div className="text-sm">{assignedLandlord.email}</div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {user.role === 'landlord' && ownedProperties.length > 0 && (
        <div className="mt-6">
          <h3 className="text-md font-semibold mb-3 flex items-center">
            <Home className="mr-2 h-4 w-4" /> Owned Properties ({ownedProperties.length})
          </h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Rent Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ownedProperties.map((property) => (
                <TableRow key={property.id}>
                  <TableCell className="font-medium">{property.name}</TableCell>
                  <TableCell>{property.type}</TableCell>
                  <TableCell>{property.address}</TableCell>
                  <TableCell>
                    <Badge variant={property.status === 'available' ? 'secondary' : 'secondary'}>
                      {property.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatCurrency(property.rentAmount)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {user.role === 'landlord' && tenants.length > 0 && (
        <div className="mt-6">
          <h3 className="text-md font-semibold mb-3 flex items-center">
            <Users className="mr-2 h-4 w-4" /> Tenants ({tenants.length})
          </h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Property</TableHead>
                <TableHead>Monthly Rent</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tenants.map((tenant) => {
                const tenantProperty = tenant.propertyId
                  ? properties.find(p => p.id === tenant.propertyId)
                  : null;

                return (
                  <TableRow key={tenant.id}>
                    <TableCell className="font-medium">{tenant.name}</TableCell>
                    <TableCell>{tenant.email}</TableCell>
                    <TableCell>{tenantProperty ? tenantProperty.name : 'N/A'}</TableCell>
                    <TableCell>
                      {tenant.rentAmount
                        ? formatCurrency(tenant.rentAmount)
                        : (tenantProperty ? formatCurrency(tenantProperty.rentAmount) : 'N/A')}
                    </TableCell>
                    <TableCell>
                      {tenant.status === "active" ? (
                        <span className="flex items-center gap-1 text-green-600">
                          <CheckCircle className="h-3 w-3" /> Active
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-red-600">
                          <XCircle className="h-3 w-3" /> Inactive
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="flex justify-end">
        <Button variant="outline" onClick={onClose}>Close</Button>
      </div>
    </div>
  );
};

const ManageUsers = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const [users] = useState<User[]>([
    { id: "1", name: "John Doe", email: "john@example.com", role: "landlord", status: "active" },
    { id: "2", name: "Jane Smith", email: "jane@example.com", role: "tenant", status: "active", propertyId: "prop1", landlordId: "1", rentAmount: 1200 },
    { id: "3", name: "Bob Johnson", email: "bob@example.com", role: "tenant", status: "inactive", propertyId: "prop2", landlordId: "1", rentAmount: 1350 },
    { id: "4", name: "Alice Brown", email: "alice@example.com", role: "landlord", status: "active" },
    { id: "5", name: "Charlie Wilson", email: "charlie@example.com", role: "admin", status: "active" },
    { id: "6", name: "Eva Martinez", email: "eva@example.com", role: "tenant", status: "active", propertyId: "prop3", landlordId: "4", rentAmount: 1500 },
  ]);

  const [properties] = useState<Property[]>([
    {
      id: "prop1",
      name: "Sunset Apartments - Unit 101",
      address: "123 Main St, Cityville",
      type: "Apartment",
      bedrooms: 2,
      bathrooms: 1,
      area: 850,
      rentAmount: 1200,
      images: [],
      amenities: ["Air Conditioning", "Dishwasher", "Parking"],
      status: "occupied",
      landlord: "1"
    },
    {
      id: "prop2",
      name: "Bayview Condos - Unit 305",
      address: "456 Ocean Ave, Seaside",
      type: "Condo",
      bedrooms: 3,
      bathrooms: 2,
      area: 1200,
      rentAmount: 1350,
      images: [],
      amenities: ["Pool", "Gym", "Security"],
      status: "occupied",
      landlord: "1"
    },
    {
      id: "prop3",
      name: "Parkview Residences - Unit 405",
      address: "789 Park Blvd, Greenville",
      type: "Apartment",
      bedrooms: 1,
      bathrooms: 1,
      area: 700,
      rentAmount: 1500,
      images: [],
      amenities: ["Balcony", "Washer/Dryer", "Pet Friendly"],
      status: "occupied",
      landlord: "4"
    },
    {
      id: "prop4",
      name: "Westside Heights - Unit 210",
      address: "321 West St, Downtown",
      type: "Studio",
      bedrooms: 0,
      bathrooms: 1,
      area: 500,
      rentAmount: 950,
      images: [],
      amenities: ["Furnished", "Utilities Included"],
      status: "available",
      landlord: "4"
    },
  ]);

  const getFilteredUsers = (role: string | null = null) => {
    return users.filter(user => {
      const matchesSearch =
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase());

      if (role) {
        return matchesSearch && user.role === role;
      }

      return matchesSearch;
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Manage Users</h1>
        <p className="text-muted-foreground">View and manage system users</p>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search users by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button>Add New User</Button>
      </div>

      <Card>
        <Tabs defaultValue="all" className="p-4">
          <TabsList className="mb-4">
            <TabsTrigger value="all">All Users ({getFilteredUsers().length})</TabsTrigger>
            <TabsTrigger value="admin">Admins ({getFilteredUsers("admin").length})</TabsTrigger>
            <TabsTrigger value="landlord">Landlords ({getFilteredUsers("landlord").length})</TabsTrigger>
            <TabsTrigger value="tenant">Tenants ({getFilteredUsers("tenant").length})</TabsTrigger>
          </TabsList>

          <TabsContent value="all">
            <UserTable
              users={getFilteredUsers()}
              onViewDetails={(user) => setSelectedUser(user)}
            />
          </TabsContent>

          <TabsContent value="admin">
            <UserTable
              users={getFilteredUsers("admin")}
              onViewDetails={(user) => setSelectedUser(user)}
            />
          </TabsContent>

          <TabsContent value="landlord">
            <UserTable
              users={getFilteredUsers("landlord")}
              onViewDetails={(user) => setSelectedUser(user)}
            />
          </TabsContent>

          <TabsContent value="tenant">
            <UserTable
              users={getFilteredUsers("tenant")}
              onViewDetails={(user) => setSelectedUser(user)}
            />
          </TabsContent>
        </Tabs>
      </Card>

      <Dialog open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
            <DialogDescription>
              Detailed information about the selected users.
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-x-auto scrollbar-hidden">
          {selectedUser && (
              <UserDetails
                user={selectedUser}
                properties={properties}
                users={users}
                onClose={() => setSelectedUser(null)}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const UserTable = ({ users, onViewDetails }: { users: User[], onViewDetails: (user: User) => void }) => {
  const formatCurrency = useCurrencyFormatter();

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.length === 0 ? (
          <TableRow>
            <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
              No users found
            </TableCell>
          </TableRow>
        ) : (
          users.map((user) => (
            <TableRow key={user.id}>
              <TableCell className="font-medium">{user.name}</TableCell>
              <TableCell>{user.email}</TableCell>
              <TableCell>
                <Badge
                  variant={user.role === "admin" ? "destructive" : user.role === "landlord" ? "default" : "secondary"}
                >
                  {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                </Badge>
              </TableCell>
              <TableCell>
                {user.status === "active" ? (
                  <span className="flex items-center gap-1 text-green-600">
                    <CheckCircle className="h-4 w-4" /> Active
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-red-600">
                    <XCircle className="h-4 w-4" /> Inactive
                  </span>
                )}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => onViewDetails(user)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon">
                    <Trash className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
};

export default ManageUsers;
