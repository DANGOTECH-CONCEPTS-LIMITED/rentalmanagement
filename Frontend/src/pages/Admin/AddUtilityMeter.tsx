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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const meterSchema = z.object({
  meterType: z.string().min(1, { message: 'Meter type is required' }),
  meterNumber: z.string().min(1, { message: 'Meter number is required' }),
  nwscAccount: z.string().min(1, { message: 'NWSC account is required' }),
  locationOfNwscMeter: z.string().min(1, { message: 'Location of NWSC meter is required' }),
  landLordId: z.string().min(1, { message: 'Landlord selection is required' }),
});

interface Landlord {
  id: number;
  fullName: string;
  email: string;
  phoneNumber: string;
  verified: boolean;
}

const AddUtilityMeter = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [landlords, setLandlords] = useState<Landlord[]>([]);
  const [isLoadingLandlords, setIsLoadingLandlords] = useState(false);
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

  // Fetch landlords for admin
  useEffect(() => {
    setIsLoadingLandlords(true);
    fetch(`${apiUrl}/GetLandlords`, {
      method: 'GET',
      headers: {
        accept: '*/*',
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        setLandlords(data.filter((l: Landlord) => l.verified));
      })
      .catch((err) => {
        toast({
          title: 'Error',
          description: 'Failed to fetch landlords',
          variant: 'destructive',
        });
      })
      .finally(() => setIsLoadingLandlords(false));
  }, [apiUrl, token, toast]);

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
    <div className="p-6">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Add New Utility Meter</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-6">
              Fill in the details to register a new utility meter for a landlord.
            </p>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="landLordId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Landlord</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={isLoadingLandlords}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={isLoadingLandlords ? 'Loading landlords...' : 'Select a landlord'} />
                        </SelectTrigger>
                        <SelectContent>
                          {landlords.map((landlord) => (
                            <SelectItem key={landlord.id} value={landlord.id.toString()}>
                              {landlord.fullName} ({landlord.email})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
                    <FormItem>
                      <FormLabel>Location of NWSC Meter</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter location of NWSC meter" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end">
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Adding...' : 'Add Meter'}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AddUtilityMeter; 