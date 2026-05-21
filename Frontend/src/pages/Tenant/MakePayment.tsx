import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CreditCard, DollarSign, Calendar, AlertCircle, CheckCircle2,
  Smartphone, Wallet, Building2, User, Clock, ShieldCheck, Lock,
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import axios from 'axios';
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

const inputCls =
  'w-full rounded-xl border border-[#E2E8F0] bg-white py-3 px-4 text-sm text-[#0F172A] placeholder:text-[#94A3B8] outline-none transition-all focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/15';
const inputWithIconCls = 'pl-10 ' + inputCls;

const FieldLabel = ({ children }: { children: React.ReactNode }) => (
  <label className="block text-sm font-medium text-[#0F172A] mb-1.5">{children}</label>
);

const methods = [
  { id: 'card', label: 'Card', icon: CreditCard, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', activeBg: 'bg-blue-600' },
  { id: 'cash', label: 'Cash', icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', activeBg: 'bg-emerald-600' },
  { id: 'mobile_money', label: 'Mobile Money', icon: Smartphone, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', activeBg: 'bg-amber-600' },
  { id: 'bank_transfer', label: 'Bank Transfer', icon: Wallet, color: 'text-violet-600', bg: 'bg-violet-50', border: 'border-violet-200', activeBg: 'bg-violet-600' },
] as const;

const MakePayment = () => {
  const { toast } = useToast();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const initialMethod = searchParams.get('method') || 'card';
  const formatCurrency = useCurrencyFormatter();

  const [paymentMethod, setPaymentMethod] = useState(initialMethod);
  const [paymentAmount, setPaymentAmount] = useState('1200');
  const [tenantData, setTenantData] = useState<PropertyTenant | null>(null);

  const [vendor, setVendor] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [description, setDescription] = useState('');
  const [provider, setProvider] = useState('mtn');

  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');

  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const user = localStorage.getItem('user');
  if (!user) throw new Error('No user found in localStorage');
  const userData = JSON.parse(user);
  const token = userData.token;
  const apiUrl = import.meta.env.VITE_API_BASE_URL;

  useEffect(() => {
    setPaymentMethod(initialMethod);
  }, [initialMethod]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data } = await axios.get(`${apiUrl}/GetPaymentsByTenantId/${userData.id}`, {
          headers: { Authorization: 'Bearer ' + token },
        });
        if (data.length > 0) {
          const tenant = data[0].propertyTenant;
          setTenantData({
            id: tenant.id,
            fullName: tenant.fullName,
            property: { id: tenant.property.id, name: tenant.property.name, address: tenant.property.address, price: tenant.property.price, currency: tenant.property.currency },
            balanceDue: tenant.balanceDue,
            arrears: tenant.arrears,
            nextPaymentDate: tenant.nextPaymentDate,
            dateMovedIn: tenant.dateMovedIn,
          });
          setPaymentAmount(tenant.property.price.toString());
        }
      } catch {
        toast({ title: "Error", description: "Failed to fetch payment data", variant: "destructive" });
      }
    };
    fetchData();
  }, []);

  const resetFormFields = () => {
    setCardNumber(''); setCardName(''); setExpiryDate(''); setCvv('');
    setVendor(''); setTransactionId(''); setDescription('');
    setBankName(''); setAccountNumber('');
  };

  const handleSuccess = (amount: string) => {
    toast({ title: "Payment Successful", description: `Payment of ${formatCurrency(Number(amount))} processed.` });
    resetFormFields();
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3500);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => { setIsLoading(false); handleSuccess(paymentAmount); }, 2000);
  };

  const handleSubmitMobileMoney = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await axios.post(`${apiUrl}/MakeTenantPayment`, {
        amount: parseFloat(paymentAmount),
        paymentDate: new Date().toISOString(),
        paymentMethod: 'MOMO',
        vendor,
        paymentType: 'MOMO',
        transactionId,
        description,
        propertyTenantId: userData.id || 0,
      }, { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } });
      handleSuccess(paymentAmount);
    } catch {
      toast({ title: "Payment Failed", description: "There was an issue processing your mobile money payment.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const activeMethod = methods.find(m => m.id === paymentMethod) ?? methods[0];

  const AmountField = ({ id }: { id: string }) => (
    <div>
      <FieldLabel>Amount to Pay</FieldLabel>
      <div className="relative">
        <DollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
        <input id={id} type="number" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)}
          className={inputWithIconCls} required />
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Hero banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0F172A] via-[#0C4A6E] to-[#1D4ED8] p-7 text-white shadow-xl">
        <div className="relative z-10 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 border border-white/20 px-3 py-1 text-xs font-semibold text-blue-200 uppercase tracking-wider">
              <ShieldCheck className="h-3 w-3" /> Secure Checkout
            </span>
            <h1 className="mt-3 text-2xl font-bold tracking-tight">Make a Payment</h1>
            <p className="mt-1 text-sm text-blue-100">Pay rent using card, mobile money, bank transfer, or record a cash transaction.</p>
          </div>
          {tenantData && (
            <div className="mt-4 sm:mt-0 rounded-2xl bg-white/10 border border-white/20 px-5 py-4 text-right">
              <p className="text-xs text-blue-200 mb-0.5">Total Due</p>
              <p className="text-2xl font-bold">{tenantData.property.currency} {tenantData.balanceDue.toLocaleString()}</p>
              <p className="text-xs text-blue-300 mt-0.5">Next: {new Date(tenantData.nextPaymentDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left — form panel */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          {/* Panel header */}
          <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50 px-6 py-4">
            <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${activeMethod.activeBg}`}>
              <activeMethod.icon className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">Payment Information</p>
              <p className="text-xs text-slate-400">Enter your payment details below</p>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Method selector */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {methods.map(m => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setPaymentMethod(m.id)}
                  className={`flex flex-col items-center gap-2 rounded-xl border-2 py-4 px-2 text-xs font-semibold transition-all ${
                    paymentMethod === m.id
                      ? `${m.border} ${m.bg} ${m.color} shadow-sm`
                      : 'border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <m.icon className={`h-5 w-5 ${paymentMethod === m.id ? m.color : 'text-slate-400'}`} />
                  {m.label}
                </button>
              ))}
            </div>

            {/* Form content */}
            <AnimatePresence mode="wait">
              {showSuccess ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center py-14 text-center"
                >
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100 mb-5">
                    <CheckCircle2 className="h-10 w-10 text-green-600" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">Payment Successful!</h3>
                  <p className="text-slate-500 text-sm">Your payment of {formatCurrency(Number(paymentAmount))} has been processed.</p>
                  <p className="text-slate-400 text-xs mt-1">A receipt has been sent to your email.</p>
                </motion.div>
              ) : (
                <motion.div key={paymentMethod} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>

                  {/* Card form */}
                  {paymentMethod === 'card' && (
                    <form onSubmit={handleSubmit} className="space-y-5">
                      <AmountField id="card-amount" />

                      {/* Visual card preview */}
                      <div className="rounded-2xl bg-gradient-to-br from-[#1D4ED8] to-[#0F172A] p-5 text-white shadow-lg">
                        <div className="flex items-center justify-between mb-6">
                          <div className="flex gap-1">
                            <div className="h-6 w-10 rounded bg-amber-400/80" />
                            <div className="h-6 w-10 rounded bg-amber-500/50 -ml-4" />
                          </div>
                          <Lock className="h-4 w-4 text-white/50" />
                        </div>
                        <p className="font-mono text-lg tracking-widest mb-4">
                          {cardNumber ? cardNumber.replace(/(.{4})/g, '$1 ').trim() : '•••• •••• •••• ••••'}
                        </p>
                        <div className="flex justify-between text-xs text-blue-200">
                          <span>{cardName || 'CARD HOLDER'}</span>
                          <span>{expiryDate || 'MM/YY'}</span>
                        </div>
                      </div>

                      <div>
                        <FieldLabel>Card Number</FieldLabel>
                        <input type="text" placeholder="1234 5678 9012 3456" value={cardNumber}
                          onChange={e => setCardNumber(e.target.value)} maxLength={19}
                          className={`${inputCls} font-mono tracking-wider`} required />
                      </div>

                      <div>
                        <FieldLabel>Name on Card</FieldLabel>
                        <input type="text" placeholder="John Doe" value={cardName}
                          onChange={e => setCardName(e.target.value)}
                          className={inputCls} required />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <FieldLabel>Expiry Date</FieldLabel>
                          <input type="text" placeholder="MM/YY" value={expiryDate}
                            onChange={e => setExpiryDate(e.target.value)}
                            className={inputCls} required />
                        </div>
                        <div>
                          <FieldLabel>CVV</FieldLabel>
                          <div className="relative">
                            <input type="password" placeholder="•••" value={cvv}
                              onChange={e => setCvv(e.target.value)} maxLength={4}
                              className={`${inputCls} font-mono`} required />
                          </div>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                        <p className="flex items-center gap-1.5 text-xs text-slate-400">
                          <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" /> Secured with 256-bit SSL
                        </p>
                        <button type="submit" disabled={isLoading}
                          className="flex items-center gap-2 rounded-xl bg-[#1D4ED8] px-6 py-3 text-sm font-semibold text-white hover:bg-[#1e40af] transition-colors disabled:opacity-60">
                          {isLoading ? <><div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> Processing…</> : <><CreditCard className="h-4 w-4" /> Pay Now</>}
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Cash form */}
                  {paymentMethod === 'cash' && (
                    <CashTransactions propertyName={tenantData?.property?.name || 'Property'} />
                  )}

                  {/* Mobile money form */}
                  {paymentMethod === 'mobile_money' && (
                    <form onSubmit={handleSubmitMobileMoney} className="space-y-5">
                      <AmountField id="momo-amount" />

                      <div>
                        <FieldLabel>Mobile Money Provider</FieldLabel>
                        <Select value={provider} onValueChange={setProvider}>
                          <SelectTrigger className="h-12 rounded-xl border-[#E2E8F0] text-sm">
                            <SelectValue placeholder="Select provider" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="mtn">MTN Mobile Money</SelectItem>
                            <SelectItem value="airtel">Airtel Money</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <FieldLabel>Vendor</FieldLabel>
                        <input type="text" placeholder="Vendor name" value={vendor}
                          onChange={e => setVendor(e.target.value)} className={inputCls} required />
                      </div>

                      <div>
                        <FieldLabel>Transaction ID</FieldLabel>
                        <input type="text" placeholder="e.g. MOMO123456" value={transactionId}
                          onChange={e => setTransactionId(e.target.value)} className={`${inputCls} font-mono`} required />
                      </div>

                      <div>
                        <FieldLabel>Description <span className="text-slate-400 font-normal">(optional)</span></FieldLabel>
                        <input type="text" placeholder="e.g. Rent for May" value={description}
                          onChange={e => setDescription(e.target.value)} className={inputCls} />
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                        <p className="flex items-center gap-1.5 text-xs text-slate-400">
                          <AlertCircle className="h-3.5 w-3.5 text-amber-500" /> Confirmation sent on success
                        </p>
                        <button type="submit" disabled={isLoading}
                          className="flex items-center gap-2 rounded-xl bg-amber-500 px-6 py-3 text-sm font-semibold text-white hover:bg-amber-600 transition-colors disabled:opacity-60">
                          {isLoading ? <><div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> Processing…</> : <><Smartphone className="h-4 w-4" /> Proceed</>}
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Bank transfer form */}
                  {paymentMethod === 'bank_transfer' && (
                    <form onSubmit={handleSubmit} className="space-y-5">
                      <AmountField id="bank-amount" />

                      <div>
                        <FieldLabel>Bank Name</FieldLabel>
                        <input type="text" placeholder="Your Bank Name" value={bankName}
                          onChange={e => setBankName(e.target.value)} className={inputCls} required />
                      </div>

                      <div>
                        <FieldLabel>Account Number</FieldLabel>
                        <input type="text" placeholder="Your Account Number" value={accountNumber}
                          onChange={e => setAccountNumber(e.target.value)} className={`${inputCls} font-mono`} required />
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                        <p className="flex items-center gap-1.5 text-xs text-slate-400">
                          <AlertCircle className="h-3.5 w-3.5 text-amber-500" /> Complete transfer within 24 hours
                        </p>
                        <button type="submit" disabled={isLoading}
                          className="flex items-center gap-2 rounded-xl bg-violet-600 px-6 py-3 text-sm font-semibold text-white hover:bg-violet-700 transition-colors disabled:opacity-60">
                          {isLoading ? <><div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> Processing…</> : <><Wallet className="h-4 w-4" /> Complete Transfer</>}
                        </button>
                      </div>
                    </form>
                  )}

                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Right — summary */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50 px-5 py-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1D4ED8]">
                <CreditCard className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">Payment Summary</p>
                <p className="text-xs text-slate-400">Details of your current payment</p>
              </div>
            </div>

            <div className="p-5 space-y-4">
              {tenantData ? (
                <>
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 shrink-0">
                      <Building2 className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Property</p>
                      <p className="text-sm font-semibold text-slate-900">{tenantData.property.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{tenantData.property.address}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 shrink-0">
                      <User className="h-4 w-4 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Tenant</p>
                      <p className="text-sm font-semibold text-slate-900">{tenantData.fullName}</p>
                      <p className="text-xs text-slate-500 mt-0.5">Since {new Date(tenantData.dateMovedIn).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 shrink-0">
                      <Clock className="h-4 w-4 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Next Due</p>
                      <p className="text-sm font-semibold text-slate-900">{new Date(tenantData.nextPaymentDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-2.5">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Monthly Rent</span>
                      <span className="font-medium text-slate-800">{tenantData.property.currency} {tenantData.property.price.toLocaleString()}</span>
                    </div>
                    {tenantData.arrears > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="flex items-center gap-1 text-red-500"><AlertCircle className="h-3.5 w-3.5" /> Arrears</span>
                        <span className="font-medium text-red-600">{tenantData.property.currency} {tenantData.arrears.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm font-bold border-t border-slate-200 pt-2.5">
                      <span className="text-slate-900">Total Due</span>
                      <span className="text-[#1D4ED8]">{tenantData.property.currency} {tenantData.balanceDue.toLocaleString()}</span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center py-8 text-sm text-slate-400">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600 mr-2" />
                  Loading details…
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 border-t border-slate-100 bg-amber-50 px-5 py-3">
              <AlertCircle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
              <p className="text-xs text-amber-700">Payments are due on the 1st of each month.</p>
            </div>
          </div>

          {/* Security note */}
          <div className="flex items-center gap-3 rounded-2xl border border-green-100 bg-green-50 px-4 py-3">
            <ShieldCheck className="h-4 w-4 text-green-600 shrink-0" />
            <p className="text-xs text-green-700">All transactions are encrypted and secured.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MakePayment;
