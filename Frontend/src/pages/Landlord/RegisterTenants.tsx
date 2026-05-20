import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  UserPlus, User, Mail, Phone, Home, Calendar, Key,
  Check, Upload, X, Camera, CreditCard, Loader2, Users,
  Droplets, Briefcase,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

export interface Property {
  rentAmount: number;
  images: any;
  area: string;
  bathrooms: number;
  bedrooms: number;
  id: number;
  name: string;
  address: string;
}

const selCls =
  "w-full rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/10 transition-colors";

const inputCls =
  "border-[#E2E8F0] focus:border-[#1D4ED8] focus-visible:ring-[#1D4ED8]/10 text-[#0F172A] placeholder:text-[#94A3B8]";

const SectionHeader = ({
  icon: Icon,
  title,
  subtitle,
  color = "bg-blue-50",
  iconColor = "text-blue-600",
}: {
  icon: React.ElementType;
  title: string;
  subtitle?: string;
  color?: string;
  iconColor?: string;
}) => (
  <div className="flex items-center gap-3 mb-5">
    <div className={`h-9 w-9 rounded-lg ${color} flex items-center justify-center flex-shrink-0`}>
      <Icon className={`h-4.5 w-4.5 ${iconColor}`} size={18} />
    </div>
    <div>
      <h3 className="text-sm font-semibold text-[#0F172A]">{title}</h3>
      {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
    </div>
  </div>
);

const FieldLabel = ({ children }: { children: React.ReactNode }) => (
  <label className="text-xs uppercase tracking-wider text-slate-400 font-medium">
    {children}
  </label>
);

type DocType = "PassportPhoto" | "IdFront" | "IdBack";

const UploadBox = ({
  label,
  icon: Icon,
  file,
  preview,
  onChange,
  onClear,
  docType,
}: {
  label: string;
  icon: React.ElementType;
  file: File | null;
  preview: string | null;
  onChange: (e: React.ChangeEvent<HTMLInputElement>, type: DocType) => void;
  onClear: (type: DocType) => void;
  docType: DocType;
}) => (
  <div className="space-y-2">
    <FieldLabel>
      <span className="flex items-center gap-1">
        <Icon size={12} />
        {label}
      </span>
    </FieldLabel>
    <div
      className={`relative rounded-xl border-2 border-dashed h-40 flex flex-col items-center justify-center transition-colors overflow-hidden
        ${file ? "border-[#1D4ED8]/30 bg-blue-50/30" : "border-[#E2E8F0] bg-slate-50 hover:border-[#1D4ED8] hover:bg-blue-50/20"}`}
    >
      {file && preview ? (
        <>
          <img src={preview} alt={label} className="absolute inset-0 w-full h-full object-cover rounded-xl" />
          <div className="absolute inset-0 bg-black/20 rounded-xl" />
          <button
            type="button"
            onClick={() => onClear(docType)}
            className="absolute top-2 right-2 h-6 w-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-colors z-10"
          >
            <X size={12} />
          </button>
          <div className="absolute bottom-2 left-0 right-0 flex justify-center">
            <span className="bg-white/90 text-[10px] font-medium text-[#0F172A] px-2 py-0.5 rounded-full">
              {file.name.length > 20 ? file.name.slice(0, 18) + "…" : file.name}
            </span>
          </div>
        </>
      ) : (
        <label className="flex flex-col items-center justify-center cursor-pointer w-full h-full">
          <div className="h-10 w-10 rounded-xl bg-white border border-[#E2E8F0] flex items-center justify-center mb-2 shadow-sm">
            <Upload className="h-4 w-4 text-slate-400" />
          </div>
          <span className="text-xs text-[#1D4ED8] font-medium">Click to upload</span>
          <span className="text-[10px] text-slate-400 mt-0.5">PNG, JPG, WEBP</span>
          <input
            type="file"
            className="sr-only"
            accept="image/*"
            onChange={(e) => onChange(e, docType)}
            required
          />
        </label>
      )}
    </div>
  </div>
);

const RegisterTenants = () => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    FullName: "",
    Name: "",
    Email: "",
    PhoneNumber: "",
    NationalIdNumber: "",
    DateMovedIn: "",
    PropertyId: "",
    Password: "",
    Active: "true",
    UnitId: "",
    WaterMeterNo: "",
    TenantStatus: "active",
    Occupation: "",
    NextOfKinName: "",
    NextOfKinPhone: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoadingProperties, setIsLoadingProperties] = useState(true);

  const [passportPhoto, setPassportPhoto] = useState<File | null>(null);
  const [passportPhotoPreview, setPassportPhotoPreview] = useState<string | null>(null);
  const [idFrontPhoto, setIdFrontPhoto] = useState<File | null>(null);
  const [idFrontPhotoPreview, setIdFrontPhotoPreview] = useState<string | null>(null);
  const [idBackPhoto, setIdBackPhoto] = useState<File | null>(null);
  const [idBackPhotoPreview, setIdBackPhotoPreview] = useState<string | null>(null);

  const user = localStorage.getItem("user");
  let token = "";
  const userData = JSON.parse(user);
  try {
    if (user) {
      token = userData.token;
    }
  } catch (error) {
    console.error("Error parsing user data:", error);
  }

  useEffect(() => {
    const fetchProperties = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_BASE_URL;
        const response = await fetch(`${apiUrl}/GetAllProperties`, {
          method: "GET",
          headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        setProperties(data.filter((property: any) => property.ownerId === userData?.id));
      } catch (error: any) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } finally {
        setIsLoadingProperties(false);
      }
    };
    if (token) fetchProperties();
  }, [toast, token]);

  useEffect(() => {
    return () => {
      if (passportPhotoPreview) URL.revokeObjectURL(passportPhotoPreview);
      if (idFrontPhotoPreview) URL.revokeObjectURL(idFrontPhotoPreview);
      if (idBackPhotoPreview) URL.revokeObjectURL(idBackPhotoPreview);
    };
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: DocType) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const previewUrl = URL.createObjectURL(file);
    if (type === "PassportPhoto") {
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

  const clearFile = (type: DocType) => {
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
      ...(name === "FullName" ? { Name: value } : {}),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passportPhoto || !idFrontPhoto || !idBackPhoto) {
      toast({
        title: "Missing Documents",
        description: "Please upload all required identification documents.",
        variant: "destructive",
      });
      return;
    }
    setIsSubmitting(true);
    try {
      const apiUrl = import.meta.env.VITE_API_BASE_URL;
      const form = new FormData();
      const formattedDate = new Date(formData.DateMovedIn).toISOString();

      form.append("FullName", formData.FullName);
      form.append("Name", formData.Name || formData.FullName);
      form.append("Email", formData.Email);
      form.append("PhoneNumber", formData.PhoneNumber);
      form.append("NationalIdNumber", formData.NationalIdNumber);
      form.append("DateMovedIn", formattedDate);
      form.append("PropertyId", formData.PropertyId);
      form.append("Password", formData.Password);
      form.append("Active", formData.Active);
      form.append("UnitId", formData.UnitId);
      form.append("WaterMeterNo", formData.WaterMeterNo);
      form.append("TenantStatus", formData.TenantStatus);
      form.append("Occupation", formData.Occupation);
      form.append("NextOfKinName", formData.NextOfKinName);
      form.append("NextOfKinPhone", formData.NextOfKinPhone);
      form.append("PassportPhoto", passportPhoto);
      form.append("IdFront", idFrontPhoto);
      form.append("IdBack", idBackPhoto);
      form.append("files", passportPhoto);
      form.append("files", idFrontPhoto);
      form.append("files", idBackPhoto);

      const response = await fetch(`${apiUrl}/CreateTenant`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, Accept: "*/*" },
        body: form,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `HTTP error! status: ${response.status}`);
      }

      setIsSubmitting(false);
      setIsSuccess(true);

      toast({
        title: "Tenant Registered Successfully",
        description: `${formData.FullName} has been registered as a tenant.`,
      });

      setTimeout(() => {
        setFormData({
          FullName: "", Name: "", Email: "", PhoneNumber: "", NationalIdNumber: "",
          DateMovedIn: "", PropertyId: "", Password: "", Active: "true", UnitId: "",
          WaterMeterNo: "", TenantStatus: "active", Occupation: "", NextOfKinName: "", NextOfKinPhone: "",
        });
        clearFile("PassportPhoto");
        clearFile("IdFront");
        clearFile("IdBack");
        setIsSuccess(false);
      }, 3500);
    } catch (error: any) {
      setIsSubmitting(false);
      toast({ title: "Registration Failed", description: error.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-[#0F172A] via-[#1E3A5F] to-[#1D4ED8] p-6 md:p-8">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-4 right-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute bottom-0 right-24 h-24 w-24 rounded-full bg-blue-300/10 blur-xl" />
        </div>
        <div className="relative">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-8 w-8 rounded-lg bg-white/10 flex items-center justify-center">
              <UserPlus className="h-4 w-4 text-white" />
            </div>
            <span className="text-blue-200 text-sm font-medium">Tenant Onboarding</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">Register New Tenant</h1>
          <p className="text-blue-200 text-sm mt-2 max-w-xl">
            Capture tenant details, assign a property, and upload identity documents in one guided flow.
          </p>
          {/* Progress indicators */}
          <div className="flex items-center gap-2 mt-4 flex-wrap">
            {["Personal Info", "Tenancy Details", "Next of Kin", "Documents"].map((step, i) => (
              <div key={step} className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 bg-white/10 rounded-lg px-3 py-1.5">
                  <div className="h-4 w-4 rounded-full bg-white/20 flex items-center justify-center">
                    <span className="text-[9px] font-bold text-white">{i + 1}</span>
                  </div>
                  <span className="text-white text-xs font-medium">{step}</span>
                </div>
                {i < 3 && <div className="h-px w-3 bg-white/20" />}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Form Card */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden">
        {/* Form header */}
        <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-[#1D4ED8]/10 flex items-center justify-center">
            <UserPlus className="h-4.5 w-4.5 text-[#1D4ED8]" size={18} />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-[#0F172A]">Tenant Registration Form</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Enter the tenant's details below to register them to one of your properties
            </p>
          </div>
        </div>

        <div className="p-6">
          {isSuccess ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center text-center py-14"
            >
              <div className="h-20 w-20 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
                <Check className="h-10 w-10 text-emerald-600" />
              </div>
              <h3 className="text-xl font-bold text-[#0F172A] mb-2">Tenant Registered Successfully!</h3>
              <p className="text-slate-500 text-sm max-w-sm">
                An email has been sent to <span className="font-medium text-[#0F172A]">{formData.Email}</span> with login instructions.
              </p>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Section 1 — Personal Information */}
              <div className="bg-slate-50/60 rounded-xl border border-[#E2E8F0] p-5">
                <SectionHeader
                  icon={User}
                  title="Personal Information"
                  subtitle="Core tenant identity details"
                  color="bg-blue-50"
                  iconColor="text-blue-600"
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <FieldLabel>Full Name *</FieldLabel>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        name="FullName"
                        value={formData.FullName}
                        onChange={handleInputChange}
                        placeholder="Enter tenant's full name"
                        required
                        className={`pl-9 ${inputCls}`}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <FieldLabel>Email Address *</FieldLabel>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        name="Email"
                        type="email"
                        value={formData.Email}
                        onChange={handleInputChange}
                        placeholder="Enter tenant's email"
                        required
                        className={`pl-9 ${inputCls}`}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <FieldLabel>Phone Number *</FieldLabel>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        name="PhoneNumber"
                        type="tel"
                        value={formData.PhoneNumber}
                        onChange={handleInputChange}
                        placeholder="Enter tenant's phone number"
                        required
                        className={`pl-9 ${inputCls}`}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <FieldLabel>National ID Number *</FieldLabel>
                    <div className="relative">
                      <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        name="NationalIdNumber"
                        value={formData.NationalIdNumber}
                        onChange={handleInputChange}
                        placeholder="Enter tenant's ID number"
                        required
                        className={`pl-9 ${inputCls}`}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <FieldLabel>Move-in Date *</FieldLabel>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        name="DateMovedIn"
                        type="date"
                        value={formData.DateMovedIn}
                        onChange={handleInputChange}
                        required
                        className={`pl-9 ${inputCls}`}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <FieldLabel>Property *</FieldLabel>
                    <div className="relative">
                      <Home className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 z-10 pointer-events-none" />
                      <select
                        name="PropertyId"
                        value={formData.PropertyId}
                        onChange={handleInputChange}
                        disabled={isLoadingProperties}
                        required
                        className={`${selCls} pl-9`}
                      >
                        <option value="">
                          {isLoadingProperties ? "Loading properties..." : "Select a property"}
                        </option>
                        {properties.map((prop) => (
                          <option key={prop.id} value={String(prop.id)}>
                            {prop.name} — {prop.address}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 2 — Tenancy Details */}
              <div className="bg-slate-50/60 rounded-xl border border-[#E2E8F0] p-5">
                <SectionHeader
                  icon={Home}
                  title="Tenancy Details"
                  subtitle="Unit assignment and tenancy configuration"
                  color="bg-emerald-50"
                  iconColor="text-emerald-600"
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <FieldLabel>Unit / Room</FieldLabel>
                    <select
                      name="UnitId"
                      className={selCls}
                      value={formData.UnitId}
                      onChange={handleInputChange}
                    >
                      <option value="">Select unit</option>
                      {["A1", "A2", "B1", "B2", "C1", "C2"].map((u) => (
                        <option key={u} value={u}>{u}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <FieldLabel>Water Meter No.</FieldLabel>
                    <div className="relative">
                      <Droplets className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        name="WaterMeterNo"
                        value={formData.WaterMeterNo}
                        onChange={handleInputChange}
                        placeholder="e.g. WM-00123"
                        className={`pl-9 ${inputCls}`}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <FieldLabel>Tenant Status</FieldLabel>
                    <select
                      name="TenantStatus"
                      className={selCls}
                      value={formData.TenantStatus}
                      onChange={handleInputChange}
                    >
                      <option value="active">Active</option>
                      <option value="left">Left</option>
                      <option value="pending payment">Pending Payment</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <FieldLabel>Occupation</FieldLabel>
                    <div className="relative">
                      <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        name="Occupation"
                        value={formData.Occupation}
                        onChange={handleInputChange}
                        placeholder="e.g. Teacher, Engineer..."
                        className={`pl-9 ${inputCls}`}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 3 — Next of Kin */}
              <div className="bg-slate-50/60 rounded-xl border border-[#E2E8F0] p-5">
                <SectionHeader
                  icon={Users}
                  title="Next of Kin"
                  subtitle="Emergency contact information"
                  color="bg-purple-50"
                  iconColor="text-purple-600"
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <FieldLabel>Next of Kin Name</FieldLabel>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        name="NextOfKinName"
                        value={formData.NextOfKinName}
                        onChange={handleInputChange}
                        placeholder="Full name"
                        className={`pl-9 ${inputCls}`}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <FieldLabel>Next of Kin Contact</FieldLabel>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        name="NextOfKinPhone"
                        value={formData.NextOfKinPhone}
                        onChange={handleInputChange}
                        placeholder="Phone number"
                        className={`pl-9 ${inputCls}`}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 4 — Identification Documents */}
              <div className="bg-slate-50/60 rounded-xl border border-[#E2E8F0] p-5">
                <SectionHeader
                  icon={CreditCard}
                  title="Identification Documents"
                  subtitle="All three documents are required to complete registration"
                  color="bg-amber-50"
                  iconColor="text-amber-600"
                />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                  <UploadBox
                    label="Passport Photo"
                    icon={Camera}
                    file={passportPhoto}
                    preview={passportPhotoPreview}
                    onChange={handleFileChange}
                    onClear={clearFile}
                    docType="PassportPhoto"
                  />
                  <UploadBox
                    label="ID Front Side"
                    icon={CreditCard}
                    file={idFrontPhoto}
                    preview={idFrontPhotoPreview}
                    onChange={handleFileChange}
                    onClear={clearFile}
                    docType="IdFront"
                  />
                  <UploadBox
                    label="ID Back Side"
                    icon={CreditCard}
                    file={idBackPhoto}
                    preview={idBackPhotoPreview}
                    onChange={handleFileChange}
                    onClear={clearFile}
                    docType="IdBack"
                  />
                </div>

                {/* Upload progress chips */}
                <div className="flex items-center gap-2 mt-4 flex-wrap">
                  {[
                    { label: "Passport Photo", done: !!passportPhoto },
                    { label: "ID Front", done: !!idFrontPhoto },
                    { label: "ID Back", done: !!idBackPhoto },
                  ].map((d) => (
                    <span
                      key={d.label}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                        d.done
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-slate-50 text-slate-500 border-slate-200"
                      }`}
                    >
                      {d.done ? (
                        <Check className="h-3 w-3" />
                      ) : (
                        <div className="h-2 w-2 rounded-full bg-slate-300" />
                      )}
                      {d.label}
                    </span>
                  ))}
                </div>
              </div>

              {/* Submit */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => window.history.back()}
                  className="px-5 py-2.5 rounded-xl text-sm font-medium border border-[#E2E8F0] text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold bg-[#1D4ED8] text-white hover:bg-blue-700 disabled:opacity-60 transition-colors shadow-lg shadow-blue-500/20"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Registering…
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4" />
                      Register Tenant
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default RegisterTenants;
