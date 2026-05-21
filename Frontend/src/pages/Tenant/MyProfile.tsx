import { useEffect, useState } from "react";
import axios from "axios";
import {
  User, Phone, Mail, Home, Droplets, Calendar, Briefcase,
  Users, CreditCard, ShieldCheck, Clock, AlertCircle, MapPin, DoorOpen,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { getImageUrl } from "@/lib/imageUrl";
import { useCurrencyFormatter } from "@/hooks/use-currency-formatter";

interface TenantProfile {
  id: number;
  fullName: string;
  email: string;
  phoneNumber: string;
  nationalIdNumber: string;
  occupation?: string;
  passportPhoto?: string;
  active: boolean;
  dateMovedIn: string;
  propertyUnitId?: number;
  unit?: { id: number; unitNumber: string };
  waterMeterNo?: string;
  nextOfKinName?: string;
  nextOfKinPhone?: string;
  balanceDue: number;
  property: {
    id: number;
    name: string;
    address: string;
    type: string;
    price: number;
    currency: string;
    numberOfRooms?: number;
  };
}

const FALLBACK_AVATAR =
  "https://media.istockphoto.com/id/1495088043/vector/user-profile-icon-avatar-or-person-icon-profile-picture-portrait-symbol-default-portrait.jpg?s=612x612&w=0&k=20&c=dhV2p1JwmloBTOaGAtaA3AW1KSnjsdMt7-U_3EZElZ0=";

const StatusBadge = ({ active, balance }: { active: boolean; balance: number }) => {
  if (!active)
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
        <AlertCircle className="h-3 w-3" />Inactive
      </span>
    );
  if (balance > 0)
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
        <Clock className="h-3 w-3" />Pending Payment
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
      <ShieldCheck className="h-3 w-3" />Active
    </span>
  );
};

const DetailRow = ({
  icon: Icon,
  label,
  value,
  iconBg = "bg-blue-50",
  iconColor = "text-blue-600",
}: {
  icon: React.ElementType;
  label: string;
  value?: React.ReactNode;
  iconBg?: string;
  iconColor?: string;
}) => (
  <div className="flex items-start gap-3 py-3 border-b border-[#E2E8F0] last:border-0">
    <div className={`h-8 w-8 rounded-lg ${iconBg} flex items-center justify-center flex-shrink-0`}>
      <Icon className={`h-4 w-4 ${iconColor}`} />
    </div>
    <div className="min-w-0 flex-1">
      <p className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">{label}</p>
      <p className="text-sm font-medium text-[#0F172A] mt-0.5 break-words">
        {value || <span className="text-slate-400 italic font-normal">Not provided</span>}
      </p>
    </div>
  </div>
);

const SectionCard = ({
  icon: Icon,
  title,
  iconBg,
  iconColor,
  children,
}: {
  icon: React.ElementType;
  title: string;
  iconBg: string;
  iconColor: string;
  children: React.ReactNode;
}) => (
  <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden">
    <div className="flex items-center gap-3 px-5 py-4 border-b border-[#E2E8F0]">
      <div className={`h-9 w-9 rounded-lg ${iconBg} flex items-center justify-center flex-shrink-0`}>
        <Icon className={`h-4.5 w-4.5 ${iconColor}`} size={18} />
      </div>
      <h3 className="text-sm font-semibold text-[#0F172A]">{title}</h3>
    </div>
    <div className="px-5">{children}</div>
  </div>
);

const FieldSkeleton = ({ rows = 4 }: { rows?: number }) => (
  <>
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="flex items-start gap-3 py-3 border-b border-[#E2E8F0] last:border-0">
        <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
        <div className="space-y-1.5 flex-1">
          <Skeleton className="h-2.5 w-16" />
          <Skeleton className="h-4 w-40" />
        </div>
      </div>
    ))}
  </>
);

