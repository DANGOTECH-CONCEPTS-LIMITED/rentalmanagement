import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  MessageSquare,
  Search,
  Filter,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
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
import axios from "axios";
import { toast } from "@/hooks/use-toast";

interface Complaint {
  id: string;
  tenant: string;
  property: string;
  subject: string;
  date: string;
  priority: "low" | "medium" | "high";
  status: "new" | "in-progress" | "resolved" | "rejected";
}

const HandleComplaints = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");

  // Mock data for complaints
  const [complaints, setComplaints] = useState<Complaint[]>([
    {
      id: "COMP-001",
      tenant: "John Smith",
      property: "Sunset Apartments - Unit 101",
      subject: "Broken water heater",
      date: "2023-04-15",
      priority: "high",
      status: "new",
    },
    // {
    //   id: "COMP-002",
    //   tenant: "Sarah Johnson",
    //   property: "Bayview Condos - Unit 305",
    //   subject: "Leaking kitchen faucet",
    //   date: "2023-04-10",
    //   priority: "medium",
    //   status: "in-progress",
    // },
    // {
    //   id: "COMP-003",
    //   tenant: "Michael Williams",
    //   property: "Westside Heights - Unit 210",
    //   subject: "Noisy neighbors",
    //   date: "2023-04-05",
    //   priority: "low",
    //   status: "resolved",
    // },
    // {
    //   id: "COMP-004",
    //   tenant: "Emily Davis",
    //   property: "Sunset Apartments - Unit 102",
    //   subject: "AC not working properly",
    //   date: "2023-04-12",
    //   priority: "high",
    //   status: "in-progress",
    // },
    // {
    //   id: "COMP-005",
    //   tenant: "Robert Miller",
    //   property: "Parkview Residences - Unit 405",
    //   subject: "Pest control needed",
    //   date: "2023-04-08",
    //   priority: "medium",
    //   status: "rejected",
    // },
  ]);
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const landlordId = user.id;
  useEffect(() => {
    fetchComplaints();
  }, []);

  const fetchComplaints = async () => {
    try {
      const { data } = await axios.get(
        `${
          import.meta.env.VITE_API_BASE_URL
        }/GetAllTenantComplaintsByLandlordId/${landlordId}`
      );
      // setComplaints(data);
    } catch (error) {
      toast({
        title: "Error fetching Complaints",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Filter complaints based on search term, status filter, and priority filter
  const filteredComplaints = complaints.filter(
    (complaint) =>
      (complaint.tenant.toLowerCase().includes(searchTerm.toLowerCase()) ||
        complaint.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
        complaint.id.toLowerCase().includes(searchTerm.toLowerCase())) &&
      (filterStatus === "all" || complaint.status === filterStatus) &&
      (filterPriority === "all" || complaint.priority === filterPriority)
  );

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "new":
        return <AlertCircle className="h-5 w-5 text-blue-500" />;
      case "in-progress":
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case "resolved":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "rejected":
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "new":
        return <span className="text-blue-500">New</span>;
      case "in-progress":
        return <span className="text-yellow-500">In Progress</span>;
      case "resolved":
        return <span className="text-green-500">Resolved</span>;
      case "rejected":
        return <span className="text-red-500">Rejected</span>;
      default:
        return null;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "high":
        return (
          <span className="px-2 py-1 rounded-full bg-red-100 text-red-800 text-xs">
            High
          </span>
        );
      case "medium":
        return (
          <span className="px-2 py-1 rounded-full bg-yellow-100 text-yellow-800 text-xs">
            Medium
          </span>
        );
      case "low":
        return (
          <span className="px-2 py-1 rounded-full bg-green-100 text-green-800 text-xs">
            Low
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/#/landlord-dashboard">
              Dashboard
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Handle Complaints</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">
          Tenant Complaints
        </h1>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
          <div className="relative w-full md:max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <Input
              type="text"
              placeholder="Search by tenant, subject, or complaint ID"
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <select
                className="p-2 border border-gray-300 rounded-md text-sm"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="new">New</option>
                <option value="in-progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <select
                className="p-2 border border-gray-300 rounded-md text-sm"
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
              >
                <option value="all">All Priorities</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left">Complaint ID</th>
                <th className="px-6 py-3 text-left">Tenant</th>
                <th className="px-6 py-3 text-left">Property</th>
                <th className="px-6 py-3 text-left">Subject</th>
                <th className="px-6 py-3 text-left">Date</th>
                <th className="px-6 py-3 text-left">Priority</th>
                <th className="px-6 py-3 text-left">Status</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredComplaints.length > 0 ? (
                filteredComplaints.map((complaint) => (
                  <motion.tr
                    key={complaint.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                    className="hover:bg-gray-50"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      {complaint.id}
                    </td>
                    <td className="px-6 py-4">{complaint.tenant}</td>
                    <td className="px-6 py-4">{complaint.property}</td>
                    <td className="px-6 py-4">{complaint.subject}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {complaint.date}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getPriorityBadge(complaint.priority)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getStatusIcon(complaint.status)}
                        <span className="ml-2">
                          {getStatusText(complaint.status)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-blue-600"
                      >
                        <Eye className="h-4 w-4" />
                        <span className="ml-1">View</span>
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
                    <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No complaints found</p>
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

export default HandleComplaints;
