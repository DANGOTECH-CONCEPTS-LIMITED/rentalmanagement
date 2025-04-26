import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, Search, Filter, Eye, CheckCircle, XCircle, Clock, AlertCircle, FileText, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

interface Property {
  id: number;
  name: string;
  address: string;
  type: string;
}

interface Complaint {
  id: number;
  subject: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  attachement: string;
  dateCreated: string;
  dateUpdated: string | null;
  status: string;
  resolutionDetails: string | null;
  propertyId: number;
  property: Property;
  tenantName?: string;
}

const HandleComplaints = () => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  
  // Extract token from localStorage just like in the RegisterTenants component
  const user = localStorage.getItem('user');
  let token = '';
  let id = '';
  
  try {
    if (user) {
      const userData = JSON.parse(user);
      token = userData.token;
      id = userData.id;
    } else {
      console.error('No user found in localStorage');
    }
  } catch (error) {
    console.error('Error parsing user data:', error);
  }

  // Fetch complaints from API
  useEffect(() => {
    const fetchComplaints = async () => {
      setLoading(true);
      try {
        const apiUrl = import.meta.env.VITE_API_BASE_URL;
        
        const response = await fetch(`${apiUrl}/GetAllTenantComplaintsByLandlordId/${id}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': '*/*'
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        const complaintsWithTenants = data.map((complaint: Complaint, index: number) => ({
          ...complaint,
          tenantName: `Tenant ${index + 1}`
        }));
        
        setComplaints(complaintsWithTenants);
      } catch (error) {
        console.error('Error fetching complaints:', error);
        toast({
          title: "Error",
          description: "Failed to fetch complaints",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchComplaints();
    }
  }, [toast, token]);

  const filteredComplaints = complaints.filter(complaint => 
    (complaint.subject.toLowerCase().includes(searchTerm.toLowerCase()) || 
     (complaint.tenantName && complaint.tenantName.toLowerCase().includes(searchTerm.toLowerCase())) ||
     complaint.id.toString().includes(searchTerm)) &&
    (filterStatus === 'all' || complaint.status.toLowerCase() === filterStatus.toLowerCase()) &&
    (filterPriority === 'all' || complaint.priority === filterPriority)
  );

  const getStatusIcon = (status: string) => {
    switch (status.toUpperCase()) {
      case 'PENDING':
        return <AlertCircle className="h-5 w-5 text-blue-500" />;
      case 'IN_PROGRESS':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'RESOLVED':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'REJECTED':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status.toUpperCase()) {
      case 'PENDING':
        return <span className="text-blue-500">Pending</span>;
      case 'IN_PROGRESS':
        return <span className="text-yellow-500">In Progress</span>;
      case 'RESOLVED':
        return <span className="text-green-500">Resolved</span>;
      case 'REJECTED':
        return <span className="text-red-500">Rejected</span>;
      default:
        return <span className="text-gray-500">{status}</span>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high':
        return <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">High</Badge>;
      case 'medium':
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200">Medium</Badge>;
      case 'low':
        return <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">Low</Badge>;
      default:
        return <Badge variant="outline" className="bg-gray-100 text-gray-800 border-gray-200">{priority}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const viewComplaintDetails = (complaint: Complaint) => {
    setSelectedComplaint(complaint);
    setShowDetailsDialog(true);
  };

  return (
    <div className="space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/landlord-dashboard">Dashboard</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Handle Complaints</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Tenant Complaints</h1>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Manage Complaints</CardTitle>
          <CardDescription>View and manage tenant complaints across your properties</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
            <div className="relative w-full md:max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input
                type="text"
                placeholder="Search by subject or complaint ID"
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
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
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
            {loading ? (
              <div className="flex justify-center items-center py-10">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div>
              </div>
            ) : (
              <table className="w-full">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left">ID</th>
                    <th className="px-4 py-3 text-left">Property</th>
                    <th className="px-4 py-3 text-left">Subject</th>
                    <th className="px-4 py-3 text-left">Date</th>
                    <th className="px-4 py-3 text-left">Priority</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
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
                        <td className="px-4 py-3 whitespace-nowrap">{complaint.id}</td>
                        <td className="px-4 py-3">{complaint.property.name}</td>
                        <td className="px-4 py-3">{complaint.subject}</td>
                        <td className="px-4 py-3 whitespace-nowrap">{formatDate(complaint.dateCreated)}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {getPriorityBadge(complaint.priority)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center">
                            {getStatusIcon(complaint.status)}
                            <span className="ml-2">{getStatusText(complaint.status)}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-right">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-blue-600"
                            onClick={() => viewComplaintDetails(complaint)}
                          >
                            <Eye className="h-4 w-4" />
                            <span className="ml-1">View</span>
                          </Button>
                        </td>
                      </motion.tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-6 py-10 text-center text-gray-500">
                        <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <p>No complaints found</p>
                        <p className="text-sm mt-1">Try adjusting your search criteria</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Complaint Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Complaint Details</DialogTitle>
            <DialogDescription>
              Complaint #{selectedComplaint?.id} - {selectedComplaint?.subject}
            </DialogDescription>
          </DialogHeader>
          
          {selectedComplaint && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Subject</h3>
                  <p className="mt-1 text-sm">{selectedComplaint.subject}</p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Description</h3>
                  <p className="mt-1 text-sm">{selectedComplaint.description}</p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Property</h3>
                  <p className="mt-1 text-sm">
                    {selectedComplaint.property.name} - {selectedComplaint.property.address}
                  </p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Status</h3>
                  <div className="mt-1 flex items-center">
                    {getStatusIcon(selectedComplaint.status)}
                    <span className="ml-2">{getStatusText(selectedComplaint.status)}</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Priority</h3>
                  <div className="mt-1">{getPriorityBadge(selectedComplaint.priority)}</div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Date Submitted</h3>
                  <p className="mt-1 text-sm flex items-center">
                    <Calendar className="h-4 w-4 mr-1 text-gray-400" />
                    {formatDate(selectedComplaint.dateCreated)}
                  </p>
                </div>
                
                {selectedComplaint.dateUpdated && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Last Updated</h3>
                    <p className="mt-1 text-sm flex items-center">
                      <Calendar className="h-4 w-4 mr-1 text-gray-400" />
                      {formatDate(selectedComplaint.dateUpdated)}
                    </p>
                  </div>
                )}
                
                {selectedComplaint.resolutionDetails && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Resolution Details</h3>
                    <p className="mt-1 text-sm">{selectedComplaint.resolutionDetails}</p>
                  </div>
                )}
                
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Attachment</h3>
                  <div className="mt-2">
                    {selectedComplaint.attachement ? (
                      <div className="flex items-center">
                        <FileText className="h-5 w-5 text-gray-400 mr-2" />
                        <span className="text-sm text-gray-600">
                          {selectedComplaint.attachement.split('\\').pop()}
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-500">No attachment</span>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="col-span-1 md:col-span-2 flex justify-end space-x-3 pt-4">
                {selectedComplaint.status.toUpperCase() === 'PENDING' && (
                  <>
                    <Button variant="outline" className="text-yellow-600 border-yellow-600">
                      <Clock className="h-4 w-4 mr-2" />
                      Mark In Progress
                    </Button>
                    <Button variant="outline" className="text-red-600 border-red-600">
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject
                    </Button>
                    <Button variant="outline" className="text-green-600 border-green-600">
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Resolve
                    </Button>
                  </>
                )}
                {selectedComplaint.status.toUpperCase() === 'IN_PROGRESS' && (
                  <>
                    <Button variant="outline" className="text-red-600 border-red-600">
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject
                    </Button>
                    <Button variant="outline" className="text-green-600 border-green-600">
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Resolve
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HandleComplaints;