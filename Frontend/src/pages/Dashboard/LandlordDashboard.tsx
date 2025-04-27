import React, { useState, useEffect } from 'react';
import { Loader2, Home, Users, DollarSign, TrendingUp, Wallet, ArrowUpRight, ArrowDownLeft, ChevronDown } from 'lucide-react';
import StatCard from '../../components/common/StatCard';
import { useCurrencyFormatter } from '@/hooks/use-currency-formatter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Transaction {
  amount: number;
  description: string;
  transactionDate: string;
  type?: 'deposit' | 'withdrawal';
}

const LandlordDashboard = () => {
  const formatCurrency = useCurrencyFormatter();
  const { toast } = useToast();
  const [balance, setBalance] = useState<number | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const getUserToken = () => {
    try {
      const user = localStorage.getItem('user');
      if (!user) throw new Error('No user found in localStorage');
      const userData = JSON.parse(user);
      return userData.token;
    } catch (error) {
      console.error('Error getting user token:', error);
      return null;
    }
  };

  const token = getUserToken();
  const apiUrl = import.meta.env.VITE_API_BASE_URL;

  useEffect(() => {
    const fetchWalletData = async () => {
      setIsLoading(true);
      try {
        if (!token) throw new Error('No authentication token found');

        const user = localStorage.getItem('user');
        if (!user) throw new Error('No user found in localStorage');
        const userData = JSON.parse(user);

        const balanceRes = await fetch(`${apiUrl}/GetBalance/${userData.id}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'accept': '*/*',
          },
        });

        if (!balanceRes.ok) throw new Error(`Failed to fetch balance: ${balanceRes.status}`);
        const balanceData = await balanceRes.json();
        setBalance(balanceData.balance);

        const statementRes = await fetch(`${apiUrl}/GetStatement/${userData.id}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'accept': '*/*',
          },
        });

        if (!statementRes.ok) throw new Error(`Failed to fetch statement: ${statementRes.status}`);
        const statementData = await statementRes.json();
        setTransactions(statementData);
      } catch (err: any) {
        console.error(err);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: err.message || 'Failed to load wallet data',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchWalletData();
  }, [token, apiUrl, toast]);

  const validateWithdrawal = () => {
    if (!withdrawAmount || isNaN(Number(withdrawAmount))) {
      toast({
        variant: 'destructive',
        title: 'Invalid Amount',
        description: 'Please enter a valid withdrawal amount',
      });
      return false;
    }

    const amount = Number(withdrawAmount);
    if (amount <= 0) {
      toast({
        variant: 'destructive',
        title: 'Invalid Amount',
        description: 'Withdrawal amount must be greater than 0',
      });
      return false;
    }

    if (balance !== null && amount > balance) {
      toast({
        variant: 'destructive',
        title: 'Insufficient Funds',
        description: "You don't have enough balance for this withdrawal",
      });
      return false;
    }

    return true;
  };

  const handleWithdraw = async () => {
    if (!validateWithdrawal()) return;

    const amount = Number(withdrawAmount);
    setIsWithdrawing(true);

    try {
      const user = localStorage.getItem('user');
      if (!user) throw new Error('No user found in localStorage');
      const userData = JSON.parse(user);

      const response = await fetch(`${apiUrl}/Withdraw/${userData.id}`, {
        method: 'POST',
        headers: {
          'accept': '*/*',
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(amount),
      });

      if (!response.ok) throw new Error('Withdrawal failed');

      toast({
        title: 'Withdrawal Successful',
        description: `You have withdrawn ${formatCurrency(amount)}`,
      });

      // Refresh balance & transactions
      const updatedBalance = await (await fetch(`${apiUrl}/GetBalance/${userData.id}`, {
        headers: { 'Authorization': `Bearer ${token}`, 'accept': '*/*' },
      })).json();
      setBalance(updatedBalance.balance);

      const updatedStatement = await (await fetch(`${apiUrl}/GetStatement/${userData.id}`, {
        headers: { 'Authorization': `Bearer ${token}`, 'accept': '*/*' },
      })).json();
      setTransactions(updatedStatement);

      setWithdrawAmount('');
      setShowConfirmation(false);
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Withdrawal Failed',
        description: err.message || 'There was an error processing your withdrawal',
      });
    } finally {
      setIsWithdrawing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-xl md:text-2xl font-semibold tracking-tight">Landlord Dashboard</h1>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Wallet Balance</h2>
          <div className="flex items-center gap-2">
            <Wallet className="h-6 w-6 text-primary" />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[300px] p-0">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="ghost" className="w-full justify-start">
                      View Transaction History
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Transaction History</DialogTitle>
                    </DialogHeader>
                    {isLoading ? (
                      <div className="space-y-4">
                        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                      </div>
                    ) : transactions.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">No transactions found</div>
                    ) : (
                      <div className="overflow-x-auto max-h-[60vh]">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Date</TableHead>
                              <TableHead>Description</TableHead>
                              <TableHead className="text-right">Amount</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {transactions.map((tx, i) => (
                              <TableRow key={i}>
                                <TableCell>{new Date(tx.transactionDate).toLocaleDateString()}</TableCell>
                                <TableCell className="flex items-center gap-2">
                                  {tx.amount > 0 ? (
                                    <ArrowDownLeft className="h-4 w-4 text-green-500" />
                                  ) : (
                                    <ArrowUpRight className="h-4 w-4 text-red-500" />
                                  )}
                                  {tx.description || 'Transaction'}
                                </TableCell>
                                <TableCell className={`text-right font-medium ${tx.amount > 0 ? 'text-green-500' : 'text-red-500'}`}>
                                  {tx.amount > 0 ? '+' : ''}{formatCurrency(tx.amount)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </DialogContent>
                </Dialog>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-between">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-8 w-24" />
          </div>
        ) : (
          <div className="flex items-end justify-between">
            <div>
              <p className="text-2xl font-bold">{balance !== null ? formatCurrency(balance) : '--'}</p>
              <p className="text-sm text-muted-foreground">Available balance</p>
            </div>

            <Dialog>
              <DialogTrigger asChild>
                <Button size="sm">Withdraw</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Withdraw Funds</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground mb-2">Available: {formatCurrency(balance || 0)}</p>
                  <Input
                    type="number"
                    placeholder="Enter amount to withdraw"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setWithdrawAmount('');
                        const dialogTrigger = document.querySelector('[data-state="open"]') as HTMLButtonElement;
                        if (dialogTrigger) {
                          dialogTrigger.click();
                        }
                      }}
                      className="w-full"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={() => {
                        if (validateWithdrawal()) {
                          setShowConfirmation(true);
                        }
                      }}
                      className="w-full"
                    >
                      Continue
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>

      <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Withdrawal</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm">
              Are you sure you want to withdraw {formatCurrency(Number(withdrawAmount))}?
            </p>
            <p className="text-xs text-muted-foreground">
              This action cannot be undone. The funds will be transferred to your registered bank account or mobile money number.
            </p>
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setShowConfirmation(false)}
                className="w-full"
              >
                Cancel
              </Button>
              <Button
                onClick={handleWithdraw}
                disabled={isWithdrawing}
                className="w-full"
              >
                {isWithdrawing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Confirm Withdrawal'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 lg:col-span-2">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Quick Stats</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <StatCard title="Total Properties" value="5" icon={<Home className="h-6 w-6" />} change={{ value: 1, type: 'increase' }} />
          <StatCard title="Total Tenants" value="12" icon={<Users className="h-6 w-6" />} change={{ value: 2, type: 'increase' }} />
          <StatCard title="Monthly Revenue" value={formatCurrency(15000)} icon={<DollarSign className="h-6 w-6" />} change={{ value: 8, type: 'increase' }} />
          <StatCard title="Occupancy Rate" value="95%" icon={<TrendingUp className="h-6 w-6" />} change={{ value: 5, type: 'increase' }} />
        </div>
      </div>
    </div>
  );
};

export default LandlordDashboard;