import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  Plus, Pencil, Trash2, GraduationCap, Eye, Wallet,
  Users, BookOpen, CheckCircle2, Banknote,
  CreditCard, Smartphone, ArrowDownCircle, X,

} from 'lucide-react';
import { teachersApi } from '../../api/services';
import type {
  TeacherDto, CreateTeacherDto, UpdateTeacherDto,
  TeacherSalaryDto, GroupDto, CreateTeacherPaymentDto,
} from '../../types';
import { PaymentMethod, SalaryType } from '../../types';
import { formatDate, today } from '../../utils/date';
import {
  PageHeader, SearchBar, Modal, ConfirmDelete,
  SkeletonRow, EmptyState, ErrorState, Pagination,
  FormRow, Spinner,
} from '../../components/common';

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

const EMPTY_CREATE: CreateTeacherDto = {
  fullName: '', phone: '', email: '', specialization: '', nationalId: '',
};

const PM_LABELS: Record<number, { label: string; icon: React.ReactNode }> = {
  [PaymentMethod.Cash]:         { label: 'كاش',         icon: <Banknote className="h-3.5 w-3.5" />    },
  [PaymentMethod.BankTransfer]: { label: 'تحويل بنكي',  icon: <ArrowDownCircle className="h-3.5 w-3.5" /> },
  [PaymentMethod.Card]:         { label: 'بطاقة',        icon: <CreditCard className="h-3.5 w-3.5" />  },
  [PaymentMethod.InstaPay]:     { label: 'InstaPay',     icon: <Smartphone className="h-3.5 w-3.5" />  },
};

const ST_LABELS: Record<number, string> = {
  [SalaryType.Monthly]:   'راتب شهري',
  [SalaryType.PerLesson]: 'بالحصة',
  [SalaryType.Bonus]:     'مكافأة',
  [SalaryType.Advance]:   'سلفة',
};

// ─── Teacher Detail Drawer ────────────────────────────────────────────────────

