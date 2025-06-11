import React, { useState } from "react";
import axios from "axios";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type UtilityTransaction = {
  id: number;
  description: string;
  transactionID: string;
  reasonAtTelecom: string;
  paymentMethod: string;
  utilityType: string;
  status: string;
  vendorTranId: string;
  amount: number;
  charges: number;
  createdAt: string;
  phoneNumber: string;
  meterNumber: string;
  isTokenGenerated: boolean;
  token: string | null;
  units: string | null;
};

const ITEMS_PER_PAGE = 20;

const UtilityReport: React.FC = () => {
  const [meterNumber, setMeterNumber] = useState("0292000010788");
  const [data, setData] = useState<UtilityTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

    const apiUrl = import.meta.env.VITE_API_BASE_URL;

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await axios.get<UtilityTransaction[]>(
        `${apiUrl}/GetUtilityPaymentByMeterNumber${meterNumber}`
      );
      setData(response.data);
      setCurrentPage(1);
    } catch (error) {
      console.error("Fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

const handleExportPDF = () => {
  const doc = new jsPDF();

  doc.setFontSize(16);
  doc.text("Utility Payment Report", 14, 20);

  autoTable(doc, {
    startY: 30,
    head: [["Date", "Status", "Amount", "Charges", "Token", "Units", "Reason"]],
    body: data.map((item) => [
      new Date(item.createdAt).toLocaleDateString(),
      item.status,
      item.amount,
      item.charges,
      item.isTokenGenerated ? item.token || "N/A" : "N/A",
      item.units || "N/A",
      item.reasonAtTelecom,
    ]),
  });

  doc.save("utility-report.pdf");
};

  const totalPages = Math.ceil(data.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedData = data.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Utility Payment Report</h2>

      <div className="mb-4 flex flex-col sm:flex-row items-start sm:items-end gap-2">
        <div className="w-full sm:w-auto">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Meter Number
          </label>
          <input
            type="text"
            value={meterNumber}
            onChange={(e) => setMeterNumber(e.target.value)}
            className="w-full sm:w-64 px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        <button
          onClick={fetchData}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          {loading ? "Loading..." : "Fetch Data"}
        </button>
        {data.length > 0 && (
          <button
            onClick={handleExportPDF}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            Export PDF
          </button>
        )}
      </div>

      {data.length > 0 ? (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Charges</TableHead>
                <TableHead>Token</TableHead>
                <TableHead>Units</TableHead>
                <TableHead>Reason</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    {new Date(item.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell
                    className={
                      item.status.includes("FAILED")
                        ? "text-red-600"
                        : "text-green-600"
                    }
                  >
                    {item.status}
                  </TableCell>
                  <TableCell>{item.amount}</TableCell>
                  <TableCell>{item.charges}</TableCell>
                  <TableCell>
                    {item.isTokenGenerated ? item.token || "N/A" : "N/A"}
                  </TableCell>
                  <TableCell>{item.units || "N/A"}</TableCell>
                  <TableCell className="text-sm">{item.reasonAtTelecom}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Pagination Controls */}
          <div className="mt-4 flex justify-between items-center">
            <p className="text-sm text-gray-500">
              Page {currentPage} of {totalPages}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
              >
                Prev
              </button>
              <button
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </>
      ) : (
        !loading && <p className="text-gray-500">No data found.</p>
      )}
    </div>
  );
};

export default UtilityReport;
