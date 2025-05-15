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

interface CustomerInfo {
  customer_name: string;
  customer_number: string;
  meter_number: string;
}

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
  reasonAtTelecom: string;
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
  const [validationStep, setValidationStep] = useState(true); // Start with validation step
  const [isValidating, setIsValidating] = useState(false);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);

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

  const validationForm = useForm({
    defaultValues: {
      meterNumber: '',
    },
  });

  const paymentForm = useForm({
    defaultValues: {
      phoneNumber: '',
      meterNumber: '',
      amount: undefined,
    },
    // Note: We'd use zodResolver here if available
    // resolver: zodResolver(paymentSchema), 
  });

  // Handle meter validation
  const validateMeter = async (data) => {
    setIsValidating(true);

    try {
      const response = await axios.post(`${apiUrl}/ValidateMeter`, {
        meterNumber: data.meterNumber
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': '*/*'
        }
      });

      const responseData = response.data;

      if (responseData.result_code === 0 && Array.isArray(responseData.result) && responseData.result.length > 0) {
        const customer = responseData.result[0];
        setCustomerInfo(customer);

        // Pre-fill payment form with validated meter number
        paymentForm.setValue('meterNumber', data.meterNumber);

        toast({
          title: 'Validation Successful',
          description: 'Customer information found. You can now proceed with payment.',
        });

        // Move to payment step
        setValidationStep(false);
      } else {
        toast({
          variant: 'destructive',
          title: 'Validation Failed',
          description: responseData.reason || 'No customer found with this meter number.',
        });
        setCustomerInfo(null);
      }
    } catch (error) {
      console.error('Validation error:', error);
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Could not validate meter number. Please try again.',
      });
    } finally {
      setIsValidating(false);
    }
  };

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
        description: error.response?.data?.message || error.message,
      });
    } finally {
      setIsFetching(false);
    }
  };

  // Fetch preview data
  const fetchPreview = async () => {
    const values = paymentForm.getValues();
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
        description: error.response?.data?.message || error.message,
      });
      setShowPreview(false);
    } finally {
      setIsPreviewing(false);
    }
  };

  const onSubmitPayment = async (data) => {
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

      paymentForm.reset({
        phoneNumber: '',
        meterNumber: '',
        amount: undefined,
      });
      setPaymentModalOpen(false);
      setShowPreview(false);
      setPreviewData(null);
      setValidationStep(true);
      setCustomerInfo(null);

      // Update payment history if meter number is set
      if (meterNumber) {
        fetchPayments();
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Server Error',
        description: error.response?.data?.message || 'Could not reach payment service.',
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
      setValidationStep(true);
      setCustomerInfo(null);
      validationForm.reset();
      paymentForm.reset();
    }
  };

  // Go back to validation step
  const handleBackToValidation = () => {
    setValidationStep(true);
    setShowPreview(false);
    setPreviewData(null);
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Utility Payments</h1>

        <Dialog open={paymentModalOpen} onOpenChange={handleModalChange}>
          <DialogTrigger asChild>
            <Button>Make New Payment</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle>
                {validationStep ? 'Validate Meter Number' : 'Make Utility Payment'}
              </DialogTitle>
              <DialogDescription>
                {validationStep
                  ? 'First, validate your meter number to proceed'
                  : 'Enter your details to process a utility payment'}
              </DialogDescription>
            </DialogHeader>

            {validationStep ? (
              // Validation Form
              <Form {...validationForm}>
                <form onSubmit={validationForm.handleSubmit(validateMeter)} className="space-y-4">
                  <FormField
                    control={validationForm.control}
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

                  <div className="flex justify-end gap-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setPaymentModalOpen(false)}
                      className="w-full sm:w-auto"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={isValidating}
                      className="w-full sm:w-auto"
                    >
                      {isValidating ? 'Validating...' : 'Validate'}
                    </Button>
                  </div>
                </form>
              </Form>
            ) : (
              // Payment Form
              <div className="space-y-6 max-h-[70vh] overflow-y-auto px-1">
                {customerInfo && (
                  <Card className="bg-gray-50 shadow-sm">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Customer Information</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="grid grid-cols-1 gap-2 text-sm">
                        <div className="flex justify-between border-b pb-1">
                          <span className="font-medium">Name:</span>
                          <span>{customerInfo.customer_name}</span>
                        </div>

                        <div className="flex justify-between border-b pb-1">
                          <span className="font-medium">Customer Number:</span>
                          <span>{customerInfo.customer_number}</span>
                        </div>

                        <div className="flex justify-between pb-1">
                          <span className="font-medium">Meter Number:</span>
                          <span>{customerInfo.meter_number}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <Form {...paymentForm}>
                  <form onSubmit={paymentForm.handleSubmit(onSubmitPayment)} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={paymentForm.control}
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
                        control={paymentForm.control}
                        name="amount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Amount</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="Enter amount"
                                {...field}
                                value={field.value || ''}
                                onChange={(e) => {
                                  field.onChange(Number(e.target.value) || undefined);
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="flex justify-end">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={fetchPreview}
                        disabled={isPreviewing}
                        className="w-full md:w-auto"
                      >
                        {isPreviewing ? 'Loading...' : 'Preview Payment'}
                      </Button>
                    </div>

                    {showPreview && previewData && (
                      <Card className="bg-gray-50 shadow-sm">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base">Payment Preview</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="grid grid-cols-1 gap-2 text-sm">
                            <div className="flex justify-between border-b pb-1">
                              <span className="font-medium">Customer Name:</span>
                              <span>{previewData.result.customer_name}</span>
                            </div>

                            <div className="flex justify-between border-b pb-1">
                              <span className="font-medium">Meter Number:</span>
                              <span>{previewData.result.meter_number}</span>
                            </div>

                            <div className="flex justify-between border-b pb-1">
                              <span className="font-medium">Amount Paying:</span>
                              <span>{previewData.result.total_paid} {previewData.result.currency}</span>
                            </div>

                            <div className="flex justify-between border-b pb-1">
                              <span className="font-medium">Units:</span>
                              <span>{previewData.result.total_unit} {previewData.result.unit}</span>
                            </div>

                            <div className="flex justify-between pb-1">
                              <span className="font-medium">Price per Unit:</span>
                              <span>{previewData.result.price} {previewData.result.currency}</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    <div className="flex flex-col sm:flex-row justify-between gap-2 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleBackToValidation}
                        className="order-2 sm:order-1"
                      >
                        Back to Validation
                      </Button>

                      <div className="flex flex-col sm:flex-row gap-2 order-1 sm:order-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setPaymentModalOpen(false)}
                          className="w-full sm:w-auto"
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          disabled={isSubmitting || !showPreview}
                          className="w-full sm:w-auto"
                        >
                          {isSubmitting ? 'Processing...' : 'Confirm Payment'}
                        </Button>
                      </div>
                    </div>
                  </form>
                </Form>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>View Utility Payments by Meter Number</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <Input
              placeholder="Enter meter number"
              value={meterNumber}
              onChange={(e) => setMeterNumber(e.target.value)}
              className="flex-grow"
            />
            <Button
              onClick={fetchPayments}
              disabled={isFetching}
              className="w-full sm:w-auto"
            >
              {isFetching ? 'Fetching...' : 'Fetch Payments'}
            </Button>
          </div>

          {payments.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-2 text-left">Token</th>
                    <th className="p-2 text-left">Reason At Telecom</th>
                    <th className="p-2 text-left">Phone</th>
                    <th className="p-2 text-left">Amount</th>
                    <th className="p-2 text-left">Status</th>
                    <th className="p-2 text-left">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5).map((payment) => (
                    <tr key={payment.id} className="border-t">
                      <td className="p-2">{payment.token}</td>
                      <td className="p-2">{payment.reasonAtTelecom}</td>
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