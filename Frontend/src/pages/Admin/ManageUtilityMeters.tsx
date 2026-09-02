import { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Edit,
  Trash2,
  Plus,
  Eye,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { useNavigate } from "react-router-dom";

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
  const [loading, setLoading] = useState(true);
  const [editingMeter, setEditingMeter] = useState<UtilityMeter | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [meterToDelete, setMeterToDelete] = useState<UtilityMeter | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Search and pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;
  const [search, setSearch] = useState("");

  const apiUrl = import.meta.env.VITE_API_BASE_URL;

  const form = useForm<z.infer<typeof meterSchema>>({
    resolver: zodResolver(meterSchema),
    defaultValues: {
      meterType: "",
      meterNumber: "",
      nwscAccount: "",
      locationOfNwscMeter: "",
      landLordId: 0,
    },
  });

  const fetchMeters = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${apiUrl}/GetAllUtilityMeters`, {
        headers: {
          accept: "*/*",
        },
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
      setLoading(false);
    }
  };

  const fetchAllUsers = async () => {
    try {
      const response = await axios.get(`${apiUrl}/GetAllUsers`, {
        headers: {
          accept: "*/*",
        },
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
      setLoading(true);
      await Promise.all([fetchMeters(), fetchAllUsers()]);
      setLoading(false);
    };
    fetchData();
  }, []);

  // Use all users instead of just landlords from meters data
  const availableUsers = allUsers.map((user) => ({
    id: user.id,
    fullName: user.fullName,
  }));

  // Filtered and paginated meters
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

  const totalPages = Math.ceil(filteredMeters.length / rowsPerPage);
  const paginatedMeters = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredMeters.slice(start, start + rowsPerPage);
  }, [filteredMeters, currentPage]);

  const handleEdit = (meter: UtilityMeter) => {
    setEditingMeter(meter);
    form.reset({
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
          headers: {
            accept: "*/*",
            "Content-Type": "application/json",
          },
        },
      );

      toast({
        title: "Success",
        description: "Utility meter updated successfully",
      });

      setIsEditDialogOpen(false);
      setEditingMeter(null);
      form.reset();
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
        headers: {
          accept: "*/*",
        },
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

  if (loading) {
    return (
      <div className="dark text-white min-h-full p-6">
        <div className="text-center text-blue-100">
          Loading utility meters...
        </div>
      </div>
    );
  }

  return (
    <div className="dark text-white min-h-full p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white">Manage Utility Meters</h1>
        <Input
          type="text"
          variant="dark"
          placeholder="Search by meter type, number, account, location, or landlord..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setCurrentPage(1);
          }}
          className="w-64"
        />
      </div>

      <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl p-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Meter Type</TableHead>
              <TableHead>Meter Number</TableHead>
              <TableHead>NWSC Account</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Landlord Name</TableHead>
              <TableHead>Utility Payments</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedMeters.map((meter) => (
              <TableRow key={meter.id}>
                <TableCell>{meter.id}</TableCell>
                <TableCell>{meter.meterType}</TableCell>
                <TableCell>{meter.meterNumber}</TableCell>
                <TableCell>{meter.nwscAccount}</TableCell>
                <TableCell>{meter.locationOfNwscMeter}</TableCell>
                <TableCell>{meter.user?.fullName ?? "-"}</TableCell>
                <TableCell>
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-white/10 border-blue-400/30 text-blue-300 hover:bg-blue-500/10 hover:text-blue-100"
                    onClick={() => handleViewPayments(meter.landLordId)}
                  >
                    <Eye className="h-4 w-4 mr-1" /> View
                  </Button>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="bg-white/10 border-green-400/30 text-green-300 hover:bg-green-500/10 hover:text-green-100"
                      onClick={() => handleEdit(meter)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <AlertDialog
                      open={deleteDialogOpen && meterToDelete?.id === meter.id}
                      onOpenChange={(open) => {
                        if (!open) {
                          setDeleteDialogOpen(false);
                          setMeterToDelete(null);
                        }
                      }}
                    >
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="bg-white/10 border-red-400/30 text-red-300 hover:bg-red-500/10 hover:text-red-100"
                          onClick={() => {
                            setMeterToDelete(meter);
                            setDeleteDialogOpen(true);
                          }}
                          disabled={isDeleting}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="bg-slate-900/95 border-white/20 text-white">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="text-white">
                            Delete Utility Meter
                          </AlertDialogTitle>
                          <AlertDialogDescription className="text-blue-200">
                            Are you sure you want to delete this utility meter?
                            This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                            Cancel
                          </AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className="bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700"
                          >
                            {isDeleting ? "Deleting..." : "Delete"}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex justify-end mt-4 p-4">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/10"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-blue-200">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/10"
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

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="bg-slate-900/95 border-white/20 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Edit Utility Meter</DialogTitle>
            <DialogDescription className="text-blue-200">
              Update the utility meter information below.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleUpdate)}
              className="space-y-4"
            >
              <FormField
                control={form.control}
                name="meterType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Meter Type</FormLabel>
                    <FormControl>
                      <Input
                        variant="dark"
                        placeholder="e.g., Electricity, Water"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="meterNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Meter Number</FormLabel>
                    <FormControl>
                      <Input
                        variant="dark"
                        placeholder="Enter meter number"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="nwscAccount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>NWSC Account</FormLabel>
                    <FormControl>
                      <Input
                        variant="dark"
                        placeholder="Enter NWSC account number"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="locationOfNwscMeter"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location of NWSC Meter</FormLabel>
                    <FormControl>
                      <Input
                        variant="dark"
                        placeholder="Enter location of NWSC meter"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="landLordId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>User</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(Number(value))}
                      value={field.value.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a user" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {availableUsers.map((user) => (
                          <SelectItem key={user.id} value={user.id.toString()}>
                            {user.fullName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                  onClick={() => {
                    setIsEditDialogOpen(false);
                    setEditingMeter(null);
                    form.reset();
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:from-blue-600 hover:to-cyan-600 shadow-lg"
                >
                  Update Meter
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ManageUtilityMeters;
