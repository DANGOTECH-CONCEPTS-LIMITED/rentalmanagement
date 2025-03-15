import { useState } from 'react';
import { motion } from 'framer-motion';
import { UserPlus, User, Mail, Phone, Home, Calendar, Key, Check, Upload, X, Camera, CreditCard } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { useToast } from '@/hooks/use-toast';

const RegisterTenants = () => {
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [moveInDate, setMoveInDate] = useState('');
  const [property, setProperty] = useState('');
  const [rentAmount, setRentAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // New state for validation and document upload
  const [isValidating, setIsValidating] = useState(false);
  const [isValidated, setIsValidated] = useState(false);
  const [passportPhoto, setPassportPhoto] = useState<File | null>(null);
  const [passportPhotoPreview, setPassportPhotoPreview] = useState<string | null>(null);
  const [idFrontPhoto, setIdFrontPhoto] = useState<File | null>(null);
  const [idFrontPhotoPreview, setIdFrontPhotoPreview] = useState<string | null>(null);
  const [idBackPhoto, setIdBackPhoto] = useState<File | null>(null);
  const [idBackPhotoPreview, setIdBackPhotoPreview] = useState<string | null>(null);

  const properties = [
    { id: 'prop1', name: 'Sunset Apartments - Unit 101' },
    { id: 'prop2', name: 'Sunset Apartments - Unit 102' },
    { id: 'prop3', name: 'Bayview Condos - Unit 305' },
    { id: 'prop4', name: 'Westside Heights - Unit 210' },
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'passport' | 'idFront' | 'idBack') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      
      if (type === 'passport') {
        setPassportPhoto(file);
        setPassportPhotoPreview(result);
      } else if (type === 'idFront') {
        setIdFrontPhoto(file);
        setIdFrontPhotoPreview(result);
      } else if (type === 'idBack') {
        setIdBackPhoto(file);
        setIdBackPhotoPreview(result);
      }
    };
    reader.readAsDataURL(file);
  };

  const removePhoto = (type: 'passport' | 'idFront' | 'idBack') => {
    if (type === 'passport') {
      setPassportPhoto(null);
      setPassportPhotoPreview(null);
    } else if (type === 'idFront') {
      setIdFrontPhoto(null);
      setIdFrontPhotoPreview(null);
    } else if (type === 'idBack') {
      setIdBackPhoto(null);
      setIdBackPhotoPreview(null);
    }
  };

  const validateId = () => {
    if (!idNumber) {
      toast({
        title: "Validation Error",
        description: "Please enter an ID number to validate",
        variant: "destructive",
      });
      return;
    }

    setIsValidating(true);
    
    // Simulate API call for validation
    setTimeout(() => {
      setIsValidating(false);
      setIsValidated(true);
      
      toast({
        title: "ID Validated",
        description: "National ID has been successfully validated.",
        variant: "default",
      });
    }, 2000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    if (!isValidated) {
      toast({
        title: "Validation Required",
        description: "Please validate the National ID before proceeding.",
        variant: "destructive",
      });
      return;
    }

    if (!passportPhoto || !idFrontPhoto || !idBackPhoto) {
      toast({
        title: "Missing Documents",
        description: "Please upload all required identification documents.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSuccess(true);
      
      toast({
        title: "Tenant Registered Successfully",
        description: `${name} has been registered as a tenant.`,
        variant: "default",
      });
      
      // Reset form after some time
      setTimeout(() => {
        setName('');
        setEmail('');
        setPhone('');
        setIdNumber('');
        setMoveInDate('');
        setProperty('');
        setRentAmount('');
        setIsValidated(false);
        setPassportPhoto(null);
        setPassportPhotoPreview(null);
        setIdFrontPhoto(null);
        setIdFrontPhotoPreview(null);
        setIdBackPhoto(null);
        setIdBackPhotoPreview(null);
        setIsSuccess(false);
      }, 3000);
    }, 1500);
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
                An email has been sent to {email} with login instructions for the tenant portal.
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
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
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
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
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
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Enter tenant's phone number"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    <span className="flex items-center">
                      <Key className="mr-1 h-4 w-4" />
                      ID Number
                    </span>
                  </label>
                  <div className="flex space-x-2">
                    <Input
                      type="text"
                      value={idNumber}
                      onChange={(e) => {
                        setIdNumber(e.target.value);
                        setIsValidated(false);
                      }}
                      placeholder="Enter tenant's ID number"
                      required
                      className="flex-1"
                    />
                    <Button 
                      type="button" 
                      onClick={validateId} 
                      disabled={isValidating || isValidated || !idNumber}
                      className="whitespace-nowrap"
                    >
                      {isValidating ? "Validating..." : isValidated ? "Validated ✓" : "Validate"}
                    </Button>
                  </div>
                  {isValidated && (
                    <div className="flex items-center text-green-500 text-sm mt-1">
                      <Check size={14} className="mr-1" />
                      ID Validated Successfully
                    </div>
                  )}
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    <span className="flex items-center">
                      <Calendar className="mr-1 h-4 w-4" />
                      Move-in Date
                    </span>
                  </label>
                  <Input
                    type="date"
                    value={moveInDate}
                    onChange={(e) => setMoveInDate(e.target.value)}
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
                    className="w-full p-2 border border-gray-300 rounded-md"
                    value={property}
                    onChange={(e) => setProperty(e.target.value)}
                    required
                  >
                    <option value="">Select a property</option>
                    {properties.map(prop => (
                      <option key={prop.id} value={prop.id}>{prop.name}</option>
                    ))}
                  </select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Rent Amount</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2">USh</span>
                    <Input
                      type="number"
                      className="pl-12"
                      value={rentAmount}
                      onChange={(e) => setRentAmount(e.target.value)}
                      placeholder="Enter monthly rent amount"
                      required
                    />
                  </div>
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
                      {passportPhotoPreview ? (
                        <div className="relative w-full h-full">
                          <img 
                            src={passportPhotoPreview} 
                            alt="Passport Preview" 
                            className="w-full h-full object-cover rounded-md"
                          />
                          <button
                            type="button"
                            onClick={() => removePhoto('passport')}
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
                                onChange={(e) => handleFileChange(e, 'passport')}
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
                      {idFrontPhotoPreview ? (
                        <div className="relative w-full h-full">
                          <img 
                            src={idFrontPhotoPreview} 
                            alt="ID Front Preview" 
                            className="w-full h-full object-cover rounded-md"
                          />
                          <button
                            type="button"
                            onClick={() => removePhoto('idFront')}
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
                                onChange={(e) => handleFileChange(e, 'idFront')}
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
                      {idBackPhotoPreview ? (
                        <div className="relative w-full h-full">
                          <img 
                            src={idBackPhotoPreview} 
                            alt="ID Back Preview" 
                            className="w-full h-full object-cover rounded-md"
                          />
                          <button
                            type="button"
                            onClick={() => removePhoto('idBack')}
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
                                onChange={(e) => handleFileChange(e, 'idBack')}
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
