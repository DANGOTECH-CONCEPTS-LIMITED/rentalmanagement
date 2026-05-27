import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getImageUrl } from "@/lib/imageUrl";
import { DataTable, Column } from "@/components/ui/data-table";
import {
  House, Search, Eye, Edit, Trash2, X, ImageIcon, Building2,
  MapPin, BedDouble, CircleDollarSign, User, Mail, Phone, Plus,
  Loader2, Home, Tag, DollarSign, Hash,
} from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";

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
  owner: { id: number; fullName: string; email: string; phoneNumber: string };
}

interface PropertyPhoto {
  file: File;
  preview: string;
}

type Region = "Central" | "Eastern" | "Northern" | "Western";
interface RegionDistrictsMap {
  Central: string[];
  Eastern: string[];
  Northern: string[];
  Western: string[];
}

interface Landlord {
  id: number;
  fullName: string;
  email: string;
  phoneNumber: string;
  passportPhoto: string;
  nationalIdNumber: string;
  systemRoleId: number;
  systemRole: { id: number; name: string; description: string };
}

const propertyTypes = ["Apartment", "Studio", "House", "Condo", "Townhouse", "Commercial"];

const inputCls =
  "w-full rounded-lg border border-[#E2E8F0] bg-white px-3 py-2.5 text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/10 transition-colors";

const selCls =
  "w-full rounded-lg border border-[#E2E8F0] bg-white px-3 py-2.5 text-sm text-[#0F172A] focus:outline-none focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/10 transition-colors";

const FieldLabel = ({ children, required }: { children: React.ReactNode; required?: boolean }) => (
  <label className="block text-xs font-semibold uppercase tracking-wider text-[#64748B] mb-1.5">
    {children}{required && <span className="text-red-400 ml-0.5">*</span>}
  </label>
);

const SectionPanel = ({ icon: Icon, title, color, children }: {
  icon: React.ElementType; title: string; color: string; children: React.ReactNode;
}) => (
  <div className="rounded-xl border border-[#E2E8F0] bg-slate-50/60 p-4">
    <div className="flex items-center gap-2 mb-4">
      <div className={`flex h-6 w-6 items-center justify-center rounded-md ${color}`}>
        <Icon className="h-3.5 w-3.5 text-white" />
      </div>
      <span className="text-xs font-bold uppercase tracking-wider text-[#64748B]">{title}</span>
    </div>
    {children}
  </div>
);

