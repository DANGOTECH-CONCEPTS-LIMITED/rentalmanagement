import { useState } from "react";
import { Zap, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import axios from "axios";

const MeterTokenGenerator = () => {
  const { toast } = useToast();
  const apiUrl = import.meta.env.VITE_API_BASE_URL;

  const [amount, setAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastResult, setLastResult] = useState<string | null>(null);

  const handleGenerate = async () => {
    const parsed = parseFloat(amount);
    if (!amount || isNaN(parsed) || parsed <= 0) {
      toast({ title: "Validation Error", description: "Enter a valid amount greater than zero.", variant: "destructive" });
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
      const message = typeof data === "string" ? data : "Token generation started successfully.";
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
    <div className="space-y-6 max-w-lg">
      <section className="page-hero">
        <div className="space-y-3">
          <span className="inline-flex w-fit items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Admin
          </span>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Meter Token Generator</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Generate prepaid electricity tokens for all active meters by specifying a UGX amount.
            </p>
          </div>
        </div>
      </section>

      <div className="data-surface p-6 space-y-6">
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800 flex items-start gap-2">
          <Zap className="h-4 w-4 mt-0.5 shrink-0 text-amber-600" />
          <div>
            <p className="font-medium mb-1">How it works</p>
            <p>Entering an amount triggers token generation for <strong>all registered meters</strong> in the background. This may take a few minutes depending on the number of meters.</p>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Token Amount (UGX) *</Label>
          <p className="text-xs text-muted-foreground">Amount of electricity in UGX to generate tokens for.</p>
          <Input
            type="number"
            min={1}
            step={1000}
            placeholder="e.g. 10000"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="max-w-xs"
          />
        </div>

        <div className="flex items-center gap-4">
          <Button disabled={isSubmitting} onClick={handleGenerate}>
            <Zap className="mr-2 h-4 w-4" />
            {isSubmitting ? "Generating..." : "Generate Tokens"}
          </Button>
        </div>

        {lastResult && (
          <div className="rounded-lg bg-green-50 border border-green-200 p-4 text-sm text-green-800 flex items-start gap-2">
            <CheckCircle className="h-4 w-4 mt-0.5 shrink-0 text-green-600" />
            <span>{lastResult}</span>
          </div>
        )}
      </div>

      <div className="data-surface p-5 space-y-2">
        <p className="text-sm font-medium text-slate-800">Notes</p>
        <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
          <li>Token generation runs as a background task — results are not instant.</li>
          <li>All meters registered in the system will receive tokens for the specified amount.</li>
          <li>Check the Utility Payment Dashboard for token delivery status.</li>
        </ul>
      </div>
    </div>
  );
};

export default MeterTokenGenerator;
