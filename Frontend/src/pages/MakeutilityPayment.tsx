import { useState } from 'react';
import axios from 'axios';

import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { useForm } from 'react-hook-form';
import * as z from 'zod';

// Define the zod schema for form validation
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

interface PaymentRecord {
  id: number;
  description: string;
  transactionID: string;
  paymentMethod: string;
  utilityType: string;
  status: string;
  amount: number;
  charges: number;
  createdAt: string;
  phoneNumber: string;
  meterNumber: string;
  token: string;
}

interface PaymentPreview {
  result_code: number;
  result: {
    total_paid: number;
    total_unit: number;
    token: string;
    customer_number: string;
    customer_name: string;
    customer_addr: string;
    meter_number: string;
    gen_datetime: string;
    gen_user: string;
    company: string;
    price: number;
    vat: number;
    tid_datetime: string;
    currency: string;
    unit: string;
    TaskNo: string;
  };
  reason: string;
}

const MakeUtilityPayment = () => {
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [meterNumber, setMeterNumber] = useState('');
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [previewData, setPreviewData] = useState<PaymentPreview | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const { toast } = useToast();
  const apiUrl = import.meta.env.VITE_API_BASE_URL;
  
  const previewApiUrl = `${apiUrl}/preview`;

  const form = useForm({
    defaultValues: {
      phoneNumber: '',
      meterNumber: '',
      amount: undefined,
    },
    // Note: We'd use zodResolver here if available
    // resolver: zodResolver(paymentSchema), 
  });

  const fetchPayments = async () => {
    if (!meterNumber) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Please enter a meter number.',
      });
      return;
    }

    setIsFetching(true);
    try {
      const response = await axios.get(`${apiUrl}/GetUtilityPaymentByMeterNumber${meterNumber}`);
      setPayments(response.data);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Fetch Error',
        description: error.message,
      });
    } finally {
      setIsFetching(false);
    }
  };

  // Fetch preview data
  const fetchPreview = async () => {
    const values = form.getValues();
    if (!values.meterNumber || !values.amount) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Meter number and amount are required for preview.',
      });
      return;
    }

    setIsPreviewing(true);
    setShowPreview(false);
    
    try {
      const response = await axios.post(previewApiUrl, {
        meterNumber: values.meterNumber,
        amount: values.amount
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': '*/*'
        }
      });
      
      setPreviewData(response.data);
      setShowPreview(true);
    } catch (error) {
      console.error('Preview error:', error);
      toast({
        variant: 'destructive',
        title: 'Preview Error',
        description: error.response.data.message,
      });
      setShowPreview(false);
    } finally {
      setIsPreviewing(false);
    }
  };

  const onSubmit = async (data) => {
    setIsSubmitting(true);

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
      
      form.reset({
        phoneNumber: '',
        meterNumber: '',
        amount: undefined,
      });
      setPaymentModalOpen(false);
      setShowPreview(false);
      setPreviewData(null);
      
      if (meterNumber) {
        fetchPayments();
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Server Error',
        description: 'Could not reach payment service.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset preview when modal closes
  const handleModalChange = (isOpen) => {
    setPaymentModalOpen(isOpen);
    if (!isOpen) {
      setShowPreview(false);
      setPreviewData(null);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Utility Payments</h1>
        
        <Dialog open={paymentModalOpen} onOpenChange={handleModalChange}>
          <DialogTrigger asChild>
            <Button>Make New Payment</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Make Utility Payment</DialogTitle>
              <DialogDescription>
                Enter your details to process a utility payment
              </DialogDescription>
            </DialogHeader>
            
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
                          value={ field.value || ''}
                          onChange={(e) => {
                            field.onChange(Number(e.target.value));
                            if (e.target.value === '') {
                              field.onChange(undefined);
                            }
                          
                          }
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={fetchPreview}
                    disabled={isPreviewing}
                  >
                    {isPreviewing ? 'Loading...' : 'Preview Payment'}
                  </Button>
                </div>

                {showPreview && previewData && (
                  <div className="mt-4 p-4 border rounded-md bg-gray-50">
                    <h3 className="font-medium text-lg mb-2">Payment Preview</h3>
                    
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="font-medium">Customer Name:</div>
                      <div>{previewData.result.customer_name}</div>
                      
                      <div className="font-medium">Meter Number:</div>
                      <div>{previewData.result.meter_number}</div>
                      
                      <div className="font-medium">Amount Paying:</div>
                      <div>{previewData.result.total_paid} {previewData.result.currency}</div>
                      
                      <div className="font-medium">Units:</div>
                      <div>{previewData.result.total_unit} {previewData.result.unit}</div>
                      
                      <div className="font-medium">Price per Unit:</div>
                      <div>{previewData.result.price} {previewData.result.currency}</div>
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setPaymentModalOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={isSubmitting || !showPreview}
                  >
                    {isSubmitting ? 'Processing...' : 'Confirm Payment'}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>View Utility Payments by Meter Number</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Input
              placeholder="Enter meter number"
              value={meterNumber}
              onChange={(e) => setMeterNumber(e.target.value)}
              className="max-w-sm"
            />
            <Button onClick={fetchPayments} disabled={isFetching}>
              {isFetching ? 'Fetching...' : 'Fetch Payments'}
            </Button>
          </div>

          {payments.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-2 text-left">ID</th>
                    <th className="p-2 text-left">Transaction ID</th>
                    <th className="p-2 text-left">Token</th>
                    <th className="p-2 text-left">Phone</th>
                    <th className="p-2 text-left">Amount</th>
                    <th className="p-2 text-left">Status</th>
                    <th className="p-2 text-left">Created At</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment) => (
                    <tr key={payment.id} className="border-t">
                      <td className="p-2">{payment.id}</td>
                      <td className="p-2">{payment.transactionID}</td>
                      <td className="p-2">{payment.token}</td>
                      <td className="p-2">{payment.phoneNumber}</td>
                      <td className="p-2">{payment.amount}</td>
                      <td className="p-2">{payment.status}</td>
                      <td className="p-2">{new Date(payment.createdAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            !isFetching && <p className="text-muted">No records found.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MakeUtilityPayment;