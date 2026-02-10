import { useState, useMemo, useEffect } from 'react';
import {
  Wallet, TrendingUp, TrendingDown, Plus, History,
  LayoutDashboard, ArrowUpRight, ArrowDownRight, Calendar, X, Trash2, Loader2, Eye, EyeOff, FileText
} from 'lucide-react';
import type { TransactionType } from './types';
import { CATEGORIES } from './types';
import { Card, IconButton, CategoryIcon, InvoiceList } from './components';
import { useTransactions } from './hooks/useTransactions';
import { useInvoices } from './hooks/useInvoices';
import logoSvg from './assets/logo.svg';

const APP_PASSWORD = import.meta.env.VITE_APP_PASSWORD || 'kedjora123';
const AUTH_KEY = 'kedjora_auth_expiry';
const AUTH_DURATION = 10 * 60 * 1000; // 10 menit dalam milidetik
const MONTH_NAMES = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

export default function App() {
  const [view, setView] = useState<'dashboard' | 'history' | 'invoice'>('dashboard');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Auth State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');

  // Check if already authenticated and not expired
  useEffect(() => {
    const checkAuth = () => {
      const expiry = localStorage.getItem(AUTH_KEY);
      if (expiry) {
        const expiryTime = parseInt(expiry, 10);
        if (Date.now() < expiryTime) {
          setIsAuthenticated(true);
        } else {
          // Expired, remove key
          localStorage.removeItem(AUTH_KEY);
          setIsAuthenticated(false);
        }
      }
    };

    checkAuth();

    // Check every 30 seconds if session expired
    const interval = setInterval(checkAuth, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === APP_PASSWORD) {
      setIsAuthenticated(true);
      // Set expiry time 10 minutes from now
      const expiryTime = Date.now() + AUTH_DURATION;
      localStorage.setItem(AUTH_KEY, expiryTime.toString());
      setAuthError('');
      setPassword('');
    } else {
      setAuthError('Password salah!');
    }
  };

  // Use Supabase hook
  const { transactions, loading, error, addTransaction, deleteTransaction } = useTransactions();
  const { invoices, loading: invoicesLoading } = useInvoices();

  // Filter State
  const [filterMode, setFilterMode] = useState<'all' | 'month' | 'year'>('month');
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth());
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());

  // Form State
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<TransactionType>('expense');
  const [category, setCategory] = useState<string>(CATEGORIES.expense[0]);

  // Filtered transactions based on filter mode
  const filteredTransactions = useMemo(() => {
    if (filterMode === 'all') return transactions;
    return transactions.filter(t => {
      const d = new Date(t.date);
      if (filterMode === 'year') return d.getFullYear() === filterYear;
      return d.getFullYear() === filterYear && d.getMonth() === filterMonth;
    });
  }, [transactions, filterMode, filterMonth, filterYear]);

  // Available years from transactions + invoices
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    transactions.forEach(t => years.add(new Date(t.date).getFullYear()));
    invoices.forEach(inv => years.add(new Date(inv.date).getFullYear()));
    if (years.size === 0) years.add(new Date().getFullYear());
    return Array.from(years).sort((a, b) => b - a);
  }, [transactions, invoices]);

  // Invoice summary for selected period
  const invoiceSummary = useMemo(() => {
    const filtered = filterMode === 'all' ? invoices : invoices.filter(inv => {
      const d = new Date(inv.date);
      if (filterMode === 'year') return d.getFullYear() === filterYear;
      return d.getFullYear() === filterYear && d.getMonth() === filterMonth;
    });
    return {
      count: filtered.length,
      total: filtered.reduce((acc, inv) => acc + inv.amount, 0)
    };
  }, [invoices, filterMode, filterMonth, filterYear]);

  // Period label
  const periodLabel = useMemo(() => {
    if (filterMode === 'all') return 'Semua Waktu';
    if (filterMode === 'year') return `Tahun ${filterYear}`;
    return `${MONTH_NAMES[filterMonth]} ${filterYear}`;
  }, [filterMode, filterMonth, filterYear]);

  // Derived Statistics
  const summary = useMemo(() => {
    const totalIncome = filteredTransactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
    const totalExpense = filteredTransactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
    return {
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense
    };
  }, [filteredTransactions]);

  // Data untuk bar chart (adaptif berdasarkan filter mode)
  const barChartData = useMemo(() => {
    const bars: { name: string; income: number; expense: number }[] = [];

    if (filterMode === 'all') {
      // 7 hari terakhir
      const today = new Date();
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        const dayName = date.toLocaleDateString('id-ID', { weekday: 'short' });
        const dayIncome = transactions.filter(t => t.type === 'income' && t.date.startsWith(dateStr)).reduce((acc, t) => acc + t.amount, 0);
        const dayExpense = transactions.filter(t => t.type === 'expense' && t.date.startsWith(dateStr)).reduce((acc, t) => acc + t.amount, 0);
        bars.push({ name: dayName, income: dayIncome, expense: dayExpense });
      }
    } else if (filterMode === 'year') {
      // 12 bar bulanan
      const shortMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];
      for (let m = 0; m < 12; m++) {
        const monthIncome = transactions.filter(t => {
          const d = new Date(t.date);
          return t.type === 'income' && d.getFullYear() === filterYear && d.getMonth() === m;
        }).reduce((acc, t) => acc + t.amount, 0);
        const monthExpense = transactions.filter(t => {
          const d = new Date(t.date);
          return t.type === 'expense' && d.getFullYear() === filterYear && d.getMonth() === m;
        }).reduce((acc, t) => acc + t.amount, 0);
        bars.push({ name: shortMonths[m], income: monthIncome, expense: monthExpense });
      }
    } else {
      // Bar harian untuk bulan terpilih
      const daysInMonth = new Date(filterYear, filterMonth + 1, 0).getDate();
      for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${filterYear}-${String(filterMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const dayIncome = transactions.filter(t => t.type === 'income' && t.date.startsWith(dateStr)).reduce((acc, t) => acc + t.amount, 0);
        const dayExpense = transactions.filter(t => t.type === 'expense' && t.date.startsWith(dateStr)).reduce((acc, t) => acc + t.amount, 0);
        bars.push({ name: String(d), income: dayIncome, expense: dayExpense });
      }
    }

    return bars;
  }, [transactions, filterMode, filterMonth, filterYear]);

  // Max value untuk scaling bar chart
  const maxBarValue = useMemo(() => {
    const allValues = barChartData.flatMap(d => [d.income, d.expense]);
    return Math.max(...allValues, 1);
  }, [barChartData]);

  // Data pengeluaran per kategori
  const categoryData = useMemo(() => {
    const data: Record<string, number> = {};
    filteredTransactions.filter(t => t.type === 'expense').forEach(t => {
      data[t.category] = (data[t.category] || 0) + t.amount;
    });
    const total = Object.values(data).reduce((a, b) => a + b, 0);
    return Object.entries(data)
      .map(([name, value]) => ({ name, value, percentage: total > 0 ? (value / total) * 100 : 0 }))
      .sort((a, b) => b.value - a.value);
  }, [filteredTransactions]);

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !description || submitting) return;

    setSubmitting(true);
    try {
      await addTransaction({
        amount: parseFloat(amount),
        description,
        type,
        category,
        date: new Date().toISOString()
      });
      setAmount('');
      setDescription('');
      setIsModalOpen(false);
    } catch {
      // Error sudah di-handle di hook
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Hapus transaksi ini?')) {
      await deleteTransaction(id);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatShort = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}jt`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}rb`;
    }
    return value.toString();
  };

  // Format angka untuk input (dengan separator ribuan)
  const formatNumber = (value: string) => {
    const num = value.replace(/\D/g, '');
    return num.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  // Parse angka dari format dengan separator
  const parseNumber = (value: string) => {
    return value.replace(/\./g, '');
  };

  const COLORS = ['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#f43f5e', '#14b8a6', '#f97316'];

  // Loading state
  if (loading || invoicesLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={48} className="animate-spin text-indigo-500 mx-auto mb-4" />
          <p className="text-slate-400">Memuat data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 pb-20 md:pb-0">
      {/* Password Modal */}
      {!isAuthenticated && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-slate-900">
          <div className="bg-slate-800 border border-slate-700 w-full max-w-sm rounded-3xl p-8 shadow-2xl">
            <div className="text-center mb-6">
              <img src={logoSvg} alt="Logo" className="w-20 h-20 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white">Kedjora Finance</h2>
              <p className="text-slate-400 text-sm mt-2">Masukkan password untuk melanjutkan</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full bg-slate-700/50 border border-slate-600 rounded-xl py-3 px-4 pr-12 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder:text-slate-500"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>

              {authError && (
                <p className="text-rose-400 text-sm text-center">{authError}</p>
              )}

              <button
                type="submit"
                className="w-full bg-indigo-500 hover:bg-indigo-400 text-white font-bold py-3 rounded-xl transition-colors"
              >
                Masuk
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Main Content - Blur when not authenticated */}
      <div className={!isAuthenticated ? 'blur-lg pointer-events-none select-none' : ''}>
        {/* Error Banner */}
        {error && (
          <div className="bg-rose-500/20 border-b border-rose-500/50 px-6 py-3 text-center text-rose-300 text-sm">
            {error}
          </div>
        )}

        {/* Navbar */}
        <nav className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-30">
          <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img src={logoSvg} alt="Logo" className="w-8 h-8" />
              <span className="font-bold text-xl tracking-tight text-white">Kedjora Finance</span>
            </div>

            <div className="flex gap-2 bg-slate-800/50 p-1 rounded-2xl border border-slate-700/50">
              <IconButton
                icon={LayoutDashboard}
                active={view === 'dashboard'}
                onClick={() => setView('dashboard')}
                label="Dashboard"
              />
              <IconButton
                icon={History}
                active={view === 'history'}
                onClick={() => setView('history')}
                label="Riwayat"
              />
              <IconButton
                icon={FileText}
                active={view === 'invoice'}
                onClick={() => setView('invoice')}
                label="Invoice"
            />
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto p-6 animate-fade-in">

        {/* Dashboard View */}
        {view === 'dashboard' && (
          <div className="space-y-6">
            {/* Filter Controls */}
            <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4 space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700/50">
                  {([['all', 'Semua'], ['month', 'Bulanan'], ['year', 'Tahunan']] as const).map(([mode, label]) => (
                    <button
                      key={mode}
                      onClick={() => setFilterMode(mode)}
                      className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all ${
                        filterMode === mode
                          ? 'bg-indigo-500 text-white shadow-sm'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {filterMode !== 'all' && (
                  <select
                    value={filterYear}
                    onChange={(e) => setFilterYear(Number(e.target.value))}
                    className="bg-slate-800 border border-slate-700/50 rounded-xl px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    {availableYears.map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                )}
              </div>

              {filterMode === 'month' && (
                <div className="flex flex-wrap gap-1.5">
                  {MONTH_NAMES.map((name, i) => (
                    <button
                      key={i}
                      onClick={() => setFilterMonth(i)}
                      className={`px-3 py-1 text-xs font-medium rounded-lg transition-all ${
                        filterMonth === i
                          ? 'bg-indigo-500 text-white'
                          : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700/50'
                      }`}
                    >
                      {name.slice(0, 3)}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Header Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Wallet size={100} />
                </div>
                <p className="text-slate-400 text-sm font-medium uppercase tracking-wider">Saldo</p>
                <h3 className="text-3xl font-bold mt-2 text-white">{formatCurrency(summary.balance)}</h3>
                <div className="mt-4 flex items-center gap-2 text-xs font-medium px-3 py-1 rounded-full bg-slate-700/30 w-fit text-slate-300">
                  <span>{periodLabel}</span>
                </div>
              </Card>

              <Card className="relative overflow-hidden group border-l-4 border-l-emerald-500">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity text-emerald-500">
                  <TrendingUp size={100} />
                </div>
                <p className="text-emerald-400 text-sm font-medium uppercase tracking-wider">Pemasukan</p>
                <h3 className="text-3xl font-bold mt-2 text-white">{formatCurrency(summary.totalIncome)}</h3>
                <div className="mt-4 flex items-center gap-1 text-emerald-400 text-sm">
                  <ArrowUpRight size={16} />
                  <span>Masuk</span>
                </div>
              </Card>

              <Card className="relative overflow-hidden group border-l-4 border-l-rose-500">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity text-rose-500">
                  <TrendingDown size={100} />
                </div>
                <p className="text-rose-400 text-sm font-medium uppercase tracking-wider">Pengeluaran</p>
                <h3 className="text-3xl font-bold mt-2 text-white">{formatCurrency(summary.totalExpense)}</h3>
                <div className="mt-4 flex items-center gap-1 text-rose-400 text-sm">
                  <ArrowDownRight size={16} />
                  <span>Keluar</span>
                </div>
              </Card>

              <Card className="relative overflow-hidden group border-l-4 border-l-indigo-500">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity text-indigo-500">
                  <FileText size={100} />
                </div>
                <p className="text-indigo-400 text-sm font-medium uppercase tracking-wider">Invoice</p>
                <h3 className="text-3xl font-bold mt-2 text-white">{formatCurrency(invoiceSummary.total)}</h3>
                <div className="mt-4 flex items-center gap-1 text-indigo-400 text-sm">
                  <FileText size={16} />
                  <span>{invoiceSummary.count} invoice</span>
                </div>
              </Card>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Bar Chart */}
              <Card className="lg:col-span-2">
                <div className="flex justify-between items-center mb-6">
                  <h4 className="text-lg font-semibold flex items-center gap-2">
                    <TrendingUp size={18} className="text-indigo-400" />
                    {filterMode === 'all' ? '7 Hari Terakhir' : filterMode === 'year' ? `Bulanan ${filterYear}` : periodLabel}
                  </h4>
                  <div className="flex gap-4 text-xs">
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                      <span className="text-slate-400">Pemasukan</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded-full bg-rose-500"></div>
                      <span className="text-slate-400">Pengeluaran</span>
                    </div>
                  </div>
                </div>

                {/* Bar Chart */}
                <div className="flex items-end justify-between gap-2 h-[250px] pt-8 overflow-x-auto">
                  {barChartData.map((day, index) => (
                    <div key={index} className="flex-1 flex flex-col items-center gap-2 min-w-0">
                      <div className="flex-1 w-full flex items-end justify-center gap-0.5">
                        {/* Income Bar */}
                        <div className={`relative group/bar ${barChartData.length > 15 ? 'w-2' : 'w-5'}`}>
                          <div
                            className="w-full bg-emerald-500/80 rounded-t-md transition-all hover:bg-emerald-400"
                            style={{ height: `${(day.income / maxBarValue) * 200}px`, minHeight: day.income > 0 ? '4px' : '0' }}
                          ></div>
                          {day.income > 0 && (
                            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-xs px-2 py-1 rounded opacity-0 group-hover/bar:opacity-100 transition-opacity whitespace-nowrap z-10">
                              {formatShort(day.income)}
                            </div>
                          )}
                        </div>
                        {/* Expense Bar */}
                        <div className={`relative group/bar ${barChartData.length > 15 ? 'w-2' : 'w-5'}`}>
                          <div
                            className="w-full bg-rose-500/80 rounded-t-md transition-all hover:bg-rose-400"
                            style={{ height: `${(day.expense / maxBarValue) * 200}px`, minHeight: day.expense > 0 ? '4px' : '0' }}
                          ></div>
                          {day.expense > 0 && (
                            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-xs px-2 py-1 rounded opacity-0 group-hover/bar:opacity-100 transition-opacity whitespace-nowrap z-10">
                              {formatShort(day.expense)}
                            </div>
                          )}
                        </div>
                      </div>
                      <span className={`text-slate-500 ${barChartData.length > 15 ? 'text-[10px]' : 'text-xs'}`}>{day.name}</span>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Category Breakdown */}
              <Card>
                <h4 className="text-lg font-semibold mb-4">Pengeluaran per Kategori</h4>

                {categoryData.length > 0 ? (
                  <div className="space-y-4">
                    {categoryData.slice(0, 5).map((cat, index) => (
                      <div key={cat.name}>
                        <div className="flex justify-between items-center mb-1">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: COLORS[index % COLORS.length] }}
                            ></div>
                            <span className="text-sm text-slate-300">{cat.name}</span>
                          </div>
                          <span className="text-sm font-medium text-slate-200">{formatShort(cat.value)}</span>
                        </div>
                        <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${cat.percentage}%`,
                              backgroundColor: COLORS[index % COLORS.length]
                            }}
                          ></div>
                        </div>
                      </div>
                    ))}

                    {/* Total */}
                    <div className="pt-4 border-t border-slate-700/50">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-400">Total Pengeluaran ({periodLabel})</span>
                        <span className="font-bold text-white">{formatCurrency(summary.totalExpense)}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-[200px] text-slate-500 text-sm">
                    Belum ada pengeluaran
                  </div>
                )}
              </Card>
            </div>

            {/* Recent Transactions */}
            <Card>
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-lg font-semibold">Transaksi Terakhir</h4>
                <button
                  onClick={() => setView('history')}
                  className="text-sm text-indigo-400 hover:text-indigo-300"
                >
                  Lihat Semua
                </button>
              </div>

              {transactions.length > 0 ? (
                <div className="space-y-3">
                  {transactions.slice(0, 5).map((t) => (
                    <div key={t.id} className="flex items-center justify-between py-2">
                      <div className="flex items-center gap-3">
                        <CategoryIcon category={t.category} />
                        <div>
                          <p className="text-sm font-medium text-slate-200">{t.description}</p>
                          <p className="text-xs text-slate-500">{t.category}</p>
                        </div>
                      </div>
                      <div className={`font-semibold ${t.type === 'income' ? 'text-emerald-400' : 'text-slate-200'}`}>
                        {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500 text-sm">
                  Belum ada transaksi
                </div>
              )}
            </Card>
          </div>
        )}

        {/* History View */}
        {view === 'history' && (
          <div className="animate-fade-in">
            <div className="flex justify-between items-end mb-6">
              <h2 className="text-2xl font-bold">Riwayat Transaksi</h2>
              <div className="text-sm text-slate-400">{transactions.length} Catatan</div>
            </div>

            <div className="space-y-3">
              {transactions.length === 0 ? (
                <div className="text-center py-20 text-slate-500">
                  <History size={48} className="mx-auto mb-4 opacity-50" />
                  <p>Belum ada transaksi. Mulai dengan menambahkan satu!</p>
                </div>
              ) : (
                transactions.map((t) => (
                  <div key={t.id} className="group bg-slate-800/40 hover:bg-slate-800 border border-slate-700/50 hover:border-indigo-500/30 p-4 rounded-2xl flex items-center justify-between transition-all duration-200">
                    <div className="flex items-center gap-4">
                      <CategoryIcon category={t.category} />
                      <div>
                        <p className="font-medium text-slate-200">{t.description}</p>
                        <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                          <Calendar size={12} />
                          {new Date(t.date).toLocaleDateString('id-ID')}
                          <span className="w-1 h-1 bg-slate-600 rounded-full"></span>
                          <span>{t.category}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className={`font-bold text-lg ${t.type === 'income' ? 'text-emerald-400' : 'text-slate-200'}`}>
                        {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                      </div>
                      <button
                        onClick={() => handleDelete(t.id)}
                        className="opacity-0 group-hover:opacity-100 p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Invoice View */}
        {view === 'invoice' && (
          <InvoiceList transactions={transactions} formatCurrency={formatCurrency} />
        )}

      </main>

      {/* Floating Action Button */}
      <button
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-indigo-500 hover:bg-indigo-400 text-white rounded-full shadow-lg shadow-indigo-500/40 flex items-center justify-center transition-transform hover:scale-105 active:scale-95 z-40"
      >
        <Plus size={28} />
      </button>

      {/* Add Transaction Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-3xl p-6 shadow-2xl relative">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X size={24} />
            </button>

            <h2 className="text-xl font-bold mb-6">Tambah Transaksi</h2>

            <form onSubmit={handleAddTransaction} className="space-y-5">

              {/* Type Toggle */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-800 rounded-xl">
                <button
                  type="button"
                  onClick={() => { setType('income'); setCategory(CATEGORIES.income[0]); }}
                  className={`py-2 rounded-lg text-sm font-medium transition-all ${type === 'income' ? 'bg-emerald-500/20 text-emerald-400 shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  Pemasukan
                </button>
                <button
                  type="button"
                  onClick={() => { setType('expense'); setCategory(CATEGORIES.expense[0]); }}
                  className={`py-2 rounded-lg text-sm font-medium transition-all ${type === 'expense' ? 'bg-rose-500/20 text-rose-400 shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  Pengeluaran
                </button>
              </div>

              {/* Amount Input */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Jumlah</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">Rp</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formatNumber(amount)}
                    onChange={(e) => setAmount(parseNumber(e.target.value))}
                    placeholder="0"
                    className="w-full bg-slate-800/50 border border-slate-700 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder:text-slate-600"
                    autoFocus
                  />
                </div>
              </div>

              {/* Description Input */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Deskripsi</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="cth. Belanja Mingguan"
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder:text-slate-600"
                />
              </div>

              {/* Category Select */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Kategori</label>
                <div className="grid grid-cols-3 gap-2">
                  {(type === 'income' ? CATEGORIES.income : CATEGORIES.expense).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategory(cat)}
                      className={`py-2 px-1 text-xs rounded-lg border transition-all truncate ${
                        category === cat
                          ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300'
                          : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:bg-slate-800'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-white text-slate-900 font-bold py-3 rounded-xl hover:bg-slate-200 transition-colors mt-4 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  'Simpan Transaksi'
                )}
              </button>
            </form>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
