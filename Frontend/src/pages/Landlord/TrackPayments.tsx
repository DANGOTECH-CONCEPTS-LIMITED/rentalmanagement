import { useState, useEffect } from "react";
import {
  DollarSign,
  Calendar,
  Filter,
  Search,
  Download,
  ArrowUp,
  ArrowDown,
  Receipt,
  DownloadIcon,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

interface Payment {
  id: number;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  vendor: string;
  paymentType: string;
  paymentStatus: string;
  transactionId: string;
  description: string | null;
  propertyTenantId: number;
  propertyTenant: {
    id: number;
    fullName: string;
    email: string;
    phoneNumber: string;
    property: {
      id: number;
      name: string;
      address: string;
    };
  };
}

const TrackPayments = () => {
  const { toast } = useToast();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterMethod, setFilterMethod] = useState("all");
  const [sortField, setSortField] = useState("paymentDate");
  const [sortDirection, setSortDirection] = useState("desc");

  console.log("Payments:", payments);

  const getAuthToken = () => {
    try {
      const user = localStorage.getItem("user");
      if (!user) {
        console.error("No user found in localStorage");
        return null;
      }
      const userData = JSON.parse(user);
      return userData.token;
    } catch (error) {
      console.error("Error parsing user data:", error);
      return null;
    }
  };

  const apiUrl = import.meta.env.VITE_API_BASE_URL;

  useEffect(() => {
    const fetchPayments = async () => {
      try {
        const response = await fetch(`${apiUrl}/GetAllPayments`, {
          headers: {
            Authorization: `Bearer ${getAuthToken()}`,
            accept: "*/*",
          },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch payments");
        }

        const data = await response.json();
        setPayments(data);
      } catch (error) {
        console.error("Error fetching payments:", error);
        toast({
          title: "Error",
          description:
            error.status === 401 ? error.statusText : error.response.data,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchPayments();
  }, [apiUrl, toast]);

  const generateReceipt = (payment: Payment) => {
    const receiptHTML = `
      <html>
        <head>
          <title>Receipt for Payment ${payment.transactionId}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 20px; }
            .receipt-title { font-size: 24px; font-weight: bold; }
            .receipt-details { margin-top: 30px; }
            .detail-row { display: flex; margin-bottom: 10px; }
            .detail-label { font-weight: bold; width: 150px; }
            .footer { margin-top: 40px; text-align: center; font-size: 12px; }
            .divider { border-top: 1px dashed #000; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="receipt-title">PAYMENT RECEIPT</div>
            <div>Transaction ID: ${payment.transactionId}</div>
          </div>
          
          <div class="divider"></div>
          
          <div class="receipt-details">
            <div class="detail-row">
              <div class="detail-label">Tenant:</div>
              <div>${payment.propertyTenant.fullName}</div>
            </div>
            <div class="detail-row">
              <div class="detail-label">Property:</div>
              <div>${payment.propertyTenant.property.name}</div>
            </div>
            <div class="detail-row">
              <div class="detail-label">Address:</div>
              <div>${payment.propertyTenant.property.address}</div>
            </div>
            <div class="detail-row">
              <div class="detail-label">Payment Date:</div>
              <div>${new Date(payment.paymentDate).toLocaleDateString()}</div>
            </div>
            <div class="detail-row">
              <div class="detail-label">Payment Method:</div>
              <div>${payment.paymentMethod}</div>
            </div>
            <div class="detail-row">
              <div class="detail-label">Payment Type:</div>
              <div>${payment.paymentType}</div>
            </div>
            <div class="detail-row">
              <div class="detail-label">Amount:</div>
              <div>UGX ${payment.amount.toLocaleString()}</div>
            </div>
            ${
              payment.description
                ? `
            <div class="detail-row">
              <div class="detail-label">Description:</div>
              <div>${payment.description}</div>
            </div>
            `
                : ""
            }
          </div>
          
          <div class="divider"></div>
          
          <div class="footer">
            <div>Thank you for your payment!</div>
            <div>Generated on ${new Date().toLocaleDateString()}</div>
          </div>
        </body>
      </html>
    `;

    const blob = new Blob([receiptHTML], { type: "text/html" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `receipt_${payment.transactionId}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Receipt Generated",
      description: `Receipt for payment ${payment.transactionId} has been downloaded.`,
    });
  };

  const handleExport = () => {
    const headers = [
      "Transaction ID",
      "Tenant",
      "Property",
      "Amount (UGX)",
      "Payment Date",
      "Payment Method",
      "Payment Type",
      "Status",
      "Description",
    ];

    const csvRows = [
      headers.join(","),
      ...payments.map((payment) =>
        [
          `"${payment.transactionId}"`,
          `"${payment.propertyTenant.fullName}"`,
          `"${payment.propertyTenant.property.name}"`,
          payment.amount,
          new Date(payment.paymentDate).toLocaleDateString(),
          payment.paymentMethod,
          payment.paymentType,
          payment.paymentStatus,
          payment.description ? `"${payment.description}"` : "",
        ].join(",")
      ),
    ];

    const csvContent = csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "payments_export.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Export Successful",
      description: "Payment data has been exported to CSV",
    });
  };

  const filteredPayments = payments.filter((payment) => {
    const matchesSearch =
      payment.propertyTenant.fullName
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      payment.propertyTenant.property.name
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      payment.transactionId.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      filterStatus === "all" || payment.paymentStatus === filterStatus;
    const matchesMethod =
      filterMethod === "all" || payment.paymentMethod === filterMethod;

    return matchesSearch && matchesStatus && matchesMethod;
  });

  const sortedPayments = [...filteredPayments].sort((a, b) => {
    if (sortField === "paymentDate") {
      const dateA = new Date(a.paymentDate).getTime();
      const dateB = new Date(b.paymentDate).getTime();
      return sortDirection === "asc" ? dateA - dateB : dateB - dateA;
    } else if (sortField === "amount") {
      return sortDirection === "asc"
        ? a.amount - b.amount
        : b.amount - a.amount;
    } else if (sortField === "tenant") {
      return sortDirection === "asc"
        ? a.propertyTenant.fullName.localeCompare(b.propertyTenant.fullName)
        : b.propertyTenant.fullName.localeCompare(a.propertyTenant.fullName);
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

  // Add pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 5;

  // ... (keep all existing code until filteredPayments)

  // Pagination logic
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentRows = sortedPayments.slice(indexOfFirstRow, indexOfLastRow);
  const totalPages = Math.ceil(sortedPayments.length / rowsPerPage);

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  // Reset to first page when filters or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filterStatus, filterMethod, searchTerm, sortField, sortDirection]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "SUCCESSFUL":
        return <Badge className="bg-green-100 text-green-800">Paid</Badge>;
      case "PENDING":
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case "FAILED":
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getMethodBadge = (method: string) => {
    switch (method) {
      case "CASH":
        return <Badge variant="secondary">Cash</Badge>;
      case "MOMO":
        return <Badge variant="secondary">Mobile Money</Badge>;
      case "BANK":
        return <Badge variant="secondary">Bank Transfer</Badge>;
      case "CARD":
        return <Badge variant="secondary">Credit Card</Badge>;
      default:
        return <Badge variant="outline">{method}</Badge>;
    }
  };

  const totalReceived = payments
    .filter((payment) => payment.paymentStatus === "SUCCESSFUL")
    .reduce((sum, payment) => sum + payment.amount, 0);

  const totalPending = payments
    .filter((payment) => payment.paymentStatus === "PENDING")
    .reduce((sum, payment) => sum + payment.amount, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Track Payments</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Payment Tracking
          </h1>
          <p className="text-muted-foreground">
            View and manage all payment transactions
          </p>
        </div>
        <Button onClick={handleExport} className="flex items-center gap-2">
          <Download className="h-4 w-4" />
          <span>Export</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Received
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              UGX {totalReceived.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              From{" "}
              {payments.filter((p) => p.paymentStatus === "SUCCESSFUL").length}{" "}
              completed payments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pending Payments
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              UGX {totalPending.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              From{" "}
              {payments.filter((p) => p.paymentStatus === "PENDING").length}{" "}
              payments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cash Payments</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              UGX{" "}
              {payments
                .filter(
                  (p) =>
                    p.paymentMethod === "CASH" &&
                    p.paymentStatus === "SUCCESSFUL"
                )
                .reduce((sum, p) => sum + p.amount, 0)
                .toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {payments.filter((p) => p.paymentMethod === "CASH").length} cash
              transactions
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="relative w-full md:max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                type="text"
                placeholder="Search by tenant, property, or transaction ID"
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 w-full md:w-auto">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <select
                  className="p-2 border rounded-md text-sm"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <option value="all">All Status</option>
                  <option value="SUCCESSFUL">Successful</option>
                  <option value="PENDING">Pending</option>
                  <option value="FAILED">Failed</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <select
                  className="p-2 border rounded-md text-sm"
                  value={filterMethod}
                  onChange={(e) => setFilterMethod(e.target.value)}
                >
                  <option value="all">All Methods</option>
                  <option value="CASH">Cash</option>
                  <option value="MOMO">Mobile Money</option>
                  <option value="BANK">Bank Transfer</option>
                  <option value="CARD">Credit Card</option>
                </select>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">Transaction ID</TableHead>
                  <TableHead
                    className="cursor-pointer"
                    onClick={() => handleSort("tenant")}
                  >
                    <div className="flex items-center">
                      Tenant
                      {sortField === "tenant" &&
                        (sortDirection === "asc" ? (
                          <ArrowUp className="ml-1 h-3 w-3" />
                        ) : (
                          <ArrowDown className="ml-1 h-3 w-3" />
                        ))}
                    </div>
                  </TableHead>
                  <TableHead>Property</TableHead>
                  <TableHead
                    className="text-right cursor-pointer"
                    onClick={() => handleSort("amount")}
                  >
                    <div className="flex items-center justify-end">
                      Amount
                      {sortField === "amount" &&
                        (sortDirection === "asc" ? (
                          <ArrowUp className="ml-1 h-3 w-3" />
                        ) : (
                          <ArrowDown className="ml-1 h-3 w-3" />
                        ))}
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer"
                    onClick={() => handleSort("paymentDate")}
                  >
                    <div className="flex items-center">
                      Date
                      {sortField === "paymentDate" &&
                        (sortDirection === "asc" ? (
                          <ArrowUp className="ml-1 h-3 w-3" />
                        ) : (
                          <ArrowDown className="ml-1 h-3 w-3" />
                        ))}
                    </div>
                  </TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentRows.length > 0 ? (
                  currentRows.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-medium">
                        {payment.transactionId}
                      </TableCell>
                      <TableCell>{payment.propertyTenant.fullName}</TableCell>
                      <TableCell>
                        {payment.propertyTenant.property.name}
                      </TableCell>
                      <TableCell className="text-right">
                        UGX {payment.amount.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {new Date(payment.paymentDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {getMethodBadge(payment.paymentMethod)}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(payment.paymentStatus)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-blue-600 hover:text-blue-800"
                          onClick={() => generateReceipt(payment)}
                        >
                          <DownloadIcon className="h-4 w-4 mr-2" />
                          Receipt
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center">
                      <div className="flex flex-col items-center justify-center py-8">
                        <DollarSign className="h-12 w-12 text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">
                          No payments found
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Try adjusting your search or filters
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            {/* Add pagination controls */}
            {sortedPayments.length > rowsPerPage && (
              <div className="flex items-center justify-between w-full mt-4">
                <div className="text-sm text-muted-foreground">
                  Showing {indexOfFirstRow + 1} to{" "}
                  {Math.min(indexOfLastRow, sortedPayments.length)} of{" "}
                  {sortedPayments.length} payments
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => paginate(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span className="ml-2">Prev</span>
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
        </CardContent>
      </Card>
    </div>
  );
};

export default TrackPayments;
