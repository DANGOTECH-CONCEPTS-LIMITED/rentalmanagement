import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { UserPlus, User, Mail, Phone, Home, Calendar, Key, Check, Upload, X, Camera, CreditCard } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { useToast } from '@/hooks/use-toast';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

interface Property {
  id: number;
  name: string;
  address: string;
}

const RegisterTenants = () => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    FullName: '',
    Email: '',
    PhoneNumber: '',
    NationalIdNumber: '',
    DateMovedIn: '',
    PropertyId: '',
    Password: '',
    Active: 'true',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoadingProperties, setIsLoadingProperties] = useState(true);

  // Document upload state
  const [passportPhoto, setPassportPhoto] = useState<File | null>(null);
  const [idFrontPhoto, setIdFrontPhoto] = useState<File | null>(null);
  const [idBackPhoto, setIdBackPhoto] = useState<File | null>(null);

  useEffect(() => {
    const fetchProperties = async () => {
      try {
        const token = localStorage.getItem('token') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhYmlvbmF0bGluZUBnbWFpbC5jb20iLCJqdGkiOiIzNjMxMWE2My1lZTMwLTRjMmUtYjE5YS1mYmE0YThiNzZiNWQiLCJleHAiOjE3NDQ3Mzc0NDUsImlzcyI6IkRBTkdPVEVDSCBDT05DRVBUUyBMSU1JVEVEIiwiYXVkIjoiTllVTUJBWU8gQ0xJRU5UUyJ9.n5h_AyOTZfwZa0i2J2BkvmqbiZfB0ZNq8eGAyJWIXhQ';
        const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://3.216.182.63:8091';

        const response = await fetch(`${apiUrl}/GetAllProperties`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        setProperties(data);
      } catch (error) {
        console.error('Error fetching properties:', error);
        toast({
          title: "Error",
          description: "Failed to fetch properties",
          variant: "destructive",
        });
      } finally {
        setIsLoadingProperties(false);
      }
    };

    fetchProperties();
  }, [toast]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'PassportPhoto' | 'IdFront' | 'IdBack') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (type === 'PassportPhoto') {
      setPassportPhoto(file);
    } else if (type === 'IdFront') {
      setIdFrontPhoto(file);
    } else if (type === 'IdBack') {
      setIdBackPhoto(file);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
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
      const token = localStorage.getItem('token') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhYmlvbmF0bGluZUBnbWFpbC5jb20iLCJqdGkiOiIzNjMxMWE2My1lZTMwLTRjMmUtYjE5YS1mYmE0YThiNzZiNWQiLCJleHAiOjE3NDQ3Mzc0NDUsImlzcyI6IkRBTkdPVEVDSCBDT05DRVBUUyBMSU1JVEVEIiwiYXVkIjoiTllVTUJBWU8gQ0xJRU5UUyJ9.n5h_AyOTZfwZa0i2J2BkvmqbiZfB0ZNq8eGAyJWIXhQ';
      const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://3.216.182.63:8091';

      const form = new FormData();
      
      // Append all form fields
      Object.entries(formData).forEach(([key, value]) => {
        form.append(key, value);
      });
      
      // Append files with exact field names from API
      form.append('PassportPhoto', passportPhoto);
      form.append('IdFront', idFrontPhoto);
      form.append('IdBack', idBackPhoto);
      
      // Append files array (if needed by backend)
      form.append('files', passportPhoto);
      form.append('files', idFrontPhoto);
      form.append('files', idBackPhoto);

      const response = await fetch(`${apiUrl}/api/Tenant/CreateTenant`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': '*/*',
        },
        body: form,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
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
          FullName: '',
          Email: '',
          PhoneNumber: '',
          NationalIdNumber: '',
          DateMovedIn: '',
          PropertyId: '',
          Password: '',
          Active: 'true',
        });
        setPassportPhoto(null);
        setIdFrontPhoto(null);
        setIdBackPhoto(null);
        setIsSuccess(false);
      }, 3000);

    } catch (error) {
      console.error('Error submitting form:', error);
      setIsSubmitting(false);
      
      toast({
        title: "Registration Failed",
        description: "There was an error registering the tenant. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/landlord-dashboard">Dashboard</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Register Tenants</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Register New Tenant</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <UserPlus className="mr-2 h-5 w-5" />
            Tenant Registration Form
          </CardTitle>
          <CardDescription>
            Enter the tenant's details below to register them to one of your properties
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
              <h3 className="text-xl font-semibold mb-2">Tenant Registered Successfully!</h3>
              <p className="text-gray-600 max-w-md mb-4">
                An email has been sent to {formData.Email} with login instructions.
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
                    {properties.map(prop => (
                      <option key={prop.id} value={prop.id}>
                        {prop.name} - {prop.address}
                      </option>
                    ))}
                  </select>
                  {isLoadingProperties && (
                    <p className="text-sm text-gray-500">Loading properties...</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Temporary Password</label>
                  <Input
                    name="Password"
                    type="password"
                    value={formData.Password}
                    onChange={handleInputChange}
                    placeholder="Create temporary password"
                    required
                  />
                </div>
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
                          <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded-md">
                            <span className="text-sm text-gray-500">Passport photo selected</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setPassportPhoto(null)}
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
                                onChange={(e) => handleFileChange(e, 'PassportPhoto')}
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
                          <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded-md">
                            <span className="text-sm text-gray-500">ID front selected</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setIdFrontPhoto(null)}
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
                                onChange={(e) => handleFileChange(e, 'IdFront')}
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
                          <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded-md">
                            <span className="text-sm text-gray-500">ID back selected</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setIdBackPhoto(null)}
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
                                onChange={(e) => handleFileChange(e, 'IdBack')}
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