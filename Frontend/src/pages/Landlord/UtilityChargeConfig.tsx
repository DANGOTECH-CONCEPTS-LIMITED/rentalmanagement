import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Save, Plus, Trash2, Zap, Percent, DollarSign, BarChart3, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import axios from "axios";

interface Tier {
  minAmount: number | null;
  maxAmount: number | null;
  charge: number;
}

interface ChargeConfig {
  landlordId: number;
  chargeType: string;
  chargePercentage: number | null;
  flatFee: number | null;
  tiers: Tier[];
}

const TYPES = [
  {
    value: "Percentage",
    label: "Percentage",
    subtitle: "% of consumption",
    icon: Percent,
    color: "text-blue-600",
    bg: "bg-blue-50",
    ring: "ring-blue-500",
    activeBg: "bg-blue-600",
  },
  {
    value: "FlatFee",
    label: "Flat Fee",
    subtitle: "Fixed per bill",
    icon: DollarSign,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    ring: "ring-emerald-500",
    activeBg: "bg-emerald-600",
  },
  {
    value: "Tiered",
    label: "Tiered",
    subtitle: "By amount range",
    icon: BarChart3,
    color: "text-violet-600",
    bg: "bg-violet-50",
    ring: "ring-violet-500",
    activeBg: "bg-violet-600",
  },
];

