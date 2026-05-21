import { useState } from 'react';
import { Property } from '@/types/property';
import { Bed, Bath, Square, MapPin, X, Calendar, MessageSquare, CheckCircle2, Loader2, ChevronRight } from 'lucide-react';
import axios from 'axios';

interface PropertyDetailModalProps {
  property: Property;
  formatCurrency: (amount: number) => string;
  onClose: () => void;
}

const PropertyDetailModal = ({ property, formatCurrency, onClose }: PropertyDetailModalProps) => {
  const [showForm, setShowForm] = useState(false);
  const [preferredDate, setPreferredDate] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const userData = JSON.parse(localStorage.getItem('user') ?? '{}');
  const token = userData?.token;
  const apiUrl = import.meta.env.VITE_API_BASE_URL;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await axios.post(
        `${apiUrl}/RequestViewing`,
        {
          propertyId: property.id,
          tenantId: userData.id,
          tenantName: userData.fullName ?? '',
          tenantEmail: userData.email ?? '',
          tenantPhone: userData.phoneNumber ?? '',
          preferredDate: new Date(preferredDate).toISOString(),
          message,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSubmitted(true);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to submit request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 1);
  const minDateStr = minDate.toISOString().split('T')[0];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white rounded-t-2xl z-10">
          <div>
            <h2 className="text-lg font-bold text-slate-900" style={{ fontFamily: "'Playfair Display', serif" }}>
              {property.name}
            </h2>
            <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
              <MapPin className="h-3 w-3" />{property.address}
            </p>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-slate-100 text-slate-500 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
          {/* Left — images */}
          <div className="p-6 border-r border-slate-100">
            <div className="relative h-72 rounded-xl overflow-hidden mb-3">
              <img
                src={property.images[0]}
                alt={property.name}
                className="w-full h-full object-cover"
                onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6?w=800&auto=format&fit=crop&q=60'; }}
              />
              <div className="absolute top-3 left-3 rounded-full px-2.5 py-1 text-[11px] font-semibold bg-white/90 text-slate-700">
                {property.type}
              </div>
            </div>
            {property.images.length > 1 && (
              <div className="grid grid-cols-3 gap-2">
                {property.images.slice(1, 4).map((img, i) => (
                  <div key={i} className="h-20 rounded-lg overflow-hidden">
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            )}
            {/* Description */}
            {property.description && (
              <p className="mt-4 text-sm text-slate-500 leading-relaxed">{property.description}</p>
            )}
          </div>

          {/* Right — details + form */}
          <div className="p-6 flex flex-col gap-5">
            {/* Price */}
            <div>
              <p className="text-2xl font-bold text-[#1d4ed8]">
                {formatCurrency(property.rentAmount)}
                <span className="text-sm font-normal text-slate-400 ml-1">/ month</span>
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { icon: Bed, label: 'Rooms', value: property.bedrooms || '—' },
                { icon: Bath, label: 'Bathrooms', value: property.bathrooms || '—' },
                { icon: Square, label: 'Area', value: property.area ? `${property.area} m²` : '—' },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex flex-col items-center rounded-xl bg-slate-50 py-3 px-2">
                  <Icon className="h-4 w-4 text-slate-400 mb-1" />
                  <p className="text-sm font-semibold text-slate-800">{value}</p>
                  <p className="text-[10px] text-slate-400">{label}</p>
                </div>
              ))}
            </div>

            {/* Amenities */}
            {property.amenities.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2">Amenities</p>
                <div className="flex flex-wrap gap-1.5">
                  {property.amenities.map((a, i) => (
                    <span key={i} className="px-2 py-0.5 rounded-full text-[11px] bg-blue-50 text-blue-700 border border-blue-100">
                      {a}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Landlord */}
            {property.landlord && (
              <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-4 py-3">
                <div className="h-8 w-8 rounded-lg bg-[#1d4ed8] flex items-center justify-center text-white text-xs font-bold shrink-0">
                  {property.landlord.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="text-xs text-slate-400">Landlord</p>
                  <p className="text-sm font-semibold text-slate-800">{property.landlord}</p>
                </div>
              </div>
            )}

            {/* ── Request Viewing Section ── */}
            {submitted ? (
              <div className="flex flex-col items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-5 text-center">
                <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                <p className="text-sm font-semibold text-emerald-800">Viewing Request Sent!</p>
                <p className="text-xs text-emerald-600">The landlord will contact you to confirm your preferred date.</p>
                <button onClick={onClose} className="mt-2 text-xs font-medium text-emerald-700 underline">Close</button>
              </div>
            ) : !showForm ? (
              <button
                onClick={() => setShowForm(true)}
                className="flex items-center justify-center gap-2 w-full rounded-xl py-3 text-sm font-semibold text-white transition-all"
                style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)', boxShadow: '0 4px 14px rgba(29,78,216,0.30)' }}
              >
                <Calendar className="h-4 w-4" />
                Request Viewing
                <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border border-slate-200 p-4 bg-slate-50">
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Schedule a Viewing</p>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600 flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> Preferred Date
                  </label>
                  <input
                    type="date"
                    required
                    min={minDateStr}
                    value={preferredDate}
                    onChange={e => setPreferredDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/10 transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600 flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" /> Message (optional)
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Any specific questions or requirements..."
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/10 transition-all resize-none"
                  />
                </div>

                {error && (
                  <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
                )}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="flex-1 rounded-lg border border-slate-200 bg-white py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !preferredDate}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold text-white disabled:opacity-60 transition-all"
                    style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)' }}
                  >
                    {submitting ? <><Loader2 className="h-3 w-3 animate-spin" />Sending…</> : 'Submit Request'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PropertyDetailModal;
