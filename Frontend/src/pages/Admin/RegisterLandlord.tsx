import { useState } from "react";
import { motion } from "framer-motion";
import { Upload, X, CheckCircle, Camera, CreditCard } from "lucide-react";
import Button from "../../components/ui/button/Button";
import { toast } from "@/components/ui/use-toast";

interface LandlordFormData {
  name: string;
  phoneNumber: string;
  email: string;
  nationalId: string;
  isValidated: boolean;
  passportPhoto: File | null;
  nationalIdFront: File | null;
  nationalIdBack: File | null;
  propertiesOwned: string[];
}

const RegisterLandlord = () => {
  const [formData, setFormData] = useState<LandlordFormData>({
    name: "",
    phoneNumber: "",
    email: "",
    nationalId: "",
    isValidated: false,
    passportPhoto: null,
    nationalIdFront: null,
    nationalIdBack: null,
    propertiesOwned: [],
  });

  const [previewUrls, setPreviewUrls] = useState({
    passportPhoto: null as string | null,
    nationalIdFront: null as string | null,
    nationalIdBack: null as string | null,
  });
  
  const [isValidating, setIsValidating] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    
    // Reset validation when national ID changes
    if (name === "nationalId") {
      setFormData(prev => ({ ...prev, isValidated: false }));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, fileType: 'passportPhoto' | 'nationalIdFront' | 'nationalIdBack') => {
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

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, fileType: 'passportPhoto' | 'nationalIdFront' | 'nationalIdBack') => {
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

  const validateNationalId = () => {
    setIsValidating(true);
    
    // Simulate API call for validation
    setTimeout(() => {
      setIsValidating(false);
      setFormData(prev => ({ ...prev, isValidated: true }));
      
      toast({
        title: "ID Validated",
        description: "National ID has been successfully validated.",
        variant: "default",
      });
    }, 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if validated
    if (!formData.isValidated) {
      toast({
        title: "Validation Required",
        description: "Please validate the National ID before proceeding.",
        variant: "destructive",
      });
      return;
    }
    
    // Check if all required files are uploaded
    if (!formData.passportPhoto || !formData.nationalIdFront || !formData.nationalIdBack) {
      toast({
        title: "Missing Documents",
        description: "Please upload all required identification documents.",
        variant: "destructive",
      });
      return;
    }
    
    // Handle form submission
    console.log(formData);
    
    toast({
      title: "Landlord Registered",
      description: `${formData.name} has been successfully registered.`,
    });
  };

  const removeFile = (fileType: 'passportPhoto' | 'nationalIdFront' | 'nationalIdBack') => {
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
                name="name"
                value={formData.name}
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
                name="phoneNumber"
                value={formData.phoneNumber}
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
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="input-field"
                placeholder="Enter email address"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">National ID</label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  name="nationalId"
                  value={formData.nationalId}
                  onChange={handleInputChange}
                  className="input-field flex-1"
                  placeholder="Enter national ID number"
                  required
                />
                <Button 
                  type="button" 
                  onClick={validateNationalId} 
                  disabled={isValidating || formData.isValidated || !formData.nationalId}
                  className="whitespace-nowrap"
                >
                  {isValidating ? "Validating..." : formData.isValidated ? "Validated ✓" : "Validate"}
                </Button>
              </div>
              {formData.isValidated && (
                <div className="flex items-center text-green-500 text-sm mt-1">
                  <CheckCircle size={14} className="mr-1" />
                  ID Validated Successfully
                </div>
              )}
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
                onDrop={(e) => handleDrop(e, 'passportPhoto')}
              >
                {previewUrls.passportPhoto ? (
                  <div className="relative w-full h-full">
                    <img
                      src={previewUrls.passportPhoto}
                      alt="Passport Preview"
                      className="w-full h-full object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => removeFile('passportPhoto')}
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
                          onChange={(e) => handleFileChange(e, 'passportPhoto')}
                        />
                      </label>
                      <p>or drag and drop</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* National ID Front Upload */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center">
                <CreditCard size={16} className="mr-1" />
                ID Front Side
              </label>
              <div
                className="border-2 border-dashed rounded-xl p-4 transition-colors h-40 flex items-center justify-center hover:border-primary"
                onDragOver={(e) => e.preventDefault()}
                onDragLeave={(e) => e.preventDefault()}
                onDrop={(e) => handleDrop(e, 'nationalIdFront')}
              >
                {previewUrls.nationalIdFront ? (
                  <div className="relative w-full h-full">
                    <img
                      src={previewUrls.nationalIdFront}
                      alt="ID Front Preview"
                      className="w-full h-full object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => removeFile('nationalIdFront')}
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
                        Upload front
                        <input
                          type="file"
                          className="sr-only"
                          accept="image/*"
                          onChange={(e) => handleFileChange(e, 'nationalIdFront')}
                        />
                      </label>
                      <p>or drag and drop</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* National ID Back Upload */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center">
                <CreditCard size={16} className="mr-1" />
                ID Back Side
              </label>
              <div
                className="border-2 border-dashed rounded-xl p-4 transition-colors h-40 flex items-center justify-center hover:border-primary"
                onDragOver={(e) => e.preventDefault()}
                onDragLeave={(e) => e.preventDefault()}
                onDrop={(e) => handleDrop(e, 'nationalIdBack')}
              >
                {previewUrls.nationalIdBack ? (
                  <div className="relative w-full h-full">
                    <img
                      src={previewUrls.nationalIdBack}
                      alt="ID Back Preview"
                      className="w-full h-full object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => removeFile('nationalIdBack')}
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
                          onChange={(e) => handleFileChange(e, 'nationalIdBack')}
                        />
                      </label>
                      <p>or drag and drop</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-4">
            <Button type="button" variant="secondary">
              Cancel
            </Button>
            <Button type="submit">Register Landlord</Button>
          </div>
        </form>
      </div>
    </motion.div>
  );
};

export default RegisterLandlord;
