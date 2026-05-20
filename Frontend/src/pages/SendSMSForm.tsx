import { useState } from "react";
import { Phone, Send, MessageSquare, Hash, CheckCircle2, AlertCircle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

const MAX_CHARS = 160;

const SendSMSForm = () => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({ phone: "", message: "", reference: "" });
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const token = (() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}").token || "";
    } catch {
      return "";
    }
  })();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name === "message" && value.length > MAX_CHARS) return;
    setFormData((p) => ({ ...p, [name]: value }));
    if (sent) setSent(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.phone.trim() || !formData.message.trim()) return;
    setIsLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/sendSingleSms`, {
        method: "POST",
        headers: {
          accept: "*/*",
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phone: formData.phone,
          message: formData.message,
          reference: formData.reference || "SMS Notification",
        }),
      });

      if (!response.ok) throw new Error(`Error ${response.status}`);

      setSent(true);
      toast({ title: "SMS Sent", description: `Message delivered to ${formData.phone}` });
      setFormData({ phone: "", message: "", reference: "" });
    } catch (error: any) {
      toast({ title: "Failed to Send", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const charsLeft = MAX_CHARS - formData.message.length;
  const charColor = charsLeft <= 20 ? "text-red-500" : charsLeft <= 50 ? "text-amber-500" : "text-slate-400";

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-blue-600">
          <MessageSquare className="h-3 w-3" /> Messaging
        </span>
        <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900">Send SMS Message</h1>
        <p className="mt-1 text-sm text-slate-500">
          Send a one-off tenant or customer notification with a clear reference and delivery target.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        {/* Compose panel */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          {/* Panel header */}
          <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50 px-6 py-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
              <Send className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">Compose Message</p>
              <p className="text-xs text-slate-400">Fill in recipient details and message content</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* Phone */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-slate-700">
                Phone Number <span className="text-red-400">*</span>
              </Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  name="phone"
                  type="tel"
                  placeholder="256705687760"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                  className="pl-9 h-11 font-mono text-sm"
                />
              </div>
              <p className="text-xs text-slate-400">Use full international format without + (e.g. 256XXXXXXXXX)</p>
            </div>

            {/* Reference */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-slate-700">Reference</Label>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  name="reference"
                  placeholder="e.g. Payment Reminder, Invoice #123"
                  value={formData.reference}
                  onChange={handleChange}
                  className="pl-9 h-11 text-sm"
                />
              </div>
            </div>

            {/* Message */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium text-slate-700">
                  Message <span className="text-red-400">*</span>
                </Label>
                <span className={`text-xs font-medium tabular-nums ${charColor}`}>
                  {charsLeft} / {MAX_CHARS}
                </span>
              </div>
              <Textarea
                name="message"
                placeholder="Type your message here…"
                value={formData.message}
                onChange={handleChange}
                rows={5}
                required
                className="resize-none text-sm leading-relaxed"
              />
              {/* Character bar */}
              <div className="h-1 w-full rounded-full bg-slate-100 overflow-hidden">
                <div
                  className={`h-1 rounded-full transition-all duration-200 ${
                    charsLeft <= 20 ? "bg-red-400" : charsLeft <= 50 ? "bg-amber-400" : "bg-blue-400"
                  }`}
                  style={{ width: `${((MAX_CHARS - charsLeft) / MAX_CHARS) * 100}%` }}
                />
              </div>
            </div>

            {/* Submit */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <p className="text-xs text-slate-400">All fields marked <span className="text-red-400">*</span> are required.</p>
              <Button
                type="submit"
                disabled={isLoading || !formData.phone.trim() || !formData.message.trim()}
                className="gap-2 bg-blue-600 hover:bg-blue-700 text-white min-w-[140px]"
              >
                {isLoading ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Sending…
                  </>
                ) : sent ? (
                  <>
                    <CheckCircle2 className="h-4 w-4" /> Sent!
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" /> Send SMS
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* SMS Preview */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="border-b border-slate-100 bg-slate-50 px-5 py-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Preview</p>
            </div>
            {/* Phone mockup */}
            <div className="flex justify-center px-6 py-6">
              <div className="w-56 rounded-3xl border-4 border-slate-800 bg-slate-800 shadow-xl overflow-hidden">
                {/* Status bar */}
                <div className="flex items-center justify-between bg-slate-800 px-4 py-1.5">
                  <span className="text-[10px] text-slate-400 font-medium">9:41</span>
                  <div className="flex gap-1 items-center">
                    <div className="h-1.5 w-4 rounded-full bg-slate-400" />
                    <div className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                  </div>
                </div>
                {/* Screen */}
                <div className="bg-slate-100 min-h-[200px] p-3 space-y-2">
                  {/* SMS header */}
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-7 w-7 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
                      <span className="text-[10px] font-bold text-white">NY</span>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-slate-800">Nyumba Yo</p>
                      <p className="text-[9px] text-slate-400">{formData.phone || "256XXXXXXXXX"}</p>
                    </div>
                  </div>
                  {/* Bubble */}
                  <div className="flex justify-start">
                    <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-white px-3 py-2 shadow-sm">
                      <p className="text-[10px] leading-relaxed text-slate-700 break-words">
                        {formData.message || "Your message will appear here…"}
                      </p>
                      <p className="mt-1 text-[8px] text-slate-400 text-right">
                        {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {formData.reference && (
              <div className="border-t border-slate-100 px-5 py-3">
                <p className="text-xs text-slate-400">
                  Ref: <span className="font-medium text-slate-600">{formData.reference}</span>
                </p>
              </div>
            )}
          </div>

          {/* Tips */}
          <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-blue-500 shrink-0" />
              <p className="text-sm font-semibold text-blue-700">Tips</p>
            </div>
            <ul className="space-y-2 text-xs text-blue-600 leading-relaxed">
              <li className="flex gap-2">
                <span className="mt-0.5 shrink-0 text-blue-400">•</span>
                State the purpose in the first sentence so recipients understand immediately.
              </li>
              <li className="flex gap-2">
                <span className="mt-0.5 shrink-0 text-blue-400">•</span>
                Use the Reference field to trace the message in support conversations.
              </li>
              <li className="flex gap-2">
                <span className="mt-0.5 shrink-0 text-blue-400">•</span>
                Keep under 160 characters to avoid multi-part SMS charges.
              </li>
              <li className="flex gap-2">
                <span className="mt-0.5 shrink-0 text-blue-400">•</span>
                Use full international format without the + sign.
              </li>
            </ul>
          </div>

          {/* Warning */}
          <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 flex items-start gap-2.5">
            <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700 leading-relaxed">
              This action sends a real SMS. Only Administrator accounts can use this feature.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SendSMSForm;
