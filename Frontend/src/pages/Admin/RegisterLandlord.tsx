import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  X,
  Camera,
  CreditCard,
  FileText,
  User,
  Phone,
  Mail,
  IdCard,
  Loader2,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

export interface LandlordFormData {
  FullName: string;
  PhoneNumber: string;
  Email: string;
  systemRoleId: string | null;
  Password: string;
  IdType: "nationalId" | "drivingPermit" | "passport";
  IdNumber: string;
  PassportPhoto?: File | null;
  IdFront?: File | null;
  IdBack?: File | null;
}

const idTypes = [
  { value: "nationalId", label: "National ID", requiresBack: true },
  { value: "drivingPermit", label: "Driving Permit", requiresBack: true },
  { value: "passport", label: "Passport", requiresBack: true },
];

const inputCls =
  "h-11 w-full rounded-xl border border-[#E2E8F0] bg-white px-3.5 text-sm text-[#0F172A] placeholder:text-[#94A3B8] shadow-sm outline-none transition-all focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/10";

const RegisterLandlord = () => {
  const [formData, setFormData] = useState<LandlordFormData>({
    FullName: "",
    PhoneNumber: "",
    Email: "",
    Password: "defaultPassword",
    IdType: "nationalId",
    IdNumber: "",
    systemRoleId: "2",
  });

  const [previewUrls, setPreviewUrls] = useState({
    PassportPhoto: null as string | null,
    IdFront: null as string | null,
    IdBack: null as string | null,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleRadioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      IdType: e.target.value as "nationalId" | "drivingPermit" | "passport",
    }));
  };

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    fileType: "PassportPhoto" | "IdFront" | "IdBack"
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
    fileType: "PassportPhoto" | "IdFront" | "IdBack"
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
      (type) => type.value === formData.IdType
    );
    return selectedIdType ? selectedIdType.requiresBack : false;
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
      formDataToSend.append("SystemRoleId", "2");

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

      if (isBackSideRequired() && formData.IdBack) {
        files.push({
          file: formData.IdBack,
          type: `${formData.IdType}Back`,
        });
      }

      files.forEach((fileObj) => {
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
        systemRoleId: "2",
      });
      setPreviewUrls({
        PassportPhoto: null,
        IdFront: null,
        IdBack: null,
      });
    } catch (error) {
      console.error("Error submitting form:", error);

      if (error instanceof Error && error.message.includes("User regis")) {
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
          systemRoleId: "2",
        });
        setPreviewUrls({
          PassportPhoto: null,
          IdFront: null,
          IdBack: null,
        });
      } else {
        toast({
          title: "Error",
          description:
            error instanceof Error
              ? error.message
              : "An error occurred while registering the landlord.",
          variant: "destructive",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const removeFile = (fileType: "PassportPhoto" | "IdFront" | "IdBack") => {
    setFormData((prev) => ({ ...prev, [fileType]: null }));
    setPreviewUrls((prev) => ({ ...prev, [fileType]: null }));
  };

  const UploadZone = ({
    fileType,
    label,
    icon: Icon,
    previewUrl,
  }: {
    fileType: "PassportPhoto" | "IdFront" | "IdBack";
    label: string;
    icon: React.ElementType;
    previewUrl: string | null;
  }) => (
    <div className="space-y-2">
      <label className="block text-xs font-semibold uppercase tracking-wider text-[#64748B] mb-2">
        <span className="flex items-center gap-1.5">
          <Icon className="h-3.5 w-3.5" />
          {label}
        </span>
      </label>
      <div
        className="relative h-40 rounded-xl border-2 border-dashed border-[#E2E8F0] bg-slate-50 overflow-hidden transition-colors hover:border-[#1D4ED8] hover:bg-blue-50/30"
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={(e) => e.preventDefault()}
        onDrop={(e) => handleDrop(e, fileType)}
      >
        <AnimatePresence mode="wait">
          {previewUrl ? (
            <motion.div
              key="preview"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="relative h-full w-full"
            >
              <img
                src={previewUrl}
                alt={label}
                className="h-full w-full object-cover"
              />
              <button
                type="button"
                onClick={() => removeFile(fileType)}
                className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white shadow hover:bg-red-600 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </motion.div>
          ) : (
            <motion.label
              key="upload"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex h-full w-full cursor-pointer flex-col items-center justify-center gap-1.5"
            >
              <Upload className="h-6 w-6 text-slate-400" />
              <span className="text-xs text-slate-500">Click or drag to upload</span>
              <span className="text-[10px] text-slate-400">PNG, JPG up to 5MB</span>
              <input
                type="file"
                className="hidden"
                accept="image/*"
                onChange={(e) => handleFileChange(e, fileType)}
              />
            </motion.label>
          )}
        </AnimatePresence>
      </div>
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Hero Banner */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0F172A] via-[#1E3A5F] to-[#1D4ED8] px-8 py-8 text-white shadow-xl">
        <div className="pointer-events-none absolute -right-10 -top-10 h-56 w-56 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute -bottom-8 left-1/3 h-40 w-40 rounded-full bg-white/5" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <span className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-blue-200">
              Admin
            </span>
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
              Register Landlord
            </h1>
            <p className="text-sm text-blue-200/80">
              Add a new landlord to the property management system
            </p>
          </div>
        </div>
      </section>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Personal Information */}
        <div className="rounded-2xl border border-[#E2E8F0] bg-white shadow-sm overflow-hidden">
          <div className="border-b border-[#E2E8F0] bg-slate-50/60 px-5 py-3.5 flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100">
              <User className="h-3.5 w-3.5 text-blue-600" />
            </div>
            <h3 className="text-sm font-bold text-[#0F172A]">Personal Information</h3>
          </div>
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#64748B] mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  name="FullName"
                  value={formData.FullName}
                  onChange={handleInputChange}
                  className={inputCls}
                  placeholder="Enter landlord's full name"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#64748B] mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  name="PhoneNumber"
                  value={formData.PhoneNumber}
                  onChange={handleInputChange}
                  className={inputCls}
                  placeholder="Enter phone number"
                  required
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#64748B] mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  name="Email"
                  value={formData.Email}
                  onChange={handleInputChange}
                  className={inputCls}
                  placeholder="Enter email address"
                  required
                />
              </div>
            </div>
          </div>
        </div>

        {/* Identification */}
        <div className="rounded-2xl border border-[#E2E8F0] bg-white shadow-sm overflow-hidden">
          <div className="border-b border-[#E2E8F0] bg-slate-50/60 px-5 py-3.5 flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100">
              <IdCard className="h-3.5 w-3.5 text-blue-600" />
            </div>
            <h3 className="text-sm font-bold text-[#0F172A]">Identification</h3>
          </div>
          <div className="p-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#64748B] mb-3">
                ID Type
              </label>
              <div className="flex flex-wrap gap-3">
                {idTypes.map((type) => (
                  <label
                    key={type.value}
                    className={`flex cursor-pointer items-center gap-2.5 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all ${
                      formData.IdType === type.value
                        ? "border-[#1D4ED8] bg-blue-50 text-[#1D4ED8]"
                        : "border-[#E2E8F0] bg-white text-[#64748B] hover:border-slate-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="IdType"
                      value={type.value}
                      checked={formData.IdType === type.value}
                      onChange={handleRadioChange}
                      className="h-4 w-4 accent-[#1D4ED8]"
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
                type="text"
                name="IdNumber"
                value={formData.IdNumber}
                onChange={handleInputChange}
                className={inputCls}
                placeholder={`Enter ${getIdTypeLabel(formData.IdType).toLowerCase()} number`}
                required
              />
            </div>
          </div>
        </div>

        {/* Document Uploads */}
        <div className="rounded-2xl border border-[#E2E8F0] bg-white shadow-sm overflow-hidden">
          <div className="border-b border-[#E2E8F0] bg-slate-50/60 px-5 py-3.5 flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100">
              <Camera className="h-3.5 w-3.5 text-blue-600" />
            </div>
            <h3 className="text-sm font-bold text-[#0F172A]">Document Uploads</h3>
          </div>
          <div className="p-5">
            <div className={`grid gap-4 ${isBackSideRequired() ? "grid-cols-1 md:grid-cols-3" : "grid-cols-1 md:grid-cols-2"}`}>
              <UploadZone
                fileType="PassportPhoto"
                label="Passport Photo"
                icon={Camera}
                previewUrl={previewUrls.PassportPhoto}
              />
              <UploadZone
                fileType="IdFront"
                label={
                  formData.IdType === "passport"
                    ? "Passport Data Page"
                    : `${getIdTypeLabel(formData.IdType)} Front`
                }
                icon={formData.IdType === "passport" ? FileText : CreditCard}
                previewUrl={previewUrls.IdFront}
              />
              {isBackSideRequired() && (
                <UploadZone
                  fileType="IdBack"
                  label={`${getIdTypeLabel(formData.IdType)} Back`}
                  icon={CreditCard}
                  previewUrl={previewUrls.IdBack}
                />
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pb-4">
          <button
            type="button"
            className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
            onClick={() => {
              setFormData({
                FullName: "",
                PhoneNumber: "",
                Email: "",
                Password: "defaultPassword",
                IdType: "nationalId",
                IdNumber: "",
                systemRoleId: "2",
              });
              setPreviewUrls({ PassportPhoto: null, IdFront: null, IdBack: null });
            }}
          >
            Clear Form
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded-xl bg-[#1D4ED8] px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-[#1e40af] transition-colors disabled:opacity-60"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {isSubmitting ? "Registering…" : "Register Landlord"}
          </button>
        </div>
      </form>
    </motion.div>
  );
};

export default RegisterLandlord;
