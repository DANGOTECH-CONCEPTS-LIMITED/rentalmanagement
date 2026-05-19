import { useState } from "react";
import { Send, RefreshCw, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import axios from "axios";

interface PayToPayResult {
  referenceId?: string;
  status?: string;
  reason?: string;
  [key: string]: any;
}

const PAYMENT_OPTIONS = ["MTN_MOMO_UG", "AIRTEL_MONEY_UG"];

const CollectoPayments = () => {
  const { toast } = useToast();
  const apiUrl = import.meta.env.VITE_API_BASE_URL;

  // Request to Pay state
  const [rtp, setRtp] = useState({ paymentOption: "MTN_MOMO_UG", phone: "", amount: "", reference: "" });
  const [rtpLoading, setRtpLoading] = useState(false);
  const [rtpResult, setRtpResult] = useState<PayToPayResult | null>(null);

  // Request to Pay Status state
  const [statusRef, setStatusRef] = useState("");
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusResult, setStatusResult] = useState<any>(null);

  // Service Payment state
  const [sp, setSp] = useState({ service: "", paymentOption: "MTN_MOMO_UG", phone: "", amount: "", message: "" });
  const [spLoading, setSpLoading] = useState(false);
  const [spResult, setSpResult] = useState<any>(null);

  // Service Payment Status state
  const [spStatusRef, setSpStatusRef] = useState("");
  const [spStatusLoading, setSpStatusLoading] = useState(false);
  const [spStatusResult, setSpStatusResult] = useState<any>(null);

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
    } catch (error: any) {
      toast({ title: "Error", description: error.response?.data || "Failed to send payment request.", variant: "destructive" });
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
    } catch (error: any) {
      toast({ title: "Error", description: error.response?.data || "Failed to fetch status.", variant: "destructive" });
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
    } catch (error: any) {
      toast({ title: "Error", description: error.response?.data || "Failed to initiate service payment.", variant: "destructive" });
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
    } catch (error: any) {
      toast({ title: "Error", description: error.response?.data || "Failed to fetch service payment status.", variant: "destructive" });
    } finally {
      setSpStatusLoading(false);
    }
  };

  const ResultBox = ({ data }: { data: any }) => (
    <div className="rounded-lg bg-slate-50 border border-slate-200 p-4 text-xs font-mono text-slate-700 whitespace-pre-wrap break-all">
      {JSON.stringify(data, null, 2)}
    </div>
  );

  return (
    <div className="space-y-6 max-w-2xl">
      <section className="page-hero">
        <div className="space-y-3">
          <span className="inline-flex w-fit items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Admin
          </span>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Collecto Payments</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Initiate and track mobile money collection and service payment requests via Collecto.
            </p>
          </div>
        </div>
      </section>

      <Tabs defaultValue="rtp">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="rtp">Request to Pay</TabsTrigger>
          <TabsTrigger value="rtp-status">Payment Status</TabsTrigger>
          <TabsTrigger value="service">Service Payment</TabsTrigger>
          <TabsTrigger value="service-status">Service Status</TabsTrigger>
        </TabsList>

        {/* REQUEST TO PAY */}
        <TabsContent value="rtp" className="mt-4">
          <div className="data-surface p-6 space-y-5">
            <p className="text-sm text-muted-foreground">
              Send a mobile money collection request to a customer's phone number.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Payment Option *</Label>
                <Select value={rtp.paymentOption} onValueChange={(v) => setRtp((p) => ({ ...p, paymentOption: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PAYMENT_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Phone Number *</Label>
                <div className="relative">
                  <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    placeholder="e.g. 256771234567"
                    value={rtp.phone}
                    onChange={(e) => setRtp((p) => ({ ...p, phone: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Amount (UGX) *</Label>
                <Input
                  type="number"
                  min={1}
                  placeholder="e.g. 50000"
                  value={rtp.amount}
                  onChange={(e) => setRtp((p) => ({ ...p, amount: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>Reference <span className="text-muted-foreground text-xs">(optional)</span></Label>
                <Input
                  placeholder="Internal reference"
                  value={rtp.reference}
                  onChange={(e) => setRtp((p) => ({ ...p, reference: e.target.value }))}
                />
              </div>
            </div>

            <Button disabled={rtpLoading} onClick={handleRequestToPay}>
              <Send className="mr-2 h-4 w-4" />
              {rtpLoading ? "Sending..." : "Send Request to Pay"}
            </Button>

            {rtpResult && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Response</p>
                <ResultBox data={rtpResult} />
              </div>
            )}
          </div>
        </TabsContent>

        {/* REQUEST TO PAY STATUS */}
        <TabsContent value="rtp-status" className="mt-4">
          <div className="data-surface p-6 space-y-5">
            <p className="text-sm text-muted-foreground">
              Check the status of a previously submitted payment request using its reference ID.
            </p>

            <div className="space-y-1 max-w-sm">
              <Label>Reference ID *</Label>
              <Input
                placeholder="e.g. abc123-..."
                value={statusRef}
                onChange={(e) => setStatusRef(e.target.value)}
              />
            </div>

            <Button disabled={statusLoading} onClick={handleCheckStatus}>
              <RefreshCw className={`mr-2 h-4 w-4 ${statusLoading ? "animate-spin" : ""}`} />
              {statusLoading ? "Checking..." : "Check Status"}
            </Button>

            {statusResult && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Status Response</p>
                <ResultBox data={statusResult} />
              </div>
            )}
          </div>
        </TabsContent>

        {/* SERVICE PAYMENT */}
        <TabsContent value="service" className="mt-4">
          <div className="data-surface p-6 space-y-5">
            <p className="text-sm text-muted-foreground">
              Initiate a service payment (e.g. utility bill disbursement) via Collecto.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Service *</Label>
                <Input
                  placeholder="e.g. ELECTRICITY"
                  value={sp.service}
                  onChange={(e) => setSp((p) => ({ ...p, service: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>Payment Option *</Label>
                <Select value={sp.paymentOption} onValueChange={(v) => setSp((p) => ({ ...p, paymentOption: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PAYMENT_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Phone Number *</Label>
                <div className="relative">
                  <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    placeholder="e.g. 256771234567"
                    value={sp.phone}
                    onChange={(e) => setSp((p) => ({ ...p, phone: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Amount (UGX) *</Label>
                <Input
                  type="number"
                  min={1}
                  placeholder="e.g. 20000"
                  value={sp.amount}
                  onChange={(e) => setSp((p) => ({ ...p, amount: e.target.value }))}
                />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label>Message <span className="text-muted-foreground text-xs">(optional)</span></Label>
                <Input
                  placeholder="Payment note or description"
                  value={sp.message}
                  onChange={(e) => setSp((p) => ({ ...p, message: e.target.value }))}
                />
              </div>
            </div>

            <Button disabled={spLoading} onClick={handleServicePayment}>
              <Send className="mr-2 h-4 w-4" />
              {spLoading ? "Processing..." : "Initiate Service Payment"}
            </Button>

            {spResult && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Response</p>
                <ResultBox data={spResult} />
              </div>
            )}
          </div>
        </TabsContent>

        {/* SERVICE PAYMENT STATUS */}
        <TabsContent value="service-status" className="mt-4">
          <div className="data-surface p-6 space-y-5">
            <p className="text-sm text-muted-foreground">
              Check the status of a service payment using its reference ID.
            </p>

            <div className="space-y-1 max-w-sm">
              <Label>Reference ID *</Label>
              <Input
                placeholder="e.g. abc123-..."
                value={spStatusRef}
                onChange={(e) => setSpStatusRef(e.target.value)}
              />
            </div>

            <Button disabled={spStatusLoading} onClick={handleServicePaymentStatus}>
              <RefreshCw className={`mr-2 h-4 w-4 ${spStatusLoading ? "animate-spin" : ""}`} />
              {spStatusLoading ? "Checking..." : "Check Service Status"}
            </Button>

            {spStatusResult && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Status Response</p>
                <ResultBox data={spStatusResult} />
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CollectoPayments;
