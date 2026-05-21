import { useEffect, useState } from "react";
import axios from "axios";
import {
  User, Phone, Mail, CreditCard, ShieldCheck, AlertCircle,
  Building2, RefreshCw, Image as ImageIcon, BadgeCheck,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { getImageUrl } from "@/lib/imageUrl";

interface UserData {
  id: number;
  fullName: string;
  email: string;
  phoneNumber: string;
  nationalIdNumber: string;
  passportPhoto?: string;
  idFront?: string;
  idBack?: string;
  bankAccountNumber?: string;
  bankName?: string;
  swiftCode?: string;
  active: boolean;
  verified: boolean;
  systemRoleId: number;
}

const FALLBACK_AVATAR =
  "https://media.istockphoto.com/id/1495088043/vector/user-profile-icon-avatar-or-person-icon-profile-picture-portrait-symbol-default-portrait.jpg?s=612x612&w=0&k=20&c=dhV2p1JwmloBTOaGAtaA3AW1KSnjsdMt7-U_3EZElZ0=";

const roleLabel: Record<number, string> = {
  1: "Administrator",
  2: "Landlord",
  3: "Tenant",
  4: "Utility",
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
        <Icon className={`h-4 w-4 ${iconColor}`} size={18} />
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

const IdImage = ({ src, label }: { src?: string; label: string }) => {
  const [err, setErr] = useState(false);
  const url = src ? getImageUrl(src) : null;
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">{label}</p>
      {url && !err ? (
        <div className="h-32 rounded-xl overflow-hidden border border-[#E2E8F0] bg-slate-50">
          <img
            src={url}
            alt={label}
            className="h-full w-full object-cover"
            onError={() => setErr(true)}
          />
        </div>
      ) : (
        <div className="h-32 rounded-xl border border-dashed border-slate-200 bg-slate-50 flex flex-col items-center justify-center gap-2">
          <ImageIcon className="h-6 w-6 text-slate-300" />
          <p className="text-xs text-slate-400">Not available</p>
        </div>
      )}
    </div>
  );
};

const UserProfile = () => {
  const { toast } = useToast();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [avatarErr, setAvatarErr] = useState(false);

  const stored = JSON.parse(localStorage.getItem("user") ?? "{}");
  const apiUrl = import.meta.env.VITE_API_BASE_URL;
  const token = stored?.token;

  const fetchUser = async () => {
    setIsLoading(true);
    try {
      const { data } = await axios.get(`${apiUrl}/GetUserById/${stored.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUserData(data);
    } catch {
      toast({ title: "Could not load profile", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchUser(); }, []);

  const profileImage = userData?.passportPhoto ? getImageUrl(userData.passportPhoto) : null;
  const initials = userData?.fullName
    ? userData.fullName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "U";

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="relative rounded-2xl overflow-hidden"
        style={{ background: "linear-gradient(135deg, #0a0f1e 0%, #0f2044 45%, #1a3a6e 100%)" }}>
        <div className="absolute inset-0 pointer-events-none opacity-[0.04]"
          style={{ backgroundImage: "linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)", backgroundSize: "40px 40px" }} />
        <div className="relative px-6 pt-6 pb-20">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="h-8 w-8 rounded-lg bg-white/10 flex items-center justify-center">
                  <User className="h-4 w-4 text-white" />
                </div>
                <span className="text-blue-200 text-sm font-medium">My Account</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-white" style={{ fontFamily: "'Playfair Display', serif" }}>
                My Profile
              </h1>
              <p className="text-blue-200 text-sm mt-1">Your account details and identification documents.</p>
            </div>
            <button onClick={fetchUser} disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 text-white text-sm font-medium hover:bg-white/20 transition-colors disabled:opacity-50 mt-1">
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Profile card overlapping banner */}
        <div className="relative mx-4 -mt-14 mb-0 bg-white rounded-2xl border border-[#E2E8F0] shadow-xl overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-5">
            {/* Avatar */}
            <div className="flex-shrink-0">
              {isLoading ? (
                <Skeleton className="h-20 w-20 rounded-2xl" />
              ) : profileImage && !avatarErr ? (
                <div className="h-20 w-20 rounded-2xl overflow-hidden ring-4 ring-white shadow-md border border-[#E2E8F0]">
                  <img
                    src={profileImage}
                    alt={userData?.fullName}
                    className="h-full w-full object-cover"
                    onError={() => setAvatarErr(true)}
                  />
                </div>
              ) : (
                <div className="h-20 w-20 rounded-2xl overflow-hidden ring-4 ring-white shadow-md border border-[#E2E8F0]">
                  <img src={FALLBACK_AVATAR} alt="avatar" className="h-full w-full object-cover" />
                </div>
              )}
            </div>

            {/* Name + badges */}
            <div className="flex-1 min-w-0">
              {isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-5 w-32" />
                </div>
              ) : (
                <>
                  <h2 className="text-xl font-bold text-[#0F172A] leading-tight truncate">{userData?.fullName}</h2>
                  <p className="text-sm text-slate-500 mt-0.5 truncate">{userData?.email}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {userData?.active ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <ShieldCheck className="h-3 w-3" />Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                        <AlertCircle className="h-3 w-3" />Inactive
                      </span>
                    )}
                    {userData?.verified && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                        <BadgeCheck className="h-3 w-3" />Verified
                      </span>
                    )}
                    {userData?.systemRoleId && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-violet-50 text-violet-700 border border-violet-200">
                        {roleLabel[userData.systemRoleId] ?? "User"}
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* ID number box */}
            {!isLoading && userData?.nationalIdNumber && (
              <div className="flex-shrink-0 rounded-xl bg-gradient-to-br from-[#1D4ED8]/5 to-[#1D4ED8]/10 border border-[#1D4ED8]/20 px-5 py-3 text-right">
                <p className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">National ID</p>
                <p className="text-base font-bold text-[#1D4ED8] mt-0.5 tracking-widest">{userData.nationalIdNumber}</p>
              </div>
            )}
          </div>

          {/* Quick strip */}
          {!isLoading && userData && (
            <div className="flex items-center gap-0 border-t border-[#E2E8F0] divide-x divide-[#E2E8F0]">
              {[
                { icon: Phone, label: "Phone", value: userData.phoneNumber || "—" },
                { icon: Mail, label: "Email", value: userData.email || "—" },
                { icon: Building2, label: "Bank", value: userData.bankName || "—" },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex-1 flex items-center gap-2 px-4 py-3 min-w-0">
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

        <div className="h-6" />
      </div>

      {/* Detail Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Personal Information */}
        <SectionCard icon={User} title="Personal Information" iconBg="bg-blue-50" iconColor="text-blue-600">
          {isLoading ? <FieldSkeleton rows={4} /> : (
            <>
              <DetailRow icon={User} label="Full Name" value={userData?.fullName} iconBg="bg-blue-50" iconColor="text-blue-600" />
              <DetailRow icon={Mail} label="Email Address" value={userData?.email} iconBg="bg-blue-50" iconColor="text-blue-600" />
              <DetailRow icon={Phone} label="Phone Number" value={userData?.phoneNumber} iconBg="bg-blue-50" iconColor="text-blue-600" />
              <DetailRow icon={CreditCard} label="National ID" value={userData?.nationalIdNumber} iconBg="bg-blue-50" iconColor="text-blue-600" />
            </>
          )}
        </SectionCard>

        {/* Bank Details */}
        <SectionCard icon={Building2} title="Bank Details" iconBg="bg-emerald-50" iconColor="text-emerald-600">
          {isLoading ? <FieldSkeleton rows={3} /> : (
            <>
              <DetailRow icon={Building2} label="Bank Name" value={userData?.bankName} iconBg="bg-emerald-50" iconColor="text-emerald-600" />
              <DetailRow icon={CreditCard} label="Account Number" value={userData?.bankAccountNumber} iconBg="bg-emerald-50" iconColor="text-emerald-600" />
              <DetailRow icon={CreditCard} label="Swift / Sort Code" value={userData?.swiftCode} iconBg="bg-emerald-50" iconColor="text-emerald-600" />
            </>
          )}
        </SectionCard>

        {/* ID Documents */}
        <div className="md:col-span-2 bg-white rounded-xl border border-[#E2E8F0] overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-[#E2E8F0]">
            <div className="h-9 w-9 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
              <ImageIcon className="h-4 w-4 text-amber-600" />
            </div>
            <h3 className="text-sm font-semibold text-[#0F172A]">Identity Documents</h3>
          </div>
          <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {isLoading ? (
              <>
                <Skeleton className="h-32 rounded-xl" />
                <Skeleton className="h-32 rounded-xl" />
                <Skeleton className="h-32 rounded-xl" />
              </>
            ) : (
              <>
                <IdImage src={userData?.passportPhoto} label="Passport Photo" />
                <IdImage src={userData?.idFront} label="ID Front" />
                <IdImage src={userData?.idBack} label="ID Back" />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
