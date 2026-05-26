import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, Calendar, GraduationCap } from 'lucide-react';
import { academicYearsApi, schoolGradesApi } from '../../api/services';
import type { AcademicYearDto, CreateAcademicYearDto, SchoolGradeDto, CreateSchoolGradeDto } from '../../types';
import { formatDate, today } from '../../utils/date';
import {
  PageHeader, SearchBar, Modal, ConfirmDelete,
  SkeletonRow, EmptyState, ErrorState, FormRow, Spinner
} from '../../components/common';

const EMPTY_YEAR: CreateAcademicYearDto = { name: '', startDate: today(), endDate: today(), isActive: false };
const EMPTY_GRADE: CreateSchoolGradeDto = { name: '', order: 1 };

type Tab = 'years' | 'grades';

export default function AcademicYearsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('years');

  // ── Academic Years State ──────────────────────────────────────────────────
  const [items, setItems] = useState<AcademicYearDto[]>([]);
  const [filtered, setFiltered] = useState<AcademicYearDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [selected, setSelected] = useState<AcademicYearDto | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AcademicYearDto | null>(null);
  const [form, setForm] = useState<CreateAcademicYearDto>(EMPTY_YEAR);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // ── School Grades State ───────────────────────────────────────────────────
  const [grades, setGrades] = useState<SchoolGradeDto[]>([]);
  const [gradesLoading, setGradesLoading] = useState(false);
  const [gradesError, setGradesError] = useState('');
  const [gradeModal, setGradeModal] = useState<'create' | 'edit' | null>(null);
  const [selectedGrade, setSelectedGrade] = useState<SchoolGradeDto | null>(null);
  const [deleteGradeTarget, setDeleteGradeTarget] = useState<SchoolGradeDto | null>(null);
  const [gradeForm, setGradeForm] = useState<CreateSchoolGradeDto>(EMPTY_GRADE);
  const [savingGrade, setSavingGrade] = useState(false);
  const [deletingGrade, setDeletingGrade] = useState(false);

  // ── Load Academic Years ───────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { const data = await academicYearsApi.getAll(); setItems(data); setFiltered(data); }
    catch { setError('فشل تحميل البيانات'); }
    finally { setLoading(false); }
  }, []);

  // ── Load School Grades ────────────────────────────────────────────────────
  const loadGrades = useCallback(async () => {
    setGradesLoading(true); setGradesError('');
    try { const data = await schoolGradesApi.getAll(); setGrades(data); }
    catch { setGradesError('فشل تحميل الصفوف الدراسية'); }
    finally { setGradesLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (activeTab === 'grades') loadGrades(); }, [activeTab, loadGrades]);

  useEffect(() => {
    if (!search.trim()) { setFiltered(items); return; }
    setFiltered(items.filter(i => i.name.includes(search)));
  }, [search, items]);

  // ── Academic Year Handlers ────────────────────────────────────────────────
  const openCreate = () => { setForm(EMPTY_YEAR); setSelected(null); setModal('create'); };
  const openEdit = (item: AcademicYearDto) => {
    setSelected(item);
    setForm({ name: item.name, startDate: item.startDate, endDate: item.endDate, isActive: item.isActive });
    setModal('edit');
  };

  const handleSave = async () => {
    if (!form.name || !form.startDate || !form.endDate) { toast.error('يرجى ملء جميع الحقول'); return; }
    setSaving(true);
    try {
      if (modal === 'create') {
        await academicYearsApi.create(form);
        toast.success('تم إضافة السنة الدراسية');
      } else if (selected) {
        await academicYearsApi.update(selected.id, { ...form, id: selected.id });
        toast.success('تم تعديل السنة الدراسية');
      }
      setModal(null); load();
    } catch (e: any) { toast.error(e?.message || 'حدث خطأ'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try { await academicYearsApi.delete(deleteTarget.id); toast.success('تم الحذف'); setDeleteTarget(null); load(); }
    catch (e: any) { toast.error(e?.message || 'حدث خطأ'); }
    finally { setDeleting(false); }
  };

  // ── School Grade Handlers ─────────────────────────────────────────────────
  const openCreateGrade = () => { setGradeForm(EMPTY_GRADE); setSelectedGrade(null); setGradeModal('create'); };
  const openEditGrade = (item: SchoolGradeDto) => {
    setSelectedGrade(item);
    setGradeForm({ name: item.name, order: item.order });
    setGradeModal('edit');
  };

  const handleSaveGrade = async () => {
    if (!gradeForm.name) { toast.error('يرجى إدخال اسم الصف'); return; }
    setSavingGrade(true);
    try {
      if (gradeModal === 'create') {
        await schoolGradesApi.create(gradeForm);
        toast.success('تم إضافة الصف الدراسي');
      } else if (selectedGrade) {
        await schoolGradesApi.update(selectedGrade.id, gradeForm);
        toast.success('تم تعديل الصف الدراسي');
      }
      setGradeModal(null); loadGrades();
    } catch (e: any) { toast.error(e?.message || 'حدث خطأ'); }
    finally { setSavingGrade(false); }
  };

  const handleDeleteGrade = async () => {
    if (!deleteGradeTarget) return;
    setDeletingGrade(true);
    try { await schoolGradesApi.delete(deleteGradeTarget.id); toast.success('تم الحذف'); setDeleteGradeTarget(null); loadGrades(); }
    catch (e: any) { toast.error(e?.message || 'حدث خطأ'); }
    finally { setDeletingGrade(false); }
  };

  return (
    <div>
      <PageHeader
        title="السنوات الدراسية والصفوف الدراسية"
        subtitle="إدارة السنوات والفصول والصفوف الدراسية"
        action={
          activeTab === 'years' ? (
            <button onClick={openCreate} className="btn-primary">
              <Plus className="h-4 w-4" /> إضافة سنة دراسية
            </button>
          ) : (
            <button onClick={openCreateGrade} className="btn-primary">
              <Plus className="h-4 w-4" /> إضافة صف دراسي
            </button>
          )
        }
      />

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('years')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'years'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Calendar className="h-4 w-4" />
          السنوات الدراسية
        </button>
        <button
          onClick={() => setActiveTab('grades')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'grades'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <GraduationCap className="h-4 w-4" />
          الصفوف الدراسية
        </button>
      </div>

      {/* ── Academic Years Tab ── */}
      {activeTab === 'years' && (
        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <SearchBar value={search} onChange={setSearch} placeholder="البحث في السنوات..." />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="table-header">اسم السنة</th>
                  <th className="table-header">تاريخ البداية</th>
                  <th className="table-header">تاريخ النهاية</th>
                  <th className="table-header">الحالة</th>
                  <th className="table-header">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {loading && [1,2,3].map(i => <SkeletonRow key={i} cols={5} />)}
                {!loading && error && <ErrorState message={error} onRetry={load} />}
                {!loading && !error && filtered.length === 0 && <EmptyState message="لا توجد سنوات دراسية" icon={<Calendar />} />}
                {!loading && !error && filtered.map(item => (
                  <tr key={item.id} className="table-row">
                    <td className="table-cell font-semibold text-slate-800">{item.name}</td>
                    <td className="table-cell">{formatDate(item.startDate)}</td>
                    <td className="table-cell">{formatDate(item.endDate)}</td>
                    <td className="table-cell">
                      <span className={item.isActive ? 'badge-green' : 'badge-gray'}>{item.isActive ? 'نشطة' : 'منتهية'}</span>
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEdit(item)} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors"><Pencil className="h-4 w-4" /></button>
                        <button onClick={() => setDeleteTarget(item)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-600 transition-colors"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── School Grades Tab ── */}
      {activeTab === 'grades' && (
        <div className="card">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="table-header">اسم الصف</th>
                  <th className="table-header">الترتيب</th>
                  <th className="table-header">عدد الطلاب</th>
                  <th className="table-header">عدد المواد</th>
                  <th className="table-header">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {gradesLoading && [1,2,3].map(i => <SkeletonRow key={i} cols={5} />)}
                {!gradesLoading && gradesError && <ErrorState message={gradesError} onRetry={loadGrades} />}
                {!gradesLoading && !gradesError && grades.length === 0 && <EmptyState message="لا توجد صفوف دراسية" icon={<GraduationCap />} />}
                {!gradesLoading && !gradesError && grades.map(item => (
                  <tr key={item.id} className="table-row">
                    <td className="table-cell font-semibold text-slate-800">{item.name}</td>
                    <td className="table-cell">{item.order}</td>
                    <td className="table-cell">{item.studentCount}</td>
                    <td className="table-cell">{item.subjectCount}</td>
                    <td className="table-cell">
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEditGrade(item)} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors"><Pencil className="h-4 w-4" /></button>
                        <button onClick={() => setDeleteGradeTarget(item)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-600 transition-colors"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Academic Year Modal ── */}
      <Modal isOpen={!!modal} title={modal === 'create' ? 'إضافة سنة دراسية' : 'تعديل السنة الدراسية'} onClose={() => setModal(null)}>
        <div className="space-y-4">
          <FormRow label="اسم السنة الدراسية" required>
            <input className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="مثال: 2024-2025" />
          </FormRow>
          <FormRow label="تاريخ البداية" required>
            <input type="date" className="form-input" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
          </FormRow>
          <FormRow label="تاريخ النهاية" required>
            <input type="date" className="form-input" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} />
          </FormRow>
          <FormRow label="الحالة">
            <select className="form-select" value={form.isActive ? '1' : '0'} onChange={e => setForm(f => ({ ...f, isActive: e.target.value === '1' }))}>
              <option value="1">نشطة</option>
              <option value="0">منتهية</option>
            </select>
          </FormRow>
          <div className="flex gap-3 pt-2">
            <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 justify-center">
              {saving && <Spinner size="sm" />} {saving ? 'جاري الحفظ...' : 'حفظ'}
            </button>
            <button onClick={() => setModal(null)} className="btn-secondary flex-1 justify-center">إلغاء</button>
          </div>
        </div>
      </Modal>

      {/* ── School Grade Modal ── */}
      <Modal isOpen={!!gradeModal} title={gradeModal === 'create' ? 'إضافة صف دراسي' : 'تعديل الصف الدراسي'} onClose={() => setGradeModal(null)}>
        <div className="space-y-4">
          <FormRow label="اسم الصف" required>
            <input className="form-input" value={gradeForm.name} onChange={e => setGradeForm(f => ({ ...f, name: e.target.value }))} placeholder="مثال: الصف الأول" />
          </FormRow>
          <FormRow label="الترتيب" required>
            <input type="number" min={1} className="form-input" value={gradeForm.order} onChange={e => setGradeForm(f => ({ ...f, order: parseInt(e.target.value) || 1 }))} />
          </FormRow>
          <div className="flex gap-3 pt-2">
            <button onClick={handleSaveGrade} disabled={savingGrade} className="btn-primary flex-1 justify-center">
              {savingGrade && <Spinner size="sm" />} {savingGrade ? 'جاري الحفظ...' : 'حفظ'}
            </button>
            <button onClick={() => setGradeModal(null)} className="btn-secondary flex-1 justify-center">إلغاء</button>
          </div>
        </div>
      </Modal>

      {/* ── Confirm Delete Year ── */}
      <ConfirmDelete isOpen={!!deleteTarget} itemName={deleteTarget?.name} onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} isLoading={deleting} />

      {/* ── Confirm Delete Grade ── */}
      <ConfirmDelete isOpen={!!deleteGradeTarget} itemName={deleteGradeTarget?.name} onConfirm={handleDeleteGrade} onCancel={() => setDeleteGradeTarget(null)} isLoading={deletingGrade} />
    </div>
  );
}