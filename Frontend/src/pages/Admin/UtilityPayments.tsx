import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { DataTable, Column } from "@/components/ui/data-table";
import { Pencil, ArrowLeft, CreditCard, X } from "lucide-react";
import { formatDateTimeDmy } from "@/lib/date-time";
import { motion, AnimatePresence } from "framer-motion";

const inputCls =
  "h-11 w-full rounded-xl border border-[#E2E8F0] bg-white px-3.5 text-sm text-[#0F172A] placeholder:text-[#94A3B8] shadow-sm outline-none transition-all focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/10";
const selCls =
  "h-11 w-full rounded-xl border border-[#E2E8F0] bg-white px-3.5 text-sm text-[#0F172A] shadow-sm outline-none transition-all focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/10 cursor-pointer";

const UtilityPayments = () => {
  const { landlordId } = useParams<{ landlordId: string }>();
  const [isLoading, setIsLoading] = useState(false);
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
  const [editStatus, setEditStatus] = useState<string>("");

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

  console.log("Payments", payments);

  useEffect(() => {
    if (!landlordId) return;
    setIsLoading(true);
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
      .finally(() => setIsLoading(false));
  }, [landlordId]);

  const handleEditClick = (payment: any) => {
    setEditPayment(payment);
    setEditVendor(payment.vendor || "");
    setEditVendorRef(payment.vendorref || "");
    setEditStatus(payment.status || "");
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

    if (!editVendor.trim() || !editVendorRef.trim()) {
      setEditError("Vendor and Vendor Ref are required.");
      return;
    }

    setEditLoading(true);
    setEditError(null);
    const user = localStorage.getItem("user");
    const token = user ? JSON.parse(user).token : null;
    try {
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
      // update status via admin endpoint (best-effort)
      try {
        const statusPayload = {
          transactionId:
            editPayment.transactionID || editPayment.transactionId || editPayment.id,
          status: editStatus,
          reasonAtTelecom: "",
          vendorTranRef: editVendorRef,
          tranType: "UTILITY",
        };
        const statusRes = await fetch(`${apiUrl}/Admin/UpdatePaymentStatus`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(statusPayload),
        });
        if (!statusRes.ok) {
          const errText = await statusRes.text().catch(() => null);
          console.warn("UpdatePaymentStatus failed:", errText);
        }
      } catch (err) {
        console.warn("UpdatePaymentStatus error", err);
      }
      setEditDialogOpen(false);
      setEditPayment(null);
      setEditVendor("");
      setEditVendorRef("");
      setEditVendorPaymentDate("");
      // Refresh payments
      setIsLoading(true);
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
      setIsLoading(false);
    }
  };

  const columns: Column<any>[] = [
    {
      key: "status",
      header: "Status",
      cell: (p) => {
        const s = (p.status || "").toUpperCase();
        const colorMap: Record<string, string> = {
          SUCCESSFUL: "bg-green-50 text-green-700 border-green-200",
          "SUCCESSFUL AT TELCOM": "bg-green-50 text-green-700 border-green-200",
          PENDING: "bg-yellow-50 text-yellow-700 border-yellow-200",
          "PENDING AT TELCOM": "bg-yellow-50 text-yellow-700 border-yellow-200",
          FAILED: "bg-red-50 text-red-700 border-red-200",
          REVERSED: "bg-slate-50 text-slate-600 border-slate-200",
        };
        const cls = colorMap[s] || "bg-slate-50 text-slate-600 border-slate-200";
        return (
          <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${cls}`}>
            {p.status || "-"}
          </span>
        );
      },
    },
    {
      key: "amount",
      header: "Amount",
      cell: (p) => p.amount || "-",
    },
    {
      key: "charges",
      header: "Charges",
      cell: (p) => p.charges || "-",
    },
    {
      key: "createdAt",
      header: "Created At",
      cell: (p) => formatDateTimeDmy(p.createdAt),
    },
    {
      key: "phoneNumber",
      header: "Phone Number",
      cell: (p) => p.phoneNumber || "-",
    },
    {
      key: "meterNumber",
      header: "Meter Number",
      cell: (p) => p.meterNumber || "-",
    },
    {
      key: "units",
      header: "Units",
      cell: (p) => p.units || "-",
    },
    {
      key: "vendor",
      header: "Vendor",
      cell: (p) => p.vendor || "-",
    },
    {
      key: "vendorRef",
      header: "Vendor Ref",
      cell: (p) => p.vendorTranId || "-",
    },
    {
      key: "vendorPaymentDate",
      header: "Vendor Payment Date",
      cell: (p) =>
        p.vendorPaymentDate && p.vendorPaymentDate !== "0001-01-01T00:00:00"
          ? formatDateTimeDmy(p.vendorPaymentDate)
          : "-",
    },
    {
      key: "actions",
      header: "Actions",
      cell: (p) => (
        <button
          onClick={() => handleEditClick(p)}
          className="inline-flex items-center justify-center rounded-lg border border-[#E2E8F0] bg-white p-2 text-[#0F172A] shadow-sm transition-colors hover:bg-slate-50"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <section className="relative overflow-hidden rounded-2xl px-8 py-8 text-white shadow-xl" style={{ background: "linear-gradient(135deg, #0a0f1e 0%, #0f2044 45%, #1a3a6e 100%)" }}>
        <div className="absolute inset-0 pointer-events-none opacity-[0.04]"
          style={{ backgroundImage: "linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)", backgroundSize: "40px 40px" }} />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <span className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-blue-200">
              Utilities
            </span>
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
              Landlord Payment Activity
            </h1>
            <p className="text-sm text-blue-200/80">
              Review, search, and update vendor details for utility payments linked to landlord ID{" "}
              <span className="font-semibold text-white">{landlordId}</span>.
            </p>
          </div>
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 self-start rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/20 lg:self-auto"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
        </div>
      </section>

      {/* Table Panel */}
      <div className="rounded-2xl border border-[#E2E8F0] bg-white shadow-sm overflow-hidden">
        <div className="border-b border-[#E2E8F0] bg-slate-50/60 px-6 py-4 flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100">
            <CreditCard className="h-4 w-4 text-blue-600" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#0F172A]">Payment Records</h3>
            <p className="text-xs text-[#64748B]">
              {filteredPayments.length} matching payment record
              {filteredPayments.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <div className="p-4">
          {error ? (
            <div className="py-8 text-center text-sm text-red-500">{error}</div>
          ) : (
            <DataTable
              data={filteredPayments}
              columns={columns}
              loading={isLoading}
              searchValue={search}
              onSearchChange={setSearch}
              searchPlaceholder="Search by meter, phone, or status..."
              label="payment"
              emptyMessage="No payments found."
            />
          )}
        </div>
      </div>

      {/* Edit Modal */}
      <AnimatePresence>
        {editDialogOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="flex w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl max-h-[90vh]"
            >
              <div className="shrink-0 bg-gradient-to-r from-[#0F172A] to-[#1D4ED8] px-6 py-5 text-white flex items-center justify-between">
                <h2 className="text-lg font-bold">Edit Vendor Info</h2>
                <button
                  onClick={() => setEditDialogOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form
                id="edit-payment-form"
                onSubmit={handleEditSubmit}
                className="flex-1 overflow-y-auto px-6 py-5 space-y-4"
              >
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                    Vendor *
                  </label>
                  <input
                    className={inputCls}
                    value={editVendor}
                    onChange={(e) => setEditVendor(e.target.value)}
                    placeholder="Enter vendor name"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                    Status *
                  </label>
                  <select
                    className={selCls}
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    required
                  >
                    <option value="PENDING">PENDING</option>
                    <option value="PENDING AT TELCOM">PENDING AT TELCOM</option>
                    <option value="SUCCESSFUL">SUCCESSFUL</option>
                    <option value="SUCCESSFUL AT TELCOM">SUCCESSFUL AT TELCOM</option>
                    <option value="FAILED">FAILED</option>
                    <option value="REVERSED">REVERSED</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                    Vendor Ref *
                  </label>
                  <input
                    className={inputCls}
                    value={editVendorRef}
                    onChange={(e) => setEditVendorRef(e.target.value)}
                    placeholder="Enter vendor reference"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                    Vendor Payment Date
                  </label>
                  <input
                    type="date"
                    className={inputCls}
                    value={editVendorPaymentDate}
                    onChange={(e) => setEditVendorPaymentDate(e.target.value)}
                  />
                </div>

                {editError && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                    {editError}
                  </div>
                )}
              </form>

              <div className="shrink-0 border-t border-slate-100 px-6 py-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditDialogOpen(false)}
                  disabled={editLoading}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="edit-payment-form"
                  disabled={editLoading}
                  className="rounded-xl bg-[#1D4ED8] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1e40af] transition-colors disabled:opacity-60"
                >
                  {editLoading ? "Saving..." : "Save"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default UtilityPayments;
