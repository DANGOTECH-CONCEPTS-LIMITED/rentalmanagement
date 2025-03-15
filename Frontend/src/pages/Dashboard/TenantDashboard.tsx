
import React from 'react';
import { motion } from 'framer-motion';
import { Home, Calendar, DollarSign, FileText } from 'lucide-react';
import StatCard from '../../components/common/StatCard';

const TenantDashboard = () => {
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
          value="$1,200"
          icon={<DollarSign />}
        />
        <StatCard
          title="Documents"
          value="5"
          icon={<FileText />}
        />
      </div>

      {/* Add more sections for rent history, maintenance requests, etc. */}
    </div>
  );
};

export default TenantDashboard;
