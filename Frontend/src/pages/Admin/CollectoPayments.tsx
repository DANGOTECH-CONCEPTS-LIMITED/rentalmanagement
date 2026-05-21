import { useState } from "react";
import { Send, RefreshCw, Smartphone, CreditCard, Activity } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import axios from "axios";

interface PayToPayResult {
  referenceId?: string;
  status?: string;
  reason?: string;
  [key: string]: unknown;
}

const PAYMENT_OPTIONS = ["MTN_MOMO_UG", "AIRTEL_MONEY_UG"];

const inputCls =
  "h-11 w-full rounded-xl border border-[#E2E8F0] bg-white px-3.5 text-sm text-[#0F172A] placeholder:text-[#94A3B8] shadow-sm outline-none transition-all focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/10";
const selCls =
  "h-11 w-full rounded-xl border border-[#E2E8F0] bg-white px-3.5 text-sm text-[#0F172A] shadow-sm outline-none transition-all focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/10 cursor-pointer";

type TabId = "rtp" | "rtp-status" | "service" | "service-status";

const TABS: { id: TabId; label: string }[] = [
  { id: "rtp", label: "Request to Pay" },
  { id: "rtp-status", label: "Payment Status" },
  { id: "service", label: "Service Payment" },
  { id: "service-status", label: "Service Status" },
];

const ResultBox = ({ data }: { data: unknown }) => (
  <div className="rounded-xl bg-slate-950 p-4 text-xs font-mono text-slate-100 whitespace-pre-wrap break-all max-h-64 overflow-auto">
    {JSON.stringify(data, null, 2)}
  </div>
);

