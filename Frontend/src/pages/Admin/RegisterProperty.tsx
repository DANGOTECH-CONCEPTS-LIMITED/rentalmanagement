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
    Name: "",
    Address: "",
    Region: "",
    District: "",
    Zipcode: "",
    Type: "",
    NumberOfRooms: "0",
    Description: "",
    OwnerId: "0",
    Price: "0",
    Occupied: "true"
  });

  const [propertyPhotos, setPropertyPhotos] = useState<PropertyPhoto[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (propertyPhotos.length === 0) {
      toast({
        title: "Photos Required",
        description: "Please upload at least one property photo.",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const formDataToSend = new FormData();
      
      // Append all form fields
      Object.entries(formData).forEach(([key, value]) => {
        formDataToSend.append(key, value);
      });
      
      // Append each photo file
      propertyPhotos.forEach(photo => {
        formDataToSend.append('files', photo.file);
      });
      
      const response = await fetch('http://3.216.182.63:8091/AddProperty', {
        method: 'POST',
        body: formDataToSend,
        // Headers are not needed when using FormData, the browser will set them automatically
      });
      
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      
      const result = await response.json();
      
      toast({
        title: "Property Registered",
        description: `Successfully registered property: ${formData.Name}`,
      });
      
      // Reset form
      setFormData({
        Name: "",
        Address: "",
        Region: "",
        District: "",
        Zipcode: "",
        Type: "",
        NumberOfRooms: "0",
        Description: "",
        OwnerId: "0",
        Price: "0",
        Occupied: "true"
      });
      setPropertyPhotos([]);
      
    } catch (error) {
      console.error('Error submitting form:', error);
      toast({
        title: "Error",
        description: "Failed to register property. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
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
              <Label htmlFor="Name">Property Name</Label>
              <Input 
                id="Name" 
                name="Name" 
                value={formData.Name}
                onChange={handleInputChange}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="Type">Property Type</Label>
              <Select
                value={formData.Type}
                onValueChange={(value) => handleSelectChange("Type", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select property type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Apartment">Apartment</SelectItem>
                  <SelectItem value="House">House</SelectItem>
                  <SelectItem value="Condo">Condominium</SelectItem>
                  <SelectItem value="Commercial">Commercial</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="Address">Street Address</Label>
              <Input 
                id="Address" 
                name="Address" 
                value={formData.Address}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="District">District</Label>
              <Input 
                id="District" 
                name="District" 
                value={formData.District}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="Region">Region</Label>
              <Input 
                id="Region" 
                name="Region" 
                value={formData.Region}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="Zipcode">ZIP Code</Label>
              <Input 
                id="Zipcode" 
                name="Zipcode" 
                value={formData.Zipcode}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="NumberOfRooms">Number of Rooms</Label>
              <Input 
                id="NumberOfRooms" 
                name="NumberOfRooms" 
                type="number"
                min="0"
                value={formData.NumberOfRooms}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="OwnerId">Owner ID</Label>
              <Input 
                id="OwnerId" 
                name="OwnerId" 
                type="number"
                min="0"
                value={formData.OwnerId}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="Price">Price</Label>
              <Input 
                id="Price" 
                name="Price" 
                type="number"
                min="0"
                value={formData.Price}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="Occupied">Occupied Status</Label>
              <Select
                value={formData.Occupied}
                onValueChange={(value) => handleSelectChange("Occupied", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select occupancy status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Occupied</SelectItem>
                  <SelectItem value="false">Vacant</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Property Photos (Maximum 3)</Label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
            <Label htmlFor="Description">Property Description</Label>
            <Textarea 
              id="Description" 
              name="Description" 
              value={formData.Description}
              onChange={handleInputChange}
              rows={4}
            />
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Registering..." : "Register Property"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default RegisterProperty;