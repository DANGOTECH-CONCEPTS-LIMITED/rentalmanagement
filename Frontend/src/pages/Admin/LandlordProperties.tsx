"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  House,
  Search,
  Eye,
  Edit,
  Trash,
  X,
  ImageIcon,
  Upload,
  XIcon,
} from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Property {
  ownerId: string | Blob;
  id: number;
  name: string;
  type: string;
  address: string;
  region: string;
  district: string;
  zipcode: string;
  numberOfRooms: number;
  description: string;
  imageUrl: string;
  price: number;
  currency: string;
  occupied: boolean;
  owner: {
    id: number;
    fullName: string;
    email: string;
    phoneNumber: string;
  };
}

interface PropertyPhoto {
  file: File;
  preview: string;
}

interface Landlord {
  id: number;
  fullName: string;
  email: string;
  phoneNumber: string;
  passportPhoto: string;
  nationalIdNumber: string;
  systemRoleId: number;
  systemRole: {
    id: number;
    name: string;
    description: string;
  };
}

const propertyTypes = [
  "Apartment",
  "House",
  "Villa",
  "Condo",
  "Townhouse",
  "Commercial",
];

const LandlordProperties = () => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(
    null
  );
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [propertyPhotos, setPropertyPhotos] = useState<PropertyPhoto[]>([]);
  const [landlords, setLandlords] = useState<Landlord[]>([]);
  const [isLoadingLandlords, setIsLoadingLandlords] = useState(false);

  const user = localStorage.getItem("user") || null;

  const token = JSON.parse(user).token;
  if (!token) {
    toast({
      title: "Error",
      description: "User token not found. Please log in again.",
      variant: "destructive",
    });
    return;
  }

  const apiUrl = import.meta.env.VITE_API_BASE_URL;

  const navigate = useNavigate();

  const handleNavigate = () => {
    navigate("/admin-dashboard/register-property");
  };

  useEffect(() => {
    fetchProperties();
    fetchLandlords();
  }, []);

  const fetchProperties = async () => {
    try {
      const response = await fetch(`${apiUrl}/GetAllProperties`, {
        method: "GET",
        headers: {
          accept: "*/*",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("Properties data:", data);
      setProperties(data);
      setError(null); // Clear any previous errors
    } catch (err) {
      console.error("Error fetching properties:", err);
      setError(
        err instanceof Error ? err.message : "Failed to fetch properties"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLandlords = async () => {
    setIsLoadingLandlords(true);
    try {
      const response = await fetch(`${apiUrl}/GetLandlords`, {
        method: "GET",
        headers: {
          accept: "*/*",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch landlords");
      }

      const data: Landlord[] = await response.json();
      setLandlords(data);
    } catch (error) {
      console.error("Error fetching landlords:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to fetch landlords",
        variant: "destructive",
      });
    } finally {
      setIsLoadingLandlords(false);
    }
  };

  const filteredProperties = properties.filter(
    (property) =>
      property.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      property.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      property.owner.fullName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDeleteProperty = async (id: number) => {
    try {
      const response = await fetch(`${apiUrl}/DeleteProperty/${id}`, {
        method: "DELETE",
        headers: {
          accept: "*/*",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to delete property");
      }

      setProperties((prev) => prev.filter((property) => property.id !== id));
      toast({
        title: "Success",
        description: "Property deleted successfully",
      });
    } catch (err) {
      console.error("Error deleting property:", err);
      toast({
        title: "Error",
        description:
          err instanceof Error ? err.message : "Failed to delete property",
        variant: "destructive",
      });
    }
  };

  const handleEditProperty = (property: Property) => {
    setEditingProperty(property);
    // Reset property photos when starting to edit
    setPropertyPhotos([]);
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

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        newPhotos.push({
          file,
          preview: reader.result as string,
        });

        if (newPhotos.length === files.length) {
          setPropertyPhotos((prev) => [...prev, ...newPhotos]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removePhoto = (index: number) => {
    setPropertyPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProperty) return;

    setIsSubmitting(true);
    try {
      const formDataToSend = new FormData();

      formDataToSend.append("Id", editingProperty.id.toString());
      formDataToSend.append("Price", editingProperty.price.toString());
      formDataToSend.append("Name", editingProperty.name);
      formDataToSend.append("Zipcode", editingProperty.zipcode);
      formDataToSend.append("OwnerId", editingProperty.ownerId);
      formDataToSend.append("Owner", editingProperty.ownerId);
      formDataToSend.append("District", editingProperty.district);
      formDataToSend.append("Currency", editingProperty.currency);
      formDataToSend.append("Region", editingProperty.region);
      formDataToSend.append("Address", editingProperty.address);
      formDataToSend.append(
        "NumberOfRooms",
        editingProperty.numberOfRooms.toString()
      );
      formDataToSend.append("Type", editingProperty.type);
      formDataToSend.append("Description", editingProperty.description);
      formDataToSend.append(
        "Occupied",
        editingProperty.occupied ? "true" : "false"
      );

      propertyPhotos.forEach((photo, index) => {
        formDataToSend.append("files", photo.file);
      });

      const response = await fetch(`${apiUrl}/UpdateProperty`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formDataToSend,
      });
      console.log("response", response);
      if (!response.ok) {
        throw new Error("Failed to update property");
      }

      // Update the properties list with the edited property
      setProperties((prev) =>
        prev.map((prop) =>
          prop.id === editingProperty.id ? editingProperty : prop
        )
      );

      setEditingProperty(null);
      setPropertyPhotos([]);

      toast({
        title: "Success",
        description: "Property updated successfully",
      });

      // Refresh the properties list to get the updated data
      fetchProperties();
    } catch (err) {
      console.error("Error updating property:", err);
      toast({
        title: "Error",
        description: "Failed to update property",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    if (!editingProperty) return;

    setEditingProperty((prev) => {
      if (!prev) return null;

      if (name === "price" || name === "numberOfRooms") {
        return { ...prev, [name]: Number(value) };
      }

      return { ...prev, [name]: value };
    });
  };

  const handleSelectChange = (name: string, value: string) => {
    if (!editingProperty) return;

    setEditingProperty((prev) => {
      if (!prev) return null;

      if (name === "OwnerId") {
        const selectedLandlord = landlords.find(
          (landlord) => landlord.id.toString() === value
        );
        if (selectedLandlord) {
          return {
            ...prev,
            owner: {
              id: selectedLandlord.id,
              fullName: selectedLandlord.fullName,
              email: selectedLandlord.email,
              phoneNumber: selectedLandlord.phoneNumber,
            },
          };
        }
        return prev;
      }

      if (name === "occupied") {
        return { ...prev, occupied: value === "true" };
      }

      return { ...prev, [name]: value };
    });
  };
  console.log(
    "url",
    `${selectedProperty?.imageUrl.split(/[/\\]/).pop() || ""}`
  );
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between p-4 sm:p-0">
        <div className="mb-4 sm:mb-0">
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">
            Landlord Properties
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            View and manage all properties registered in the system
          </p>
        </div>
        <Button
          onClick={handleNavigate}
          className="bg-gradient-to-r text-white from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
        >
          Add New Property
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="mb-6 flex items-center relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by property name, address, or landlord..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {error ? (
            <div className="py-8 text-center text-red-500">
              <p className="font-medium">Error retrieving properties</p>
              <p className="text-sm mt-1">{error}</p>
            </div>
          ) : isLoading ? (
            <div className="flex justify-center items-center py-10">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div>
            </div>
          ) : filteredProperties.length === 0 ? (
            <div className="py-8 flex flex-col items-center justify-center text-center">
              <House className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No properties found</h3>
              <p className="text-muted-foreground mt-1">
                {searchTerm
                  ? "Try adjusting your search query"
                  : "Start by adding a new property"}
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Property Name</TableHead>
                    <TableHead className="hidden md:table-cell">
                      Address
                    </TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="hidden md:table-cell">
                      Rooms
                    </TableHead>
                    <TableHead>Landlord</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProperties.map((property) => (
                    <TableRow key={property.id}>
                      <TableCell className="font-medium">
                        {property.name}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {property.address}
                      </TableCell>
                      <TableCell>{property.type}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        {property.numberOfRooms}
                      </TableCell>
                      <TableCell>{property.owner.fullName}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setSelectedProperty(property)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleEditProperty(property)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className="text-red-500"
                            onClick={() => handleDeleteProperty(property.id)}
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Property Dialog */}
      {selectedProperty && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-full sm:max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg sm:text-xl font-semibold">
                  {selectedProperty.name}
                </h2>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedProperty(null)}
                >
                  <XIcon className="h-4 w-4" />
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="mb-4">
                    <h3 className="text-sm sm:text-base font-medium text-gray-500">
                      Property Details
                    </h3>
                    <p className="mt-1">
                      <span className="font-medium">Address:</span>{" "}
                      {selectedProperty.address}
                    </p>
                    <p className="mt-1">
                      <span className="font-medium">Type:</span>{" "}
                      {selectedProperty.type}
                    </p>
                    <p className="mt-1">
                      <span className="font-medium">Rooms:</span>{" "}
                      {selectedProperty.numberOfRooms}
                    </p>
                    <p className="mt-1">
                      <span className="font-medium">Price:</span>{" "}
                      {selectedProperty.price} {selectedProperty.currency}
                    </p>
                    <p className="mt-1">
                      <span className="font-medium">Status:</span>{" "}
                      {selectedProperty.occupied ? "Occupied" : "Vacant"}
                    </p>
                    <p className="mt-1">
                      <span className="font-medium">Description:</span>{" "}
                      {selectedProperty.description}
                    </p>
                  </div>

                  <div>
                    <h3 className="text-sm sm:text-base font-medium text-gray-500">
                      Landlord Information
                    </h3>
                    <p className="mt-1">
                      <span className="font-medium">Name:</span>{" "}
                      {selectedProperty.owner.fullName}
                    </p>
                    <p className="mt-1">
                      <span className="font-medium">Email:</span>{" "}
                      {selectedProperty.owner.email}
                    </p>
                    <p className="mt-1">
                      <span className="font-medium">Phone:</span>{" "}
                      {selectedProperty.owner.phoneNumber}
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm sm:text-base font-medium text-gray-500 mb-2">
                    Property Image
                  </h3>
                  <img
                    src={`${apiUrl}/uploads/${
                      selectedProperty.imageUrl.split(/[/\\]/).pop() || ""
                    }`}
                    alt={selectedProperty.name}
                    className="rounded-md w-full h-64 object-cover"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:justify-end mt-6 space-y-2 sm:space-x-2 md:space-x-6 sm:space-y-0">
                <Button
                  variant="outline"
                  onClick={() => setSelectedProperty(null)}
                  className="w-full sm:w-auto"
                >
                  Close
                </Button>
                <Button
                  className="w-full sm:w-auto bg-green-700 text-white hover:bg-green-600"
                  onClick={() => {
                    // setSelectedProperty(null);
                    sessionStorage.setItem(
                      "propertyId",
                      selectedProperty.id.toString()
                    );
                    navigate("/admin-dashboard/transactions");
                  }}
                >
                  Property Transactions
                </Button>
                <Button
                  className="w-full sm:w-auto"
                  onClick={() => {
                    setSelectedProperty(null);
                    handleEditProperty(selectedProperty);
                  }}
                >
                  Edit Property
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Property Dialog - Using the same form as RegisterProperty */}
      {editingProperty && (
        <Dialog
          open={!!editingProperty}
          onOpenChange={() => setEditingProperty(null)}
        >
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Property</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmitEdit} className="grid gap-4 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Property Name*</Label>
                  <Input
                    id="name"
                    name="name"
                    value={editingProperty.name}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">Property Type*</Label>
                  <Select
                    value={editingProperty.type}
                    onValueChange={(value) => handleSelectChange("type", value)}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select property type" />
                    </SelectTrigger>
                    <SelectContent>
                      {propertyTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address*</Label>
                <Input
                  id="address"
                  name="address"
                  value={editingProperty.address}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="region">Region*</Label>
                  <Input
                    id="region"
                    name="region"
                    value={editingProperty.region}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="district">District*</Label>
                  <Input
                    id="district"
                    name="district"
                    value={editingProperty.district}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zipcode">Zip Code*</Label>
                  <Input
                    id="zipcode"
                    name="zipcode"
                    value={editingProperty.zipcode}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="numberOfRooms">Number of Rooms*</Label>
                  <Input
                    id="numberOfRooms"
                    name="numberOfRooms"
                    type="number"
                    min="0"
                    value={editingProperty.numberOfRooms}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="OwnerId">Landlord*</Label>
                  <Select
                    value={editingProperty.owner.id.toString()}
                    onValueChange={(value) =>
                      handleSelectChange("OwnerId", value)
                    }
                    disabled={isLoadingLandlords}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          isLoadingLandlords
                            ? "Loading landlords..."
                            : "Select a landlord"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {landlords.map((landlord) => (
                        <SelectItem
                          key={landlord.id}
                          value={landlord.id.toString()}
                        >
                          {landlord.fullName} ({landlord.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Price*</Label>
                  <Input
                    id="price"
                    name="price"
                    type="number"
                    min="0"
                    value={editingProperty.price}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency*</Label>
                  <Select
                    value={editingProperty.currency}
                    onValueChange={(value) =>
                      handleSelectChange("currency", value)
                    }
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UGX">UGX</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="GBP">GBP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="occupied">Occupied Status*</Label>
                <Select
                  value={editingProperty.occupied ? "true" : "false"}
                  onValueChange={(value) =>
                    handleSelectChange("occupied", value)
                  }
                  required
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

              <div className="space-y-2">
                <Label>Property Photos (Maximum 3)</Label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {propertyPhotos.map((photo, index) => (
                    <div
                      key={index}
                      className="relative h-40 border rounded-md overflow-hidden"
                    >
                      <img
                        src={photo.preview}
                        alt={`Property ${index + 1}`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            "/placeholder-property.jpg";
                        }}
                      />
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
                            <span className="font-semibold">
                              Click to upload
                            </span>{" "}
                            or drag and drop
                          </p>
                          <p className="text-xs text-gray-500">
                            PNG, JPG, WEBP (MAX. 3)
                          </p>
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
                <p className="text-sm text-gray-500 mt-2">
                  {propertyPhotos.length === 0
                    ? "Upload new photos only if you want to change the existing ones. Leave empty to keep current images."
                    : "New photos will replace existing ones."}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Property Description*</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={editingProperty.description}
                  onChange={handleInputChange}
                  rows={4}
                  required
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingProperty(null)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <span className="flex items-center">
                      <svg
                        className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Processing...
                    </span>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default LandlordProperties;
