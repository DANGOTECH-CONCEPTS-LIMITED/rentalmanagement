"use client";

import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
import { Upload, X, ImageIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";

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

type Region = "Central" | "Eastern" | "Northern" | "Western";

interface RegionDistrictsMap {
  Central: string[];
  Eastern: string[];
  Northern: string[];
  Western: string[];
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
    Currency: "UGX",
    Occupied: "true",
  });

  const districtsByRegion: RegionDistrictsMap = {
    Central: [
      "Buikwe",
      "Bukomansimbi",
      "Butambala",
      "Buvuma",
      "Gomba",
      "Kalangala",
      "Kalungu",
      "Kampala",
      "Kayunga",
      "Kiboga",
      "Kyankwanzi",
      "Luweero",
      "Lwengo",
      "Lyantonde",
      "Masaka",
      "Mityana",
      "Mpigi",
      "Mubende",
      "Mukono",
      "Nakaseke",
      "Nakasongola",
      "Rakai",
      "Sembabule",
      "Wakiso",
    ],
    Eastern: [
      "Amuria",
      "Budaka",
      "Bududa",
      "Bugiri",
      "Bukedea",
      "Bukwa",
      "Bulambuli",
      "Busia",
      "Butaleja",
      "Buyende",
      "Iganga",
      "Jinja",
      "Kaberamaido",
      "Kaliro",
      "Kamuli",
      "Kapchorwa",
      "Katakwi",
      "Kibuku",
      "Kumi",
      "Kween",
      "Luuka",
      "Manafwa",
      "Mayuge",
      "Mbale",
      "Namayingo",
      "Namisindwa",
      "Namutumba",
      "Ngora",
      "Pallisa",
      "Serere",
      "Sironko",
      "Soroti",
      "Tororo",
    ],
    Northern: [
      "Abim",
      "Adjumani",
      "Agago",
      "Alebtong",
      "Amolatar",
      "Amudat",
      "Amuru",
      "Apac",
      "Arua",
      "Dokolo",
      "Gulu",
      "Kaabong",
      "Kitgum",
      "Koboko",
      "Kole",
      "Kotido",
      "Lamwo",
      "Lira",
      "Maracha",
      "Moroto",
      "Moyo",
      "Nakapiripirit",
      "Napak",
      "Nebbi",
      "Nwoya",
      "Omoro",
      "Otuke",
      "Oyam",
      "Pader",
      "Pakwach",
      "Yumbe",
      "Zombo",
    ],
    Western: [
      "Buhweju",
      "Buliisa",
      "Bundibugyo",
      "Bushenyi",
      "Hoima",
      "Ibanda",
      "Isingiro",
      "Kabale",
      "Kabarole",
      "Kagadi",
      "Kakumiro",
      "Kamwenge",
      "Kanungu",
      "Kasese",
      "Kibaale",
      "Kiruhura",
      "Kiryandongo",
      "Kisoro",
      "Kyegegwa",
      "Kyenjojo",
      "Masindi",
      "Mitooma",
      "Ntoroko",
      "Ntungamo",
      "Rubanda",
      "Rubirizi",
      "Rukiga",
      "Rukungiri",
      "Sheema",
    ],
  };

  const [selectedRegion, setSelectedRegion] = useState<Region | "">("");
  const [selectedDistrict, setSelectedDistrict] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // Filter districts based on search term
  const filteredDistricts: string[] = selectedRegion
    ? districtsByRegion[selectedRegion].filter((district) =>
        district.toLowerCase().startsWith(searchTerm.toLowerCase())
      )
    : [];

  // Handle clicking outside the dropdown to close it
  useEffect(() => {
    function handleClickOutside(event: MouseEvent): void {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownRef]);

  // Handle region change
  const handleRegionChange = (
    e: React.ChangeEvent<HTMLSelectElement>
  ): void => {
    setSelectedRegion(e.target.value as Region | "");
    setSelectedDistrict("");
    setSearchTerm("");
  };

  // Handle district selection
  const selectDistrict = (district: string): void => {
    setSelectedDistrict(district);
    setSearchTerm(district);
    setIsDropdownOpen(false);
  };

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setSearchTerm(e.target.value);
    setIsDropdownOpen(true);
  };

  const [propertyPhotos, setPropertyPhotos] = useState<PropertyPhoto[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
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

  const navigate = useNavigate();
  const handleNavigate = () => {
    navigate("admin-dashboard/register-property");
  };

  useEffect(() => {
    fetchLandlords();
  }, []);

  const fetchLandlords = async () => {
    setIsLoadingLandlords(true);

    const apiUrl = import.meta.env.VITE_API_BASE_URL;
    if (!apiUrl) {
      throw new Error("API base URL is not configured");
    }

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
        description: "Failed to load landlord information",
        variant: "destructive",
      });
    } finally {
      setIsLoadingLandlords(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
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

      formDataToSend.append("Price", formData.Price);
      formDataToSend.append("Name", formData.Name);
      formDataToSend.append("Zipcode", formData.Zipcode);
      formDataToSend.append("OwnerId", formData.OwnerId);
      formDataToSend.append("District", selectedDistrict);
      formDataToSend.append("Currency", formData.Currency);
      formDataToSend.append("Region", selectedRegion);
      formDataToSend.append("Address", formData.Address);
      formDataToSend.append("NumberOfRooms", formData.NumberOfRooms);
      formDataToSend.append("Type", formData.Type);
      formDataToSend.append("Description", formData.Description);
      formDataToSend.append("Occupied", formData.Occupied);

      propertyPhotos.forEach((photo, index) => {
        formDataToSend.append("files", photo.file);
      });

      for (let [key, value] of formDataToSend.entries()) {
        console.log(`${key}:`, value);
      }

      const apiUrl = import.meta.env.VITE_API_BASE_URL;
      if (!apiUrl) {
        throw new Error("API base URL is not configured");
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(`${apiUrl}/AddProperty`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formDataToSend,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to register property");
      }

      const contentType = response.headers.get("content-type");
      let result;
      if (contentType && contentType.includes("application/json")) {
        result = await response.json();
      } else {
        result = await response.text();
      }

      toast({
        title: "Property Registered",
        description: `Successfully registered property: ${formData.Name}`,
      });

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
        Currency: "UGX",
        Occupied: "true",
      });
      setSelectedDistrict("");
      setSelectedRegion("");
      setPropertyPhotos([]);
    } catch (error) {
      console.error("Error submitting form:", error);

      let errorMessage = "Failed to register property. Please try again.";
      if (error instanceof Error) {
        if (error.name === "AbortError") {
          errorMessage = "Request timed out. Please try again.";
        } else if (error.message.includes("Failed to fetch")) {
          errorMessage =
            "Could not connect to the server. Please check your connection.";
        } else {
          errorMessage = error.message;
        }
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <div className="my-4">
        <h1 className="text-2xl font-semibold tracking-tight">
          Register New Property
        </h1>
        <p className="text-muted-foreground" onClick={handleNavigate}>
          Add a new property to the management system
        </p>
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="Name">Property Name*</Label>
              <Input
                id="Name"
                name="Name"
                value={formData.Name}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="Type">Property Type*</Label>
              <Select
                value={formData.Type}
                onValueChange={(value) => handleSelectChange("Type", value)}
                required
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
              <Label htmlFor="region">Select Region</Label>

              <select
                id="region"
                value={selectedRegion}
                onChange={handleRegionChange}
                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1"
              >
                <option value="">-- Select Region --</option>
                {Object.keys(districtsByRegion).map((region) => (
                  <option key={region} value={region}>
                    {region} Region
                  </option>
                ))}
              </select>
            </div>

            {/* District Selection with Search */}
            {selectedRegion && (
              <div className="space-y-2 relative" ref={dropdownRef}>
                <Label htmlFor="district">
                  Select District in {selectedRegion} Region*
                </Label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    id="district"
                    placeholder="Type to search districts..."
                    value={searchTerm}
                    onChange={handleSearchChange}
                    onClick={() => setIsDropdownOpen(true)}
                    className="pl-10 w-full px-3 py-2 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1"
                  />
                </div>

                {isDropdownOpen && filteredDistricts.length > 0 && (
                  <ul className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {filteredDistricts.map((district) => (
                      <li
                        key={district}
                        onClick={() => selectDistrict(district)}
                        className="px-4 py-2 hover:bg-blue-100 cursor-pointer"
                      >
                        {district}
                      </li>
                    ))}
                  </ul>
                )}

                {isDropdownOpen &&
                  searchTerm &&
                  filteredDistricts.length === 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg p-4 text-center text-gray-500">
                      No districts found starting with "{searchTerm}"
                    </div>
                  )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="Address">Street Address*</Label>
              <Input
                id="Address"
                name="Address"
                value={formData.Address}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="Zipcode">ZIP Code*</Label>
              <Input
                id="Zipcode"
                name="Zipcode"
                value={formData.Zipcode}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="NumberOfRooms">Number of Rooms*</Label>
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
              <Label htmlFor="OwnerId">Landlord*</Label>
              <Select
                value={formData.OwnerId}
                onValueChange={(value) => handleSelectChange("OwnerId", value)}
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

            <div className="space-y-2">
              <Label htmlFor="Price">Price*</Label>
              <Input
                id="Price"
                name="Price"
                type="text"
                value={formData.Price}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="Currency">Currency*</Label>
              <Select
                value={formData.Currency}
                onValueChange={(value) => handleSelectChange("Currency", value)}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UGX">UGX</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="Occupied">Occupied Status*</Label>
              <Select
                value={formData.Occupied}
                onValueChange={(value) => handleSelectChange("Occupied", value)}
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
          </div>

          <div className="space-y-2">
            <Label>Property Photos* (Maximum 3)</Label>
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
                        <span className="font-semibold">Click to upload</span>{" "}
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
          </div>

          <div className="space-y-2">
            <Label htmlFor="Description">Property Description*</Label>
            <Textarea
              id="Description"
              name="Description"
              value={formData.Description}
              onChange={handleInputChange}
              rows={4}
              required
            />
          </div>

          <div className="flex justify-end">
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
                "Register Property"
              )}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default RegisterProperty;
