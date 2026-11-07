import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { ShieldCheck, ShieldOff, KeyRound, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { apiUrl, getAuthToken } from "@/lib/api";

interface MfaStatus {
  isEnrolled: boolean;
  isEnabled: boolean;
  enabledAtUtc?: string | null;
}

interface Enrollment {
  secret: string;
  otpAuthUri: string;
}

const authHeaders = () => {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export default function Security() {
  const [status, setStatus] = useState<MfaStatus | null>(null);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [code, setCode] = useState("");
  const [disableCode, setDisableCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await axios.get<MfaStatus>(`${apiUrl}/Mfa/status`, { headers: authHeaders() });
      setStatus(data);
    } catch {
      setError("Unable to read your security settings.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const beginEnrollment = async () => {
    setLoading(true);
    setError(null);
    setNotice(null);
    try {
      const { data } = await axios.post<Enrollment>(`${apiUrl}/Mfa/enroll`, {}, { headers: authHeaders() });
      setEnrollment(data);
      setCode("");
    } catch (err) {
      setError(
        axios.isAxiosError(err) && err.response?.data?.message
          ? err.response.data.message
          : "Could not start enrollment."
      );
    } finally {
      setLoading(false);
    }
  };

  const activate = async () => {
    setLoading(true);
    setError(null);
    try {
      await axios.post(`${apiUrl}/Mfa/enable`, { code: code.trim() }, { headers: authHeaders() });
      setEnrollment(null);
      setCode("");
      setNotice("Two-factor authentication is on. You will be asked for a code at every sign-in.");
      await load();
    } catch (err) {
      setError(
        axios.isAxiosError(err) && err.response?.data?.message
          ? err.response.data.message
          : "That code was not accepted."
      );
    } finally {
      setLoading(false);
    }
  };

  const disable = async () => {
    setLoading(true);
    setError(null);
    try {
      await axios.post(`${apiUrl}/Mfa/disable`, { code: disableCode.trim() }, { headers: authHeaders() });
      setDisableCode("");
      setNotice("Two-factor authentication is off for this account.");
      await load();
    } catch (err) {
      setError(
        axios.isAxiosError(err) && err.response?.data?.message
          ? err.response.data.message
          : "That code was not accepted."
      );
    } finally {
      setLoading(false);
    }
  };

  const copySecret = async () => {
    if (!enrollment) return;
    try {
      await navigator.clipboard.writeText(enrollment.secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Copying is blocked in this browser. Type the key manually.");
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold">
          <ShieldCheck className="h-6 w-6 text-emerald-600" /> Account Security
        </h1>
        <p className="text-sm text-muted-foreground">
          Protect this account with an authenticator app. With two-factor enabled, a stolen password
          is no longer enough to sign in.
        </p>
      </div>

      {error && (
        <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {notice && (
        <div role="status" className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          {notice}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-base">
            <span>Two-factor authentication</span>
            {status && (
              <Badge
                className={
                  status.isEnabled
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-slate-100 text-slate-700"
                }
              >
                {status.isEnabled ? "Enabled" : "Not enabled"}
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Codes come from an authenticator app (Google Authenticator, Authy, Microsoft Authenticator).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!status?.isEnabled && !enrollment && (
            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={beginEnrollment} disabled={loading || !status}>
                <KeyRound className="mr-2 h-4 w-4" /> Set up two-factor
              </Button>
              <span className="text-xs text-muted-foreground">
                You will need your phone to complete setup.
              </span>
            </div>
          )}

          {enrollment && (
            <div className="space-y-4 rounded-lg border p-4">
              <p className="text-sm">
                Add this key to your authenticator app, then enter the 6-digit code it shows.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <code
                  data-testid="mfa-secret"
                  className="rounded bg-muted px-3 py-2 font-mono text-sm tracking-wider"
                >
                  {enrollment.secret}
                </code>
                <Button variant="outline" size="sm" onClick={copySecret}>
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  <span className="ml-2">{copied ? "Copied" : "Copy"}</span>
                </Button>
              </div>
              <details className="text-xs text-muted-foreground">
                <summary className="cursor-pointer">Show the otpauth link (for QR generators)</summary>
                <code className="mt-2 block break-all">{enrollment.otpAuthUri}</code>
              </details>
              <div className="max-w-xs space-y-2">
                <Label htmlFor="mfa-activate-code">6-digit code</Label>
                <Input
                  id="mfa-activate-code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={code}
                  onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="123456"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={activate} disabled={loading || code.length !== 6}>
                  Turn on two-factor
                </Button>
                <Button variant="ghost" onClick={() => { setEnrollment(null); setCode(""); }}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {status?.isEnabled && (
            <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
              <p className="flex items-center gap-2 text-sm text-amber-900">
                <ShieldOff className="h-4 w-4" /> Turning this off lowers the protection on this account.
              </p>
              <div className="max-w-xs space-y-2">
                <Label htmlFor="mfa-disable-code">Current 6-digit code</Label>
                <Input
                  id="mfa-disable-code"
                  inputMode="numeric"
                  value={disableCode}
                  onChange={(event) => setDisableCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="123456"
                />
              </div>
              <Button variant="destructive" onClick={disable} disabled={loading || disableCode.length !== 6}>
                Turn off two-factor
              </Button>
            </div>
          )}

          {status?.enabledAtUtc && (
            <p className="text-xs text-muted-foreground">
              Enabled on {new Date(status.enabledAtUtc).toLocaleString()}.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
