
import React from 'react';
import { motion } from 'framer-motion';
import { Home, Users, DollarSign, TrendingUp } from 'lucide-react';
import StatCard from '../../components/common/StatCard';

const LandlordDashboard = () => {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Landlord Dashboard</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Properties"
          value="5"
          icon={<Home />}
          change={{ value: 1, type: "increase" }}
        />
        <StatCard
          title="Total Tenants"
          value="12"
          icon={<Users />}
          change={{ value: 2, type: "increase" }}
        />
        <StatCard
          title="Monthly Revenue"
          value="$15,000"
          icon={<DollarSign />}
          change={{ value: 8, type: "increase" }}
        />
        <StatCard
          title="Occupancy Rate"
          value="95%"
          icon={<TrendingUp />}
          change={{ value: 5, type: "increase" }}
        />
      </div>

      {/* Add more sections for property list, tenant list, etc. */}
    </div>
  );
};

export default LandlordDashboard;
