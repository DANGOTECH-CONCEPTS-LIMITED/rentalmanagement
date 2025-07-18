import { useEffect, useState } from "react";
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
import { Pencil } from "lucide-react";

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
  const [editVendorTranId, setEditVendorTranId] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editVendorPaymentDate, setEditVendorPaymentDate] = useState("");

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
    setEditVendorTranId(payment.vendorTranId || "");
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
    if (!editVendor.trim() || !editVendorTranId.trim()) {
      setEditError("Vendor and Vendor Tran ID are required.");
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
        vendorTranId: editVendorTranId.trim(),
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
      setEditVendorTranId("");
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
    <div className="p-6">
      <Button variant="outline" onClick={() => navigate(-1)} className="mb-4">
        Back
      </Button>
      <h1 className="text-2xl font-bold mb-4">
        Utility Payments for Landlord ID: {landlordId}
      </h1>
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
              {payments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell>{payment.status || "-"}</TableCell>
                  <TableCell>{payment.amount || "-"}</TableCell>
                  <TableCell>{payment.charges || "-"}</TableCell>
                  <TableCell>
                    {payment.createdAt ? payment.createdAt.split("T")[0] : "-"}
                  </TableCell>
                  <TableCell>{payment.phoneNumber || "-"}</TableCell>
                  <TableCell>{payment.meterNumber || "-"}</TableCell>
                  <TableCell>{payment.units || "-"}</TableCell>
                  <TableCell>{payment.vendor || "-"}</TableCell>
                  <TableCell>{payment.vendorTranId || "-"}</TableCell>
                  <TableCell>
                    {payment.vendorPaymentDate &&
                    payment.vendorPaymentDate !== "0001-01-01T00:00:00"
                      ? payment.vendorPaymentDate.split("T")[0]
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
        </div>
      )}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Vendor Info</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
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
                Vendor Tran ID
              </label>
              <Input
                value={editVendorTranId}
                onChange={(e) => setEditVendorTranId(e.target.value)}
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
            <div className="flex justify-end gap-2">
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
