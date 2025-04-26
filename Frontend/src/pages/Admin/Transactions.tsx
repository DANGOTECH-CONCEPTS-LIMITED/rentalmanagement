import { motion } from "framer-motion";
import {
  Calendar,
  CheckCircle,
  Clock,
  Download,
  FileText,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import axios from "axios";
import { toast } from "@/components/ui/use-toast";
import { Input } from "@/components/ui/input";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export interface Payment {
  paymentStatus: string;
  vendor: string;
  paymentType: string;
  paymentMethod: string;
  propertyTenant: any;
  paymentDate: string;
  transactionId: string;
  id: string;
  date: string;
  amount: number;
  propertyName: string;
  status: "paid" | "pending" | "failed";
  receiptAvailable: boolean;
}

const Transactions: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 5;

  // Mock payment history data
  const [payments, setPayments] = useState<Payment[]>([]);
  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      const { data } = await axios.get(
        `${
          import.meta.env.VITE_API_BASE_URL
        }/GetTenantPaymentsByPropertyId/${sessionStorage.getItem("propertyId")}`
      );
      setPayments(data);
    } catch (error) {
      toast({
        title: "Error",
        description: error.response.data,
        variant: "destructive",
      });
    }
  };

  // Filter payments based on search term
  const filteredPayments = payments?.filter(
    (payment) =>
      payment?.transactionId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment?.propertyTenant.fullName
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
  );

  // Pagination logic
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentRows = filteredPayments.slice(indexOfFirstRow, indexOfLastRow);
  const totalPages = Math.ceil(filteredPayments.length / rowsPerPage);

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  const generateReceipt = (payment: Payment) => {
    const doc = new jsPDF();

    // Add logo or header
    doc.setFontSize(20);
    doc.setTextColor(40, 53, 147);
    doc.text("PAYMENT RECEIPT", 105, 20, { align: "center" });

    // Add receipt details
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);

    // Receipt info section
    doc.text(`Transaction Id: ${payment.transactionId}`, 15, 40);
    doc.text(
      `Transaction Date: ${new Date(payment.paymentDate).toLocaleDateString()}`,
      15,
      50
    );
    doc.text(`Status: ${payment.paymentStatus}`, 15, 60);

    // Payment details section
    doc.setFontSize(14);
    doc.text("Payment Details", 15, 80);
    doc.setFontSize(12);

    autoTable(doc, {
      startY: 85,
      head: [["Field", "Value"]],
      body: [
        [
          "Property:",
          `${payment.propertyTenant.property.name} (${payment.propertyTenant.property.type})`,
        ],
        ["Tenant:", payment.propertyTenant.fullName],
        ["Landlord:", payment.propertyTenant.property.owner.fullName],
        ["Payment Type:", payment.paymentType],
        ["Payment Method:", payment.paymentMethod],
        [
          "Amount:",
          `${payment.propertyTenant.property.currency} ${payment.amount.toFixed(
            2
          )}`,
        ],
        ["Processed By:", payment.vendor],
      ],
      theme: "grid",
      headStyles: { fillColor: [40, 53, 147] },
      margin: { left: 15 },
      tableWidth: "auto",
    });

    // Footer
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(
      "Thank you for your payment!",
      105,
      doc.internal.pageSize.height - 20,
      { align: "center" }
    );
    doc.text(
      "This is an official receipt for your records",
      105,
      doc.internal.pageSize.height - 15,
      { align: "center" }
    );

    // Save the PDF
    doc.save(`receipt_${payment.transactionId}.pdf`);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "SUCCESSFUL":
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
      case "SUCCESSFUL":
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
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">
        Transactions History
      </h1>

      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <div className="relative w-full md:max-w-md mt-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <Input
            type="text"
            placeholder="Search by payment ID or tenant name"
            className="pl-10"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1); // Reset to first page when searching
            }}
          />
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left">Payment ID</th>
              <th className="px-6 py-3 text-left">Date</th>
              <th className="px-6 py-3 text-left">Property</th>
              <th className="px-6 py-3 text-left">Landlord</th>
              <th className="px-6 py-3 text-left">Tenant</th>
              <th className="px-6 py-3 text-left whitespace-nowrap">
                Payment Type
              </th>
              <th className="px-6 py-3 text-left">Amount</th>
              <th className="px-6 py-3 text-left whitespace-nowrap">Method</th>
              <th className="px-6 py-3 text-left whitespace-nowrap">
                Received By
              </th>
              <th className="px-6 py-3 text-left">Status</th>
              <th className="px-6 py-3 text-left">Receipt</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {currentRows.length > 0 ? (
              currentRows?.map((payment) => (
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
                    {new Date(payment.paymentDate).toLocaleString()}
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap">
                    {payment.propertyTenant.property.name}
                    {payment.propertyTenant.property.type}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {payment.propertyTenant.property.owner.fullName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {payment.propertyTenant.fullName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap font-medium">
                    {payment.paymentType}
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap">
                    {payment.propertyTenant.property.currency}{" "}
                    {payment.amount.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {payment.paymentMethod}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {payment.vendor}
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
                    {payment.paymentStatus === "SUCCESSFUL" ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex items-center gap-2 text-blue-600"
                        onClick={() => generateReceipt(payment)}
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
                  colSpan={11}
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

      {/* Pagination controls */}
      {filteredPayments.length > rowsPerPage && (
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-gray-500">
            Showing {indexOfFirstRow + 1} to{" "}
            {Math.min(indexOfLastRow, filteredPayments.length)} of{" "}
            {filteredPayments.length} entries
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => paginate(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="ml-2">Previous</span>
            </Button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(
              (number) => (
                <Button
                  key={number}
                  variant={currentPage === number ? "default" : "outline"}
                  size="sm"
                  onClick={() => paginate(number)}
                >
                  {number}
                </Button>
              )
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => paginate(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              <span className="mr-2">Next</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Transactions;
