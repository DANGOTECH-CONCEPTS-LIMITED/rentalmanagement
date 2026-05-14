import { useEffect, useState } from "react";
import axios from "axios";
import {
  User,
  Phone,
  Mail,
  Home,
  Droplets,
  Calendar,
  Briefcase,
  Users,
  CreditCard,
  ShieldCheck,
  Clock,
  AlertCircle,
  MapPin,
  DoorOpen,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  unitId?: string;
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

const Field = ({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) => (
  <div className="flex items-start gap-3 py-3 border-b last:border-0">
    <div className="mt-0.5 text-primary shrink-0 bg-primary/8 rounded-md p-1.5">{icon}</div>
    <div className="min-w-0">
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      <p className="text-sm font-medium text-slate-800 break-words">
        {value || <span className="text-muted-foreground italic font-normal">Not provided</span>}
      </p>
    </div>
  </div>
);

const StatusBadge = ({ active, balance }: { active: boolean; balance: number }) => {
  if (!active)
    return <Badge variant="secondary" className="gap-1 px-2.5 py-1"><AlertCircle className="h-3 w-3" />Inactive</Badge>;
  if (balance > 0)
    return <Badge className="bg-amber-100 text-amber-800 gap-1 px-2.5 py-1"><Clock className="h-3 w-3" />Pending Payment</Badge>;
  return <Badge className="bg-green-100 text-green-800 gap-1 px-2.5 py-1"><ShieldCheck className="h-3 w-3" />Active</Badge>;
};

const QuickChip = ({ icon, text }: { icon: React.ReactNode; text: string }) => (
  <div className="flex items-center gap-1.5 rounded-full bg-white/20 backdrop-blur-sm px-3 py-1 text-xs text-white font-medium">
    {icon}
    {text}
  </div>
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
        toast({
          title: "Could not load profile",
          description: "Please try refreshing the page.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    fetchTenant();
  }, []);

  return (
    <div className="space-y-6">
      <section className="page-hero">
        <span className="inline-flex w-fit items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          My Account
        </span>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-950 mt-2">My Profile</h1>
        <p className="mt-1 text-muted-foreground">Your tenancy details, property assignment, and contact information.</p>
      </section>

      {/* ── Profile Hero Card ── */}
      <Card className="overflow-hidden border-0 shadow-md">
        {/* Banner */}
        <div className="relative h-36 bg-gradient-to-r from-primary via-primary/80 to-indigo-500">
          {/* Quick chips — bottom of banner */}
          <div className="absolute bottom-3 left-[calc(5rem+1.5rem)] right-4 flex flex-wrap gap-2">
            {isLoading ? null : (
              <>
                {tenant?.property?.name && (
                  <QuickChip icon={<Home className="h-3 w-3" />} text={tenant.property.name} />
                )}
                {tenant?.unitId && (
                  <QuickChip icon={<DoorOpen className="h-3 w-3" />} text={`Unit ${tenant.unitId}`} />
                )}
                {tenant?.dateMovedIn && (
                  <QuickChip
                    icon={<Calendar className="h-3 w-3" />}
                    text={`Since ${new Date(tenant.dateMovedIn).toLocaleDateString("en-US", { month: "short", year: "numeric" })}`}
                  />
                )}
              </>
            )}
          </div>
        </div>

        {/* Avatar — overlaps banner */}
        <div className="relative px-6 pb-6">
          <div className="absolute -top-12 left-6">
            {isLoading ? (
              <Skeleton className="h-24 w-24 rounded-full ring-4 ring-white" />
            ) : (
              <div className="h-24 w-24 rounded-full overflow-hidden ring-4 ring-white bg-muted shadow-lg">
                <img
                  src={getImageUrl(tenant?.passportPhoto)}
                  alt={tenant?.fullName}
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      "https://media.istockphoto.com/id/1495088043/vector/user-profile-icon-avatar-or-person-icon-profile-picture-portrait-symbol-default-portrait.jpg?s=612x612&w=0&k=20&c=dhV2p1JwmloBTOaGAtaA3AW1KSnjsdMt7-U_3EZElZ0=";
                  }}
                />
              </div>
            )}
          </div>

          {/* Name / email / badge — offset to clear avatar */}
          <div className="pt-14 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
            <div>
              {isLoading ? (
                <>
                  <Skeleton className="h-7 w-52 mb-1.5" />
                  <Skeleton className="h-4 w-40 mb-2" />
                  <Skeleton className="h-6 w-24" />
                </>
              ) : (
                <>
                  <h2 className="text-2xl font-bold text-slate-900 leading-tight">
                    {tenant?.fullName}
                  </h2>
                  <p className="text-sm text-muted-foreground mt-0.5">{tenant?.email}</p>
                  <div className="mt-2">
                    <StatusBadge active={tenant?.active ?? false} balance={tenant?.balanceDue ?? 0} />
                  </div>
                </>
              )}
            </div>

            {/* Rent highlight */}
            {!isLoading && tenant?.property && (
              <div className="rounded-xl bg-primary/6 border border-primary/15 px-4 py-3 text-right shrink-0">
                <p className="text-xs text-muted-foreground">Monthly Rent</p>
                <p className="text-xl font-bold text-primary">
                  {formatCurrency(tenant.property.price, tenant.property.currency)}
                </p>
                {(tenant.balanceDue ?? 0) > 0 && (
                  <p className="text-xs text-amber-600 mt-0.5 font-medium">
                    Balance: {formatCurrency(tenant.balanceDue, tenant.property.currency)}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* ── Detail Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Personal Info */}
        <Card className="border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <div className="rounded-lg bg-primary/10 p-1.5">
                <User className="h-4 w-4 text-primary" />
              </div>
              Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-start gap-3 py-3 border-b last:border-0">
                  <Skeleton className="h-7 w-7 rounded-md shrink-0" />
                  <div className="space-y-1.5 flex-1">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-4 w-36" />
                  </div>
                </div>
              ))
            ) : (
              <>
                <Field icon={<User className="h-3.5 w-3.5" />} label="Full Name" value={tenant?.fullName} />
                <Field icon={<Mail className="h-3.5 w-3.5" />} label="Email Address" value={tenant?.email} />
                <Field icon={<Phone className="h-3.5 w-3.5" />} label="Phone Number" value={tenant?.phoneNumber} />
                <Field icon={<CreditCard className="h-3.5 w-3.5" />} label="National ID" value={tenant?.nationalIdNumber} />
                <Field icon={<Briefcase className="h-3.5 w-3.5" />} label="Occupation" value={tenant?.occupation} />
              </>
            )}
          </CardContent>
        </Card>

        {/* Tenancy Info */}
        <Card className="border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <div className="rounded-lg bg-primary/10 p-1.5">
                <Home className="h-4 w-4 text-primary" />
              </div>
              Tenancy Details
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-start gap-3 py-3 border-b last:border-0">
                  <Skeleton className="h-7 w-7 rounded-md shrink-0" />
                  <div className="space-y-1.5 flex-1">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-4 w-36" />
                  </div>
                </div>
              ))
            ) : (
              <>
                <Field icon={<Home className="h-3.5 w-3.5" />} label="Property" value={tenant?.property?.name} />
                <Field icon={<Home className="h-3.5 w-3.5" />} label="Property Type" value={tenant?.property?.type} />
                <Field icon={<DoorOpen className="h-3.5 w-3.5" />} label="Unit / Room" value={tenant?.unitId} />
                <Field icon={<Droplets className="h-3.5 w-3.5" />} label="Water Meter No." value={tenant?.waterMeterNo} />
                <Field
                  icon={<Calendar className="h-3.5 w-3.5" />}
                  label="Move-in Date"
                  value={tenant?.dateMovedIn ? new Date(tenant.dateMovedIn).toLocaleDateString() : undefined}
                />
              </>
            )}
          </CardContent>
        </Card>

        {/* Next of Kin */}
        <Card className="border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <div className="rounded-lg bg-primary/10 p-1.5">
                <Users className="h-4 w-4 text-primary" />
              </div>
              Next of Kin
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {isLoading ? (
              Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="flex items-start gap-3 py-3 border-b last:border-0">
                  <Skeleton className="h-7 w-7 rounded-md shrink-0" />
                  <div className="space-y-1.5 flex-1">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-4 w-36" />
                  </div>
                </div>
              ))
            ) : !tenant?.nextOfKinName ? (
              <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                <Users className="h-8 w-8 mb-2 opacity-30" />
                <p className="text-sm">No next of kin on record.</p>
                <p className="text-xs mt-1">Contact your landlord to update this information.</p>
              </div>
            ) : (
              <>
                <Field icon={<User className="h-3.5 w-3.5" />} label="Name" value={tenant.nextOfKinName} />
                <Field icon={<Phone className="h-3.5 w-3.5" />} label="Phone Number" value={tenant.nextOfKinPhone} />
              </>
            )}
          </CardContent>
        </Card>

        {/* Property Address */}
        <Card className="border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <div className="rounded-lg bg-primary/10 p-1.5">
                <MapPin className="h-4 w-4 text-primary" />
              </div>
              Property Address
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {isLoading ? (
              <div className="py-3 space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ) : (
              <div className="flex items-start gap-3 pt-3">
                <div className="rounded-md bg-primary/8 p-1.5 shrink-0 mt-0.5">
                  <MapPin className="h-3.5 w-3.5 text-primary" />
                </div>
                <p className="text-sm text-slate-700 leading-relaxed">
                  {tenant?.property?.address || (
                    <span className="italic text-muted-foreground">Address not available</span>
                  )}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MyProfile;