const typeBadge = (type: string) => {
  const map: Record<string, string> = {
    Apartment: "bg-blue-50 text-blue-700 border-blue-100",
    House: "bg-emerald-50 text-emerald-700 border-emerald-100",
    Villa: "bg-violet-50 text-violet-700 border-violet-100",
    Condo: "bg-indigo-50 text-indigo-700 border-indigo-100",
    Townhouse: "bg-amber-50 text-amber-700 border-amber-100",
    Commercial: "bg-slate-100 text-slate-700 border-slate-200",
    Studio: "bg-pink-50 text-pink-700 border-pink-100",
  };
  const cls = map[type] ?? "bg-slate-100 text-slate-600 border-slate-200";
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${cls}`}>
      {type}
    </span>
  );
};


const PhotoUploadZone = ({
  photos, onUpload, onRemove,
}: {
  photos: PropertyPhoto[];
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemove: (i: number) => void;
}) => (
  <div className="grid grid-cols-3 gap-3">
    {photos.map((photo, i) => (
      <div key={i} className="relative h-28 overflow-hidden rounded-xl border border-[#E2E8F0]">
        <img src={photo.preview} alt={`Photo ${i + 1}`} className="h-full w-full object-cover" />
        <button
          type="button"
          onClick={() => onRemove(i)}
          className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors"
        >
          <X size={10} />
        </button>
        <div className="absolute bottom-0 left-0 right-0 bg-black/30 px-2 py-1">
          <span className="text-[10px] text-white font-medium">Photo {i + 1}</span>
        </div>
      </div>
    ))}
    {photos.length < 3 && (
      <label className="flex h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#E2E8F0] bg-white hover:border-[#1D4ED8] hover:bg-blue-50/30 transition-colors">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100">
          <ImageIcon className="h-4 w-4 text-[#94A3B8]" />
        </div>
        <p className="text-center text-[11px] text-[#94A3B8]">
          <span className="font-semibold text-[#1D4ED8]">Upload</span><br />
          PNG / JPG
        </p>
        <input type="file" className="hidden" accept="image/*" multiple onChange={onUpload} />
      </label>
    )}
    {photos.length === 0 && (
      <div className="col-span-2 flex items-center">
        <p className="text-xs text-[#94A3B8]">Upload up to 3 photos. First photo will be the cover image.</p>
      </div>
    )}
  </div>
);

// ── Modal overlay (must be at module level to avoid remount on every render) ──
const ModalOverlay = ({ children, onClose }: { children: React.ReactNode; onClose: () => void }) => (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4"
    onClick={(e) => e.target === e.currentTarget && onClose()}
  >
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 12 }}
      transition={{ duration: 0.2 }}
      className="w-full max-w-2xl rounded-2xl overflow-hidden bg-white shadow-[0_30px_90px_-36px_rgba(15,23,42,0.45)] max-h-[92vh] flex flex-col"
    >
      {children}
    </motion.div>
  </div>
);

// ── Component ─────────────────────────────────────────────────────────────────
const Properties = () => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchTerm1, setSearchTerm1] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const [addProperty, setAddProperty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [propertyPhotos, setPropertyPhotos] = useState<PropertyPhoto[]>([]);
  const [landlords, setLandlords] = useState<Landlord[]>([]);
  const [formData, setFormData] = useState({
    Name: "", Address: "", Region: "", District: "", Zipcode: "",
    Type: "", NumberOfRooms: "0", Description: "", OwnerId: "0",
    Price: "0", Currency: "UGX", Occupied: "false",
  });
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [selectedRegion, setSelectedRegion] = useState("");

  const user = localStorage.getItem("user") || null;
  const districtsByRegion: RegionDistrictsMap = {
    Central: ["Buikwe","Bukomansimbi","Butambala","Buvuma","Gomba","Kalangala","Kalungu","Kampala","Kayunga","Kiboga","Kyankwanzi","Luweero","Lwengo","Lyantonde","Masaka","Mityana","Mpigi","Mubende","Mukono","Nakaseke","Nakasongola","Rakai","Sembabule","Wakiso"],
    Eastern: ["Amuria","Budaka","Bududa","Bugiri","Bukedea","Bukwa","Bulambuli","Busia","Butaleja","Buyende","Iganga","Jinja","Kaberamaido","Kaliro","Kamuli","Kapchorwa","Katakwi","Kibuku","Kumi","Kween","Luuka","Manafwa","Mayuge","Mbale","Namayingo","Namisindwa","Namutumba","Ngora","Pallisa","Serere","Sironko","Soroti","Tororo"],
    Northern: ["Abim","Adjumani","Agago","Alebtong","Amolatar","Amudat","Amuru","Apac","Arua","Dokolo","Gulu","Kaabong","Kitgum","Koboko","Kole","Kotido","Lamwo","Lira","Maracha","Moroto","Moyo","Nakapiripirit","Napak","Nebbi","Nwoya","Omoro","Otuke","Oyam","Pader","Pakwach","Yumbe","Zombo"],
    Western: ["Buhweju","Buliisa","Bundibugyo","Bushenyi","Hoima","Ibanda","Isingiro","Kabale","Kabarole","Kagadi","Kakumiro","Kamwenge","Kanungu","Kasese","Kibaale","Kiruhura","Kiryandongo","Kisoro","Kyegegwa","Kyenjojo","Masindi","Mitooma","Ntoroko","Ntungamo","Rubanda","Rubirizi","Rukiga","Rukungiri","Sheema"],
  };

  const userData = JSON.parse(user!);
  const token = userData.token;
  if (!token) {
    toast({ title: "Error", description: "User token not found. Please log in again.", variant: "destructive" });
    return null;
  }

  const apiUrl = import.meta.env.VITE_API_BASE_URL;
  const navigate = useNavigate();

  const handleRegionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedRegion(e.target.value as Region | "");
    setSelectedDistrict("");
    setSearchTerm1("");
  };

  useEffect(() => {
    fetchProperties();
    fetchLandlords();
  }, []);

  const fetchProperties = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${apiUrl}/GetPropertiesByLandLordId/${userData.id}`, {
        headers: { accept: "*/*", Authorization: `Bearer ${token}` },
      });
      if (response.status === 400) { setProperties([]); setError(null); return; }
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      setProperties(await response.json());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch properties");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLandlords = async () => {
    try {
      const response = await fetch(`${apiUrl}/GetLandlords`, {
        headers: { accept: "*/*", Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to fetch landlords");
      setLandlords(await response.json());
    } catch {
      toast({ title: "Error", description: "Failed to fetch landlords", variant: "destructive" });
    }
  };

  const filteredProperties = properties.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.owner.fullName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDeleteProperty = async (id: number) => {
    try {
      const response = await fetch(`${apiUrl}/DeleteProperty/${id}`, {
        method: "DELETE",
        headers: { accept: "*/*", Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to delete property");
      setProperties((prev) => prev.filter((p) => p.id !== id));
      toast({ title: "Success", description: "Property deleted successfully" });
    } catch {
      toast({ title: "Error", description: "Failed to delete property", variant: "destructive" });
    }
  };

  const handleEditProperty = (property: Property) => {
    setEditingProperty(property);
    setPropertyPhotos([]);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    if (propertyPhotos.length + files.length > 3) {
      toast({ title: "Upload limit exceeded", description: "Maximum 3 photos allowed.", variant: "destructive" });
      return;
    }
    const newPhotos: PropertyPhoto[] = [];
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        newPhotos.push({ file, preview: reader.result as string });
        if (newPhotos.length === files.length)
          setPropertyPhotos((prev) => [...prev, ...newPhotos]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removePhoto = (index: number) => setPropertyPhotos((prev) => prev.filter((_, i) => i !== index));

  const handleAddInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const selectDistrict = (district: string) => {
    setSelectedDistrict(district);
    setSearchTerm1(district);
    setIsDropdownOpen(false);
  };

  const filteredDistricts: string[] = selectedRegion
    ? districtsByRegion[selectedRegion as Region].filter((d) =>
        d.toLowerCase().startsWith(searchTerm1.toLowerCase())
      )
    : [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (propertyPhotos.length === 0) {
      toast({ title: "Photos Required", description: "Please upload at least one property photo.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("Price", formData.Price);
      fd.append("Name", formData.Name);
      fd.append("Zipcode", formData.Zipcode);
      fd.append("OwnerId", userData.id);
      fd.append("District", selectedDistrict);
      fd.append("Currency", formData.Currency);
      fd.append("Region", selectedRegion);
      fd.append("Address", formData.Address);
      fd.append("NumberOfRooms", formData.NumberOfRooms);
      fd.append("Type", formData.Type);
      fd.append("Description", formData.Description);
      fd.append("Occupied", formData.Occupied);
      propertyPhotos.forEach((photo) => fd.append("files", photo.file));

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      const response = await fetch(`${apiUrl}/AddProperty`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to register property");
      }

      fetchProperties();
      toast({ title: "Property Registered", description: `Successfully registered: ${formData.Name}` });
      setAddProperty(false);
      setFormData({ Name: "", Address: "", Region: "", District: "", Zipcode: "", Type: "", NumberOfRooms: "0", Description: "", OwnerId: "0", Price: "0", Currency: "UGX", Occupied: "false" });
      setSelectedDistrict("");
      setSelectedRegion("");
      setPropertyPhotos([]);
    } catch (error) {
      toast({ title: "Error", description: (error as any)?.message ?? "Failed to register property.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProperty) return;
    setIsSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("Id", editingProperty.id.toString());
      fd.append("Price", editingProperty.price.toString());
      fd.append("Name", editingProperty.name);
      fd.append("Zipcode", editingProperty.zipcode);
      fd.append("OwnerId", userData.id);
      fd.append("Owner", userData.id);
      fd.append("District", editingProperty.district);
      fd.append("Currency", editingProperty.currency);
      fd.append("Region", editingProperty.region);
      fd.append("Address", editingProperty.address);
      fd.append("NumberOfRooms", editingProperty.numberOfRooms.toString());
      fd.append("Type", editingProperty.type);
      fd.append("Description", editingProperty.description);
      fd.append("Occupied", editingProperty.occupied ? "true" : "false");
      propertyPhotos.forEach((photo) => fd.append("files", photo.file));

      const response = await fetch(`${apiUrl}/UpdateProperty`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      if (!response.ok) throw new Error("Failed to update property");
      setProperties((prev) => prev.map((p) => (p.id === editingProperty.id ? editingProperty : p)));
      setEditingProperty(null);
      setPropertyPhotos([]);
      toast({ title: "Success", description: "Property updated successfully" });
      fetchProperties();
    } catch {
      toast({ title: "Error", description: "Failed to update property", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditingProperty((prev) => {
      if (!prev) return null;
      if (name === "price" || name === "numberOfRooms") return { ...prev, [name]: Number(value) };
      return { ...prev, [name]: value };
    });
  };

  const handleSelectChange = (name: string, value: string) => {
    if (!editingProperty) return;
    setEditingProperty((prev) => {
      if (!prev) return null;
      if (name === "occupied") return { ...prev, occupied: value === "true" };
      return { ...prev, [name]: value };
    });
  };

  const occupiedCount = properties.filter((p) => p.occupied).length;
  const vacantCount = properties.length - occupiedCount;


  return (
    <div className="space-y-6">

      {/* ── Hero banner ── */}
      <section className="relative overflow-hidden rounded-2xl px-8 py-8 text-white shadow-xl" style={{ background: "linear-gradient(135deg, #0a0f1e 0%, #0f2044 45%, #1a3a6e 100%)" }}>
        <div className="absolute inset-0 pointer-events-none opacity-[0.04]"
          style={{ backgroundImage: "linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)", backgroundSize: "40px 40px" }} />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <span className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-blue-200">
              Property Registry
            </span>
            <div>
              <h1 className="text-2xl font-bold tracking-tight md:text-3xl">My Properties</h1>
              <p className="mt-1 text-sm text-blue-200">View and manage all your registered properties</p>
            </div>
            <div className="flex flex-wrap gap-3 pt-1">
              {[
                { label: "Total", value: properties.length },
                { label: "Occupied", value: occupiedCount, color: "text-emerald-300" },
                { label: "Vacant", value: vacantCount, color: "text-amber-300" },
              ].map((s) => (
                <div key={s.label} className="flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/10 px-3 py-1.5">
                  <span className={`text-sm font-bold ${s.color ?? "text-white"}`}>{s.value}</span>
                  <span className="text-xs text-blue-200">{s.label}</span>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={() => setAddProperty(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white px-5 py-2.5 text-sm font-bold text-[#1D4ED8] shadow-sm transition-colors hover:bg-blue-50 shrink-0"
          >
            <Plus className="h-4 w-4" />
            Add New Property
          </button>
        </div>
      </section>

      {/* ── Table ── */}
      {error ? (
        <div className="rounded-2xl border border-red-100 bg-red-50 p-8 text-center">
          <p className="font-semibold text-red-700">Error retrieving properties</p>
          <p className="mt-1 text-sm text-red-500">{error}</p>
        </div>
      ) : (
        <DataTable
          data={filteredProperties}
          columns={[
            {
              key: "name", header: "Property Name",
              cell: (p) => (
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#1D4ED8]/10">
                    <Building2 className="h-4 w-4 text-[#1D4ED8]" />
                  </div>
                  <span className="font-semibold text-[#0F172A]">{p.name}</span>
                </div>
              ),
            },
            {
              key: "address", header: "Address",
              cell: (p) => (
                <span className="flex items-center gap-1.5 text-sm text-slate-500">
                  <MapPin className="h-3.5 w-3.5 text-slate-400" />{p.address}
                </span>
              ),
            },
            { key: "type", header: "Type", cell: (p) => typeBadge(p.type) },
            {
              key: "rooms", header: "Rooms",
              cell: (p) => (
                <span className="flex items-center gap-1.5 text-sm text-slate-600">
                  <BedDouble className="h-3.5 w-3.5 text-slate-400" />{p.numberOfRooms}
                </span>
              ),
            },
            {
              key: "landlord", header: "Landlord",
              cell: (p) => (
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[10px] font-bold text-emerald-700">
                    {p.owner.fullName.charAt(0)}
                  </span>
                  <span className="text-sm text-[#0F172A]">{p.owner.fullName}</span>
                </div>
              ),
            },
            {
              key: "status", header: "Status",
              cell: (p) => p.occupied ? (
                <span className="inline-flex items-center rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">Occupied</span>
              ) : (
                <span className="inline-flex items-center rounded-full border border-amber-100 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700">Vacant</span>
              ),
            },
            {
              key: "actions", header: "Actions", headerClassName: "text-right", className: "text-right",
              cell: (p) => (
                <div className="flex items-center justify-end gap-1">
                  <button className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-blue-50 hover:text-[#1D4ED8] transition-colors" onClick={() => setSelectedProperty(p)} title="View">
                    <Eye className="h-4 w-4" />
                  </button>
                  <button className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors" onClick={() => handleEditProperty(p)} title="Edit">
                    <Edit className="h-4 w-4" />
                  </button>
                  <button className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors" onClick={() => handleDeleteProperty(p.id)} title="Delete">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ),
            },
          ] as Column<Property>[]}
          loading={isLoading}
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Search by property name, address, or landlord…"
          label="property"
          emptyIcon={<House className="h-6 w-6 text-slate-300" />}
          emptyMessage={searchTerm ? "No properties match your search" : "Start by adding a new property"}
        />
      )}

      {/* ── View Property Modal ── */}
      <AnimatePresence>
        {selectedProperty && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ duration: 0.2 }}
              className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
            >
              {/* ── Gradient header ── */}
              <div className="bg-gradient-to-br from-[#0f2044] to-[#1D4ED8] shrink-0 px-6 pt-5 pb-8 text-white">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-blue-300">Property Details</p>
                    <h2 className="mt-1 text-2xl font-extrabold tracking-tight">{selectedProperty.name}</h2>
                    <p className="mt-0.5 flex items-center gap-1 text-sm text-blue-200">
                      <MapPin className="h-3.5 w-3.5 shrink-0" />{selectedProperty.address}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {typeBadge(selectedProperty.type)}
                    <button className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15 hover:bg-white/25 transition-colors" onClick={() => setSelectedProperty(null)}>
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-blue-300">Monthly Rent</p>
                  <p className="text-3xl font-extrabold mt-0.5">{selectedProperty.currency} {selectedProperty.price.toLocaleString()}<span className="text-base font-medium text-blue-200 ml-1">/mo</span></p>
                </div>
              </div>

              {/* ── Status + location card pulled up ── */}
              <div className="mx-5 -mt-4 shrink-0 rounded-xl bg-white border border-slate-200 shadow-md px-4 py-3 flex items-center gap-3 z-10">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50">
                  <MapPin className="h-4 w-4 text-[#1D4ED8]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Location</p>
                  <p className="text-sm font-bold text-[#0F172A] truncate">{selectedProperty.district}, {selectedProperty.region}</p>
                </div>
                <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${selectedProperty.occupied ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"}`}>
                  {selectedProperty.occupied ? "Occupied" : "Vacant"}
                </span>
              </div>

              {/* ── Scrollable body ── */}
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">

                {/* Property image */}
                <div className="overflow-hidden rounded-xl border border-slate-200">
                  <img src={getImageUrl(selectedProperty.imageUrl)} alt={selectedProperty.name} className="h-44 w-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder-property.jpg"; }} />
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Rooms</p>
                    <p className="mt-1 text-base font-bold text-[#0F172A]">{selectedProperty.numberOfRooms}</p>
                    <p className="text-[10px] text-slate-400">bedrooms</p>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Type</p>
                    <p className="mt-1 text-base font-bold text-[#0F172A]">{selectedProperty.type}</p>
                    <p className="text-[10px] text-slate-400">property type</p>
                  </div>
                </div>

                {/* Description */}
                {selectedProperty.description && (
                  <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Description</p>
                    <p className="text-xs text-slate-600 leading-relaxed">{selectedProperty.description}</p>
                  </div>
                )}

                {/* Owner info */}
                <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2">Landlord</p>
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50">
                      <User className="h-4 w-4 text-[#1D4ED8]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-[#0F172A]">{selectedProperty.owner.fullName}</p>
                      <p className="text-xs text-slate-500">{selectedProperty.owner.email}</p>
                    </div>
                    <div className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5">
                      <Phone className="h-3 w-3 text-slate-500" />
                      <span className="text-xs font-semibold text-slate-600">{selectedProperty.owner.phoneNumber}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Footer ── */}
              <div className="flex items-center gap-2 shrink-0 border-t border-slate-100 px-5 py-4">
                <button className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors" onClick={() => setSelectedProperty(null)}>Close</button>
                <button className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 py-2.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors"
                  onClick={() => { sessionStorage.setItem("propertyId", selectedProperty.id.toString()); navigate("/admin-dashboard/transactions"); }}>
                  Transactions
                </button>
                <button className="flex-1 btn-grid inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#1D4ED8] py-2.5 text-sm font-semibold text-white hover:bg-[#1e40af] transition-colors"
                  onClick={() => { setSelectedProperty(null); handleEditProperty(selectedProperty); }}>
                  <Edit className="h-3.5 w-3.5" /> Edit
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Add Property Modal ── */}
      <AnimatePresence>
        {addProperty && (
          <ModalOverlay onClose={() => setAddProperty(false)}>
            {/* Header */}
            <div className="bg-gradient-to-r from-[#0F172A] to-[#1D4ED8] px-6 py-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15">
                  <Home className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Add New Property</h3>
                  <p className="text-[11px] text-blue-200/70">Fill in the details to register a property</p>
                </div>
              </div>
              <button onClick={() => setAddProperty(false)} className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Form body */}
            <form onSubmit={handleSubmit} className="overflow-y-auto flex-1">
              <div className="p-6 space-y-5">

                {/* Property Identity */}
                <SectionPanel icon={Building2} title="Property Identity" color="bg-blue-500">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <FieldLabel required>Property Name</FieldLabel>
                      <input name="Name" value={formData.Name} onChange={handleAddInputChange} required placeholder="e.g. Sunset Apartments" className={inputCls} />
                    </div>
                    <div>
                      <FieldLabel required>Property Type</FieldLabel>
                      <select value={formData.Type} onChange={(e) => setFormData((p) => ({ ...p, Type: e.target.value }))} required className={selCls}>
                        <option value="">Select property type</option>
                        {propertyTypes.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                  </div>
                </SectionPanel>

                {/* Location */}
                <SectionPanel icon={MapPin} title="Location" color="bg-emerald-500">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <FieldLabel>Region</FieldLabel>
                      <select value={selectedRegion} onChange={handleRegionChange} className={selCls}>
                        <option value="">-- Select Region --</option>
                        {Object.keys(districtsByRegion).map((r) => <option key={r} value={r}>{r} Region</option>)}
                      </select>
                    </div>

                    {selectedRegion && (
                      <div className="relative" ref={dropdownRef}>
                        <FieldLabel required>District in {selectedRegion}</FieldLabel>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#94A3B8] pointer-events-none" />
                          <input
                            type="text"
                            placeholder="Type to search districts…"
                            value={searchTerm1}
                            onChange={(e) => { setSearchTerm1(e.target.value); setIsDropdownOpen(true); }}
                            onClick={() => setIsDropdownOpen(true)}
                            className={`${inputCls} pl-9`}
                          />
                        </div>
                        {isDropdownOpen && filteredDistricts.length > 0 && (
                          <ul className="absolute z-20 w-full mt-1 bg-white border border-[#E2E8F0] rounded-xl shadow-lg max-h-48 overflow-y-auto">
                            {filteredDistricts.map((d) => (
                              <li key={d} onClick={() => selectDistrict(d)} className="px-4 py-2.5 text-sm hover:bg-blue-50 hover:text-[#1D4ED8] cursor-pointer transition-colors">{d}</li>
                            ))}
                          </ul>
                        )}
                        {isDropdownOpen && searchTerm1 && filteredDistricts.length === 0 && (
                          <div className="absolute z-20 w-full mt-1 bg-white border border-[#E2E8F0] rounded-xl shadow-lg p-4 text-center text-sm text-[#94A3B8]">
                            No districts found
                          </div>
                        )}
                      </div>
                    )}

                    <div className={selectedRegion ? "" : "sm:col-span-2"}>
                      <FieldLabel required>Street Address</FieldLabel>
                      <input name="Address" value={formData.Address} onChange={handleAddInputChange} required placeholder="e.g. Plot 12, Kampala Road" className={inputCls} />
                    </div>
                    <div>
                      <FieldLabel required>ZIP / Postal Code</FieldLabel>
                      <input name="Zipcode" value={formData.Zipcode} onChange={handleAddInputChange} required placeholder="e.g. 00256" className={inputCls} />
                    </div>
                  </div>
                </SectionPanel>

                {/* Details & Pricing */}
                <SectionPanel icon={Tag} title="Details & Pricing" color="bg-violet-500">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div>
                      <FieldLabel required>Rooms</FieldLabel>
                      <input name="NumberOfRooms" type="number" min="0" value={formData.NumberOfRooms} onChange={handleAddInputChange} required className={inputCls} />
                    </div>
                    <div>
                      <FieldLabel required>Occupied?</FieldLabel>
                      <select value={formData.Occupied} onChange={(e) => setFormData((p) => ({ ...p, Occupied: e.target.value }))} className={selCls}>
                        <option value="false">Vacant</option>
                        <option value="true">Occupied</option>
                      </select>
                    </div>
                    <div>
                      <FieldLabel required>Rent Price</FieldLabel>
                      <input name="Price" type="text" inputMode="numeric" value={formData.Price ? Number(formData.Price.replace(/[^0-9]/g,'')||0).toLocaleString('en-US') : ''} onChange={e => { const d = e.target.value.replace(/[^0-9]/g,''); setFormData(p => ({ ...p, Price: d })); }} required placeholder="0" className={inputCls} />
                    </div>
                    <div>
                      <FieldLabel required>Currency</FieldLabel>
                      <select value={formData.Currency} onChange={(e) => setFormData((p) => ({ ...p, Currency: e.target.value }))} className={selCls}>
                        <option value="UGX">UGX</option>
                        <option value="USD">USD</option>
                        <option value="EUR">EUR</option>
                        <option value="GBP">GBP</option>
                      </select>
                    </div>
                  </div>
                </SectionPanel>

                {/* Photos */}
                <SectionPanel icon={ImageIcon} title="Property Photos (max 3)" color="bg-amber-500">
                  <PhotoUploadZone photos={propertyPhotos} onUpload={handlePhotoUpload} onRemove={removePhoto} />
                </SectionPanel>

                {/* Description */}
                <div>
                  <FieldLabel required>Property Description</FieldLabel>
                  <textarea
                    name="Description"
                    value={formData.Description}
                    onChange={handleAddInputChange}
                    rows={3}
                    required
                    placeholder="Describe the property, amenities, and any special features…"
                    className={`${inputCls} resize-none`}
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 border-t border-[#E2E8F0] px-6 py-4 shrink-0">
                <button type="button" onClick={() => setAddProperty(false)} className="rounded-lg border border-[#E2E8F0] bg-white px-4 py-2 text-sm font-medium text-[#64748B] hover:bg-slate-50 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting} className="btn-grid inline-flex items-center gap-2 rounded-lg bg-[#1D4ED8] px-5 py-2 text-sm font-semibold text-white hover:bg-[#1e40af] disabled:opacity-60 transition-colors">
                  {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Register Property
                </button>
              </div>
            </form>
          </ModalOverlay>
        )}
      </AnimatePresence>

      {/* ── Edit Property Modal ── */}
      <AnimatePresence>
        {editingProperty && (
          <ModalOverlay onClose={() => setEditingProperty(null)}>
            {/* Header */}
            <div className="bg-gradient-to-r from-[#0F172A] to-[#1D4ED8] px-6 py-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15">
                  <Edit className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Edit Property</h3>
                  <p className="text-[11px] text-blue-200/70 truncate max-w-[240px]">{editingProperty.name}</p>
                </div>
              </div>
              <button onClick={() => setEditingProperty(null)} className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitEdit} className="overflow-y-auto flex-1">
              <div className="p-6 space-y-5">

                {/* Identity */}
                <SectionPanel icon={Building2} title="Property Identity" color="bg-blue-500">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <FieldLabel required>Property Name</FieldLabel>
                      <input name="name" value={editingProperty.name} onChange={handleInputChange} required className={inputCls} />
                    </div>
                    <div>
                      <FieldLabel required>Property Type</FieldLabel>
                      <select value={editingProperty.type} onChange={(e) => handleSelectChange("type", e.target.value)} className={selCls}>
                        {propertyTypes.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                  </div>
                </SectionPanel>

                {/* Location */}
                <SectionPanel icon={MapPin} title="Location" color="bg-emerald-500">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <FieldLabel required>Street Address</FieldLabel>
                      <input name="address" value={editingProperty.address} onChange={handleInputChange} required className={inputCls} />
                    </div>
                    <div>
                      <FieldLabel required>Region</FieldLabel>
                      <input name="region" value={editingProperty.region} onChange={handleInputChange} required className={inputCls} />
                    </div>
                    <div>
                      <FieldLabel required>District</FieldLabel>
                      <input name="district" value={editingProperty.district} onChange={handleInputChange} required className={inputCls} />
                    </div>
                    <div>
                      <FieldLabel required>ZIP / Postal Code</FieldLabel>
                      <input name="zipcode" value={editingProperty.zipcode} onChange={handleInputChange} required className={inputCls} />
                    </div>
                  </div>
                </SectionPanel>

                {/* Details & Pricing */}
                <SectionPanel icon={Tag} title="Details & Pricing" color="bg-violet-500">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div>
                      <FieldLabel required>Rooms</FieldLabel>
                      <input name="numberOfRooms" type="number" min="0" value={editingProperty.numberOfRooms} onChange={handleInputChange} required className={inputCls} />
                    </div>
                    <div>
                      <FieldLabel required>Occupied?</FieldLabel>
                      <select value={editingProperty.occupied ? "true" : "false"} onChange={(e) => handleSelectChange("occupied", e.target.value)} className={selCls}>
                        <option value="false">Vacant</option>
                        <option value="true">Occupied</option>
                      </select>
                    </div>
                    <div>
                      <FieldLabel required>Rent Price</FieldLabel>
                      <input name="price" type="text" inputMode="numeric" value={editingProperty.price ? editingProperty.price.toLocaleString('en-US') : ''} onChange={e => { const d = e.target.value.replace(/[^0-9]/g,''); setEditingProperty(p => p ? { ...p, price: d ? Number(d) : 0 } : null); }} required placeholder="0" className={inputCls} />
                    </div>
                    <div>
                      <FieldLabel required>Currency</FieldLabel>
                      <select value={editingProperty.currency} onChange={(e) => handleSelectChange("currency", e.target.value)} className={selCls}>
                        <option value="UGX">UGX</option>
                        <option value="USD">USD</option>
                        <option value="EUR">EUR</option>
                        <option value="GBP">GBP</option>
                      </select>
                    </div>
                  </div>
                </SectionPanel>

                {/* Photos */}
                <SectionPanel icon={ImageIcon} title="Property Photos" color="bg-amber-500">
                  {editingProperty.imageUrl && propertyPhotos.length === 0 && (
                    <div className="mb-3">
                      <p className="text-xs text-[#94A3B8] mb-2">Current cover image</p>
                      <div className="h-28 w-40 overflow-hidden rounded-xl border border-[#E2E8F0]">
                        <img src={getImageUrl(editingProperty.imageUrl)} alt={editingProperty.name} className="h-full w-full object-cover" />
                      </div>
                    </div>
                  )}
                  <PhotoUploadZone photos={propertyPhotos} onUpload={handlePhotoUpload} onRemove={removePhoto} />
                  {propertyPhotos.length === 0 && editingProperty.imageUrl && (
                    <p className="mt-2 text-xs text-[#94A3B8]">Upload new photos only to replace the existing ones.</p>
                  )}
                </SectionPanel>

                {/* Description */}
                <div>
                  <FieldLabel required>Property Description</FieldLabel>
                  <textarea
                    name="description"
                    value={editingProperty.description}
                    onChange={handleInputChange}
                    rows={3}
                    required
                    className={`${inputCls} resize-none`}
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 border-t border-[#E2E8F0] px-6 py-4 shrink-0">
                <button type="button" onClick={() => setEditingProperty(null)} disabled={isSubmitting} className="rounded-lg border border-[#E2E8F0] bg-white px-4 py-2 text-sm font-medium text-[#64748B] hover:bg-slate-50 disabled:opacity-60 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting} className="btn-grid inline-flex items-center gap-2 rounded-lg bg-[#1D4ED8] px-5 py-2 text-sm font-semibold text-white hover:bg-[#1e40af] disabled:opacity-60 transition-colors">
                  {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Save Changes
                </button>
              </div>
            </form>
          </ModalOverlay>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Properties;
