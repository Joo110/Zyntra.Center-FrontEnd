import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  Plus, Pencil, Trash2, Banknote, TrendingDown, UserSearch,
  CheckCircle2, Clock, RotateCcw, XCircle, Wallet, Receipt, TrendingUp,
} from 'lucide-react';
import { financeApi, studentsApi, groupsApi } from '../../api/services';
import type {
  PaymentDto, CreatePaymentDto, UpdatePaymentDto,
  ExpenseDto, CreateExpenseDto, UpdateExpenseDto,
  StudentListDto, GroupDto,
} from '../../types';
import { PaymentMethod, PaymentStatus } from '../../types';
import { formatDate, today, firstOfMonth } from '../../utils/date';
import {
  PageHeader, Modal, ConfirmDelete, SkeletonRow,
  EmptyState, ErrorState, Pagination, FormRow, Spinner,
} from '../../components/common';

const PAGE_SIZE = 20;

const PM_LABELS: Record<number, string> = {
  0: 'كاش', 1: 'تحويل بنكي', 2: 'بطاقة', 3: 'InstaPay',
};
const PS_LABELS: Record<number, string> = {
  0: 'مدفوع', 1: 'معلق', 2: 'مدفوع جزئياً', 3: 'مُسترد',
};
const PS_COLORS: Record<number, string> = {
  0: 'badge-green', 1: 'badge-yellow', 2: 'badge-blue', 3: 'badge-red',
};
const PS_META: Record<number, { icon: React.ReactNode; color: string; bg: string }> = {
  0: { icon: <CheckCircle2 className="h-3.5 w-3.5" />, color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
  1: { icon: <Clock className="h-3.5 w-3.5" />,        color: 'text-amber-700',   bg: 'bg-amber-50 border-amber-200'   },
  2: { icon: <RotateCcw className="h-3.5 w-3.5" />,    color: 'text-blue-700',    bg: 'bg-blue-50 border-blue-200'     },
  3: { icon: <XCircle className="h-3.5 w-3.5" />,      color: 'text-red-700',     bg: 'bg-red-50 border-red-200'       },
};

const EXPENSE_CATEGORIES: { id: string; name: string }[] = [
  { id: '11111111-0000-0000-0000-000000000001', name: 'إيجار' },
  { id: '11111111-0000-0000-0000-000000000002', name: 'كهرباء' },
  { id: '11111111-0000-0000-0000-000000000003', name: 'مياه' },
  { id: '11111111-0000-0000-0000-000000000004', name: 'إنترنت' },
  { id: '11111111-0000-0000-0000-000000000005', name: 'مرتبات موظفين' },
  { id: '11111111-0000-0000-0000-000000000006', name: 'صيانة' },
  { id: '11111111-0000-0000-0000-000000000007', name: 'أدوات مكتبية' },
  { id: '11111111-0000-0000-0000-000000000008', name: 'تسويق وإعلان' },
  { id: '11111111-0000-0000-0000-000000000009', name: 'نظافة' },
  { id: '11111111-0000-0000-0000-000000000010', name: 'أمن وحراسة' },
  { id: '11111111-0000-0000-0000-000000000011', name: 'معدات وأجهزة' },
  { id: '11111111-0000-0000-0000-000000000012', name: 'مستلزمات تعليمية' },
  { id: '11111111-0000-0000-0000-000000000013', name: 'مواصلات' },
  { id: '11111111-0000-0000-0000-000000000014', name: 'ضرائب ورسوم' },
  { id: '11111111-0000-0000-0000-000000000015', name: 'اتصالات' },
  { id: '11111111-0000-0000-0000-000000000016', name: 'أخرى' },
];

type Tab = 'payments' | 'expenses' | 'student-payments';

function extractPaged<T>(res: any): { items: T[]; totalCount: number; totalPages: number } {
  const payload = res?.data ?? res;
  const items: T[] = Array.isArray(payload?.data)
    ? payload.data
    : Array.isArray(payload?.items)
      ? payload.items
      : Array.isArray(payload)
        ? payload
        : [];
  const totalCount = typeof payload?.totalCount === 'number' ? payload.totalCount : items.length;
  const totalPages = typeof payload?.totalPages === 'number' && payload.totalPages > 0 ? payload.totalPages : 1;
  return { items, totalCount, totalPages };
}

// ─── Student Payment Summary Cards ───────────────────────────────────────────

function StatCard({
  label, value, sub, icon, color,
}: {
  label: string; value: string; sub?: string;
  icon: React.ReactNode; color: string;
}) {
  return (
    <div className={`flex items-center gap-4 p-4 rounded-2xl border ${color}`}>
      <div className="flex-shrink-0 opacity-80">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs font-medium opacity-70 mb-0.5">{label}</p>
        <p className="text-xl font-extrabold leading-none">{value}</p>
        {sub && <p className="text-xs opacity-60 mt-1">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Student Payments Tab ─────────────────────────────────────────────────────

function StudentPaymentsTab({ students }: { students: StudentListDto[] }) {
  const [selectedStudent, setSelectedStudent] = useState('');
  const [payments, setPayments]               = useState<PaymentDto[]>([]);
  const [loading, setLoading]                 = useState(false);
  const [searched, setSearched]               = useState(false);

  const handleStudentChange = async (studentId: string) => {
    setSelectedStudent(studentId);
    setPayments([]);
    setSearched(false);
    if (!studentId) return;

    setLoading(true);
    try {
      const data = await financeApi.getPaymentsByStudent(studentId);
      setPayments(Array.isArray(data) ? data : []);
      setSearched(true);
    } catch {
      toast.error('فشل تحميل مدفوعات الطالب');
      setSearched(true);
    } finally {
      setLoading(false);
    }
  };

  // ── Computed Stats ──
  const totalPaid     = payments.filter(p => p.status === 0).reduce((s, p) => s + (p.netAmount ?? 0), 0);
  const totalPending  = payments.filter(p => p.status === 1).reduce((s, p) => s + (p.netAmount ?? 0), 0);
  const totalDiscount = payments.reduce((s, p) => s + (p.discount ?? 0), 0);
  const totalGross    = payments.reduce((s, p) => s + (p.amount ?? 0), 0);
  const totalNet      = payments.reduce((s, p) => s + (p.netAmount ?? 0), 0);

  const studentName = students.find(s => s.id === selectedStudent)?.fullName ?? '';

  // Group by group
  const byGroup = payments.reduce((acc, p) => {
    const key = p.groupName || p.groupId;
    if (!acc[key]) acc[key] = [];
    acc[key].push(p);
    return acc;
  }, {} as Record<string, PaymentDto[]>);

  return (
    <div className="space-y-4">
      {/* Student selector */}
      <div className="card">
        <div className="max-w-sm">
          <label className="form-label">
            الطالب <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <select
              className="form-select"
              value={selectedStudent}
              onChange={e => handleStudentChange(e.target.value)}
              disabled={loading}
            >
              <option value="">-- اختر الطالب لعرض مدفوعاته --</option>
              {students.map(s => (
                <option key={s.id} value={s.id}>{s.fullName}</option>
              ))}
            </select>
            {loading && (
              <span className="absolute left-3 top-1/2 -translate-y-1/2">
                <Spinner size="sm" />
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="card flex items-center justify-center py-12 gap-3 text-slate-400">
          <Spinner size="lg" />
          <span className="text-sm">جاري تحميل مدفوعات الطالب...</span>
        </div>
      )}

      {/* Results */}
      {!loading && searched && payments.length > 0 && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard
              label="إجمالي المدفوع"
              value={`${totalNet.toLocaleString('ar-EG')} ج`}
              sub={`من إجمالي ${totalGross.toLocaleString('ar-EG')} ج`}
              icon={<Wallet className="h-6 w-6 text-emerald-700" />}
              color="bg-emerald-50 border-emerald-200 text-emerald-900"
            />
            <StatCard
              label="المدفوع (مكتمل)"
              value={`${totalPaid.toLocaleString('ar-EG')} ج`}
              sub={`${payments.filter(p => p.status === 0).length} دفعة`}
              icon={<CheckCircle2 className="h-6 w-6 text-blue-700" />}
              color="bg-blue-50 border-blue-200 text-blue-900"
            />
            <StatCard
              label="معلق"
              value={`${totalPending.toLocaleString('ar-EG')} ج`}
              sub={`${payments.filter(p => p.status === 1).length} دفعة`}
              icon={<Clock className="h-6 w-6 text-amber-700" />}
              color="bg-amber-50 border-amber-200 text-amber-900"
            />
            <StatCard
              label="إجمالي الخصومات"
              value={`${totalDiscount.toLocaleString('ar-EG')} ج`}
              sub={`${payments.length} دفعة إجمالاً`}
              icon={<TrendingUp className="h-6 w-6 text-purple-700" />}
              color="bg-purple-50 border-purple-200 text-purple-900"
            />
          </div>

          {/* Payments grouped by group */}
          {Object.entries(byGroup).map(([groupName, groupPayments]) => {
            const groupTotal = groupPayments.reduce((s, p) => s + (p.netAmount ?? 0), 0);
            return (
              <div key={groupName} className="card">
                {/* Group header */}
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                  <div>
                    <p className="text-sm font-bold text-slate-800">{groupName}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {groupPayments.length} دفعة
                    </p>
                  </div>
                  <div className="text-left">
                    <p className="text-lg font-extrabold text-emerald-600">
                      {groupTotal.toLocaleString('ar-EG')} ج
                    </p>
                    <p className="text-xs text-slate-400">إجمالي المجموعة</p>
                  </div>
                </div>

                {/* Payments list */}
                <div className="space-y-2">
                  {groupPayments.map((p, idx) => {
                    const statusMeta = PS_META[p.status];
                    return (
                      <div
                        key={p.id}
                        className={`flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-xl border transition-all ${
                          p.status === 1 ? 'bg-amber-50/50 border-amber-100'
                          : p.status === 3 ? 'bg-red-50/50 border-red-100'
                          : 'bg-white border-slate-100 hover:border-slate-200'
                        }`}
                      >
                        {/* Index */}
                        <span className="flex-shrink-0 w-7 h-7 rounded-full bg-slate-100 text-slate-500 text-xs font-bold flex items-center justify-center">
                          {idx + 1}
                        </span>

                        {/* Date + method */}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-700">
                            {p.paymentDate ? formatDate(p.paymentDate) : '—'}
                          </p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {PM_LABELS[p.method] ?? '—'}
                            {p.collectedBy ? ` · بواسطة ${p.collectedBy}` : ''}
                          </p>
                        </div>

                        {/* Amount breakdown */}
                        <div className="flex items-center gap-4 flex-shrink-0">
                          {/* Gross */}
                          <div className="text-center hidden sm:block">
                            <p className="text-xs text-slate-400">المبلغ</p>
                            <p className="text-sm font-semibold text-slate-700">
                              {(p.amount ?? 0).toLocaleString('ar-EG')} ج
                            </p>
                          </div>
                          {/* Discount */}
                          {(p.discount ?? 0) > 0 && (
                            <div className="text-center hidden sm:block">
                              <p className="text-xs text-slate-400">خصم</p>
                              <p className="text-sm font-semibold text-red-500">
                                -{(p.discount ?? 0).toLocaleString('ar-EG')} ج
                              </p>
                            </div>
                          )}
                          {/* Net */}
                          <div className="text-center">
                            <p className="text-xs text-slate-400">الصافي</p>
                            <p className="text-base font-extrabold text-emerald-600">
                              {(p.netAmount ?? 0).toLocaleString('ar-EG')} ج
                            </p>
                          </div>
                        </div>

                        {/* Status badge */}
                        {statusMeta && (
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border flex-shrink-0 ${statusMeta.bg} ${statusMeta.color}`}>
                            {statusMeta.icon}
                            {PS_LABELS[p.status]}
                          </span>
                        )}

                        {/* Notes */}
                        {p.notes && (
                          <p className="text-xs text-slate-400 truncate max-w-[120px] flex-shrink-0 hidden lg:block">
                            {p.notes}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Group footer totals */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>
                    إجمالي المبالغ: <strong className="text-slate-700">{groupPayments.reduce((s, p) => s + (p.amount ?? 0), 0).toLocaleString('ar-EG')} ج</strong>
                  </span>
                  <span>
                    إجمالي الخصومات: <strong className="text-red-500">{groupPayments.reduce((s, p) => s + (p.discount ?? 0), 0).toLocaleString('ar-EG')} ج</strong>
                  </span>
                  <span>
                    الصافي: <strong className="text-emerald-600">{groupTotal.toLocaleString('ar-EG')} ج</strong>
                  </span>
                </div>
              </div>
            );
          })}
        </>
      )}

      {/* Empty */}
      {!loading && searched && payments.length === 0 && (
        <div className="card">
          <EmptyState
            message={`لا توجد مدفوعات مسجّلة للطالب${studentName ? ` "${studentName}"` : ''}`}
            icon={<Receipt />}
          />
        </div>
      )}

      {/* Initial state */}
      {!selectedStudent && !loading && (
        <div className="card py-14 text-center">
          <UserSearch className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">اختر طالباً لعرض سجل مدفوعاته الكامل</p>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function FinancePage() {
  const [tab, setTab] = useState<Tab>('payments');

  // ── Payments State ────────────────────────────────────────────────────────
  const [payments, setPayments]       = useState<PaymentDto[]>([]);
  const [payTotal, setPayTotal]       = useState(0);
  const [payPages, setPayPages]       = useState(1);
  const [payPage, setPayPage]         = useState(1);
  const [payFrom, setPayFrom]         = useState(firstOfMonth());
  const [payTo, setPayTo]             = useState(today());
  const [payLoading, setPayLoading]   = useState(false);
  const [payError, setPayError]       = useState('');
  const [payModal, setPayModal]       = useState<'create' | 'edit' | null>(null);
  const [paySelected, setPaySelected] = useState<PaymentDto | null>(null);
  const [paySaving, setPaySaving]     = useState(false);
  const [payForm, setPayForm]         = useState<CreatePaymentDto>({
    studentId: '', groupId: '', amount: 0, discount: 0,
    method: PaymentMethod.Cash, status: PaymentStatus.Paid,
    paymentDate: today(), notes: '',
  });
  const [payUpdateForm, setPayUpdateForm] = useState<UpdatePaymentDto | null>(null);

  // ── Expenses State ────────────────────────────────────────────────────────
  const [expenses, setExpenses]       = useState<ExpenseDto[]>([]);
  const [expTotal, setExpTotal]       = useState(0);
  const [expPages, setExpPages]       = useState(1);
  const [expPage, setExpPage]         = useState(1);
  const [expFrom, setExpFrom]         = useState(firstOfMonth());
  const [expTo, setExpTo]             = useState(today());
  const [expLoading, setExpLoading]   = useState(false);
  const [expError, setExpError]       = useState('');
  const [expModal, setExpModal]       = useState<'create' | 'edit' | null>(null);
  const [expSelected, setExpSelected] = useState<ExpenseDto | null>(null);
  const [expDelete, setExpDelete]     = useState<ExpenseDto | null>(null);
  const [expSaving, setExpSaving]     = useState(false);
  const [expDeleting, setExpDeleting] = useState(false);
  const [expForm, setExpForm]         = useState<CreateExpenseDto>({
    categoryId: EXPENSE_CATEGORIES[0].id,
    description: '', amount: 0,
    paymentMethod: PaymentMethod.Cash,
    date: today(),
  });
  const [expUpdateForm, setExpUpdateForm] = useState<UpdateExpenseDto | null>(null);

  // ── Lookup Data ───────────────────────────────────────────────────────────
  const [students, setStudents] = useState<StudentListDto[]>([]);
  const [groups, setGroups]     = useState<GroupDto[]>([]);

  useEffect(() => {
    Promise.allSettled([studentsApi.getAll(), groupsApi.getAll()]).then(([s, g]) => {
      if (s.status === 'fulfilled') setStudents(Array.isArray(s.value) ? s.value : []);
      if (g.status === 'fulfilled') setGroups(Array.isArray(g.value) ? g.value : []);
    });
  }, []);

  // ── Loaders ───────────────────────────────────────────────────────────────
  const loadPayments = useCallback(async () => {
    setPayLoading(true); setPayError('');
    try {
      const res = await financeApi.getPayments(payPage, PAGE_SIZE, payFrom, payTo);
      const { items, totalCount, totalPages } = extractPaged<PaymentDto>(res);
      setPayments(items); setPayTotal(totalCount); setPayPages(totalPages);
    } catch {
      setPayError('فشل تحميل المدفوعات');
      setPayments([]); setPayTotal(0); setPayPages(1);
    } finally { setPayLoading(false); }
  }, [payPage, payFrom, payTo]);

  const loadExpenses = useCallback(async () => {
    setExpLoading(true); setExpError('');
    try {
      const res = await financeApi.getExpenses(expPage, PAGE_SIZE, expFrom, expTo);
      const { items, totalCount, totalPages } = extractPaged<ExpenseDto>(res);
      setExpenses(items); setExpTotal(totalCount); setExpPages(totalPages);
    } catch {
      setExpError('فشل تحميل المصروفات');
      setExpenses([]); setExpTotal(0); setExpPages(1);
    } finally { setExpLoading(false); }
  }, [expPage, expFrom, expTo]);

  useEffect(() => { if (tab === 'payments') loadPayments(); }, [loadPayments, tab]);
  useEffect(() => { if (tab === 'expenses') loadExpenses(); }, [loadExpenses, tab]);

  // ── Payment Handlers ──────────────────────────────────────────────────────
  const openCreatePay = () => {
    setPayForm({
      studentId: '', groupId: '', amount: 0, discount: 0,
      method: PaymentMethod.Cash, status: PaymentStatus.Paid,
      paymentDate: today(), notes: '',
    });
    setPaySelected(null); setPayUpdateForm(null); setPayModal('create');
  };

  const openEditPay = (p: PaymentDto) => {
    setPaySelected(p);
    setPayUpdateForm({
      amount: p.amount ?? 0, discount: p.discount ?? 0,
      method: p.method, status: p.status,
      paymentDate: p.paymentDate, notes: p.notes,
    });
    setPayModal('edit');
  };

  const handleSavePay = async () => {
    if (payModal === 'create' && (!payForm.studentId || !payForm.groupId)) {
      toast.error('اختر الطالب والمجموعة'); return;
    }
    setPaySaving(true);
    try {
      if (payModal === 'create') {
        await financeApi.createPayment({
          ...payForm,
          amount:   Number(payForm.amount),
          discount: Number(payForm.discount || 0),
          method:   Number(payForm.method)  as PaymentMethod,
          status:   Number(payForm.status)  as PaymentStatus,
        });
        toast.success('تم تسجيل الدفعة');
      } else if (paySelected && payUpdateForm) {
        await financeApi.updatePayment(paySelected.id, {
          ...payUpdateForm,
          amount:   Number(payUpdateForm.amount),
          discount: Number(payUpdateForm.discount || 0),
          method:   Number(payUpdateForm.method)  as PaymentMethod,
          status:   Number(payUpdateForm.status)  as PaymentStatus,
        });
        toast.success('تم التعديل');
      }
      setPayModal(null); await loadPayments();
    } catch (e: any) { toast.error(e?.message || 'حدث خطأ'); }
    finally { setPaySaving(false); }
  };

  // ── Expense Handlers ──────────────────────────────────────────────────────
  const openCreateExp = () => {
    setExpForm({
      categoryId: EXPENSE_CATEGORIES[0].id,
      description: '', amount: 0,
      paymentMethod: PaymentMethod.Cash,
      date: today(),
    });
    setExpSelected(null); setExpUpdateForm(null); setExpModal('create');
  };

  const openEditExp = (e: ExpenseDto) => {
    setExpSelected(e);
    setExpUpdateForm({
      categoryId:    e.categoryId,
      description:   e.description,
      amount:        e.amount,
      paymentMethod: e.paymentMethod,
      date:          e.date,
    });
    setExpModal('edit');
  };

  const handleSaveExp = async () => {
    const catId = expModal === 'create' ? expForm.categoryId    : expUpdateForm?.categoryId;
    const desc  = expModal === 'create' ? expForm.description   : expUpdateForm?.description;
    const amt   = expModal === 'create' ? expForm.amount        : expUpdateForm?.amount;
    if (!catId)           { toast.error('اختر فئة المصروف'); return; }
    if (!desc?.trim())    { toast.error('أدخل وصف المصروف'); return; }
    if (!amt || amt <= 0) { toast.error('أدخل مبلغاً صحيحاً'); return; }

    setExpSaving(true);
    try {
      if (expModal === 'create') {
        await financeApi.createExpense({
          categoryId:    expForm.categoryId,
          description:   expForm.description,
          amount:        Number(expForm.amount),
          paymentMethod: Number(expForm.paymentMethod) as PaymentMethod,
          date:          expForm.date,
        });
        toast.success('تم تسجيل المصروف');
      } else if (expSelected && expUpdateForm) {
        await financeApi.updateExpense(expSelected.id, {
          categoryId:    expUpdateForm.categoryId,
          description:   expUpdateForm.description,
          amount:        Number(expUpdateForm.amount),
          paymentMethod: Number(expUpdateForm.paymentMethod) as PaymentMethod,
          date:          expUpdateForm.date,
        });
        toast.success('تم التعديل');
      }
      setExpModal(null); await loadExpenses();
    } catch (e: any) { toast.error(e?.message || 'حدث خطأ'); }
    finally { setExpSaving(false); }
  };

  const handleDeleteExp = async () => {
    if (!expDelete) return;
    setExpDeleting(true);
    try {
      await financeApi.deleteExpense(expDelete.id);
      toast.success('تم الحذف'); setExpDelete(null); await loadExpenses();
    } catch (e: any) { toast.error(e?.message || 'حدث خطأ'); }
    finally { setExpDeleting(false); }
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div>
      <PageHeader title="المالية" subtitle="إدارة المدفوعات والمصروفات وسجلات الطلاب" />

      {/* ── Tab Bar ── */}
      <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl w-fit mb-4">
        <button
          onClick={() => setTab('payments')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-150 ${
            tab === 'payments' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Banknote className="h-4 w-4" />
          <span className="hidden sm:inline">المدفوعات</span>
        </button>
        <button
          onClick={() => setTab('expenses')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-150 ${
            tab === 'expenses' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <TrendingDown className="h-4 w-4" />
          <span className="hidden sm:inline">المصروفات</span>
        </button>
        <button
          onClick={() => setTab('student-payments')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-150 ${
            tab === 'student-payments' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <UserSearch className="h-4 w-4" />
          <span className="hidden sm:inline">مدفوعات الطالب</span>
        </button>
      </div>

      {/* ── Payments Tab ── */}
      {tab === 'payments' && (
        <>
          <div className="card mb-4">
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="form-label">من</label>
                <input type="date" className="form-input" value={payFrom} onChange={e => setPayFrom(e.target.value)} />
              </div>
              <div>
                <label className="form-label">إلى</label>
                <input type="date" className="form-input" value={payTo} onChange={e => setPayTo(e.target.value)} />
              </div>
              <button onClick={loadPayments} className="btn-primary">عرض</button>
              <button onClick={openCreatePay} className="btn-primary mr-auto">
                <Plus className="h-4 w-4" /> تسجيل دفعة
              </button>
            </div>
          </div>
          <div className="card">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="table-header">الطالب</th>
                    <th className="table-header">المجموعة</th>
                    <th className="table-header">المبلغ</th>
                    <th className="table-header">الخصم</th>
                    <th className="table-header">الصافي</th>
                    <th className="table-header">طريقة الدفع</th>
                    <th className="table-header">تاريخ الدفع</th>
                    <th className="table-header">الحالة</th>
                    <th className="table-header">إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {payLoading && [1,2,3].map(i => <SkeletonRow key={i} cols={9} />)}
                  {!payLoading && payError && <ErrorState message={payError} onRetry={loadPayments} />}
                  {!payLoading && !payError && payments.length === 0 && <EmptyState message="لا توجد مدفوعات" icon={<Banknote />} />}
                  {!payLoading && !payError && payments.map(p => (
                    <tr key={p.id} className="table-row">
                      <td className="table-cell font-semibold text-slate-800">{p.studentName ?? '—'}</td>
                      <td className="table-cell">{p.groupName ?? '—'}</td>
                      <td className="table-cell">{(p.amount ?? 0).toLocaleString('ar-EG')} ج</td>
                      <td className="table-cell">{(p.discount || 0).toLocaleString('ar-EG')} ج</td>
                      <td className="table-cell font-bold text-green-600">{(p.netAmount ?? 0).toLocaleString('ar-EG')} ج</td>
                      <td className="table-cell">{PM_LABELS[p.method] ?? '—'}</td>
                      <td className="table-cell">{p.paymentDate ? formatDate(p.paymentDate) : '—'}</td>
                      <td className="table-cell">
                        <span className={PS_COLORS[p.status] ?? 'badge-gray'}>{PS_LABELS[p.status] ?? '—'}</span>
                      </td>
                      <td className="table-cell">
                        <button onClick={() => openEditPay(p)} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600">
                          <Pencil className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={payPage} totalPages={payPages} totalCount={payTotal} pageSize={PAGE_SIZE} onChange={setPayPage} />
          </div>
        </>
      )}

      {/* ── Expenses Tab ── */}
      {tab === 'expenses' && (
        <>
          <div className="card mb-4">
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="form-label">من</label>
                <input type="date" className="form-input" value={expFrom} onChange={e => setExpFrom(e.target.value)} />
              </div>
              <div>
                <label className="form-label">إلى</label>
                <input type="date" className="form-input" value={expTo} onChange={e => setExpTo(e.target.value)} />
              </div>
              <button onClick={loadExpenses} className="btn-primary">عرض</button>
              <button onClick={openCreateExp} className="btn-danger mr-auto">
                <Plus className="h-4 w-4" /> تسجيل مصروف
              </button>
            </div>
          </div>
          <div className="card">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="table-header">الفئة</th>
                    <th className="table-header">الوصف</th>
                    <th className="table-header">المبلغ</th>
                    <th className="table-header">طريقة الدفع</th>
                    <th className="table-header">التاريخ</th>
                    <th className="table-header">بواسطة</th>
                    <th className="table-header">إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {expLoading && [1,2,3].map(i => <SkeletonRow key={i} cols={7} />)}
                  {!expLoading && expError && <ErrorState message={expError} onRetry={loadExpenses} />}
                  {!expLoading && !expError && expenses.length === 0 && <EmptyState message="لا توجد مصروفات" icon={<TrendingDown />} />}
                  {!expLoading && !expError && expenses.map(e => (
                    <tr key={e.id} className="table-row">
                      <td className="table-cell">{e.categoryName ?? '—'}</td>
                      <td className="table-cell font-semibold text-slate-800">{e.description ?? '—'}</td>
                      <td className="table-cell font-bold text-red-600">{(e.amount ?? 0).toLocaleString('ar-EG')} ج</td>
                      <td className="table-cell">{PM_LABELS[e.paymentMethod] ?? '—'}</td>
                      <td className="table-cell">{e.date ? formatDate(e.date) : '—'}</td>
                      <td className="table-cell text-slate-500">{e.createdByUsername ?? '—'}</td>
                      <td className="table-cell">
                        <div className="flex gap-1">
                          <button onClick={() => openEditExp(e)} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600">
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button onClick={() => setExpDelete(e)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-600">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={expPage} totalPages={expPages} totalCount={expTotal} pageSize={PAGE_SIZE} onChange={setExpPage} />
          </div>
        </>
      )}

      {/* ── Student Payments Tab ── */}
      {tab === 'student-payments' && (
        <StudentPaymentsTab students={students} />
      )}

      {/* ── Payment Modal ── */}
      <Modal
        isOpen={payModal === 'create' || payModal === 'edit'}
        title={payModal === 'create' ? 'تسجيل دفعة جديدة' : 'تعديل الدفعة'}
        onClose={() => setPayModal(null)}
        size="lg"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {payModal === 'create' && (
            <>
              <FormRow label="الطالب" required>
                <select className="form-select" value={payForm.studentId} onChange={e => setPayForm(f => ({ ...f, studentId: e.target.value }))}>
                  <option value="">-- اختر الطالب --</option>
                  {students.map(s => <option key={s.id} value={s.id}>{s.fullName}</option>)}
                </select>
              </FormRow>
              <FormRow label="المجموعة" required>
                <select className="form-select" value={payForm.groupId} onChange={e => setPayForm(f => ({ ...f, groupId: e.target.value }))}>
                  <option value="">-- اختر المجموعة --</option>
                  {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </FormRow>
            </>
          )}
          <FormRow label="المبلغ (جنيه)" required>
            <input type="number" min={0} className="form-input"
              value={payModal === 'create' ? payForm.amount : payUpdateForm?.amount || 0}
              onChange={e => payModal === 'create'
                ? setPayForm(f => ({ ...f, amount: +e.target.value }))
                : setPayUpdateForm(f => f ? { ...f, amount: +e.target.value } : f)}
            />
          </FormRow>
          <FormRow label="الخصم (جنيه)">
            <input type="number" min={0} className="form-input"
              value={payModal === 'create' ? payForm.discount || 0 : payUpdateForm?.discount || 0}
              onChange={e => payModal === 'create'
                ? setPayForm(f => ({ ...f, discount: +e.target.value }))
                : setPayUpdateForm(f => f ? { ...f, discount: +e.target.value } : f)}
            />
          </FormRow>
          <FormRow label="طريقة الدفع" required>
            <select className="form-select"
              value={payModal === 'create' ? payForm.method : payUpdateForm?.method ?? 0}
              onChange={e => payModal === 'create'
                ? setPayForm(f => ({ ...f, method: +e.target.value as PaymentMethod }))
                : setPayUpdateForm(f => f ? { ...f, method: +e.target.value as PaymentMethod } : f)}
            >
              {Object.entries(PM_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </FormRow>
          <FormRow label="الحالة" required>
            <select className="form-select"
              value={payModal === 'create' ? payForm.status : payUpdateForm?.status ?? 0}
              onChange={e => payModal === 'create'
                ? setPayForm(f => ({ ...f, status: +e.target.value as PaymentStatus }))
                : setPayUpdateForm(f => f ? { ...f, status: +e.target.value as PaymentStatus } : f)}
            >
              {Object.entries(PS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </FormRow>
          <FormRow label="تاريخ الدفع" required>
            <input type="date" className="form-input"
              value={payModal === 'create' ? payForm.paymentDate : payUpdateForm?.paymentDate || ''}
              onChange={e => payModal === 'create'
                ? setPayForm(f => ({ ...f, paymentDate: e.target.value }))
                : setPayUpdateForm(f => f ? { ...f, paymentDate: e.target.value } : f)}
            />
          </FormRow>
          <FormRow label="ملاحظات">
            <input className="form-input"
              value={payModal === 'create' ? payForm.notes || '' : payUpdateForm?.notes || ''}
              onChange={e => payModal === 'create'
                ? setPayForm(f => ({ ...f, notes: e.target.value }))
                : setPayUpdateForm(f => f ? { ...f, notes: e.target.value } : f)}
            />
          </FormRow>
        </div>
        <div className="flex gap-3 pt-4 mt-2 border-t border-slate-100">
          <button onClick={handleSavePay} disabled={paySaving} className="btn-primary flex-1 justify-center">
            {paySaving && <Spinner size="sm" />} {paySaving ? 'جاري الحفظ...' : 'حفظ'}
          </button>
          <button onClick={() => setPayModal(null)} className="btn-secondary flex-1 justify-center">إلغاء</button>
        </div>
      </Modal>

      {/* ── Expense Modal ── */}
      <Modal
        isOpen={expModal === 'create' || expModal === 'edit'}
        title={expModal === 'create' ? 'تسجيل مصروف' : 'تعديل المصروف'}
        onClose={() => setExpModal(null)}
      >
        <div className="space-y-4">
          <FormRow label="الفئة" required>
            <select className="form-select"
              value={expModal === 'create' ? expForm.categoryId : expUpdateForm?.categoryId || ''}
              onChange={e => expModal === 'create'
                ? setExpForm(f => ({ ...f, categoryId: e.target.value }))
                : setExpUpdateForm(f => f ? { ...f, categoryId: e.target.value } : f)}
            >
              <option value="">-- اختر الفئة --</option>
              {EXPENSE_CATEGORIES.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </FormRow>
          <FormRow label="الوصف" required>
            <input className="form-input" placeholder="اكتب تفاصيل المصروف..."
              value={expModal === 'create' ? expForm.description : expUpdateForm?.description || ''}
              onChange={e => expModal === 'create'
                ? setExpForm(f => ({ ...f, description: e.target.value }))
                : setExpUpdateForm(f => f ? { ...f, description: e.target.value } : f)}
            />
          </FormRow>
          <FormRow label="المبلغ (جنيه)" required>
            <input type="number" min={0} className="form-input"
              value={expModal === 'create' ? expForm.amount : expUpdateForm?.amount || 0}
              onChange={e => expModal === 'create'
                ? setExpForm(f => ({ ...f, amount: +e.target.value }))
                : setExpUpdateForm(f => f ? { ...f, amount: +e.target.value } : f)}
            />
          </FormRow>
          <FormRow label="طريقة الدفع" required>
            <select className="form-select"
              value={expModal === 'create' ? expForm.paymentMethod : expUpdateForm?.paymentMethod ?? 0}
              onChange={e => expModal === 'create'
                ? setExpForm(f => ({ ...f, paymentMethod: +e.target.value as PaymentMethod }))
                : setExpUpdateForm(f => f ? { ...f, paymentMethod: +e.target.value as PaymentMethod } : f)}
            >
              {Object.entries(PM_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </FormRow>
          <FormRow label="التاريخ" required>
            <input type="date" className="form-input"
              value={expModal === 'create' ? expForm.date : expUpdateForm?.date || ''}
              onChange={e => expModal === 'create'
                ? setExpForm(f => ({ ...f, date: e.target.value }))
                : setExpUpdateForm(f => f ? { ...f, date: e.target.value } : f)}
            />
          </FormRow>
          <div className="flex gap-3 pt-2">
            <button onClick={handleSaveExp} disabled={expSaving} className="btn-primary flex-1 justify-center">
              {expSaving && <Spinner size="sm" />} {expSaving ? 'جاري الحفظ...' : 'حفظ'}
            </button>
            <button onClick={() => setExpModal(null)} className="btn-secondary flex-1 justify-center">إلغاء</button>
          </div>
        </div>
      </Modal>

      <ConfirmDelete
        isOpen={!!expDelete}
        itemName={expDelete?.description}
        onConfirm={handleDeleteExp}
        onCancel={() => setExpDelete(null)}
        isLoading={expDeleting}
      />
    </div>
  );
}