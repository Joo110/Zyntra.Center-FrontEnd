import { Menu } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface TopbarProps {
  onMenuClick: () => void;
  title?: string;
}

export default function Topbar({ onMenuClick, title }: TopbarProps) {
  const { user } = useAuth();
  const now = new Date();
  const dateStr = now.toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <header className="h-16 bg-white border-b border-slate-100 flex items-center justify-between px-4 lg:px-6 flex-shrink-0">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-xl hover:bg-slate-100 transition-colors"
        >
          <Menu className="h-5 w-5 text-slate-600" />
        </button>
        {title && (
          <h2 className="text-sm font-semibold text-slate-600 hidden sm:block">{title}</h2>
        )}
      </div>

      <div className="flex items-center gap-3">
        <span className="text-xs text-slate-400 hidden md:block">{dateStr}</span>
       
        <div className="flex items-center gap-2 pr-3 border-r border-slate-100">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-semibold text-slate-700">{user?.fullName}</p>
            <p className="text-[10px] text-slate-400">{user?.roles?.[0] || 'مستخدم'}</p>
          </div>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white font-bold text-xs">
            {user?.fullName?.[0] || 'م'}
          </div>
        </div>
      </div>
    </header>
  );
}
