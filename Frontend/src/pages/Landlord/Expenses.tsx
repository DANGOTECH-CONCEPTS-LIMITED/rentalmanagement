import { useEffect, useState } from 'react';
import { Receipt, Trash2, Plus } from 'lucide-react';
import { api, getUser } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

interface Expense {
  id: number;
  amount: number;
  description: string;
  category: string;
  expenseDate: string;
  createdAt: string;
}

const money = (value: number) => `UGX ${(value ?? 0).toLocaleString()}`;

const Expenses = () => {
  const { toast } = useToast();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [expenseDate, setExpenseDate] = useState('');
  const [saving, setSaving] = useState(false);

  const landlordId = getUser()?.id ?? null;

  const load = async () => {
    if (!landlordId) return;
    setLoading(true);
    try {
      const { data } = await api.get<Expense[]>(`/GetExpensesByLandlordId/${landlordId}`);
      setExpenses(data ?? []);
    } catch {
      toast({ title: 'Error', description: 'Unable to load expenses.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [landlordId]);

  const submit = async () => {
    if (!amount || Number(amount) <= 0 || !description.trim()) {
      toast({ title: 'Missing fields', description: 'Amount and description are required.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      await api.post('/AddExpense', {
        amount: Number(amount),
        description: description.trim(),
        category: category.trim(),
        expenseDate: expenseDate ? new Date(expenseDate).toISOString() : new Date().toISOString(),
        landlordId,
      });
      toast({ title: 'Expense recorded', description: 'The expense has been added to your P&L.' });
      setShowAdd(false);
      setAmount('');
      setDescription('');
      setCategory('');
      setExpenseDate('');
      await load();
    } catch (error) {
      toast({ title: 'Error', description: error?.response?.data?.message ?? 'Unable to record expense.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (expense: Expense) => {
    if (!confirm(`Delete expense "${expense.description}"?`)) return;
    try {
      await api.delete(`/DeleteExpense/${expense.id}`);
      toast({ title: 'Deleted', description: 'Expense removed.' });
      await load();
    } catch (error) {
      toast({ title: 'Error', description: error?.response?.data?.message ?? 'Unable to delete expense.', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Expenses</h1>
          <p className="text-muted-foreground">Record operating expenses; they feed the accounting ledger and your profit &amp; loss.</p>
        </div>
        <Button onClick={() => setShowAdd(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" /> Record Expense
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Receipt className="h-4 w-4" /> Recorded expenses</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!loading && expenses.length > 0 ? (
                expenses.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell>{new Date(expense.expenseDate).toLocaleDateString()}</TableCell>
                    <TableCell>{expense.description}</TableCell>
                    <TableCell>{expense.category || '-'}</TableCell>
                    <TableCell className="text-right text-red-600">{money(expense.amount)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="text-red-600" onClick={() => remove(expense)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-gray-500">
                    {loading ? 'Loading...' : 'No expenses recorded yet'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle>Record Expense</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Amount (UGX)</Label>
              <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Description</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Plumbing repairs" />
            </div>
            <div className="space-y-1">
              <Label>Category</Label>
              <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. Maintenance, Utilities, Salary" />
            </div>
            <div className="space-y-1">
              <Label>Date</Label>
              <Input type="date" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button disabled={saving} onClick={submit}>{saving ? 'Saving...' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Expenses;
