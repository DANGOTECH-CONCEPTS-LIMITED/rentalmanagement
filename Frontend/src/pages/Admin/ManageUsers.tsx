import { useEffect, useState } from "react";
import { getImageUrl } from "@/lib/imageUrl";
import { DataTable, Column } from "@/components/ui/data-table";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle,
  XCircle,
  Edit,
  Trash,
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
  UserPlus,
  ShieldCheck,
} from "lucide-react";
import axios from "axios";

import { useCurrencyFormatter } from "@/hooks/use-currency-formatter";
import Modal from "@/components/common/Model";
import { toast } from "@/components/ui/use-toast";
import { LandlordFormData } from "./RegisterLandlord";
import ConfirmDeleteModal from "@/components/common/DeleteModal";
import { useNavigate } from "react-router-dom";

// ── Design tokens ─────────────────────────────────────────────────────────────
const inputCls =
  "h-11 w-full rounded-xl border border-[#E2E8F0] bg-white px-3.5 text-sm text-[#0F172A] placeholder:text-[#94A3B8] shadow-sm outline-none transition-all focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/10";
const selCls =
  "h-11 w-full rounded-xl border border-[#E2E8F0] bg-white px-3.5 text-sm text-[#0F172A] shadow-sm outline-none transition-all focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/10 cursor-pointer";

// ── Types ─────────────────────────────────────────────────────────────────────
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
  loading?: boolean;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
}

