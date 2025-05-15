import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  UserPlus,
  User,
  Mail,
  Phone,
  Home,
  Calendar,
  Key,
  Check,
  Upload,
  X,
  Camera,
  CreditCard,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

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
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoadingProperties, setIsLoadingProperties] = useState(true);

  const [passportPhoto, setPassportPhoto] = useState<File | null>(null);
  const [passportPhotoPreview, setPassportPhotoPreview] = useState<
    string | null
  >(null);

  const [idFrontPhoto, setIdFrontPhoto] = useState<File | null>(null);
  const [idFrontPhotoPreview, setIdFrontPhotoPreview] = useState<string | null>(
    null
  );

  const [idBackPhoto, setIdBackPhoto] = useState<File | null>(null);
  const [idBackPhotoPreview, setIdBackPhotoPreview] = useState<string | null>(
    null
  );

  const user = localStorage.getItem("user");
  let token = "";
  const userData = JSON.parse(user);
  try {
    if (user) {
      token = userData.token;
    } else {
      console.error("No user found in localStorage");
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
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        const filteredData = data.filter(
          (property: any) => property.ownerId === userData?.id
        );
        setProperties(filteredData);
      } catch (error) {
        console.error("Error fetching properties:", error);
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      } finally {
        setIsLoadingProperties(false);
      }
    };

    if (token) {
      fetchProperties();
    }
  }, [toast, token]);

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

      // Format date to match expected API format
      const moveDateObj = new Date(formData.DateMovedIn);
      const formattedDate = moveDateObj.toISOString();

      form.append("FullName", formData.FullName);
      form.append("Name", formData.Name || formData.FullName);
      form.append("Email", formData.Email);
      form.append("PhoneNumber", formData.PhoneNumber);
      form.append("NationalIdNumber", formData.NationalIdNumber);
      form.append("DateMovedIn", formattedDate);
      form.append("PropertyId", formData.PropertyId);
      form.append("Password", formData.Password);
      form.append("Active", formData.Active);

      form.append("PassportPhoto", passportPhoto);
      form.append("IdFront", idFrontPhoto);
      form.append("IdBack", idBackPhoto);

      form.append("files", passportPhoto);
      form.append("files", idFrontPhoto);
      form.append("files", idBackPhoto);

      const response = await fetch(`${apiUrl}/CreateTenant`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "*/*",
        },
        body: form,
      });

      // First check if the response status is OK
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Error response:", response.status, errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Check the content type of the response
      const contentType = response.headers.get("content-type");
      let responseData;

      if (contentType && contentType.includes("application/json")) {
        // If it's JSON, parse it as JSON
        responseData = await response.json();
        console.log("Success response (JSON):", responseData);
      } else {
        // If it's not JSON, get it as text
        responseData = await response.text();
        console.log("Success response (text):", responseData);
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
          FullName: "",
          Name: "",
          Email: "",
          PhoneNumber: "",
          NationalIdNumber: "",
          DateMovedIn: "",
          PropertyId: "",
          Password: "",
          Active: "true",
        });
        clearFile("PassportPhoto");
        clearFile("IdFront");
        clearFile("IdBack");
        setIsSuccess(false);
      }, 3000);
    } catch (error) {
      console.error("Error submitting form:", error);
      setIsSubmitting(false);

      toast({
        title: "Registration Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/#/landlord-dashboard/manage-tenants">
              Tenants
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Register Tenants</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">
          Register New Tenant
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <UserPlus className="mr-2 h-5 w-5" />
            Tenant Registration Form
          </CardTitle>
          <CardDescription>
            Enter the tenant's details below to register them to one of your
            properties
          </CardDescription>
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
                Tenant Registered Successfully!
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
                    <p className="text-sm text-gray-500">
                      Loading properties...
                    </p>
                  )}
                </div>
                {/* 
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Temporary Password
                  </label>
                  <Input
                    name="Password"
                    type="password"
                    value={formData.Password}
                    onChange={handleInputChange}
                    placeholder="Create temporary password"
                    required
                  />
                </div> */}
              </div>

              {/* Document Upload Section */}
              <div className="pt-4">
                <h3 className="font-medium mb-4">Identification Documents</h3>
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
                                onChange={(e) => handleFileChange(e, "IdFront")}
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
                                onChange={(e) => handleFileChange(e, "IdBack")}
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

              <div className="pt-4 flex justify-end space-x-4">
                <Button variant="outline" type="button">
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Registering..." : "Register Tenant"}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default RegisterTenants;
