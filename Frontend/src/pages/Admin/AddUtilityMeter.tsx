import { useState, useEffect } from 'react';
import axios from 'axios';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Cable, MapPin, UserRound, Waves } from 'lucide-react';

const meterSchema = z.object({
  meterType: z.string().min(1, { message: 'Meter type is required' }),
  meterNumber: z.string().min(1, { message: 'Meter number is required' }),
  nwscAccount: z.string().min(1, { message: 'NWSC account is required' }),
  locationOfNwscMeter: z.string().min(1, { message: 'Location of NWSC meter is required' }),
  landLordId: z.string().min(1, { message: 'Landlord selection is required' }),
});

interface Role {
  id: number;
  name: string;
}

interface User {
  id: string;
  fullName: string;
  email: string;
  systemRole: {
    id: number;
    name: string;
  };
  verified: boolean;
}

const AddUtilityMeter = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isLoadingRoles, setIsLoadingRoles] = useState(false);
  const { toast } = useToast();

  let token = '';
  try {
    const user = localStorage.getItem('user');
    if (user) {
      const userData = JSON.parse(user);
      token = userData.token;
    } else {
      console.error('No user found in localStorage');
    }
  } catch (error) {
    console.error('Error parsing user data:', error);
  }

  const apiUrl = import.meta.env.VITE_API_BASE_URL;

  const form = useForm<z.infer<typeof meterSchema>>({
    resolver: zodResolver(meterSchema),
    defaultValues: {
      meterType: '',
      meterNumber: '',
      nwscAccount: '',
      locationOfNwscMeter: '',
      landLordId: '',
    },
  });

  // Fetch all roles and all users
  useEffect(() => {
    setIsLoadingRoles(true);
    axios.get(`${apiUrl}/GetAllRoles`, {
      headers: {
        accept: '*/*',
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => {
        setRoles(res.data);
      })
      .catch(() => {
        toast({
          title: 'Error',
          description: 'Failed to fetch roles',
          variant: 'destructive',
        });
      })
      .finally(() => setIsLoadingRoles(false));
  }, [apiUrl, token, toast]);

  useEffect(() => {
    setIsLoadingUsers(true);
    axios.get(`${apiUrl}/GetAllUsers`, {
      headers: {
        accept: '*/*',
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => {
        setUsers(res.data);
      })
      .catch(() => {
        toast({
          title: 'Error',
          description: 'Failed to fetch users',
          variant: 'destructive',
        });
      })
      .finally(() => setIsLoadingUsers(false));
  }, [apiUrl, token, toast]);

  // Find the landlord role ID
  const landlordRole = roles.find((role) => role.name.toLowerCase() === 'landlord');
  const landlordRoleId = landlordRole?.id;

  // Filter users for landlords
  const landlordUsers = users.filter((u) => u.systemRole.id === landlordRoleId && u.verified);

  const onSubmit = async (values: z.infer<typeof meterSchema>) => {
    setIsSubmitting(true);
    try {
      const payload = {
        meterType: values.meterType,
        meterNumber: values.meterNumber,
        nwscAccount: values.nwscAccount,
        locationOfNwscMeter: values.locationOfNwscMeter,
        landLordId: Number(values.landLordId),
      };

      await axios.post(`${apiUrl}/AddUtilityMeter`, payload, {
        headers: {
          accept: '*/*',
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      toast({
        title: 'Success',
        description: 'Utility meter added successfully',
      });

      form.reset();
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

  return (
    <div className="space-y-8">
      <section className="page-hero">
        <div className="max-w-3xl space-y-3">
          <span className="inline-flex w-fit items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Utility Setup
          </span>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
            Add a new utility meter
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">
            Register a meter against the correct landlord with a cleaner, more balanced form layout.
          </p>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="form-shell border-none shadow-none">
          <CardHeader>
            <CardTitle>Add New Utility Meter</CardTitle>
            <CardDescription>
              Fill in the details below to register and assign a utility meter.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid gap-5 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="landLordId"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>User</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={isLoadingUsers || isLoadingRoles}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={isLoadingUsers ? 'Loading users...' : 'Select a user'} />
                        </SelectTrigger>
                        <SelectContent>
                          {landlordUsers.map((user) => (
                            <SelectItem key={user.id} value={user.id.toString()}>
                              {user.fullName} ({user.email})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Only verified landlords are listed here.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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
                    <FormItem className="md:col-span-2">
                      <FormLabel>Location of NWSC Meter</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter location of NWSC meter" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                </div>

                <div className="flex flex-col gap-3 border-t border-border/70 pt-6 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-muted-foreground">
                    Review the landlord and meter identifiers before saving.
                  </p>
                  <Button type="submit" disabled={isSubmitting} className="min-w-36">
                    {isSubmitting ? 'Adding...' : 'Add Meter'}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="data-surface">
            <CardHeader>
              <CardTitle className="text-lg">What this captures</CardTitle>
              <CardDescription>
                Keep submissions clean and consistent across all utility records.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3 rounded-2xl bg-slate-50 p-4">
                <UserRound className="mt-0.5 h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium text-slate-900">Verified landlord</p>
                  <p className="text-sm text-muted-foreground">Assign each meter to the right account owner.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-2xl bg-slate-50 p-4">
                <Cable className="mt-0.5 h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium text-slate-900">Meter identity</p>
                  <p className="text-sm text-muted-foreground">Store the meter type and meter number in a consistent format.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-2xl bg-slate-50 p-4">
                <Waves className="mt-0.5 h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium text-slate-900">Billing reference</p>
                  <p className="text-sm text-muted-foreground">The NWSC account makes reconciliation much easier later.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-2xl bg-slate-50 p-4">
                <MapPin className="mt-0.5 h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium text-slate-900">Installation location</p>
                  <p className="text-sm text-muted-foreground">Use a clear location label so support and admins can identify the unit fast.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AddUtilityMeter; 