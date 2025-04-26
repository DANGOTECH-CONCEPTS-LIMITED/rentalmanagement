import { useState } from "react";
import { motion } from "framer-motion";
import {
  FileText,
  Download,
  CheckCircle,
  Clock,
  X,
  Search,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export interface Payment {
  id: string;
  date: string;
  amount: number;
  propertyName: string;
  status: "paid" | "pending" | "failed";
  receiptAvailable: boolean;
}

const PaymentHistory = () => {
  const [searchTerm, setSearchTerm] = useState("");

  // Mock payment history data
  const [payments, setPayments] = useState<Payment[]>([
    {
      id: "PMT-001",
      date: "2023-04-01",
      amount: 1200,
      propertyName: "Sunset Apartments",
      status: "paid",
      receiptAvailable: true,
    },
    {
      id: "PMT-002",
      date: "2023-03-01",
      amount: 1200,
      propertyName: "Sunset Apartments",
      status: "paid",
      receiptAvailable: true,
    },
    {
      id: "PMT-003",
      date: "2023-02-01",
      amount: 1200,
      propertyName: "Sunset Apartments",
      status: "paid",
      receiptAvailable: true,
    },
    {
      id: "PMT-004",
      date: "2023-01-01",
      amount: 1150,
      propertyName: "Sunset Apartments",
      status: "paid",
      receiptAvailable: true,
    },
    {
      id: "PMT-005",
      date: "2022-12-01",
      amount: 1150,
      propertyName: "Sunset Apartments",
      status: "paid",
      receiptAvailable: true,
    },
  ]);

  // Filter payments based on search term
  const filteredPayments = payments.filter(
    (payment) =>
      payment.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.propertyName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "paid":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "pending":
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case "failed":
        return <X className="h-5 w-5 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "paid":
        return <span className="text-green-500">Paid</span>;
      case "pending":
        return <span className="text-yellow-500">Pending</span>;
      case "failed":
        return <span className="text-red-500">Failed</span>;
      default:
        return null;
    }
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
            <BreadcrumbPage>Payment History</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">
          Payment History
        </h1>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
          <div className="relative w-full md:max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <Input
              type="text"
              placeholder="Search by payment ID or property name"
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button variant="outline" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span>Filter by Date</span>
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left">Payment ID</th>
                <th className="px-6 py-3 text-left">Date</th>
                <th className="px-6 py-3 text-left">Property</th>
                <th className="px-6 py-3 text-left">Amount</th>
                <th className="px-6 py-3 text-left">Status</th>
                <th className="px-6 py-3 text-left">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredPayments.length > 0 ? (
                filteredPayments.map((payment) => (
                  <motion.tr
                    key={payment.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                    className="hover:bg-gray-50"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      {payment.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {payment.date}
                    </td>
                    <td className="px-6 py-4">{payment.propertyName}</td>
                    <td className="px-6 py-4 whitespace-nowrap font-medium">
                      ${payment.amount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getStatusIcon(payment.status)}
                        <span className="ml-2">
                          {getStatusText(payment.status)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {payment.receiptAvailable ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="flex items-center gap-2 text-blue-600"
                        >
                          <Download className="h-4 w-4" />
                          <span>Download</span>
                        </Button>
                      ) : (
                        <span className="text-gray-400 text-sm">
                          Not available
                        </span>
                      )}
                    </td>
                  </motion.tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-10 text-center text-gray-500"
                  >
                    <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No payment records found</p>
                    <p className="text-sm mt-1">
                      Try adjusting your search criteria
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PaymentHistory;
