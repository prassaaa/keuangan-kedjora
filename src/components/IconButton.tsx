import type { LucideIcon } from 'lucide-react';

interface IconButtonProps {
  icon: LucideIcon;
  onClick: () => void;
  active?: boolean;
  label: string;
}

export function IconButton({ icon: Icon, onClick, active = false, label }: IconButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-300 font-medium ${
        active
          ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/25'
          : 'text-slate-400 hover:text-white hover:bg-slate-800'
      }`}
    >
      <Icon size={20} />
      <span className="hidden md:inline">{label}</span>
    </button>
  );
}
