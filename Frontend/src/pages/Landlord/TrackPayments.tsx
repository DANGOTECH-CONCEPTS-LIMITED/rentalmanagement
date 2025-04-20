import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  DollarSign,
  Calendar,
  Filter,
  Search,
  Download,
  ArrowUp,
  ArrowDown,
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
import { toast } from "@/hooks/use-toast";
import axios from "axios";

// Import jsPDF correctly
import { jsPDF } from "jspdf";
// Add the autoTable plugin - make sure this is installed via npm
import "jspdf-autotable";

interface Payment {
  balanceDue: any;
  id: string;
  tenant: string;
  property: string;
  amount: number;
  date: string;
  status: "paid" | "pending" | "late" | "SUCCESSFUL" | "FAILED";
  method: "credit_card" | "bank_transfer" | "cash" | string;
}

const TrackPayments = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortField, setSortField] = useState("date");
  const [sortDirection, setSortDirection] = useState("desc");

  // Mock data for payments
  const [payments, setPayments] = useState<Payment[]>([]);

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const landlordId = user.id;

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      const { data } = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL}/GetAllPayments`
      );

      const formattedPayments = data.map((payment: any) => ({
        id: payment.id,
        tenant: payment.propertyTenant.fullName,
        property: `${payment.propertyTenant.property?.name} ${payment.propertyTenant.property?.type}`,
        amount: payment.amount,
        date: new Date(payment.paymentDate).toISOString().split("T")[0],
        status: payment.paymentStatus,
        method: payment.paymentMethod,
        balanceDue: payment.propertyTenant.balanceDue,
      }));

      setPayments(formattedPayments);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Filter payments based on search term and status filter
  let filteredPayments = payments.filter(
    (payment) =>
      (payment.tenant?.toLowerCase().includes(searchTerm?.toLowerCase()) ||
        payment.property?.toLowerCase().includes(searchTerm?.toLowerCase()) ||
        payment.id?.toLowerCase().includes(searchTerm?.toLowerCase())) &&
      (filterStatus === "all" || payment.status === filterStatus)
  );

  // Sort payments
  filteredPayments.sort((a, b) => {
    if (sortField === "date") {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return sortDirection === "asc" ? dateA - dateB : dateB - dateA;
    } else if (sortField === "amount") {
      return sortDirection === "asc"
        ? a.amount - b.amount
        : b.amount - a.amount;
    }
    return 0;
  });

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "SUCCESSFUL":
        return (
          <span className="px-2 py-1 rounded-full bg-green-100 text-green-800 text-xs">
            SUCCESSFUL
          </span>
        );
      case "pending":
        return (
          <span className="px-2 py-1 rounded-full bg-yellow-100 text-yellow-800 text-xs">
            Pending
          </span>
        );
      case "FAILED":
        return (
          <span className="px-2 py-1 rounded-full bg-red-100 text-red-800 text-xs">
            FAILED
          </span>
        );
      case "late":
        return (
          <span className="px-2 py-1 rounded-full bg-red-100 text-red-800 text-xs">
            Late
          </span>
        );
      default:
        return null;
    }
  };

  const getMethodText = (method: string) => {
    switch (method) {
      case "credit_card":
        return "Credit Card";
      case "bank_transfer":
        return "Bank Transfer";
      case "cash":
      case "CASH":
        return "Cash";
      default:
        return method;
    }
  };

  // Generate and download receipt PDF without using autoTable plugin
  // Generate and download receipt PDF without using autoTable plugin
  const downloadReceipt = (payment: Payment) => {
    try {
      // Create PDF document
      const doc = new jsPDF();

      // Set document properties
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;

      // Add borders to the receipt
      doc.setDrawColor(0, 102, 204);
      doc.setLineWidth(0.5);
      doc.rect(margin, margin, pageWidth - margin * 2, pageHeight - margin * 2);

      // Add decorative header border
      doc.setFillColor(0, 102, 204);
      doc.rect(margin, margin, pageWidth - margin * 2, 12, "F");

      // Add header text
      doc.setFontSize(22);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(255, 255, 255);
      doc.text("OFFICIAL RENT RECEIPT", pageWidth / 2, margin + 8, {
        align: "center",
      });

      // Add receipt number with watermark style
      doc.setFontSize(40);
      doc.setTextColor(240, 240, 240);
      doc.setFont("helvetica", "bold");
      doc.text(`#${payment.id}`, pageWidth / 2, 70, { align: "center" });

      // Reset text color for main content
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");

      // Add current date with increased padding
      const today = new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      doc.text(`Date Issued: ${today}`, margin + 5, margin + 30);

      // Add receipt details with increased padding
      const leftColumn = margin + 5;
      const rightColumn = pageWidth / 2 + 10;
      let currentY = margin + 50; // Increased vertical padding

      // Add two columns of details with better spacing
      doc.setFont("helvetica", "bold");
      doc.text("PAYMENT DETAILS", leftColumn, currentY);
      doc.text("PROPERTY DETAILS", rightColumn, currentY);
      doc.setFont("helvetica", "normal");

      currentY += 12; // Increased spacing after section headers

      // Left column - Payment details with better spacing
      doc.text(`Receipt #: ${payment.id}`, leftColumn, currentY);
      currentY += 10; // Increased line spacing
      doc.text(`Payment Date: ${payment.date}`, leftColumn, currentY);
      currentY += 10; // Increased line spacing
      doc.text(
        `Payment Method: ${getMethodText(payment.method)}`,
        leftColumn,
        currentY
      );
      currentY += 10; // Increased line spacing

      // Add status with colored background and better padding
      const statusText = payment.status.toUpperCase();
      doc.setFillColor(payment.status === "SUCCESSFUL" ? "#e6ffe6" : "#ffe6e6");
      doc.rect(leftColumn, currentY - 6, 70, 8, "F");
      doc.text(`Status: ${statusText}`, leftColumn, currentY);
      currentY += 15;

      // Right column - Property and tenant info with better spacing
      let rightY = margin + 62; // Adjusted to align with left column
      doc.text(`Tenant: ${payment.tenant}`, rightColumn, rightY);
      rightY += 10; // Increased line spacing
      doc.text(`Property: ${payment.property}`, rightColumn, rightY);
      rightY += 10; // Increased line spacing

      // Add divider with more space
      currentY += 10; // More space before divider
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.5);
      doc.line(margin, currentY, pageWidth - margin, currentY);
      currentY += 20; // More space after divider

      // Payment breakdown section title
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text("PAYMENT BREAKDOWN", pageWidth / 2, currentY, {
        align: "center",
      });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(12);
      currentY += 15;

      // Create our own table since autoTable isn't working
      const tableX = pageWidth / 4;
      const tableWidth = pageWidth / 2;
      const rowHeight = 12; // Slightly taller rows

      // Table headers
      doc.setFillColor(0, 102, 204);
      doc.rect(tableX, currentY, tableWidth, rowHeight, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.text("Description", tableX + 8, currentY + 8); // More left padding
      doc.text("Amount", tableX + tableWidth - 8, currentY + 8, {
        align: "right",
      });
      currentY += rowHeight;

      // Reset text color
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "normal");

      // Table rows
      // Row 1
      doc.setFillColor(240, 240, 240);
      doc.rect(tableX, currentY, tableWidth, rowHeight, "F");
      doc.setFont("helvetica", "bold");
      doc.text("Rent Payment", tableX + 8, currentY + 8); // More left padding
      doc.setFont("helvetica", "normal");
      doc.text(
        `${payment.amount.toLocaleString()}`,
        tableX + tableWidth - 8,
        currentY + 8,
        { align: "right" }
      );
      currentY += rowHeight;

      // Row 2
      doc.rect(tableX, currentY, tableWidth, rowHeight);
      doc.setFont("helvetica", "bold");
      doc.text("Balance Due", tableX + 8, currentY + 8); // More left padding
      doc.setFont("helvetica", "normal");
      doc.text(
        `${payment.balanceDue.toLocaleString()}`,
        tableX + tableWidth - 8,
        currentY + 8,
        { align: "right" }
      );
      currentY += rowHeight;

      const finalY = currentY + 10; // More space before total

      // Total section with background
      doc.setFillColor(240, 240, 240);
      doc.rect(tableX, finalY, tableWidth, 14, "F"); // Slightly taller
      doc.setFont("helvetica", "bold");
      doc.text("Total Amount Paid:", tableX + 8, finalY + 9); // Better vertical alignment
      doc.text(
        `${payment.amount.toLocaleString()}`,
        tableX + tableWidth - 8,
        finalY + 9,
        { align: "right" }
      );

      // Add footer
      const footerY = finalY + 20; // More space before signatures
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.3);

      // Signature lines
      doc.line(margin + 20, footerY, margin + 100, footerY);
      doc.line(
        pageWidth - margin - 100,
        footerY,
        pageWidth - margin - 20,
        footerY
      );

      doc.setFontSize(10);
      doc.text("Tenant Signature", margin + 60, footerY + 5, {
        align: "center",
      });
      doc.text("Landlord Signature", pageWidth - margin - 60, footerY + 5, {
        align: "center",
      });

      // Add notes and thank you message
      doc.setFontSize(10);
      doc.setFont("helvetica", "italic");
      doc.text(
        "This is an official receipt of your rental payment. Thank you for your prompt payment.",
        pageWidth / 2,
        pageHeight - margin - 15,
        { align: "center" }
      );

      // Add contact information
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text(
        "For any questions regarding this receipt, please contact your property manager.",
        pageWidth / 2,
        pageHeight - margin - 8,
        { align: "center" }
      );

      // Save the PDF with a more descriptive filename
      doc.save(
        `Rent_Receipt_${payment.tenant.replace(/\s+/g, "_")}_${
          payment.date
        }.pdf`
      );

      toast({
        title: "Receipt downloaded",
        description: "Rent receipt has been downloaded successfully",
      });
    } catch (error: any) {
      console.error("Error generating PDF:", error);
      toast({
        title: "Error",
        description: "Failed to generate receipt. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Calculate total amount received
  const totalReceived = payments
    .filter((payment) => payment.status === "SUCCESSFUL")
    .reduce((sum, payment) => sum + payment.amount, 0);

  // Calculate total pending amount
  const totalPending = payments
    .filter(
      (payment) =>
        payment.status === "pending" ||
        payment.status === "late" ||
        payment.status === "FAILED"
    )
    .reduce((sum, payment) => sum + payment.amount, 0);

  // Export all receipts as a simpler version without requiring JSZip
  const exportAllReceipts = () => {
    try {
      // Just download individual PDFs for each payment for now
      filteredPayments.forEach((payment, index) => {
        // Add a slight delay to prevent browser from blocking multiple downloads
        setTimeout(() => downloadReceipt(payment), index * 300);
      });

      toast({
        title: "Exporting receipts",
        description: `Downloading ${filteredPayments.length} receipts...`,
      });
    } catch (error: any) {
      toast({
        title: "Export failed",
        description: error.message || "Could not export receipts",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/landlord-dashboard">
              Dashboard
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Track Payments</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">
          Payment Tracking
        </h1>
        <Button className="flex items-center gap-2" onClick={exportAllReceipts}>
          <Download className="h-4 w-4" />
          <span>Export All Receipts</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center mb-4">
            <div className="p-3 rounded-full bg-green-100 mr-4">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-medium">Total Received</h3>
              <p className="text-2xl font-bold">
                {totalReceived.toLocaleString()}
              </p>
            </div>
          </div>
          <div className="text-sm text-gray-500">
            <p>
              From {payments.filter((p) => p.status === "SUCCESSFUL").length}{" "}
              payments
            </p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center mb-4">
            <div className="p-3 rounded-full bg-yellow-100 mr-4">
              <Calendar className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <h3 className="text-lg font-medium">Pending / Late</h3>
              <p className="text-2xl font-bold">
                {totalPending.toLocaleString()}
              </p>
            </div>
          </div>
          <div className="text-sm text-gray-500">
            <p>
              From{" "}
              {
                payments.filter(
                  (p) =>
                    p.status === "pending" ||
                    p.status === "late" ||
                    p.status === "FAILED"
                ).length
              }{" "}
              payments
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
          <div className="relative w-full md:max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <Input
              type="text"
              placeholder="Search by tenant, property, or payment ID"
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              className="p-2 border border-gray-300 rounded-md text-sm"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="SUCCESSFUL">Paid</option>
              <option value="pending">Pending</option>
              <option value="FAILED">Failed</option>
              <option value="late">Late</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left">Payment ID</th>
                <th className="px-6 py-3 text-left">Tenant</th>
                <th className="px-6 py-3 text-left">Property</th>

                <th
                  className="px-6 py-3 text-left cursor-pointer"
                  onClick={() => handleSort("amount")}
                >
                  <div className="flex items-center">
                    <span>Amount</span>
                    {sortField === "amount" &&
                      (sortDirection === "asc" ? (
                        <ArrowUp className="ml-1 h-3 w-3" />
                      ) : (
                        <ArrowDown className="ml-1 h-3 w-3" />
                      ))}
                  </div>
                </th>
                <th className="px-6 py-3 text-left">Balance Due</th>
                <th
                  className="px-6 py-3 text-left cursor-pointer"
                  onClick={() => handleSort("date")}
                >
                  <div className="flex items-center">
                    <span>Date</span>
                    {sortField === "date" &&
                      (sortDirection === "asc" ? (
                        <ArrowUp className="ml-1 h-3 w-3" />
                      ) : (
                        <ArrowDown className="ml-1 h-3 w-3" />
                      ))}
                  </div>
                </th>
                <th className="px-6 py-3 text-left">Method</th>
                <th className="px-6 py-3 text-left">Status</th>
                <th className="px-6 py-3 text-right">Actions</th>
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
                    <td className="px-6 py-4">{payment.tenant}</td>
                    <td className="px-6 py-4">{payment.property}</td>
                    <td className="px-6 py-4 whitespace-nowrap font-medium">
                      {payment.amount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-medium">
                      {payment.balanceDue.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {payment.date}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getMethodText(payment.method)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(payment.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-blue-600"
                        onClick={() => downloadReceipt(payment)}
                        title="Download receipt as PDF"
                      >
                        <Download className="h-4 w-4" />
                        <span className="ml-1">Receipt</span>
                      </Button>
                    </td>
                  </motion.tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={8}
                    className="px-6 py-10 text-center text-gray-500"
                  >
                    <DollarSign className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No payments found</p>
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

export default TrackPayments;
