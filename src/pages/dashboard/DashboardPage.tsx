import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, GraduationCap, UsersRound, Banknote, TrendingUp,
  BookOpen, CalendarDays, Building2, TrendingDown, ArrowUpRight,
  Activity, DoorOpen
} from 'lucide-react';
import { studentsApi, teachersApi, groupsApi, financeApi } from '../../api/services';
import { Spinner } from '../../components/common';
import { today, firstOfMonth, formatDate } from '../../utils/date';

interface Stats {
  students: number;
  teachers: number;
  groups: number;
  income: number;
  expenses: number;
}

type Payment = {
  id: string | number;
  studentName?: string;
  groupName?: string;
  paymentDate?: string;
  amount?: number;
  discount?: number;
  netAmount?: number;
  method?: number;
  methodLabel?: string;
};

type ExpenseItem = {
  id: string | number;
  amount?: number;
};

const PM_LABELS: Record<number, string> = {
  0: 'كاش',
  1: 'تحويل',
  2: 'بطاقة',
  3: 'InstaPay',
};

const FULL_PAGE_SIZE = 5000;

function unwrap<T>(res: any): T {
  if (res == null) return res;
  if (typeof res === 'object' && 'data' in res) return res.data;
  return res;
}

function toNumber(value: any): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function asArray<T>(value: any): T[] {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.items)) return value.items;
  return [];
}

function sumPayments(payments: Payment[]): number {
  return payments.reduce((sum, p) => {
    if (typeof p.netAmount === 'number') return sum + p.netAmount;

    const amount = toNumber(p.amount);
    const discount = toNumber(p.discount);
    return sum + Math.max(0, amount - discount);
  }, 0);
}

