import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CreditCard, DollarSign, Calendar, AlertCircle, CheckCircle2, Smartphone, Wallet } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import axios from 'axios';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'react-router-dom';
import { useCurrencyFormatter } from '@/hooks/use-currency-formatter';
import CashTransactions from './CashTransaction';

interface PropertyTenant {
  id: number;
  fullName: string;
  property: {
    id: number;
    name: string;
    address: string;
    price: number;
    currency: string;
  };
  balanceDue: number;
  arrears: number;
  nextPaymentDate: string;
  dateMovedIn: string;
}

interface Payment {
  id: number;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  paymentType: string;
  paymentStatus: string;
  transactionId: string;
  description: string | null;
}


const MakePayment = () => {
  const { toast } = useToast();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const initialMethod = searchParams.get('method') || 'card';

  const [paymentMethod, setPaymentMethod] = useState(initialMethod);
  const [paymentAmount, setPaymentAmount] = useState('1200');
  const formatCurrency = useCurrencyFormatter();
  const [tenantData, setTenantData] = useState<PropertyTenant | null>(null);
  const [paymentHistory, setPaymentHistory] = useState<Payment[]>([]);

  console.log("tenantData", tenantData);



  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');

  const [phoneNumber, setPhoneNumber] = useState('');
  const [provider, setProvider] = useState('mtn');

  const [accountNumber, setAccountNumber] = useState('');
  const [bankName, setBankName] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const paymentDetails = {
    propertyName: 'Sunset Apartments',
    propertyAddress: '123 Main Street, Apt 4B, Cityville',
    dueDate: '2023-05-15',
    rentAmount: 1200,
    lateFee: 50,
    totalDue: 1200,
  };

  const user = localStorage.getItem('user');
  if (!user) throw new Error('No user found in localStorage');

  const userData = JSON.parse(user);
  const token = userData.token;
  const apiUrl = import.meta.env.VITE_API_BASE_URL;

  useEffect(() => {
    if (initialMethod) {
      setPaymentMethod(initialMethod);
    }
  }, [initialMethod]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const paymentResponse = await axios.get(`${apiUrl}/GetPaymentsByTenantId/${userData.id}`, {
          headers: {
            'Authorization': 'Bearer ' + token,
          }
        });

        setPaymentHistory(paymentResponse.data);

        if (paymentResponse.data.length > 0) {
          const tenant = paymentResponse.data[0].propertyTenant;
          setTenantData({
            id: tenant.id,
            fullName: tenant.fullName,
            property: {
              id: tenant.property.id,
              name: tenant.property.name,
              address: tenant.property.address,
              price: tenant.property.price,
              currency: tenant.property.currency
            },
            balanceDue: tenant.balanceDue,
            arrears: tenant.arrears,
            nextPaymentDate: tenant.nextPaymentDate,
            dateMovedIn: tenant.dateMovedIn
          });

          setPaymentAmount(tenant.property.price.toString());
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        toast({
          title: "Error",
          description: "Failed to fetch payment data",
          variant: "destructive",
        });
      }
    };

    fetchData();
  }, [toast]);


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      setShowSuccess(true);

      toast({
        title: "Payment Successful",
        description: `Your payment of ${formatCurrency(Number(paymentAmount))} has been processed successfully.`,
        variant: "default",
      });

      setTimeout(() => {
        setShowSuccess(false);
        resetFormFields();
      }, 3000);
    }, 2000);
  };

  const resetFormFields = () => {
    // Reset all form fields
    setCardNumber('');
    setCardName('');
    setExpiryDate('');
    setCvv('');
    setPhoneNumber('');
    setBankName('');
    setAccountNumber('');
  };

  return (
    <div className="space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/tenant-dashboard">Dashboard</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Make Payment</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Make a Payment</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center">
              {paymentMethod === 'card' && <CreditCard className="mr-2 h-5 w-5" />}
              {paymentMethod === 'cash' && <DollarSign className="mr-2 h-5 w-5" />}
              {paymentMethod === 'mobile_money' && <Smartphone className="mr-2 h-5 w-5" />}
              {paymentMethod === 'bank_transfer' && <Wallet className="mr-2 h-5 w-5" />}
              Payment Information
            </CardTitle>
            <CardDescription>Enter your payment details below</CardDescription>
          </CardHeader>
          <CardContent>
            {showSuccess ? (
              <div className="flex flex-col items-center justify-center py-10">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.3 }}
                  className="bg-green-100 text-green-700 rounded-full p-4 mb-4"
                >
                  <CheckCircle2 className="h-10 w-10" />
                </motion.div>
                <h3 className="text-xl font-semibold mb-2">Payment Successful!</h3>
                <p className="text-gray-600 mb-4">Your payment of {formatCurrency(Number(paymentAmount))} has been processed.</p>
                <p className="text-gray-500 text-sm">A receipt has been sent to your email.</p>
              </div>
            ) : (
              <>
                <Tabs value={paymentMethod} onValueChange={setPaymentMethod} className="mb-6">
                  <TabsList className="grid grid-cols-4 mb-6">
                    <TabsTrigger value="card" className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      <span>Card</span>
                    </TabsTrigger>
                    <TabsTrigger value="cash" className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      <span>Cash Transaction</span>
                    </TabsTrigger>
                    <TabsTrigger value="mobile_money" className="flex items-center gap-2">
                      <Smartphone className="h-4 w-4" />
                      <span>Mobile Money</span>
                    </TabsTrigger>
                    <TabsTrigger value="bank_transfer" className="flex items-center gap-2">
                      <Wallet className="h-4 w-4" />
                      <span>Bank Transfer</span>
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="card">
                    <form onSubmit={handleSubmit} className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-sm font-medium" htmlFor="amount">
                          Amount to Pay
                        </label>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                          <Input
                            id="amount"
                            className="pl-10"
                            type="text"
                            value={paymentAmount}
                            onChange={(e) => setPaymentAmount(e.target.value)}
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium" htmlFor="cardNumber">
                          Card Number
                        </label>
                        <Input
                          id="cardNumber"
                          type="text"
                          placeholder="1234 5678 9012 3456"
                          value={cardNumber}
                          onChange={(e) => setCardNumber(e.target.value)}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium" htmlFor="cardName">
                          Name on Card
                        </label>
                        <Input
                          id="cardName"
                          type="text"
                          placeholder="John Doe"
                          value={cardName}
                          onChange={(e) => setCardName(e.target.value)}
                          required
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium" htmlFor="expiryDate">
                            Expiry Date
                          </label>
                          <Input
                            id="expiryDate"
                            type="text"
                            placeholder="MM/YY"
                            value={expiryDate}
                            onChange={(e) => setExpiryDate(e.target.value)}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium" htmlFor="cvv">
                            CVV
                          </label>
                          <Input
                            id="cvv"
                            type="text"
                            placeholder="123"
                            value={cvv}
                            onChange={(e) => setCvv(e.target.value)}
                            required
                          />
                        </div>
                      </div>

                      <div className="pt-4">
                        <Button type="submit" className="w-full" disabled={isLoading}>
                          {isLoading ? "Processing..." : "Pay Now"}
                        </Button>
                      </div>
                    </form>
                  </TabsContent>

                  <TabsContent value="cash">
                    <CashTransactions propertyName={tenantData?.property?.name || "Property"}
                    />
                  </TabsContent>

                  <TabsContent value="mobile_money">
                    <form onSubmit={handleSubmit} className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-sm font-medium" htmlFor="mobile-amount">
                          Amount to Pay
                        </label>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                          <Input
                            id="mobile-amount"
                            className="pl-10"
                            type="text"
                            value={paymentAmount}
                            onChange={(e) => setPaymentAmount(e.target.value)}
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium" htmlFor="provider">
                          Mobile Money Provider
                        </label>
                        <select
                          id="provider"
                          className="flex w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          value={provider}
                          onChange={(e) => setProvider(e.target.value)}
                          required
                        >
                          <option value="mtn">MTN Mobile Money</option>
                          <option value="airtel">Airtel Money</option>
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium" htmlFor="phoneNumber">
                          Phone Number
                        </label>
                        <Input
                          id="phoneNumber"
                          type="tel"
                          placeholder="078XXXXXXX"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          required
                        />
                      </div>

                      <div className="pt-4">
                        <Button type="submit" className="w-full" disabled={isLoading}>
                          {isLoading ? "Processing..." : "Proceed to Payment"}
                        </Button>
                      </div>

                      <div className="text-sm text-muted-foreground mt-4">
                        <p className="flex items-center">
                          <AlertCircle className="mr-1 h-4 w-4 text-amber-500" />
                          You will receive a prompt on your phone to complete the payment.
                        </p>
                      </div>
                    </form>
                  </TabsContent>

                  <TabsContent value="bank_transfer">
                    <form onSubmit={handleSubmit} className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-sm font-medium" htmlFor="bank-amount">
                          Amount to Pay
                        </label>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                          <Input
                            id="bank-amount"
                            className="pl-10"
                            type="text"
                            value={paymentAmount}
                            onChange={(e) => setPaymentAmount(e.target.value)}
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium" htmlFor="bankName">
                          Bank Name
                        </label>
                        <Input
                          id="bankName"
                          type="text"
                          placeholder="Your Bank Name"
                          value={bankName}
                          onChange={(e) => setBankName(e.target.value)}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium" htmlFor="accountNumber">
                          Account Number
                        </label>
                        <Input
                          id="accountNumber"
                          type="text"
                          placeholder="Your Account Number"
                          value={accountNumber}
                          onChange={(e) => setAccountNumber(e.target.value)}
                          required
                        />
                      </div>

                      <div className="pt-4">
                        <Button type="submit" className="w-full" disabled={isLoading}>
                          {isLoading ? "Processing..." : "Complete Transfer"}
                        </Button>
                      </div>

                      <div className="text-sm text-muted-foreground mt-4">
                        <p className="flex items-center">
                          <AlertCircle className="mr-1 h-4 w-4 text-amber-500" />
                          Please complete the bank transfer within 24 hours.
                        </p>
                      </div>
                    </form>
                  </TabsContent>
                </Tabs>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <CreditCard className="mr-2 h-5 w-5" />
              Payment Summary
            </CardTitle>
            <CardDescription>Details of your current payment</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {tenantData ? (
                <>
                  <div>
                    <h3 className="font-medium text-sm text-gray-500 mb-1">Property</h3>
                    <p>{tenantData.property.name}</p>
                    <p className="text-sm text-gray-500">{tenantData.property.address}</p>
                  </div>

                  <div>
                    <h3 className="font-medium text-sm text-gray-500 mb-1">Tenant</h3>
                    <p>{tenantData.fullName}</p>
                    <p className="text-sm text-gray-500">
                      Since {new Date(tenantData.dateMovedIn).toLocaleDateString()}
                    </p>
                  </div>

                  <div>
                    <h3 className="font-medium text-sm text-gray-500 mb-1">Next Payment Due</h3>
                    <p className="flex items-center">
                      <Calendar className="mr-1 h-4 w-4" />
                      {new Date(tenantData.nextPaymentDate).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="border-t pt-4">
                    <div className="flex justify-between mb-2">
                      <span className="text-gray-600">Monthly Rent</span>
                      <span>{tenantData.property.currency} {tenantData.property.price}</span>
                    </div>

                    {tenantData.arrears > 0 && (
                      <div className="flex justify-between mb-2 text-red-600">
                        <span className="flex items-center">
                          <AlertCircle className="mr-1 h-4 w-4" />
                          Arrears
                        </span>
                        <span>{tenantData.property.currency} {tenantData.arrears}</span>
                      </div>
                    )}

                    <div className="flex justify-between font-semibold border-t pt-2 mt-2">
                      <span>Total Due</span>
                      <span>{tenantData.property.currency} {tenantData.balanceDue}</span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-4">
                  <p>Loading payment details...</p>
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter className="bg-gray-50 border-t rounded-b-lg">
            <div className="text-sm text-gray-500 w-full">
              <p className="flex items-center">
                <AlertCircle className="mr-1 h-4 w-4 text-amber-500" />
                Payments are due on the 1st of each month.
              </p>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default MakePayment;