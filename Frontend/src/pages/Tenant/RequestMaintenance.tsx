import { useEffect, useState } from 'react';
import { Wrench, Send } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { api, getUser } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface TenantRecord {
  id: number;
  userId?: number | null;
  propertyId: number;
  fullName: string;
}

const RequestMaintenance = () => {
  const { toast } = useToast();
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [tenant, setTenant] = useState<TenantRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const userId = getUser()?.id;
    api
      .get<TenantRecord[]>('/GetAllTenants', { signal: controller.signal })
      .then(({ data }) => {
        if (!controller.signal.aborted) setTenant((data ?? []).find((t) => t.userId === userId) ?? null);
      })
      .catch(() => {
        if (!controller.signal.aborted) setTenant(null);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  const submit = async () => {
    if (!subject.trim() || !description.trim()) {
      toast({ title: 'Missing fields', description: 'Subject and description are required.', variant: 'destructive' });
      return;
    }
    if (!tenant) {
      toast({ title: 'No property found', description: 'Your tenant record could not be found.', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/AddMaintenanceRequest', {
        subject: subject.trim(),
        description: description.trim(),
        priority,
        propertyId: tenant.propertyId,
        tenantId: tenant.id,
      });
      toast({ title: 'Request submitted', description: 'Your maintenance request has been sent to the landlord.' });
      setSubject('');
      setDescription('');
      setPriority('MEDIUM');
    } catch (error) {
      toast({ title: 'Error', description: error?.response?.data?.message ?? 'Unable to submit request.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem><BreadcrumbLink href="/tenant-dashboard">Dashboard</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbPage>Request Maintenance</BreadcrumbPage></BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <section className="page-hero">
        <span className="inline-flex w-fit items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          Maintenance
        </span>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Request Maintenance</h1>
        <p className="mt-2 text-sm text-muted-foreground md:text-base">
          Report a repair or maintenance issue for your property.
        </p>
      </section>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Wrench className="h-5 w-5" /> New request</CardTitle>
          <CardDescription>Describe the issue and choose a priority.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : !tenant ? (
            <p className="text-destructive">No property record found for your account.</p>
          ) : (
            <>
              <div className="space-y-1">
                <Label>Subject</Label>
                <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Leaking tap in the kitchen" />
              </div>
              <div className="space-y-1">
                <Label>Description</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} placeholder="Describe the problem in detail..." />
              </div>
              <div className="space-y-1">
                <Label>Priority</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="URGENT">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button disabled={submitting} onClick={submit} className="flex items-center gap-2">
                <Send className="h-4 w-4" />
                {submitting ? 'Submitting...' : 'Submit Request'}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default RequestMaintenance;
