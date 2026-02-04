import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { Transaction } from '../types';

const STORAGE_KEY = 'kedjora_transactions';

export function useTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch transactions
  const fetchTransactions = useCallback(async () => {
    if (!isSupabaseConfigured) {
      // Fallback to localStorage
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setTransactions(JSON.parse(saved));
      }
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .order('date', { ascending: false });

      if (error) throw error;

      const mapped: Transaction[] = (data || []).map((row) => ({
        id: row.id,
        amount: Number(row.amount),
        description: row.description,
        date: row.date,
        type: row.type,
        category: row.category,
      }));

      setTransactions(mapped);
      setError(null);
    } catch (err) {
      console.error('Error fetching transactions:', err);
      setError('Gagal memuat transaksi');
    } finally {
      setLoading(false);
    }
  }, []);

  // Add transaction
  const addTransaction = useCallback(async (transaction: Omit<Transaction, 'id'>) => {
    if (!isSupabaseConfigured) {
      // Fallback to localStorage
      const newTx: Transaction = {
        ...transaction,
        id: crypto.randomUUID(),
      };
      const updated = [newTx, ...transactions];
      setTransactions(updated);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return newTx;
    }

    try {
      const { data, error } = await supabase
        .from('transactions')
        .insert([{
          amount: transaction.amount,
          description: transaction.description,
          date: transaction.date,
          type: transaction.type,
          category: transaction.category,
        }])
        .select()
        .single();

      if (error) throw error;

      const newTx: Transaction = {
        id: data.id,
        amount: Number(data.amount),
        description: data.description,
        date: data.date,
        type: data.type,
        category: data.category,
      };

      setTransactions((prev) => [newTx, ...prev]);
      return newTx;
    } catch (err) {
      console.error('Error adding transaction:', err);
      setError('Gagal menambahkan transaksi');
      throw err;
    }
  }, [transactions]);

  // Delete transaction
  const deleteTransaction = useCallback(async (id: string) => {
    if (!isSupabaseConfigured) {
      // Fallback to localStorage
      const updated = transactions.filter((t) => t.id !== id);
      setTransactions(updated);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return;
    }

    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setTransactions((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      console.error('Error deleting transaction:', err);
      setError('Gagal menghapus transaksi');
      throw err;
    }
  }, [transactions]);

  // Initial fetch
  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  return {
    transactions,
    loading,
    error,
    addTransaction,
    deleteTransaction,
    refetch: fetchTransactions,
  };
}