const CollectoPayments = () => {
  const { toast } = useToast();
  const apiUrl = import.meta.env.VITE_API_BASE_URL;
  const [activeTab, setActiveTab] = useState<TabId>("rtp");

  // Request to Pay state
  const [rtp, setRtp] = useState({ paymentOption: "MTN_MOMO_UG", phone: "", amount: "", reference: "" });
  const [rtpLoading, setRtpLoading] = useState(false);
  const [rtpResult, setRtpResult] = useState<PayToPayResult | null>(null);

  // Request to Pay Status state
  const [statusRef, setStatusRef] = useState("");
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusResult, setStatusResult] = useState<unknown>(null);

  // Service Payment state
  const [sp, setSp] = useState({ service: "", paymentOption: "MTN_MOMO_UG", phone: "", amount: "", message: "" });
  const [spLoading, setSpLoading] = useState(false);
  const [spResult, setSpResult] = useState<unknown>(null);

  // Service Payment Status state
  const [spStatusRef, setSpStatusRef] = useState("");
  const [spStatusLoading, setSpStatusLoading] = useState(false);
  const [spStatusResult, setSpStatusResult] = useState<unknown>(null);

  const handleRequestToPay = async () => {
    const amount = parseFloat(rtp.amount);
    if (!rtp.phone || !rtp.amount || isNaN(amount) || amount <= 0) {
      toast({ title: "Validation Error", description: "Phone and a valid amount are required.", variant: "destructive" });
      return;
    }
    setRtpLoading(true);
    setRtpResult(null);
    try {
      const { data } = await axios.post(`${apiUrl}/requestToPay`, {
        PaymentOption: rtp.paymentOption,
        Phone: rtp.phone,
        Amount: amount,
        Reference: rtp.reference || undefined,
      });
      setRtpResult(data);
      if (data?.referenceId) setStatusRef(data.referenceId);
      toast({ title: "Request Sent", description: "Payment request submitted successfully." });
      setRtp((prev) => ({ ...prev, phone: "", amount: "", reference: "" }));
    } catch (error: unknown) {
      const err = error as { response?: { data?: string } };
      toast({ title: "Error", description: err.response?.data || "Failed to send payment request.", variant: "destructive" });
    } finally {
      setRtpLoading(false);
    }
  };

  const handleCheckStatus = async () => {
    if (!statusRef.trim()) {
      toast({ title: "Validation Error", description: "Enter a reference ID.", variant: "destructive" });
      return;
    }
    setStatusLoading(true);
    setStatusResult(null);
    try {
      const { data } = await axios.post(`${apiUrl}/requestToPayStatus`, { ReferenceId: statusRef.trim() });
      setStatusResult(data);
    } catch (error: unknown) {
      const err = error as { response?: { data?: string } };
      toast({ title: "Error", description: err.response?.data || "Failed to fetch status.", variant: "destructive" });
    } finally {
      setStatusLoading(false);
    }
  };

  const handleServicePayment = async () => {
    const amount = parseFloat(sp.amount);
    if (!sp.service || !sp.phone || !sp.amount || isNaN(amount) || amount <= 0) {
      toast({ title: "Validation Error", description: "Service, phone, and a valid amount are required.", variant: "destructive" });
      return;
    }
    setSpLoading(true);
    setSpResult(null);
    try {
      const { data } = await axios.post(`${apiUrl}/servicePayment`, {
        Service: sp.service,
        PaymentOption: sp.paymentOption,
        Phone: sp.phone,
        Amount: amount,
        Message: sp.message || undefined,
      });
      setSpResult(data);
      if (data?.referenceId) setSpStatusRef(data.referenceId);
      toast({ title: "Payment Initiated", description: "Service payment initiated successfully." });
      setSp((prev) => ({ ...prev, service: "", phone: "", amount: "", message: "" }));
    } catch (error: unknown) {
      const err = error as { response?: { data?: string } };
      toast({ title: "Error", description: err.response?.data || "Failed to initiate service payment.", variant: "destructive" });
    } finally {
      setSpLoading(false);
    }
  };

  const handleServicePaymentStatus = async () => {
    if (!spStatusRef.trim()) {
      toast({ title: "Validation Error", description: "Enter a reference ID.", variant: "destructive" });
      return;
    }
    setSpStatusLoading(true);
    setSpStatusResult(null);
    try {
      const { data } = await axios.post(`${apiUrl}/servicePaymentStatus`, { ReferenceId: spStatusRef.trim() });
      setSpStatusResult(data);
    } catch (error: unknown) {
      const err = error as { response?: { data?: string } };
      toast({ title: "Error", description: err.response?.data || "Failed to fetch service payment status.", variant: "destructive" });
    } finally {
      setSpStatusLoading(false);
    }
  };

  return (
    <div className="space-y-6 w-full">
      {/* Hero Banner */}
      <section className="relative overflow-hidden rounded-2xl px-8 py-8 text-white shadow-xl" style={{ background: "linear-gradient(135deg, #0a0f1e 0%, #0f2044 45%, #1a3a6e 100%)" }}>
        <div className="absolute inset-0 pointer-events-none opacity-[0.04]"
          style={{ backgroundImage: "linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)", backgroundSize: "40px 40px" }} />
        <div className="relative flex flex-col gap-5">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-blue-200">
              <CreditCard className="h-3 w-3" />
              Admin
            </span>
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Collecto Payments</h1>
            <p className="text-sm text-blue-200/80">
              Initiate and track mobile money collection and service payment requests via Collecto.
            </p>
          </div>
        </div>
      </section>

      {/* Tab Pills */}
      <div className="flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-full border px-4 py-2 text-sm font-semibold transition-all ${
              activeTab === tab.id
                ? "border-[#1D4ED8] bg-[#1D4ED8] text-white shadow-sm"
                : "border-[#E2E8F0] bg-white text-slate-600 hover:border-[#1D4ED8]/40 hover:text-[#1D4ED8]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="rounded-2xl border border-[#E2E8F0] bg-white shadow-sm p-6 space-y-5">

        {/* REQUEST TO PAY */}
        {activeTab === "rtp" && (
          <>
            <div className="flex items-center gap-2 mb-1">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1D4ED8]/10">
                <Send className="h-4 w-4 text-[#1D4ED8]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">Request to Pay</p>
                <p className="text-xs text-slate-500">Send a mobile money collection request to a customer's phone number.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#64748B] mb-2">Payment Option *</label>
                <select
                  className={selCls}
                  value={rtp.paymentOption}
                  onChange={(e) => setRtp((p) => ({ ...p, paymentOption: e.target.value }))}
                >
                  {PAYMENT_OPTIONS.map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#64748B] mb-2">Phone Number *</label>
                <div className="relative">
                  <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
                  <input
                    className={inputCls + " pl-9"}
                    placeholder="e.g. 256771234567"
                    value={rtp.phone}
                    onChange={(e) => setRtp((p) => ({ ...p, phone: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#64748B] mb-2">Amount (UGX) *</label>
                <input
                  type="number"
                  min={1}
                  placeholder="e.g. 50000"
                  className={inputCls}
                  value={rtp.amount}
                  onChange={(e) => setRtp((p) => ({ ...p, amount: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#64748B] mb-2">
                  Reference <span className="normal-case font-normal text-slate-400">(optional)</span>
                </label>
                <input
                  placeholder="Internal reference"
                  className={inputCls}
                  value={rtp.reference}
                  onChange={(e) => setRtp((p) => ({ ...p, reference: e.target.value }))}
                />
              </div>
            </div>

            <button
              disabled={rtpLoading}
              onClick={handleRequestToPay}
              className="inline-flex items-center gap-2 rounded-xl bg-[#1D4ED8] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#1D4ED8]/90 disabled:opacity-60"
            >
              <Send className="h-4 w-4" />
              {rtpLoading ? "Sending..." : "Send Request to Pay"}
            </button>

            {rtpResult && (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">Response</p>
                <ResultBox data={rtpResult} />
              </div>
            )}
          </>
        )}

        {/* REQUEST TO PAY STATUS */}
        {activeTab === "rtp-status" && (
          <>
            <div className="flex items-center gap-2 mb-1">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50">
                <Activity className="h-4 w-4 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">Payment Status</p>
                <p className="text-xs text-slate-500">Check the status of a previously submitted payment request using its reference ID.</p>
              </div>
            </div>

            <div className="max-w-sm">
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#64748B] mb-2">Reference ID *</label>
              <input
                placeholder="e.g. abc123-..."
                className={inputCls}
                value={statusRef}
                onChange={(e) => setStatusRef(e.target.value)}
              />
            </div>

            <button
              disabled={statusLoading}
              onClick={handleCheckStatus}
              className="inline-flex items-center gap-2 rounded-xl bg-[#1D4ED8] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#1D4ED8]/90 disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${statusLoading ? "animate-spin" : ""}`} />
              {statusLoading ? "Checking..." : "Check Status"}
            </button>

            {statusResult && (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">Status Response</p>
                <ResultBox data={statusResult} />
              </div>
            )}
          </>
        )}

        {/* SERVICE PAYMENT */}
        {activeTab === "service" && (
          <>
            <div className="flex items-center gap-2 mb-1">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50">
                <CreditCard className="h-4 w-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">Service Payment</p>
                <p className="text-xs text-slate-500">Initiate a service payment (e.g. utility bill disbursement) via Collecto.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#64748B] mb-2">Service *</label>
                <input
                  placeholder="e.g. ELECTRICITY"
                  className={inputCls}
                  value={sp.service}
                  onChange={(e) => setSp((p) => ({ ...p, service: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#64748B] mb-2">Payment Option *</label>
                <select
                  className={selCls}
                  value={sp.paymentOption}
                  onChange={(e) => setSp((p) => ({ ...p, paymentOption: e.target.value }))}
                >
                  {PAYMENT_OPTIONS.map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#64748B] mb-2">Phone Number *</label>
                <div className="relative">
                  <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
                  <input
                    className={inputCls + " pl-9"}
                    placeholder="e.g. 256771234567"
                    value={sp.phone}
                    onChange={(e) => setSp((p) => ({ ...p, phone: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#64748B] mb-2">Amount (UGX) *</label>
                <input
                  type="number"
                  min={1}
                  placeholder="e.g. 20000"
                  className={inputCls}
                  value={sp.amount}
                  onChange={(e) => setSp((p) => ({ ...p, amount: e.target.value }))}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#64748B] mb-2">
                  Message <span className="normal-case font-normal text-slate-400">(optional)</span>
                </label>
                <input
                  placeholder="Payment note or description"
                  className={inputCls}
                  value={sp.message}
                  onChange={(e) => setSp((p) => ({ ...p, message: e.target.value }))}
                />
              </div>
            </div>

            <button
              disabled={spLoading}
              onClick={handleServicePayment}
              className="inline-flex items-center gap-2 rounded-xl bg-[#1D4ED8] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#1D4ED8]/90 disabled:opacity-60"
            >
              <Send className="h-4 w-4" />
              {spLoading ? "Processing..." : "Initiate Service Payment"}
            </button>

            {spResult && (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">Response</p>
                <ResultBox data={spResult} />
              </div>
            )}
          </>
        )}

        {/* SERVICE PAYMENT STATUS */}
        {activeTab === "service-status" && (
          <>
            <div className="flex items-center gap-2 mb-1">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50">
                <Activity className="h-4 w-4 text-[#1D4ED8]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">Service Status</p>
                <p className="text-xs text-slate-500">Check the status of a service payment using its reference ID.</p>
              </div>
            </div>

            <div className="max-w-sm">
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#64748B] mb-2">Reference ID *</label>
              <input
                placeholder="e.g. abc123-..."
                className={inputCls}
                value={spStatusRef}
                onChange={(e) => setSpStatusRef(e.target.value)}
              />
            </div>

            <button
              disabled={spStatusLoading}
              onClick={handleServicePaymentStatus}
              className="inline-flex items-center gap-2 rounded-xl bg-[#1D4ED8] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#1D4ED8]/90 disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${spStatusLoading ? "animate-spin" : ""}`} />
              {spStatusLoading ? "Checking..." : "Check Service Status"}
            </button>

            {spStatusResult && (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">Status Response</p>
                <ResultBox data={spStatusResult} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default CollectoPayments;
