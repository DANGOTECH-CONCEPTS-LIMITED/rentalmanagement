import { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Edit, Trash2, Eye, Cable, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { DataTable, Column } from "@/components/ui/data-table";
import { motion, AnimatePresence } from "framer-motion";

const inputCls =
  "h-11 w-full rounded-xl border border-[#E2E8F0] bg-white px-3.5 text-sm text-[#0F172A] placeholder:text-[#94A3B8] shadow-sm outline-none transition-all focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/10";
const selCls =
  "h-11 w-full rounded-xl border border-[#E2E8F0] bg-white px-3.5 text-sm text-[#0F172A] shadow-sm outline-none transition-all focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/10 cursor-pointer";

interface Landlord {
  id: number;
  fullName: string;
  email: string;
  phoneNumber: string;
  passportPhoto: string;
  nationalIdNumber: string;
  systemRoleId: number;
  systemRole: {
    id: number;
    name: string;
    description: string;
  };
}

interface UtilityMeter {
  id: number;
  meterType: string;
  meterNumber: string;
  nwscAccount: string;
  locationOfNwscMeter: string;
  landLordId: number;
  user: {
    fullName: string;
  };
}

const meterSchema = z.object({
  meterType: z.string().min(1, { message: "Meter type is required" }),
  meterNumber: z.string().min(1, { message: "Meter number is required" }),
  nwscAccount: z.string().min(1, { message: "NWSC account is required" }),
  locationOfNwscMeter: z
    .string()
    .min(1, { message: "Location of NWSC meter is required" }),
  landLordId: z.number().min(1, { message: "Landlord is required" }),
});

const ManageUtilityMeters = () => {
  const [meters, setMeters] = useState<UtilityMeter[]>([]);
  const [allUsers, setAllUsers] = useState<Landlord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingMeter, setEditingMeter] = useState<UtilityMeter | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [meterToDelete, setMeterToDelete] = useState<UtilityMeter | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  const [search, setSearch] = useState("");

  const apiUrl = import.meta.env.VITE_API_BASE_URL;
  const user = localStorage.getItem("user");
  const token = user ? JSON.parse(user).token : null;
  const authHeader = { Authorization: `Bearer ${token}` };

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<z.infer<typeof meterSchema>>({
    resolver: zodResolver(meterSchema),
    defaultValues: {
      meterType: "",
      meterNumber: "",
      nwscAccount: "",
      locationOfNwscMeter: "",
      landLordId: 0,
    },
  });

  const watchedLandLordId = watch("landLordId");

  const fetchMeters = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get(`${apiUrl}/GetAllUtilityMeters`, {
        headers: { accept: "*/*", ...authHeader },
      });
      setMeters(response.data);
    } catch (error) {
      console.error("Error fetching meters:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch utility meters",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAllUsers = async () => {
    try {
      const response = await axios.get(`${apiUrl}/GetAllUsers`, {
        headers: { accept: "*/*", ...authHeader },
      });
      setAllUsers(response.data);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch users",
      });
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      await Promise.all([fetchMeters(), fetchAllUsers()]);
      setIsLoading(false);
    };
    fetchData();
  }, []);

  const availableUsers = allUsers.map((user) => ({
    id: user.id,
    fullName: user.fullName,
  }));

  const filteredMeters = useMemo(() => {
    if (!search.trim()) return meters;
    const s = search.trim().toLowerCase();
    return meters.filter((meter) => {
      const userName = meter.user?.fullName || "";
      return (
        (meter.meterType && meter.meterType.toLowerCase().includes(s)) ||
        (meter.meterNumber && meter.meterNumber.toLowerCase().includes(s)) ||
        (meter.nwscAccount && meter.nwscAccount.toLowerCase().includes(s)) ||
        (meter.locationOfNwscMeter &&
          meter.locationOfNwscMeter.toLowerCase().includes(s)) ||
        userName.toLowerCase().includes(s)
      );
    });
  }, [meters, search]);

  const handleEdit = (meter: UtilityMeter) => {
    setEditingMeter(meter);
    reset({
      meterType: meter.meterType,
      meterNumber: meter.meterNumber,
      nwscAccount: meter.nwscAccount,
      locationOfNwscMeter: meter.locationOfNwscMeter,
      landLordId: meter.landLordId,
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdate = async (values: z.infer<typeof meterSchema>) => {
    if (!editingMeter) return;

    try {
      await axios.put(
        `${apiUrl}/UpdateUtilityMeter/${editingMeter.id}`,
        values,
        {
          headers: { accept: "*/*", "Content-Type": "application/json", ...authHeader },
        }
      );

      toast({
        title: "Success",
        description: "Utility meter updated successfully",
      });

      setIsEditDialogOpen(false);
      setEditingMeter(null);
      reset();
      fetchMeters();
    } catch (error) {
      console.error("Error updating meter:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update utility meter",
      });
    }
  };

  const handleDelete = async () => {
    if (!meterToDelete) return;
    setIsDeleting(true);
    try {
      await axios.delete(`${apiUrl}/DeleteUtilityMeter/${meterToDelete.id}`, {
        headers: { accept: "*/*", ...authHeader },
      });
      toast({
        title: "Success",
        description: "Utility meter deleted successfully",
      });
      fetchMeters();
    } catch (error) {
      console.error("Error deleting meter:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete utility meter",
      });
    } finally {
      setIsDeleting(false);
      setMeterToDelete(null);
      setDeleteDialogOpen(false);
    }
  };

  const handleViewPayments = (landLordId: number) => {
    navigate(`/admin-dashboard/utility-payments/${landLordId}`);
  };

  const columns: Column<UtilityMeter>[] = [
    {
      key: "id",
      header: "ID",
      cell: (row) => row.id,
    },
    {
      key: "meterType",
      header: "Meter Type",
      cell: (row) => row.meterType,
    },
    {
      key: "meterNumber",
      header: "Meter Number",
      cell: (row) => row.meterNumber,
    },
    {
      key: "nwscAccount",
      header: "NWSC Account",
      cell: (row) => row.nwscAccount,
    },
    {
      key: "locationOfNwscMeter",
      header: "Location",
      cell: (row) => row.locationOfNwscMeter,
    },
    {
      key: "landlordName",
      header: "Landlord Name",
      cell: (row) => row.user?.fullName ?? "-",
    },
    {
      key: "utilityPayments",
      header: "Utility Payments",
      cell: (row) => (
        <button
          onClick={() => handleViewPayments(row.landLordId)}
          className="inline-flex items-center gap-1 rounded-lg border border-[#E2E8F0] bg-white px-3 py-1.5 text-xs font-semibold text-[#1D4ED8] shadow-sm transition-colors hover:bg-slate-50"
        >
          <Eye className="h-3.5 w-3.5" /> View
        </button>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      cell: (row) => (
        <div className="flex gap-2">
          <button
            onClick={() => handleEdit(row)}
            className="inline-flex items-center justify-center rounded-lg border border-[#E2E8F0] bg-white p-2 text-[#0F172A] shadow-sm transition-colors hover:bg-slate-50"
          >
            <Edit className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => {
              setMeterToDelete(row);
              setDeleteDialogOpen(true);
            }}
            disabled={isDeleting}
            className="inline-flex items-center justify-center rounded-lg border border-red-100 bg-red-50 p-2 text-red-600 shadow-sm transition-colors hover:bg-red-100 disabled:opacity-60"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <section className="relative overflow-hidden rounded-2xl px-8 py-8 text-white shadow-xl" style={{ background: "linear-gradient(135deg, #0a0f1e 0%, #0f2044 45%, #1a3a6e 100%)" }}>
        <div className="absolute inset-0 pointer-events-none opacity-[0.04]"
          style={{ backgroundImage: "linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)", backgroundSize: "40px 40px" }} />
        <div className="relative space-y-2">
          <span className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-blue-200">
            Utilities
          </span>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Manage Utility Meters</h1>
          <p className="text-sm text-blue-200/80">
            View, edit, and delete utility meters registered in the system.
          </p>
        </div>
      </section>

      {/* Table Panel */}
      <div className="rounded-2xl border border-[#E2E8F0] bg-white shadow-sm overflow-hidden">
        <div className="border-b border-[#E2E8F0] bg-slate-50/60 px-6 py-4 flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100">
            <Cable className="h-4 w-4 text-blue-600" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#0F172A]">All Utility Meters</h3>
            <p className="text-xs text-[#64748B]">
              {filteredMeters.length} meter{filteredMeters.length !== 1 ? "s" : ""} found
            </p>
          </div>
        </div>
        <div className="p-4">
          <DataTable
            data={filteredMeters}
            columns={columns}
            loading={isLoading}
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search by meter type, number, account, location, or landlord..."
            label="meter"
            emptyMessage="No utility meters found."
          />
        </div>
      </div>

      {/* Edit Modal */}
      <AnimatePresence>
        {isEditDialogOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="flex w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl max-h-[90vh]"
            >
              <div className="shrink-0 bg-gradient-to-r from-[#0F172A] to-[#1D4ED8] px-6 py-5 text-white flex items-center justify-between">
                <h2 className="text-lg font-bold">Edit Utility Meter</h2>
                <button
                  onClick={() => {
                    setIsEditDialogOpen(false);
                    setEditingMeter(null);
                    reset();
                  }}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-5">
                <form
                  id="edit-meter-form"
                  onSubmit={handleSubmit(handleUpdate)}
                  className="space-y-4"
                >
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                      Meter Type *
                    </label>
                    <input
                      className={inputCls}
                      placeholder="e.g., Electricity, Water"
                      {...register("meterType")}
                    />
                    {errors.meterType && (
                      <p className="text-xs text-red-500">{errors.meterType.message}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                      Meter Number *
                    </label>
                    <input
                      className={inputCls}
                      placeholder="Enter meter number"
                      {...register("meterNumber")}
                    />
                    {errors.meterNumber && (
                      <p className="text-xs text-red-500">{errors.meterNumber.message}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                      NWSC Account *
                    </label>
                    <input
                      className={inputCls}
                      placeholder="Enter NWSC account number"
                      {...register("nwscAccount")}
                    />
                    {errors.nwscAccount && (
                      <p className="text-xs text-red-500">{errors.nwscAccount.message}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                      Location of NWSC Meter *
                    </label>
                    <input
                      className={inputCls}
                      placeholder="Enter location of NWSC meter"
                      {...register("locationOfNwscMeter")}
                    />
                    {errors.locationOfNwscMeter && (
                      <p className="text-xs text-red-500">{errors.locationOfNwscMeter.message}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                      User *
                    </label>
                    <select
                      className={selCls}
                      value={watchedLandLordId || ""}
                      onChange={(e) => setValue("landLordId", Number(e.target.value))}
                    >
                      <option value="">Select a user</option>
                      {availableUsers.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.fullName}
                        </option>
                      ))}
                    </select>
                    {errors.landLordId && (
                      <p className="text-xs text-red-500">{errors.landLordId.message}</p>
                    )}
                  </div>
                </form>
              </div>

              <div className="shrink-0 border-t border-slate-100 px-6 py-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditDialogOpen(false);
                    setEditingMeter(null);
                    reset();
                  }}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="edit-meter-form"
                  className="btn-grid rounded-xl bg-[#1D4ED8] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1e40af] transition-colors"
                >
                  Update Meter
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteDialogOpen && meterToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="flex w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
            >
              <div className="shrink-0 bg-gradient-to-r from-red-700 to-red-500 px-6 py-5 text-white flex items-center justify-between">
                <h2 className="text-lg font-bold">Delete Utility Meter</h2>
                <button
                  onClick={() => {
                    setDeleteDialogOpen(false);
                    setMeterToDelete(null);
                  }}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="px-6 py-5">
                <p className="text-sm text-[#334155]">
                  Are you sure you want to delete meter{" "}
                  <span className="font-semibold text-[#0F172A]">{meterToDelete.meterNumber}</span>?
                  This action cannot be undone.
                </p>
              </div>
              <div className="shrink-0 border-t border-slate-100 px-6 py-4 flex justify-end gap-2">
                <button
                  onClick={() => {
                    setDeleteDialogOpen(false);
                    setMeterToDelete(null);
                  }}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="btn-grid rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition-colors disabled:opacity-60"
                >
                  {isDeleting ? "Deleting..." : "Delete"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ManageUtilityMeters;
