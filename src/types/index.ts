export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: string;
  amount: number;
  description: string;
  date: string;
  type: TransactionType;
  category: string;
  user_id?: string;
  created_at?: string;
}

export interface FinancialSummary {
  totalIncome: number;
  totalExpense: number;
  balance: number;
}

export const CATEGORIES = {
  income: [
    'Project',
    'Gaji',
    'Bonus',
    'Investasi',
    'Lainnya'
  ],
  expense: [
    'Makanan',
    'Transport',
    'Internet',
    'Listrik',
    'Belanja',
    'Hiburan',
    'Kesehatan',
    'Pendidikan',
    'Lainnya'
  ]
} as const;
