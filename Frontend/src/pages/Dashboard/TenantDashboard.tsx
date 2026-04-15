import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Home,
  Calendar,
  DollarSign,
  FileText,
  CreditCard,
  Smartphone,
  Wallet,
} from "lucide-react";
import StatCard from "../../components/common/StatCard";
import DashboardExportToolbar from "@/components/common/DashboardExportToolbar";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCurrencyFormatter } from "@/hooks/use-currency-formatter";
import { toast } from "@/hooks/use-toast";
import axios from "axios";
import {
  exportDashboardPdf,
  exportDashboardWorkbook,
} from "@/lib/dashboard-export";

const TenantDashboard = () => {
  const navigate = useNavigate();
  const formatCurrency = useCurrencyFormatter();
  const dashboardRef = useRef<HTMLDivElement>(null);
  const [tenant, setTenant] = useState<any>([]);
  const user = localStorage.getItem("user");

  if (!user) throw new Error("No user found in localStorage");
  const userData = JSON.parse(user);

  const handlePaymentMethodSelect = (method: string) => {
    navigate(`/tenant-dashboard/make-payment?method=${method}`);
  };

  useEffect(() => {
    fetchTenant();
  }, []);

  const fetchTenant = async () => {
    const apiUrl = import.meta.env.VITE_API_BASE_URL;
    if (!apiUrl) {
      throw new Error("API base URL is not configured");
    }

    try {
      const { data } = await axios.get(
        `${apiUrl}/GetTenantById/${userData.id}`
      );

      setTenant(data);

      console.log("tenant", data);
    } catch (error) {
      toast({
        title: "Error",
        description:
          error.response.status === 404
            ? `Landlords ${error.response.statusText}`
            : error.response.data,
        variant: "destructive",
      });
    }
  };

  const handleExportPdf = async () => {
    if (!dashboardRef.current) {
      return;
    }

    try {
      await exportDashboardPdf(dashboardRef.current, {
        fileNamePrefix: "tenant-dashboard-overview",
      });

      toast({
        title: "Export Successful",
        description: "Dashboard exported to PDF.",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: error instanceof Error ? error.message : "Failed to export dashboard to PDF.",
        variant: "destructive",
      });
    }
  };

  const handleExportExcel = async () => {
    try {
      await exportDashboardWorkbook({
        title: "Tenant Dashboard",
        fileNamePrefix: "tenant-dashboard-overview",
        metadata: [
          { label: "Tenant Name", value: tenant?.fullName || userData?.fullName || "N/A" },
          { label: "Property Name", value: tenant?.property?.propertyName || tenant?.property?.name || "N/A" },
          { label: "Next Payment Date", value: tenant?.nextPaymentDate?.split("T")[0] || "N/A" },
        ],
        summary: [
          { label: "Current Property", value: 1 },
          { label: "Monthly Rent", value: tenant?.property?.price ?? 0 },
          { label: "Documents", value: 5 },
        ],
        sections: [
          {
            sheetName: "Tenant Details",
            columns: ["Field", "Value"],
            rows: [
              ["Tenant ID", tenant?.id || userData?.id || "N/A"],
              ["Name", tenant?.fullName || userData?.fullName || "N/A"],
              ["Email", tenant?.email || userData?.email || "N/A"],
              ["Phone", tenant?.phoneNumber || "N/A"],
              ["Property", tenant?.property?.propertyName || tenant?.property?.name || "N/A"],
              ["Monthly Rent", tenant?.property?.price ?? 0],
              ["Currency", tenant?.property?.currency || "N/A"],
              ["Next Payment Date", tenant?.nextPaymentDate?.split("T")[0] || "N/A"],
            ],
          },
          {
            sheetName: "Payment Methods",
            columns: ["Method", "Route"],
            rows: [
              ["Credit/Debit Card", "/tenant-dashboard/make-payment?method=card"],
              ["Mobile Money", "/tenant-dashboard/make-payment?method=mobile_money"],
              ["Bank Transfer", "/tenant-dashboard/make-payment?method=bank_transfer"],
            ],
          },
        ],
      });

      toast({
        title: "Export Successful",
        description: "Dashboard exported to Excel.",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: error instanceof Error ? error.message : "Failed to export dashboard to Excel.",
        variant: "destructive",
      });
    }
  };

  return (
    <div ref={dashboardRef} className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">
          Tenant Dashboard
        </h1>
        <DashboardExportToolbar
          onExportExcel={handleExportExcel}
          onExportPdf={handleExportPdf}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Current Property" value="1" icon={<Home />} />
        <StatCard
          title="Next Payment"
          value={tenant?.nextPaymentDate?.split("T")[0]}
          icon={<Calendar />}
        />
        <StatCard
          title="Monthly Rent"
          value={`${
            tenant?.property?.currency
          } ${tenant?.property?.price.toLocaleString()}`}
          icon={<DollarSign />}
        />
        <StatCard title="Documents" value="5" icon={<FileText />} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Make a Payment</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p className="text-muted-foreground mb-4">
              Choose a payment method:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button
                variant="outline"
                className="h-auto py-6 flex flex-col items-center gap-2"
                onClick={() => handlePaymentMethodSelect("card")}
              >
                <CreditCard className="h-10 w-10 text-primary" />
                <span>Credit/Debit Card</span>
              </Button>

              <Button
                variant="outline"
                className="h-auto py-6 flex flex-col items-center gap-2"
                onClick={() => handlePaymentMethodSelect("mobile_money")}
              >
                <Smartphone className="h-10 w-10 text-primary" />
                <span>Mobile Money</span>
              </Button>

              <Button
                variant="outline"
                className="h-auto py-6 flex flex-col items-center gap-2"
                onClick={() => handlePaymentMethodSelect("bank_transfer")}
              >
                <Wallet className="h-10 w-10 text-primary" />
                <span>Bank Transfer</span>
              </Button>
            </div>

            <div className="mt-6 flex justify-end">
              <Button
                onClick={() => navigate("/tenant-dashboard/payment-history")}
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