// ── Role badge helper ──────────────────────────────────────────────────────────
const roleBadge = (role: string) => {
  const map: Record<string, string> = {
    Administrator: "bg-red-50 text-red-700 border-red-100",
    Landlord: "bg-blue-50 text-blue-700 border-blue-100",
    Tenant: "bg-slate-100 text-slate-600 border-slate-200",
    "Utililty Payment": "bg-violet-50 text-violet-700 border-violet-100",
  };
  const cls = map[role] ?? "bg-slate-100 text-slate-600 border-slate-200";
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${cls}`}>
      {role}
    </span>
  );
};

// ── UserDetails sub-component ──────────────────────────────────────────────────
const UserDetails = ({ user, properties, users, onClose }: UserDetailsProps) => {
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
    user.role === "Landlord" ? properties.filter((p) => p.landlord === user.id) : [];

  const tenants =
    user.role === "Landlord"
      ? users.filter((u) => u.role === "Tenant" && u.landlordId === user.id)
      : [];

  return (
    <div className="space-y-6">
      {/* Avatar + basic */}
      <div className="flex items-center gap-4">
        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl border-2 border-slate-100 bg-slate-100">
          <img
            src={getImageUrl(user.passportPhoto)}
            alt={user.name}
            className="h-full w-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src =
                "https://media.istockphoto.com/id/1495088043/vector/user-profile-icon-avatar-or-person-icon-profile-picture-portrait-symbol-default-portrait.jpg?s=612x612&w=0&k=20&c=dhV2p1JwmloBTOaGAtaA3AW1KSnjsdMt7-U_3EZElZ0=";
              (e.target as HTMLImageElement).onerror = null;
            }}
          />
        </div>
        <div>
          <h3 className="text-lg font-bold text-[#0F172A]">{user.name}</h3>
          <p className="text-sm text-slate-500">{user.email}</p>
          <div className="mt-1">{roleBadge(user.role)}</div>
        </div>
      </div>

      {/* Status row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-[#E2E8F0] bg-slate-50 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Status</p>
          {user.status === "active" ? (
            <span className="flex items-center gap-1 text-emerald-600 text-sm font-semibold">
              <CheckCircle className="h-3.5 w-3.5" /> Active
            </span>
          ) : (
            <span className="flex items-center gap-1 text-red-500 text-sm font-semibold">
              <XCircle className="h-3.5 w-3.5" /> Inactive
            </span>
          )}
        </div>
        <div className="col-span-2 rounded-xl border border-[#E2E8F0] bg-slate-50 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">User ID</p>
          <p className="text-sm font-mono text-[#0F172A] truncate">{user.id}</p>
        </div>
      </div>

      {/* Tenant property */}
      {user.role === "Tenant" && assignedProperty && (
        <div>
          <h4 className="flex items-center gap-1.5 mb-2 text-sm font-semibold text-[#0F172A]">
            <Home className="h-4 w-4 text-[#1D4ED8]" /> Property Details
          </h4>
          <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4 grid grid-cols-2 gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Property Name</p>
              <p className="text-sm text-[#0F172A]">{assignedProperty.name}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Type</p>
              <p className="text-sm text-[#0F172A]">{assignedProperty.type}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Address</p>
              <p className="text-sm text-[#0F172A]">{assignedProperty.address}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Rent Amount</p>
              <p className="text-sm font-semibold text-[#0F172A]">
                {formatCurrency(user.rentAmount || assignedProperty.rentAmount)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tenant landlord */}
      {user.role === "Tenant" && assignedLandlord && (
        <div>
          <h4 className="flex items-center gap-1.5 mb-2 text-sm font-semibold text-[#0F172A]">
            <User className="h-4 w-4 text-[#1D4ED8]" /> Landlord Details
          </h4>
          <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4 grid grid-cols-2 gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Name</p>
              <p className="text-sm text-[#0F172A]">{assignedLandlord.name}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Email</p>
              <p className="text-sm text-[#0F172A]">{assignedLandlord.email}</p>
            </div>
          </div>
        </div>
      )}

      {/* Landlord properties */}
      {user.role === "Landlord" && ownedProperties.length > 0 && (
        <div>
          <h4 className="flex items-center gap-1.5 mb-2 text-sm font-semibold text-[#0F172A]">
            <Home className="h-4 w-4 text-[#1D4ED8]" /> Owned Properties ({ownedProperties.length})
          </h4>
          <DataTable
            data={ownedProperties}
            columns={[
              { key: "name", header: "Name", cell: (p) => <span className="font-medium">{p.name}</span> },
              { key: "type", header: "Type", cell: (p) => p.type },
              { key: "address", header: "Address", cell: (p) => p.address },
              {
                key: "status",
                header: "Status",
                cell: (p) => (
                  <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-slate-100 text-slate-600 border-slate-200">
                    {p.status}
                  </span>
                ),
              },
              { key: "rent", header: "Rent Amount", cell: (p) => formatCurrency(p.rentAmount) },
            ]}
            pageSize={5}
            label="property"
          />
        </div>
      )}

      {/* Landlord tenants */}
      {user.role === "Landlord" && tenants.length > 0 && (
        <div>
          <h4 className="flex items-center gap-1.5 mb-2 text-sm font-semibold text-[#0F172A]">
            <Users className="h-4 w-4 text-[#1D4ED8]" /> Tenants ({tenants.length})
          </h4>
          <DataTable
            data={tenants}
            columns={[
              { key: "name", header: "Name", cell: (t) => <span className="font-medium">{t.name}</span> },
              { key: "email", header: "Email", cell: (t) => t.email },
              {
                key: "property",
                header: "Property",
                cell: (t) => {
                  const prop = t.propertyId ? properties.find((p) => p.id === t.propertyId) : null;
                  return prop ? prop.name : "N/A";
                },
              },
              {
                key: "rent",
                header: "Monthly Rent",
                cell: (t) => {
                  const prop = t.propertyId ? properties.find((p) => p.id === t.propertyId) : null;
                  return t.rentAmount ? formatCurrency(t.rentAmount) : prop ? formatCurrency(prop.rentAmount) : "N/A";
                },
              },
              {
                key: "status",
                header: "Status",
                cell: (t) =>
                  t.status === "active" ? (
                    <span className="flex items-center gap-1 text-emerald-600 text-sm">
                      <CheckCircle className="h-3 w-3" /> Active
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-red-500 text-sm">
                      <XCircle className="h-3 w-3" /> Inactive
                    </span>
                  ),
              },
            ]}
            pageSize={5}
            label="tenant"
          />
        </div>
      )}

      {/* Footer actions */}
      <div className="flex justify-end gap-2 pt-2">
        {["Landlord", "Utililty Payment"].includes(user.role) && (
          <button
            onClick={() => navigate(`/admin-dashboard/utility-payments/${user.id}`)}
            className="inline-flex items-center gap-2 rounded-xl bg-[#1D4ED8] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1e40af] transition-colors"
          >
            View Utility Payments
          </button>
        )}
        <button
          onClick={onClose}
          className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
};

// ── ManageUsers ────────────────────────────────────────────────────────────────
const ManageUsers = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [roles, setRoles] = useState<SystemRole[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [activeTab, setActiveTab] = useState("all");

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

  const [errors, setErrors] = useState({ fullName: "", email: "", systemRoleId: "" });
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
      const { data } = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/GetAllRoles`);
      setRoles(data);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load roles",
        variant: "destructive",
      });
    }
  };

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const { data } = await axios.get<ApiUser[]>(`${import.meta.env.VITE_API_BASE_URL}/GetAllUsers`);
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
        description: error instanceof Error ? error.message : "Failed to load users",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
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
    setPreviewUrls({ PassportPhoto: null, IdFront: null, IdBack: null });
    setErrors({ fullName: "", email: "", systemRoleId: "" });
  };

  const openEditModal = (user: User) => {
    axios
      .get<ApiUser>(`${import.meta.env.VITE_API_BASE_URL}/GetUserById/${user.id}`)
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
        toast({ title: "Error", description: error.response.data, variant: "destructive" });
      });
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setEditErrors({ fullName: "", email: "", systemRoleId: "", phoneNumber: "" });
    setPreviewUrls({ PassportPhoto: null, IdFront: null, IdBack: null });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (errors[name as keyof typeof errors]) {
      setErrors({ ...errors, [name]: "" });
    }
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const newValue = type === "checkbox" ? (e.target as HTMLInputElement).checked : value;
    setEditFormData({ ...editFormData, [name]: newValue });
    if (editErrors[name as keyof typeof editErrors]) {
      setEditErrors({ ...editErrors, [name]: "" });
    }
  };

  const validateForm = () => {
    let isValid = true;
    const newErrors = { fullName: "", email: "", systemRoleId: "" };
    if (!formData.FullName.trim()) { newErrors.fullName = "Full name is required"; isValid = false; }
    if (!formData.Email.trim()) { newErrors.email = "Email is required"; isValid = false; }
    else if (!/\S+@\S+\.\S+/.test(formData.Email)) { newErrors.email = "Email address is invalid"; isValid = false; }
    if (!formData.systemRoleId) { newErrors.systemRoleId = "Role selection is required"; isValid = false; }
    setErrors(newErrors);
    return isValid;
  };

  const validateEditForm = () => {
    let isValid = true;
    const newErrors = { fullName: "", email: "", systemRoleId: "", phoneNumber: "" };
    if (!editFormData.fullName.trim()) { newErrors.fullName = "Full name is required"; isValid = false; }
    if (!editFormData.email.trim()) { newErrors.email = "Email is required"; isValid = false; }
    else if (!/\S+@\S+\.\S+/.test(editFormData.email)) { newErrors.email = "Email address is invalid"; isValid = false; }
    if (!editFormData.systemRoleId) { newErrors.systemRoleId = "Role selection is required"; isValid = false; }
    if (editFormData.phoneNumber && !/^\+?\d{10,15}$/.test(editFormData.phoneNumber)) {
      newErrors.phoneNumber = "Please enter a valid phone number"; isValid = false;
    }
    setEditErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.PassportPhoto || !formData.IdFront || (isBackSideRequired() && !formData.IdBack)) {
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
      formDataToSend.append("SystemRoleId", formData.systemRoleId as string);
      const files = [];
      if (formData.PassportPhoto) files.push({ file: formData.PassportPhoto, type: "PassportPhoto" });
      if (formData.IdFront) files.push({ file: formData.IdFront, type: `${formData.IdType}Front` });
      if (formData.IdBack) files.push({ file: formData.IdBack, type: `${formData.IdType}Back` });
      files.forEach((fileObj) => formDataToSend.append("files", fileObj.file));

      const apiUrl = import.meta.env.VITE_API_BASE_URL;
      if (!apiUrl) throw new Error("API base URL is not configured");

      const response = await fetch(`${apiUrl}/RegisterUser`, {
        method: "POST",
        headers: { accept: "*/*" },
        body: formDataToSend,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to register user");
      }

      fetchUsers();
      toast({ title: "User Registered", description: `${formData.FullName} has been successfully registered.` });
      setFormData({ FullName: "", PhoneNumber: "", Email: "", Password: "defaultPassword", IdType: "nationalId", IdNumber: "", systemRoleId: "" });
      setPreviewUrls({ PassportPhoto: null, IdFront: null, IdBack: null });
    } catch (error) {
      if (error instanceof Error && error.message.includes("User regis")) {
        toast({ title: "User Registered", description: `${formData.FullName} has been successfully registered.` });
        setFormData({ FullName: "", PhoneNumber: "", Email: "", Password: "defaultPassword", IdType: "nationalId", IdNumber: "", systemRoleId: "" });
        setPreviewUrls({ PassportPhoto: null, IdFront: null, IdBack: null });
      } else {
        console.error("Error submitting form:", error);
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "An error occurred while registering the user.",
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
      const userStored = localStorage.getItem("user") || null;
      const token = userStored ? JSON.parse(userStored).token : null;
      if (!token) {
        toast({ title: "Authentication required", description: "Please log in to perform this action.", variant: "destructive" });
        return;
      }
      try {
        setIsUpdating(true);
        const formDataPayload = new FormData();
        formDataPayload.append("Id", editFormData.id);
        formDataPayload.append("FullName", editFormData.fullName);
        formDataPayload.append("Email", editFormData.email);
        formDataPayload.append("SystemRoleId", editFormData.systemRoleId);
        formDataPayload.append("PhoneNumber", editFormData.phoneNumber || "");
        formDataPayload.append("Active", editFormData.active.toString());
        formDataPayload.append("Verified", editFormData.verified.toString());
        formDataPayload.append("NationalIdNumber", editFormData.nationalIdNumber || "");

        console.log("editFormData", editFormData);
        console.log("previewUrls", previewUrls);

        const files = [];
        if (editFormData.PassportPhoto) files.push({ file: editFormData.PassportPhoto, type: "PassportPhoto" });
        if (editFormData.IdFront) files.push({ file: editFormData.IdFront, type: "IdFront" });
        if (editFormData.IdBack) files.push({ file: editFormData.IdBack, type: "IdBack" });
        files.forEach((fileObj) => formDataPayload.append("files", fileObj.file));

        const { status } = await axios.put(
          `${import.meta.env.VITE_API_BASE_URL}/UpdateUser`,
          formDataPayload,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "multipart/form-data",
            },
          }
        );

        if (status >= 200 && status < 300) {
          closeEditModal();
          toast({ title: "Success", description: "User updated successfully!" });
          fetchUsers();
        }
      } catch (error: unknown) {
        const axiosErr = error as { response?: { data?: string } };
        toast({
          title: "Error",
          description: axiosErr?.response?.data || "Failed to update user",
          variant: "destructive",
        });
      } finally {
        setIsUpdating(false);
      }
    }
  };

  const handleEditFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    fileType: "PassportPhoto" | "IdFront" | "IdBack"
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      setEditFormData((prev) => ({ ...prev, [fileType]: file }));
      const reader = new FileReader();
      reader.onloadend = () => setPreviewUrls((prev) => ({ ...prev, [fileType]: reader.result as string }));
      reader.readAsDataURL(file);
    }
  };

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    fileType: "PassportPhoto" | "IdFront" | "IdBack"
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData((prev) => ({ ...prev, [fileType]: file }));
      const reader = new FileReader();
      reader.onloadend = () => setPreviewUrls((prev) => ({ ...prev, [fileType]: reader.result as string }));
      reader.readAsDataURL(file);
    }
  };

  const handleDrop = (
    e: React.DragEvent<HTMLDivElement>,
    fileType: "PassportPhoto" | "IdFront" | "IdBack"
  ) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      setFormData((prev) => ({ ...prev, [fileType]: file }));
      const reader = new FileReader();
      reader.onloadend = () => setPreviewUrls((prev) => ({ ...prev, [fileType]: reader.result as string }));
      reader.readAsDataURL(file);
    }
  };

  const getIdTypeLabel = (idType: string) => {
    const foundType = idTypes.find((type) => type.value === idType);
    return foundType ? foundType.label : "ID";
  };

  const isBackSideRequired = () => {
    const selectedIdType = idTypes.find((type) => type.value === formData.IdType);
    return selectedIdType ? selectedIdType.requiresBack : false;
  };

  const [properties] = useState<Property[]>([
    { id: "prop1", name: "Sunset Apartments - Unit 101", address: "123 Main St, Cityville", type: "Apartment", bedrooms: 2, bathrooms: 1, area: 850, rentAmount: 1200, images: [], amenities: ["Air Conditioning", "Dishwasher", "Parking"], status: "occupied", landlord: "1" },
    { id: "prop2", name: "Bayview Condos - Unit 305", address: "456 Ocean Ave, Seaside", type: "Condo", bedrooms: 3, bathrooms: 2, area: 1200, rentAmount: 1350, images: [], amenities: ["Pool", "Gym", "Security"], status: "occupied", landlord: "1" },
    { id: "prop3", name: "Parkview Residences - Unit 405", address: "789 Park Blvd, Greenville", type: "Apartment", bedrooms: 1, bathrooms: 1, area: 700, rentAmount: 1500, images: [], amenities: ["Balcony", "Washer/Dryer", "Pet Friendly"], status: "occupied", landlord: "4" },
    { id: "prop4", name: "Westside Heights - Unit 210", address: "321 West St, Downtown", type: "Studio", bedrooms: 0, bathrooms: 1, area: 500, rentAmount: 950, images: [], amenities: ["Furnished", "Utilities Included"], status: "available", landlord: "4" },
  ]);

  const getFilteredUsers = (role: string | null = null) => {
    return users.filter((user) => {
      if (role) return user.role === role;
      return true;
    });
  };

  const tabs = [
    { id: "all", label: "All Users", icon: Users, count: getFilteredUsers().length },
    { id: "admin", label: "Admins", icon: ShieldCheck, count: getFilteredUsers("Administrator").length },
    { id: "landlord", label: "Landlords", icon: Home, count: getFilteredUsers("Landlord").length },
    { id: "tenant", label: "Tenants", icon: User, count: getFilteredUsers("Tenant").length },
    { id: "utility", label: "Utility Users", icon: CreditCard, count: getFilteredUsers("Utililty Payment").length },
  ];

  const getTabUsers = () => {
    switch (activeTab) {
      case "admin": return getFilteredUsers("Administrator");
      case "landlord": return getFilteredUsers("Landlord");
      case "tenant": return getFilteredUsers("Tenant");
      case "utility": return getFilteredUsers("Utililty Payment");
      default: return getFilteredUsers();
    }
  };

  // ── File upload drop zone helper ──
  const DropZone = ({
    label,
    icon: Icon,
    previewKey,
    fileType,
    isDrag = false,
  }: {
    label: string;
    icon: React.ElementType;
    previewKey: "PassportPhoto" | "IdFront" | "IdBack";
    fileType: "PassportPhoto" | "IdFront" | "IdBack";
    isDrag?: boolean;
  }) => (
    <div className="space-y-2">
      <label className="flex items-center gap-1 text-sm font-medium text-[#0F172A]">
        <Icon size={15} className="text-slate-400" /> {label}
      </label>
      <div
        className="border-2 border-dashed border-[#E2E8F0] rounded-xl h-40 flex items-center justify-center hover:border-[#1D4ED8] transition-colors bg-slate-50"
        onDragOver={isDrag ? (e) => e.preventDefault() : undefined}
        onDragLeave={isDrag ? (e) => e.preventDefault() : undefined}
        onDrop={isDrag ? (e) => handleDrop(e, fileType) : undefined}
      >
        {previewUrls[previewKey] ? (
          <div className="relative w-full h-full">
            <img src={previewUrls[previewKey]!} alt={label} className="w-full h-full object-cover rounded-xl" />
            <button
              type="button"
              onClick={() => removeFile(fileType)}
              className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <div className="text-center">
            <Upload className="mx-auto h-8 w-8 text-slate-300 mb-2" />
            <label className="cursor-pointer text-xs text-[#1D4ED8] hover:text-[#1e40af] font-semibold">
              Upload file
              <input type="file" className="sr-only" accept="image/*" onChange={(e) => handleFileChange(e, fileType)} />
            </label>
            {isDrag && <p className="text-xs text-slate-400 mt-0.5">or drag and drop</p>}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* ── Hero Banner ── */}
      <section className="relative overflow-hidden rounded-2xl px-8 py-8 text-white shadow-xl" style={{ background: "linear-gradient(135deg, #0a0f1e 0%, #0f2044 45%, #1a3a6e 100%)" }}>
        <div className="absolute inset-0 pointer-events-none opacity-[0.04]"
          style={{ backgroundImage: "linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)", backgroundSize: "40px 40px" }} />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <span className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-blue-200">
              Admin
            </span>
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Manage Users</h1>
            <p className="text-sm text-blue-200/80">View, filter, and maintain system users across all roles.</p>
            {/* Inline stats */}
            <div className="flex flex-wrap gap-3 pt-1">
              {[
                { label: "Total", value: users.length },
                { label: "Active", value: users.filter((u) => u.status === "active").length, color: "text-emerald-300" },
                { label: "Inactive", value: users.filter((u) => u.status === "inactive").length, color: "text-amber-300" },
              ].map((s) => (
                <div key={s.label} className="flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/10 px-3 py-1.5">
                  <span className={`text-sm font-bold ${s.color ?? "text-white"}`}>{s.value}</span>
                  <span className="text-xs text-blue-200">{s.label}</span>
                </div>
              ))}
            </div>
          </div>
          <button
            onClick={openModal}
            className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white px-5 py-2.5 text-sm font-bold text-[#1D4ED8] shadow-sm transition-colors hover:bg-blue-50 shrink-0"
          >
            <UserPlus className="h-4 w-4" />
            Add New User
          </button>
        </div>
      </section>

      {/* ── Tabs + Table ── */}
      <div className="rounded-2xl border border-[#E2E8F0] bg-white shadow-sm p-4 md:p-6 space-y-5">
        {/* Custom Tabs */}
        <div className="flex flex-wrap gap-1 rounded-xl border border-[#E2E8F0] bg-slate-50 p-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex flex-1 min-w-fit items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                activeTab === t.id
                  ? "bg-white shadow-sm text-[#1D4ED8]"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <t.icon className="h-4 w-4" />
              {t.label}
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${activeTab === t.id ? "bg-blue-50 text-[#1D4ED8]" : "bg-slate-200 text-slate-500"}`}>
                {t.count}
              </span>
            </button>
          ))}
        </div>

        {/* Table */}
        <UserTable
          users={getTabUsers()}
          onViewDetails={(user) => setSelectedUser(user)}
          onEditUser={openEditModal}
          onDeleteSuccess={fetchUsers}
          loading={isLoading}
        />
      </div>

      {/* ── View User Modal ── */}
      <AnimatePresence>
        {selectedUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="flex w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl max-h-[92vh]"
            >
              <div className="shrink-0 bg-gradient-to-r from-[#0F172A] to-[#1D4ED8] px-6 py-5 text-white flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold">User Details</h2>
                  <p className="text-sm text-blue-200/80">Detailed information about the selected user.</p>
                </div>
                <button
                  onClick={() => setSelectedUser(null)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-6 py-5">
                <UserDetails
                  user={selectedUser}
                  properties={properties}
                  users={users}
                  onClose={() => setSelectedUser(null)}
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Add User Modal (using existing Modal component) ── */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title="Add New User"
        size="xl"
        footer={
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={closeModal}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              type="submit"
              form="userForm"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-xl bg-[#1D4ED8] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1e40af] transition-colors disabled:opacity-50"
            >
              {isSubmitting ? "Submitting…" : "Add User"}
            </button>
          </div>
        }
      >
        <form onSubmit={handleSubmit} id="userForm" className="space-y-5 h-[60vh] overflow-y-auto px-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#64748B] mb-2">Full Name</label>
              <input type="text" name="FullName" value={formData.FullName} onChange={handleInputChange} className={inputCls} placeholder="Enter user's full name" required />
              {errors.fullName && <p className="mt-1 text-xs text-red-500">{errors.fullName}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#64748B] mb-2">Phone Number</label>
              <input type="tel" name="PhoneNumber" value={formData.PhoneNumber} onChange={handleInputChange} className={inputCls} placeholder="Enter phone number" required />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#64748B] mb-2">Email</label>
              <input type="email" name="Email" value={formData.Email} onChange={handleInputChange} className={inputCls} placeholder="Enter email address" required />
              {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#64748B] mb-2">System Role</label>
              <select
                name="systemRoleId"
                value={formData.systemRoleId as string}
                onChange={handleChange}
                className={`${selCls} ${errors.systemRoleId ? "border-red-400" : ""}`}
              >
                <option value="">Select a role</option>
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>{role.name}</option>
                ))}
              </select>
              {errors.systemRoleId && <p className="mt-1 text-xs text-red-500">{errors.systemRoleId}</p>}
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#64748B] mb-2">Identification Type</label>
              <div className="flex flex-wrap gap-4">
                {idTypes.map((type) => (
                  <label key={type.value} className="flex items-center gap-2 cursor-pointer text-sm">
                    <input
                      type="radio"
                      name="IdType"
                      value={type.value}
                      checked={formData.IdType === type.value}
                      onChange={handleRadioChange}
                      className="h-4 w-4 text-[#1D4ED8]"
                    />
                    {type.label}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#64748B] mb-2">
                {getIdTypeLabel(formData.IdType)} Number
              </label>
              <input type="text" name="IdNumber" value={formData.IdNumber} onChange={handleInputChange} className={inputCls} placeholder={`Enter ${getIdTypeLabel(formData.IdType).toLowerCase()} number`} required />
            </div>
          </div>

          {/* Document uploads */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <DropZone label="Passport Photo" icon={Camera} previewKey="PassportPhoto" fileType="PassportPhoto" isDrag />
            <DropZone
              label={formData.IdType === "passport" ? "Passport Data Page" : `${getIdTypeLabel(formData.IdType)} Front`}
              icon={formData.IdType === "passport" ? FileText : CreditCard}
              previewKey="IdFront"
              fileType="IdFront"
              isDrag
            />
            {isBackSideRequired() && (
              <DropZone label={`${getIdTypeLabel(formData.IdType)} Back`} icon={CreditCard} previewKey="IdBack" fileType="IdBack" isDrag />
            )}
          </div>
        </form>
      </Modal>

      {/* ── Edit User Modal (using existing Modal component) ── */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={closeEditModal}
        title="Edit User"
        size="xl"
        footer={
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={closeEditModal}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="editUserForm"
              disabled={isUpdating}
              className="inline-flex items-center gap-2 rounded-xl bg-[#1D4ED8] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1e40af] transition-colors disabled:opacity-50"
            >
              {isUpdating ? "Saving…" : "Update User"}
            </button>
          </div>
        }
      >
        <form
          id="editUserForm"
          onSubmit={handleUpdateSubmit}
          className="space-y-6 px-2 h-[60vh] overflow-y-auto"
        >
          {/* Basic Information */}
          <div>
            <h3 className="text-sm font-bold text-[#0F172A] mb-3">Basic Information</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#64748B] mb-2">Full Name</label>
                <input
                  id="edit-fullName"
                  name="fullName"
                  value={editFormData.fullName}
                  onChange={handleEditChange}
                  className={`${inputCls} ${editErrors.fullName ? "border-red-400" : ""}`}
                  required
                />
                {editErrors.fullName && <p className="mt-1 text-xs text-red-500">{editErrors.fullName}</p>}
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#64748B] mb-2">Email</label>
                <input
                  id="edit-email"
                  type="email"
                  name="email"
                  value={editFormData.email}
                  onChange={handleEditChange}
                  className={`${inputCls} ${editErrors.email ? "border-red-400" : ""}`}
                  required
                />
                {editErrors.email && <p className="mt-1 text-xs text-red-500">{editErrors.email}</p>}
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#64748B] mb-2">Phone Number</label>
                <input
                  id="edit-phoneNumber"
                  name="phoneNumber"
                  value={editFormData.phoneNumber}
                  onChange={handleEditChange}
                  className={`${inputCls} ${editErrors.phoneNumber ? "border-red-400" : ""}`}
                />
                {editErrors.phoneNumber && <p className="mt-1 text-xs text-red-500">{editErrors.phoneNumber}</p>}
              </div>
            </div>
          </div>

          {/* Role & Status */}
          <div>
            <h3 className="text-sm font-bold text-[#0F172A] mb-3">Role & Status</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#64748B] mb-2">System Role</label>
                <select
                  value={editFormData.systemRoleId}
                  onChange={(e) => setEditFormData({ ...editFormData, systemRoleId: e.target.value })}
                  className={`${selCls} ${editErrors.systemRoleId ? "border-red-400" : ""}`}
                  required
                >
                  <option value="">Select a role</option>
                  {roles.map((role) => (
                    <option key={role.id} value={role.id.toString()}>{role.name}</option>
                  ))}
                </select>
                {editErrors.systemRoleId && <p className="mt-1 text-xs text-red-500">{editErrors.systemRoleId}</p>}
              </div>

              {/* Active / Verified toggles */}
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    id="edit-active"
                    checked={editFormData.active}
                    onChange={(e) => setEditFormData({ ...editFormData, active: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-300 text-[#1D4ED8]"
                  />
                  <span className="text-sm font-medium text-[#0F172A]">Active</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    id="edit-verified"
                    checked={editFormData.verified}
                    onChange={(e) => setEditFormData({ ...editFormData, verified: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-300 text-[#1D4ED8]"
                  />
                  <span className="text-sm font-medium text-[#0F172A]">Verified</span>
                </label>
              </div>

              {/* ID type radio */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#64748B] mb-2">Identification Type</label>
                <div className="flex flex-wrap gap-4">
                  {idTypes.map((type) => (
                    <label key={type.value} className="flex items-center gap-2 cursor-pointer text-sm">
                      <input
                        type="radio"
                        name="IdType"
                        value={type.value}
                        checked={formData.IdType === type.value}
                        onChange={handleRadioChange}
                        className="h-4 w-4 text-[#1D4ED8]"
                      />
                      {type.label}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#64748B] mb-2">
                  {getIdTypeLabel(formData.IdType)} Number
                </label>
                <input
                  id="edit-nationalIdNumber"
                  name="nationalIdNumber"
                  value={editFormData.nationalIdNumber}
                  onChange={handleEditChange}
                  className={inputCls}
                />
              </div>
            </div>
          </div>

          {/* Documents */}
          <div>
            <h3 className="text-sm font-bold text-[#0F172A] mb-3">Documents</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Passport Photo */}
              <div className="space-y-2">
                <label className="flex items-center gap-1 text-sm font-medium text-[#0F172A]">
                  <Camera size={15} className="text-slate-400" /> Passport Photo
                </label>
                <div
                  className="border-2 border-dashed border-[#E2E8F0] rounded-xl h-40 flex items-center justify-center hover:border-[#1D4ED8] transition-colors bg-slate-50"
                  onDragOver={(e) => e.preventDefault()}
                  onDragLeave={(e) => e.preventDefault()}
                  onDrop={(e) => handleDrop(e, "PassportPhoto")}
                >
                  {(previewUrls.PassportPhoto || editFormData.currentPassportPhoto) ? (
                    <div className="relative w-full h-full">
                      <img
                        src={previewUrls.PassportPhoto || getImageUrl(editFormData.currentPassportPhoto)}
                        alt="Passport Preview"
                        className="w-full h-full object-cover rounded-xl"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).src = "https://media.istockphoto.com/id/1495088043/vector/user-profile-icon-avatar-or-person-icon-profile-picture-portrait-symbol-default-portrait.jpg?s=612x612&w=0&k=20&c=dhV2p1JwmloBTOaGAtaA3AW1KSnjsdMt7-U_3EZElZ0="; }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setPreviewUrls((prev) => ({ ...prev, PassportPhoto: null }));
                          setEditFormData((prev) => ({ ...prev, PassportPhoto: null, currentPassportPhoto: "" }));
                        }}
                        className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <div className="text-center">
                      <Upload className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                      <label className="cursor-pointer text-xs text-[#1D4ED8] font-semibold">
                        Upload photo
                        <input type="file" className="sr-only" accept="image/*" onChange={(e) => handleEditFileChange(e, "PassportPhoto")} />
                      </label>
                      <p className="text-xs text-slate-400 mt-0.5">or drag and drop</p>
                    </div>
                  )}
                </div>
              </div>

              {/* ID Front */}
              <div className="space-y-2">
                <label className="flex items-center gap-1 text-sm font-medium text-[#0F172A]">
                  {formData.IdType === "passport" ? <FileText size={15} className="text-slate-400" /> : <CreditCard size={15} className="text-slate-400" />}
                  {formData.IdType === "passport" ? "Passport Data Page" : `${getIdTypeLabel(formData.IdType)} Front`}
                </label>
                <div
                  className="border-2 border-dashed border-[#E2E8F0] rounded-xl h-40 flex items-center justify-center hover:border-[#1D4ED8] transition-colors bg-slate-50"
                  onDragOver={(e) => e.preventDefault()}
                  onDragLeave={(e) => e.preventDefault()}
                  onDrop={(e) => handleDrop(e, "IdFront")}
                >
                  {(previewUrls.IdFront || editFormData.currentIdFront) ? (
                    <div className="relative w-full h-full">
                      <img
                        src={previewUrls.IdFront || getImageUrl(editFormData.currentIdFront)}
                        alt="ID Front Preview"
                        className="w-full h-full object-cover rounded-xl"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).src = "https://placehold.co/400x250?text=ID+Front"; }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setPreviewUrls((prev) => ({ ...prev, IdFront: null }));
                          setEditFormData((prev) => ({ ...prev, IdFront: null, currentIdFront: "" }));
                        }}
                        className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <div className="text-center">
                      <Upload className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                      <label className="cursor-pointer text-xs text-[#1D4ED8] font-semibold">
                        Upload {formData.IdType === "passport" ? "page" : "front"}
                        <input type="file" className="sr-only" accept="image/*" onChange={(e) => handleEditFileChange(e, "IdFront")} />
                      </label>
                      <p className="text-xs text-slate-400 mt-0.5">or drag and drop</p>
                    </div>
                  )}
                </div>
              </div>

              {/* ID Back */}
              <div className="space-y-2">
                <label className="flex items-center gap-1 text-sm font-medium text-[#0F172A]">
                  <CreditCard size={15} className="text-slate-400" />
                  {getIdTypeLabel(formData.IdType)} Back
                </label>
                <div
                  className="border-2 border-dashed border-[#E2E8F0] rounded-xl h-40 flex items-center justify-center hover:border-[#1D4ED8] transition-colors bg-slate-50"
                  onDragOver={(e) => e.preventDefault()}
                  onDragLeave={(e) => e.preventDefault()}
                  onDrop={(e) => handleDrop(e, "IdBack")}
                >
                  {(previewUrls.IdBack || editFormData.currentIdBack) ? (
                    <div className="relative w-full h-full">
                      <img
                        src={previewUrls.IdBack || getImageUrl(editFormData.currentIdBack)}
                        alt="ID Back Preview"
                        className="w-full h-full object-cover rounded-xl"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).src = "https://placehold.co/400x250?text=ID+Back"; }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setPreviewUrls((prev) => ({ ...prev, IdBack: null }));
                          setEditFormData((prev) => ({ ...prev, IdBack: null, currentIdBack: "" }));
                        }}
                        className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <div className="text-center">
                      <Upload className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                      <label className="cursor-pointer text-xs text-[#1D4ED8] font-semibold">
                        Upload back
                        <input type="file" className="sr-only" accept="image/*" onChange={(e) => handleEditFileChange(e, "IdBack")} />
                      </label>
                      <p className="text-xs text-slate-400 mt-0.5">or drag and drop</p>
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

// ── UserTable sub-component ────────────────────────────────────────────────────
const UserTable = ({
  users,
  onViewDetails,
  onEditUser,
  onDeleteSuccess,
  loading,
}: UserTableProps) => {
  const userStored = localStorage.getItem("user") || null;
  const token = userStored ? JSON.parse(userStored).token : null;
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletedUser, setDeletedUser] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const deleteUser = async (userId: string) => {
    if (!token) {
      toast({ title: "Error", description: "Authentication required", variant: "destructive" });
      return;
    }
    try {
      const { status } = await axios.delete(
        `${import.meta.env.VITE_API_BASE_URL}/DeleteUser/${userId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (status >= 200 && status < 300) {
        toast({ title: "Success", description: "User deleted successfully!" });
        onDeleteSuccess && onDeleteSuccess();
        setIsDeleteModalOpen(false);
      }
    } catch (error: unknown) {
      const axiosErr = error as { response?: { data?: string } };
      toast({
        title: "Error",
        description: axiosErr?.response?.data || "Failed to delete user",
        variant: "destructive",
      });
    }
  };

  const userColumns: Column<User>[] = [
    {
      key: "name",
      header: "Name",
      cell: (u) => (
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-slate-100 flex items-center justify-center">
            {u.passportPhoto ? (
              <img
                src={getImageUrl(u.passportPhoto)}
                alt={u.name}
                className="h-full w-full object-cover"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            ) : (
              <span className="text-xs font-bold text-slate-500">{u.name.charAt(0)}</span>
            )}
          </div>
          <div>
            <p className="font-semibold text-[#0F172A]">{u.name}</p>
            <p className="text-[10px] text-slate-400 font-mono truncate max-w-[120px]">ID: {u.id}</p>
          </div>
        </div>
      ),
    },
    {
      key: "email",
      header: "Email",
      className: "text-slate-600",
      cell: (u) => u.email,
    },
    {
      key: "role",
      header: "Role",
      cell: (u) => roleBadge(u.role),
    },
    {
      key: "status",
      header: "Status",
      cell: (u) =>
        u.status === "active" ? (
          <span className="flex items-center gap-1 text-emerald-600 text-sm font-semibold">
            <CheckCircle className="h-4 w-4" /> Active
          </span>
        ) : u.status === "inactive" ? (
          <span className="flex items-center gap-1 text-amber-600 text-sm font-semibold">
            <XCircle className="h-4 w-4" /> Inactive
          </span>
        ) : (
          <span className="flex items-center gap-1 text-slate-500 text-sm">
            <Clock className="h-4 w-4" /> Pending
          </span>
        ),
    },
    {
      key: "actions",
      header: "Actions",
      headerClassName: "text-right",
      className: "text-right",
      cell: (u) => (
        <div className="flex items-center justify-end gap-1">
          <button
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-blue-50 hover:text-[#1D4ED8] transition-colors"
            onClick={() => onViewDetails(u)}
            title="View"
          >
            <Eye className="h-4 w-4" />
          </button>
          <button
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
            onClick={() => onEditUser(u)}
            title="Edit"
          >
            <Edit className="h-4 w-4" />
          </button>
          <button
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
            onClick={() => { setDeletedUser(u); setIsDeleteModalOpen(true); }}
            title="Delete"
          >
            <Trash className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <DataTable
        data={users}
        columns={userColumns}
        loading={loading}
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search by name or email…"
        label="user"
        emptyMessage="No users found"
        emptyIcon={<Users className="h-12 w-12 text-slate-300" />}
      />
      <ConfirmDeleteModal
        title="Delete User"
        isOpen={isDeleteModalOpen}
        tenantName={deletedUser?.name || ""}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={() => { deleteUser(deletedUser?.id ?? ""); }}
      />
    </div>
  );
};

export default ManageUsers;
