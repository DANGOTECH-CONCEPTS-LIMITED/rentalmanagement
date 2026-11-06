import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Save,
  Loader2,
  Plus,
  Trash2,
  PhoneCall,
  Info,
  AlertTriangle,
  Play,
  PlusCircle,
  History as HistoryIcon,
  BarChart3,
  Home,
} from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DataTablePagination } from '@/components/common/DataTablePagination';
import { useTablePagination } from '@/hooks/use-table-pagination';
import { useToast } from '@/hooks/use-toast';
import UssdMenuSimulator from './UssdMenuSimulator';

interface UssdOptionDto {
  id: number;
  label: string;
  value: string;
  nextNodeId: number;
}

interface UssdNodeDto {
  id: number;
  type: number;
  prompt: string;
  validationRegex?: string | null;
  dataKey?: string | null;
  nextNodeId?: number | null;
  actionKey?: string | null;
  options: UssdOptionDto[];
}

interface UssdMenuDto {
  id: number;
  code: string;
  title: string;
  rootNodeId: number;
  nodes: UssdNodeDto[];
}

interface UssdMenuSummary {
  id: number;
  code: string;
  title: string;
  rootNodeId: number;
}

interface AuditEntry {
  id: number;
  createdAt: string;
  userId: string;
  userName?: string | null;
  resultStatus?: string | null;
  requestData?: string | null;
}

interface UssdSessionStats {
  total: number;
  success: number;
  failed: number;
  incomplete: number;
  cancelled: number;
  avgDurationSeconds?: number | null;
  funnel: { started: number; reachedMeter: number; reachedAmount: number; completed: number };
  daily: { date: string; total: number; success: number }[];
}

const NODE_TYPES: Record<number, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  1: { label: 'Menu', variant: 'default' },
  2: { label: 'Input', variant: 'secondary' },
  3: { label: 'Action', variant: 'destructive' },
  4: { label: 'Exit', variant: 'outline' },
};

const nodeLabel = (n: UssdNodeDto) => {
  const firstLine = (n.prompt ?? '').split('\n')[0].slice(0, 20);
  return `#${n.id} · ${NODE_TYPES[n.type]?.label ?? 'Node'}${firstLine ? ` · ${firstLine}` : ''}`;
};

const FieldHint = ({ children }: { children: React.ReactNode }) => (
  <p className="text-xs text-muted-foreground">{children}</p>
);

