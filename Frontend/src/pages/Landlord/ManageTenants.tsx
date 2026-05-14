import { useState, useEffect } from "react";
import { getImageUrl as buildImageUrl } from "@/lib/imageUrl";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DataTable, Column } from "@/components/ui/data-table";
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
  Banknote,
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
  unitId?: string;
  waterMeterNo?: string;
  occupation?: string;
  nextOfKinName?: string;
  nextOfKinPhone?: string;
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

  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    paymentDate: new Date().toISOString().split("T")[0],
    paymentMethod: "Cash",
    referenceNo: "",
    notes: "",
  });
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
    idFront: "",
    idBack: "",
    passportPhoto: "",
    // New fields
    UnitId: "",
    WaterMeterNo: "",
    TenantStatus: "active",
    Occupation: "",
    NextOfKinName: "",
    NextOfKinPhone: "",
  });

  const navigate = useNavigate();

  const apiUrl = import.meta.env.VITE_API_BASE_URL;
  const user = localStorage.getItem("user");
  const userData = JSON.parse(user);
  const getAuthToken = () => {
    try {
      if (!user) {
        console.error("No user found in localStorage");
        return null;
      }

      return userData.token;
    } catch (error) {
      console.error("Error parsing user data:", error);
      return null;
    }
  };

  const fetchTenants = async () => {
    setIsLoading(true);
    try {
      const { data } = await axios.get(`${apiUrl}/GetAllTenants`);
      const filteredData = data.filter(
        (tenant: any) => tenant?.property?.ownerId === userData.id
      );
      setTenants(filteredData);
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

  useEffect(() => {
    fetchTenants();
  }, []);

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
          idFront: "",
          idBack: "",
          passportPhoto: "",
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
        setSelectedTenant(null);
        toast({
          title: "Success",
          description: "Tenant deleted successfully",
        });
        fetchTenants();
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

  const handleRecordPayment = async () => {
    if (!paymentForm.amount || Number(paymentForm.amount) <= 0) {
      toast({ title: "Validation Error", description: "Please enter a valid amount.", variant: "destructive" });
      return;
    }
    setIsSubmittingPayment(true);
    try {
      const body = {
        tenantId: selectedTenant?.id,
        amount: Number(paymentForm.amount),
        paymentDate: paymentForm.paymentDate,
        paymentMethod: paymentForm.paymentMethod,
        referenceNo: paymentForm.referenceNo,
        notes: paymentForm.notes,
      };
      const response = await fetch(`${apiUrl}/RecordPayment`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${getAuthToken()}`,
          "Content-Type": "application/json",
          Accept: "*/*",
        },
        body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error(`Request failed with status ${response.status}`);

      setTenants((prev) =>
        prev.map((t) =>
          t.id === selectedTenant?.id
            ? { ...t, balanceDue: Math.max(0, t.balanceDue - Number(paymentForm.amount)) }
            : t
        )
      );
      if (selectedTenant) {
        setSelectedTenant({ ...selectedTenant, balanceDue: Math.max(0, selectedTenant.balanceDue - Number(paymentForm.amount)) });
      }
      toast({ title: "Payment Recorded", description: `Payment of ${formatCurrency(Number(paymentForm.amount), selectedTenant?.property.currency)} recorded successfully.` });
      setPaymentModalOpen(false);
      setPaymentForm({ amount: "", paymentDate: new Date().toISOString().split("T")[0], paymentMethod: "Cash", referenceNo: "", notes: "" });
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed to record payment.", variant: "destructive" });
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  const PLACEHOLDER_IMAGE = "https://placehold.co/150?text=No+Image";

  const getImageUrl = (relativePath: string) => {
    if (!relativePath) return PLACEHOLDER_IMAGE;
    if (relativePath.startsWith("http")) return relativePath;

    const token = getAuthToken();
    return `${apiUrl}/${relativePath}${token ? `?token=${token}` : ""}`;
  };

  const getImageUrl2 = buildImageUrl;

  return (
    <div className="space-y-8">
      <section className="page-hero">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <span className="inline-flex w-fit items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              Tenant Management
            </span>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
                Manage tenants
              </h1>
              <p className="mt-2 text-sm text-muted-foreground md:text-base">
                Review occupants, update records, and keep tenant information aligned with properties.
              </p>
            </div>
          </div>

        </div>
      </section>

      <Card className="data-surface border-none shadow-none">
        <CardContent className="pt-6">
          <h2 className="text-xl font-semibold text-slate-950 mb-6">Tenant records</h2>

          {(() => {
            const tenantColumns: Column<Tenant>[] = [
              {
                key: "tenant", header: "Tenant",
                cell: (t) => (
                  <div>
                    <div className="font-medium">{t.fullName}</div>
                    <div className="text-sm text-muted-foreground">{t.email}</div>
                  </div>
                ),
              },
              {
                key: "property", header: "Property",
                cell: (t) => (
                  <div>
                    <div>{t.property.name}</div>
                    <div className="text-sm text-muted-foreground">{t.property.type}</div>
                  </div>
                ),
              },
              { key: "unit", header: "Unit", cell: (t) => t.unitId || <span className="text-muted-foreground">—</span> },
              { key: "water", header: "Water Meter", cell: (t) => t.waterMeterNo || <span className="text-muted-foreground">—</span> },
              { key: "occupation", header: "Occupation", cell: (t) => t.occupation || <span className="text-muted-foreground">—</span> },
              {
                key: "kin", header: "Next of Kin",
                cell: (t) => t.nextOfKinName ? (
                  <div>
                    <div>{t.nextOfKinName}</div>
                    <div className="text-sm text-muted-foreground">{t.nextOfKinPhone}</div>
                  </div>
                ) : <span className="text-muted-foreground">—</span>,
              },
              { key: "movein", header: "Move-in Date", cell: (t) => formatDate(t.dateMovedIn) },
              { key: "rent", header: "Rent", cell: (t) => formatCurrency(t.property.price, t.property.currency) },
              {
                key: "status", header: "Status",
                cell: (t) => (
                  <span className={`px-2 py-1 rounded-full text-xs ${getStatusBadgeClass(t.active)}`}>
                    {t.active ? "Active" : "Inactive"}
                  </span>
                ),
              },
              {
                key: "actions", header: "Actions", headerClassName: "text-right",
                cell: (t) => (
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" size="icon" onClick={() => {
                      setSelectedTenant(t);
                      setFormData({ id: t.id, FullName: t.fullName, Name: t.fullName, Email: t.email, PhoneNumber: t.phoneNumber, NationalIdNumber: t.nationalIdNumber, DateMovedIn: new Date(t.dateMovedIn).toISOString().split("T")[0], PropertyId: t.propertyId, Active: String(t.active), idFront: t.idFront, idBack: t.idBack, passportPhoto: t.passportPhoto, UnitId: t.unitId || "", WaterMeterNo: t.waterMeterNo || "", TenantStatus: t.active ? "active" : "left", Occupation: t.occupation || "", NextOfKinName: t.nextOfKinName || "", NextOfKinPhone: t.nextOfKinPhone || "" });
                    }}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => {
                      setFormData({ id: t.id, FullName: t.fullName, Name: t.fullName, Email: t.email, PhoneNumber: t.phoneNumber, NationalIdNumber: t.nationalIdNumber, DateMovedIn: new Date(t.dateMovedIn).toISOString().split("T")[0], PropertyId: t.propertyId, Active: String(t.active), idFront: t.idFront || "", idBack: t.idBack || "", passportPhoto: t.passportPhoto || "", UnitId: t.unitId || "", WaterMeterNo: t.waterMeterNo || "", TenantStatus: t.active ? "active" : "left", Occupation: t.occupation || "", NextOfKinName: t.nextOfKinName || "", NextOfKinPhone: t.nextOfKinPhone || "" });
                      setPassportPhotoPreview(getImageUrl(t.passportPhoto));
                      setIdFrontPhotoPreview(getImageUrl(t.idFront));
                      setIdBackPhotoPreview(getImageUrl(t.idBack));
                      setIsEdit(true);
                    }}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" className="text-red-500" onClick={() => { setDeleteTenant(t); setIsDeleteModalOpen(true); }}>
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                ),
              },
            ];
            return (
              <DataTable
                data={filteredTenants}
                columns={tenantColumns}
                loading={isLoading}
                searchValue={searchTerm}
                onSearchChange={setSearchTerm}
                searchPlaceholder="Search by name, email, or property..."
                label="tenant"
                pageSize={10}
                minWidth="1100px"
                emptyIcon={<Users className="h-10 w-10" />}
                emptyMessage={searchTerm ? "No tenants match your search" : "Start by adding a new tenant"}
                headerRight={
                  <Button onClick={() => navigate("/landlord-dashboard/register-tenants")}>
                    Add Tenant
                  </Button>
                }
              />
            );
          })()}
        </CardContent>
      </Card>

      {selectedTenant && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[28px] max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-[0_30px_90px_-36px_rgba(15,23,42,0.42)]">
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

                  <div className="mt-6 border-t pt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-3">Tenancy Details</h4>
                      <div className="space-y-3">
                        <div>
                          <span className="text-xs text-muted-foreground">Unit / Room</span>
                          <p>{selectedTenant.unitId || <span className="text-muted-foreground">Not set</span>}</p>
                        </div>
                        <div>
                          <span className="text-xs text-muted-foreground">Water Meter No.</span>
                          <p>{selectedTenant.waterMeterNo || <span className="text-muted-foreground">Not set</span>}</p>
                        </div>
                        <div>
                          <span className="text-xs text-muted-foreground">Occupation</span>
                          <p>{selectedTenant.occupation || <span className="text-muted-foreground">Not set</span>}</p>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-3">Next of Kin</h4>
                      <div className="space-y-3">
                        <div>
                          <span className="text-xs text-muted-foreground">Name</span>
                          <p>{selectedTenant.nextOfKinName || <span className="text-muted-foreground">Not set</span>}</p>
                        </div>
                        <div>
                          <span className="text-xs text-muted-foreground">Contact</span>
                          <p className="flex items-center">
                            {selectedTenant.nextOfKinPhone ? (
                              <><PhoneIcon size={14} className="mr-1" />{selectedTenant.nextOfKinPhone}</>
                            ) : (
                              <span className="text-muted-foreground">Not set</span>
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 border-t pt-6">
                    <h4 className="text-sm font-medium mb-3">Actions</h4>
                    <div className="flex space-x-3">
                      <Button onClick={() => {
                        setPaymentForm({ amount: "", paymentDate: new Date().toISOString().split("T")[0], paymentMethod: "Cash", referenceNo: "", notes: "" });
                        setPaymentModalOpen(true);
                      }}>
                        <Banknote size={14} className="mr-1" />
                        Record Payment
                      </Button>
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
              isLoading={isSubmitting}
            >
              Update Tenant
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
                        className="input-field"
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

                  {/* Additional Fields */}
                  <div className="pt-4 border-t">
                    <h3 className="font-medium mb-4">Tenancy Details</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Unit / Room</label>
                        <select
                          name="UnitId"
                          className="input-field"
                          value={formData.UnitId}
                          onChange={handleInputChange}
                        >
                          <option value="">Select unit</option>
                          {["A1", "A2", "B1", "B2", "C1", "C2"].map((u) => (
                            <option key={u} value={u}>{u}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Water Meter No.</label>
                        <Input
                          name="WaterMeterNo"
                          value={formData.WaterMeterNo}
                          onChange={handleInputChange}
                          placeholder="e.g. WM-00123"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Tenant Status</label>
                        <select
                          name="TenantStatus"
                          className="input-field"
                          value={formData.TenantStatus}
                          onChange={handleInputChange}
                        >
                          <option value="active">Active</option>
                          <option value="left">Left</option>
                          <option value="pending payment">Pending Payment</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Occupation</label>
                        <Input
                          name="Occupation"
                          value={formData.Occupation}
                          onChange={handleInputChange}
                          placeholder="e.g. Teacher, Engineer..."
                        />
                      </div>
                    </div>
                    <h3 className="font-medium mt-4 mb-3">Next of Kin</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Next of Kin Name</label>
                        <Input
                          name="NextOfKinName"
                          value={formData.NextOfKinName}
                          onChange={handleInputChange}
                          placeholder="Full name"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Next of Kin Contact</label>
                        <Input
                          name="NextOfKinPhone"
                          value={formData.NextOfKinPhone}
                          onChange={handleInputChange}
                          placeholder="Phone number"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Document Upload Section */}
                  <div className="pt-4">
                    <h3 className="font-medium mb-4">
                      Identification Documents
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <img
                          src={buildImageUrl(formData?.passportPhoto)}
                          alt="Passport Photo"
                          className="w-full h-40 object-cover rounded-md"
                        />
                      </div>
                      <div className="space-y-2">
                        <img
                          src={buildImageUrl(formData?.idFront)}
                          alt="ID Front"
                          className="w-full h-40 object-cover rounded-md"
                        />
                      </div>
                      <div className="space-y-2">
                        <img
                          src={buildImageUrl(formData?.idBack)}
                          alt="ID Back"
                          className="w-full h-40 object-cover rounded-md"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {/* Passport Photo */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium flex items-center">
                          <Camera size={16} className="mr-1" />
                          Passport Photo
                        </label>
                        <div
                          className="border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center h-40 cursor-pointer hover:border-primary transition-colors"
                          onClick={() =>
                            document
                              .getElementById("passportPhotoInput")
                              ?.click()
                          }
                        >
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
                                onClick={(e) => {
                                  e.stopPropagation();
                                  clearFile("PassportPhoto");
                                }}
                                className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ) : (
                            <>
                              <Upload className="h-8 w-8 text-gray-400 mb-2" />
                              <p className="text-xs text-center text-gray-500">
                                Click to upload photo
                                <input
                                  id="passportPhotoInput"
                                  type="file"
                                  className="sr-only"
                                  accept="image/*"
                                  onChange={(e) =>
                                    handleFileChange(e, "PassportPhoto")
                                  }
                                  required
                                />
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
                        <div
                          className="border-2 border-dashed rounded-md p-4 flex flex-col items-center justify-center h-40 cursor-pointer"
                          onClick={() =>
                            document.getElementById("idFrontInput")?.click()
                          }
                        >
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
                                onClick={(e) => {
                                  e.stopPropagation();
                                  clearFile("IdFront");
                                }}
                                className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ) : (
                            <>
                              <Upload className="h-8 w-8 text-gray-400 mb-2" />
                              <p className="text-xs text-center text-gray-500">
                                Click to upload front
                                <input
                                  id="idFrontInput"
                                  type="file"
                                  className="sr-only"
                                  accept="image/*"
                                  onChange={(e) =>
                                    handleFileChange(e, "IdFront")
                                  }
                                  required
                                />
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
                        <div
                          className="border-2 border-dashed rounded-md p-4 flex flex-col items-center justify-center h-40 cursor-pointer"
                          onClick={() =>
                            document.getElementById("idBackInput")?.click()
                          }
                        >
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
                                onClick={(e) => {
                                  e.stopPropagation();
                                  clearFile("IdBack");
                                }}
                                className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ) : (
                            <>
                              <Upload className="h-8 w-8 text-gray-400 mb-2" />
                              <p className="text-xs text-center text-gray-500">
                                Click to upload back
                                <input
                                  id="idBackInput"
                                  type="file"
                                  className="sr-only"
                                  accept="image/*"
                                  onChange={(e) =>
                                    handleFileChange(e, "IdBack")
                                  }
                                  required
                                />
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

      {paymentModalOpen && selectedTenant && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[28px] w-full max-w-md shadow-[0_30px_90px_-36px_rgba(15,23,42,0.42)]">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-lg font-semibold">Record Payment</h2>
                  <p className="text-sm text-muted-foreground">{selectedTenant.fullName} — Balance: {formatCurrency(selectedTenant.balanceDue, selectedTenant.property.currency)}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setPaymentModalOpen(false)}>
                  <XIcon className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Amount ({selectedTenant.property.currency}) *</label>
                  <Input
                    type="number"
                    placeholder="e.g. 350000"
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm((p) => ({ ...p, amount: e.target.value }))}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Payment Date *</label>
                    <Input
                      type="date"
                      value={paymentForm.paymentDate}
                      onChange={(e) => setPaymentForm((p) => ({ ...p, paymentDate: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Payment Method</label>
                    <select
                      className="input-field"
                      value={paymentForm.paymentMethod}
                      onChange={(e) => setPaymentForm((p) => ({ ...p, paymentMethod: e.target.value }))}
                    >
                      <option value="Cash">Cash</option>
                      <option value="Mobile Money">Mobile Money</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                      <option value="Cheque">Cheque</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium">Reference / Receipt No.</label>
                  <Input
                    placeholder="Optional transaction reference"
                    value={paymentForm.referenceNo}
                    onChange={(e) => setPaymentForm((p) => ({ ...p, referenceNo: e.target.value }))}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium">Notes</label>
                  <Input
                    placeholder="Optional notes"
                    value={paymentForm.notes}
                    onChange={(e) => setPaymentForm((p) => ({ ...p, notes: e.target.value }))}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <Button variant="outline" onClick={() => setPaymentModalOpen(false)}>Cancel</Button>
                <Button isLoading={isSubmittingPayment} onClick={handleRecordPayment}>
                  <Banknote size={14} className="mr-1" />
                  Record Payment
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

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
