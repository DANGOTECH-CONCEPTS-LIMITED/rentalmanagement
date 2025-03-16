import React from 'react';
import { motion } from 'framer-motion';
import { Home, Users, DollarSign, TrendingUp } from 'lucide-react';
import StatCard from '../../components/common/StatCard';
import { useCurrencyFormatter } from '@/hooks/use-currency-formatter';

const LandlordDashboard = () => {
  const formatCurrency = useCurrencyFormatter();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-xl md:text-2xl font-semibold tracking-tight">Landlord Dashboard</h1>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <StatCard
          title="Total Properties"
          value="5"
          icon={<Home className="h-5 w-5 md:h-6 md:w-6" />}
          change={{ value: 1, type: "increase" }}
        />
        <StatCard
          title="Total Tenants"
          value="12"
          icon={<Users className="h-5 w-5 md:h-6 md:w-6" />}
          change={{ value: 2, type: "increase" }}
        />
        <StatCard
          title="Monthly Revenue"
          value={formatCurrency(15000)}
          icon={<DollarSign className="h-5 w-5 md:h-6 md:w-6" />}
          change={{ value: 8, type: "increase" }}
        />
        <StatCard
          title="Occupancy Rate"
          value="95%"
          icon={<TrendingUp className="h-5 w-5 md:h-6 md:w-6" />}
          change={{ value: 5, type: "increase" }}
        />
      </div>
    </div>
  );
};

export default LandlordDashboard;