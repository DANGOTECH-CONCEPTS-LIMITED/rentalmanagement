import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ToastAction } from '@/components/ui/toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';

const paymentFormSchema = z.object({
  amount: z.number().min(1, "Amount must be greater than 0"),
  paymentDate: z.date(),
  paymentMethod: z.string().min(1, "Payment method is required"),
  vendor: z.string().min(1, "Vendor is required"),
  transactionId: z.string().min(1, "Transaction ID is required"),
  propertyTenantId: z.number().min(1, "Tenant ID is required"),
  description: z.string().optional(),
});

interface CashTransactionProps {
  propertyName: string;
}

type PaymentFormValues = z.infer<typeof paymentFormSchema>;

const CashTransactions = ({ propertyName }: CashTransactionProps) => {
  const { toast } = useToast();
  const [tenant, setTenant] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: {
      amount: 0,
      paymentDate: new Date(),
      paymentMethod: "CASH",
      vendor: propertyName,
      transactionId: "",
      propertyTenantId: 0,
      description: "",
    },
  });

  const user = localStorage.getItem('user');
  if (!user) {
    throw new Error('No user found in localStorage');
  }

  const userData = JSON.parse(user);

  const getUserToken = () => {
    try {
      const user = localStorage.getItem('user');
      if (!user) throw new Error('No user found in localStorage');
      const userData = JSON.parse(user);
      return userData.token;
    } catch (error) {
      console.error('Error getting user token:', error);
      return null;
    }
  };

  const token = getUserToken();
  const apiUrl = import.meta.env.VITE_API_BASE_URL;

  useEffect(() => {
    const fetchTenantData = async () => {
      try {
        if (!token) throw new Error('No authentication token found');

        const user = localStorage.getItem('user');
        if (!user) throw new Error('No user found in localStorage');

        const userData = JSON.parse(user);
        const response = await fetch(`${apiUrl}/GetTenantById/${userData.id}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'accept': '*/*'
          }
        });

        if (!response.ok) throw new Error(`API request failed with status ${response.status}`);

        const data = await response.json();
        setTenant(data);
        form.setValue('propertyTenantId', data.id);
      } catch (err: any) {
        console.error('Failed to fetch tenant data:', err);
        setError(err.message);
      }
    };

    fetchTenantData();
  }, [token, apiUrl, form]);

  const onSubmit = async (data: PaymentFormValues) => {
    setIsSubmitting(true);
    try {
      if (!token) throw new Error('No authentication token found');

      const response = await fetch(`${apiUrl}/MakeTenantPayment`, {
        method: 'POST',
        headers: {
          'accept': '*/*',
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          paymentDate: data.paymentDate.toISOString(),
        }),
      });

      if (!response.ok) throw new Error('Payment failed');

      toast({
        title: "Payment Successful",
        description: "Your payment has been processed successfully.",
      });

      form.reset();
      if (tenant) {
        form.setValue('propertyTenantId', tenant.id);
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Payment Failed",
        description: error.message || "There was an error processing your payment.",
        action: <ToastAction altText="Try again">Try again</ToastAction>,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Cash Transactions</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Cash Transactions</h1>
          <p className="text-muted-foreground">
            {tenant ? `Recording payment for ${tenant.fullName}` : 'Record and manage tenant payments'}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Record New Payment</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="paymentDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Payment Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="paymentMethod"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Method</FormLabel>
                      <Select disabled defaultValue="CASH">
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Cash" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="CASH">Cash</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="vendor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vendor</FormLabel>
                      <FormControl>
                        <Input {...field} disabled />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="transactionId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Receipt No.</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="propertyTenantId"
                  render={({ field }) => (
                    <FormItem className="hidden">
                      <FormControl>
                        <Input type="hidden" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    form.reset();
                    if (tenant) {
                      form.setValue('propertyTenantId', tenant.id);
                    }
                    form.setValue('paymentMethod', 'CASH');
                    form.setValue('vendor', propertyName);
                  }}
                >
                  Clear Form
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    "Submit Payment"
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CashTransactions;
