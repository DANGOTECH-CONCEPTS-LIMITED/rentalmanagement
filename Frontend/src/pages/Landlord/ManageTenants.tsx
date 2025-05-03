import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Users,
  Search,
  Eye,
  Edit,
  Trash,
  Calendar,
  Home,
  CreditCard,
  XIcon,
  PhoneIcon,
  Upload,
  Camera,
  Check,
  Key,
  Mail,
  Phone,
  User,
  UserPlus,
  X,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { set } from "date-fns";
import { useNavigate } from "react-router-dom";
import Modal from "@/components/common/Model";
import { Property } from "./RegisterTenants";
import { motion } from "framer-motion";
import axios from "axios";
import ConfirmDeleteModal from "@/components/common/DeleteModal";

interface Tenant {
  idFront: string;
  idBack: string;
  propertyId: string;
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
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isEdit, setIsEdit] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const { toast } = useToast();
  const [isLoadingProperties, setIsLoadingProperties] = useState(true);
  const [properties, setProperties] = useState<Property[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [passportPhoto, setPassportPhoto] = useState<File | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [passportPhotoPreview, setPassportPhotoPreview] = useState<
    string | null
  >(null);
  const [deleteTenant, setDeleteTenant] = useState<Tenant | null>(null);
  const [idFrontPhoto, setIdFrontPhoto] = useState<File | null>(null);
  const [idFrontPhotoPreview, setIdFrontPhotoPreview] = useState<string | null>(
    null
  );

  const [idBackPhoto, setIdBackPhoto] = useState<File | null>(null);
  const [idBackPhotoPreview, setIdBackPhotoPreview] = useState<string | null>(
    null
  );
  const [formData, setFormData] = useState({
    id: 0, // Added id property
    FullName: "",
    Name: "",
    Email: "",
    PhoneNumber: "",
    NationalIdNumber: "",
    DateMovedIn: "",
    PropertyId: "",
    Active: "true",
  });

  const navigate = useNavigate();

  const apiUrl = import.meta.env.VITE_API_BASE_URL;

  const getAuthToken = () => {
    try {
      const user = localStorage.getItem("user");
      if (!user) {
        console.error("No user found in localStorage");
        return null;
      }
      const userData = JSON.parse(user);
      return userData.token;
    } catch (error) {
      console.error("Error parsing user data:", error);
      return null;
    }
  };

  useEffect(() => {
    const fetchTenants = async () => {
      try {
        const { data } = await axios.get(`${apiUrl}/GetAllTenants`);

        setTenants(data);
      } catch (error) {
        toast({
          title: "Error",
          description:
            error.status === 401 ? error.statusText : error.response.data,
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchTenants();
  }, [toast]);

  useEffect(() => {
    const fetchProperties = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_BASE_URL;

        const { data } = await axios.get(`${apiUrl}/GetAllProperties`);

        setProperties(data);
      } catch (error) {
        toast({
          title: "Error",
          description:
            error.status === 401 ? error.statusText : error.response.data,
          variant: "destructive",
        });
      } finally {
        setIsLoadingProperties(false);
      }
    };

    fetchProperties();
  }, [toast]);

  useEffect(() => {
    return () => {
      if (passportPhotoPreview) URL.revokeObjectURL(passportPhotoPreview);
      if (idFrontPhotoPreview) URL.revokeObjectURL(idFrontPhotoPreview);
      if (idBackPhotoPreview) URL.revokeObjectURL(idBackPhotoPreview);
    };
  }, []);

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "PassportPhoto" | "IdFront" | "IdBack"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const previewUrl = URL.createObjectURL(file);

    if (type === "PassportPhoto") {
      // Clean up previous preview URL if exists
      if (passportPhotoPreview) URL.revokeObjectURL(passportPhotoPreview);
      setPassportPhoto(file);
      setPassportPhotoPreview(previewUrl);
    } else if (type === "IdFront") {
      if (idFrontPhotoPreview) URL.revokeObjectURL(idFrontPhotoPreview);
      setIdFrontPhoto(file);
      setIdFrontPhotoPreview(previewUrl);
    } else if (type === "IdBack") {
      if (idBackPhotoPreview) URL.revokeObjectURL(idBackPhotoPreview);
      setIdBackPhoto(file);
      setIdBackPhotoPreview(previewUrl);
    }
  };

  const clearFile = (type: "PassportPhoto" | "IdFront" | "IdBack") => {
    if (type === "PassportPhoto") {
      if (passportPhotoPreview) URL.revokeObjectURL(passportPhotoPreview);
      setPassportPhoto(null);
      setPassportPhotoPreview(null);
    } else if (type === "IdFront") {
      if (idFrontPhotoPreview) URL.revokeObjectURL(idFrontPhotoPreview);
      setIdFrontPhoto(null);
      setIdFrontPhotoPreview(null);
    } else if (type === "IdBack") {
      if (idBackPhotoPreview) URL.revokeObjectURL(idBackPhotoPreview);
      setIdBackPhoto(null);
      setIdBackPhotoPreview(null);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
      ...(name === "FullName" ? { Name: value } : {}),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsSubmitting(true);

    try {
      const apiUrl = import.meta.env.VITE_API_BASE_URL;

      const form = new FormData();

      // Format date to match expected API format
      const moveDateObj = new Date(formData.DateMovedIn);
      const formattedDate = moveDateObj.toISOString();
      form.append("tenantid", formData.id.toString());
      form.append("FullName", formData.FullName);
      form.append("Name", formData.Name || formData.FullName);
      form.append("Email", formData.Email);
      form.append("PhoneNumber", formData.PhoneNumber);
      form.append("NationalIdNumber", formData.NationalIdNumber);
      form.append("DateMovedIn", formattedDate);
      form.append("PropertyId", formData.PropertyId);
      form.append("Active", formData.Active);

      form.append("PassportPhoto", passportPhoto);
      form.append("IdFront", idFrontPhoto);
      form.append("IdBack", idBackPhoto);

      form.append("files", passportPhoto);
      form.append("files", idFrontPhoto);
      form.append("files", idBackPhoto);

      const response = await axios.put(`${apiUrl}/UpdateTenant`, form, {
        headers: {
          // Authorization: `Bearer ${token}`, // If you're using auth
          Accept: "*/*",
          // Don't set Content-Type manually
        },
      });

      if (response.status !== 200) {
        throw new Error("Failed to update tenant");
      }
      setIsSubmitting(false);
      setIsSuccess(true);

      toast({
        title: "Tenant Registered Successfully",
        description: `${formData.FullName} has been registered as a tenant.`,
        variant: "default",
      });

      // Reset form after success
      setTimeout(() => {
        setFormData({
          id: 0,
          FullName: "",
          Name: "",
          Email: "",
          PhoneNumber: "",
          NationalIdNumber: "",
          DateMovedIn: "",
          PropertyId: "",

          Active: "true",
        });
        clearFile("PassportPhoto");
        clearFile("IdFront");
        clearFile("IdBack");
        setIsSuccess(false);
        setIsEdit(false);
      }, 3000);
    } catch (error) {
      console.error("Error submitting form:", error);
      setIsSubmitting(false);

      toast({
        title: "Error",
        description:
          error.status === 401 ? error.statusText : error.response.data,
        variant: "destructive",
      });
    }
  };

  const filteredTenants = tenants.filter(
    (tenant) =>
      tenant.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tenant.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tenant.property.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (amount: number, currency: string = "UGX") => {
    return new Intl.NumberFormat("en-UG", {
      style: "currency",
      currency: currency,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusBadgeClass = (active: boolean) => {
    return active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800";
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const handleDeleteTenant = async (tenantId: number) => {
    try {
      const response = await fetch(`${apiUrl}/DeleteTenant/${tenantId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${getAuthToken()}`,
        },
      });
      if (response.ok) {
        setTenants(tenants.filter((tenant) => tenant.id !== tenantId));
        setSelectedTenant(null);
        toast({
          title: "Success",
          description: "Tenant deleted successfully",
        });
      } else {
        throw new Error("Failed to delete tenant");
      }
    } catch (error) {
      toast({
        title: "Error",
        description:
          error.status === 401 ? error.statusText : error.response.data,
        variant: "destructive",
      });
    }
  };

  const PLACEHOLDER_IMAGE = "https://placehold.co/150?text=No+Image";

  const getImageUrl = (relativePath: string) => {
    if (!relativePath) return PLACEHOLDER_IMAGE;
    if (relativePath.startsWith("http")) return relativePath;

    const token = getAuthToken();
    return `${apiUrl}/${relativePath}${token ? `?token=${token}` : ""}`;
  };

  const getImageUrl2 = (fullPath?: string): string => {
    if (!fullPath || typeof fullPath !== "string") return "";

    const fileName = fullPath.split(/[/\\]/).pop()?.trim();
    if (!fileName) return "";

    return `${apiUrl}/uploads/${fileName}`;
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb and header remain the same */}

      <Card>
        <CardContent className="pt-6">
          <h1 className="text-2xl font-semibold tracking-tight">
            Manage Tenants
          </h1>
          <div className="flex justify-between items-center mt-4">
            <div className="mb-6 flex items-center relative w-2/3">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or property..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button
              onClick={() => navigate("/landlord-dashboard/register-tenants")}
            >
              Add Tenant
            </Button>
          </div>

          {isLoading ? (
            <div className="py-8 text-center">
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
              </div>
            </div>
          ) : filteredTenants.length === 0 ? (
            <div className="py-8 flex flex-col items-center justify-center text-center">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No tenants found</h3>
              <p className="text-muted-foreground mt-1">
                {searchTerm
                  ? "Try adjusting your search query"
                  : "Start by adding a new tenant"}
              </p>
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tenant</TableHead>
                    <TableHead className="hidden md:table-cell">
                      Property
                    </TableHead>
                    <TableHead className="hidden lg:table-cell">
                      Move-in Date
                    </TableHead>
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
                          <div>
                            <div className="font-medium">{tenant.fullName}</div>
                            <div className="text-sm text-muted-foreground">
                              {tenant.email}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {tenant.property.name}
                        <div className="text-sm text-muted-foreground">
                          {tenant.property.type}
                        </div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {formatDate(tenant.dateMovedIn)}
                      </TableCell>
                      <TableCell>
                        {formatCurrency(
                          tenant.property.price,
                          tenant.property.currency
                        )}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded-full text-xs ${getStatusBadgeClass(
                            tenant.active
                          )}`}
                        >
                          {tenant.active ? "Active" : "Inactive"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => {
                              setSelectedTenant(tenant);
                              setFormData({
                                id: tenant.id,
                                FullName: tenant.fullName,
                                Name: tenant.fullName,
                                Email: tenant.email,
                                PhoneNumber: tenant.phoneNumber,
                                NationalIdNumber: tenant.nationalIdNumber,
                                DateMovedIn: new Date(tenant.dateMovedIn)
                                  .toISOString()
                                  .split("T")[0],
                                PropertyId: tenant.propertyId,
                                Active: String(tenant.active),
                              });
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => {
                              console.log("edit tenant", tenant);
                              setFormData({
                                id: tenant.id,
                                FullName: tenant.fullName,
                                Name: tenant.fullName,
                                Email: tenant.email,
                                PhoneNumber: tenant.phoneNumber,
                                NationalIdNumber: tenant.nationalIdNumber,
                                DateMovedIn: new Date(tenant.dateMovedIn)
                                  .toISOString()
                                  .split("T")[0],
                                PropertyId: tenant.propertyId,
                                Active: String(tenant.active),
                              });
                              setPassportPhotoPreview(
                                getImageUrl(tenant.passportPhoto)
                              );
                              setIdFrontPhotoPreview(
                                getImageUrl(tenant.idFront)
                              );
                              setIdBackPhotoPreview(getImageUrl(tenant.idBack));

                              setIsEdit(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className="text-red-500"
                            onClick={() => {
                              setDeleteTenant(tenant);
                              setIsDeleteModalOpen(true);
                            }}
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
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedTenant(null)}
                >
                  <XIcon className="h-4 w-4" />
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-1">
                  <div className="flex flex-col items-center">
                    <div className="w-60 h-60 bg-gray-200 p-2 rounded-full overflow-hidden">
                      <img
                        src={getImageUrl2(selectedTenant.passportPhoto)}
                        alt={selectedTenant.fullName}
                        className="h-full w-full  rounded-full"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = PLACEHOLDER_IMAGE;
                          target.onerror = null; // Prevent infinite loop if placeholder also fails
                        }}
                      />
                    </div>

                    <h3 className="font-semibold text-lg">
                      {selectedTenant.fullName}
                    </h3>
                    <p className="text-muted-foreground">
                      {selectedTenant.email}
                    </p>
                    <div
                      className={`mt-3 px-3 py-1 rounded-full text-xs ${getStatusBadgeClass(
                        selectedTenant.active
                      )}`}
                    >
                      {selectedTenant.active ? "Active Tenant" : "Inactive"}
                    </div>
                  </div>
                </div>

                <div className="md:col-span-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-3">
                        Personal Information
                      </h4>

                      <div className="space-y-3">
                        <div>
                          <span className="text-xs text-muted-foreground">
                            Phone
                          </span>
                          <p className="flex items-center">
                            <PhoneIcon size={14} className="mr-1" />
                            {selectedTenant.phoneNumber}
                          </p>
                        </div>

                        <div>
                          <span className="text-xs text-muted-foreground">
                            National ID
                          </span>
                          <p className="flex items-center">
                            <CreditCard size={14} className="mr-1" />
                            {selectedTenant.nationalIdNumber}
                          </p>
                        </div>

                        <div>
                          <span className="text-xs text-muted-foreground">
                            Move-in Date
                          </span>
                          <p className="flex items-center">
                            <Calendar size={14} className="mr-1" />
                            {formatDate(selectedTenant.dateMovedIn)}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-3">
                        Property & Payment
                      </h4>

                      <div className="space-y-3">
                        <div>
                          <span className="text-xs text-muted-foreground">
                            Property
                          </span>
                          <p className="flex items-center">
                            <Home size={14} className="mr-1" />
                            {selectedTenant.property.name} (
                            {selectedTenant.property.type})
                          </p>
                        </div>

                        <div>
                          <span className="text-xs text-muted-foreground">
                            Monthly Rent
                          </span>
                          <p className="font-semibold">
                            {formatCurrency(
                              selectedTenant.property.price,
                              selectedTenant.property.currency
                            )}
                          </p>
                        </div>

                        <div>
                          <span className="text-xs text-muted-foreground">
                            Next Payment Due
                          </span>
                          <p className="flex items-center">
                            {formatDate(selectedTenant.nextPaymentDate)}
                          </p>
                        </div>

                        <div>
                          <span className="text-xs text-muted-foreground">
                            Balance Due
                          </span>
                          <p className="font-semibold">
                            {formatCurrency(
                              selectedTenant.balanceDue,
                              selectedTenant.property.currency
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 border-t pt-6">
                    <h4 className="text-sm font-medium mb-3">Actions</h4>
                    <div className="flex space-x-3">
                      <Button>Record Payment</Button>
                      <Button variant="outline" onClick={() => setIsEdit(true)}>
                        Update Information
                      </Button>
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

      <Modal
        isOpen={isEdit}
        onClose={() => setIsEdit(false)}
        title="Update Tenant"
        size="xl"
        footer={
          <div className="flex justify-end space-x-6">
            <Button
              variant="outline"
              type="button"
              onClick={() => setIsEdit(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Updating..." : "Update Tenant"}
            </Button>
          </div>
        }
      >
        <div className="h-[65vh] overflow-y-auto">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                Tenant Registration Form
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isSuccess ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center text-center py-10"
                >
                  <div className="bg-green-100 rounded-full p-4 mb-4">
                    <Check className="h-10 w-10 text-green-600" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">
                    Tenant Updated Successfully!
                  </h3>
                  <p className="text-gray-600 max-w-md mb-4">
                    An email has been sent to {formData.Email} with login
                    instructions.
                  </p>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        <span className="flex items-center">
                          <User className="mr-1 h-4 w-4" />
                          Full Name
                        </span>
                      </label>
                      <Input
                        name="FullName"
                        value={formData.FullName}
                        onChange={handleInputChange}
                        placeholder="Enter tenant's full name"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        <span className="flex items-center">
                          <Mail className="mr-1 h-4 w-4" />
                          Email
                        </span>
                      </label>
                      <Input
                        name="Email"
                        type="email"
                        value={formData.Email}
                        onChange={handleInputChange}
                        placeholder="Enter tenant's email"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        <span className="flex items-center">
                          <Phone className="mr-1 h-4 w-4" />
                          Phone Number
                        </span>
                      </label>
                      <Input
                        name="PhoneNumber"
                        type="tel"
                        value={formData.PhoneNumber}
                        onChange={handleInputChange}
                        placeholder="Enter tenant's phone number"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        <span className="flex items-center">
                          <Key className="mr-1 h-4 w-4" />
                          National ID Number
                        </span>
                      </label>
                      <Input
                        name="NationalIdNumber"
                        value={formData.NationalIdNumber}
                        onChange={handleInputChange}
                        placeholder="Enter tenant's ID number"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        <span className="flex items-center">
                          <Calendar className="mr-1 h-4 w-4" />
                          Move-in Date
                        </span>
                      </label>
                      <Input
                        name="DateMovedIn"
                        type="date"
                        value={formData.DateMovedIn}
                        onChange={handleInputChange}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        <span className="flex items-center">
                          <Home className="mr-1 h-4 w-4" />
                          Property
                        </span>
                      </label>
                      <select
                        name="PropertyId"
                        className="w-full p-2 border border-gray-300 rounded-md"
                        value={formData.PropertyId}
                        onChange={handleInputChange}
                        required
                        disabled={isLoadingProperties}
                      >
                        <option value="">Select a property</option>
                        {properties.map((prop) => (
                          <option key={prop.id} value={prop.id}>
                            {prop.name} - {prop.address}
                          </option>
                        ))}
                      </select>
                      {isLoadingProperties && (
                        <div className="flex items-center justify-center h-64">
                          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Document Upload Section */}
                  <div className="pt-4">
                    <h3 className="font-medium mb-4">
                      Identification Documents
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {/* Passport Photo */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium flex items-center">
                          <Camera size={16} className="mr-1" />
                          Passport Photo
                        </label>
                        <div className="border-2 border-dashed rounded-md p-4 flex flex-col items-center justify-center h-40">
                          {passportPhoto ? (
                            <div className="relative w-full h-full">
                              <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded-md overflow-hidden">
                                {passportPhotoPreview && (
                                  <img
                                    src={passportPhotoPreview}
                                    alt="Passport preview"
                                    className="object-cover w-full h-full"
                                  />
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => clearFile("PassportPhoto")}
                                className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ) : (
                            <>
                              <Upload className="h-8 w-8 text-gray-400 mb-2" />
                              <p className="text-xs text-center text-gray-500">
                                <label className="text-primary hover:text-primary/80 cursor-pointer">
                                  Upload photo
                                  <input
                                    type="file"
                                    className="sr-only"
                                    accept="image/*"
                                    onChange={(e) =>
                                      handleFileChange(e, "PassportPhoto")
                                    }
                                    required
                                  />
                                </label>
                              </p>
                            </>
                          )}
                        </div>
                      </div>

                      {/* ID Front */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium flex items-center">
                          <CreditCard size={16} className="mr-1" />
                          ID Front Side
                        </label>
                        <div className="border-2 border-dashed rounded-md p-4 flex flex-col items-center justify-center h-40">
                          {idFrontPhoto ? (
                            <div className="relative w-full h-full">
                              <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded-md overflow-hidden">
                                {idFrontPhotoPreview && (
                                  <img
                                    src={idFrontPhotoPreview}
                                    alt="ID front preview"
                                    className="object-cover w-full h-full"
                                  />
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => clearFile("IdFront")}
                                className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ) : (
                            <>
                              <Upload className="h-8 w-8 text-gray-400 mb-2" />
                              <p className="text-xs text-center text-gray-500">
                                <label className="text-primary hover:text-primary/80 cursor-pointer">
                                  Upload front
                                  <input
                                    type="file"
                                    className="sr-only"
                                    accept="image/*"
                                    onChange={(e) =>
                                      handleFileChange(e, "IdFront")
                                    }
                                    required
                                  />
                                </label>
                              </p>
                            </>
                          )}
                        </div>
                      </div>

                      {/* ID Back */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium flex items-center">
                          <CreditCard size={16} className="mr-1" />
                          ID Back Side
                        </label>
                        <div className="border-2 border-dashed rounded-md p-4 flex flex-col items-center justify-center h-40">
                          {idBackPhoto ? (
                            <div className="relative w-full h-full">
                              <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded-md overflow-hidden">
                                {idBackPhotoPreview && (
                                  <img
                                    src={idBackPhotoPreview}
                                    alt="ID back preview"
                                    className="object-cover w-full h-full"
                                  />
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => clearFile("IdBack")}
                                className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ) : (
                            <>
                              <Upload className="h-8 w-8 text-gray-400 mb-2" />
                              <p className="text-xs text-center text-gray-500">
                                <label className="text-primary hover:text-primary/80 cursor-pointer">
                                  Upload back
                                  <input
                                    type="file"
                                    className="sr-only"
                                    accept="image/*"
                                    onChange={(e) =>
                                      handleFileChange(e, "IdBack")
                                    }
                                    required
                                  />
                                </label>
                              </p>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </Modal>

      <ConfirmDeleteModal
        title="Delete Tenant"
        isOpen={isDeleteModalOpen}
        tenantName={deleteTenant?.fullName || ""}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={() => {
          if (selectedTenant) handleDeleteTenant(selectedTenant.id);
        }}
      />
    </div>
  );
};

export default ManageTenants;
