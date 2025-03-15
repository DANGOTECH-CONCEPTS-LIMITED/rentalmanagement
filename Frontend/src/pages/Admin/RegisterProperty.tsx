import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
import { Upload, X, ImageIcon } from "lucide-react";

interface PropertyPhoto {
  file: File;
  preview: string;
}

const RegisterProperty = () => {
  const [formData, setFormData] = useState({
    propertyName: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    propertyType: "",
    numberOfUnits: "",
    description: "",
    landlordId: "",
  });

  const [propertyPhotos, setPropertyPhotos] = useState<PropertyPhoto[]>([]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    if (propertyPhotos.length + files.length > 3) {
      toast({
        title: "Upload limit exceeded",
        description: "You can only upload a maximum of 3 photos.",
        variant: "destructive",
      });
      return;
    }

    const newPhotos: PropertyPhoto[] = [];

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        newPhotos.push({
          file,
          preview: reader.result as string
        });
        
        // Only update state once all files are processed
        if (newPhotos.length === files.length) {
          setPropertyPhotos(prev => [...prev, ...newPhotos]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removePhoto = (index: number) => {
    setPropertyPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (propertyPhotos.length === 0) {
      toast({
        title: "Photos Required",
        description: "Please upload at least one property photo.",
        variant: "destructive",
      });
      return;
    }
    
    console.log("Property registration data:", formData);
    console.log("Property photos:", propertyPhotos);
    
    toast({
      title: "Property Registered",
      description: `Successfully registered property: ${formData.propertyName}`,
    });
    
    // Reset form
    setFormData({
      propertyName: "",
      address: "",
      city: "",
      state: "",
      zipCode: "",
      propertyType: "",
      numberOfUnits: "",
      description: "",
      landlordId: "",
    });
    setPropertyPhotos([]);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Register New Property</h1>
        <p className="text-muted-foreground">Add a new property to the management system</p>
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="propertyName">Property Name</Label>
              <Input 
                id="propertyName" 
                name="propertyName" 
                value={formData.propertyName}
                onChange={handleInputChange}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="propertyType">Property Type</Label>
              <Select
                value={formData.propertyType}
                onValueChange={(value) => handleSelectChange("propertyType", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select property type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="apartment">Apartment</SelectItem>
                  <SelectItem value="house">House</SelectItem>
                  <SelectItem value="condo">Condominium</SelectItem>
                  <SelectItem value="commercial">Commercial</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Street Address</Label>
              <Input 
                id="address" 
                name="address" 
                value={formData.address}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input 
                id="city" 
                name="city" 
                value={formData.city}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Input 
                id="state" 
                name="state" 
                value={formData.state}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="zipCode">ZIP Code</Label>
              <Input 
                id="zipCode" 
                name="zipCode" 
                value={formData.zipCode}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="numberOfUnits">Number of Units</Label>
              <Input 
                id="numberOfUnits" 
                name="numberOfUnits" 
                type="number"
                value={formData.numberOfUnits}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="landlordId">Landlord ID</Label>
              <Input 
                id="landlordId" 
                name="landlordId" 
                value={formData.landlordId}
                onChange={handleInputChange}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Property Photos (Maximum 3)</Label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Property Photos Upload Area */}
              {propertyPhotos.map((photo, index) => (
                <div key={index} className="relative h-40 border rounded-md overflow-hidden">
                  <img src={photo.preview} alt={`Property ${index + 1}`} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removePhoto(index)}
                    className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}

              {/* Upload Button - Only show if less than 3 photos */}
              {propertyPhotos.length < 3 && (
                <div className="flex items-center justify-center h-40 border-2 border-dashed rounded-md hover:border-primary transition-colors">
                  <label className="flex flex-col items-center justify-center w-full h-full cursor-pointer">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <ImageIcon className="w-10 h-10 mb-3 text-gray-400" />
                      <p className="mb-2 text-sm text-gray-500">
                        <span className="font-semibold">Click to upload</span> or drag and drop
                      </p>
                      <p className="text-xs text-gray-500">PNG, JPG, WEBP (MAX. 3)</p>
                    </div>
                    <input 
                      type="file" 
                      className="hidden" 
                      accept="image/*" 
                      multiple
                      onChange={handlePhotoUpload} 
                    />
                  </label>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Property Description</Label>
            <Textarea 
              id="description" 
              name="description" 
              value={formData.description}
              onChange={handleInputChange}
              rows={4}
            />
          </div>

          <div className="flex justify-end">
            <Button type="submit">Register Property</Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default RegisterProperty;
