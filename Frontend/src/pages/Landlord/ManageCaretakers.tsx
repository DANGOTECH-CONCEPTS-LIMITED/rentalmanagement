import { useEffect, useState } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import {
  UserPlus, Trash2, Phone, Mail, IdCard,
  ShieldCheck, Users, CheckCircle2, XCircle, X,
} from "lucide-react";

interface Caretaker {
  id: number;
  fullName: string;
  email: string;
  phoneNumber: string;
  nationalIdNumber: string;
  active: boolean;
  systemRole?: { name: string };
}

const CARETAKER_ROLE_ID = 5;

const emptyForm = {
  fullName: "",
  email: "",
  phoneNumber: "",
  nationalIdNumber: "",
  password: "",
};

const FIELDS = [
  { label: "Full Name", key: "fullName", placeholder: "John Doe", required: true },
  { label: "Email", key: "email", placeholder: "john@example.com", type: "email", required: true },
  { label: "Phone Number", key: "phoneNumber", placeholder: "0700000000", required: true },
  { label: "National ID", key: "nationalIdNumber", placeholder: "CM123456789" },
  { label: "Initial Password", key: "password", placeholder: "Leave blank for default (Caretaker@123)", type: "password" },
];

export default function ManageCaretakers() {
  const { userData } = useAuth();
  const { toast } = useToast();
  const apiUrl = import.meta.env.VITE_API_BASE_URL;

  const [caretakers, setCaretakers] = useState<Caretaker[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => { fetchCaretakers(); }, []);

  const fetchCaretakers = async () => {
    setIsLoading(true);
    try {
      const { data } = await axios.get(`${apiUrl}/GetCaretakersByLandLordId/${userData?.id}`);
      setCaretakers(Array.isArray(data) ? data : []);
    } catch {
      setCaretakers([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!form.fullName?.trim() || !form.email?.trim() || !form.phoneNumber?.trim()) {
      toast({ title: "Validation", description: "Name, email and phone are required.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      await axios.post(`${apiUrl}/RegisterUserMinusFiles`, {
        FullName: form.fullName.trim(),
        Email: form.email.trim(),
        PhoneNumber: form.phoneNumber.trim(),
        NationalIdNumber: form.nationalIdNumber?.trim() || "",
        PasswordHash: form.password?.trim() || "Caretaker@123",
        SystemRoleId: CARETAKER_ROLE_ID,
        LandlordId: userData?.id,
        Active: true,
        Verified: false,
      });
      toast({ title: "Caretaker Added", description: `${form.fullName} has been registered.` });
      setAddOpen(false);
      setForm(emptyForm);
      fetchCaretakers();
    } catch (err: any) {
      const msg = typeof err.response?.data === "string"
        ? err.response.data
        : JSON.stringify(err.response?.data) || err.message || "Failed to add caretaker.";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Remove ${name} as caretaker?`)) return;
    setDeletingId(id);
    try {
      await axios.delete(`${apiUrl}/DeleteUser/${id}`);
      toast({ title: "Removed", description: `${name} has been removed.` });
      setCaretakers(prev => prev.filter(c => c.id !== id));
    } catch {
      toast({ title: "Error", description: "Failed to remove caretaker.", variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = caretakers.filter(c =>
    !search ||
    c.fullName?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase()) ||
    c.phoneNumber?.includes(search)
  );

  const totalActive = caretakers.filter(c => c.active).length;
  const totalInactive = caretakers.filter(c => !c.active).length;

  const kpiCards = [
    { label: "Total Caretakers", value: caretakers.length, Icon: Users, border: "border-l-blue-500", bg: "bg-blue-50", color: "text-blue-600" },
    { label: "Active", value: totalActive, Icon: CheckCircle2, border: "border-l-emerald-500", bg: "bg-emerald-50", color: "text-emerald-600" },
    { label: "Inactive", value: totalInactive, Icon: XCircle, border: "border-l-red-400", bg: "bg-red-50", color: "text-red-500" },
    { label: "Role", value: "Caretaker", Icon: ShieldCheck, border: "border-l-amber-500", bg: "bg-amber-50", color: "text-amber-600" },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-6 space-y-6">

      {/* Header */}
      <div className="rounded-2xl overflow-hidden shadow-lg">
        <div className="bg-gradient-to-r from-[#0F172A] to-[#1D4ED8] px-6 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Caretakers</h1>
            <p className="text-blue-200 text-sm mt-0.5">Manage staff assigned to your properties</p>
          </div>
          <button
            onClick={() => setAddOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-white text-[#1D4ED8] text-sm font-semibold hover:bg-blue-50 transition-colors shadow-lg"
          >
            <UserPlus className="h-4 w-4" /> Add Caretaker
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {kpiCards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className={`bg-white rounded-xl border border-[#E2E8F0] border-l-4 ${card.border} p-4 flex items-center gap-3`}
          >
            <div className={`h-10 w-10 rounded-lg ${card.bg} flex items-center justify-center flex-shrink-0`}>
              <card.Icon className={`h-5 w-5 ${card.color}`} />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-slate-500">{card.label}</p>
              <p className={`text-base font-bold mt-0.5 truncate ${card.color}`}>{card.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#E2E8F0]">
          <h2 className="text-sm font-semibold text-slate-700">All Caretakers</h2>
          <Input
            placeholder="Search name, email, phone…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-8 w-48 text-xs"
          />
        </div>

        {isLoading ? (
          <div className="py-16 text-center text-slate-400 text-sm">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-3">
            <ShieldCheck className="h-12 w-12 opacity-20" />
            <p className="text-sm">{search ? "No caretakers match your search." : "No caretakers added yet."}</p>
            {!search && (
              <button
                onClick={() => setAddOpen(true)}
                className="text-xs text-blue-600 hover:underline"
              >
                Add your first caretaker
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                  {["Caretaker", "Email", "Phone", "National ID", "Status", ""].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {filtered.map((c, i) => (
                  <motion.tr
                    key={c.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-full bg-[#1D4ED8]/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold text-[#1D4ED8]">
                            {c.fullName?.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <span className="font-medium text-[#0F172A]">{c.fullName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <Mail className="h-3.5 w-3.5 text-slate-400" />{c.email}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <Phone className="h-3.5 w-3.5 text-slate-400" />{c.phoneNumber}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <IdCard className="h-3.5 w-3.5 text-slate-400" />
                        {c.nationalIdNumber || <span className="text-slate-300">—</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        c.active
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-slate-100 text-slate-500 border border-slate-200"
                      }`}>
                        {c.active ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                        {c.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        disabled={deletingId === c.id}
                        onClick={() => handleDelete(c.id, c.fullName)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 transition-colors disabled:opacity-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        {deletingId === c.id ? "Removing…" : "Remove"}
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Modal */}
      {addOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setAddOpen(false)} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
          >
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-[#0F172A] to-[#1D4ED8] px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">Add Caretaker</h2>
                <p className="text-blue-200 text-xs mt-0.5">Register a new staff member</p>
              </div>
              <button onClick={() => setAddOpen(false)} className="text-white/70 hover:text-white transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              {FIELDS.map(({ label, key, placeholder, type, required }) => (
                <div key={key}>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                    {label}{required && <span className="text-red-500 ml-0.5">*</span>}
                  </label>
                  <Input
                    type={type || "text"}
                    placeholder={placeholder}
                    value={form[key as keyof typeof emptyForm]}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    className="w-full"
                  />
                </div>
              ))}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setAddOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAdd}
                  disabled={submitting}
                  className="px-5 py-2 rounded-lg bg-[#1D4ED8] text-white text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-60"
                >
                  {submitting ? "Adding…" : "Add Caretaker"}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
