import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard, Building2, DoorOpen, BookOpen, Users, GraduationCap,
  UsersRound, CalendarDays, ClipboardCheck, FileQuestion, Banknote,
  ShieldCheck, UserCog, Settings, ScrollText, Calendar, LogOut, X, Zap
} from 'lucide-react';

const links = [
  { to: '/', label: 'لوحة التحكم', icon: LayoutDashboard },
  { to: '/academic-years', label: 'السنوات الدراسية و الصفوف', icon: Calendar },
  { to: '/branches', label: 'الفروع', icon: Building2 },
  { to: '/rooms', label: 'القاعات', icon: DoorOpen },
  { to: '/subjects', label: 'المواد', icon: BookOpen },
  { to: '/teachers', label: 'المدرسين', icon: GraduationCap },
  { to: '/students', label: 'الطلاب', icon: Users },
  { to: '/groups', label: 'المجموعات', icon: UsersRound },
  { to: '/lessons', label: 'الحصص', icon: CalendarDays },
  { to: '/attendance', label: 'الحضور', icon: ClipboardCheck },
  { to: '/exams', label: 'الامتحانات', icon: FileQuestion },
  { to: '/finance', label: 'المالية', icon: Banknote },
  { to: '/roles', label: 'الصلاحيات', icon: ShieldCheck },
  { to: '/users', label: 'المستخدمين', icon: UserCog },
  { to: '/settings', label: 'الإعدادات', icon: Settings },
  { to: '/audit', label: 'السجلات', icon: ScrollText },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <>
      {/* Overlay mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside className={`
        fixed top-0 right-0 h-full w-64 bg-white border-l border-slate-100 z-50 flex flex-col
        transition-transform duration-300 shadow-xl
        lg:relative lg:translate-x-0 lg:shadow-none lg:z-auto
        ${isOpen ? 'translate-x-0' : 'translate-x-full'}
      `}>
        {/* Logo */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="font-extrabold text-slate-800 text-base leading-tight">Zyntra</p>
              <p className="text-[10px] text-slate-400">نظام إدارة المركز</p>
            </div>
          </div>
          <button onClick={onClose} className="lg:hidden p-1 rounded-lg hover:bg-slate-100">
            <X className="h-4 w-4 text-slate-500" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              onClick={onClose}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* User Info */}
        <div className="p-4 border-t border-slate-100">
          <div className="flex items-center gap-3 mb-3 px-1">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-blue-700 font-bold text-sm flex-shrink-0">
              {user?.fullName?.[0] || 'م'}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800 truncate">{user?.fullName}</p>
              <p className="text-xs text-slate-400 truncate">{user?.roles?.[0] || 'مستخدم'}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2 px-4 py-2 rounded-xl text-sm text-red-600 hover:bg-red-50 transition-colors font-medium"
          >
            <LogOut className="h-4 w-4" />
            تسجيل الخروج
          </button>
        </div>
      </aside>
    </>
  );
}
