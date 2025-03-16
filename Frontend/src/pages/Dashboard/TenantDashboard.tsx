
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Home, Calendar, DollarSign, FileText, CreditCard, Smartphone, Wallet } from 'lucide-react';
import StatCard from '../../components/common/StatCard';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCurrencyFormatter } from '@/hooks/use-currency-formatter';

const TenantDashboard = () => {
  const navigate = useNavigate();
  const formatCurrency = useCurrencyFormatter();
  
  const handlePaymentMethodSelect = (method: string) => {
    navigate(`/tenant-dashboard/make-payment?method=${method}`);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Tenant Dashboard</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Current Property"
          value="1"
          icon={<Home />}
        />
        <StatCard
          title="Next Payment"
          value="15 Days"
          icon={<Calendar />}
        />
        <StatCard
          title="Monthly Rent"
          value={formatCurrency(1200)}
          icon={<DollarSign />}
        />
        <StatCard
          title="Documents"
          value="5"
          icon={<FileText />}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Make a Payment</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p className="text-muted-foreground mb-4">Choose a payment method:</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button 
                variant="outline" 
                className="h-auto py-6 flex flex-col items-center gap-2"
                onClick={() => handlePaymentMethodSelect('card')}
              >
                <CreditCard className="h-10 w-10 text-primary" />
                <span>Credit/Debit Card</span>
              </Button>
              
              <Button 
                variant="outline" 
                className="h-auto py-6 flex flex-col items-center gap-2"
                onClick={() => handlePaymentMethodSelect('mobile_money')}
              >
                <Smartphone className="h-10 w-10 text-primary" />
                <span>Mobile Money</span>
              </Button>
              
              <Button 
                variant="outline" 
                className="h-auto py-6 flex flex-col items-center gap-2"
                onClick={() => handlePaymentMethodSelect('bank_transfer')}
              >
                <Wallet className="h-10 w-10 text-primary" />
                <span>Bank Transfer</span>
              </Button>
            </div>
            
            <div className="mt-6 flex justify-end">
              <Button
                onClick={() => navigate('/tenant-dashboard/payment-history')}
                variant="link"
              >
                View Payment History
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TenantDashboard;
