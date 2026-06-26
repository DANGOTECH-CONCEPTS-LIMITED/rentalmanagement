import { useEffect, useState } from "react";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { UserPlus, Trash2, Phone, Mail, IdCard, ShieldCheck } from "lucide-react";

interface Caretaker {
  id: number;
  fullName: string;
  email: string;
  phoneNumber: string;
  nationalIdNumber: string;
  active: boolean;
  systemRole?: { name: string };
}

const CARETAKER_ROLE_ID = 5; // seeded by migration AddCaretakerRoleAndLandlordLink

const emptyForm = {
  fullName: "",
  email: "",
  phoneNumber: "",
  nationalIdNumber: "",
  password: "",
};

export default function ManageCaretakers() {
  const { userData } = useAuth(); // token auto-applied by axios global interceptor in AuthContext
  const { toast } = useToast();
  const apiUrl = import.meta.env.VITE_API_BASE_URL;

  const [caretakers, setCaretakers] = useState<Caretaker[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    fetchCaretakers();
  }, []);

  const fetchCaretakers = async () => {
    setIsLoading(true);
    try {
      const { data } = await axios.get(
        `${apiUrl}/GetCaretakersByLandLordId/${userData?.id}`
      );
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
      const payload = {
        FullName: form.fullName.trim(),
        Email: form.email.trim(),
        PhoneNumber: form.phoneNumber.trim(),
        NationalIdNumber: form.nationalIdNumber?.trim() || "",
        PasswordHash: form.password?.trim() || "Caretaker@123",
        SystemRoleId: CARETAKER_ROLE_ID,
        LandlordId: userData?.id,
        Active: true,
        Verified: false,
      };
      await axios.post(`${apiUrl}/RegisterUserMinusFiles`, payload);
      toast({ title: "Success", description: `${form.fullName} added as caretaker.` });
      setShowAdd(false);
      setForm(emptyForm);
      fetchCaretakers();
    } catch (err: any) {
      const msg = typeof err.response?.data === "string"
        ? err.response.data
        : JSON.stringify(err.response?.data) || err.message || "Failed to add caretaker.";
      toast({ title: "Error adding caretaker", description: msg, variant: "destructive" });
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
      setCaretakers((prev) => prev.filter((c) => c.id !== id));
    } catch {
      toast({ title: "Error", description: "Failed to remove caretaker.", variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Caretakers</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Manage staff assigned to your properties
          </p>
        </div>
        <Button onClick={() => setShowAdd(true)} className="gap-2">
          <UserPlus className="h-4 w-4" /> Add Caretaker
        </Button>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="text-center py-16 text-slate-400">Loading…</div>
      ) : caretakers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-3">
          <ShieldCheck className="h-12 w-12 opacity-30" />
          <p className="text-sm">No caretakers added yet.</p>
          <Button variant="outline" size="sm" onClick={() => setShowAdd(true)}>
            Add your first caretaker
          </Button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {caretakers.map((c) => (
            <div
              key={c.id}
              className="flex items-start justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="space-y-1">
                <p className="font-semibold text-slate-800">{c.fullName}</p>
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Mail className="h-3 w-3" /> {c.email}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Phone className="h-3 w-3" /> {c.phoneNumber}
                </div>
                {c.nationalIdNumber && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <IdCard className="h-3 w-3" /> {c.nationalIdNumber}
                  </div>
                )}
                <span
                  className={`inline-block mt-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    c.active
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {c.active ? "Active" : "Inactive"}
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="text-red-400 hover:text-red-600 hover:bg-red-50"
                disabled={deletingId === c.id}
                onClick={() => handleDelete(c.id, c.fullName)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Add Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Caretaker</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            {[
              { label: "Full Name *", key: "fullName", placeholder: "John Doe" },
              { label: "Email *", key: "email", placeholder: "john@example.com", type: "email" },
              { label: "Phone Number *", key: "phoneNumber", placeholder: "0700000000" },
              { label: "National ID", key: "nationalIdNumber", placeholder: "CM123456..." },
              { label: "Initial Password", key: "password", placeholder: "Leave blank for default", type: "password" },
            ].map(({ label, key, placeholder, type }) => (
              <div key={key}>
                <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">
                  {label}
                </label>
                <Input
                  type={type || "text"}
                  placeholder={placeholder}
                  value={form[key as keyof typeof emptyForm]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  className="mt-1"
                />
              </div>
            ))}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowAdd(false)}>
                Cancel
              </Button>
              <Button type="button" onClick={handleAdd} disabled={submitting}>
                {submitting ? "Adding…" : "Add Caretaker"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
