import { useState, useEffect } from "react";
import { getImageUrl } from "@/lib/imageUrl";
import {
  Home, MapPin, Phone, Mail, User, Calendar, Building2,
  DollarSign, Hash, Layers, FileText, AlertCircle, BedDouble,
} from "lucide-react";

const DetailRow = ({ icon: Icon, label, value, iconColor = "text-slate-400" }: {
  icon: any; label: string; value: React.ReactNode; iconColor?: string;
}) => (
  <div className="flex items-start gap-3 py-3 border-b border-slate-100 last:border-0">
    <div className={`mt-0.5 shrink-0 ${iconColor}`}>
      <Icon className="h-4 w-4" />
    </div>
    <div className="min-w-0">
      <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-0.5">{label}</p>
      <p className="text-sm font-medium text-slate-800 break-words">{value}</p>
    </div>
  </div>
);

const PropertyDetails = () => {
  const [tenant, setTenant] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imgError, setImgError] = useState(false);

  const apiUrl = import.meta.env.VITE_API_BASE_URL;

  useEffect(() => {
    const fetchTenantData = async () => {
      setLoading(true);
      try {
        const user = localStorage.getItem("user");
        if (!user) throw new Error("No user found in localStorage");
        const { id, token } = JSON.parse(user);
        if (!token) throw new Error("No authentication token found");

        const response = await fetch(`${apiUrl}/GetTenantById/${id}`, {
          headers: { Authorization: `Bearer ${token}`, accept: "*/*" },
        });
        if (!response.ok) throw new Error(`API request failed with status ${response.status}`);
        setTenant(await response.json());
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchTenantData();
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center py-20 text-sm text-slate-400">
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600 mr-3" />
      Loading property details…
    </div>
  );

  if (error) return (
    <div className="flex items-center gap-3 rounded-2xl border border-red-100 bg-red-50 px-6 py-5 text-sm text-red-700">
      <AlertCircle className="h-5 w-5 shrink-0" /> {error}
    </div>
  );

  if (!tenant?.property) return (
    <div className="flex items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white py-16 text-sm text-slate-400">
      No property information available
    </div>
  );

  const { property } = tenant;
  const { owner } = property;
  const imageUrl = property.imageUrl ? getImageUrl(property.imageUrl) : null;

  return (
    <div className="space-y-8">
      {/* Hero banner */}
      <div className="relative overflow-hidden rounded-3xl p-7 text-white shadow-xl" style={{ background: "linear-gradient(135deg, #0a0f1e 0%, #0f2044 45%, #1a3a6e 100%)" }}>
        <div className="absolute inset-0 pointer-events-none opacity-[0.04]"
          style={{ backgroundImage: "linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)", backgroundSize: "40px 40px" }} />
        <div className="relative z-10 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 border border-white/20 px-3 py-1 text-xs font-semibold text-blue-200 uppercase tracking-wider">
              <Building2 className="h-3 w-3" /> Tenant Residence
            </span>
            <h1 className="mt-3 text-2xl font-bold tracking-tight">{property.name}</h1>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-blue-100">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              {[property.address, property.district, property.region].filter(Boolean).join(", ")}
            </p>
          </div>
          <div className="mt-4 sm:mt-0 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-white/10 border border-white/20 px-4 py-3 text-center">
              <p className="text-xs text-blue-200 mb-0.5">Monthly Rent</p>
              <p className="text-lg font-bold">{property.currency} {Number(property.price).toLocaleString()}</p>
            </div>
            <div className="rounded-2xl bg-white/10 border border-white/20 px-4 py-3 text-center">
              <p className="text-xs text-blue-200 mb-0.5">Balance Due</p>
              <p className={`text-lg font-bold ${tenant.balanceDue > 0 ? "text-red-300" : "text-emerald-300"}`}>
                {property.currency} {Number(tenant.balanceDue).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Property card — 2/3 */}
        <div className="lg:col-span-2 space-y-5">
          {/* Property image */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="relative aspect-video bg-slate-100">
              {imageUrl && !imgError ? (
                <img
                  src={imageUrl}
                  alt={property.name}
                  className="h-full w-full object-cover"
                  onError={() => setImgError(true)}
                />
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-3 text-slate-300">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
                    <Home className="h-8 w-8 text-slate-300" />
                  </div>
                  <p className="text-sm text-slate-400">Property image unavailable</p>
                </div>
              )}
              {/* Type badge overlay */}
              {property.type && (
                <span className="absolute top-4 left-4 rounded-full bg-white/90 backdrop-blur-sm px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm border border-white">
                  {property.type}
                </span>
              )}
            </div>
          </div>

          {/* Property details grid */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50 px-6 py-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
                <Home className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">Property Details</p>
                <p className="text-xs text-slate-400">Your current rental unit information</p>
              </div>
            </div>

            <div className="grid grid-cols-1 divide-y divide-slate-100 sm:grid-cols-2 sm:divide-y-0">
              <div className="px-6 py-2 sm:border-r sm:border-slate-100">
                <DetailRow icon={Hash} label="Property ID" value={property.id} />
                <DetailRow icon={MapPin} label="Address" value={[property.address, property.district, property.region, property.zipcode].filter(Boolean).join(", ")} iconColor="text-blue-500" />
                <DetailRow icon={Layers} label="Property Type" value={property.type || "—"} />
                <DetailRow icon={FileText} label="Description" value={property.description || "—"} />
              </div>
              <div className="px-6 py-2">
                <DetailRow icon={BedDouble} label="Number of Rooms" value={property.numberOfRooms ?? "—"} iconColor="text-violet-500" />
                <DetailRow icon={DollarSign} label="Monthly Rent" value={`${property.currency} ${Number(property.price).toLocaleString()}`} iconColor="text-emerald-500" />
                <DetailRow
                  icon={AlertCircle}
                  label="Balance Due"
                  value={<span className={tenant.balanceDue > 0 ? "text-red-600" : "text-emerald-600"}>{property.currency} {Number(tenant.balanceDue).toLocaleString()}</span>}
                  iconColor={tenant.balanceDue > 0 ? "text-red-400" : "text-emerald-400"}
                />
                <DetailRow icon={Calendar} label="Moved In" value={new Date(tenant.dateMovedIn).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })} iconColor="text-amber-500" />
                <DetailRow icon={Calendar} label="Next Payment" value={new Date(tenant.nextPaymentDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })} iconColor="text-amber-500" />
              </div>
            </div>
          </div>
        </div>

        {/* Landlord sidebar — 1/3 */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50 px-5 py-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600">
                <User className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">Landlord</p>
                <p className="text-xs text-slate-400">Contact details</p>
              </div>
            </div>

            <div className="p-5 space-y-1">
              {/* Avatar */}
              <div className="flex justify-center pb-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 shadow-sm">
                  <span className="text-xl font-bold text-white">
                    {owner?.fullName?.charAt(0)?.toUpperCase() ?? "L"}
                  </span>
                </div>
              </div>

              <div className="text-center mb-4">
                <p className="font-bold text-slate-900">{owner?.fullName}</p>
                <p className="text-xs text-slate-400 mt-0.5">Property Owner</p>
              </div>

              <a href={`tel:${owner?.phoneNumber}`}
                className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-700 hover:border-blue-200 hover:bg-blue-50 transition-colors">
                <Phone className="h-4 w-4 text-blue-500 shrink-0" />
                <span className="font-medium">{owner?.phoneNumber || "—"}</span>
              </a>

              <a href={`mailto:${owner?.email}`}
                className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-700 hover:border-blue-200 hover:bg-blue-50 transition-colors mt-2">
                <Mail className="h-4 w-4 text-blue-500 shrink-0" />
                <span className="font-medium truncate">{owner?.email || "—"}</span>
              </a>
            </div>
          </div>

          {/* Billing summary card */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50 px-5 py-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500">
                <DollarSign className="h-4 w-4 text-white" />
              </div>
              <p className="text-sm font-semibold text-slate-800">Billing</p>
            </div>
            <div className="p-5 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Monthly Rent</span>
                <span className="font-semibold text-slate-800">{property.currency} {Number(property.price).toLocaleString()}</span>
              </div>
              {tenant.arrears > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-red-500 flex items-center gap-1"><AlertCircle className="h-3.5 w-3.5" /> Arrears</span>
                  <span className="font-semibold text-red-600">{property.currency} {Number(tenant.arrears).toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold border-t border-slate-100 pt-3">
                <span className="text-slate-900">Total Due</span>
                <span className={tenant.balanceDue > 0 ? "text-red-600" : "text-emerald-600"}>
                  {property.currency} {Number(tenant.balanceDue).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Info note */}
          <div className="flex items-start gap-2.5 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3">
            <AlertCircle className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
            <p className="text-xs text-blue-700 leading-relaxed">
              Contact your landlord directly for maintenance requests, lease renewals, or billing disputes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PropertyDetails;
