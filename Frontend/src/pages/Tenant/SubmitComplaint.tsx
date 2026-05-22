import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Send, Plus, X, Check, FileEdit, Trash2, Loader2,
  MessageSquare, AlertCircle, Clock, CheckCircle, XCircle,
  AlertTriangle, Upload, Calendar, Home, Flag,
} from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { DataTable, Column } from '@/components/ui/data-table';

interface Complaint {
  id: number;
  subject: string;
  description: string;
  dateCreated: string;
  priority: string;
  status: string;
  resolutionDetails: string;
  propertyId: number;
  property?: { name: string };
}

const inputCls =
  'border-[#E2E8F0] focus:border-[#1D4ED8] focus-visible:ring-[#1D4ED8]/10 text-[#0F172A] placeholder:text-[#94A3B8]';

const PriorityBadge = ({ priority }: { priority: string }) => {
  const p = priority.toLowerCase();
  if (p === 'high')
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">
        <Flag className="h-2.5 w-2.5" />High
      </span>
    );
  if (p === 'low')
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
        <Flag className="h-2.5 w-2.5" />Low
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
      <Flag className="h-2.5 w-2.5" />Medium
    </span>
  );
};

const StatusBadge = ({ status }: { status: string }) => {
  const s = status.toLowerCase().replace(/\s+/g, '');
  if (s === 'resolved')
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
        <CheckCircle className="h-3 w-3" />Resolved
      </span>
    );
  if (s === 'inprogress')
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
        <Clock className="h-3 w-3" />In Progress
      </span>
    );
  if (s === 'rejected')
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">
        <XCircle className="h-3 w-3" />Rejected
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
      <AlertCircle className="h-3 w-3" />Pending
    </span>
  );
};

