import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { Invoice } from '../types';

const STORAGE_KEY = 'kedjora_invoices';

export function useInvoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInvoices = useCallback(async () => {
    if (!isSupabaseConfigured) {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setInvoices(JSON.parse(saved));
      }
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .order('date', { ascending: false });

      if (error) throw error;

      const mapped: Invoice[] = (data || []).map((row) => ({
        id: row.id,
        invoiceNumber: row.invoice_number,
        description: row.description,
        amount: Number(row.amount),
        date: row.date,
        created_at: row.created_at,
      }));

      setInvoices(mapped);
      setError(null);
    } catch (err) {
      console.error('Error fetching invoices:', err);
      setError('Gagal memuat invoice');
    } finally {
      setLoading(false);
    }
  }, []);

  const addInvoice = useCallback(async (invoice: Omit<Invoice, 'id'>) => {
    if (!isSupabaseConfigured) {
      const newInv: Invoice = {
        ...invoice,
        id: crypto.randomUUID(),
      };
      const updated = [newInv, ...invoices];
      setInvoices(updated);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return newInv;
    }

    try {
      const { data, error } = await supabase
        .from('invoices')
        .insert([{
          invoice_number: invoice.invoiceNumber,
          description: invoice.description,
          amount: invoice.amount,
          date: invoice.date,
        }])
        .select()
        .single();

      if (error) throw error;

      const newInv: Invoice = {
        id: data.id,
        invoiceNumber: data.invoice_number,
        description: data.description,
        amount: Number(data.amount),
        date: data.date,
        created_at: data.created_at,
      };

      setInvoices((prev) => [newInv, ...prev]);
      return newInv;
    } catch (err) {
      console.error('Error adding invoice:', err);
      setError('Gagal menambahkan invoice');
      throw err;
    }
  }, [invoices]);

  const deleteInvoice = useCallback(async (id: string) => {
    if (!isSupabaseConfigured) {
      const updated = invoices.filter((inv) => inv.id !== id);
      setInvoices(updated);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return;
    }

    try {
      const { error } = await supabase
        .from('invoices')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setInvoices((prev) => prev.filter((inv) => inv.id !== id));
    } catch (err) {
      console.error('Error deleting invoice:', err);
      setError('Gagal menghapus invoice');
      throw err;
    }
  }, [invoices]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  return {
    invoices,
    loading,
    error,
    addInvoice,
    deleteInvoice,
    refetch: fetchInvoices,
  };
}