function sumExpenses(expenses: ExpenseItem[]): number {
  return expenses.reduce((sum, e) => sum + toNumber(e.amount), 0);
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [recentPayments, setRecentPayments] = useState<Payment[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const from = firstOfMonth();
        const to = today();

        const [
          studRes,
          teachRes,
          groupRes,
          finRes,
          payRes,
          allPayRes,
          allExpRes,
        ] = await Promise.allSettled([
          studentsApi.getAll(),
          teachersApi.getAll(),
          groupsApi.getAll(),
          financeApi.getCashFlowSummary(from, to),
          financeApi.getPayments(1, 5, from, to),
          financeApi.getPayments(1, FULL_PAGE_SIZE, from, to),
          financeApi.getExpenses(1, FULL_PAGE_SIZE, from, to),
        ]);

        const studentsList = studRes.status === 'fulfilled' ? asArray<any>(unwrap(studRes.value)) : [];
        const teachersList = teachRes.status === 'fulfilled' ? asArray<any>(unwrap(teachRes.value)) : [];
        const groupsList = groupRes.status === 'fulfilled' ? asArray<any>(unwrap(groupRes.value)) : [];

        const summary = finRes.status === 'fulfilled' ? unwrap<any>(finRes.value) : null;

        const fallbackPayments =
          allPayRes.status === 'fulfilled'
            ? asArray<Payment>(unwrap(allPayRes.value))
            : [];

        const fallbackExpenses =
          allExpRes.status === 'fulfilled'
            ? asArray<ExpenseItem>(unwrap(allExpRes.value))
            : [];

        const summaryIncome = toNumber(
          summary?.totalIncome ??
          summary?.income ??
          summary?.monthlyIncome ??
          summary?.cashIn ??
          summary?.revenue ??
          summary?.data?.totalIncome
        );

        const summaryExpenses = toNumber(
          summary?.totalExpenses ??
          summary?.expenses ??
          summary?.monthlyExpenses ??
          summary?.cashOut ??
          summary?.data?.totalExpenses
        );

        const calculatedIncome = summaryIncome > 0 ? summaryIncome : sumPayments(fallbackPayments);
        const calculatedExpenses = summaryExpenses > 0 ? summaryExpenses : sumExpenses(fallbackExpenses);

        setStats({
          students: studentsList.length,
          teachers: teachersList.length,
          groups: groupsList.length,
          income: calculatedIncome,
          expenses: calculatedExpenses,
        });

        if (payRes.status === 'fulfilled') {
          const res = unwrap<any>(payRes.value);
          const list = asArray<Payment>(res);
          setRecentPayments(list);
        } else {
          setRecentPayments([]);
        }
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const net = (stats?.income ?? 0) - (stats?.expenses ?? 0);
  const netPositive = net >= 0;

  const statCards = [
    {
      label: 'الطلاب',
      value: stats?.students ?? 0,
      icon: Users,
      gradient: 'from-blue-500 to-blue-600',
      link: '/students',
      sub: 'إجمالي المسجلين',
    },
    {
      label: 'المدرسين',
      value: stats?.teachers ?? 0,
      icon: GraduationCap,
      gradient: 'from-emerald-500 to-emerald-600',
      link: '/teachers',
      sub: 'المدرسين النشطين',
    },
    {
      label: 'المجموعات',
      value: stats?.groups ?? 0,
      icon: UsersRound,
      gradient: 'from-violet-500 to-violet-600',
      link: '/groups',
      sub: 'المجموعات الدراسية',
    },
    {
      label: 'صافي الشهر',
      value: `${net.toLocaleString('ar-EG')} ج`,
      icon: netPositive ? TrendingUp : TrendingDown,
      gradient: netPositive ? 'from-amber-500 to-orange-500' : 'from-red-500 to-red-600',
      link: '/finance',
      sub: 'إيرادات — مصروفات',
    },
  ];

  const quickLinks = [
    { label: 'الطلاب', to: '/students', icon: Users, color: 'text-blue-600 bg-blue-50 hover:bg-blue-100' },
    { label: 'المدرسين', to: '/teachers', icon: GraduationCap, color: 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100' },
    { label: 'المجموعات', to: '/groups', icon: UsersRound, color: 'text-violet-600 bg-violet-50 hover:bg-violet-100' },
    { label: 'المالية', to: '/finance', icon: Banknote, color: 'text-amber-600 bg-amber-50 hover:bg-amber-100' },
    { label: 'الحصص', to: '/lessons', icon: CalendarDays, color: 'text-cyan-600 bg-cyan-50 hover:bg-cyan-100' },
    { label: 'المواد', to: '/subjects', icon: BookOpen, color: 'text-pink-600 bg-pink-50 hover:bg-pink-100' },
    { label: 'الفروع', to: '/branches', icon: Building2, color: 'text-orange-600 bg-orange-50 hover:bg-orange-100' },
    { label: 'القاعات', to: '/rooms', icon: DoorOpen, color: 'text-teal-600 bg-teal-50 hover:bg-teal-100' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden bg-gradient-to-l from-blue-700 to-blue-900 rounded-2xl p-6 text-white shadow-lg">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1">
            <Activity className="h-5 w-5 text-blue-300" />
            <span className="text-blue-300 text-sm font-medium">لوحة التحكم</span>
          </div>
          <h1 className="text-2xl font-extrabold">مرحباً بك في Zyntra 👋</h1>
          <p className="text-blue-200 mt-1 text-sm">
            {new Date().toLocaleDateString('ar-EG', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>
        <div className="absolute -top-6 -left-6 h-32 w-32 rounded-full bg-white/5" />
        <div className="absolute -bottom-10 -left-4 h-44 w-44 rounded-full bg-white/5" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {statCards.map(({ label, value, icon: Icon, gradient, link, sub }) => (
          <Link
            key={label}
            to={link}
            className="relative overflow-hidden rounded-2xl p-5 text-white shadow hover:shadow-lg transition-all hover:-translate-y-0.5 group"
            style={{ background: `linear-gradient(135deg, var(--tw-gradient-stops))` }}
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${gradient}`} />
            <div className="relative z-10 flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-white/70 mb-1">{label}</p>
                <p className="text-3xl font-extrabold">{value}</p>
                <p className="text-xs text-white/60 mt-1">{sub}</p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                <Icon className="h-5 w-5" />
              </div>
            </div>
            <ArrowUpRight className="absolute bottom-3 left-3 h-4 w-4 text-white/30 group-hover:text-white/60 transition-colors" />
          </Link>
        ))}
      </div>

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card flex items-center gap-4 border-r-4 border-green-500">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-50 shrink-0">
              <TrendingUp className="h-6 w-6 text-green-500" />
            </div>
            <div>
              <p className="text-xs text-slate-500">إيرادات الشهر</p>
              <p className="text-2xl font-extrabold text-green-600">
                {stats.income.toLocaleString('ar-EG')} ج
              </p>
            </div>
          </div>

          <div className="card flex items-center gap-4 border-r-4 border-red-500">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 shrink-0">
              <TrendingDown className="h-6 w-6 text-red-500" />
            </div>
            <div>
              <p className="text-xs text-slate-500">مصروفات الشهر</p>
              <p className="text-2xl font-extrabold text-red-600">
                {stats.expenses.toLocaleString('ar-EG')} ج
              </p>
            </div>
          </div>

          <div className={`card flex items-center gap-4 border-r-4 ${netPositive ? 'border-blue-500' : 'border-red-400'}`}>
            <div className={`flex h-12 w-12 items-center justify-center rounded-xl shrink-0 ${netPositive ? 'bg-blue-50' : 'bg-red-50'}`}>
              <Banknote className={`h-6 w-6 ${netPositive ? 'text-blue-500' : 'text-red-500'}`} />
            </div>
            <div>
              <p className="text-xs text-slate-500">صافي التدفق</p>
              <p className={`text-2xl font-extrabold ${netPositive ? 'text-blue-600' : 'text-red-600'}`}>
                {net.toLocaleString('ar-EG')} ج
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card">
          <h2 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
            <Activity className="h-4 w-4 text-blue-500" /> اختصارات سريعة
          </h2>
          <div className="grid grid-cols-2 gap-2">
            {quickLinks.map(({ label, to, icon: Icon, color }) => (
              <Link
                key={label}
                to={to}
                className={`flex flex-col items-center gap-2 p-3 rounded-xl transition-all hover:scale-105 ${color}`}
              >
                <Icon className="h-5 w-5" />
                <span className="text-xs font-semibold text-center leading-tight">{label}</span>
              </Link>
            ))}
          </div>
        </div>

        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2">
              <Banknote className="h-4 w-4 text-amber-500" /> آخر المدفوعات
            </h2>
            <Link to="/finance" className="text-xs text-blue-600 hover:underline font-medium flex items-center gap-1">
              عرض الكل <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>

          {recentPayments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-slate-400">
              <Banknote className="h-10 w-10 mb-2 opacity-30" />
              <p className="text-sm">لا توجد مدفوعات حديثة</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentPayments.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-600 font-bold text-sm shrink-0">
                      {(p.studentName ?? '?')[0]}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-700">{p.studentName ?? '—'}</p>
                      <p className="text-xs text-slate-400">
                        {p.groupName ?? '—'} • {p.paymentDate ? formatDate(p.paymentDate) : '—'}
                      </p>
                    </div>
                  </div>
                  <div className="text-left shrink-0">
                    <p className="font-bold text-green-600 text-sm">
                      {(p.netAmount ?? Math.max(0, toNumber(p.amount) - toNumber(p.discount))).toLocaleString('ar-EG')} ج
                    </p>
                    <p className="text-xs text-slate-400">{p.methodLabel ?? PM_LABELS[p.method ?? 0]}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}