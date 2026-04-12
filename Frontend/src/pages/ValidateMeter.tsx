import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

interface CustomerInfo {
  customer_name: string;
  customer_number: string;
  meter_number: string;
}

const MeterValidation = () => {
  const [meterNumber, setMeterNumber] = useState('');
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const { toast } = useToast();

  const apiUrl = import.meta.env.VITE_API_BASE_URL;

  const handleValidate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCustomerInfo(null);

    if (!meterNumber) {
      toast({
        variant: 'destructive',
        title: 'Validation Failed',
        description: 'Please enter a meter number.',
      });
      return;
    }

    try {
      const response = await fetch(`${apiUrl}/ValidateMeter`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: '*/*',
        },
        body: JSON.stringify({ meterNumber }),
      });

      const data = await response.json();

      if (data.result_code === 0 && Array.isArray(data.result) && data.result.length > 0) {
        setCustomerInfo(data.result[0]);

        toast({
          title: 'Validation Successful',
          description: 'Customer information found.',
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Validation Failed',
          description: data.reason || 'No customer found.',
        });
      }
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not validate meter number. Please try again.',
      });
    }
  };

  return (
    <div className="space-y-8">
      <section className="page-hero max-w-4xl">
        <div className="space-y-3">
          <span className="inline-flex w-fit items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Utility Validation
          </span>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Validate Customer Meter</h1>
            <p className="mt-2 text-sm text-muted-foreground md:text-base">
              Confirm a customer account before starting a utility payment or support request.
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(280px,0.9fr)] max-w-5xl">
        <Card className="form-shell border-none shadow-none">
          <CardHeader>
            <CardTitle>Meter lookup</CardTitle>
            <CardDescription>Enter the exact meter number to pull the registered customer details.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleValidate} className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Meter Number</label>
                <Input
                  value={meterNumber}
                  onChange={(e) => setMeterNumber(e.target.value)}
                  placeholder="Enter meter number"
                />
              </div>
              <Button type="submit" className="w-full sm:w-auto">
                Validate Meter
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="data-surface border-none shadow-none">
          <CardHeader>
            <CardTitle>What this checks</CardTitle>
            <CardDescription>The verification confirms the account linked to the supplied meter.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>Use this before collecting payment to reduce failed transactions caused by mistyped meter numbers.</p>
            <p>You’ll receive the customer name, customer number, and meter number when the validation succeeds.</p>
          </CardContent>
        </Card>
      </div>

      {customerInfo && (
        <Card className="data-surface max-w-5xl border-none shadow-none">
          <CardHeader>
            <CardTitle>Customer Details</CardTitle>
            <CardDescription>The meter has been validated successfully.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 text-sm md:grid-cols-3">
            <div className="rounded-2xl bg-white/80 p-4 shadow-sm ring-1 ring-slate-200/70">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Name</p>
              <p className="mt-2 text-base font-semibold text-slate-900">{customerInfo.customer_name}</p>
            </div>
            <div className="rounded-2xl bg-white/80 p-4 shadow-sm ring-1 ring-slate-200/70">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Customer Number</p>
              <p className="mt-2 text-base font-semibold text-slate-900">{customerInfo.customer_number}</p>
            </div>
            <div className="rounded-2xl bg-white/80 p-4 shadow-sm ring-1 ring-slate-200/70">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Meter Number</p>
              <p className="mt-2 text-base font-semibold text-slate-900">{customerInfo.meter_number}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default MeterValidation;