const UtilityChargeConfig = () => {
  const { toast } = useToast();
  const apiUrl = import.meta.env.VITE_API_BASE_URL;
  const userData = JSON.parse(localStorage.getItem("user") || "{}");

  const [config, setConfig] = useState<ChargeConfig>({
    landlordId: userData.id,
    chargeType: "Percentage",
    chargePercentage: 10,
    flatFee: null,
    tiers: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const { data } = await axios.get<ChargeConfig>(
          `${apiUrl}/GetLandlordUtilityCharge/${userData.id}`
        );
        setConfig(data);
      } catch {
        // No config yet — defaults are fine
      } finally {
        setIsLoading(false);
      }
    };
    fetchConfig();
  }, []);

  const addTier = () =>
    setConfig((p) => ({ ...p, tiers: [...p.tiers, { minAmount: null, maxAmount: null, charge: 0 }] }));

  const removeTier = (i: number) =>
    setConfig((p) => ({ ...p, tiers: p.tiers.filter((_, idx) => idx !== i) }));

  const updateTier = (i: number, field: keyof Tier, value: string) =>
    setConfig((p) => ({
      ...p,
      tiers: p.tiers.map((t, idx) =>
        idx === i ? { ...t, [field]: value === "" ? null : Number(value) } : t
      ),
    }));

  const handleSave = async () => {
    if (config.chargeType === "Percentage" && (!config.chargePercentage || config.chargePercentage <= 0)) {
      toast({ title: "Validation Error", description: "Charge percentage must be greater than 0.", variant: "destructive" });
      return;
    }
    if (config.chargeType === "FlatFee" && (!config.flatFee || config.flatFee <= 0)) {
      toast({ title: "Validation Error", description: "Flat fee must be greater than 0.", variant: "destructive" });
      return;
    }
    if (config.chargeType === "Tiered" && config.tiers.length === 0) {
      toast({ title: "Validation Error", description: "Add at least one tier.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      await axios.put(`${apiUrl}/ConfigureLandlordUtilityCharge`, {
        LandlordId: userData.id,
        ChargeType: config.chargeType,
        ChargePercentage: config.chargeType === "Percentage" ? config.chargePercentage : null,
        FlatFee: config.chargeType === "FlatFee" ? config.flatFee : null,
        Tiers: config.chargeType === "Tiered"
          ? config.tiers.map((t) => ({ MinAmount: t.minAmount, MaxAmount: t.maxAmount, Charge: t.charge }))
          : [],
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      toast({ title: "Configuration Saved", description: "Utility charge settings updated successfully." });
    } catch (error: any) {
      toast({ title: "Error", description: error.response?.data || "Failed to save configuration.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeType = TYPES.find((t) => t.value === config.chargeType) ?? TYPES[0];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page hero */}
      <div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-blue-600">
          <Zap className="h-3 w-3" /> Utility
        </span>
        <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900">Utility Charge Configuration</h1>
        <p className="mt-1 text-sm text-slate-500">
          Choose how utility charges are calculated for your tenants.
        </p>
      </div>

      {/* Type selector cards */}
      <div className="grid grid-cols-3 gap-3">
        {TYPES.map((type) => {
          const Icon = type.icon;
          const isActive = config.chargeType === type.value;
          return (
            <button
              key={type.value}
              onClick={() => setConfig((p) => ({ ...p, chargeType: type.value }))}
              className={`relative flex flex-col items-start gap-2 rounded-2xl border-2 p-4 text-left transition-all duration-150 ${
                isActive
                  ? `border-blue-500 bg-blue-50 shadow-md shadow-blue-100`
                  : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              {isActive && (
                <CheckCircle2 className="absolute top-3 right-3 h-4 w-4 text-blue-500" />
              )}
              <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${isActive ? "bg-blue-600" : "bg-slate-100"}`}>
                <Icon className={`h-4 w-4 ${isActive ? "text-white" : "text-slate-500"}`} />
              </div>
              <div>
                <p className={`text-sm font-semibold ${isActive ? "text-blue-700" : "text-slate-700"}`}>{type.label}</p>
                <p className={`text-xs ${isActive ? "text-blue-500" : "text-slate-400"}`}>{type.subtitle}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Config panel */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {/* Panel header */}
        <div className={`flex items-center gap-3 border-b border-slate-100 px-6 py-4 ${activeType.bg}`}>
          <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${activeType.activeBg}`}>
            <activeType.icon className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">{activeType.label} Charge</p>
            <p className="text-xs text-slate-500">{activeType.subtitle}</p>
          </div>
        </div>

        <div className="px-6 py-6 space-y-6">
          <AnimatePresence mode="wait">
            {/* PERCENTAGE */}
            {config.chargeType === "Percentage" && (
              <motion.div
                key="percentage"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="space-y-5"
              >
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700">Charge Percentage (%)</Label>
                  <p className="text-xs text-slate-400">Applied as a percentage of the utility consumption amount.</p>
                  <div className="relative max-w-sm">
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      step={0.5}
                      placeholder="e.g. 10"
                      className="pr-10 text-base font-medium"
                      value={config.chargePercentage ?? ""}
                      onChange={(e) => setConfig((p) => ({ ...p, chargePercentage: e.target.value ? Number(e.target.value) : null }))}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">%</span>
                  </div>
                </div>
                <div className="rounded-xl bg-blue-50 border border-blue-100 p-4 flex items-start gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-600">
                    <Zap className="h-3.5 w-3.5 text-white" />
                  </div>
                  <div className="text-sm text-blue-700 leading-relaxed">
                    <span className="font-semibold">Example:</span> If consumption is UGX 100,000 and percentage is{" "}
                    <span className="font-semibold">{config.chargePercentage ?? 10}%</span>, tenant pays{" "}
                    <span className="font-semibold">
                      UGX {((100000 * (1 + (config.chargePercentage ?? 10) / 100))).toLocaleString()}.
                    </span>
                  </div>
                </div>
              </motion.div>
            )}

            {/* FLAT FEE */}
            {config.chargeType === "FlatFee" && (
              <motion.div
                key="flatfee"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="space-y-5"
              >
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700">Flat Fee Amount</Label>
                  <p className="text-xs text-slate-400">Fixed amount added to each utility bill regardless of consumption.</p>
                  <div className="relative max-w-sm">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">UGX</span>
                    <Input
                      type="number"
                      min={0}
                      placeholder="e.g. 5000"
                      className="pl-12 text-base font-medium"
                      value={config.flatFee ?? ""}
                      onChange={(e) => setConfig((p) => ({ ...p, flatFee: e.target.value ? Number(e.target.value) : null }))}
                    />
                  </div>
                </div>
                <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-4 flex items-start gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-600">
                    <Zap className="h-3.5 w-3.5 text-white" />
                  </div>
                  <div className="text-sm text-emerald-700 leading-relaxed">
                    <span className="font-semibold">Example:</span> Tenant pays their consumption amount +{" "}
                    <span className="font-semibold">UGX {(config.flatFee ?? 5000).toLocaleString()}</span> per bill.
                  </div>
                </div>
              </motion.div>
            )}

            {/* TIERED */}
            {config.chargeType === "Tiered" && (
              <motion.div
                key="tiered"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-700">Consumption Tiers</p>
                    <p className="text-xs text-slate-400">Define charge per consumption range (UGX).</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={addTier} className="gap-1.5">
                    <Plus className="h-3.5 w-3.5" /> Add Tier
                  </Button>
                </div>

                {config.tiers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 py-10 text-center">
                    <BarChart3 className="h-8 w-8 text-slate-300 mb-2" />
                    <p className="text-sm font-medium text-slate-400">No tiers yet</p>
                    <p className="text-xs text-slate-300 mt-1">Click "Add Tier" to define your first range.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="grid grid-cols-[1fr_1fr_1fr_36px] gap-2 px-1 text-xs font-medium text-slate-400 uppercase tracking-wider">
                      <span>Min (UGX)</span>
                      <span>Max (UGX)</span>
                      <span>Charge (UGX)</span>
                      <span />
                    </div>
                    {config.tiers.map((tier, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="grid grid-cols-[1fr_1fr_1fr_36px] gap-2 items-center"
                      >
                        <Input type="number" placeholder="0" value={tier.minAmount ?? ""} onChange={(e) => updateTier(i, "minAmount", e.target.value)} className="text-sm" />
                        <Input type="number" placeholder="50000" value={tier.maxAmount ?? ""} onChange={(e) => updateTier(i, "maxAmount", e.target.value)} className="text-sm" />
                        <Input type="number" placeholder="2000" value={tier.charge ?? ""} onChange={(e) => updateTier(i, "charge", e.target.value)} className="text-sm" />
                        <button onClick={() => removeTier(i)} className="flex h-9 w-9 items-center justify-center rounded-lg border border-red-100 bg-red-50 text-red-400 transition hover:bg-red-100 hover:text-red-600">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </motion.div>
                    ))}
                  </div>
                )}

                <div className="rounded-xl bg-violet-50 border border-violet-100 p-4 flex items-start gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-600">
                    <Zap className="h-3.5 w-3.5 text-white" />
                  </div>
                  <p className="text-sm text-violet-700 leading-relaxed">
                    <span className="font-semibold">Example:</span> 0–50,000 → UGX 1,000 | 50,001–100,000 → UGX 2,000
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-6 py-4">
          <p className="text-xs text-slate-400">Changes apply to future utility billing cycles.</p>
          <Button
            onClick={handleSave}
            disabled={isSubmitting}
            className="gap-2 min-w-[160px] bg-blue-600 hover:bg-blue-700 text-white"
          >
            {saved ? (
              <>
                <CheckCircle2 className="h-4 w-4" /> Saved!
              </>
            ) : isSubmitting ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Saving…
              </>
            ) : (
              <>
                <Save className="h-4 w-4" /> Save Configuration
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default UtilityChargeConfig;
