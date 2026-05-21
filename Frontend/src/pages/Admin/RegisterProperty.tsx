import { useState, useEffect, useRef } from "react";
import { toast } from "@/hooks/use-toast";
import {
  Upload,
  X,
  ImageIcon,
  Search,
  Building2,
  MapPin,
  Home,
  CircleDollarSign,
  User,
  FileText,
  Loader2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface PropertyPhoto {
  file: File;
  preview: string;
}

interface Landlord {
  verified: boolean;
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

const inputCls =
  "h-11 w-full rounded-xl border border-[#E2E8F0] bg-white px-3.5 text-sm text-[#0F172A] placeholder:text-[#94A3B8] shadow-sm outline-none transition-all focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/10";
const selCls =
  "h-11 w-full rounded-xl border border-[#E2E8F0] bg-white px-3.5 text-sm text-[#0F172A] shadow-sm outline-none transition-all focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/10 cursor-pointer";
const textareaCls =
  "w-full rounded-xl border border-[#E2E8F0] bg-white px-3.5 py-3 text-sm text-[#0F172A] placeholder:text-[#94A3B8] shadow-sm outline-none transition-all focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/10 resize-none";

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
      "Buikwe", "Bukomansimbi", "Butambala", "Buvuma", "Gomba", "Kalangala",
      "Kalungu", "Kampala", "Kayunga", "Kiboga", "Kyankwanzi", "Luweero",
      "Lwengo", "Lyantonde", "Masaka", "Mityana", "Mpigi", "Mubende",
      "Mukono", "Nakaseke", "Nakasongola", "Rakai", "Sembabule", "Wakiso",
    ],
    Eastern: [
      "Amuria", "Budaka", "Bududa", "Bugiri", "Bukedea", "Bukwa", "Bulambuli",
      "Busia", "Butaleja", "Buyende", "Iganga", "Jinja", "Kaberamaido",
      "Kaliro", "Kamuli", "Kapchorwa", "Katakwi", "Kibuku", "Kumi", "Kween",
      "Luuka", "Manafwa", "Mayuge", "Mbale", "Namayingo", "Namisindwa",
      "Namutumba", "Ngora", "Pallisa", "Serere", "Sironko", "Soroti", "Tororo",
    ],
    Northern: [
      "Abim", "Adjumani", "Agago", "Alebtong", "Amolatar", "Amudat", "Amuru",
      "Apac", "Arua", "Dokolo", "Gulu", "Kaabong", "Kitgum", "Koboko", "Kole",
      "Kotido", "Lamwo", "Lira", "Maracha", "Moroto", "Moyo", "Nakapiripirit",
      "Napak", "Nebbi", "Nwoya", "Omoro", "Otuke", "Oyam", "Pader", "Pakwach",
      "Yumbe", "Zombo",
    ],
    Western: [
      "Buhweju", "Buliisa", "Bundibugyo", "Bushenyi", "Hoima", "Ibanda",
      "Isingiro", "Kabale", "Kabarole", "Kagadi", "Kakumiro", "Kamwenge",
      "Kanungu", "Kasese", "Kibaale", "Kiruhura", "Kiryandongo", "Kisoro",
      "Kyegegwa", "Kyenjojo", "Masindi", "Mitooma", "Ntoroko", "Ntungamo",
      "Rubanda", "Rubirizi", "Rukiga", "Rukungiri", "Sheema",
    ],
  };

  const [selectedRegion, setSelectedRegion] = useState<Region | "">("");
  const [selectedDistrict, setSelectedDistrict] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const filteredDistricts: string[] = selectedRegion
    ? districtsByRegion[selectedRegion].filter((district) =>
        district.toLowerCase().startsWith(searchTerm.toLowerCase())
      )
    : [];

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

  const handleRegionChange = (e: React.ChangeEvent<HTMLSelectElement>): void => {
    setSelectedRegion(e.target.value as Region | "");
    setSelectedDistrict("");
    setSearchTerm("");
  };

  const selectDistrict = (district: string): void => {
    setSelectedDistrict(district);
    setSearchTerm(district);
    setIsDropdownOpen(false);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setSearchTerm(e.target.value);
    setIsDropdownOpen(true);
  };

  const [propertyPhotos, setPropertyPhotos] = useState<PropertyPhoto[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [landlords, setLandlords] = useState<Landlord[]>([]);
  const [isLoadingLandlords, setIsLoadingLandlords] = useState(false);
  const navigate = useNavigate();

  const user = localStorage.getItem("user") || null;
  const token = user ? JSON.parse(user).token : null;

  useEffect(() => {
    if (!token) {
      toast({
        title: "Error",
        description: "User token not found. Please log in again.",
        variant: "destructive",
      });
    }
  }, [token]);

  const handleNavigate = () => {
    navigate("admin-dashboard/register-property");
  };

  useEffect(() => {
    if (token) fetchLandlords();
  }, [token]);

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
      const filteredLandlords = data.filter(
        (landlord) => landlord.verified === true
      );

      setLandlords(filteredLandlords);
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

      propertyPhotos.forEach((photo) => {
        formDataToSend.append("files", photo.file);
      });

      for (const [key, value] of formDataToSend.entries()) {
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
      let result: string;
      if (contentType && contentType.includes("application/json")) {
        result = await response.json();
      } else {
        result = await response.text();
      }

      toast({
        title: "Property Registered",
        description: `Successfully registered property: ${formData.Name}`,
      });

      navigate("/admin-dashboard/landlord-properties");

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
    <div className="space-y-6">
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
              Register New Property
            </h1>
            <p className="text-sm text-blue-200/80" onClick={handleNavigate}>
              Add a new property to the management system
            </p>
          </div>
        </div>
      </section>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Property Details */}
        <div className="rounded-2xl border border-[#E2E8F0] bg-white shadow-sm overflow-hidden">
          <div className="border-b border-[#E2E8F0] bg-slate-50/60 px-5 py-3.5 flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100">
              <Building2 className="h-3.5 w-3.5 text-blue-600" />
            </div>
            <h3 className="text-sm font-bold text-[#0F172A]">Property Details</h3>
          </div>
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#64748B] mb-2">
                  Property Name *
                </label>
                <input
                  id="Name"
                  name="Name"
                  type="text"
                  value={formData.Name}
                  onChange={handleInputChange}
                  className={inputCls}
                  placeholder="Enter property name"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#64748B] mb-2">
                  Property Type *
                </label>
                <select
                  value={formData.Type}
                  onChange={(e) => handleSelectChange("Type", e.target.value)}
                  className={selCls}
                  required
                >
                  <option value="">Select property type</option>
                  <option value="Apartment">Apartment</option>
                  <option value="Studio">Studio Room</option>
                  <option value="House">House</option>
                  <option value="Condo">Condominium</option>
                  <option value="Commercial">Commercial</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#64748B] mb-2">
                  Number of Rooms *
                </label>
                <input
                  id="NumberOfRooms"
                  name="NumberOfRooms"
                  type="number"
                  min="0"
                  value={formData.NumberOfRooms}
                  onChange={handleInputChange}
                  className={inputCls}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#64748B] mb-2">
                  Occupied Status *
                </label>
                <select
                  value={formData.Occupied}
                  onChange={(e) => handleSelectChange("Occupied", e.target.value)}
                  className={selCls}
                  required
                >
                  <option value="true">Occupied</option>
                  <option value="false">Vacant</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Location */}
        <div className="rounded-2xl border border-[#E2E8F0] bg-white shadow-sm overflow-hidden">
          <div className="border-b border-[#E2E8F0] bg-slate-50/60 px-5 py-3.5 flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100">
              <MapPin className="h-3.5 w-3.5 text-blue-600" />
            </div>
            <h3 className="text-sm font-bold text-[#0F172A]">Location</h3>
          </div>
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#64748B] mb-2">
                  Region
                </label>
                <select
                  id="region"
                  value={selectedRegion}
                  onChange={handleRegionChange}
                  className={selCls}
                >
                  <option value="">-- Select Region --</option>
                  {Object.keys(districtsByRegion).map((region) => (
                    <option key={region} value={region}>
                      {region} Region
                    </option>
                  ))}
                </select>
              </div>

              {selectedRegion && (
                <div className="relative" ref={dropdownRef}>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#64748B] mb-2">
                    District in {selectedRegion} Region *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <Search className="h-4 w-4 text-[#94A3B8]" />
                    </div>
                    <input
                      type="text"
                      id="district"
                      placeholder="Type to search districts..."
                      value={searchTerm}
                      onChange={handleSearchChange}
                      onClick={() => setIsDropdownOpen(true)}
                      className="h-11 w-full rounded-xl border border-[#E2E8F0] bg-white pl-10 pr-3.5 text-sm text-[#0F172A] placeholder:text-[#94A3B8] shadow-sm outline-none transition-all focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/10"
                    />
                  </div>
                  {isDropdownOpen && filteredDistricts.length > 0 && (
                    <ul className="absolute z-10 w-full mt-1 bg-white border border-[#E2E8F0] rounded-xl shadow-lg max-h-60 overflow-y-auto">
                      {filteredDistricts.map((district) => (
                        <li
                          key={district}
                          onClick={() => selectDistrict(district)}
                          className="px-4 py-2.5 text-sm text-[#0F172A] hover:bg-blue-50 hover:text-[#1D4ED8] cursor-pointer transition-colors"
                        >
                          {district}
                        </li>
                      ))}
                    </ul>
                  )}
                  {isDropdownOpen && searchTerm && filteredDistricts.length === 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-[#E2E8F0] rounded-xl shadow-lg p-4 text-center text-sm text-slate-500">
                      No districts found starting with "{searchTerm}"
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#64748B] mb-2">
                  Street Address *
                </label>
                <input
                  id="Address"
                  name="Address"
                  type="text"
                  value={formData.Address}
                  onChange={handleInputChange}
                  className={inputCls}
                  placeholder="Enter street address"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#64748B] mb-2">
                  ZIP Code *
                </label>
                <input
                  id="Zipcode"
                  name="Zipcode"
                  type="text"
                  value={formData.Zipcode}
                  onChange={handleInputChange}
                  className={inputCls}
                  placeholder="Enter ZIP code"
                  required
                />
              </div>
            </div>
          </div>
        </div>

        {/* Pricing & Ownership */}
        <div className="rounded-2xl border border-[#E2E8F0] bg-white shadow-sm overflow-hidden">
          <div className="border-b border-[#E2E8F0] bg-slate-50/60 px-5 py-3.5 flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100">
              <CircleDollarSign className="h-3.5 w-3.5 text-blue-600" />
            </div>
            <h3 className="text-sm font-bold text-[#0F172A]">Pricing & Ownership</h3>
          </div>
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#64748B] mb-2">
                  Price *
                </label>
                <input
                  id="Price"
                  name="Price"
                  type="text"
                  value={formData.Price}
                  onChange={handleInputChange}
                  className={inputCls}
                  placeholder="0"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#64748B] mb-2">
                  Currency *
                </label>
                <select
                  value={formData.Currency}
                  onChange={(e) => handleSelectChange("Currency", e.target.value)}
                  className={selCls}
                  required
                >
                  <option value="UGX">UGX</option>
                  <option value="USD">USD</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#64748B] mb-2">
                  Landlord *
                </label>
                <select
                  value={formData.OwnerId}
                  onChange={(e) => handleSelectChange("OwnerId", e.target.value)}
                  disabled={isLoadingLandlords}
                  className={selCls}
                  required
                >
                  <option value="0">
                    {isLoadingLandlords ? "Loading landlords..." : "Select a landlord"}
                  </option>
                  {landlords.map((landlord) => (
                    <option key={landlord.id} value={landlord.id.toString()}>
                      {landlord.fullName} ({landlord.email})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Property Photos */}
        <div className="rounded-2xl border border-[#E2E8F0] bg-white shadow-sm overflow-hidden">
          <div className="border-b border-[#E2E8F0] bg-slate-50/60 px-5 py-3.5 flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100">
              <Home className="h-3.5 w-3.5 text-blue-600" />
            </div>
            <h3 className="text-sm font-bold text-[#0F172A]">Property Photos</h3>
            <span className="ml-auto text-xs text-slate-400">{propertyPhotos.length}/3 uploaded</span>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {propertyPhotos.map((photo, index) => (
                <div
                  key={index}
                  className="relative h-40 overflow-hidden rounded-xl border border-[#E2E8F0]"
                >
                  <img
                    src={photo.preview}
                    alt={`Property ${index + 1}`}
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "/placeholder-property.jpg";
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => removePhoto(index)}
                    className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors shadow"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}

              {propertyPhotos.length < 3 && (
                <label className="flex flex-col items-center justify-center w-full h-40 rounded-xl border-2 border-dashed border-[#E2E8F0] bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors">
                  <div className="flex flex-col items-center gap-1">
                    <ImageIcon className="h-6 w-6 text-slate-400" />
                    <span className="text-xs text-slate-500 font-semibold">Click to upload</span>
                    <span className="text-[10px] text-slate-400">PNG, JPG, WEBP (max 3)</span>
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    multiple
                    onChange={handlePhotoUpload}
                  />
                </label>
              )}
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="rounded-2xl border border-[#E2E8F0] bg-white shadow-sm overflow-hidden">
          <div className="border-b border-[#E2E8F0] bg-slate-50/60 px-5 py-3.5 flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100">
              <FileText className="h-3.5 w-3.5 text-blue-600" />
            </div>
            <h3 className="text-sm font-bold text-[#0F172A]">Description</h3>
          </div>
          <div className="p-5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#64748B] mb-2">
              Property Description *
            </label>
            <textarea
              id="Description"
              name="Description"
              value={formData.Description}
              onChange={handleInputChange}
              rows={4}
              className={textareaCls}
              placeholder="Describe the property, amenities, and any special features..."
              required
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pb-4">
          <button
            type="button"
            className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
            onClick={() => navigate(-1)}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded-xl bg-[#1D4ED8] px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-[#1e40af] transition-colors disabled:opacity-60"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {isSubmitting ? "Registering…" : "Register Property"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default RegisterProperty;