function TeacherDetailDrawer({
  teacher,
  onClose,
}: {
  teacher: TeacherDto;
  onClose: () => void;
}) {
  const [groups, setGroups]   = useState<GroupDto[]>([]);
  const [salary, setSalary]   = useState<TeacherSalaryDto | null>(null);
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'groups' | 'salary'>('groups');

  // Pay salary form
  const [payModal, setPayModal]   = useState(false);
  const [paySaving, setPaySaving] = useState(false);
  const [payForm, setPayForm]     = useState<Omit<CreateTeacherPaymentDto, 'teacherId'>>({
    amount:      0,
    salaryType:  SalaryType.Monthly,
    method:      PaymentMethod.Cash,
    paymentDate: today(),
    notes:       '',
  });

  // Load all teacher data in parallel
  useEffect(() => {
    setLoading(true);
    Promise.allSettled([
      teachersApi.getGroups(teacher.id),
      teachersApi.getSalary(teacher.id),
      teachersApi.getBalance(teacher.id),
    ]).then(([g, s, b]) => {
      if (g.status === 'fulfilled') setGroups(Array.isArray(g.value) ? g.value : []);
      if (s.status === 'fulfilled') setSalary(s.value ?? null);
      if (b.status === 'fulfilled') setBalance(typeof b.value === 'number' ? b.value : 0);
    }).finally(() => setLoading(false));
  }, [teacher.id]);

  const handlePaySalary = async () => {
    if (!payForm.amount || payForm.amount <= 0) {
      toast.error('أدخل مبلغاً صحيحاً'); return;
    }
    setPaySaving(true);
    try {
      await teachersApi.paySalary({
        teacherId:   teacher.id,
        amount:      Number(payForm.amount),
        salaryType:  Number(payForm.salaryType)  as SalaryType,
        method:      Number(payForm.method)       as PaymentMethod,
        paymentDate: payForm.paymentDate,
        notes:       payForm.notes || undefined,
      });
      toast.success('تم تسجيل الدفعة بنجاح ✓');
      setPayModal(false);
      // Refresh salary data
      const [s, b] = await Promise.all([
        teachersApi.getSalary(teacher.id),
        teachersApi.getBalance(teacher.id),
      ]);
      setSalary(s);
      setBalance(typeof b === 'number' ? b : 0);
    } catch (e: any) {
      toast.error(e?.message || 'حدث خطأ أثناء الحفظ');
    } finally {
      setPaySaving(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 left-0 w-full max-w-xl bg-white shadow-2xl z-50 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-md">
              <GraduationCap className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">{teacher.fullName}</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {teacher.specialization || 'بدون تخصص'} ·{' '}
                <span className={teacher.isActive ? 'text-emerald-600' : 'text-red-500'}>
                  {teacher.isActive ? 'نشط' : 'غير نشط'}
                </span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-all flex-shrink-0"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Balance + Pay Action */}
        <div className="px-6 py-4 flex items-center justify-between gap-4 bg-white border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border ${
              balance > 0
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : balance < 0
                ? 'bg-red-50 border-red-200 text-red-800'
                : 'bg-slate-50 border-slate-200 text-slate-600'
            }`}>
              <Wallet className="h-4 w-4 opacity-70" />
              <div>
                <p className="text-xs opacity-70 leading-none mb-0.5">الرصيد الحالي</p>
                <p className="text-lg font-extrabold leading-none">
                  {balance.toLocaleString('ar-EG')} ج
                </p>
              </div>
            </div>
            {salary && (
              <div className="text-center px-3">
                <p className="text-xs text-slate-400">إجمالي المدفوع</p>
                <p className="text-sm font-bold text-slate-700">
                  {(salary.totalPaid ?? 0).toLocaleString('ar-EG')} ج
                </p>
              </div>
            )}
          </div>
          <button
            onClick={() => {
              setPayForm({ amount: 0, salaryType: SalaryType.Monthly, method: PaymentMethod.Cash, paymentDate: today(), notes: '' });
              setPayModal(true);
            }}
            className="btn-primary flex-shrink-0 flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            دفع راتب
          </button>
        </div>

        {/* Tab Bar */}
        <div className="flex items-center gap-1 px-6 py-3 border-b border-slate-100">
          <button
            onClick={() => setActiveTab('groups')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'groups'
                ? 'bg-slate-800 text-white'
                : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            <Users className="h-4 w-4" />
            المجموعات ({groups.length})
          </button>
          <button
            onClick={() => setActiveTab('salary')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'salary'
                ? 'bg-slate-800 text-white'
                : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            <Banknote className="h-4 w-4" />
            سجل الراتب ({salary?.payments?.length ?? 0})
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-16 gap-3 text-slate-400">
              <Spinner size="lg" />
              <span className="text-sm">جاري تحميل البيانات...</span>
            </div>
          ) : activeTab === 'groups' ? (
            /* ── Groups Tab ── */
            groups.length > 0 ? (
              <div className="space-y-3">
                {groups.map(g => {
                  const fillPct = g.maxCapacity > 0
                    ? Math.round((g.currentEnrollment / g.maxCapacity) * 100)
                    : 0;
                  return (
                    <div
                      key={g.id}
                      className="p-4 rounded-2xl border border-slate-100 bg-white hover:border-slate-200 hover:shadow-sm transition-all"
                    >
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                            <BookOpen className="h-4 w-4 text-blue-600" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-800">{g.name}</p>
                            <p className="text-xs text-slate-400 mt-0.5">{g.subjectName || '—'}</p>
                          </div>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full font-semibold border flex-shrink-0 ${
                          g.isActive
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                            : 'bg-slate-100 border-slate-200 text-slate-500'
                        }`}>
                          {g.isActive ? 'نشطة' : 'منتهية'}
                        </span>
                      </div>

                      {/* Details row */}
                      <div className="flex items-center gap-4 text-xs text-slate-500 mb-3">
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {g.currentEnrollment} / {g.maxCapacity} طالب
                        </span>
                        <span>{g.branchName || '—'}</span>
                        <span className="font-semibold text-slate-700">
                          {(g.fees ?? 0).toLocaleString('ar-EG')} ج
                        </span>
                      </div>

                      {/* Capacity bar */}
                      <div className="space-y-1">
                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              fillPct >= 90 ? 'bg-red-400'
                              : fillPct >= 70 ? 'bg-amber-400'
                              : 'bg-emerald-400'
                            }`}
                            style={{ width: `${fillPct}%` }}
                          />
                        </div>
                        <p className="text-xs text-slate-400">{fillPct}% ممتلئ</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-12 text-center">
                <Users className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-400 text-sm">لا توجد مجموعات لهذا المدرس</p>
              </div>
            )
          ) : (
            /* ── Salary Tab ── */
            salary?.payments && salary.payments.length > 0 ? (
              <div className="space-y-2">
                {salary.payments.map((p, idx) => {
                  const pm = PM_LABELS[p.method];
                  return (
                    <div
                      key={p.id}
                      className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-100 bg-white hover:border-slate-200 transition-all"
                    >
                      {/* Index */}
                      <span className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 text-xs font-bold flex items-center justify-center flex-shrink-0">
                        {idx + 1}
                      </span>

                      {/* Icon */}
                      <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0 text-blue-600">
                        {pm?.icon}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800">
                          {ST_LABELS[p.salaryType] ?? '—'}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {pm?.label} · {p.paymentDate ? formatDate(p.paymentDate) : '—'}
                        </p>
                        {p.notes && (
                          <p className="text-xs text-slate-400 truncate mt-0.5">{p.notes}</p>
                        )}
                      </div>

                      {/* Amount */}
                      <p className="text-base font-extrabold text-emerald-600 flex-shrink-0">
                        {(p.amount ?? 0).toLocaleString('ar-EG')} ج
                      </p>
                    </div>
                  );
                })}

                {/* Total */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-200 mt-2">
                  <span className="text-sm font-semibold text-slate-600">إجمالي المدفوع</span>
                  <span className="text-lg font-extrabold text-slate-800">
                    {(salary.totalPaid ?? 0).toLocaleString('ar-EG')} ج
                  </span>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center">
                <Banknote className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-400 text-sm">لا يوجد سجل مدفوعات لهذا المدرس</p>
              </div>
            )
          )}
        </div>
      </div>

      {/* Pay Salary Modal */}
      <Modal
        isOpen={payModal}
        title={`دفع راتب — ${teacher.fullName}`}
        onClose={() => setPayModal(false)}
      >
        <div className="space-y-4">
          <FormRow label="نوع الدفع" required>
            <select
              className="form-select"
              value={payForm.salaryType}
              onChange={e => setPayForm(f => ({ ...f, salaryType: +e.target.value as SalaryType }))}
            >
              {Object.entries(ST_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </FormRow>

          <FormRow label="المبلغ (جنيه)" required>
            <input
              type="number"
              min={1}
              className="form-input"
              placeholder="0"
              value={payForm.amount || ''}
              onChange={e => setPayForm(f => ({ ...f, amount: +e.target.value }))}
            />
          </FormRow>

          <FormRow label="طريقة الدفع" required>
            <select
              className="form-select"
              value={payForm.method}
              onChange={e => setPayForm(f => ({ ...f, method: +e.target.value as PaymentMethod }))}
            >
              {Object.entries(PM_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </FormRow>

          <FormRow label="تاريخ الدفع" required>
            <input
              type="date"
              className="form-input"
              value={payForm.paymentDate}
              onChange={e => setPayForm(f => ({ ...f, paymentDate: e.target.value }))}
            />
          </FormRow>

          <FormRow label="ملاحظات">
            <input
              className="form-input"
              placeholder="أي ملاحظات إضافية..."
              value={payForm.notes || ''}
              onChange={e => setPayForm(f => ({ ...f, notes: e.target.value }))}
            />
          </FormRow>

          {/* Preview */}
          {payForm.amount > 0 && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
              <p className="text-sm text-emerald-800">
                سيتم دفع <strong>{Number(payForm.amount).toLocaleString('ar-EG')} ج</strong> كـ{' '}
                {ST_LABELS[payForm.salaryType]} عبر {PM_LABELS[payForm.method]?.label}
              </p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              onClick={handlePaySalary}
              disabled={paySaving}
              className="btn-primary flex-1 justify-center"
            >
              {paySaving && <Spinner size="sm" />}
              {paySaving ? 'جاري الحفظ...' : 'تأكيد الدفع'}
            </button>
            <button
              onClick={() => setPayModal(false)}
              className="btn-secondary flex-1 justify-center"
            >
              إلغاء
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TeachersPage() {
  const [items, setItems]         = useState<TeacherDto[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage]           = useState(1);
  const [search, setSearch]       = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [activeOnly, setActiveOnly] = useState(true);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');

  // Modals
  const [modal, setModal]                 = useState<'create' | 'edit' | null>(null);
  const [selected, setSelected]           = useState<TeacherDto | null>(null);
  const [deleteTarget, setDeleteTarget]   = useState<TeacherDto | null>(null);
  const [detailTeacher, setDetailTeacher] = useState<TeacherDto | null>(null);

  // Forms
  const [formCreate, setFormCreate] = useState<CreateTeacherDto>(EMPTY_CREATE);
  const [formUpdate, setFormUpdate] = useState<UpdateTeacherDto | null>(null);
  const [saving, setSaving]   = useState(false);
  const [deleting, setDeleting] = useState(false);

  // ── Load ──────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await teachersApi.getPaged(page, PAGE_SIZE, search || undefined, activeOnly) as any;

      let list: TeacherDto[] = [];
      let count = 0;
      let pages = 1;

      if (Array.isArray(res?.data?.data)) {
        list  = res.data.data;
        count = res.data.totalCount ?? 0;
        pages = res.data.totalPages ?? 1;
      } else if (Array.isArray(res?.items)) {
        list  = res.items;
        count = res.totalCount ?? 0;
        pages = res.totalPages ?? 1;
      } else if (Array.isArray(res?.data)) {
        list  = res.data;
        count = res.totalCount ?? 0;
        pages = res.totalPages ?? 1;
      }

      setItems(list);
      setTotalCount(count);
      setTotalPages(pages);
    } catch {
      setError('فشل تحميل البيانات');
      setItems([]); setTotalCount(0); setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [page, search, activeOnly]);

  useEffect(() => { load(); }, [load]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleSearch = () => { setSearch(searchInput); setPage(1); };

  const openCreate = () => {
    setFormCreate(EMPTY_CREATE);
    setSelected(null);
    setFormUpdate(null);
    setModal('create');
  };

  const openEdit = (item: TeacherDto) => {
    setSelected(item);
    setFormUpdate({
      fullName:       item.fullName ?? '',
      phone:          item.phone ?? '',
      email:          item.email ?? '',
      specialization: item.specialization ?? '',
      nationalId:     '',
      isActive:       item.isActive,
    });
    setModal('edit');
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (modal === 'create') {
        if (!formCreate.fullName || !formCreate.phone) {
          toast.error('الاسم والهاتف مطلوبان'); return;
        }
        await teachersApi.create(formCreate);
        toast.success('تم إضافة المدرس');
      } else if (selected && formUpdate) {
        await teachersApi.update(selected.id, formUpdate);
        toast.success('تم التعديل');
      }
      setModal(null);
      await load();
    } catch (e: any) {
      toast.error(e?.message || 'حدث خطأ');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await teachersApi.delete(deleteTarget.id);
      toast.success('تم الحذف');
      setDeleteTarget(null);
      await load();
    } catch (e: any) {
      toast.error(e?.message || 'حدث خطأ');
    } finally {
      setDeleting(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div>
      <PageHeader
        title="المدرسين"
        subtitle={`إجمالي ${totalCount} مدرس`}
        action={
          <button onClick={openCreate} className="btn-primary">
            <Plus className="h-4 w-4" /> إضافة مدرس
          </button>
        }
      />

      <div className="card">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <SearchBar
            value={searchInput}
            onChange={setSearchInput}
            onSearch={handleSearch}
            placeholder="البحث بالاسم..."
          />
          <button onClick={handleSearch} className="btn-primary">بحث</button>
          <select
            className="form-select w-auto"
            value={activeOnly ? '1' : '0'}
            onChange={e => { setActiveOnly(e.target.value === '1'); setPage(1); }}
          >
            <option value="1">النشطين فقط</option>
            <option value="0">الكل</option>
          </select>
          {(search || !activeOnly) && (
            <button
              onClick={() => { setSearch(''); setSearchInput(''); setActiveOnly(true); setPage(1); }}
              className="btn-secondary text-xs"
            >
              إعادة تعيين
            </button>
          )}
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="table-header">الاسم</th>
                <th className="table-header">الهاتف</th>
                <th className="table-header">التخصص</th>
                <th className="table-header">تاريخ الانضمام</th>
                <th className="table-header">الحالة</th>
                <th className="table-header">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {loading && [1,2,3,4,5].map(i => <SkeletonRow key={i} cols={6} />)}
              {!loading && error && <ErrorState message={error} onRetry={load} />}
              {!loading && !error && items.length === 0 && (
                <EmptyState message="لا يوجد مدرسون" icon={<GraduationCap />} />
              )}
              {!loading && !error && items.map(item => (
                <tr key={item.id} className="table-row">
                  <td className="table-cell">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-xs font-bold">
                          {item.fullName?.charAt(0) ?? '؟'}
                        </span>
                      </div>
                      <span className="font-semibold text-slate-800">{item.fullName ?? '—'}</span>
                    </div>
                  </td>
                  <td className="table-cell" dir="ltr">{item.phone ?? '—'}</td>
                  <td className="table-cell">{item.specialization || '—'}</td>
                  <td className="table-cell">{item.joinedAt ? formatDate(item.joinedAt) : '—'}</td>
                  <td className="table-cell">
                    <span className={item.isActive ? 'badge-green' : 'badge-red'}>
                      {item.isActive ? 'نشط' : 'غير نشط'}
                    </span>
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center gap-1">
                      {/* View Details */}
                      <button
                        onClick={() => setDetailTeacher(item)}
                        title="عرض التفاصيل"
                        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-all"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      {/* Edit */}
                      <button
                        onClick={() => openEdit(item)}
                        title="تعديل"
                        className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition-all"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      {/* Delete */}
                      <button
                        onClick={() => setDeleteTarget(item)}
                        title="حذف"
                        className="p-1.5 rounded-lg hover:bg-red-50 text-red-600 transition-all"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Pagination
          page={page}
          totalPages={totalPages}
          totalCount={totalCount}
          pageSize={PAGE_SIZE}
          onChange={setPage}
        />
      </div>

      {/* ── Teacher Detail Drawer ── */}
      {detailTeacher && (
        <TeacherDetailDrawer
          teacher={detailTeacher}
          onClose={() => setDetailTeacher(null)}
        />
      )}

      {/* ── Create / Edit Modal ── */}
      <Modal
        isOpen={!!modal}
        title={modal === 'create' ? 'إضافة مدرس' : 'تعديل بيانات المدرس'}
        onClose={() => setModal(null)}
      >
        <div className="space-y-4">
          {modal === 'create' ? (
            <>
              <FormRow label="الاسم الكامل" required>
                <input
                  className="form-input"
                  value={formCreate.fullName}
                  onChange={e => setFormCreate(f => ({ ...f, fullName: e.target.value }))}
                  placeholder="الاسم بالكامل"
                />
              </FormRow>
              <FormRow label="رقم الهاتف" required>
                <input
                  className="form-input"
                  value={formCreate.phone}
                  onChange={e => setFormCreate(f => ({ ...f, phone: e.target.value }))}
                  placeholder="01xxxxxxxxx"
                  dir="ltr"
                />
              </FormRow>
              <FormRow label="البريد الإلكتروني">
                <input
                  type="email"
                  className="form-input"
                  value={formCreate.email || ''}
                  onChange={e => setFormCreate(f => ({ ...f, email: e.target.value }))}
                  placeholder="example@email.com"
                  dir="ltr"
                />
              </FormRow>
              <FormRow label="التخصص">
                <input
                  className="form-input"
                  value={formCreate.specialization || ''}
                  onChange={e => setFormCreate(f => ({ ...f, specialization: e.target.value }))}
                  placeholder="مثال: رياضيات"
                />
              </FormRow>
              <FormRow label="الرقم القومي">
                <input
                  className="form-input"
                  value={formCreate.nationalId || ''}
                  onChange={e => setFormCreate(f => ({ ...f, nationalId: e.target.value }))}
                  dir="ltr"
                />
              </FormRow>
            </>
          ) : (
            formUpdate && (
              <>
                <FormRow label="الاسم الكامل" required>
                  <input
                    className="form-input"
                    value={formUpdate.fullName}
                    onChange={e => setFormUpdate(f => f ? { ...f, fullName: e.target.value } : f)}
                  />
                </FormRow>
                <FormRow label="رقم الهاتف" required>
                  <input
                    className="form-input"
                    value={formUpdate.phone}
                    onChange={e => setFormUpdate(f => f ? { ...f, phone: e.target.value } : f)}
                    dir="ltr"
                  />
                </FormRow>
                <FormRow label="البريد الإلكتروني">
                  <input
                    type="email"
                    className="form-input"
                    value={formUpdate.email || ''}
                    onChange={e => setFormUpdate(f => f ? { ...f, email: e.target.value } : f)}
                    dir="ltr"
                  />
                </FormRow>
                <FormRow label="التخصص">
                  <input
                    className="form-input"
                    value={formUpdate.specialization || ''}
                    onChange={e => setFormUpdate(f => f ? { ...f, specialization: e.target.value } : f)}
                  />
                </FormRow>
                <FormRow label="الحالة">
                  <select
                    className="form-select"
                    value={formUpdate.isActive ? '1' : '0'}
                    onChange={e => setFormUpdate(f => f ? { ...f, isActive: e.target.value === '1' } : f)}
                  >
                    <option value="1">نشط</option>
                    <option value="0">غير نشط</option>
                  </select>
                </FormRow>
              </>
            )
          )}

          <div className="flex gap-3 pt-2">
            <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 justify-center">
              {saving && <Spinner size="sm" />} {saving ? 'جاري الحفظ...' : 'حفظ'}
            </button>
            <button onClick={() => setModal(null)} className="btn-secondary flex-1 justify-center">
              إلغاء
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDelete
        isOpen={!!deleteTarget}
        itemName={deleteTarget?.fullName}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        isLoading={deleting}
      />
    </div>
  );
}