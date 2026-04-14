import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Pencil } from "lucide-react";
import { ChevronsLeft, ChevronsRight } from "lucide-react";
import { formatDateTimeDmy } from "@/lib/date-time";

const UtilityPayments = () => {
  const { landlordId } = useParams<{ landlordId: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const navigate = useNavigate();
  const apiUrl = import.meta.env.VITE_API_BASE_URL;

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editPayment, setEditPayment] = useState<any>(null);
  const [editVendor, setEditVendor] = useState("");
  const [editVendorRef, setEditVendorRef] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editVendorPaymentDate, setEditVendorPaymentDate] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;
  const [search, setSearch] = useState("");
  const filteredPayments = useMemo(() => {
    if (!search.trim()) return payments;
    const s = search.trim().toLowerCase();
    return payments.filter(
      (p) =>
        (p.meterNumber && p.meterNumber.toLowerCase().includes(s)) ||
        (p.phoneNumber && p.phoneNumber.toLowerCase().includes(s)) ||
        (p.status && p.status.toLowerCase().includes(s))
    );
  }, [payments, search]);
  const totalPages = Math.ceil(filteredPayments.length / rowsPerPage);
  const paginatedPayments = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredPayments.slice(start, start + rowsPerPage);
  }, [filteredPayments, currentPage]);

  console.log("Payments", payments);

  useEffect(() => {
    if (!landlordId) return;
    setLoading(true);
    setError(null);
    const user = localStorage.getItem("user");
    const token = user ? JSON.parse(user).token : null;
    fetch(`${apiUrl}/GetUtilityPaymentsByLandlordIdAsync/${landlordId}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch payments");
        return res.json();
      })
      .then((data) => setPayments(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [landlordId]);

  const handleEditClick = (payment: any) => {
    setEditPayment(payment);
    setEditVendor(payment.vendor || "");
    setEditVendorRef(payment.vendorref || "");
    setEditVendorPaymentDate(
      payment.vendorPaymentDate &&
        payment.vendorPaymentDate !== "0001-01-01T00:00:00"
        ? payment.vendorPaymentDate.split("T")[0]
        : ""
    );
    setEditDialogOpen(true);
    setEditError(null);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editPayment) return;

    // Trim and validate fields
    if (!editVendor.trim() || !editVendorRef.trim()) {
      setEditError("Vendor and Vendor Ref are required.");
      return;
    }

    setEditLoading(true);
    setEditError(null);
    const user = localStorage.getItem("user");
    const token = user ? JSON.parse(user).token : null;
    try {
      // Build query string
      const params = new URLSearchParams({
        tranid: String(editPayment.id),
        vendor: editVendor.trim(),
        vendorRef: editVendorRef.trim(),
        utilitypaymentdate: editVendorPaymentDate || "",
      });
      const url = `${apiUrl}/UpdateUtilityPaymentWithVendorId?${params.toString()}`;
      console.log("Sending update (query params):", url);
      const res = await fetch(url, {
        method: "PUT",
        headers: {
          accept: "*/*",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!res.ok) {
        const data = await res.json();
        setEditError(data.title || "Failed to update payment");
        setEditLoading(false);
        return;
      }
      setEditDialogOpen(false);
      setEditPayment(null);
      setEditVendor("");
      setEditVendorRef("");
      setEditVendorPaymentDate("");
      // Refresh payments
      setLoading(true);
      const refreshed = await fetch(
        `${apiUrl}/GetUtilityPaymentsByLandlordIdAsync/${landlordId}`,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }
      );
      setPayments(await refreshed.json());
    } catch (err: any) {
      setEditError(err.message);
    } finally {
      setEditLoading(false);
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <section className="page-hero">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <span className="inline-flex w-fit items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              Utility Payments
            </span>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
                Landlord payment activity
              </h1>
              <p className="mt-2 text-sm text-muted-foreground md:text-base">
                Review, search, and update vendor details for utility payments linked to landlord ID {landlordId}.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button variant="outline" onClick={() => navigate(-1)}>
              Back
            </Button>
            <Input
              type="text"
              placeholder="Search by meter, phone, or status..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full sm:w-72"
            />
          </div>
        </div>
      </section>

      <Card className="data-surface border-none shadow-none">
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <CardTitle>Payment records</CardTitle>
            <CardDescription>
              {filteredPayments.length} matching payment record{filteredPayments.length === 1 ? "" : "s"}.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
      {loading ? (
        <div className="text-center py-8">Loading payments...</div>
      ) : error ? (
        <div className="text-center py-8 text-red-500">{error}</div>
      ) : payments.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No payments found.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Charges</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead>Phone Number</TableHead>
                <TableHead>Meter Number</TableHead>
                <TableHead>Units</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Vendor Ref</TableHead>
                <TableHead>Vendor Payment Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedPayments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell>{payment.status || "-"}</TableCell>
                  <TableCell>{payment.amount || "-"}</TableCell>
                  <TableCell>{payment.charges || "-"}</TableCell>
                  <TableCell>{formatDateTimeDmy(payment.createdAt)}</TableCell>
                  <TableCell>{payment.phoneNumber || "-"}</TableCell>
                  <TableCell>{payment.meterNumber || "-"}</TableCell>
                  <TableCell>{payment.units || "-"}</TableCell>
                  <TableCell>{payment.vendor || "-"}</TableCell>
                  <TableCell>{payment.vendorTranId || "-"}</TableCell>
                  <TableCell>
                    {payment.vendorPaymentDate &&
                    payment.vendorPaymentDate !== "0001-01-01T00:00:00"
                      ? formatDateTimeDmy(payment.vendorPaymentDate)
                      : "-"}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEditClick(payment)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {totalPages > 1 && (
            <div className="flex justify-end mt-4">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={currentPage === totalPages}
                >
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
        </CardContent>
      </Card>
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-xl rounded-[28px] border border-border/70 bg-white p-0 shadow-[0_30px_90px_-36px_rgba(15,23,42,0.4)]">
          <DialogHeader>
            <DialogTitle className="px-6 pt-6">Edit Vendor Info</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-5 px-6 pb-6">
            <div>
              <label className="block text-sm font-medium mb-1">Vendor</label>
              <Input
                value={editVendor}
                onChange={(e) => setEditVendor(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Vendor Ref
              </label>
              <Input
                value={editVendorRef}
                onChange={(e) => setEditVendorRef(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Vendor Payment Date
              </label>
              <Input
                type="date"
                value={editVendorPaymentDate}
                onChange={(e) => setEditVendorPaymentDate(e.target.value)}
              />
            </div>
            {editError && (
              <div className="text-red-500 text-sm">{editError}</div>
            )}
            <div className="flex justify-end gap-2 border-t border-border/70 pt-5">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditDialogOpen(false)}
                disabled={editLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={editLoading}>
                {editLoading ? "Saving..." : "Save"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UtilityPayments;
