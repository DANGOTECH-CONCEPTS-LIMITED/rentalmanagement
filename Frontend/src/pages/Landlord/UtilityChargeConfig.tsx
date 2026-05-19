import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Save, Plus, Trash2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const { data } = await axios.get<ChargeConfig>(
          `${apiUrl}/GetLandlordUtilityCharge/${userData.id}`
        );
        setConfig(data);
      } catch (error: any) {
        toast({
          title: "Error",
          description: error.response?.data || "Failed to load charge configuration.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    fetchConfig();
  }, []);

  const addTier = () => {
    setConfig((prev) => ({
      ...prev,
      tiers: [...prev.tiers, { minAmount: null, maxAmount: null, charge: 0 }],
    }));
  };

  const removeTier = (index: number) => {
    setConfig((prev) => ({ ...prev, tiers: prev.tiers.filter((_, i) => i !== index) }));
  };

  const updateTier = (index: number, field: keyof Tier, value: string) => {
    setConfig((prev) => ({
      ...prev,
      tiers: prev.tiers.map((t, i) =>
        i === index ? { ...t, [field]: value === "" ? null : Number(value) } : t
      ),
    }));
  };

  const handleSave = async () => {
    if (config.chargeType === "Percentage" && (config.chargePercentage == null || config.chargePercentage <= 0)) {
      toast({ title: "Validation Error", description: "Charge percentage must be greater than 0.", variant: "destructive" });
      return;
    }
    if (config.chargeType === "FlatFee" && (config.flatFee == null || config.flatFee <= 0)) {
      toast({ title: "Validation Error", description: "Flat fee must be greater than 0.", variant: "destructive" });
      return;
    }
    if (config.chargeType === "Tiered" && config.tiers.length === 0) {
      toast({ title: "Validation Error", description: "At least one tier is required.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      await axios.put(`${apiUrl}/ConfigureLandlordUtilityCharge`, {
        LandlordId: userData.id,
        ChargeType: config.chargeType,
        ChargePercentage: config.chargeType === "Percentage" ? config.chargePercentage : null,
        FlatFee: config.chargeType === "FlatFee" ? config.flatFee : null,
        Tiers: config.chargeType === "Tiered" ? config.tiers.map((t) => ({
          MinAmount: t.minAmount,
          MaxAmount: t.maxAmount,
          Charge: t.charge,
        })) : [],
      });
      toast({ title: "Saved", description: "Utility charge configuration updated successfully." });
    } catch (error: any) {
      toast({ title: "Error", description: error.response?.data || "Failed to save configuration.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <section className="page-hero">
        <div className="space-y-3">
          <span className="inline-flex w-fit items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Utility
          </span>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Utility Charge Configuration</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Set how utility charges are calculated for your tenants — percentage, flat fee, or tiered.
            </p>
          </div>
        </div>
      </section>

      <div className="data-surface p-6 space-y-6">
        <div className="space-y-2">
          <Label className="text-sm font-medium">Charge Type</Label>
          <Select
            value={config.chargeType}
            onValueChange={(v) => setConfig((prev) => ({ ...prev, chargeType: v }))}
          >
            <SelectTrigger className="w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Percentage">Percentage of consumption</SelectItem>
              <SelectItem value="FlatFee">Flat Fee per billing</SelectItem>
              <SelectItem value="Tiered">Tiered (by amount range)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Tabs value={config.chargeType} onValueChange={(v) => setConfig((prev) => ({ ...prev, chargeType: v }))}>
          <TabsList>
            <TabsTrigger value="Percentage">Percentage</TabsTrigger>
            <TabsTrigger value="FlatFee">Flat Fee</TabsTrigger>
            <TabsTrigger value="Tiered">Tiered</TabsTrigger>
          </TabsList>

          {/* PERCENTAGE */}
          <TabsContent value="Percentage" className="pt-4 space-y-4">
            <div className="space-y-1 max-w-xs">
              <Label>Charge Percentage (%)</Label>
              <p className="text-xs text-muted-foreground">Applied as a % of the utility consumption amount.</p>
              <Input
                type="number"
                min={0}
                max={100}
                step={0.5}
                placeholder="e.g. 10"
                value={config.chargePercentage ?? ""}
                onChange={(e) => setConfig((prev) => ({ ...prev, chargePercentage: e.target.value ? Number(e.target.value) : null }))}
              />
            </div>
            <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-sm text-blue-700 flex items-start gap-2">
              <Zap className="h-4 w-4 mt-0.5 shrink-0" />
              <span>
                Example: If consumption is UGX 100,000 and percentage is 10%, tenant pays UGX 110,000.
              </span>
            </div>
          </TabsContent>

          {/* FLAT FEE */}
          <TabsContent value="FlatFee" className="pt-4 space-y-4">
            <div className="space-y-1 max-w-xs">
              <Label>Flat Fee Amount (UGX)</Label>
              <p className="text-xs text-muted-foreground">Fixed amount added to each utility bill.</p>
              <Input
                type="number"
                min={0}
                placeholder="e.g. 5000"
                value={config.flatFee ?? ""}
                onChange={(e) => setConfig((prev) => ({ ...prev, flatFee: e.target.value ? Number(e.target.value) : null }))}
              />
            </div>
            <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-sm text-blue-700 flex items-start gap-2">
              <Zap className="h-4 w-4 mt-0.5 shrink-0" />
              <span>
                Example: If flat fee is UGX 5,000, tenant pays consumption + UGX 5,000 per bill.
              </span>
            </div>
          </TabsContent>

          {/* TIERED */}
          <TabsContent value="Tiered" className="pt-4 space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Tiers</p>
                  <p className="text-xs text-muted-foreground">Define charge amounts per consumption range.</p>
                </div>
                <Button size="sm" variant="outline" onClick={addTier}>
                  <Plus className="h-4 w-4 mr-1" />Add Tier
                </Button>
              </div>

              {config.tiers.length === 0 ? (
                <div className="text-center text-muted-foreground text-sm py-6 border border-dashed rounded-lg">
                  No tiers defined. Click "Add Tier" to create one.
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Header */}
                  <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-3 text-xs font-medium text-muted-foreground px-1">
                    <span>Min Amount (UGX)</span>
                    <span>Max Amount (UGX)</span>
                    <span>Charge (UGX)</span>
                    <span />
                  </div>
                  {config.tiers.map((tier, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="grid grid-cols-[1fr_1fr_1fr_auto] gap-3 items-center"
                    >
                      <Input
                        type="number"
                        placeholder="e.g. 0"
                        value={tier.minAmount ?? ""}
                        onChange={(e) => updateTier(i, "minAmount", e.target.value)}
                      />
                      <Input
                        type="number"
                        placeholder="e.g. 50000"
                        value={tier.maxAmount ?? ""}
                        onChange={(e) => updateTier(i, "maxAmount", e.target.value)}
                      />
                      <Input
                        type="number"
                        placeholder="e.g. 2000"
                        value={tier.charge ?? ""}
                        onChange={(e) => updateTier(i, "charge", e.target.value)}
                      />
                      <Button size="sm" variant="outline" onClick={() => removeTier(i)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
            <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-sm text-blue-700 flex items-start gap-2">
              <Zap className="h-4 w-4 mt-0.5 shrink-0" />
              <span>
                Example: 0–50,000 → charge UGX 1,000 | 50,001–100,000 → charge UGX 2,000
              </span>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end pt-2 border-t">
          <Button disabled={isSubmitting} onClick={handleSave}>
            <Save className="mr-2 h-4 w-4" />
            {isSubmitting ? "Saving..." : "Save Configuration"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default UtilityChargeConfig;
