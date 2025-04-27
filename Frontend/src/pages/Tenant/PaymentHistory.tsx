import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import {
  FileText,
  Download,
  CheckCircle,
  Clock,
  X,
  Search,
  Calendar,
  ChevronLeft,
  ChevronRight,
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Toast, ToastAction } from "@/components/ui/toast";
import jsPDF from "jspdf";
import "jspdf-autotable";

interface Payment {
  id: number;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  vendor: string;
  paymentType: string;
  paymentStatus: "SUCCESSFUL" | "PENDING" | "FAILED";
  transactionId: string;
  propertyTenant: {
    fullName: string;
    property: {
      name: string;
      id: number;
      price: number;
      currency: string;
    };
  };
}

interface Property {
  id: number;
  name: string;
}

const StyledReceipt = ({ payment, setShowReceiptModal }) => {
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "SUCCESSFUL":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "PENDING":
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case "FAILED":
        return <X className="h-5 w-5 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status) => {
    const baseClasses =
      "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium";
    switch (status) {
      case "SUCCESSFUL":
        return `${baseClasses} bg-green-100 text-green-800`;
      case "PENDING":
        return `${baseClasses} bg-yellow-100 text-yellow-800`;
      case "FAILED":
        return `${baseClasses} bg-red-100 text-red-800`;
      default:
        return baseClasses;
    }
  };

  const downloadReceipt = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.setTextColor("#4F46E5");
    doc.setFont("helvetica", "bold");
    doc.text("Payment Receipt", 105, 20, { align: "center" });

    const startX = 20;
    let currentY = 40;
    const labelWidth = 50;
    const valueX = startX + labelWidth + 10;
    const rowHeight = 10;

    const drawRow = (label, value, valueColor = "#111827") => {
      doc.setFontSize(11);
      doc.setTextColor("#6B7280");
      doc.setFont("helvetica", "normal");
      doc.text(label, startX, currentY);

      doc.setTextColor(valueColor);
      doc.setFont("helvetica", "bold");
      doc.text(value, valueX, currentY);
      currentY += rowHeight;
    };

    drawRow("Transaction ID", payment.transactionId);
    drawRow("Date", formatDate(payment.paymentDate));
    drawRow("Tenant", payment.propertyTenant.fullName);
    drawRow("Property", payment.propertyTenant.property.name);
    drawRow(
      "Amount",
      `${payment.amount} ${payment.propertyTenant.property.currency}`
    );
    drawRow("Payment Method", payment.paymentMethod);
    drawRow("Payment Type", payment.paymentType);

    const status =
      payment.paymentStatus === "SUCCESSFUL"
        ? "Paid"
        : payment.paymentStatus === "PENDING"
        ? "Pending"
        : "Failed";
    const statusColor =
      payment.paymentStatus === "SUCCESSFUL"
        ? "#16A34A"
        : payment.paymentStatus === "PENDING"
        ? "#F59E0B"
        : "#DC2626";
    drawRow("Status", status, statusColor);

    doc.setDrawColor("#E5E7EB");
    doc.line(startX, currentY + 5, 190, currentY + 5);

    currentY += 20;
    doc.setFontSize(9);
    doc.setTextColor("#6B7280");
    doc.setFont("helvetica", "normal");
    doc.text("Thank you for your payment!", 105, currentY, { align: "center" });
    doc.text(
      "This is an automated receipt. No signature required.",
      105,
      currentY + 5,
      { align: "center" }
    );

    doc.save(`receipt_${payment.transactionId}.pdf`);
  };

  return (
    <div className="mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Header with receipt title, download and close button */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-4 flex justify-between items-center relative">
        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:text-gray-200"
          onClick={() => setShowReceiptModal(false)}
        >
          <X className="h-5 w-5" />
        </Button>

        <h2 className="text-lg font-semibold text-white text-center flex-1">
          Payment Receipt
        </h2>

        {/* Right-side download */}
        <Button
          onClick={downloadReceipt}
          variant="secondary"
          size="sm"
          className="flex items-center gap-2 bg-white text-blue-700 hover:bg-blue-50"
        >
          <Download className="h-4 w-4" />
          <span>Download</span>
        </Button>
      </div>

      {/* Content */}
      <div className="p-6 space-y-4">
        <div className="flex justify-between items-start border-b border-gray-200 pb-4">
          <div>
            <p className="text-sm text-gray-500">Transaction ID</p>
            <p className="font-mono text-gray-800">{payment.transactionId}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">Date</p>
            <p className="text-gray-800">{formatDate(payment.paymentDate)}</p>
          </div>
        </div>

        <div className="border-b border-gray-200 pb-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Tenant</p>
              <p className="font-medium text-gray-800">
                {payment.propertyTenant.fullName}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Property</p>
              <p className="text-gray-800">
                {payment.propertyTenant.property.name}
              </p>
            </div>
          </div>
        </div>

        <div className="border-b border-gray-200 pb-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Payment Method</p>
              <p className="text-gray-800">{payment.paymentMethod}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Payment Type</p>
              <p className="text-gray-800">{payment.paymentType}</p>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center pt-2">
          <div>
            <p className="text-sm text-gray-500">Status</p>
            <div className={getStatusBadge(payment.paymentStatus)}>
              {getStatusIcon(payment.paymentStatus)}
              <span className="ml-1">
                {payment.paymentStatus === "SUCCESSFUL"
                  ? "Paid"
                  : payment.paymentStatus === "PENDING"
                  ? "Pending"
                  : "Failed"}
              </span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">Amount</p>
            <p className="text-2xl font-bold text-gray-800">
              {payment.amount} {payment.propertyTenant.property.currency}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-gray-50 px-6 py-4 text-center">
        <p className="text-sm text-gray-600">Thank you for your payment!</p>
        <p className="text-xs text-gray-500 mt-1">
          This is an automated receipt. No signature required.
        </p>
      </div>
    </div>
  );
};

