import { useState } from "react";
import { motion } from "framer-motion";
import { Upload, X, Camera, CreditCard, FileText } from "lucide-react";
import Button from "../../components/ui/button/Button";
import { toast } from "@/components/ui/use-toast";

interface LandlordFormData {
  FullName: string;
  PhoneNumber: string;
  Email: string;
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
  { value: "passport", label: "Passport", requiresBack: true }
];

const RegisterLandlord = () => {
  const [formData, setFormData] = useState<LandlordFormData>({
    FullName: "",
    PhoneNumber: "",
    Email: "",
    Password: "defaultPassword",
    IdType: "nationalId",
    IdNumber: "",
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
    setFormData(prev => ({ 
      ...prev, 
      IdType: e.target.value as "nationalId" | "drivingPermit" | "passport"
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, fileType: 'PassportPhoto' | 'IdFront' | 'IdBack') => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData((prev) => ({ ...prev, [fileType]: file }));
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrls(prev => ({ ...prev, [fileType]: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, fileType: 'PassportPhoto' | 'IdFront' | 'IdBack') => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      setFormData((prev) => ({ ...prev, [fileType]: file }));
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrls(prev => ({ ...prev, [fileType]: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const getIdTypeLabel = (idType: string) => {
    const foundType = idTypes.find(type => type.value === idType);
    return foundType ? foundType.label : "ID";
  };

  const isBackSideRequired = () => {
    const selectedIdType = idTypes.find(type => type.value === formData.IdType);
    return selectedIdType ? selectedIdType.requiresBack : false;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.PassportPhoto || !formData.IdFront || 
        (isBackSideRequired() && !formData.IdBack)) {
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
      
      formDataToSend.append('FullName', formData.FullName);
      formDataToSend.append('PhoneNumber', formData.PhoneNumber);
      formDataToSend.append('Email', formData.Email);
      formDataToSend.append('NationalIdNumber', formData.IdNumber);
      formDataToSend.append('SystemRoleId', '2');
      
      const files = [];
      
      if (formData.PassportPhoto) {
        files.push({
          file: formData.PassportPhoto,
          type: 'PassportPhoto'
        });
      }
      
      if (formData.IdFront) {
        files.push({
          file: formData.IdFront,
          type: `${formData.IdType}Front`
        });
      }
      
      if (isBackSideRequired() && formData.IdBack) {
        files.push({
          file: formData.IdBack,
          type: `${formData.IdType}Back`
        });
      }
      
      files.forEach((fileObj, index) => {
        formDataToSend.append(`files`, fileObj.file);
      });
      
      const response = await fetch('http://3.216.182.63:8091/RegisterUser', {
        method: 'POST',
        headers: {
          'accept': '*/*'
        },
        body: formDataToSend,
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to register landlord');
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
        IdNumber: ""
      });
      setPreviewUrls({
        PassportPhoto: null,
        IdFront: null,
        IdBack: null,
      });
      
    } catch (error) {
      console.error('Error submitting form:', error);
      
      if (error.message && error.message.includes("User regis")) {
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
          IdNumber: ""
        });
        setPreviewUrls({
          PassportPhoto: null,
          IdFront: null,
          IdBack: null,
        });
      } else {
        toast({
          title: "Error",
          description: error.message || "An error occurred while registering the landlord.",
          variant: "destructive",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const removeFile = (fileType: 'PassportPhoto' | 'IdFront' | 'IdBack') => {
    setFormData((prev) => ({ ...prev, [fileType]: null }));
    setPreviewUrls(prev => ({ ...prev, [fileType]: null }));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="max-w-3xl mx-auto"
    >
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Register Landlord</h1>
          <p className="text-muted-foreground mt-1">
            Add a new landlord to the property management system
          </p>
        </div>
      </div>

      <div className="glass-card p-6 rounded-xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Full Name</label>
              <input
                type="text"
                name="FullName"
                value={formData.FullName}
                onChange={handleInputChange}
                className="input-field"
                placeholder="Enter landlord's full name"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Phone Number</label>
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
              <label className="text-sm font-medium">Email</label>
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
            <div className="md:col-span-2 space-y-4">
              <label className="text-sm font-medium">Identification Type</label>
              <div className="flex flex-wrap gap-4">
                {idTypes.map((type) => (
                  <label key={type.value} className="flex items-center space-x-2 cursor-pointer">
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
              <label className="text-sm font-medium">{getIdTypeLabel(formData.IdType)} Number</label>
              <input
                type="text"
                name="IdNumber"
                value={formData.IdNumber}
                onChange={handleInputChange}
                className="input-field w-full"
                placeholder={`Enter ${getIdTypeLabel(formData.IdType).toLowerCase()} number`}
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
                className="border-2 border-dashed rounded-xl p-4 transition-colors h-40 flex items-center justify-center hover:border-primary"
                onDragOver={(e) => e.preventDefault()}
                onDragLeave={(e) => e.preventDefault()}
                onDrop={(e) => handleDrop(e, 'PassportPhoto')}
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
                      onClick={() => removeFile('PassportPhoto')}
                      className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="text-center">
                    <Upload className="mx-auto h-8 w-8 text-gray-400" />
                    <div className="mt-2 text-xs">
                      <label className="cursor-pointer text-primary hover:text-primary/80">
                        Upload photo
                        <input
                          type="file"
                          className="sr-only"
                          accept="image/*"
                          onChange={(e) => handleFileChange(e, 'PassportPhoto')}
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
                {formData.IdType === "passport" ? "Passport Data Page" : `${getIdTypeLabel(formData.IdType)} Front`}
              </label>
              <div
                className="border-2 border-dashed rounded-xl p-4 transition-colors h-40 flex items-center justify-center hover:border-primary"
                onDragOver={(e) => e.preventDefault()}
                onDragLeave={(e) => e.preventDefault()}
                onDrop={(e) => handleDrop(e, 'IdFront')}
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
                      onClick={() => removeFile('IdFront')}
                      className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="text-center">
                    <Upload className="mx-auto h-8 w-8 text-gray-400" />
                    <div className="mt-2 text-xs">
                      <label className="cursor-pointer text-primary hover:text-primary/80">
                        Upload {formData.IdType === "passport" ? "page" : "front"}
                        <input
                          type="file"
                          className="sr-only"
                          accept="image/*"
                          onChange={(e) => handleFileChange(e, 'IdFront')}
                        />
                      </label>
                      <p>or drag and drop</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ID Document Back Upload - Only shown for National ID and Driving Permit */}
            {isBackSideRequired() && (
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center">
                  <CreditCard size={16} className="mr-1" />
                  {getIdTypeLabel(formData.IdType)} Back
                </label>
                <div
                  className="border-2 border-dashed rounded-xl p-4 transition-colors h-40 flex items-center justify-center hover:border-primary"
                  onDragOver={(e) => e.preventDefault()}
                  onDragLeave={(e) => e.preventDefault()}
                  onDrop={(e) => handleDrop(e, 'IdBack')}
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
                        onClick={() => removeFile('IdBack')}
                        className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <div className="text-center">
                      <Upload className="mx-auto h-8 w-8 text-gray-400" />
                      <div className="mt-2 text-xs">
                        <label className="cursor-pointer text-primary hover:text-primary/80">
                          Upload back
                          <input
                            type="file"
                            className="sr-only"
                            accept="image/*"
                            onChange={(e) => handleFileChange(e, 'IdBack')}
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

          <div className="flex justify-end space-x-4">
            <Button type="button" variant="secondary">
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Registering..." : "Register Landlord"}
            </Button>
          </div>
        </form>
      </div>
    </motion.div>
  );
};

export default RegisterLandlord;