const UssdMenu = () => {
  const { toast } = useToast();
  const [menus, setMenus] = useState<UssdMenuSummary[]>([]);
  const [menu, setMenu] = useState<UssdMenuDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [simOpen, setSimOpen] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newNodeType, setNewNodeType] = useState(1);
  const [history, setHistory] = useState<AuditEntry[]>([]);
  const [stats, setStats] = useState<UssdSessionStats | null>(null);
  const historyPagination = useTablePagination(history, 10);
  const tempId = useRef(-1);

  const newTempId = () => {
    tempId.current -= 1;
    return tempId.current;
  };

  const loadMenus = async () => {
    const { data } = await api.get<UssdMenuSummary[]>('/ListUssdMenus');
    setMenus(data ?? []);
    return data ?? [];
  };

  const selectMenu = async (code: string) => {
    setLoading(true);
    try {
      const { data } = await api.get<UssdMenuDto>('/GetUssdMenu', { params: { menuCode: code } });
      setMenu(data);
    } catch {
      toast({ title: 'Error', description: 'Unable to load the USSD menu.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async () => {
    try {
      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - 30);
      const fmt = (d: Date) => d.toISOString().split('T')[0];
      const { data } = await api.get<AuditEntry[]>('/GetAuditTrail', {
        params: { startDate: fmt(start), endDate: fmt(end), route: '/SaveUssdMenu' },
      });
      setHistory(
        [...(data ?? [])].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      );
    } catch {
      /* non-fatal */
    }
  };

  const loadStats = async () => {
    try {
      const { data } = await api.get<UssdSessionStats>('/GetUssdSessionStats');
      setStats(data);
    } catch {
      /* non-fatal */
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const list = await loadMenus();
        const code = list.find((m) => m.code === 'waterpay')?.code ?? list[0]?.code;
        if (code) await selectMenu(code);
        else setLoading(false);
      } catch {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const patchNode = (id: number, patch: Partial<UssdNodeDto>) => {
    setMenu((m) => (m ? { ...m, nodes: m.nodes.map((n) => (n.id === id ? { ...n, ...patch } : n)) } : m));
  };

  const addNode = (type: number) => {
    setMenu((m) =>
      m
        ? {
            ...m,
            nodes: [
              ...m.nodes,
              {
                id: newTempId(),
                type,
                prompt: type === 1 ? 'New menu\n1. Option one\n0. Exit' : type === 4 ? 'Goodbye.' : '',
                validationRegex: null,
                dataKey: null,
                nextNodeId: null,
                actionKey: null,
                options: [],
              },
            ],
          }
        : m
    );
  };

  const deleteNode = (id: number) => {
    setMenu((m) => (m ? { ...m, nodes: m.nodes.filter((n) => n.id !== id) } : m));
  };

  const patchOption = (nodeId: number, optId: number, patch: Partial<UssdOptionDto>) => {
    setMenu((m) =>
      m
        ? {
            ...m,
            nodes: m.nodes.map((n) =>
              n.id === nodeId
                ? { ...n, options: n.options.map((o) => (o.id === optId ? { ...o, ...patch } : o)) }
                : n
            ),
          }
        : m
    );
  };

  const addOption = (nodeId: number) => {
    setMenu((m) => {
      if (!m) return m;
      return {
        ...m,
        nodes: m.nodes.map((n) =>
          n.id === nodeId
            ? {
                ...n,
                options: [...n.options, { id: 0, label: 'New option', value: '9', nextNodeId: m.rootNodeId }],
              }
            : n
        ),
      };
    });
  };

  const removeOption = (nodeId: number, optId: number) => {
    setMenu((m) =>
      m
        ? {
            ...m,
            nodes: m.nodes.map((n) =>
              n.id === nodeId ? { ...n, options: n.options.filter((o) => o.id !== optId) } : n
            ),
          }
        : m
    );
  };

  const issues = useMemo(() => {
    if (!menu) return [];
    const result: { severity: 'error' | 'warning'; message: string }[] = [];
    const ids = new Set(menu.nodes.map((n) => n.id));
    const root = menu.nodes.find((n) => n.id === menu.rootNodeId);
    if (!root) result.push({ severity: 'error', message: 'No root node is set.' });
    else if (root.type !== 1) result.push({ severity: 'warning', message: 'The root node is not a Menu node.' });

    for (const n of menu.nodes) {
      if (!n.prompt.trim()) result.push({ severity: 'error', message: `Node #${n.id} has an empty prompt.` });
      if (n.nextNodeId && !ids.has(n.nextNodeId))
        result.push({ severity: 'error', message: `Node #${n.id} points to a missing next node.` });
      if (n.type === 1) {
        if (n.options.length === 0)
          result.push({ severity: 'warning', message: `Menu node #${n.id} has no options.` });
        const vals = n.options.map((o) => o.value);
        if (new Set(vals).size !== vals.length)
          result.push({ severity: 'error', message: `Node #${n.id} has duplicate option values.` });
        for (const o of n.options) {
          if (o.nextNodeId && !ids.has(o.nextNodeId))
            result.push({ severity: 'error', message: `Option "${o.label}" points to a missing node.` });
        }
      }
    }
    return result;
  }, [menu]);

  const hasErrors = issues.some((i) => i.severity === 'error');

  const save = async () => {
    if (!menu || hasErrors) return;
    setSaving(true);
    try {
      const { data } = await api.put<UssdMenuDto>('/SaveUssdMenu', menu);
      setMenu(data);
      await loadMenus();
      toast({ title: 'Saved', description: 'The USSD menu has been updated and is live.' });
    } catch {
      toast({ title: 'Error', description: 'Unable to save the USSD menu.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const createMenu = async () => {
    if (!newCode.trim() || !newTitle.trim()) {
      toast({ title: 'Missing fields', description: 'Code and title are required.', variant: 'destructive' });
      return;
    }
    try {
      const { data } = await api.post<UssdMenuDto>('/CreateUssdMenu', {
        code: newCode.trim(),
        title: newTitle.trim(),
      });
      setNewCode('');
      setNewTitle('');
      setShowCreate(false);
      await loadMenus();
      setMenu(data);
      toast({ title: 'Created', description: `Menu "${data.code}" created.` });
    } catch {
      toast({ title: 'Error', description: 'Unable to create the menu.', variant: 'destructive' });
    }
  };

  if (loading && !menu) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <Loader2 className="animate-spin mr-2" size={18} /> Loading menu…
      </div>
    );
  }

  if (!menu) return <p className="p-6 text-muted-foreground">Menu not found.</p>;

  const nextNodeSelect = (value: number | null | undefined, onChange: (v: number | null) => void) => (
    <select
      className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm"
      value={value ?? 0}
      onChange={(e) => onChange(Number(e.target.value) || null)}
    >
      <option value={0}>— No next node —</option>
      {menu.nodes.map((n) => (
        <option key={n.id} value={n.id}>
          {nodeLabel(n)}
        </option>
      ))}
    </select>
  );

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">USSD Menu</h1>
          <p className="text-sm text-muted-foreground">
            Configure what callers see when they dial <span className="font-mono">*284*51#</span>.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setSimOpen(true)} disabled={hasErrors}>
            <Play size={16} className="mr-2" /> Test
          </Button>
          <Button onClick={save} disabled={saving || hasErrors}>
            {saving ? <Loader2 className="animate-spin mr-2" size={16} /> : <Save size={16} className="mr-2" />}
            Save changes
          </Button>
        </div>
      </div>

      <Tabs
        defaultValue="menu"
        onValueChange={(v) => {
          if (v === 'history') loadHistory();
          if (v === 'sessions') loadStats();
        }}
      >
        <TabsList>
          <TabsTrigger value="menu"><PhoneCall size={14} className="mr-1" /> Menu</TabsTrigger>
          <TabsTrigger value="history"><HistoryIcon size={14} className="mr-1" /> History</TabsTrigger>
          <TabsTrigger value="sessions"><BarChart3 size={14} className="mr-1" /> Sessions</TabsTrigger>
        </TabsList>

        {/* ------------------------------ MENU TAB ------------------------------ */}
        <TabsContent value="menu" className="space-y-4">
          <div className="flex items-start gap-2 rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
            <Info size={16} className="mt-0.5 shrink-0" />
            <span>
              Changes apply immediately to the live USSD flow. Prompts support{' '}
              <code className="font-mono">{'{meter}'}</code>, <code className="font-mono">{'{amount}'}</code>,{' '}
              <code className="font-mono">{'{customerName}'}</code> and{' '}
              <code className="font-mono">{'{CURRENCY}'}</code>.
            </span>
          </div>

          {issues.length > 0 && (
            <div className="space-y-1 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm">
              {issues.map((i, idx) => (
                <div key={idx} className="flex items-center gap-2 text-amber-800">
                  <AlertTriangle size={14} className={i.severity === 'error' ? 'text-red-600' : 'text-amber-600'} />
                  {i.message}
                </div>
              ))}
            </div>
          )}

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-base">
                <span className="flex items-center gap-2"><PhoneCall size={16} /> Menu</span>
                <div className="flex items-center gap-2">
                  <select
                    className="h-9 rounded-md border border-input bg-white px-3 text-sm"
                    value={menu.code}
                    onChange={(e) => selectMenu(e.target.value)}
                  >
                    {menus.map((m) => (
                      <option key={m.id} value={m.code}>
                        {m.code} — {m.title}
                      </option>
                    ))}
                  </select>
                  <Button variant="outline" size="sm" onClick={() => setShowCreate((v) => !v)}>
                    <PlusCircle size={14} className="mr-1" /> New
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {showCreate && (
                <div className="flex flex-wrap items-end gap-3 rounded-lg border p-3">
                  <div className="space-y-1">
                    <Label>Code</Label>
                    <Input value={newCode} onChange={(e) => setNewCode(e.target.value)} placeholder="newmenu" />
                  </div>
                  <div className="space-y-1">
                    <Label>Title</Label>
                    <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="New USSD menu" />
                  </div>
                  <Button onClick={createMenu}>Create</Button>
                </div>
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Menu code</Label>
                  <Input value={menu.code} disabled />
                </div>
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input value={menu.title} onChange={(e) => setMenu({ ...menu, title: e.target.value })} />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Nodes</h2>
            <div className="flex items-center gap-2">
              <select
                className="h-9 rounded-md border border-input bg-white px-2 text-sm"
                value={newNodeType}
                onChange={(e) => setNewNodeType(Number(e.target.value))}
              >
                <option value={1}>Menu</option>
                <option value={2}>Input</option>
                <option value={3}>Action</option>
                <option value={4}>Exit</option>
              </select>
              <Button variant="outline" size="sm" onClick={() => addNode(newNodeType)}>
                <Plus size={14} className="mr-1" /> Add node
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            {menu.nodes.map((node) => (
              <Card key={node.id}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between text-base">
                    <span className="flex items-center gap-2">
                      <Badge variant={NODE_TYPES[node.type]?.variant ?? 'outline'}>
                        {NODE_TYPES[node.type]?.label ?? 'Node'}
                      </Badge>
                      <span className="text-sm font-normal text-muted-foreground">#{node.id}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      {node.id === menu.rootNodeId ? (
                        <Badge variant="secondary">Root</Badge>
                      ) : (
                        <Button variant="ghost" size="sm" onClick={() => setMenu({ ...menu, rootNodeId: node.id })}>
                          <Home size={14} className="mr-1" /> Make root
                        </Button>
                      )}
                      {node.id !== menu.rootNodeId && (
                        <Button variant="ghost" size="icon" onClick={() => deleteNode(node.id)}>
                          <Trash2 size={16} className="text-red-500" />
                        </Button>
                      )}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Prompt</Label>
                    <Textarea
                      value={node.prompt}
                      onChange={(e) => patchNode(node.id, { prompt: e.target.value })}
                      rows={3}
                    />
                  </div>

                  {node.type === 2 && (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Validation regex</Label>
                        <Input
                          value={node.validationRegex ?? ''}
                          onChange={(e) => patchNode(node.id, { validationRegex: e.target.value })}
                        />
                        <FieldHint>Pattern the caller's input must match, e.g. <code className="font-mono">{'^\\d{6,16}$'}</code> for a 6–16 digit meter number.</FieldHint>
                      </div>
                      <div className="space-y-2">
                        <Label>Data key</Label>
                        <Input
                          value={node.dataKey ?? ''}
                          onChange={(e) => patchNode(node.id, { dataKey: e.target.value })}
                        />
                        <FieldHint>Where the input is stored for later steps: "meter" or "amount".</FieldHint>
                      </div>
                      <div className="space-y-2">
                        <Label>Next node</Label>
                        {nextNodeSelect(node.nextNodeId, (v) => patchNode(node.id, { nextNodeId: v }))}
                      </div>
                    </div>
                  )}

                  {node.type === 3 && (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Action key</Label>
                        <Input
                          value={node.actionKey ?? ''}
                          onChange={(e) => patchNode(node.id, { actionKey: e.target.value })}
                        />
                        <FieldHint>Built-in handler: LookupCustomer, Checkout or Cancel.</FieldHint>
                      </div>
                      <div className="space-y-2">
                        <Label>Next node</Label>
                        {nextNodeSelect(node.nextNodeId, (v) => patchNode(node.id, { nextNodeId: v }))}
                      </div>
                    </div>
                  )}

                  {node.type === 1 && (
                    <div className="space-y-2">
                      <Label>Options</Label>
                      <div className="space-y-2">
                        {node.options.map((opt) => (
                          <div key={opt.id} className="flex items-center gap-2">
                            <Input
                              className="w-24"
                              value={opt.value}
                              placeholder="1"
                              onChange={(e) => patchOption(node.id, opt.id, { value: e.target.value })}
                            />
                            <Input
                              value={opt.label}
                              placeholder="1. Pay water bill"
                              onChange={(e) => patchOption(node.id, opt.id, { label: e.target.value })}
                            />
                            <select
                              className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm"
                              value={opt.nextNodeId}
                              onChange={(e) => patchOption(node.id, opt.id, { nextNodeId: Number(e.target.value) })}
                            >
                              {menu.nodes.map((n) => (
                                <option key={n.id} value={n.id}>
                                  {nodeLabel(n)}
                                </option>
                              ))}
                            </select>
                            <Button type="button" variant="outline" size="icon" onClick={() => removeOption(node.id, opt.id)}>
                              <Trash2 size={16} />
                            </Button>
                          </div>
                        ))}
                      </div>
                      <FieldHint>The value is what the caller types to pick this option (e.g. 1).</FieldHint>
                      <Button type="button" variant="outline" onClick={() => addOption(node.id)}>
                        <Plus size={16} className="mr-2" /> Add option
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ---------------------------- HISTORY TAB ---------------------------- */}
        <TabsContent value="history" className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Every save of this menu is recorded automatically. Last 30 days shown.
          </p>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>When</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Payload</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-muted-foreground">
                        No edits recorded yet.
                      </TableCell>
                    </TableRow>
                  )}
                  {historyPagination.pageRows.map((h) => (
                    <TableRow key={h.id}>
                      <TableCell className="whitespace-nowrap">
                        {new Date(h.createdAt).toLocaleString()}
                      </TableCell>
                      <TableCell>{h.userName ?? h.userId}</TableCell>
                      <TableCell>
                        <Badge variant={h.resultStatus === '200' ? 'secondary' : 'destructive'}>
                          {h.resultStatus ?? '—'}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[300px] truncate text-xs text-muted-foreground">
                        {h.requestData ?? ''}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {history.length > 0 && (
                <DataTablePagination
                  page={historyPagination.page}
                  pageSize={historyPagination.pageSize}
                  totalCount={historyPagination.totalCount}
                  onPageChange={historyPagination.setPage}
                  onPageSizeChange={historyPagination.setPageSize}
                  itemLabel="edits"
                  className="px-4 pb-3"
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---------------------------- SESSIONS TAB ---------------------------- */}
        <TabsContent value="sessions" className="space-y-4">
          {!stats ? (
            <p className="text-muted-foreground">No session data yet.</p>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Card><CardHeader><CardTitle className="text-sm">Total</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{stats.total}</CardContent></Card>
                <Card><CardHeader><CardTitle className="text-sm text-emerald-600">Success</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{stats.success}</CardContent></Card>
                <Card><CardHeader><CardTitle className="text-sm text-red-600">Failed</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{stats.failed}</CardContent></Card>
                <Card><CardHeader><CardTitle className="text-sm">Cancelled</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{stats.cancelled}</CardContent></Card>
              </div>

              <Card>
                <CardHeader><CardTitle className="text-sm">Funnel</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {[
                    { label: 'Started', value: stats.funnel.started },
                    { label: 'Reached meter entry', value: stats.funnel.reachedMeter },
                    { label: 'Reached amount entry', value: stats.funnel.reachedAmount },
                    { label: 'Completed payment', value: stats.funnel.completed },
                  ].map((row) => {
                    const pct = stats.funnel.started ? Math.round((row.value / stats.funnel.started) * 100) : 0;
                    return (
                      <div key={row.label} className="flex items-center gap-3 text-sm">
                        <span className="w-40 shrink-0 text-muted-foreground">{row.label}</span>
                        <div className="h-5 flex-1 rounded bg-slate-100 overflow-hidden">
                          <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="w-16 text-right">{row.value}</span>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-sm">Daily sessions</CardTitle></CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="text-right">Success</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[...stats.daily].reverse().slice(0, 14).map((d) => (
                        <TableRow key={d.date}>
                          <TableCell>{new Date(d.date).toLocaleDateString()}</TableCell>
                          <TableCell className="text-right">{d.total}</TableCell>
                          <TableCell className="text-right">{d.success}</TableCell>
                        </TableRow>
                      ))}
                      {stats.daily.length === 0 && (
                        <TableRow><TableCell colSpan={3} className="text-muted-foreground">No data.</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>

      <UssdMenuSimulator menu={menu} open={simOpen} onClose={() => setSimOpen(false)} />
    </div>
  );
};

export default UssdMenu;