const PaymentHistory = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const tableRef = useRef<HTMLTableElement>(null);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  const { toast } = useToast();

  const user = localStorage.getItem("user");
  const getUserToken = () => {
    try {
      if (!user) {
        throw new Error("No user found in localStorage");
      }
      const userData = JSON.parse(user);
      return userData.token;
    } catch (error) {
      console.error("Error getting user token:", error);
      return null;
    }
  };
  console.log("User token:", user);
  const token = getUserToken();
  const apiUrl = import.meta.env.VITE_API_BASE_URL;

  useEffect(() => {
    const fetchProperties = async () => {
      try {
        const response = await fetch(`${apiUrl}/GetAllProperties`, {
          headers: {
            accept: "*/*",
            Authorization: "Bearer " + token,
          },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch properties");
        }

        const data = await response.json();
      } catch (err) {
        console.error("Error fetching properties:", err);
      }
    };

    fetchProperties();
    fetchPayments();
  }, []);

  const fetchPayments = async (propertyId = "", start = "", end = "") => {
    setLoading(true);
    try {
      const userData = JSON.parse(user);
      let url = `${apiUrl}/GetPaymentsByTenantId/${userData.id}`;

      if (propertyId && start && end) {
        url = `${apiUrl}/GetTenantPaymentsByPropertyIdAndDateRange?propertyId=${propertyId}&startDate=${start}&endDate=${end}`;
      }

      const response = await fetch(url, {
        headers: {
          accept: "*/*",
          Authorization: "Bearer " + token,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch payments");
      }

      const data = await response.json();
      setPayments(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unknown error occurred"
      );
    } finally {
      setLoading(false);
    }
  };

  const filteredPayments = payments.filter(
    (payment) =>
      payment.transactionId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.propertyTenant.property.name
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      payment.propertyTenant.fullName
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
  );

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredPayments.slice(
    indexOfFirstItem,
    indexOfLastItem
  );
  const totalPages = Math.ceil(filteredPayments.length / itemsPerPage);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "SUCCESSFUL":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "PENDING":
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case "FAILED":
        return <X className="h-5 w-5 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "SUCCESSFUL":
        return <span className="text-green-500">Paid</span>;
      case "PENDING":
        return <span className="text-yellow-500">Pending</span>;
      case "FAILED":
        return <span className="text-red-500">Failed</span>;
      default:
        return null;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        Loading payments...
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500 p-4">Error: {error}</div>;
  }

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
              placeholder="Search by transaction ID, property or tenant"
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full" ref={tableRef}>
            <thead className="text-xs text-gray-700 uppercase bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left">Transaction ID</th>
                <th className="px-6 py-3 text-left">Date</th>
                <th className="px-6 py-3 text-left">Tenant</th>
                <th className="px-6 py-3 text-left">Property</th>
                <th className="px-6 py-3 text-left">Amount</th>
                <th className="px-6 py-3 text-left">Method</th>
                <th className="px-6 py-3 text-left">Type</th>
                <th className="px-6 py-3 text-left">Status</th>
                <th className="px-6 py-3 text-left">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {currentItems.length > 0 ? (
                currentItems.map((payment) => (
                  <motion.tr
                    key={payment.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                    className="hover:bg-gray-50"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      {payment.transactionId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {formatDate(payment.paymentDate)}
                    </td>
                    <td className="px-6 py-4">
                      {payment.propertyTenant.fullName}
                    </td>
                    <td className="px-6 py-4">
                      {payment.propertyTenant.property.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-medium">
                      {payment.amount}{" "}
                      {payment.propertyTenant.property.currency}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {payment.paymentMethod}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {payment.paymentType}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getStatusIcon(payment.paymentStatus)}
                        <span className="ml-2">
                          {getStatusText(payment.paymentStatus)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex items-center gap-2 text-blue-600"
                        onClick={() => {
                          setSelectedPayment(payment);
                          setShowReceiptModal(true);
                        }}
                      >
                        <FileText className="h-4 w-4" />
                        <span>View Receipt</span>
                      </Button>
                    </td>
                  </motion.tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={9}
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

        {filteredPayments.length > itemsPerPage && (
          <div className="flex items-center justify-between mt-6">
            <div className="text-sm text-gray-500">
              Showing {indexOfFirstItem + 1} to{" "}
              {Math.min(indexOfLastItem, filteredPayments.length)} of{" "}
              {filteredPayments.length} entries
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Previous</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                }
                disabled={currentPage === totalPages}
              >
                <span>Next</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {showReceiptModal && selectedPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 sm:p-8">
          <div className="relative bg-white rounded-lg max-w-2xl w-full shadow-xl">
            <StyledReceipt
              payment={selectedPayment}
              setShowReceiptModal={setShowReceiptModal}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentHistory;
