import { useEffect, useState } from 'react';
import { Loader2, Save, Plus, Trash2, Percent, Wallet } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';

interface ApiUser {
  id: number;
  fullName: string;
  email: string;
  systemRoleId: number;
  systemRole: { name: string };
}

interface Landlord {
  id: number;
  name: string;
  email: string;
}

interface Tier {
  minAmount?: number | null;
  maxAmount?: number | null;
  charge: number;
}

interface ChargeSettings {
  landlordId: number;
  chargeType: string;
  chargePercentage?: number | null;
  flatFee?: number | null;
  tiers: Tier[];
}

const CHARGE_TYPES = [
  { value: 'Percentage', label: 'Percentage' },
  { value: 'FlatFee', label: 'Flat fee' },
  { value: 'Tiered', label: 'Tiered' },
];

const UtilityChargeSettings = () => {
  const { toast } = useToast();
  const [landlords, setLandlords] = useState<Landlord[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [settings, setSettings] = useState<ChargeSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get<ApiUser[]>('/GetAllUsers');
        const list = (data ?? [])
          .filter((u) => u.systemRole?.name === 'Landlord')
          .map((u) => ({ id: u.id, name: u.fullName, email: u.email }));
        setLandlords(list);
        if (list.length > 0) {
          setSelectedId(list[0].id);
          await loadCharge(list[0].id);
        } else {
          setLoading(false);
        }
      } catch {
        toast({ title: 'Error', description: 'Unable to load landlords.', variant: 'destructive' });
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadCharge = async (landlordId: number) => {
    setLoading(true);
    try {
      const { data } = await api.get<ChargeSettings>(`/GetLandlordUtilityCharge/${landlordId}`);
      setSettings({
        landlordId: data.landlordId ?? landlordId,
        chargeType: data.chargeType ?? 'Percentage',
        chargePercentage: data.chargePercentage ?? null,
        flatFee: data.flatFee ?? null,
        tiers: data.tiers ?? [],
      });
    } catch {
      toast({ title: 'Error', description: 'Unable to load utility charge settings.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const selectLandlord = (id: number) => {
    setSelectedId(id);
    loadCharge(id);
  };

  const patchTier = (index: number, patch: Partial<Tier>) => {
    setSettings((s) =>
      s ? { ...s, tiers: s.tiers.map((t, i) => (i === index ? { ...t, ...patch } : t)) } : s
    );
  };

  const addTier = () => {
    setSettings((s) =>
      s ? { ...s, tiers: [...s.tiers, { minAmount: null, maxAmount: null, charge: 0 }] } : s
    );
  };

  const removeTier = (index: number) => {
    setSettings((s) => (s ? { ...s, tiers: s.tiers.filter((_, i) => i !== index) } : s));
  };

  const toNumber = (value: string): number | null => {
    const trimmed = value.trim();
    return trimmed === '' ? null : Number(trimmed);
  };

  const save = async () => {
    if (!settings) return;

    if (settings.chargeType === 'Tiered' && settings.tiers.length === 0) {
      toast({ title: 'Validation', description: 'Add at least one tier for tiered charges.', variant: 'destructive' });
      return;
    }
    if (settings.chargeType === 'Percentage' && (settings.chargePercentage == null || settings.chargePercentage < 0)) {
      toast({ title: 'Validation', description: 'Percentage must be 0 or greater.', variant: 'destructive' });
      return;
    }
    if (settings.chargeType === 'FlatFee' && (settings.flatFee == null || settings.flatFee < 0)) {
      toast({ title: 'Validation', description: 'Flat fee must be 0 or greater.', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      await api.put('/ConfigureLandlordUtilityCharge', settings);
      toast({ title: 'Saved', description: 'Utility charge settings updated.' });
    } catch {
      toast({ title: 'Error', description: 'Unable to save utility charge settings.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading && !settings) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <Loader2 className="animate-spin mr-2" size={18} /> Loading…
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Utility Charge Settings</h1>
          <p className="text-sm text-muted-foreground">
            Configure how each landlord charges their tenants for utility (water) usage.
          </p>
        </div>
        <Button onClick={save} disabled={saving || !settings}>
          {saving ? <Loader2 className="animate-spin mr-2" size={16} /> : <Save size={16} className="mr-2" />}
          Save settings
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet size={18} /> Landlord
          </CardTitle>
        </CardHeader>
        <CardContent>
          <select
            className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm"
            value={selectedId ?? ''}
            onChange={(e) => selectLandlord(Number(e.target.value))}
          >
            {landlords.length === 0 && <option value="">No landlords found</option>}
            {landlords.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name} — {l.email}
              </option>
            ))}
          </select>
        </CardContent>
      </Card>

      {settings && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Percent size={18} /> Charge type
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Charge type</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm"
                    value={settings.chargeType}
                    onChange={(e) => setSettings({ ...settings, chargeType: e.target.value })}
                  >
                    {CHARGE_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                {settings.chargeType === 'Percentage' && (
                  <div className="space-y-2">
                    <Label>Percentage (%)</Label>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={settings.chargePercentage ?? ''}
                      onChange={(e) =>
                        setSettings({ ...settings, chargePercentage: toNumber(e.target.value) })
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Charged as a percentage of the utility amount collected.
                    </p>
                  </div>
                )}

                {settings.chargeType === 'FlatFee' && (
                  <div className="space-y-2">
                    <Label>Flat fee (UGX)</Label>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={settings.flatFee ?? ''}
                      onChange={(e) => setSettings({ ...settings, flatFee: toNumber(e.target.value) })}
                    />
                    <p className="text-xs text-muted-foreground">
                      A fixed amount charged per utility payment.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {settings.chargeType === 'Tiered' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-base">
                  <span>Tiers</span>
                  <Button variant="outline" size="sm" onClick={addTier}>
                    <Plus size={14} className="mr-1" /> Add tier
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Min amount (UGX)</TableHead>
                      <TableHead>Max amount (UGX)</TableHead>
                      <TableHead>Charge (UGX)</TableHead>
                      <TableHead className="w-12" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {settings.tiers.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-muted-foreground">
                          No tiers yet. Add one to define the tiered charge bands.
                        </TableCell>
                      </TableRow>
                    )}
                    {settings.tiers.map((tier, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Input
                            type="number"
                            min={0}
                            step="0.01"
                            placeholder="0"
                            value={tier.minAmount ?? ''}
                            onChange={(e) => patchTier(index, { minAmount: toNumber(e.target.value) })}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={0}
                            step="0.01"
                            placeholder="No limit"
                            value={tier.maxAmount ?? ''}
                            onChange={(e) => patchTier(index, { maxAmount: toNumber(e.target.value) })}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={0}
                            step="0.01"
                            value={tier.charge}
                            onChange={(e) => patchTier(index, { charge: Number(e.target.value) || 0 })}
                          />
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => removeTier(index)}>
                            <Trash2 size={16} className="text-red-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {settings.chargeType === 'Tiered' && (
            <Badge variant="secondary">
              Tiered: tenants pay a different charge depending on the utility amount band.
            </Badge>
          )}
        </>
      )}
    </div>
  );
};

export default UtilityChargeSettings;