const MyProfile = () => {
  const { toast } = useToast();
  const formatCurrency = useCurrencyFormatter();
  const [tenant, setTenant] = useState<TenantProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const userData = JSON.parse(localStorage.getItem("user") || "{}");
  const apiUrl = import.meta.env.VITE_API_BASE_URL;

  useEffect(() => {
    const fetchTenant = async () => {
      setIsLoading(true);
      try {
        const { data } = await axios.get(`${apiUrl}/GetTenantById/${userData.id}`);
        setTenant(data);
      } catch {
        toast({ title: "Could not load profile", description: "Please try refreshing the page.", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };
    fetchTenant();
  }, []);

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-[#0F172A] via-[#1E3A5F] to-[#1D4ED8]">
        {/* Decorative blobs */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-4 right-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute bottom-0 right-32 h-24 w-24 rounded-full bg-blue-300/10 blur-xl" />
        </div>

        {/* Banner top strip */}
        <div className="relative px-6 pt-6 pb-20">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-8 w-8 rounded-lg bg-white/10 flex items-center justify-center">
              <User className="h-4 w-4 text-white" />
            </div>
            <span className="text-blue-200 text-sm font-medium">My Account</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">My Profile</h1>
          <p className="text-blue-200 text-sm mt-1">Your tenancy details, property assignment, and contact information.</p>
        </div>

        {/* Profile card overlapping the banner */}
        <div className="relative mx-4 -mt-14 mb-0 bg-white rounded-2xl border border-[#E2E8F0] shadow-xl overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-5">
            {/* Avatar */}
            <div className="flex-shrink-0">
              {isLoading ? (
                <Skeleton className="h-20 w-20 rounded-2xl" />
              ) : (
                <div className="h-20 w-20 rounded-2xl overflow-hidden ring-4 ring-white shadow-md border border-[#E2E8F0]">
                  <img
                    src={getImageUrl(tenant?.passportPhoto) || FALLBACK_AVATAR}
                    alt={tenant?.fullName}
                    className="h-full w-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK_AVATAR; }}
                  />
                </div>
              )}
            </div>

            {/* Name + status */}
            <div className="flex-1 min-w-0">
              {isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-5 w-24" />
                </div>
              ) : (
                <>
                  <h2 className="text-xl font-bold text-[#0F172A] leading-tight truncate">{tenant?.fullName}</h2>
                  <p className="text-sm text-slate-500 mt-0.5 truncate">{tenant?.email}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <StatusBadge active={tenant?.active ?? false} balance={tenant?.balanceDue ?? 0} />
                    {tenant?.property?.name && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                        <Home className="h-3 w-3" />{tenant.property.name}
                      </span>
                    )}
                    {tenant?.dateMovedIn && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-50 text-slate-600 border border-slate-200">
                        <Calendar className="h-3 w-3" />
                        Since {new Date(tenant.dateMovedIn).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Rent box */}
            {!isLoading && tenant?.property && (
              <div className="flex-shrink-0 rounded-xl bg-gradient-to-br from-[#1D4ED8]/5 to-[#1D4ED8]/10 border border-[#1D4ED8]/20 px-5 py-3 text-right">
                <p className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">Monthly Rent</p>
                <p className="text-xl font-bold text-[#1D4ED8] mt-0.5">
                  {formatCurrency(tenant.property.price, tenant.property.currency)}
                </p>
                {(tenant.balanceDue ?? 0) > 0 && (
                  <p className="text-xs text-amber-600 mt-1 font-medium">
                    Balance: {formatCurrency(tenant.balanceDue, tenant.property.currency)}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Quick stat strip */}
          {!isLoading && tenant && (
            <div className="flex items-center gap-0 border-t border-[#E2E8F0] divide-x divide-[#E2E8F0]">
              {[
                { icon: Phone, label: "Phone", value: tenant.phoneNumber },
                { icon: DoorOpen, label: "Unit", value: tenant.unit?.unitNumber || "—" },
                { icon: Droplets, label: "Meter No.", value: tenant.waterMeterNo || "—" },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex-1 flex items-center gap-2 px-4 py-3">
                  <Icon className="h-4 w-4 text-slate-400 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">{label}</p>
                    <p className="text-xs font-semibold text-[#0F172A] truncate">{value}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Spacing below the overlapping card */}
        <div className="h-6" />
      </div>

      {/* Detail Cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Personal Information */}
        <SectionCard icon={User} title="Personal Information" iconBg="bg-blue-50" iconColor="text-blue-600">
          {isLoading ? (
            <FieldSkeleton rows={5} />
          ) : (
            <>
              <DetailRow icon={User} label="Full Name" value={tenant?.fullName} iconBg="bg-blue-50" iconColor="text-blue-600" />
              <DetailRow icon={Mail} label="Email Address" value={tenant?.email} iconBg="bg-blue-50" iconColor="text-blue-600" />
              <DetailRow icon={Phone} label="Phone Number" value={tenant?.phoneNumber} iconBg="bg-blue-50" iconColor="text-blue-600" />
              <DetailRow icon={CreditCard} label="National ID" value={tenant?.nationalIdNumber} iconBg="bg-blue-50" iconColor="text-blue-600" />
              <DetailRow icon={Briefcase} label="Occupation" value={tenant?.occupation} iconBg="bg-blue-50" iconColor="text-blue-600" />
            </>
          )}
        </SectionCard>

        {/* Tenancy Details */}
        <SectionCard icon={Home} title="Tenancy Details" iconBg="bg-emerald-50" iconColor="text-emerald-600">
          {isLoading ? (
            <FieldSkeleton rows={5} />
          ) : (
            <>
              <DetailRow icon={Home} label="Property" value={tenant?.property?.name} iconBg="bg-emerald-50" iconColor="text-emerald-600" />
              <DetailRow icon={Home} label="Property Type" value={tenant?.property?.type} iconBg="bg-emerald-50" iconColor="text-emerald-600" />
              <DetailRow icon={DoorOpen} label="Unit / Room" value={tenant?.unit?.unitNumber} iconBg="bg-emerald-50" iconColor="text-emerald-600" />
              <DetailRow icon={Droplets} label="Water Meter No." value={tenant?.waterMeterNo} iconBg="bg-emerald-50" iconColor="text-emerald-600" />
              <DetailRow
                icon={Calendar}
                label="Move-in Date"
                value={tenant?.dateMovedIn ? new Date(tenant.dateMovedIn).toLocaleDateString() : undefined}
                iconBg="bg-emerald-50"
                iconColor="text-emerald-600"
              />
            </>
          )}
        </SectionCard>

        {/* Next of Kin */}
        <SectionCard icon={Users} title="Next of Kin" iconBg="bg-purple-50" iconColor="text-purple-600">
          {isLoading ? (
            <FieldSkeleton rows={2} />
          ) : !tenant?.nextOfKinName ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="h-12 w-12 rounded-xl bg-slate-50 border border-[#E2E8F0] flex items-center justify-center mb-3">
                <Users className="h-6 w-6 text-slate-300" />
              </div>
              <p className="text-sm font-medium text-slate-500">No next of kin on record</p>
              <p className="text-xs text-slate-400 mt-1">Contact your landlord to update this information.</p>
            </div>
          ) : (
            <>
              <DetailRow icon={User} label="Name" value={tenant.nextOfKinName} iconBg="bg-purple-50" iconColor="text-purple-600" />
              <DetailRow icon={Phone} label="Phone Number" value={tenant.nextOfKinPhone} iconBg="bg-purple-50" iconColor="text-purple-600" />
            </>
          )}
        </SectionCard>

        {/* Property Address */}
        <SectionCard icon={MapPin} title="Property Address" iconBg="bg-amber-50" iconColor="text-amber-600">
          {isLoading ? (
            <div className="py-4 space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ) : (
            <div className="py-4">
              {tenant?.property?.address ? (
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <MapPin className="h-4 w-4 text-amber-600" />
                  </div>
                  <p className="text-sm text-[#0F172A] leading-relaxed font-medium">{tenant.property.address}</p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <div className="h-12 w-12 rounded-xl bg-slate-50 border border-[#E2E8F0] flex items-center justify-center mb-3">
                    <MapPin className="h-6 w-6 text-slate-300" />
                  </div>
                  <p className="text-sm text-slate-400 italic">Address not available</p>
                </div>
              )}

              {/* Property quick stats */}
              {tenant?.property && (
                <div className="mt-4 grid grid-cols-2 gap-3">
                  {tenant.property.numberOfRooms && (
                    <div className="bg-slate-50 rounded-lg border border-[#E2E8F0] p-3 text-center">
                      <p className="text-lg font-bold text-[#0F172A]">{tenant.property.numberOfRooms}</p>
                      <p className="text-[10px] uppercase tracking-wider text-slate-400 font-medium mt-0.5">Rooms</p>
                    </div>
                  )}
                  <div className="bg-slate-50 rounded-lg border border-[#E2E8F0] p-3 text-center">
                    <p className="text-xs font-bold text-[#0F172A] uppercase">{tenant.property.type}</p>
                    <p className="text-[10px] uppercase tracking-wider text-slate-400 font-medium mt-0.5">Type</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
};

export default MyProfile;
