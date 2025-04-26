import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Send, Plus, X, Check, FileEdit, Trash2, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';

const ComplaintsTable = () => {
  const { toast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [images, setImages] = useState([]);
  const [imagesPreviews, setImagesPreviews] = useState([]);
  const [priority, setPriority] = useState('medium');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [currentComplaint, setCurrentComplaint] = useState(null);
  const apiUrl = import.meta.env.VITE_API_BASE_URL;

  useEffect(() => {
    fetchComplaints();
  }, []);

  const fetchComplaints = async () => {
    setLoading(true);
    try {
      const user = localStorage.getItem('user');
      if (!user) throw new Error('No user found in localStorage');
  
      const userData = JSON.parse(user);
      const token = userData.token;
  
      const response = await fetch(`${apiUrl}/GetComplaintsByTenantId/${userData.id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          accept: '*/*',
        },
      });
  
      if (!response.ok) throw new Error('Failed to fetch complaints');
  
      const data = await response.json();
      setComplaints(data);
    } catch (error) {
      console.error('Error fetching complaints:', error);
      toast({
        title: 'Error',
        description: 'Failed to load complaints',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = (e) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);

      if (images.length + filesArray.length > 3) {
        toast({
          title: 'Maximum 3 images allowed',
          description: 'Please remove some images before adding more.',
          variant: 'destructive',
        });
        return;
      }

      const newImageUrls = filesArray.map((file) => URL.createObjectURL(file));

      setImages([...images, ...filesArray]);
      setImagesPreviews([...imagesPreviews, ...newImageUrls]);
    }
  };

  const removeImage = (index) => {
    const newImages = [...images];
    const newPreviews = [...imagesPreviews];

    URL.revokeObjectURL(newPreviews[index]);

    newImages.splice(index, 1);
    newPreviews.splice(index, 1);

    setImages(newImages);
    setImagesPreviews(newPreviews);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
  
    try {
      const user = localStorage.getItem('user');
      if (!user) throw new Error('No user found in localStorage');
  
      const userData = JSON.parse(user);
      const token = userData.token;
  
      const tenantRes = await fetch(`${apiUrl}/GetTenantById/${userData.id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          accept: '*/*',
        },
      });
  
      if (!tenantRes.ok) throw new Error('Failed to fetch tenant details');
  
      const tenantData = await tenantRes.json();
      const propertyId = tenantData.propertyId || tenantData.PropertyId || 0;
  
      const formData = new FormData();
      formData.append('Subject', subject);
      formData.append('Description', description);
      formData.append('Priority', priority);
      formData.append('Status', 'Pending');
      formData.append('ResolutionDetails', '');
      formData.append('PropertyId', propertyId.toString());
      
      if (images.length === 0) {
        formData.append('file', new Blob([]), '');
      } else {
        images.forEach((image) => {
          formData.append('file', image, image.name);
        });
      } 

      const complaintRes = await fetch(`${apiUrl}/LogTenantComplaint`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });
  
      if (!complaintRes.ok) {
        const contentType = complaintRes.headers.get('content-type');
        let errorMessage = 'Failed to submit complaint';
        
        if (contentType && contentType.includes('application/json')) {
          const errorData = await complaintRes.json();
          console.error('Error data:', errorData);
          if (errorData.errors && errorData.errors.Attachement) {
            errorMessage = errorData.errors.Attachement[0];
          } else if (errorData.message) {
            errorMessage = errorData.message;
          }
        } else {
          const errorText = await complaintRes.text();
          console.error('Error text:', errorText);
          errorMessage = errorText || 'Failed to submit complaint';
        }
        throw new Error(errorMessage);
      }
  
      setSubmitted(true);
      toast({
        title: 'Complaint Submitted',
        description: "Your complaint has been successfully submitted. We'll respond to you soon.",
      });
  
      setSubject('');
      setDescription('');
      setPriority('medium');
      setImages([]);
      setImagesPreviews([]);
      
      fetchComplaints();
  
    } catch (error) {
      console.error('Submission error:', error);
      toast({
        title: 'Submission Failed',
        description: error.message || 'Something went wrong while submitting your complaint.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateComplaint = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
  
    try {
      const user = localStorage.getItem('user');
      if (!user) throw new Error('No user found in localStorage');
  
      const userData = JSON.parse(user);
      const token = userData.token;
  
      const updateData = {
        subject: subject,
        description: description,
        priority: priority,
        status: currentComplaint.status,
        resolutionDetails: currentComplaint.resolutionDetails,
        propertyId: currentComplaint.propertyId
      };
  
      const response = await fetch(`${apiUrl}/UpdateTenantComplaint/${currentComplaint.id}`, {
        method: 'PUT',
        headers: {
          'accept': '*/*',
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });
  
      if (!response.ok) throw new Error('Failed to update complaint');
  
      toast({
        title: 'Complaint Updated',
        description: "Your complaint has been successfully updated.",
      });
  
      setIsEditModalOpen(false);
      fetchComplaints();
  
    } catch (error) {
      console.error('Update error:', error);
      toast({
        title: 'Update Failed',
        description: error.message || 'Something went wrong while updating your complaint.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteComplaint = async (complaintId) => {
    try {
      const user = localStorage.getItem('user');
      if (!user) throw new Error('No user found in localStorage');
  
      const userData = JSON.parse(user);
      const token = userData.token;
  
      const response = await fetch(`${apiUrl}/DeleteTenantComplaint/${complaintId}`, {
        method: 'DELETE',
        headers: {
          'accept': '*/*',
          'Authorization': `Bearer ${token}`,
        },
      });
  
      if (!response.ok) throw new Error('Failed to delete complaint');
  
      toast({
        title: 'Complaint Deleted',
        description: "Your complaint has been successfully deleted.",
      });
  
      fetchComplaints();
  
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: 'Delete Failed',
        description: error.message || 'Something went wrong while deleting your complaint.',
        variant: 'destructive',
      });
    }
  };

  const resetModal = () => {
    setSubject('');
    setDescription('');
    setPriority('medium');
    setImages([]);
    setImagesPreviews([]);
    setSubmitted(false);
    setCurrentComplaint(null);
  };

  const openModal = () => {
    resetModal();
    setIsModalOpen(true);
  };

  const openEditModal = (complaint) => {
    setCurrentComplaint(complaint);
    setSubject(complaint.subject);
    setDescription(complaint.description);
    setPriority(complaint.priority.toLowerCase());
    setIsEditModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setIsEditModalOpen(false);
    setTimeout(resetModal, 300);
  };

  const getPriorityBadge = (priority) => {
    const colors = {
      low: "bg-blue-100 text-blue-800",
      medium: "bg-yellow-100 text-yellow-800", 
      high: "bg-red-100 text-red-800"
    };
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[priority.toLowerCase()]}`}>
        {priority}
      </span>
    );
  };

  const getStatusBadge = (status) => {
    const colors = {
      pending: "bg-yellow-100 text-yellow-800",
      inprogress: "bg-blue-100 text-blue-800",
      resolved: "bg-green-100 text-green-800",
      rejected: "bg-red-100 text-red-800"
    };
    
    const statusKey = status.toLowerCase().replace(/\s+/g, '');
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[statusKey] || "bg-gray-100 text-gray-800"}`}>
        {status}
      </span>
    );
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  };

  const extractFilename = (path) => {
    if (!path) return "No attachment";
    const parts = path.split('\\');
    return parts[parts.length - 1];
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Complaints</h1>
        <Button onClick={openModal}>
          <Plus className="mr-2 h-4 w-4" />
          New Complaint
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Subject</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Property</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10">
                  Loading complaints...
                </TableCell>
              </TableRow>
            ) : complaints.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10">
                  No complaints found. Create your first complaint.
                </TableCell>
              </TableRow>
            ) : (
              complaints.map((complaint) => (
                <TableRow key={complaint.id}>
                  <TableCell className="font-medium">{complaint.subject}</TableCell>
                  <TableCell className="font-medium">{complaint.description}</TableCell>
                  <TableCell>{formatDate(complaint.dateCreated)}</TableCell>
                  <TableCell>{getPriorityBadge(complaint.priority)}</TableCell>
                  <TableCell>{getStatusBadge(complaint.status)}</TableCell>
                  <TableCell>{complaint.property?.name || "Unknown"}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="h-4 w-4"
                          >
                            <circle cx="12" cy="12" r="1" />
                            <circle cx="12" cy="5" r="1" />
                            <circle cx="12" cy="19" r="1" />
                          </svg>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {complaint.status === 'PENDING' && (
                          <>
                            <DropdownMenuItem onClick={() => openEditModal(complaint)}>
                              <FileEdit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDeleteComplaint(complaint.id)}
                              className="text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="w-full md:max-w-6xl">
          <DialogHeader>
            <DialogTitle>Submit a Complaint</DialogTitle>
          </DialogHeader>
          
          {submitted ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center text-center py-6"
            >
              <div className="bg-green-100 rounded-full p-4 mb-4">
                <Check className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Complaint Submitted Successfully!</h3>
              <p className="text-gray-600 max-w-md mb-6">
                Thank you for submitting your complaint. It has been recorded and will be addressed as soon as possible.
              </p>
              <Button onClick={closeModal}>Close</Button>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Subject</label>
                <Input
                  type="text"
                  placeholder="Enter the subject of your complaint"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  placeholder="Please describe your issue in detail..."
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  className="resize-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Priority</label>
                <div className="flex gap-4">
                  {['low', 'medium', 'high'].map((level) => (
                    <label key={level} className="flex items-center">
                      <input
                        type="radio"
                        name="priority"
                        value={level}
                        checked={priority === level}
                        onChange={() => setPriority(level)}
                        className="mr-2"
                      />
                      <span>{level.charAt(0).toUpperCase() + level.slice(1)}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Attach Images (Optional)</label>
                <div className="border-2 border-dashed rounded-lg p-4 text-center">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    multiple
                    className="hidden"
                    id="image-upload"
                  />
                  <label
                    htmlFor="image-upload"
                    className="flex flex-col items-center justify-center cursor-pointer"
                  >
                    <Plus className="h-6 w-6 text-gray-400 mb-2" />
                    <span className="text-gray-600">Click to upload images</span>
                    <span className="text-gray-400 text-sm mt-1">Maximum 3 images</span>
                  </label>
                </div>

                {imagesPreviews.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {imagesPreviews.map((url, index) => (
                      <div key={index} className="relative">
                        <img
                          src={url}
                          alt={`Upload ${index + 1}`}
                          className="h-16 w-16 object-cover rounded-lg border"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-sm"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <DialogFooter className="mt-4">
                <Button type="button" variant="outline" onClick={closeModal}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <span>Submitting...</span>
                  ) : (
                    <span className="flex items-center">
                      <Send className="mr-2 h-4 w-4" />
                      Submit Complaint
                    </span>
                  )}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>


      {/* Edit Complaint Dialog */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="w-full max-w-6xl">
          <DialogHeader>
            <DialogTitle>Edit Complaint</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleUpdateComplaint} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Subject</label>
              <Input
                type="text"
                placeholder="Enter the subject of your complaint"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Textarea
                placeholder="Please describe your issue in detail..."
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                className="resize-none"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Priority</label>
              <div className="flex gap-4">
                {['low', 'medium', 'high'].map((level) => (
                  <label key={level} className="flex items-center">
                    <input
                      type="radio"
                      name="priority"
                      value={level}
                      checked={priority === level}
                      onChange={() => setPriority(level)}
                      className="mr-2"
                    />
                    <span>{level.charAt(0).toUpperCase() + level.slice(1)}</span>
                  </label>
                ))}
              </div>
            </div>

            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={closeModal}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <span>Updating...</span>
                ) : (
                  <span className="flex items-center">
                    <Send className="mr-2 h-4 w-4" />
                    Update Complaint
                  </span>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ComplaintsTable;