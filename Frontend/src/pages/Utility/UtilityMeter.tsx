import { useState, useEffect } from 'react';
import axios from 'axios';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus } from 'lucide-react';
import React from 'react';

const meterSchema = z.object({
  meterType: z.string().min(1, { message: 'Meter type is required' }),
  meterNumber: z.string().min(1, { message: 'Meter number is required' }),
  nwscAccount: z.string().min(1, { message: 'NWSC account is required' }),
  locationOfNwscMeter: z.string().min(1, { message: 'Location of NWSC meter is required' }),
});

interface UtilityMeter {
  id: number;
  meterType: string;
  meterNumber: string;
  nwscAccount: string;
  locationOfNwscMeter: string;
  landLordId: number;
}

interface AddUtilityMeterProps {
  onSuccess?: () => void;
  authToken?: string;
}

const UtilityMeter = ({ onSuccess, authToken }: AddUtilityMeterProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [landlords, setLandlords] = useState<{ id: number; fullName: string }[]>([]);
  const [selectedLandlordId, setSelectedLandlordId] = useState<string>('');
  const [isLoadingLandlords, setIsLoadingLandlords] = useState(false);
  const [utilityMeters, setUtilityMeters] = useState<UtilityMeter[]>([]);
  const [isLoadingMeters, setIsLoadingMeters] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { toast } = useToast();

  let token = '';
  let landLordId = 0;
  let systemRoleId = 0;

  try {
    const user = localStorage.getItem('user');
    if (user) {
      const userData = JSON.parse(user);
      token = userData.token;
      landLordId = userData.id;
      systemRoleId = userData.systemRoleId;
    } else {
      console.error('No user found in localStorage');
    }
  } catch (error) {
    console.error('Error parsing user data:', error);
  }

  const isAdmin = systemRoleId === 1;
  const isUtilityAccount = systemRoleId === 4;

  const finalToken = authToken || token;
  const Url = import.meta.env.VITE_API_BASE_URL;
  const apiUrl = `${Url}/AddUtilityMeter`;

  // Fetch landlords for admin
  React.useEffect(() => {
    if (isAdmin) {
      setIsLoadingLandlords(true);
      fetch(`${Url}/GetLandlords`, {
        method: 'GET',
        headers: {
          accept: '*/*',
          Authorization: `Bearer ${finalToken}`,
        },
      })
        .then((res) => res.json())
        .then((data) => {
          setLandlords(data.filter((l: any) => l.verified));
        })
        .catch((err) => {
          toast({
            title: 'Error',
            description: 'Failed to fetch landlords',
            variant: 'destructive',
          });
        })
        .finally(() => setIsLoadingLandlords(false));
    }
  }, [isAdmin, Url, finalToken, toast]);

  // Fetch utility meters for utility account
  React.useEffect(() => {
    if (isUtilityAccount) {
      fetchUtilityMeters();
    }
  }, [isUtilityAccount]);

  const fetchUtilityMeters = async () => {
    setIsLoadingMeters(true);
    try {
      const response = await fetch(`${Url}/GetUtilityMetersByLandLordId/${landLordId}`, {
        headers: {
          Authorization: `Bearer ${finalToken}`,
          accept: "*/*",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch utility meters: ${response.status}`);
      }

      const metersData = await response.json();
      setUtilityMeters(metersData);
    } catch (err: any) {
      console.error("Error fetching utility meters:", err);
      toast({
        variant: "destructive",
        title: "Error",
        description: err.message || "Failed to load utility meters",
      });
    } finally {
      setIsLoadingMeters(false);
    }
  };

  const form = useForm<z.infer<typeof meterSchema>>({
    resolver: zodResolver(meterSchema),
    defaultValues: {
      meterType: '',
      meterNumber: '',
      nwscAccount: '',
      locationOfNwscMeter: '',
    },
  });

  const onSubmit = async (values: z.infer<typeof meterSchema>) => {
    setIsSubmitting(true);
    try {
      const payload = {
        ...values,
        landLordId: isAdmin ? Number(selectedLandlordId) : landLordId,
      };

      await axios.post(apiUrl, payload, {
        headers: {
          accept: '*/*',
          Authorization: `Bearer ${finalToken}`,
          'Content-Type': 'application/json',
        },
      });

      toast({
        title: 'Success',
        description: 'Utility meter added successfully',
      });

      form.reset();
      setSelectedLandlordId('');
      setIsModalOpen(false);
      
      // Refresh meters list for utility accounts
      if (isUtilityAccount) {
        fetchUtilityMeters();
      }
      
      if (onSuccess) onSuccess();
    } catch (error) {
      let errorMessage = 'Failed to add utility meter';
      if (axios.isAxiosError(error)) {
        errorMessage = error.response?.data?.message || errorMessage;
      }

      toast({
        variant: 'destructive',
        title: 'Error',
        description: errorMessage,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleModalOpenChange = (open: boolean) => {
    setIsModalOpen(open);
    if (!open) {
      form.reset();
      setSelectedLandlordId('');
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header with Add Button */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Utility Meters</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your utility meters
          </p>
        </div>
        
        <Dialog open={isModalOpen} onOpenChange={handleModalOpenChange}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Utility Meter
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Utility Meter</DialogTitle>
              <DialogDescription>
                Fill in the details to register a new utility meter.
              </DialogDescription>
            </DialogHeader>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                {isAdmin && (
                  <FormField
                    control={form.control}
                    name="landLordId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Landlord</FormLabel>
                        <Select
                          value={selectedLandlordId}
                          onValueChange={setSelectedLandlordId}
                          disabled={isLoadingLandlords}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={isLoadingLandlords ? 'Loading landlords...' : 'Select a landlord'} />
                          </SelectTrigger>
                          <SelectContent>
                            {landlords.map((landlord) => (
                              <SelectItem key={landlord.id} value={landlord.id.toString()}>
                                {landlord.fullName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {!selectedLandlordId && <FormMessage>Please select a landlord</FormMessage>}
                      </FormItem>
                    )}
                  />
                )}

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

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsModalOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={isSubmitting || (isAdmin && !selectedLandlordId)}
                  >
                    {isSubmitting ? 'Adding...' : 'Add Meter'}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* View Utility Meters Section - Only for Utility Accounts */}
      {isUtilityAccount && (
        <Card>
          <CardHeader>
            <CardTitle>My Utility Meters</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-6">
              View all utility meters associated with your account
            </p>

            {isLoadingMeters ? (
              <div className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
              </div>
            ) : utilityMeters.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Meter Type</TableHead>
                      <TableHead>Meter Number</TableHead>
                      <TableHead>NWSC Account</TableHead>
                      <TableHead>Location</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {utilityMeters.map((meter) => (
                      <TableRow key={meter.id}>
                        <TableCell>{meter.id}</TableCell>
                        <TableCell>{meter.meterType}</TableCell>
                        <TableCell>{meter.meterNumber}</TableCell>
                        <TableCell>{meter.nwscAccount}</TableCell>
                        <TableCell>{meter.locationOfNwscMeter}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">No utility meters found</p>
                <p className="text-sm text-gray-400 mt-1">
                  Click "Add Utility Meter" to get started
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default UtilityMeter;
