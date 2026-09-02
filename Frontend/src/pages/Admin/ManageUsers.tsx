import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import GradientButton from "@/components/ui/button/Button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  User,
  Eye,
  Users,
  Clock,
  Upload,
  X,
  Camera,
  FileText,
  CreditCard,
} from "lucide-react";
import axios from "axios";

import { useCurrencyFormatter } from "@/hooks/use-currency-formatter";
import Modal from "@/components/common/Model";
import { toast } from "@/components/ui/use-toast";
import { LandlordFormData } from "./RegisterLandlord";
import ConfirmDeleteModal from "@/components/common/DeleteModal";
import { useNavigate } from "react-router-dom";

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
  passportPhoto?: string;
  idFront?: string;
  idBack?: string;
  nationalIdNumber?: string;
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
  onEditUser: (user: User) => void;
  onDeleteSuccess?: () => void;
}

const UserDetails = ({
  user,
  properties,
  users,
  onClose,
}: UserDetailsProps) => {
  const formatCurrency = useCurrencyFormatter();
  const navigate = useNavigate();

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

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <div className="w-60 h-60 bg-white/20 p-2 rounded-full overflow-hidden">
          <img
            src={`${
              import.meta.env.VITE_API_BASE_URL
            }/uploads/${user.passportPhoto?.split(/[/\\]/).pop()}`}
            alt={user.name}
            className="h-full w-full  rounded-full"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src =
                "https://media.istockphoto.com/id/1495088043/vector/user-profile-icon-avatar-or-person-icon-profile-picture-portrait-symbol-default-portrait.jpg?s=612x612&w=0&k=20&c=dhV2p1JwmloBTOaGAtaA3AW1KSnjsdMt7-U_3EZElZ0=";
              target.onerror = null; // Prevent infinite loop if placeholder also fails
            }}
          />
        </div>
        <div>
          <h3 className="text-lg font-semibold">{user.name}</h3>
          <p className="text-sm text-blue-200">{user.email}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="relative overflow-hidden bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-4 shadow-lg">
          <div className="absolute -right-3 -bottom-3 w-16 h-16 rounded-full opacity-10 bg-blue-400" />
          <div className="absolute top-3 right-3 w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white shadow-lg">
            <User className="h-4 w-4" />
          </div>
          <div className="text-xs font-medium text-blue-200 mb-2">Role</div>
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
        <div className="relative overflow-hidden bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-4 shadow-lg">
          <div className="absolute -right-3 -bottom-3 w-16 h-16 rounded-full opacity-10 bg-blue-400" />
          <div className="absolute top-3 right-3 w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-emerald-400 flex items-center justify-center text-white shadow-lg">
            {user.status === "active" ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <XCircle className="h-4 w-4" />
            )}
          </div>
          <div className="text-xs font-medium text-blue-200 mb-2">Status</div>
          {user.status === "active" ? (
            <span className="flex items-center gap-1 text-green-400 text-sm font-semibold">
              Active
            </span>
          ) : (
            <span className="flex items-center gap-1 text-red-400 text-sm font-semibold">
              Inactive
            </span>
          )}
        </div>
        <div className="relative overflow-hidden bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-4 shadow-lg">
          <div className="absolute -right-3 -bottom-3 w-16 h-16 rounded-full opacity-10 bg-blue-400" />
          <div className="absolute top-3 right-3 w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-400 flex items-center justify-center text-white shadow-lg">
            <FileText className="h-4 w-4" />
          </div>
          <div className="text-xs font-medium text-blue-200 mb-2">User ID</div>
          <div className="text-sm font-mono text-white truncate">{user.id}</div>
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
                <div className="text-xs font-medium text-blue-200 mb-1">
                  Property Name
                </div>
                <div className="text-sm">{assignedProperty.name}</div>
              </div>
              <div>
                <div className="text-xs font-medium text-blue-200 mb-1">
                  Property Type
                </div>
                <div className="text-sm">{assignedProperty.type}</div>
              </div>
              <div>
                <div className="text-xs font-medium text-blue-200 mb-1">
                  Address
                </div>
                <div className="text-sm">{assignedProperty.address}</div>
              </div>
              <div>
                <div className="text-xs font-medium text-blue-200 mb-1">
                  Rent Amount
                </div>
                <div className="text-sm font-semibold">
                  {formatCurrency(
                    user.rentAmount || assignedProperty.rentAmount,
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
                <div className="text-xs font-medium text-blue-200 mb-1">
                  Name
                </div>
                <div className="text-sm">{assignedLandlord.name}</div>
              </div>
              <div>
                <div className="text-xs font-medium text-blue-200 mb-1">
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
                        <span className="flex items-center gap-1 text-green-400">
                          <CheckCircle className="h-3 w-3" /> Active
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-red-400">
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

      <div className="flex justify-end gap-2">
        {["Landlord", "Utililty Payment"].includes(user.role) && (
          <Button
            variant="default"
            onClick={() =>
              navigate(`/admin-dashboard/utility-payments/${user.id}`)
            }
          >
            View Utility Payments
          </Button>
        )}
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
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [roles, setRoles] = useState([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<LandlordFormData>({
    FullName: "",
    PhoneNumber: "",
    Email: "",
    Password: "defaultPassword",
    IdType: "nationalId",
    IdNumber: "",
    systemRoleId: "",
  });

  const [editFormData, setEditFormData] = useState({
    id: "",
    fullName: "",
    email: "",
    systemRoleId: "",
    phoneNumber: "",
    nationalIdNumber: "",
    active: true,
    verified: false,
    PassportPhoto: null as File | null,
    IdFront: null as File | null,
    IdBack: null as File | null,
    currentPassportPhoto: "",
    currentIdFront: "",
    currentIdBack: "",
  });
  const [errors, setErrors] = useState({
    fullName: "",
    email: "",
    systemRoleId: "",
  });
  const [editErrors, setEditErrors] = useState({
    fullName: "",
    email: "",
    systemRoleId: "",
    phoneNumber: "",
  });
  const [previewUrls, setPreviewUrls] = useState({
    PassportPhoto: null as string | null,
    IdFront: null as string | null,
    IdBack: null as string | null,
  });

  const idTypes = [
    { value: "nationalId", label: "National ID", requiresBack: true },
    { value: "passport", label: "Passport", requiresBack: true },
    { value: "driverLicense", label: "Driver's License", requiresBack: true },
  ];

  const removeFile = (fileType: "PassportPhoto" | "IdFront" | "IdBack") => {
    setFormData((prev) => ({ ...prev, [fileType]: null }));
    setPreviewUrls((prev) => ({ ...prev, [fileType]: null }));
  };

  const handleRadioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      IdType: e.target.value as "nationalId" | "drivingPermit" | "passport",
    }));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      const { data } = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL}/GetAllRoles`,
      );

      setRoles(data);
    } catch (error) {
      toast({
        title: "Error",
        description: error.response.data,
        variant: "destructive",
      });
    }
  };
  const fetchUsers = async () => {
    try {
      const { data } = await axios.get<ApiUser[]>(
        `${import.meta.env.VITE_API_BASE_URL}/GetAllUsers`,
      );

      const formattedUsers: User[] = data.map((item) => ({
        id: item.id,
        name: item.fullName,
        email: item.email,
        role: item.systemRole.name,
        status: item.verified ? "active" : "inactive",
        verified: item.verified,
        passportPhoto: item.passportPhoto,
      }));

      setUsers(formattedUsers);
    } catch (error) {
      toast({
        title: "Error",
        description: error.response.data,
        variant: "destructive",
      });
    }
  };
  const openModal = () => setIsModalOpen(true);
  const closeModal = () => {
    setIsModalOpen(false);
    setFormData({
      FullName: "",
      PhoneNumber: "",
      Email: "",
      Password: "defaultPassword",
      IdType: "nationalId",
      IdNumber: "",
      systemRoleId: "",
    });
    setPreviewUrls({
      PassportPhoto: null as string | null,
      IdFront: null as string | null,
      IdBack: null as string | null,
    });
    setErrors({ fullName: "", email: "", systemRoleId: "" });
  };

  const openEditModal = (user: User) => {
    axios
      .get<ApiUser>(
        `${import.meta.env.VITE_API_BASE_URL}/GetUserById/${user.id}`,
      )
      .then((response) => {
        const userData = response.data;
        console.log("user", userData);
        setEditFormData({
          id: userData.id,
          fullName: userData.fullName,
          email: userData.email,
          systemRoleId: userData.systemRoleId.toString(),
          phoneNumber: userData.phoneNumber || "",
          nationalIdNumber: userData.nationalIdNumber || "",
          active: userData.active,
          verified: userData.verified,
          PassportPhoto: null,
          IdFront: null,
          IdBack: null,
          currentPassportPhoto: userData.passportPhoto,
          currentIdFront: userData.idFront,
          currentIdBack: userData.idBack,
        });
        setIsEditModalOpen(true);
      })
      .catch((error) => {
        toast({
          title: "Error",
          description: error.response.data,
          variant: "destructive",
        });
      });
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setEditErrors({
      fullName: "",
      email: "",
      systemRoleId: "",
      phoneNumber: "",
    });
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

  const handleEditChange = (e: any) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === "checkbox" ? checked : value;

    setEditFormData({
      ...editFormData,
      [name]: newValue,
    });

    if (editErrors[name]) {
      setEditErrors({
        ...editErrors,
        [name]: "",
      });
    }
  };

  const validateForm = () => {
    let isValid = true;
    const newErrors = { fullName: "", email: "", systemRoleId: "" };

    // Validate fullName
    if (!formData.FullName.trim()) {
      newErrors.fullName = "Full name is required";
      isValid = false;
    }

    // Validate email
    if (!formData.Email.trim()) {
      newErrors.email = "Email is required";
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(formData.Email)) {
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

  const validateEditForm = () => {
    let isValid = true;
    const newErrors = {
      fullName: "",
      email: "",
      systemRoleId: "",
      phoneNumber: "",
    };

    // Validate fullName
    if (!editFormData.fullName.trim()) {
      newErrors.fullName = "Full name is required";
      isValid = false;
    }

    // Validate email
    if (!editFormData.email.trim()) {
      newErrors.email = "Email is required";
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(editFormData.email)) {
      newErrors.email = "Email address is invalid";
      isValid = false;
    }

    // Validate systemRoleId
    if (!editFormData.systemRoleId) {
      newErrors.systemRoleId = "Role selection is required";
      isValid = false;
    }

    // Validate phoneNumber if provided
    if (
      editFormData.phoneNumber &&
      !/^\+?\d{10,15}$/.test(editFormData.phoneNumber)
    ) {
      newErrors.phoneNumber = "Please enter a valid phone number";
      isValid = false;
    }

    setEditErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !formData.PassportPhoto ||
      !formData.IdFront ||
      (isBackSideRequired() && !formData.IdBack)
    ) {
      toast({
        title: "Missing Documents",
        description: "Please upload all required identification documents.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append("FullName", formData.FullName);
      formDataToSend.append("PhoneNumber", formData.PhoneNumber);
      formDataToSend.append("Email", formData.Email);
      formDataToSend.append("NationalIdNumber", formData.IdNumber);
      formDataToSend.append("SystemRoleId", formData.systemRoleId);
      const files = [];
      if (formData.PassportPhoto) {
        files.push({
          file: formData.PassportPhoto,
          type: "PassportPhoto",
        });
      }
      if (formData.IdFront) {
        files.push({
          file: formData.IdFront,
          type: `${formData.IdType}Front`,
        });
      }
      if (formData.IdBack) {
        files.push({
          file: formData.IdBack,
          type: `${formData.IdType}Back`,
        });
      }
      files.forEach((fileObj, index) => {
        formDataToSend.append(`files`, fileObj.file);
      });
      const apiUrl = import.meta.env.VITE_API_BASE_URL;
      if (!apiUrl) {
        throw new Error("API base URL is not configured");
      }
      const response = await fetch(`${apiUrl}/RegisterUser`, {
        method: "POST",
        headers: {
          accept: "*/*",
        },
        body: formDataToSend,
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to register landlord");
      }
      const responseText = await response.text();
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (e) {
        result = { message: responseText };
      }
      fetchUsers();
      toast({
        title: "Landlord Registered",
        description: `${formData.FullName} has been successfully registered.`,
      });
      setFormData({
        FullName: "",
        PhoneNumber: "",
        Email: "",
        Password: "defaultPassword",
        IdType: "nationalId",
        IdNumber: "",
        systemRoleId: "",
      });
      setPreviewUrls({
        PassportPhoto: null,
        IdFront: null,
        IdBack: null,
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes("User regis")) {
        toast({
          title: "User Registered",
          description: `${formData.FullName} has been successfully registered.`,
        });

        setFormData({
          FullName: "",
          PhoneNumber: "",
          Email: "",
          Password: "defaultPassword",
          IdType: "nationalId",
          IdNumber: "",
          systemRoleId: "",
        });
        setPreviewUrls({
          PassportPhoto: null,
          IdFront: null,
          IdBack: null,
        });
      } else {
        console.error("Error submitting form:", error);
        toast({
          title: "Error",

          description: error.response.data,
          variant: "destructive",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (validateEditForm()) {
      // Get token for authorization
      const user = localStorage.getItem("user") || null;
      const token = user ? JSON.parse(user).token : null;

      if (!token) {
        toast({
          title: "Authentication required",
          description: "Please log in to perform this action.",
          variant: "destructive",
        });

        return;
      }

      try {
        // Create FormData to handle multipart/form-data
        const formData = new FormData();
        formData.append("Id", editFormData.id);
        formData.append("FullName", editFormData.fullName);
        formData.append("Email", editFormData.email);
        formData.append("SystemRoleId", editFormData.systemRoleId);
        formData.append("PhoneNumber", editFormData.phoneNumber || "");
        formData.append("Active", editFormData.active.toString());
        formData.append("Verified", editFormData.verified.toString());
        formData.append(
          "NationalIdNumber",
          editFormData.nationalIdNumber || "",
        );

        const files = [];
        console.log("editFormData", editFormData);
        console.log("previewUrls", previewUrls);
        if (editFormData.PassportPhoto) {
          files.push({
            file: editFormData.PassportPhoto,
            type: "PassportPhoto",
          });
        }

        if (editFormData.IdFront) {
          files.push({
            file: editFormData.IdFront,
            type: `IdFront`,
          });
        }

        if (editFormData.IdBack) {
          files.push({
            file: editFormData.IdBack,
            type: `IdBack`,
          });
        }

        files.forEach((fileObj, index) => {
          formData.append(`files`, fileObj.file);
        });

        const { status } = await axios.put(
          `${import.meta.env.VITE_API_BASE_URL}/UpdateUser`,
          formData,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "multipart/form-data",
            },
          },
        );

        if (status >= 200 && status < 300) {
          closeEditModal();
          // toast.success("User updated successfully!");
          toast({
            title: "Success",
            description: "User updated successfully!",
          });
          fetchUsers();
        }
      } catch (error) {
        toast({
          title: "Error",
          description: error.response.data,
          variant: "destructive",
        });
      }
    }
  };

  const handleEditFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    fileType: "PassportPhoto" | "IdFront" | "IdBack",
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      setEditFormData((prev) => ({ ...prev, [fileType]: file }));
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrls((prev) => ({
          ...prev,
          [fileType]: reader.result as string,
        }));
      };
      reader.readAsDataURL(file);
    }
  };
  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    fileType: "PassportPhoto" | "IdFront" | "IdBack",
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData((prev) => ({ ...prev, [fileType]: file }));
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrls((prev) => ({
          ...prev,
          [fileType]: reader.result as string,
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrop = (
    e: React.DragEvent<HTMLDivElement>,
    fileType: "PassportPhoto" | "IdFront" | "IdBack",
  ) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      setFormData((prev) => ({ ...prev, [fileType]: file }));
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrls((prev) => ({
          ...prev,
          [fileType]: reader.result as string,
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const getIdTypeLabel = (idType: string) => {
    const foundType = idTypes.find((type) => type.value === idType);
    return foundType ? foundType.label : "ID";
  };

  const isBackSideRequired = () => {
    const selectedIdType = idTypes.find(
      (type) => type.value === formData.IdType,
    );
    return selectedIdType ? selectedIdType.requiresBack : false;
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
    <div className="dark text-white min-h-full space-y-6">
      <section className="bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl rounded-[28px] p-6 md:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <span className="inline-flex w-fit items-center rounded-full bg-blue-500/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-blue-300">
              User Administration
            </span>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-white">
                Manage Users
              </h1>
              <p className="mt-2 text-blue-200">
                View, filter, and maintain system users.
              </p>
            </div>
          </div>

          <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto">
            <div className="relative flex-1 sm:min-w-[320px]">
              <Search className="absolute left-3 top-4 h-4 w-4 text-blue-200" />
              <Input
                variant="dark"
                placeholder="Search users by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button onClick={openModal}>Add New User</Button>
          </div>
        </div>
      </section>

      <Card className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl">
        <Tabs defaultValue="all" className="p-4 md:p-6">
          <TabsList className="mb-6 h-auto flex-wrap justify-start gap-2 rounded-2xl bg-white/10 p-2">
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
            <TabsTrigger value="utility">
              Utility Users ({getFilteredUsers("Utililty Payment").length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all">
            <UserTable
              users={getFilteredUsers()}
              onViewDetails={(user) => setSelectedUser(user)}
              onEditUser={openEditModal}
              onDeleteSuccess={fetchUsers}
            />
          </TabsContent>

          <TabsContent value="admin">
            <UserTable
              users={getFilteredUsers("Administrator")}
              onViewDetails={(user) => setSelectedUser(user)}
              onEditUser={openEditModal}
              onDeleteSuccess={fetchUsers}
            />
          </TabsContent>

          <TabsContent value="landlord">
            <UserTable
              users={getFilteredUsers("Landlord")}
              onViewDetails={(user) => setSelectedUser(user)}
              onEditUser={openEditModal}
              onDeleteSuccess={fetchUsers}
            />
          </TabsContent>

          <TabsContent value="tenant">
            <UserTable
              users={getFilteredUsers("Tenant")}
              onViewDetails={(user) => setSelectedUser(user)}
              onEditUser={openEditModal}
              onDeleteSuccess={fetchUsers}
            />
          </TabsContent>
          <TabsContent value="utility">
            <UserTable
              users={getFilteredUsers("Utililty Payment")}
              onViewDetails={(user) => setSelectedUser(user)}
              onEditUser={openEditModal}
              onDeleteSuccess={fetchUsers}
            />
          </TabsContent>
        </Tabs>
      </Card>

      <Dialog
        open={!!selectedUser}
        onOpenChange={(open) => !open && setSelectedUser(null)}
      >
        <DialogContent className="dark max-w-2xl bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 border border-white/20 text-white rounded-[28px] p-0 backdrop-blur-xl shadow-2xl">
          <DialogHeader className="p-6 border-b border-white/20">
            <DialogTitle className="text-white text-xl">
              User Details
            </DialogTitle>
            <DialogDescription className="text-blue-200">
              Detailed information about the selected user.
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="p-6">
              <UserDetails
                user={selectedUser}
                properties={properties}
                users={users}
                onClose={() => setSelectedUser(null)}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add User Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title="Add new user"
        size="xl"
        footer={
          <div className="flex justify-end space-x-4">
            <GradientButton
              type="button"
              variant="outline"
              size="sm"
              onClick={closeModal}
            >
              Cancel
            </GradientButton>
            <GradientButton
              onClick={handleSubmit}
              type="submit"
              form="userForm"
              size="sm"
            >
              Add user
            </GradientButton>
          </div>
        }
      >
        <form
          onSubmit={handleSubmit}
          className="space-y-4 h-[60vh] overflow-y-auto px-2"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-blue-100">
                Full Name
              </label>
              <input
                type="text"
                name="FullName"
                value={formData.FullName}
                onChange={handleInputChange}
                className="input-field"
                placeholder="Enter user's full name"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-blue-100">
                Phone Number
              </label>
              <input
                type="tel"
                name="PhoneNumber"
                value={formData.PhoneNumber}
                onChange={handleInputChange}
                className="input-field"
                placeholder="Enter phone number"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-blue-100">Email</label>
              <input
                type="email"
                name="Email"
                value={formData.Email}
                onChange={handleInputChange}
                className="input-field"
                placeholder="Enter email address"
                required
              />
            </div>
            <div className="space-y-2">
              <label
                htmlFor="systemRoleId"
                className="block text-sm font-medium text-blue-100 mb-1"
              >
                System Role
              </label>
              <select
                id="systemRoleId"
                name="systemRoleId"
                value={formData.systemRoleId}
                onChange={handleChange}
                className={`w-full h-12 px-3 py-2 border rounded-xl bg-white/10 text-white focus:outline-none focus:ring-1 ${
                  errors.systemRoleId
                    ? "border-red-500 focus:ring-red-300 "
                    : "border-white/20 focus:ring-blue-400"
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
                <p className="mt-1 text-sm text-red-400">
                  {errors.systemRoleId}
                </p>
              )}
            </div>

            <div className="md:col-span-2 space-y-4">
              <label className="text-sm font-medium text-blue-100">
                Identification Type
              </label>
              <div className="flex flex-wrap gap-4">
                {idTypes.map((type) => (
                  <label
                    key={type.value}
                    className="flex items-center space-x-2 cursor-pointer"
                  >
                    <input
                      type="radio"
                      name="IdType"
                      value={type.value}
                      checked={formData.IdType === type.value}
                      onChange={handleRadioChange}
                      className="radio-input"
                    />
                    <span className="text-white">{type.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-blue-100">
                {getIdTypeLabel(formData.IdType)} Number
              </label>
              <input
                type="text"
                name="IdNumber"
                value={formData.IdNumber}
                onChange={handleInputChange}
                className="input-field w-full"
                placeholder={`Enter ${getIdTypeLabel(
                  formData.IdType,
                ).toLowerCase()} number`}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Passport Photo Upload */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center">
                <Camera size={16} className="mr-1" />
                Passport Photo
              </label>
              <div
                className="border-2 border-dashed border-white/20 bg-white/5 rounded-xl p-4 transition-colors h-40 flex items-center justify-center hover:border-blue-400 text-white"
                onDragOver={(e) => e.preventDefault()}
                onDragLeave={(e) => e.preventDefault()}
                onDrop={(e) => handleDrop(e, "PassportPhoto")}
              >
                {previewUrls.PassportPhoto ? (
                  <div className="relative w-full h-full">
                    <img
                      src={previewUrls.PassportPhoto}
                      alt="Passport Preview"
                      className="w-full h-full object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => removeFile("PassportPhoto")}
                      className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="text-center">
                    <Upload className="mx-auto h-8 w-8 text-blue-200" />
                    <div className="mt-2 text-xs">
                      <label className="cursor-pointer text-blue-300 hover:text-blue-200">
                        Upload photo
                        <input
                          type="file"
                          className="sr-only"
                          accept="image/*"
                          onChange={(e) => handleFileChange(e, "PassportPhoto")}
                        />
                      </label>
                      <p>or drag and drop</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ID Document Front Upload */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center">
                {formData.IdType === "passport" ? (
                  <FileText size={16} className="mr-1" />
                ) : (
                  <CreditCard size={16} className="mr-1" />
                )}
                {formData.IdType === "passport"
                  ? "Passport Data Page"
                  : `${getIdTypeLabel(formData.IdType)} Front`}
              </label>
              <div
                className="border-2 border-dashed border-white/20 bg-white/5 rounded-xl p-4 transition-colors h-40 flex items-center justify-center hover:border-blue-400 text-white"
                onDragOver={(e) => e.preventDefault()}
                onDragLeave={(e) => e.preventDefault()}
                onDrop={(e) => handleDrop(e, "IdFront")}
              >
                {previewUrls.IdFront ? (
                  <div className="relative w-full h-full">
                    <img
                      src={previewUrls.IdFront}
                      alt="ID Front Preview"
                      className="w-full h-full object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => removeFile("IdFront")}
                      className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="text-center">
                    <Upload className="mx-auto h-8 w-8 text-blue-200" />
                    <div className="mt-2 text-xs">
                      <label className="cursor-pointer text-blue-300 hover:text-blue-200">
                        Upload{" "}
                        {formData.IdType === "passport" ? "page" : "front"}
                        <input
                          type="file"
                          className="sr-only"
                          accept="image/*"
                          onChange={(e) => handleFileChange(e, "IdFront")}
                        />
                      </label>
                      <p>or drag and drop</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ID Document Back Upload */}
            {isBackSideRequired() && (
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center">
                  <CreditCard size={16} className="mr-1" />
                  {getIdTypeLabel(formData.IdType)} Back
                </label>
                <div
                  className="border-2 border-dashed border-white/20 bg-white/5 rounded-xl p-4 transition-colors h-40 flex items-center justify-center hover:border-blue-400 text-white"
                  onDragOver={(e) => e.preventDefault()}
                  onDragLeave={(e) => e.preventDefault()}
                  onDrop={(e) => handleDrop(e, "IdBack")}
                >
                  {previewUrls.IdBack ? (
                    <div className="relative w-full h-full">
                      <img
                        src={previewUrls.IdBack}
                        alt="ID Back Preview"
                        className="w-full h-full object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => removeFile("IdBack")}
                        className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <div className="text-center">
                      <Upload className="mx-auto h-8 w-8 text-blue-200" />
                      <div className="mt-2 text-xs">
                        <label className="cursor-pointer text-blue-300 hover:text-blue-200">
                          Upload back
                          <input
                            type="file"
                            className="sr-only"
                            accept="image/*"
                            onChange={(e) => handleFileChange(e, "IdBack")}
                          />
                        </label>
                        <p>or drag and drop</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </form>
      </Modal>

      {/* Edit User Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={closeEditModal}
        title="Edit user"
        size="xl"
        footer={
          <div className="flex justify-end space-x-4">
            <GradientButton
              type="button"
              variant="outline"
              size="sm"
              onClick={closeEditModal}
            >
              Cancel
            </GradientButton>
            <GradientButton type="submit" form="editUserForm" size="sm">
              Update user
            </GradientButton>
          </div>
        }
      >
        <form
          id="editUserForm"
          onSubmit={handleUpdateSubmit}
          className="space-y-6 px-2 h-[60vh] overflow-y-auto"
        >
          <div className="grid grid-cols-1  gap-2">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="font-medium text-white">Basic Information</h3>
              <div>
                <Label htmlFor="edit-fullName">Full Name</Label>
                <Input
                  variant="dark"
                  id="edit-fullName"
                  name="fullName"
                  value={editFormData.fullName}
                  onChange={handleEditChange}
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  variant="dark"
                  id="edit-email"
                  type="email"
                  name="email"
                  value={editFormData.email}
                  onChange={handleEditChange}
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit-phoneNumber">Phone Number</Label>
                <Input
                  variant="dark"
                  id="edit-phoneNumber"
                  name="phoneNumber"
                  value={editFormData.phoneNumber}
                  onChange={handleEditChange}
                />
              </div>
            </div>

            {/* Role and Status */}
            <div className="space-y-4">
              <h3 className="font-medium text-white">Role & Status</h3>
              <div>
                <Label htmlFor="edit-systemRoleId">System Role</Label>
                <Select
                  value={editFormData.systemRoleId}
                  onValueChange={(value) =>
                    setEditFormData({ ...editFormData, systemRoleId: value })
                  }
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((role) => (
                      <SelectItem key={role.id} value={role.id.toString()}>
                        {role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="edit-active"
                    checked={editFormData.active}
                    onCheckedChange={(checked) =>
                      setEditFormData({
                        ...editFormData,
                        active: Boolean(checked),
                      })
                    }
                  />
                  <Label htmlFor="edit-active">Active</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="edit-verified"
                    checked={editFormData.verified}
                    onCheckedChange={(checked) =>
                      setEditFormData({
                        ...editFormData,
                        verified: Boolean(checked),
                      })
                    }
                  />
                  <Label htmlFor="edit-verified">Verified</Label>
                </div>
              </div>

              <div className="md:col-span-2 space-y-4">
                <label className="text-sm font-medium text-blue-100">
                  Identification Type
                </label>
                <div className="flex flex-wrap gap-4">
                  {idTypes.map((type) => (
                    <label
                      key={type.value}
                      className="flex items-center space-x-2 cursor-pointer"
                    >
                      <input
                        type="radio"
                        name="IdType"
                        value={type.value}
                        checked={formData.IdType === type.value}
                        onChange={handleRadioChange}
                        className="radio-input"
                      />
                      <span>{type.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-blue-100">
                  {getIdTypeLabel(formData.IdType)} Number
                </label>
                <Input
                  variant="dark"
                  id="edit-nationalIdNumber"
                  name="nationalIdNumber"
                  value={editFormData.nationalIdNumber}
                  onChange={handleEditChange}
                />
              </div>
            </div>

            {/* Document Uploads */}
            <h3 className="font-medium text-white">Documents</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium flex items-center">
                  <Camera size={16} className="mr-1" />
                  Passport Photo
                </label>
                <div
                  className="border-2 border-dashed border-white/20 bg-white/5 rounded-xl p-4 transition-colors h-40 flex items-center justify-center hover:border-blue-400 text-white"
                  onDragOver={(e) => e.preventDefault()}
                  onDragLeave={(e) => e.preventDefault()}
                  onDrop={(e) => handleDrop(e, "PassportPhoto")}
                >
                  {previewUrls.PassportPhoto ? (
                    <div className="relative w-full h-full">
                      <img
                        src={previewUrls.PassportPhoto}
                        alt="Passport Preview"
                        className="w-full h-full object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => removeFile("PassportPhoto")}
                        className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <div className="text-center">
                      <Upload className="mx-auto h-8 w-8 text-blue-200" />
                      <div className="mt-2 text-xs">
                        <label className="cursor-pointer text-blue-300 hover:text-blue-200">
                          Upload photo
                          <input
                            type="file"
                            className="sr-only"
                            accept="image/*"
                            onChange={(e) =>
                              handleEditFileChange(e, "PassportPhoto")
                            }
                          />
                        </label>
                        <p>or drag and drop</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center">
                  {formData.IdType === "passport" ? (
                    <FileText size={16} className="mr-1" />
                  ) : (
                    <CreditCard size={16} className="mr-1" />
                  )}
                  {formData.IdType === "passport"
                    ? "Passport Data Page"
                    : `${getIdTypeLabel(formData.IdType)} Front`}
                </label>
                <div
                  className="border-2 border-dashed border-white/20 bg-white/5 rounded-xl p-4 transition-colors h-40 flex items-center justify-center hover:border-blue-400 text-white"
                  onDragOver={(e) => e.preventDefault()}
                  onDragLeave={(e) => e.preventDefault()}
                  onDrop={(e) => handleDrop(e, "IdFront")}
                >
                  {previewUrls.IdFront ? (
                    <div className="relative w-full h-full">
                      <img
                        src={previewUrls.IdFront}
                        alt="ID Front Preview"
                        className="w-full h-full object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => removeFile("IdFront")}
                        className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <div className="text-center">
                      <Upload className="mx-auto h-8 w-8 text-blue-200" />
                      <div className="mt-2 text-xs">
                        <label className="cursor-pointer text-blue-300 hover:text-blue-200">
                          Upload{" "}
                          {formData.IdType === "passport" ? "page" : "front"}
                          <input
                            type="file"
                            className="sr-only"
                            accept="image/*"
                            onChange={(e) => handleEditFileChange(e, "IdFront")}
                          />
                        </label>
                        <p>or drag and drop</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center">
                  <CreditCard size={16} className="mr-1" />
                  {getIdTypeLabel(formData.IdType)} Back
                </label>
                <div
                  className="border-2 border-dashed border-white/20 bg-white/5 rounded-xl p-4 transition-colors h-40 flex items-center justify-center hover:border-blue-400 text-white"
                  onDragOver={(e) => e.preventDefault()}
                  onDragLeave={(e) => e.preventDefault()}
                  onDrop={(e) => handleDrop(e, "IdBack")}
                >
                  {previewUrls.IdBack ? (
                    <div className="relative w-full h-full">
                      <img
                        src={previewUrls.IdBack}
                        alt="ID Back Preview"
                        className="w-full h-full object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => removeFile("IdBack")}
                        className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <div className="text-center">
                      <Upload className="mx-auto h-8 w-8 text-blue-200" />
                      <div className="mt-2 text-xs">
                        <label className="cursor-pointer text-blue-300 hover:text-blue-200">
                          Upload back
                          <input
                            type="file"
                            className="sr-only"
                            accept="image/*"
                            onChange={(e) => handleEditFileChange(e, "IdBack")}
                          />
                        </label>
                        <p>or drag and drop</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
};

const UserTable = ({
  users,
  onViewDetails,
  onEditUser,
  onDeleteSuccess,
}: UserTableProps) => {
  const formatCurrency = useCurrencyFormatter();

  const user = localStorage.getItem("user") || null;
  const token = user ? JSON.parse(user).token : null;
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletedUser, setDeletedUser] = useState<User | null>(null);

  const deleteUser = async (userId: string) => {
    if (!token) {
      toast({
        title: "Error",
        description: "Authentication required",
        variant: "destructive",
      });
      return;
    }

    try {
      const { status } = await axios.delete(
        `${import.meta.env.VITE_API_BASE_URL}/DeleteUser/${userId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      if (status >= 200 && status < 300) {
        toast({
          title: "Success",
          description: "User deleted successfully!",
        });
        onDeleteSuccess && onDeleteSuccess();
        setIsDeleteModalOpen(false);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error.response.data,
        variant: "destructive",
      });
    }
  };

  return (
    <div>
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
              <TableCell colSpan={5} className="text-center py-8 text-blue-200">
                No users found
              </TableCell>
            </TableRow>
          ) : (
            users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">
                  <div className="space-y-1">
                    <p className="font-semibold text-white">{user.name}</p>
                    <p className="text-xs text-blue-200">ID: {user.id}</p>
                  </div>
                </TableCell>
                <TableCell className="text-blue-100">{user.email}</TableCell>
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
                    <span className="flex items-center gap-1 text-green-400">
                      <CheckCircle className="h-4 w-4" /> Active
                    </span>
                  ) : user.status === "inactive" ? (
                    <span className="flex items-center gap-1 text-yellow-400">
                      <XCircle className="h-4 w-4" /> Inactive
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-blue-100">
                      <Clock className="h-4 w-4" /> Pending Verification
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="bg-transparent border-blue-400/30 text-blue-400 hover:bg-blue-500/10 hover:text-blue-300"
                      onClick={() => onViewDetails(user)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="bg-transparent border-green-400/30 text-green-400 hover:bg-green-500/10 hover:text-green-300"
                      onClick={() => onEditUser(user)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="bg-transparent border-red-400/30 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                      onClick={() => {
                        setDeletedUser(user);
                        setIsDeleteModalOpen(true);
                      }}
                      // onClick={() => deleteUser(user.id)}
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      <ConfirmDeleteModal
        title="Delete User"
        isOpen={isDeleteModalOpen}
        tenantName={deletedUser?.name || ""}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={() => {
          deleteUser(deletedUser?.id);
        }}
      />
    </div>
  );
};

export default ManageUsers;
