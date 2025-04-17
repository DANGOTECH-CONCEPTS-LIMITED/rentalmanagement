import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  CheckCircle,
  XCircle,
  Edit,
  Trash,
  Search,
  Home,
  DollarSign,
  User,
  Eye,
  Users,
  Clock
} from "lucide-react";
import axios from "axios";

import { useCurrencyFormatter } from "@/hooks/use-currency-formatter";
import Modal from "@/components/common/Model";
import { toast } from "sonner";

interface User {
  id: string;
  name: string;
  email: string;
  role: "Administrator" | "Landlord" | "Tenant";
  status: "active" | "inactive";
  propertyId?: string;
  landlordId?: string;
  rentAmount?: number;
  verified?: boolean;
}

interface SystemRole {
  id: number;
  name: "Administrator" | "Landlord" | "Tenant";
  description: string;
  permissions: string[] | null;
}

interface ApiUser {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  password: string;
  active: boolean;
  passportPhoto: string;
  idFront: string;
  idBack: string;
  nationalIdNumber: string;
  passwordChanged: boolean;
  verified: boolean;
  token: string | null;
  systemRoleId: number;
  systemRole: SystemRole;
}

interface Property {
  id: string;
  name: string;
  address: string;
  type: string;
  bedrooms: number;
  bathrooms: number;
  area: number;
  rentAmount: number;
  images: string[];
  amenities: string[];
  status: "available" | "occupied";
  landlord: string;
}

interface UserDetailsProps {
  user: User;
  properties: Property[];
  users: User[];
  onClose: () => void;
}

interface UserTableProps {
  users: User[];
  onViewDetails: (user: User) => void;
  onDeleteSuccess?: () => void;  // Add this prop
}


