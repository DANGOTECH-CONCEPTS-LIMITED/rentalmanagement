import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

const MeterValidation = () => {
  const [meterNumber, setMeterNumber] = useState('');
  const [customerInfo, setCustomerInfo] = useState(null);
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
    <div className="container mx-auto p-4 w-[40%]">
      <h1 className="text-2xl font-bold mb-4">Validate Customer</h1>
      <form onSubmit={handleValidate} className="space-y-4">
        <div>
          <label className="block mb-1 font-medium">Meter Number</label>
          <Input
            value={meterNumber}
            onChange={(e) => setMeterNumber(e.target.value)}
            placeholder="Enter meter number"
          />
        </div>
        <Button type="submit" className="w-full">
          Validate
        </Button>
      </form>

      {customerInfo && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Customer Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><strong>Name:</strong> {customerInfo.customer_name}</p>
            <p><strong>Customer Number:</strong> {customerInfo.customer_number}</p>
            <p><strong>Meter Number:</strong> {customerInfo.meter_number}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default MeterValidation;
