import { useEffect, useState } from 'react';
import { RotateCcw, Send } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

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

interface SimState {
  nodeId: number;
  data: Record<string, string>;
}

const NODE_TYPE_LABEL: Record<number, string> = { 1: 'Menu', 2: 'Input', 3: 'Action', 4: 'Exit' };

const renderPrompt = (prompt: string, data: Record<string, string>) =>
  prompt
    .replace(/\{meter\}/g, data.meter ?? '')
    .replace(/\{amount\}/g, data.amount ?? '')
    .replace(/\{customerName\}/g, data.customerName ?? '')
    .replace(/\{CURRENCY\}/g, 'UGX');

interface Props {
  menu: UssdMenuDto | null;
  open: boolean;
  onClose: () => void;
}

const UssdMenuSimulator: React.FC<Props> = ({ menu, open, onClose }) => {
  const [state, setState] = useState<SimState>({ nodeId: 0, data: {} });
  const [screen, setScreen] = useState('');
  const [ended, setEnded] = useState(false);
  const [input, setInput] = useState('');
  const [log, setLog] = useState<string[]>([]);

  useEffect(() => {
    if (open && menu) restart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, menu]);

  const restart = () => {
    if (!menu) return;
    const initial: SimState = { nodeId: menu.rootNodeId, data: {} };
    const result = advance(menu, initial, 0);
    setState(result.state);
    setScreen(result.screen);
    setEnded(result.ended);
    setInput('');
    setLog([]);
  };

  const nodeById = (menu: UssdMenuDto, id: number) => menu.nodes.find((n) => n.id === id);

  function advance(m: UssdMenuDto, s: SimState, depth: number): { screen: string; ended: boolean; state: SimState } {
    if (depth > 20) return { screen: 'Flow too deep (possible loop in the menu).', ended: true, state: s };
    const node = nodeById(m, s.nodeId);
    if (!node) return { screen: 'Node not found.', ended: true, state: s };

    if (node.type === 1) return { screen: renderPrompt(node.prompt, s.data), ended: false, state: s };
    if (node.type === 2) return { screen: renderPrompt(node.prompt, s.data), ended: false, state: s };

    if (node.type === 3) {
      if (node.actionKey === 'Checkout')
        return { screen: 'Payment Prompt Initiated. Please approve on your phone. Thank you.', ended: true, state: s };
      if (node.actionKey === 'Cancel')
        return { screen: 'Payment canceled. Goodbye.', ended: true, state: s };
      if (node.actionKey === 'LookupCustomer') {
        const data = { ...s.data, customerName: s.data.customerName ?? 'SIMULATED CUSTOMER' };
        const next = node.nextNodeId ? { nodeId: node.nextNodeId, data } : s;
        return advance(m, next, depth + 1);
      }
      const next = node.nextNodeId ? { nodeId: node.nextNodeId, data: s.data } : s;
      return advance(m, next, depth + 1);
    }

    if (node.type === 4) return { screen: renderPrompt(node.prompt, s.data), ended: true, state: s };
    return { screen: renderPrompt(node.prompt, s.data), ended: false, state: s };
  }

  const send = (raw: string) => {
    if (!menu || ended) return;
    const text = raw.trim();
    const node = nodeById(menu, state.nodeId);
    if (!node) return;

    if (node.type === 1) {
      if (text === '') return;
      const opt = node.options.find((o) => o.value === text);
      if (!opt) {
        setScreen(renderPrompt(node.prompt, state.data) + '\n\nInvalid choice.');
        return;
      }
      const result = advance(menu, { nodeId: opt.nextNodeId, data: state.data }, 0);
      apply(result, `> ${text}`);
      return;
    }

    if (node.type === 2) {
      if (node.validationRegex && !new RegExp(node.validationRegex).test(text)) {
        setScreen('Invalid input.\n' + renderPrompt(node.prompt, state.data));
        return;
      }
      const data = { ...state.data };
      if (node.dataKey) data[node.dataKey] = text;
      const result = advance(menu, { nodeId: node.nextNodeId ?? node.id, data }, 0);
      apply(result, `> ${text}`);
      return;
    }

    if (node.type === 3) {
      const result = advance(menu, state, 0);
      apply(result, '(action)');
      return;
    }

    setEnded(true);
  };

  const apply = (result: { screen: string; ended: boolean; state: SimState }, entry: string) => {
    setState(result.state);
    setScreen(result.screen);
    setEnded(result.ended);
    setInput('');
    setLog((l) => [...l, entry]);
  };

  const current = menu ? nodeById(menu, state.nodeId) : null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            USSD simulator
            {current && (
              <Badge variant="secondary">
                {NODE_TYPE_LABEL[current.type] ?? 'Node'} #{current.id}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="rounded-xl border bg-slate-950 p-4 font-mono text-sm text-emerald-300 whitespace-pre-wrap min-h-[120px] max-h-[260px] overflow-y-auto">
          {screen || '—'}
        </div>

        {!ended && (
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send(input)}
              placeholder="Type a response (e.g. 1)…"
            />
            <Button onClick={() => send(input)}>
              <Send size={16} />
            </Button>
          </div>
        )}

        {!ended && current?.type === 1 && current.options.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {current.options.map((o) => (
              <Button key={o.id} variant="outline" size="sm" onClick={() => send(o.value)}>
                {o.value} · {o.label.replace(/^\d+\.?\s*/, '')}
              </Button>
            ))}
          </div>
        )}

        {Object.keys(state.data).length > 0 && (
          <div className="text-xs text-muted-foreground">
            Captured: {Object.entries(state.data).map(([k, v]) => `${k}=${v}`).join(' · ')}
          </div>
        )}

        {log.length > 0 && (
          <div className="text-xs text-muted-foreground border-t pt-2">
            Steps: {log.join(' → ')}
          </div>
        )}

        <div className="flex justify-end">
          <Button variant="outline" onClick={restart}>
            <RotateCcw size={16} className="mr-2" /> Restart
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UssdMenuSimulator;
