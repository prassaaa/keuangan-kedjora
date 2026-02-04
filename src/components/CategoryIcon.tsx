import type { LucideIcon } from 'lucide-react';
import {
  Utensils, Bus, Zap, TrendingUp, CreditCard, Wifi,
  Briefcase, Code, DollarSign, Gift, ShoppingBag,
  Film, HeartPulse, GraduationCap
} from 'lucide-react';

const categoryIconMap: Record<string, LucideIcon> = {
  // Income
  'Project': Code,
  'Gaji': Briefcase,
  'Bonus': Gift,
  'Investasi': TrendingUp,

  // Expense
  'Makanan': Utensils,
  'Transport': Bus,
  'Internet': Wifi,
  'Listrik': Zap,
  'Belanja': ShoppingBag,
  'Hiburan': Film,
  'Kesehatan': HeartPulse,
  'Pendidikan': GraduationCap,

  // Fallback
  'Lainnya': CreditCard,
};

interface CategoryIconProps {
  category: string;
}

export function CategoryIcon({ category }: CategoryIconProps) {
  const Icon = categoryIconMap[category] || DollarSign;
  return (
    <div className="p-2 bg-slate-700/50 rounded-full text-indigo-400">
      <Icon size={18} />
    </div>
  );
}
