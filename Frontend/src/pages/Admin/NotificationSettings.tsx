import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Bell, RefreshCw, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DataTablePagination } from "@/components/common/DataTablePagination";
import { buildApiEndpoint } from "@/lib/api-endpoint";
import { apiUrl } from "@/lib/api";
import { useToast } from "@/components/ui/use-toast";

interface MatrixRow {
  eventType: string;
  label: string;
  description: string;
  channel: string;
  isEnabled: boolean;
  recipients?: string | null;
  roles?: string | null;
  isOperationsAlert: boolean;
}

interface DeliveryRow {
  id: number;
  eventType: string;
  channel: string;
  recipient: string;
  subject: string;
  status: string;
  error?: string | null;
  reference?: string | null;
  createdAtUtc: string;
}

interface DeliveryPage {
  items: DeliveryRow[];
  page: number;
  pageSize: number;
  total: number;
}

const CHANNEL_ORDER = ["Email", "Sms", "InApp"];

const statusClass = (status: string) =>
  status === "SENT"
    ? "bg-emerald-100 text-emerald-700"
    : status === "FAILED"
      ? "bg-red-100 text-red-700"
      : "bg-slate-100 text-slate-600";

export default function NotificationSettings() {
  const { toast } = useToast();
  const endpoint = useMemo(() => buildApiEndpoint(apiUrl, "/api/AdminNotifications"), []);
  const deliveriesEndpoint = useMemo(
    () => buildApiEndpoint(apiUrl, "/api/AdminNotificationDeliveries"),
    [],
  );

  const [rows, setRows] = useState<MatrixRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  const [deliveries, setDeliveries] = useState<DeliveryPage | null>(null);
  const [deliveryPage, setDeliveryPage] = useState(1);
  const [deliveryPageSize, setDeliveryPageSize] = useState(25);
  const [deliveryLoading, setDeliveryLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get<MatrixRow[]>(endpoint);
      setRows(response.data);
      setDirty(false);
    } catch {
      setError("Unable to load the notification matrix.");
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  const loadDeliveries = useCallback(async () => {
    setDeliveryLoading(true);
    try {
      const response = await axios.get<DeliveryPage>(deliveriesEndpoint, {
        params: { page: deliveryPage, pageSize: deliveryPageSize },
      });
      setDeliveries(response.data);
    } catch {
      setDeliveries({ items: [], page: 1, pageSize: deliveryPageSize, total: 0 });
    } finally {
      setDeliveryLoading(false);
    }
  }, [deliveriesEndpoint, deliveryPage, deliveryPageSize]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void loadDeliveries();
  }, [loadDeliveries]);

  const update = (eventType: string, channel: string, patch: Partial<MatrixRow>) => {
    setRows((current) =>
      current.map((row) =>
        row.eventType === eventType && row.channel === channel ? { ...row, ...patch } : row,
      ),
    );
    setDirty(true);
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const response = await axios.put<MatrixRow[]>(endpoint, rows);
      setRows(response.data);
      setDirty(false);
      toast({ title: "Saved", description: "Notification preferences updated." });
    } catch (err) {
      const message =
        axios.isAxiosError(err) && typeof err.response?.data?.message === "string"
          ? err.response.data.message
          : "Could not save the notification matrix.";
      setError(message);
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // Group rows by event so each event renders as one block with its channels.
  const events = useMemo(() => {
    const grouped = new Map<string, { meta: MatrixRow; channels: MatrixRow[] }>();
    for (const row of rows) {
      const existing = grouped.get(row.eventType);
      if (existing) existing.channels.push(row);
      else grouped.set(row.eventType, { meta: row, channels: [row] });
    }
    return [...grouped.values()].map((entry) => ({
      ...entry,
      channels: [...entry.channels].sort(
        (a, b) => CHANNEL_ORDER.indexOf(a.channel) - CHANNEL_ORDER.indexOf(b.channel),
      ),
    }));
  }, [rows]);

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold">
            <Bell className="h-6 w-6 text-primary" /> Notifications
          </h1>
          <p className="text-sm text-muted-foreground">
            Choose which events are sent, through which channel, and to whom. Blank recipients fall
            back to the person the event concerns.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => void load()} disabled={loading || saving}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Reload
          </Button>
          <Button onClick={() => void save()} disabled={saving || !dirty}>
            <Save className="mr-2 h-4 w-4" /> {saving ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Event matrix</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading && rows.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">Loading…</p>
          )}
          {events.map(({ meta, channels }) => (
            <div key={meta.eventType} className="rounded-lg border p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{meta.label}</span>
                {meta.isOperationsAlert && (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                    Operations alert
                  </span>
                )}
                <span className="font-mono text-xs text-muted-foreground">{meta.eventType}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{meta.description}</p>

              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                {channels.map((row) => (
                  <div key={row.channel} className="rounded-md border bg-muted/30 p-3">
                    <label className="flex items-center gap-2 text-sm font-medium">
                      <Checkbox
                        checked={row.isEnabled}
                        onCheckedChange={(checked) =>
                          update(row.eventType, row.channel, { isEnabled: checked === true })
                        }
                        aria-label={`${row.channel} for ${meta.label}`}
                      />
                      {row.channel === "InApp" ? "In-app" : row.channel}
                    </label>
                    <Input
                      className="mt-2 h-8 text-xs"
                      placeholder={
                        row.channel === "Email"
                          ? "alerts@company.com; finance@company.com"
                          : row.channel === "Sms"
                            ? "2567… (blank = the person concerned)"
                            : "Roles, e.g. Administrator"
                      }
                      value={row.recipients ?? ""}
                      disabled={!row.isEnabled}
                      onChange={(event) =>
                        update(row.eventType, row.channel, { recipients: event.target.value })
                      }
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Recent deliveries</CardTitle>
          <span className="text-xs text-muted-foreground">{deliveries?.total ?? 0} total</span>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead>Channel</TableHead>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deliveryLoading && (deliveries?.items.length ?? 0) === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-6 text-center text-sm text-muted-foreground">
                      Loading…
                    </TableCell>
                  </TableRow>
                )}
                {!deliveryLoading && (deliveries?.items.length ?? 0) === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-6 text-center text-sm text-muted-foreground">
                      No notifications have been sent yet.
                    </TableCell>
                  </TableRow>
                )}
                {deliveries?.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="whitespace-nowrap text-xs">
                      {new Date(item.createdAtUtc).toLocaleString()}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{item.eventType}</TableCell>
                    <TableCell className="text-xs">{item.channel}</TableCell>
                    <TableCell className="max-w-[12rem] truncate text-xs" title={item.recipient}>
                      {item.recipient}
                    </TableCell>
                    <TableCell className="max-w-[16rem] truncate text-xs" title={item.subject}>
                      {item.subject}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusClass(item.status)}`}
                        title={item.error ?? undefined}
                      >
                        {item.status}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <DataTablePagination
            page={deliveryPage}
            pageSize={deliveryPageSize}
            totalCount={deliveries?.total ?? 0}
            onPageChange={setDeliveryPage}
            onPageSizeChange={(size) => {
              setDeliveryPageSize(size);
              setDeliveryPage(1);
            }}
            itemLabel="deliveries"
            disabled={deliveryLoading}
          />
        </CardContent>
      </Card>
    </div>
  );
}
