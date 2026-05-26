import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Save, Calendar, Clock, CheckCircle2, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import axios from "axios";

const ordinal = (n: number) => {
  if (n === 1 || n === 21) return `${n}st`;
  if (n === 2 || n === 22) return `${n}nd`;
  if (n === 3 || n === 23) return `${n}rd`;
  return `${n}th`;
};

const getNextGenerationDate = (day: number) => {
  const now = new Date();
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), day);
  if (thisMonth > now) return thisMonth;
  return new Date(now.getFullYear(), now.getMonth() + 1, day);
};

const LandlordInvoiceSettings = () => {
  const { toast } = useToast();
  const [generationDay, setGenerationDay] = useState(1);
  const [dueDays, setDueDays] = useState(7);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const user = JSON.parse(localStorage.getItem("user") ?? "{}");
  const apiUrl = import.meta.env.VITE_API_BASE_URL;
  const token = user?.token;

  useEffect(() => {
    axios
      .get(`${apiUrl}/GetLandlordInvoiceSettings/${user.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then(({ data }) => {
        setGenerationDay(data.generationDay ?? 1);
        setDueDays(data.dueDays ?? 7);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (generationDay < 1 || generationDay > 28) {
      toast({ title: "Validation Error", description: "Generation day must be between 1 and 28.", variant: "destructive" });
      return;
    }
    if (dueDays < 1 || dueDays > 90) {
      toast({ title: "Validation Error", description: "Due days must be between 1 and 90.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await axios.put(
        `${apiUrl}/UpdateLandlordInvoiceSettings`,
        { landlordId: user.id, generationDay, dueDays },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      toast({ title: "Settings Saved", description: "Invoice schedule updated successfully." });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.response?.data ?? "Failed to save settings.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const nextDate = getNextGenerationDate(Math.min(Math.max(generationDay, 1), 28));
  const dueDate = new Date(nextDate);
  dueDate.setDate(dueDate.getDate() + dueDays);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page hero */}
      <section className="relative overflow-hidden rounded-2xl px-8 py-8 text-white shadow-xl" style={{ background: "linear-gradient(135deg, #0a0f1e 0%, #0f2044 45%, #1a3a6e 100%)" }}>
        <div className="absolute inset-0 pointer-events-none opacity-[0.04]"
          style={{ backgroundImage: "linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)", backgroundSize: "40px 40px" }} />
        <div className="relative space-y-2">
          <span className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-blue-200">
            Finance
          </span>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Invoice Schedule</h1>
          <p className="text-sm text-blue-200">Configure when monthly rent invoices are auto-generated and how long tenants have to pay.</p>
        </div>
      </section>

      {/* Main panel */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {/* Panel header */}
        <div className="flex items-center gap-3 border-b border-slate-100 bg-blue-50 px-6 py-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
            <Calendar className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">Recurring Invoice Settings</p>
            <p className="text-xs text-slate-500">Applies to all active tenants under your properties</p>
          </div>
        </div>

        <div className="px-6 py-6 space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 gap-6 sm:grid-cols-2"
          >
            {/* Generation Day */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50">
                  <Calendar className="h-3.5 w-3.5 text-blue-600" />
                </div>
                <div>
                  <Label className="text-sm font-medium text-slate-700">Invoice Generation Day</Label>
                  <p className="text-xs text-slate-400">Day of month (1–28)</p>
                </div>
              </div>
              <div className="relative max-w-xs">
                <Input
                  type="number"
                  min={1}
                  max={28}
                  value={generationDay}
                  onChange={(e) => setGenerationDay(Number(e.target.value))}
                  className="pr-16 text-base font-medium"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-medium">
                  of month
                </span>
              </div>
              {generationDay >= 1 && generationDay <= 28 && (
                <p className="text-xs text-blue-600 font-medium">
                  Invoices generate on the <span className="font-bold">{ordinal(generationDay)}</span> of each month
                </p>
              )}
            </div>

            {/* Due Days */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50">
                  <Clock className="h-3.5 w-3.5 text-amber-600" />
                </div>
                <div>
                  <Label className="text-sm font-medium text-slate-700">Payment Due Window</Label>
                  <p className="text-xs text-slate-400">Days after invoice to pay (1–90)</p>
                </div>
              </div>
              <div className="relative max-w-xs">
                <Input
                  type="number"
                  min={1}
                  max={90}
                  value={dueDays}
                  onChange={(e) => setDueDays(Number(e.target.value))}
                  className="pr-12 text-base font-medium"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-medium">days</span>
              </div>
              {dueDays >= 1 && (
                <p className="text-xs text-amber-600 font-medium">
                  Payment due <span className="font-bold">{dueDays} day{dueDays !== 1 ? "s" : ""}</span> after invoice is created
                </p>
              )}
            </div>
          </motion.div>

          {/* Preview box */}
          {generationDay >= 1 && generationDay <= 28 && dueDays >= 1 && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-blue-100 bg-blue-50 p-4 flex items-start gap-3"
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-600">
                <Calendar className="h-3.5 w-3.5 text-white" />
              </div>
              <div className="text-sm text-blue-700 leading-relaxed space-y-0.5">
                <p>
                  <span className="font-semibold">Next invoice run:</span>{" "}
                  {nextDate.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })}
                </p>
                <p>
                  <span className="font-semibold">Tenants must pay by:</span>{" "}
                  {dueDate.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })}
                </p>
              </div>
            </motion.div>
          )}

          {/* How it works */}
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-2">
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">How it works</p>
            <ul className="space-y-1.5">
              {[
                { icon: Calendar, color: "text-blue-500", text: `On the ${ordinal(generationDay)} of each month, a rent invoice is automatically created for every active tenant.` },
                { icon: MessageSquare, color: "text-emerald-500", text: "Each tenant receives an SMS notification immediately after the invoice is created." },
                { icon: Clock, color: "text-amber-500", text: `The invoice is marked due ${dueDays} day${dueDays !== 1 ? "s" : ""} after it is generated.` },
              ].map(({ icon: Icon, color, text }, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <Icon className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${color}`} />
                  <span className="text-xs text-slate-500">{text}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-6 py-4">
          <p className="text-xs text-slate-400">Changes apply from the next billing cycle.</p>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="gap-2 min-w-[160px] bg-blue-600 hover:bg-blue-700 text-white"
          >
            {saved ? (
              <>
                <CheckCircle2 className="h-4 w-4" /> Saved!
              </>
            ) : saving ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Saving…
              </>
            ) : (
              <>
                <Save className="h-4 w-4" /> Save Settings
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default LandlordInvoiceSettings;
