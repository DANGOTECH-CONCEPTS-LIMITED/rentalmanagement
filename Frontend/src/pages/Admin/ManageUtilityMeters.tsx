import { useState, useEffect } from 'react';
import axios from 'axios';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Edit, Trash2, Plus } from 'lucide-react';
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
} from '@/components/ui/alert-dialog';

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
  meterType: z.string().min(1, { message: 'Meter type is required' }),
  meterNumber: z.string().min(1, { message: 'Meter number is required' }),
  nwscAccount: z.string().min(1, { message: 'NWSC account is required' }),
  locationOfNwscMeter: z.string().min(1, { message: 'Location of NWSC meter is required' }),
  landLordId: z.number().min(1, { message: 'Landlord is required' }),
});

const ManageUtilityMeters = () => {
  const [meters, setMeters] = useState<UtilityMeter[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingMeter, setEditingMeter] = useState<UtilityMeter | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [meterToDelete, setMeterToDelete] = useState<UtilityMeter | null>(null);

  const apiUrl = import.meta.env.VITE_API_BASE_URL;

  const form = useForm<z.infer<typeof meterSchema>>({
    resolver: zodResolver(meterSchema),
    defaultValues: {
      meterType: '',
      meterNumber: '',
      nwscAccount: '',
      locationOfNwscMeter: '',
      landLordId: 0,
    },
  });



  const fetchMeters = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${apiUrl}/GetAllUtilityMeters`, {
        headers: {
          accept: '*/*',
        },
      });
      setMeters(response.data);
    } catch (error) {
      console.error('Error fetching meters:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to fetch utility meters',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMeters();
  }, []);

  // Get unique landlords from meters data
  const uniqueLandlords = meters.reduce((acc, meter) => {
    const existingLandlord = acc.find(l => l.id === meter.landLordId);
    if (!existingLandlord) {
      acc.push({
        id: meter.landLordId,
        fullName: meter.user.fullName
      });
    }
    return acc;
  }, [] as { id: number; fullName: string }[]);

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
      await axios.put(`${apiUrl}/UpdateUtilityMeter/${editingMeter.id}`, values, {
        headers: {
          accept: '*/*',
          'Content-Type': 'application/json',
        },
      });

      toast({
        title: 'Success',
        description: 'Utility meter updated successfully',
      });

      setIsEditDialogOpen(false);
      setEditingMeter(null);
      form.reset();
      fetchMeters();
    } catch (error) {
      console.error('Error updating meter:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update utility meter',
      });
    }
  };

  const handleDelete = async () => {
    if (!meterToDelete) return;
    setIsDeleting(true);
    try {
      await axios.delete(`${apiUrl}/DeleteUtilityMeter/${meterToDelete.id}`, {
        headers: {
          accept: '*/*',
        },
      });
      toast({
        title: 'Success',
        description: 'Utility meter deleted successfully',
      });
      fetchMeters();
    } catch (error) {
      console.error('Error deleting meter:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete utility meter',
      });
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setMeterToDelete(null);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center">Loading utility meters...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Manage Utility Meters</h1>
      </div>

      <div className="bg-white rounded-lg shadow">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Meter Type</TableHead>
              <TableHead>Meter Number</TableHead>
              <TableHead>NWSC Account</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Landlord Name</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {meters.map((meter) => (
              <TableRow key={meter.id}>
                <TableCell>{meter.id}</TableCell>
                <TableCell>{meter.meterType}</TableCell>
                <TableCell>{meter.meterNumber}</TableCell>
                <TableCell>{meter.nwscAccount}</TableCell>
                <TableCell>{meter.locationOfNwscMeter}</TableCell>
                <TableCell>{meter.user.fullName}</TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(meter)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <AlertDialog open={deleteDialogOpen && meterToDelete?.id === meter.id} onOpenChange={(open) => {
                      setDeleteDialogOpen(open);
                      if (!open) setMeterToDelete(null);
                    }}>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            setMeterToDelete(meter);
                            setDeleteDialogOpen(true);
                          }}
                          disabled={isDeleting}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Utility Meter</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete this utility meter? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
                            {isDeleting ? 'Deleting...' : 'Delete'}
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
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Utility Meter</DialogTitle>
            <DialogDescription>
              Update the utility meter information below.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleUpdate)} className="space-y-4">
              <FormField
                control={form.control}
                name="meterType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Meter Type</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Electricity, Water" {...field} />
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
                      <Input placeholder="Enter meter number" {...field} />
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
                      <Input placeholder="Enter NWSC account number" {...field} />
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
                      <Input placeholder="Enter location of NWSC meter" {...field} />
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
                    <FormLabel>Landlord</FormLabel>
                    <Select onValueChange={(value) => field.onChange(Number(value))} value={field.value.toString()}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a landlord" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {uniqueLandlords.map((landlord) => (
                          <SelectItem key={landlord.id} value={landlord.id.toString()}>
                            {landlord.fullName}
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
                  onClick={() => setIsEditDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">Update Meter</Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ManageUtilityMeters; 