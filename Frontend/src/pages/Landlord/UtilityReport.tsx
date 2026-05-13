import React, { useState } from "react";
import axios from "axios";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { DataTable, Column } from "@/components/ui/data-table";

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

const UtilityReport: React.FC = () => {
  const [meterNumber, setMeterNumber] = useState("0292000010788");
  const [data, setData] = useState<UtilityTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const apiUrl = import.meta.env.VITE_API_BASE_URL;

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get<UtilityTransaction[]>(
        `${apiUrl}/GetUtilityPaymentByMeterNumber/${meterNumber}`
      );
      setData(response.data);
    } catch (error) {
      console.error("Fetch error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();

    doc.setFontSize(16);
    doc.text("Utility Payment Report", 14, 20);

    autoTable(doc, {
      startY: 30,
      head: [["Date", "Status", "Amount", "Meter Number", "Charges", "Token", "Units", "Reason"]],
      body: data.map((item) => [
        new Date(item.createdAt).toLocaleDateString(),
        item.status,
        item.amount,
        item.meterNumber,
        item.charges,
        item.isTokenGenerated ? item.token || "N/A" : "N/A",
        item.units || "N/A",
        item.reasonAtTelecom,
      ]),
    });

    doc.save("utility-report.pdf");
  };

  const columns: Column<UtilityTransaction>[] = [
    {
      key: "date",
      header: "Date",
      cell: (item) => new Date(item.createdAt).toLocaleDateString(),
    },
    {
      key: "status",
      header: "Status",
      cell: (item) => (
        <span className={item.status.includes("FAILED") ? "text-red-600" : "text-green-600"}>
          {item.status}
        </span>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      cell: (item) => item.amount,
    },
    {
      key: "meterNumber",
      header: "Meter Number",
      cell: (item) => item.meterNumber,
    },
    {
      key: "charges",
      header: "Charges",
      cell: (item) => item.charges,
    },
    {
      key: "token",
      header: "Token",
      cell: (item) => (item.isTokenGenerated ? item.token || "N/A" : "N/A"),
    },
    {
      key: "units",
      header: "Units",
      cell: (item) => item.units || "N/A",
    },
    {
      key: "reason",
      header: "Reason",
      className: "text-sm",
      cell: (item) => item.reasonAtTelecom,
    },
  ];

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
          disabled={isLoading}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-70 disabled:pointer-events-none"
        >
          {isLoading ? "Submitting..." : "Fetch Data"}
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

      <DataTable
        data={data}
        columns={columns}
        loading={isLoading}
        label="transaction"
        emptyMessage="No data found."
      />
    </div>
  );
};

export default UtilityReport;