const UserDetails = ({
  user,
  properties,
  users,
  onClose,
}: UserDetailsProps) => {
  const formatCurrency = useCurrencyFormatter();

  const assignedProperty =
    user.role === "Tenant" && user.propertyId
      ? properties.find((p) => p.id === user.propertyId)
      : null;

  const assignedLandlord =
    user.role === "Tenant" && user.landlordId
      ? users.find((u) => u.id === user.landlordId)
      : null;

  const ownedProperties =
    user.role === "Landlord"
      ? properties.filter((p) => p.landlord === user.id)
      : [];


  const tenants =
    user.role === "Landlord"
      ? users.filter((u) => u.role === "Tenant" && u.landlordId === user.id)
      : [];

  console.log("ownedProperties", ownedProperties);
  return (
    <div className="space-y-6">
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
          <div className="text-xs font-medium text-muted-foreground mb-1">
            Role
          </div>
          <Badge
            variant={
              user.role === "Administrator"
                ? "destructive"
                : user.role === "Landlord"
                  ? "default"
                  : "secondary"
            }
          >
            {user.role?.charAt(0).toUpperCase() + user.role?.slice(1)}
          </Badge>
        </div>
        <div className="col-span-1 bg-secondary/20 p-3 rounded-md">
          <div className="text-xs font-medium text-muted-foreground mb-1">
            Status
          </div>
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
          <div className="text-xs font-medium text-muted-foreground mb-1">
            User ID
          </div>
          <div className="text-sm font-mono">{user.id}</div>
        </div>
      </div>

      {user.role === "Tenant" && assignedProperty && (
        <div className="mt-6">
          <h3 className="text-md font-semibold mb-3 flex items-center">
            <Home className="mr-2 h-4 w-4" /> Property Details
          </h3>
          <Card className="p-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs font-medium text-muted-foreground mb-1">
                  Property Name
                </div>
                <div className="text-sm">{assignedProperty.name}</div>
              </div>
              <div>
                <div className="text-xs font-medium text-muted-foreground mb-1">
                  Property Type
                </div>
                <div className="text-sm">{assignedProperty.type}</div>
              </div>
              <div>
                <div className="text-xs font-medium text-muted-foreground mb-1">
                  Address
                </div>
                <div className="text-sm">{assignedProperty.address}</div>
              </div>
              <div>
                <div className="text-xs font-medium text-muted-foreground mb-1">
                  Rent Amount
                </div>
                <div className="text-sm font-semibold">
                  {formatCurrency(
                    user.rentAmount || assignedProperty.rentAmount
                  )}
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {user.role === "Tenant" && assignedLandlord && (
        <div className="mt-6">
          <h3 className="text-md font-semibold mb-3 flex items-center">
            <User className="mr-2 h-4 w-4" /> Landlord Details
          </h3>
          <Card className="p-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs font-medium text-muted-foreground mb-1">
                  Name
                </div>
                <div className="text-sm">{assignedLandlord.name}</div>
              </div>
              <div>
                <div className="text-xs font-medium text-muted-foreground mb-1">
                  Email
                </div>
                <div className="text-sm">{assignedLandlord.email}</div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {user.role === "Landlord" && ownedProperties.length > 0 && (
        <div className="mt-6">
          <h3 className="text-md font-semibold mb-3 flex items-center">
            <Home className="mr-2 h-4 w-4" /> Owned Properties (
            {ownedProperties.length})
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
                    <Badge
                      variant={
                        property.status === "available"
                          ? "secondary"
                          : "secondary"
                      }
                    >
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

      {user.role === "Landlord" && tenants.length > 0 && (
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
                  ? properties.find((p) => p.id === tenant.propertyId)
                  : null;

                return (
                  <TableRow key={tenant.id}>
                    <TableCell className="font-medium">{tenant.name}</TableCell>
                    <TableCell>{tenant.email}</TableCell>
                    <TableCell>
                      {tenantProperty ? tenantProperty.name : "N/A"}
                    </TableCell>
                    <TableCell>
                      {tenant.rentAmount
                        ? formatCurrency(tenant.rentAmount)
                        : tenantProperty
                          ? formatCurrency(tenantProperty.rentAmount)
                          : "N/A"}
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
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      </div>
    </div>
  );
};

const ManageUsers = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [roles, setRoles] = useState([]);
  const [users, setUsers] = useState<User[]>([]);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    systemRoleId: "",
  });
  const [errors, setErrors] = useState({
    fullName: "",
    email: "",
    systemRoleId: "",
  });

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      const { data } = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL}/GetAllRoles`
      );

      setRoles(data);
    } catch (error) {
      console.log(error);
    }
  };
  const fetchUsers = async () => {
    try {
      const { data } = await axios.get<ApiUser[]>(
        `${import.meta.env.VITE_API_BASE_URL}/GetAllUsers`
      );

      const formattedUsers: User[] = data.map((item) => ({
        id: item.id,
        name: item.fullName,
        email: item.email,
        role: item.systemRole.name,
        status: item.verified ? "active" : "inactive",
        verified: item.verified,
      }));

      setUsers(formattedUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Failed to fetch users");
    }
  };
  const openModal = () => setIsModalOpen(true);
  const closeModal = () => {
    setIsModalOpen(false);
    setFormData({ fullName: "", email: "", systemRoleId: "" });
    setErrors({ fullName: "", email: "", systemRoleId: "" });
  };

  const handleChange = (e: any) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });

    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: "",
      });
    }
  };

  const validateForm = () => {
    let isValid = true;
    const newErrors = { fullName: "", email: "", systemRoleId: "" };

    // Validate fullName
    if (!formData.fullName.trim()) {
      newErrors.fullName = "Full name is required";
      isValid = false;
    }

    // Validate email
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Email address is invalid";
      isValid = false;
    }

    // Validate systemRoleId
    if (!formData.systemRoleId) {
      newErrors.systemRoleId = "Role selection is required";
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (validateForm()) {
      // Convert systemRoleId to number
      const submittedData = {
        ...formData,
        systemRoleId: Number(formData.systemRoleId),
      };

      try {
        const { data, status } = await axios.post(
          `${import.meta.env.VITE_API_BASE_URL}/RegisterUser`,
          submittedData
        );
        if (status >= 200 && status < 300) {
          closeModal();
          toast.success("User created successfully!");
          fetchUsers();
        }
      } catch (error) {
        console.log("error", error);
      }
    }
  };

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
      landlord: "1",
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
      landlord: "1",
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
      landlord: "4",
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
      landlord: "4",
    },
  ]);

  const getFilteredUsers = (role: string | null = null) => {
    return users.filter((user) => {
      const matchesSearch =
        user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase());

      if (role) {
        return matchesSearch && user.role === role; // Exact match
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
        <Button onClick={openModal}>Add New User</Button>
      </div>

      <Card>
        <Tabs defaultValue="all" className="p-4">
          <TabsList className="mb-4">
            <TabsTrigger value="all">
              All Users ({getFilteredUsers().length})
            </TabsTrigger>
            <TabsTrigger value="admin">
              Admins ({getFilteredUsers("Administrator").length})
            </TabsTrigger>
            <TabsTrigger value="landlord">
              Landlords ({getFilteredUsers("Landlord").length})
            </TabsTrigger>
            <TabsTrigger value="tenant">
              Tenants ({getFilteredUsers("Tenant").length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all">
            <UserTable
              users={getFilteredUsers()}
              onViewDetails={(user) => setSelectedUser(user)}
              onDeleteSuccess={fetchUsers}
            />
          </TabsContent>

          <TabsContent value="admin">
            <UserTable
              users={getFilteredUsers("Administrator")}
              onViewDetails={(user) => setSelectedUser(user)}
            />
          </TabsContent>

          <TabsContent value="landlord">
            <UserTable
              users={getFilteredUsers("Landlord")}
              onViewDetails={(user) => setSelectedUser(user)}
            />
          </TabsContent>

          <TabsContent value="tenant">
            <UserTable
              users={getFilteredUsers("Tenant")}
              onViewDetails={(user) => setSelectedUser(user)}
            />
          </TabsContent>
        </Tabs>
      </Card>

      <Dialog
        open={!!selectedUser}
        onOpenChange={(open) => !open && setSelectedUser(null)}
      >
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
            <DialogDescription>
              Detailed information about the selected user.
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <UserDetails
              user={selectedUser}
              properties={properties}
              users={users}
              onClose={() => setSelectedUser(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title="Add new user"
        size="md"
        footer={
          <div className="flex justify-end space-x-6">
            <button
              type="button"
              className="px-6 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md transition"
              onClick={closeModal}
            >
              Cancel
            </button>
            <button
              type="submit"
              form="userForm"
              className="px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-md transition"
            >
              Add user
            </button>
          </div>
        }
      >
        <form id="userForm" onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="fullName"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Full Name
            </label>
            <input
              type="text"
              id="fullName"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 ${errors.fullName
                ? "border-red-500 focus:ring-red-300"
                : "border-gray-300 focus:ring-blue-300"
                }`}
              placeholder="Enter your full name"
            />
            {errors.fullName && (
              <p className="mt-1 text-sm text-red-600">{errors.fullName}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Email Address
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 ${errors.email
                ? "border-red-500 focus:ring-red-300"
                : "border-gray-300 focus:ring-blue-300"
                }`}
              placeholder="example@email.com"
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="systemRoleId"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              System Role
            </label>
            <select
              id="systemRoleId"
              name="systemRoleId"
              value={formData.systemRoleId}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 ${errors.systemRoleId
                ? "border-red-500 focus:ring-red-300 "
                : "border-gray-300 focus:ring-blue-300"
                }`}
            >
              <option value="">Select a role</option>
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
            {errors.systemRoleId && (
              <p className="mt-1 text-sm text-red-600">{errors.systemRoleId}</p>
            )}
          </div>
        </form>
      </Modal>
    </div>
  );
};

const UserTable = ({
  users,
  onViewDetails,
  onDeleteSuccess,
}: {
  users: User[];
  onDeleteSuccess?: () => void;
  onViewDetails: (user: User) => void;
}) => {
  const formatCurrency = useCurrencyFormatter();
  console.log("users", users);
  const user = localStorage.getItem('user') || null;
  
  console.log("Token:", user);

  const token = JSON.parse(user).token;
  const deletUser = async (userId: string) => {
    try {
      const { data, status } = await axios.delete(
        `${import.meta.env.VITE_API_BASE_URL}/DeleteUser/${userId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (status >= 200 && status < 300) {
        toast.success("User deleted successfully!");
        onDeleteSuccess && onDeleteSuccess();
      }
    } catch (error) {
      console.log("error", error);
    }
  }

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
            <TableCell
              colSpan={5}
              className="text-center py-8 text-muted-foreground"
            >
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
                  variant={
                    user.role === "Administrator"
                      ? "destructive"
                      : user.role === "Landlord"
                        ? "default"
                        : "secondary"
                  }
                >
                  {user.role?.charAt(0).toUpperCase() + user.role?.slice(1)}
                </Badge>
              </TableCell>
              <TableCell>
                {user.status === "active" ? (
                  <span className="flex items-center gap-1 text-green-600">
                    <CheckCircle className="h-4 w-4" /> Active
                  </span>
                ) : user.status === "inactive" ? (
                  <span className="flex items-center gap-1 text-yellow-600">
                    <XCircle className="h-4 w-4" /> Inactive
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-gray-600">
                    <Clock className="h-4 w-4" /> Pending Verification
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
                  <Button variant="outline" size="icon" onClick={() => deletUser(user.id)}>
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