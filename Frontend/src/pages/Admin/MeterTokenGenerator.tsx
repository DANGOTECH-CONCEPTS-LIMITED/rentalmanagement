import { useState } from "react";
import { Zap, CheckCircle, Info, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import axios from "axios";

const inputCls =
  "h-11 w-full rounded-xl border border-[#E2E8F0] bg-white px-3.5 text-sm text-[#0F172A] placeholder:text-[#94A3B8] shadow-sm outline-none transition-all focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/10";

const MeterTokenGenerator = () => {
  const { toast } = useToast();
  const apiUrl = import.meta.env.VITE_API_BASE_URL;

  const [amount, setAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastResult, setLastResult] = useState<string | null>(null);

  const handleGenerate = async () => {
    const parsed = parseFloat(amount);
    if (!amount || isNaN(parsed) || parsed <= 0) {
      toast({
        title: "Validation Error",
        description: "Enter a valid amount greater than zero.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    setLastResult(null);
    try {
      const { data } = await axios.post(
        `${apiUrl}/api/Meter/generate-tokens`,
        parsed,
        { headers: { "Content-Type": "application/json" } }
      );
      const message =
        typeof data === "string" ? data : "Token generation started successfully.";
      setLastResult(message);
      toast({ title: "Tokens Generated", description: message });
      setAmount("");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data || "Token generation failed.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 w-full">
      {/* Hero Banner */}
      <section className="relative overflow-hidden rounded-2xl px-8 py-8 text-white shadow-xl" style={{ background: "linear-gradient(135deg, #0a0f1e 0%, #0f2044 45%, #1a3a6e 100%)" }}>
        <div className="absolute inset-0 pointer-events-none opacity-[0.04]"
          style={{ backgroundImage: "linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)", backgroundSize: "40px 40px" }} />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <span className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-blue-200">
              Admin
            </span>
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
              Meter Token Generator
            </h1>
            <p className="text-sm text-blue-200/80">
              Generate prepaid electricity tokens for all active meters by specifying a UGX amount.
            </p>
          </div>
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/10">
            <Zap className="h-8 w-8 text-blue-200" />
          </div>
        </div>
      </section>

      {/* Info Banner */}
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100">
          <Info className="h-4 w-4 text-amber-600" />
        </div>
        <div>
          <p className="text-sm font-semibold text-amber-800 mb-1">How it works</p>
          <p className="text-sm text-amber-700">
            Entering an amount triggers token generation for{" "}
            <strong>all registered meters</strong> in the background. This may take a few
            minutes depending on the number of meters.
          </p>
        </div>
      </div>

      {/* Form Card */}
      <div className="rounded-2xl border border-[#E2E8F0] bg-white shadow-sm overflow-hidden">
        <div className="border-b border-[#E2E8F0] bg-slate-50/60 px-6 py-4 flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100">
            <Zap className="h-4 w-4 text-blue-600" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#0F172A]">Generate Tokens</h3>
            <p className="text-xs text-slate-400">Specify the UGX amount to generate tokens for all meters</p>
          </div>
        </div>
        <div className="p-6 space-y-5">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#64748B] mb-2">
              Token Amount (UGX) *
            </label>
            <p className="text-xs text-slate-500 mb-2">
              Amount of electricity in UGX to generate tokens for.
            </p>
            <input
              type="number"
              min={1}
              step={1000}
              placeholder="e.g. 10000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className={inputCls + " max-w-xs"}
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              disabled={isSubmitting}
              onClick={handleGenerate}
              className="inline-flex items-center gap-2 rounded-xl bg-[#1D4ED8] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1e40af] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <Zap className="h-4 w-4" />
              {isSubmitting ? "Generating..." : "Generate Tokens"}
            </button>
          </div>

          {lastResult && (
            <div className="rounded-xl border border-green-200 bg-green-50 p-4 flex items-start gap-3">
              <CheckCircle className="h-4 w-4 mt-0.5 shrink-0 text-green-600" />
              <span className="text-sm text-green-800">{lastResult}</span>
            </div>
          )}
        </div>
      </div>

      {/* Notes Card */}
      <div className="rounded-2xl border border-[#E2E8F0] bg-white shadow-sm overflow-hidden">
        <div className="border-b border-[#E2E8F0] bg-slate-50/60 px-6 py-4 flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100">
            <FileText className="h-4 w-4 text-slate-500" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#0F172A]">Notes</h3>
            <p className="text-xs text-slate-400">Important information about token generation</p>
          </div>
        </div>
        <div className="p-6">
          <ul className="text-sm text-slate-500 space-y-2 list-disc list-inside">
            <li>Token generation runs as a background task — results are not instant.</li>
            <li>All meters registered in the system will receive tokens for the specified amount.</li>
            <li>Check the Utility Payment Dashboard for token delivery status.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default MeterTokenGenerator;
