"use client";

import { useState, useEffect } from "react";
import { getImageUrl } from "@/lib/imageUrl";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/ui/data-table";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  House,
  Eye,
  Edit,
  Trash2,
  X,
  ImageIcon,
  Building2,
  MapPin,
  BedDouble,
  CircleDollarSign,
  User,
  Mail,
  Phone,
  Plus,
  Loader2,
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
  systemRole: { id: number; name: string; description: string };
}

const propertyTypes = ["Apartment", "House", "Villa", "Condo", "Townhouse", "Commercial"];

const typeBadge = (type: string) => {
  const map: Record<string, string> = {
    Apartment: "bg-blue-50 text-blue-700 border-blue-100",
    House: "bg-emerald-50 text-emerald-700 border-emerald-100",
    Villa: "bg-violet-50 text-violet-700 border-violet-100",
    Condo: "bg-indigo-50 text-indigo-700 border-indigo-100",
    Townhouse: "bg-amber-50 text-amber-700 border-amber-100",
    Commercial: "bg-slate-100 text-slate-700 border-slate-200",
  };
  const cls = map[type] ?? "bg-slate-100 text-slate-600 border-slate-200";
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${cls}`}>
      {type}
    </span>
  );
};

// ── Detail row used in view modal ────────────────────────────────────────────
const DetailRow = ({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
}) => (
  <div className="flex items-start gap-3 border-b border-slate-100 py-3 last:border-0">
    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100">
      <Icon className="h-3.5 w-3.5 text-slate-500" />
    </div>
    <div className="min-w-0 flex-1">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-0.5 text-sm font-medium text-[#0F172A]">{value}</p>
    </div>
  </div>
);

// ── Component ─────────────────────────────────────────────────────────────────
const LandlordProperties = () => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [propertyPhotos, setPropertyPhotos] = useState<PropertyPhoto[]>([]);
  const [landlords, setLandlords] = useState<Landlord[]>([]);
  const [isLoadingLandlords, setIsLoadingLandlords] = useState(false);

  const user = localStorage.getItem("user") || null;
  const token = JSON.parse(user).token;
  if (!token) {
    toast({ title: "Error", description: "User token not found. Please log in again.", variant: "destructive" });
    return;
  }

  const apiUrl = import.meta.env.VITE_API_BASE_URL;
  const navigate = useNavigate();

  useEffect(() => {
    fetchProperties();
    fetchLandlords();
  }, []);

  const fetchProperties = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${apiUrl}/GetAllProperties`, {
        headers: { accept: "*/*", Authorization: `Bearer ${token}` },
      });
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
    setIsLoadingLandlords(true);
    try {
      const response = await fetch(`${apiUrl}/GetLandlords`, {
        headers: { accept: "*/*", Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to fetch landlords");
      setLandlords(await response.json());
    } catch (error) {
      toast({ title: "Error", description: "Failed to fetch landlords", variant: "destructive" });
    } finally {
      setIsLoadingLandlords(false);
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
    } catch (err) {
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

  const removePhoto = (index: number) => {
    setPropertyPhotos((prev) => prev.filter((_, i) => i !== index));
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
      fd.append("OwnerId", editingProperty.ownerId as string);
      fd.append("Owner", editingProperty.ownerId as string);
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

      setProperties((prev) =>
        prev.map((p) => (p.id === editingProperty.id ? editingProperty : p))
      );
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
    if (!editingProperty) return;
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
      if (name === "OwnerId") {
        const l = landlords.find((x) => x.id.toString() === value);
        if (l) return { ...prev, owner: { id: l.id, fullName: l.fullName, email: l.email, phoneNumber: l.phoneNumber } };
        return prev;
      }
      if (name === "occupied") return { ...prev, occupied: value === "true" };
      return { ...prev, [name]: value };
    });
  };

  const occupiedCount = properties.filter((p) => p.occupied).length;
  const vacantCount = properties.length - occupiedCount;

  return (
    <div className="space-y-6">

      {/* ── Hero banner ── */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0F172A] via-[#1E3A5F] to-[#1D4ED8] px-8 py-8 text-white shadow-xl">
        <div className="pointer-events-none absolute -right-10 -top-10 h-56 w-56 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute -bottom-8 left-1/3 h-40 w-40 rounded-full bg-white/5" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <span className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-blue-200">
              Property Registry
            </span>
            <div>
              <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Landlord Properties</h1>
              <p className="mt-1 text-sm text-blue-200">View and manage all properties registered in the system</p>
            </div>
            {/* Inline stats */}
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
            onClick={() => navigate("/admin-dashboard/register-property")}
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
              key: "name",
              header: "Property Name",
              cell: (row) => (
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#1D4ED8]/10">
                    <Building2 className="h-4 w-4 text-[#1D4ED8]" />
                  </div>
                  <span className="font-semibold text-[#0F172A]">{row.name}</span>
                </div>
              ),
            },
            {
              key: "address",
              header: "Address",
              cell: (row) => (
                <span className="flex items-center gap-1.5 text-sm text-slate-500">
                  <MapPin className="h-3.5 w-3.5 text-slate-400" />
                  {row.address}
                </span>
              ),
            },
            {
              key: "type",
              header: "Type",
              cell: (row) => typeBadge(row.type),
            },
            {
              key: "numberOfRooms",
              header: "Rooms",
              cell: (row) => (
                <span className="flex items-center gap-1.5 text-sm text-slate-600">
                  <BedDouble className="h-3.5 w-3.5 text-slate-400" />
                  {row.numberOfRooms}
                </span>
              ),
            },
            {
              key: "landlord",
              header: "Landlord",
              cell: (row) => (
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[10px] font-bold text-emerald-700">
                    {row.owner.fullName.charAt(0)}
                  </span>
                  <span className="text-sm text-[#0F172A]">{row.owner.fullName}</span>
                </div>
              ),
            },
            {
              key: "status",
              header: "Status",
              cell: (row) =>
                row.occupied ? (
                  <span className="inline-flex items-center rounded-full bg-emerald-50 border border-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                    Occupied
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full bg-amber-50 border border-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
                    Vacant
                  </span>
                ),
            },
            {
              key: "actions",
              header: "Actions",
              headerClassName: "text-right",
              className: "text-right",
              cell: (row) => (
                <div className="flex items-center justify-end gap-1">
                  <button
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-blue-50 hover:text-[#1D4ED8] transition-colors"
                    onClick={() => setSelectedProperty(row)}
                    title="View"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  <button
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
                    onClick={() => handleEditProperty(row)}
                    title="Edit"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                    onClick={() => handleDeleteProperty(row.id)}
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ),
            },
          ]}
          loading={isLoading}
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Search by property name, address, or landlord…"
          label="property"
          emptyMessage={searchTerm ? "No properties match your search" : "Start by adding a new property"}
          emptyIcon={<House className="h-6 w-6 text-slate-300" />}
        />
      )}

      {/* ── View Property Modal ── */}
      {selectedProperty && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            {/* Modal header */}
            <div className="relative bg-gradient-to-r from-[#0F172A] to-[#1D4ED8] px-6 py-5 text-white">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-300">
                    Property Details
                  </p>
                  <h2 className="mt-0.5 text-xl font-bold">{selectedProperty.name}</h2>
                  <p className="mt-1 flex items-center gap-1 text-sm text-blue-200">
                    <MapPin className="h-3.5 w-3.5" />
                    {selectedProperty.address}
                  </p>
                </div>
                <button
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors"
                  onClick={() => setSelectedProperty(null)}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              {/* Status + type chips */}
              <div className="mt-3 flex gap-2">
                {typeBadge(selectedProperty.type)}
                <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${selectedProperty.occupied ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-amber-50 text-amber-700 border-amber-100"}`}>
                  {selectedProperty.occupied ? "Occupied" : "Vacant"}
                </span>
              </div>
            </div>

            {/* Modal body */}
            <div className="flex-1 overflow-y-auto">
              <div className="grid grid-cols-1 gap-0 sm:grid-cols-2">
                {/* Left: details */}
                <div className="border-r border-slate-100 px-6 py-4">
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Property Info
                  </p>
                  <DetailRow icon={BedDouble} label="Rooms" value={selectedProperty.numberOfRooms} />
                  <DetailRow
                    icon={CircleDollarSign}
                    label="Rent"
                    value={`${selectedProperty.currency} ${selectedProperty.price.toLocaleString()}`}
                  />
                  <DetailRow icon={MapPin} label="District" value={`${selectedProperty.district}, ${selectedProperty.region}`} />
                  {selectedProperty.description && (
                    <DetailRow icon={Building2} label="Description" value={selectedProperty.description} />
                  )}

                  <p className="mb-1 mt-4 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Landlord
                  </p>
                  <DetailRow icon={User} label="Name" value={selectedProperty.owner.fullName} />
                  <DetailRow icon={Mail} label="Email" value={selectedProperty.owner.email} />
                  <DetailRow icon={Phone} label="Phone" value={selectedProperty.owner.phoneNumber} />
                </div>

                {/* Right: image */}
                <div className="px-6 py-4">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Property Image
                  </p>
                  <div className="overflow-hidden rounded-xl border border-slate-100">
                    <img
                      src={getImageUrl(selectedProperty.imageUrl)}
                      alt={selectedProperty.name}
                      className="h-52 w-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "/placeholder-property.jpg";
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Modal footer */}
            <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-6 py-4">
              <button
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                onClick={() => setSelectedProperty(null)}
              >
                Close
              </button>
              <button
                className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors"
                onClick={() => {
                  sessionStorage.setItem("propertyId", selectedProperty.id.toString());
                  navigate("/admin-dashboard/transactions");
                }}
              >
                Transactions
              </button>
              <button
                className="rounded-xl bg-[#1D4ED8] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1e40af] transition-colors"
                onClick={() => {
                  setSelectedProperty(null);
                  handleEditProperty(selectedProperty);
                }}
              >
                Edit Property
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Property Dialog ── */}
      {editingProperty && (
        <Dialog open={!!editingProperty} onOpenChange={() => setEditingProperty(null)}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Property</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmitEdit} className="grid gap-4 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Property Name*</Label>
                  <Input id="name" name="name" value={editingProperty.name} onChange={handleInputChange} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">Property Type*</Label>
                  <Select value={editingProperty.type} onValueChange={(v) => handleSelectChange("type", v)} required>
                    <SelectTrigger><SelectValue placeholder="Select property type" /></SelectTrigger>
                    <SelectContent>
                      {propertyTypes.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address*</Label>
                <Input id="address" name="address" value={editingProperty.address} onChange={handleInputChange} required />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="region">Region*</Label>
                  <Input id="region" name="region" value={editingProperty.region} onChange={handleInputChange} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="district">District*</Label>
                  <Input id="district" name="district" value={editingProperty.district} onChange={handleInputChange} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zipcode">Zip Code*</Label>
                  <Input id="zipcode" name="zipcode" value={editingProperty.zipcode} onChange={handleInputChange} required />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="numberOfRooms">Number of Rooms*</Label>
                  <Input id="numberOfRooms" name="numberOfRooms" type="number" min="0" value={editingProperty.numberOfRooms} onChange={handleInputChange} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="OwnerId">Landlord*</Label>
                  <Select
                    value={editingProperty.owner.id.toString()}
                    onValueChange={(v) => handleSelectChange("OwnerId", v)}
                    disabled={isLoadingLandlords}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={isLoadingLandlords ? "Loading…" : "Select a landlord"} />
                    </SelectTrigger>
                    <SelectContent>
                      {landlords.map((l) => (
                        <SelectItem key={l.id} value={l.id.toString()}>
                          {l.fullName} ({l.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Price*</Label>
                  <Input id="price" name="price" type="number" min="0" value={editingProperty.price} onChange={handleInputChange} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency*</Label>
                  <Select value={editingProperty.currency} onValueChange={(v) => handleSelectChange("currency", v)} required>
                    <SelectTrigger><SelectValue placeholder="Select currency" /></SelectTrigger>
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
                <Select value={editingProperty.occupied ? "true" : "false"} onValueChange={(v) => handleSelectChange("occupied", v)} required>
                  <SelectTrigger><SelectValue placeholder="Select occupancy status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Occupied</SelectItem>
                    <SelectItem value="false">Vacant</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Photo upload */}
              <div className="space-y-2">
                <Label>Property Photos (Maximum 3)</Label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {propertyPhotos.map((photo, index) => (
                    <div key={index} className="relative h-40 overflow-hidden rounded-xl border border-slate-200">
                      <img src={photo.preview} alt={`Property ${index + 1}`} className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removePhoto(index)}
                        className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                  {propertyPhotos.length < 3 && (
                    <div className="flex h-40 items-center justify-center rounded-xl border-2 border-dashed border-slate-200 hover:border-[#1D4ED8] transition-colors">
                      <label className="flex h-full w-full cursor-pointer flex-col items-center justify-center gap-2">
                        <ImageIcon className="h-8 w-8 text-slate-300" />
                        <p className="text-center text-xs text-slate-400">
                          <span className="font-semibold text-[#1D4ED8]">Click to upload</span>
                          <br />PNG, JPG, WEBP (max 3)
                        </p>
                        <input type="file" className="hidden" accept="image/*" multiple onChange={handlePhotoUpload} />
                      </label>
                    </div>
                  )}
                </div>
                <p className="text-xs text-slate-400">
                  {propertyPhotos.length === 0
                    ? "Upload new photos only if you want to replace existing ones."
                    : "New photos will replace existing ones."}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Property Description*</Label>
                <Textarea id="description" name="description" value={editingProperty.description} onChange={handleInputChange} rows={4} required />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
                  onClick={() => setEditingProperty(null)}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-xl bg-[#1D4ED8] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1e40af] transition-colors disabled:opacity-50"
                  disabled={isSubmitting}
                >
                  {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Save Changes
                </button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default LandlordProperties;
