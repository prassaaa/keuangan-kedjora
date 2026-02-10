import { useState, useMemo } from 'react';
import { FileText, ChevronDown, ChevronUp, Calendar, Plus, Trash2, X, Loader2 } from 'lucide-react';
import { Card } from './Card';
import { useInvoices } from '../hooks/useInvoices';
import type { Transaction } from '../types';
import logoSvg from '../assets/logo.svg';

interface InvoiceListProps {
  transactions: Transaction[];
  formatCurrency: (value: number) => string;
}

export function InvoiceList({ transactions, formatCurrency }: InvoiceListProps) {
  const { invoices, loading, addInvoice, deleteInvoice } = useInvoices();

  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [formDesc, setFormDesc] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedTransactionId, setSelectedTransactionId] = useState('');

  const incomeTransactions = useMemo(
    () => transactions.filter(t => t.type === 'income'),
    [transactions]
  );

  const handleTransactionSelect = (transactionId: string) => {
    setSelectedTransactionId(transactionId);
    if (!transactionId) {
      setFormDesc('');
      setFormAmount('');
      setFormDate(new Date().toISOString().split('T')[0]);
      return;
    }
    const t = incomeTransactions.find(t => t.id === transactionId);
    if (t) {
      setFormDesc(t.description);
      setFormAmount(String(t.amount));
      setFormDate(new Date(t.date).toISOString().split('T')[0]);
    }
  };

  const availableYears = useMemo(() => {
    const years = new Set(invoices.map(inv => new Date(inv.date).getFullYear()));
    years.add(currentYear);
    return Array.from(years).sort((a, b) => b - a);
  }, [invoices, currentYear]);

  const filteredInvoices = useMemo(() => {
    return invoices
      .filter(inv => new Date(inv.date).getFullYear() === selectedYear)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [invoices, selectedYear]);

  const yearTotal = useMemo(
    () => filteredInvoices.reduce((sum, inv) => sum + inv.amount, 0),
    [filteredInvoices]
  );

  const generateInvoiceNumber = () => {
    const yearInvoices = invoices.filter(
      inv => new Date(inv.date).getFullYear() === new Date(formDate).getFullYear()
    );
    const nextNum = yearInvoices.length + 1;
    const year = new Date(formDate).getFullYear();
    return `INV-${year}-${String(nextNum).padStart(3, '0')}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formDesc || !formAmount || submitting) return;

    setSubmitting(true);
    try {
      const invoiceNumber = generateInvoiceNumber();
      await addInvoice({
        invoiceNumber,
        description: formDesc,
        amount: parseFloat(formAmount.replace(/\./g, '')),
        date: new Date(formDate).toISOString(),
      });
      setFormDesc('');
      setFormAmount('');
      setFormDate(new Date().toISOString().split('T')[0]);
      setSelectedTransactionId('');
      setIsModalOpen(false);
    } catch {
      // Error handled in hook
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Hapus invoice ini?')) {
      await deleteInvoice(id);
      if (expandedId === id) setExpandedId(null);
    }
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

  const formatNumber = (value: string) => {
    const num = value.replace(/\D/g, '');
    return num.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={36} className="animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex justify-between items-end mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold">Invoice</h2>
          <span className="bg-indigo-500/20 text-indigo-300 text-xs font-semibold px-2.5 py-1 rounded-full">
            {filteredInvoices.length}
          </span>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-indigo-500 hover:bg-indigo-400 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors"
        >
          <Plus size={16} />
          Tambah
        </button>
      </div>

      {/* Year Filter */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
        {availableYears.map(year => (
          <button
            key={year}
            onClick={() => { setSelectedYear(year); setExpandedId(null); }}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
              selectedYear === year
                ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/25'
                : 'bg-slate-800/50 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-700/50'
            }`}
          >
            {year}
          </button>
        ))}
      </div>

      {/* Summary Bar */}
      <Card className="mb-6">
        <div className="flex justify-between items-center">
          <div className="text-sm text-slate-400">
            <span className="font-semibold text-white text-lg">{filteredInvoices.length}</span> invoice di tahun {selectedYear}
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-400">Total</p>
            <p className="text-lg font-bold text-emerald-400">{formatCurrency(yearTotal)}</p>
          </div>
        </div>
      </Card>

      {/* Invoice List */}
      {filteredInvoices.length === 0 ? (
        <div className="text-center py-20 text-slate-500">
          <FileText size={48} className="mx-auto mb-4 opacity-50" />
          <p>Belum ada invoice di tahun {selectedYear}.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredInvoices.map(inv => (
            <div key={inv.id}>
              {/* Invoice Row */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setExpandedId(expandedId === inv.id ? null : inv.id)}
                  className="flex-1 text-left bg-slate-800/40 hover:bg-slate-800 border border-slate-700/50 hover:border-indigo-500/30 p-4 rounded-2xl flex items-center justify-between transition-all duration-200"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-indigo-500/10 rounded-full text-indigo-400">
                      <FileText size={18} />
                    </div>
                    <div>
                      <p className="font-medium text-slate-200">{inv.invoiceNumber}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{inv.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-emerald-400">{formatCurrency(inv.amount)}</span>
                    {expandedId === inv.id ? (
                      <ChevronUp size={18} className="text-slate-400" />
                    ) : (
                      <ChevronDown size={18} className="text-slate-400" />
                    )}
                  </div>
                </button>
                <button
                  onClick={() => handleDelete(inv.id)}
                  className="p-3 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all"
                >
                  <Trash2 size={18} />
                </button>
              </div>

              {/* Invoice Detail (Accordion) */}
              {expandedId === inv.id && (
                <div className="mt-2 bg-slate-800/60 border border-slate-700/50 rounded-2xl p-6 animate-fade-in">
                  {/* Invoice Header */}
                  <div className="flex justify-between items-start mb-6 pb-4 border-b border-slate-700/50">
                    <div className="flex items-center gap-3">
                      <img src={logoSvg} alt="Logo" className="w-10 h-10" />
                      <div>
                        <h3 className="font-bold text-white text-lg">Kedjora Finance</h3>
                        <p className="text-xs text-slate-400">Catatan Internal</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-mono font-bold text-indigo-400">{inv.invoiceNumber}</p>
                    </div>
                  </div>

                  {/* Invoice Info */}
                  <div className="mb-6">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar size={14} className="text-slate-500" />
                      <span className="text-slate-400">Tanggal:</span>
                      <span className="text-slate-200">{formatDate(inv.date)}</span>
                    </div>
                  </div>

                  {/* Invoice Items */}
                  <div className="bg-slate-900/50 rounded-xl p-4 mb-4">
                    <div className="flex justify-between items-center text-xs text-slate-500 uppercase tracking-wider mb-3 px-1">
                      <span>Deskripsi</span>
                      <span>Jumlah</span>
                    </div>
                    <div className="flex justify-between items-center py-2 px-1">
                      <span className="text-slate-200">{inv.description}</span>
                      <span className="text-slate-200 font-medium">{formatCurrency(inv.amount)}</span>
                    </div>
                  </div>

                  {/* Total */}
                  <div className="flex justify-between items-center pt-4 border-t border-slate-700/50">
                    <span className="font-semibold text-slate-300">Total</span>
                    <span className="text-xl font-bold text-emerald-400">{formatCurrency(inv.amount)}</span>
                  </div>

                  {/* Footer */}
                  <p className="text-xs text-slate-500 text-center mt-6 italic">
                    Catatan internal - Kedjora Finance
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add Invoice Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-3xl p-6 shadow-2xl relative">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X size={24} />
            </button>

            <h2 className="text-xl font-bold mb-6">Tambah Invoice</h2>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* From Transaction Dropdown */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Dari Transaksi (opsional)</label>
                <select
                  value={selectedTransactionId}
                  onChange={(e) => handleTransactionSelect(e.target.value)}
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                >
                  <option value="">-- Isi Manual --</option>
                  {incomeTransactions.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.description} - Rp {t.amount.toLocaleString('id-ID')}
                    </option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Deskripsi</label>
                <input
                  type="text"
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="cth. Jasa Pembuatan Website"
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder:text-slate-600"
                  autoFocus
                />
              </div>

              {/* Amount */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Jumlah</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">Rp</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formatNumber(formAmount)}
                    onChange={(e) => setFormAmount(e.target.value.replace(/\D/g, ''))}
                    placeholder="0"
                    className="w-full bg-slate-800/50 border border-slate-700 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder:text-slate-600"
                  />
                </div>
              </div>

              {/* Date */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Tanggal</label>
                <input
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                />
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
                  'Simpan Invoice'
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
