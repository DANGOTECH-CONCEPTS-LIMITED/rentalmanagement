import { useState } from 'react';
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
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

const meterSchema = z.object({
  meterType: z.string().min(1, { message: 'Meter type is required' }),
  meterNumber: z.string().min(1, { message: 'Meter number is required' }),
});

interface AddUtilityMeterProps {
  onSuccess?: () => void;
  authToken?: string;
}

const UtilityMeter = ({ onSuccess, authToken }: AddUtilityMeterProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  let token = '';
  let landLordId = 0;

  try {
    const user = localStorage.getItem('user');
    if (user) {
      const userData = JSON.parse(user);
      token = userData.token;
      landLordId = userData.id;
    } else {
      console.error('No user found in localStorage');
    }
  } catch (error) {
    console.error('Error parsing user data:', error);
  }

  const finalToken = authToken || token;
  const Url = import.meta.env.VITE_API_BASE_URL;
  const apiUrl = `${Url}/AddUtilityMeter`;

  const form = useForm<z.infer<typeof meterSchema>>({
    resolver: zodResolver(meterSchema),
    defaultValues: {
      meterType: '',
      meterNumber: '',
    },
  });

  const onSubmit = async (values: z.infer<typeof meterSchema>) => {
    setIsSubmitting(true);
    try {
      const payload = {
        ...values,
        landLordId,
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

  return (
    <div className="w-[70%] mx-auto mt-8 p-6 border rounded-md shadow-sm bg-white">
      <h2 className="text-xl font-semibold mb-2">Add New Utility Meter</h2>
      <p className="text-sm text-muted-foreground mb-6">
        Fill in the details to register a new utility meter.
      </p>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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

          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Adding...' : 'Add Meter'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default UtilityMeter;