const PrioritySelector = ({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) => {
  const options = [
    { key: 'low', label: 'Low', active: 'bg-emerald-600 text-white border-emerald-600', idle: 'border-[#E2E8F0] text-slate-600 hover:border-emerald-400 hover:text-emerald-600' },
    { key: 'medium', label: 'Medium', active: 'bg-amber-500 text-white border-amber-500', idle: 'border-[#E2E8F0] text-slate-600 hover:border-amber-400 hover:text-amber-600' },
    { key: 'high', label: 'High', active: 'bg-red-600 text-white border-red-600', idle: 'border-[#E2E8F0] text-slate-600 hover:border-red-400 hover:text-red-600' },
  ];
  return (
    <div className="flex gap-2">
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          onClick={() => onChange(o.key)}
          className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${value === o.key ? o.active : o.idle}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
};

const ComplaintsTable = () => {
  const { toast } = useToast();
  const apiUrl = import.meta.env.VITE_API_BASE_URL;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Complaint | null>(null);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [imagesPreviews, setImagesPreviews] = useState<string[]>([]);
  const [priority, setPriority] = useState('medium');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [currentComplaint, setCurrentComplaint] = useState<Complaint | null>(null);

  useEffect(() => { fetchComplaints(); }, []);

  const getAuth = () => {
    const user = localStorage.getItem('user');
    if (!user) throw new Error('No user found');
    const userData = JSON.parse(user);
    return { userData, token: userData.token };
  };

  const fetchComplaints = async () => {
    setIsLoading(true);
    try {
      const { userData, token } = getAuth();
      const res = await fetch(`${apiUrl}/GetComplaintsByTenantId/${userData.id}`, {
        headers: { Authorization: `Bearer ${token}`, accept: '*/*' },
      });
      if (!res.ok) throw new Error('Failed to fetch complaints');
      setComplaints(await res.json());
    } catch (error: any) {
      toast({ title: 'Error', description: 'Failed to load complaints', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const filesArray = Array.from(e.target.files);
    if (images.length + filesArray.length > 3) {
      toast({ title: 'Maximum 3 images allowed', description: 'Remove some images first.', variant: 'destructive' });
      return;
    }
    setImages([...images, ...filesArray]);
    setImagesPreviews([...imagesPreviews, ...filesArray.map((f) => URL.createObjectURL(f))]);
  };

  const removeImage = (index: number) => {
    URL.revokeObjectURL(imagesPreviews[index]);
    setImages(images.filter((_, i) => i !== index));
    setImagesPreviews(imagesPreviews.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const { userData, token } = getAuth();
      const tenantRes = await fetch(`${apiUrl}/GetTenantById/${userData.id}`, {
        headers: { Authorization: `Bearer ${token}`, accept: '*/*' },
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
        images.forEach((img) => formData.append('file', img, img.name));
      }

      const res = await fetch(`${apiUrl}/LogTenantComplaint`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!res.ok) {
        const ct = res.headers.get('content-type');
        let msg = 'Failed to submit complaint';
        if (ct?.includes('application/json')) {
          const err = await res.json();
          msg = err.errors?.Attachement?.[0] || err.message || msg;
        } else {
          msg = (await res.text()) || msg;
        }
        throw new Error(msg);
      }

      setSubmitted(true);
      toast({ title: 'Complaint Submitted', description: "We'll respond to you soon." });
      setSubject(''); setDescription(''); setPriority('medium');
      setImages([]); setImagesPreviews([]);
      fetchComplaints();
    } catch (error: any) {
      toast({ title: 'Submission Failed', description: error.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentComplaint) return;
    setIsSubmitting(true);
    try {
      const { token } = getAuth();
      const res = await fetch(`${apiUrl}/UpdateTenantComplaint/${currentComplaint.id}`, {
        method: 'PUT',
        headers: { accept: '*/*', Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject, description, priority,
          status: currentComplaint.status,
          resolutionDetails: currentComplaint.resolutionDetails,
          propertyId: currentComplaint.propertyId,
        }),
      });
      if (!res.ok) throw new Error('Failed to update complaint');
      toast({ title: 'Complaint Updated', description: 'Your complaint has been updated.' });
      setIsEditModalOpen(false);
      fetchComplaints();
    } catch (error: any) {
      toast({ title: 'Update Failed', description: error.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const { token } = getAuth();
      const res = await fetch(`${apiUrl}/DeleteTenantComplaint/${deleteTarget.id}`, {
        method: 'DELETE',
        headers: { accept: '*/*', Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to delete complaint');
      toast({ title: 'Complaint Deleted', description: 'Your complaint has been removed.' });
      setDeleteTarget(null);
      fetchComplaints();
    } catch (error: any) {
      toast({ title: 'Delete Failed', description: error.message, variant: 'destructive' });
    }
  };

  const resetModal = () => {
    setSubject(''); setDescription(''); setPriority('medium');
    setImages([]); setImagesPreviews([]); setSubmitted(false); setCurrentComplaint(null);
  };

  const openModal = () => { resetModal(); setIsModalOpen(true); };
  const openEditModal = (c: Complaint) => {
    setCurrentComplaint(c); setSubject(c.subject);
    setDescription(c.description); setPriority(c.priority.toLowerCase());
    setIsEditModalOpen(true);
  };
  const closeModal = () => {
    setIsModalOpen(false); setIsEditModalOpen(false);
    setTimeout(resetModal, 300);
  };

  const formatDate = (d: string) =>
    new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(d));

  const filtered = complaints.filter(
    (c) =>
      !searchValue ||
      c.subject.toLowerCase().includes(searchValue.toLowerCase()) ||
      c.description.toLowerCase().includes(searchValue.toLowerCase()) ||
      c.status.toLowerCase().includes(searchValue.toLowerCase())
  );

  // Stats
  const total = complaints.length;
  const pending = complaints.filter((c) => c.status.toLowerCase() === 'pending').length;
  const inProgress = complaints.filter((c) => c.status.toLowerCase().replace(/\s+/g, '') === 'inprogress').length;
  const resolved = complaints.filter((c) => c.status.toLowerCase() === 'resolved').length;

  const columns: Column<Complaint>[] = [
    {
      key: 'subject',
      header: 'Subject',
      cell: (row) => (
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
            <MessageSquare className="h-4 w-4 text-blue-600" />
          </div>
          <span className="text-sm font-semibold text-[#0F172A]">{row.subject}</span>
        </div>
      ),
    },
    {
      key: 'description',
      header: 'Description',
      className: 'max-w-[180px]',
      cell: (row) => (
        <span className="text-sm text-slate-600 truncate block max-w-[180px]" title={row.description}>
          {row.description}
        </span>
      ),
    },
    {
      key: 'dateCreated',
      header: 'Date',
      cell: (row) => (
        <div className="flex items-center gap-1.5 text-sm text-slate-600">
          <Calendar className="h-3.5 w-3.5 text-slate-400" />
          {formatDate(row.dateCreated)}
        </div>
      ),
    },
    {
      key: 'priority',
      header: 'Priority',
      cell: (row) => <PriorityBadge priority={row.priority} />,
    },
    {
      key: 'status',
      header: 'Status',
      cell: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'property',
      header: 'Property',
      cell: (row) => (
        <div className="flex items-center gap-1.5 text-sm text-[#0F172A]">
          <Home className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
          {row.property?.name || '—'}
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      headerClassName: 'text-right',
      className: 'text-right',
      cell: (row) =>
        row.status.toUpperCase() === 'PENDING' ? (
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => openEditModal(row)}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-[#1D4ED8] transition-colors"
              title="Edit"
            >
              <FileEdit className="h-4 w-4" />
            </button>
            <button
              onClick={() => setDeleteTarget(row)}
              className="p-1.5 rounded-lg hover:bg-red-50 text-slate-500 hover:text-red-600 transition-colors"
              title="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <span className="text-xs text-slate-400 pr-2">—</span>
        ),
    },
  ];

  const ComplaintForm = ({ onSubmit, submitLabel }: { onSubmit: (e: React.FormEvent) => void; submitLabel: string }) => (
    <form onSubmit={onSubmit} className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
      <div className="space-y-1.5">
        <label className="text-xs uppercase tracking-wider text-slate-400 font-medium">Subject *</label>
        <Input
          placeholder="Enter the subject of your complaint"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          required
          className={inputCls}
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs uppercase tracking-wider text-slate-400 font-medium">Description *</label>
        <Textarea
          placeholder="Please describe your issue in detail..."
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          className={`resize-none ${inputCls}`}
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs uppercase tracking-wider text-slate-400 font-medium">Priority</label>
        <PrioritySelector value={priority} onChange={setPriority} />
      </div>

      {onSubmit === handleSubmit && (
        <div className="space-y-1.5">
          <label className="text-xs uppercase tracking-wider text-slate-400 font-medium">Attachments (optional, max 3)</label>
          <div className={`rounded-xl border-2 border-dashed ${images.length > 0 ? 'border-[#1D4ED8]/30 bg-blue-50/20' : 'border-[#E2E8F0] bg-slate-50 hover:border-[#1D4ED8] hover:bg-blue-50/10'} transition-colors`}>
            <label htmlFor="image-upload" className="flex flex-col items-center justify-center py-6 cursor-pointer">
              <div className="h-10 w-10 rounded-xl bg-white border border-[#E2E8F0] flex items-center justify-center mb-2 shadow-sm">
                <Upload className="h-4 w-4 text-slate-400" />
              </div>
              <span className="text-xs text-[#1D4ED8] font-medium">Click to upload images</span>
              <span className="text-[10px] text-slate-400 mt-0.5">PNG, JPG, WEBP — max 3 files</span>
            </label>
            <input
              id="image-upload"
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageUpload}
              className="hidden"
            />
          </div>
          {imagesPreviews.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {imagesPreviews.map((url, i) => (
                <div key={i} className="relative">
                  <img src={url} alt={`Upload ${i + 1}`} className="h-16 w-16 object-cover rounded-lg border border-[#E2E8F0]" />
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    className="absolute -top-1.5 -right-1.5 h-5 w-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex justify-end gap-3 pt-2 border-t border-[#E2E8F0]">
        <button
          type="button"
          onClick={closeModal}
          className="px-4 py-2 rounded-lg text-sm font-medium border border-[#E2E8F0] text-slate-600 hover:bg-slate-50 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="btn-grid inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-[#1D4ED8] text-white hover:bg-blue-700 disabled:opacity-60 transition-colors"
        >
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {submitLabel}
        </button>
      </div>
    </form>
  );

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <div className="relative rounded-2xl overflow-hidden p-6 md:p-8" style={{ background: "linear-gradient(135deg, #0a0f1e 0%, #0f2044 45%, #1a3a6e 100%)" }}>
        <div className="absolute inset-0 pointer-events-none opacity-[0.04]"
          style={{ backgroundImage: "linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)", backgroundSize: "40px 40px" }} />
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute bottom-4 right-32 h-24 w-24 rounded-full bg-blue-300/10 blur-xl" />
        </div>
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="h-8 w-8 rounded-lg bg-white/10 flex items-center justify-center">
                <MessageSquare className="h-4 w-4 text-white" />
              </div>
              <span className="text-blue-200 text-sm font-medium">Tenant Support</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">Complaints</h1>
            <p className="text-blue-200 text-sm mt-1">Log issues, track their status, and update pending complaints.</p>
            <div className="flex items-center gap-3 mt-3 flex-wrap">
              {[
                { label: 'Total', value: total },
                { label: 'Pending', value: pending },
                { label: 'In Progress', value: inProgress },
                { label: 'Resolved', value: resolved },
              ].map((s) => (
                <div key={s.label} className="flex items-center gap-1.5 bg-white/10 rounded-lg px-3 py-1.5">
                  <span className="text-white font-bold text-sm">{s.value}</span>
                  <span className="text-blue-200 text-xs">{s.label}</span>
                </div>
              ))}
            </div>
          </div>
          <button
            onClick={openModal}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-[#1D4ED8] text-sm font-semibold hover:bg-blue-50 transition-colors shadow-lg self-start md:self-auto"
          >
            <Plus className="h-4 w-4" />New Complaint
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Complaints', value: total, Icon: MessageSquare, border: 'border-l-blue-500', bg: 'bg-blue-50', color: 'text-blue-600' },
          { label: 'Pending', value: pending, Icon: AlertCircle, border: 'border-l-amber-500', bg: 'bg-amber-50', color: 'text-amber-600' },
          { label: 'In Progress', value: inProgress, Icon: Clock, border: 'border-l-blue-400', bg: 'bg-blue-50', color: 'text-blue-500' },
          { label: 'Resolved', value: resolved, Icon: CheckCircle, border: 'border-l-emerald-500', bg: 'bg-emerald-50', color: 'text-emerald-600' },
        ].map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className={`bg-white rounded-xl border border-[#E2E8F0] border-l-4 ${card.border} p-4 flex items-center gap-3`}
          >
            <div className={`h-10 w-10 rounded-lg ${card.bg} flex items-center justify-center flex-shrink-0`}>
              <card.Icon className={`h-5 w-5 ${card.color}`} />
            </div>
            <div>
              <p className="text-xs text-slate-500">{card.label}</p>
              <p className={`text-2xl font-bold mt-0.5 ${card.color}`}>{card.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] p-4">
        <DataTable
          data={filtered}
          columns={columns}
          loading={isLoading}
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          searchPlaceholder="Search complaints..."
          label="complaint"
          emptyMessage="No complaints found. Create your first complaint."
          emptyIcon={<MessageSquare className="h-10 w-10" />}
        />
      </div>

      {/* New Complaint Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeModal} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
          >
            <div className="bg-gradient-to-r from-[#0F172A] to-[#1D4ED8] px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">Submit a Complaint</h2>
                <p className="text-blue-200 text-xs mt-0.5">Describe your issue and we'll get back to you</p>
              </div>
              <button onClick={closeModal} className="text-white/60 hover:text-white transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            {submitted ? (
              <motion.div
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center text-center py-14 px-6"
              >
                <div className="h-20 w-20 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
                  <Check className="h-10 w-10 text-emerald-600" />
                </div>
                <h3 className="text-xl font-bold text-[#0F172A] mb-2">Complaint Submitted!</h3>
                <p className="text-slate-500 text-sm max-w-xs">
                  Your complaint has been recorded and will be addressed as soon as possible.
                </p>
                <button
                  onClick={closeModal}
                  className="btn-grid mt-6 px-5 py-2.5 rounded-xl bg-[#1D4ED8] text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
                >
                  Close
                </button>
              </motion.div>
            ) : (
              <ComplaintForm onSubmit={handleSubmit} submitLabel="Submit Complaint" />
            )}
          </motion.div>
        </div>
      )}

      {/* Edit Complaint Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeModal} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
          >
            <div className="bg-gradient-to-r from-[#0F172A] to-[#1D4ED8] px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">Edit Complaint</h2>
                <p className="text-blue-200 text-xs mt-0.5">Update your pending complaint</p>
              </div>
              <button onClick={closeModal} className="text-white/60 hover:text-white transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            <ComplaintForm onSubmit={handleUpdate} submitLabel="Update Complaint" />
          </motion.div>
        </div>
      )}

      {/* Delete Confirmation */}
      {!!deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDeleteTarget(null)} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
          >
            <div className="bg-gradient-to-r from-red-600 to-red-500 px-6 py-4 flex items-center gap-3">
              <AlertTriangle className="h-6 w-6 text-white flex-shrink-0" />
              <div>
                <h2 className="text-lg font-bold text-white">Delete Complaint</h2>
                <p className="text-red-100 text-xs mt-0.5">This action is permanent</p>
              </div>
            </div>
            <div className="p-6">
              <p className="text-slate-600 text-sm">
                Are you sure you want to delete the complaint{' '}
                <strong className="text-[#0F172A]">"{deleteTarget.subject}"</strong>? This cannot be undone.
              </p>
            </div>
            <div className="px-6 py-4 border-t border-[#E2E8F0] flex justify-end gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-lg text-sm font-medium border border-[#E2E8F0] text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="btn-grid px-4 py-2 rounded-lg text-sm font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default ComplaintsTable;
