import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import axios from 'axios';
import { useState } from 'react';

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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const paymentSchema = z.object({
  phoneNumber: z
    .string()
    .min(10, { message: 'Phone number must be at least 10 digits' })
    .max(15, { message: 'Phone number is too long' }),
  meterNumber: z.string().min(5, { message: 'Meter number is required' }),
  amount: z
    .number({ invalid_type_error: 'Amount is required' })
    .positive({ message: 'Amount must be greater than 0' }),
});

type PaymentFormValues = z.infer<typeof paymentSchema>;

const MakeUtilityPayment = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      phoneNumber: '',
      meterNumber: '',
      amount: 0,
    },
  });
    const apiUrl = import.meta.env.VITE_API_BASE_URL;

  const onSubmit = async (data: PaymentFormValues) => {
    setLoading(true);

    try {
      await axios.post(`${apiUrl}/MakeUtilityPayment`, data, {
        headers: {
          'Content-Type': 'application/json',
          Accept: '*/*',
        },
      });

        toast({
          title: 'Payment Successful',
          description: 'Your utility payment has been processed successfully.',
        });
        form.reset();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Server Error',
        description: 'Could not reach payment service.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-[50%] mx-auto mt-10">
      <CardHeader>
        <CardTitle>Make Utility Payment</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="phoneNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter phone number" {...field} />
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
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="Enter amount"
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Processing...' : 'Make Payment'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default MakeUtilityPayment;
