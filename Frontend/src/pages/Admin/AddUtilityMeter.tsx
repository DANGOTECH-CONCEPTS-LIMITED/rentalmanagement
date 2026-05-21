import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Cable, MapPin, UserRound, Waves } from 'lucide-react';

const inputCls =
  'h-11 w-full rounded-xl border border-[#E2E8F0] bg-white px-3.5 text-sm text-[#0F172A] placeholder:text-[#94A3B8] shadow-sm outline-none transition-all focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/10';
const selCls =
  'h-11 w-full rounded-xl border border-[#E2E8F0] bg-white px-3.5 text-sm text-[#0F172A] shadow-sm outline-none transition-all focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/10 cursor-pointer';

const meterSchema = z.object({
  meterType: z.string().min(1, { message: 'Meter type is required' }),
  meterNumber: z.string().min(1, { message: 'Meter number is required' }),
  nwscAccount: z.string().min(1, { message: 'NWSC account is required' }),
  locationOfNwscMeter: z.string().min(1, { message: 'Location of NWSC meter is required' }),
  landLordId: z.string().min(1, { message: 'Landlord selection is required' }),
});

interface User {
  id: string;
  fullName: string;
  email: string;
  systemRole: {
    id: number;
    name: string;
  };
  verified: boolean;
}

const AddUtilityMeter = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [landlordSearch, setLandlordSearch] = useState('');
  const [showLandlordDrop, setShowLandlordDrop] = useState(false);
  const { toast } = useToast();

  let token = '';
  try {
    const user = localStorage.getItem('user');
    if (user) {
      const userData = JSON.parse(user);
      token = userData.token;
    } else {
      console.error('No user found in localStorage');
    }
  } catch (error) {
    console.error('Error parsing user data:', error);
  }

  const apiUrl = import.meta.env.VITE_API_BASE_URL;

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<z.infer<typeof meterSchema>>({
    resolver: zodResolver(meterSchema),
    defaultValues: {
      meterType: '',
      meterNumber: '',
      nwscAccount: '',
      locationOfNwscMeter: '',
      landLordId: '',
    },
  });

  const watchedLandLordId = watch('landLordId');

  useEffect(() => {
    setIsLoadingUsers(true);
    axios
      .get(`${apiUrl}/GetAllUsers`, {
        headers: {
          accept: '*/*',
          Authorization: `Bearer ${token}`,
        },
      })
      .then((res) => {
        setUsers(res.data);
      })
      .catch(() => {
        toast({
          title: 'Error',
          description: 'Failed to fetch users',
          variant: 'destructive',
        });
      })
      .finally(() => setIsLoadingUsers(false));
  }, [apiUrl, token, toast]);

  const selectableUsers = useMemo(
    () =>
      users
        .filter((user) => {
          const normalizedRole = user.systemRole?.name?.trim().toLowerCase() ?? '';
          return (
            normalizedRole === 'landlord' ||
            normalizedRole === 'utility payment' ||
            normalizedRole === 'utililty payment'
          );
        })
        .sort((left, right) => left.fullName.localeCompare(right.fullName)),
    [users]
  );

  const filteredLandlords = useMemo(
    () =>
      selectableUsers.filter((u) =>
        u.fullName.toLowerCase().includes(landlordSearch.toLowerCase())
      ),
    [selectableUsers, landlordSearch]
  );

  const selectedUser = useMemo(
    () => selectableUsers.find((user) => user.id.toString() === watchedLandLordId),
    [watchedLandLordId, selectableUsers]
  );

  const onSubmit = async (values: z.infer<typeof meterSchema>) => {
    setIsSubmitting(true);
    try {
      const payload = {
        meterType: values.meterType,
        meterNumber: values.meterNumber,
        nwscAccount: values.nwscAccount,
        locationOfNwscMeter: values.locationOfNwscMeter,
        landLordId: Number(values.landLordId),
      };

      await axios.post(`${apiUrl}/AddUtilityMeter`, payload, {
        headers: {
          accept: '*/*',
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      toast({
        title: 'Success',
        description: 'Utility meter added successfully',
      });

      reset();
      setLandlordSearch('');
    } catch (error) {
      let errorMessage = 'Failed to add utility meter';
      if (axios.isAxiosError(error)) {
        errorMessage = error.response?.data?.message || errorMessage;
      }
      toast({
        variant: 'destructive',
        title: 'Error',
        description: errorMessage,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0F172A] via-[#1E3A5F] to-[#1D4ED8] px-8 py-8 text-white shadow-xl">
        <div className="pointer-events-none absolute -right-10 -top-10 h-56 w-56 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute -bottom-8 left-1/3 h-40 w-40 rounded-full bg-white/5" />
        <div className="relative space-y-2">
          <span className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-blue-200">
            Utilities
          </span>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Add Utility Meter</h1>
          <p className="text-sm text-blue-200/80">
            Register a meter against the correct landlord with a cleaner, more balanced form layout.
          </p>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        {/* Form Panel */}
        <div className="rounded-2xl border border-[#E2E8F0] bg-white shadow-sm overflow-hidden">
          <div className="border-b border-[#E2E8F0] bg-slate-50/60 px-6 py-4 flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100">
              <Cable className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#0F172A]">Meter Details</h3>
              <p className="text-xs text-[#64748B]">Fill in the fields below to register a utility meter.</p>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">
            {/* Landlord Searchable Dropdown */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                Landlord / User *
              </label>
              <div className="relative">
                <input
                  className={inputCls}
                  placeholder={isLoadingUsers ? 'Loading users...' : 'Search landlord or utility payment user...'}
                  value={landlordSearch || (selectedUser ? `${selectedUser.fullName} (${selectedUser.systemRole?.name ?? 'User'})` : '')}
                  onChange={(e) => {
                    setLandlordSearch(e.target.value);
                    setShowLandlordDrop(true);
                    if (!e.target.value) {
                      setValue('landLordId', '');
                    }
                  }}
                  onFocus={() => setShowLandlordDrop(true)}
                  onBlur={() => setTimeout(() => setShowLandlordDrop(false), 150)}
                  disabled={isLoadingUsers}
                />
                {showLandlordDrop && filteredLandlords.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full rounded-xl border border-[#E2E8F0] bg-white shadow-lg max-h-48 overflow-y-auto">
                    {filteredLandlords.map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        onMouseDown={() => {
                          setValue('landLordId', u.id.toString());
                          setLandlordSearch('');
                          setShowLandlordDrop(false);
                        }}
                        className="w-full px-4 py-2.5 text-left text-sm text-[#0F172A] hover:bg-slate-50 transition-colors"
                      >
                        <span className="font-medium">{u.fullName}</span>
                        <span className="ml-2 text-xs text-[#64748B]">
                          ({u.systemRole?.name ?? 'User'})
                          {u.verified ? ' • Verified' : ''}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {errors.landLordId && (
                <p className="text-xs text-red-500">{errors.landLordId.message}</p>
              )}
              <p className="text-xs text-[#94A3B8]">
                Search and select only landlord and utility payment users.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              {/* Meter Type */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                  Meter Type *
                </label>
                <input
                  className={inputCls}
                  placeholder="e.g., Electricity, Water"
                  {...register('meterType')}
                />
                {errors.meterType && (
                  <p className="text-xs text-red-500">{errors.meterType.message}</p>
                )}
              </div>

              {/* Meter Number */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                  Meter Number *
                </label>
                <input
                  className={inputCls}
                  placeholder="Enter meter number"
                  {...register('meterNumber')}
                />
                {errors.meterNumber && (
                  <p className="text-xs text-red-500">{errors.meterNumber.message}</p>
                )}
              </div>

              {/* NWSC Account */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                  NWSC Account *
                </label>
                <input
                  className={inputCls}
                  placeholder="Enter NWSC account number"
                  {...register('nwscAccount')}
                />
                {errors.nwscAccount && (
                  <p className="text-xs text-red-500">{errors.nwscAccount.message}</p>
                )}
              </div>

              {/* Location */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                  Location of NWSC Meter *
                </label>
                <input
                  className={inputCls}
                  placeholder="Enter location of NWSC meter"
                  {...register('locationOfNwscMeter')}
                />
                {errors.locationOfNwscMeter && (
                  <p className="text-xs text-red-500">{errors.locationOfNwscMeter.message}</p>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-[#E2E8F0] pt-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-[#64748B]">
                Review the selected account and meter identifiers before saving.
              </p>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex min-w-36 items-center justify-center rounded-xl bg-[#1D4ED8] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#1e40af] disabled:opacity-60"
              >
                {isSubmitting ? 'Saving...' : 'Add Meter'}
              </button>
            </div>
          </form>
        </div>

        {/* Info Panel */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-[#E2E8F0] bg-white shadow-sm overflow-hidden">
            <div className="border-b border-[#E2E8F0] bg-slate-50/60 px-6 py-4">
              <h3 className="text-sm font-bold text-[#0F172A]">What this captures</h3>
              <p className="text-xs text-[#64748B] mt-0.5">
                Keep submissions clean and consistent across all utility records.
              </p>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-4">
                <UserRound className="mt-0.5 h-5 w-5 text-[#1D4ED8]" />
                <div>
                  <p className="text-sm font-semibold text-[#0F172A]">Verified landlord</p>
                  <p className="text-xs text-[#64748B] mt-0.5">
                    Assign each meter to the right user account owner.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-4">
                <Cable className="mt-0.5 h-5 w-5 text-[#1D4ED8]" />
                <div>
                  <p className="text-sm font-semibold text-[#0F172A]">Meter identity</p>
                  <p className="text-xs text-[#64748B] mt-0.5">
                    Store the meter type and meter number in a consistent format.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-4">
                <Waves className="mt-0.5 h-5 w-5 text-[#1D4ED8]" />
                <div>
                  <p className="text-sm font-semibold text-[#0F172A]">Billing reference</p>
                  <p className="text-xs text-[#64748B] mt-0.5">
                    The NWSC account makes reconciliation much easier later.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-4">
                <MapPin className="mt-0.5 h-5 w-5 text-[#1D4ED8]" />
                <div>
                  <p className="text-sm font-semibold text-[#0F172A]">Installation location</p>
                  <p className="text-xs text-[#64748B] mt-0.5">
                    Use a clear location label so support and admins can identify the unit fast.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddUtilityMeter;
