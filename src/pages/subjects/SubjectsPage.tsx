import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, BookOpen } from 'lucide-react';
import { subjectsApi, schoolGradesApi } from '../../api/services';
import type { SubjectDto, CreateSubjectDto, SchoolGradeDto } from '../../types';
import { PageHeader, SearchBar, Modal, ConfirmDelete, SkeletonRow, EmptyState, ErrorState, FormRow, Spinner } from '../../components/common';

const EMPTY: CreateSubjectDto = { name: '', schoolGradeId: '', description: '' };

export default function SubjectsPage() {
  const [items, setItems] = useState<SubjectDto[]>([]);
  const [filtered, setFiltered] = useState<SubjectDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [selected, setSelected] = useState<SubjectDto | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SubjectDto | null>(null);
  const [form, setForm] = useState<CreateSubjectDto>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // ── School Grades ──────────────────────────────────────────────────────────
  const [grades, setGrades] = useState<SchoolGradeDto[]>([]);
  const [gradesLoading, setGradesLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { const data = await subjectsApi.getAll(); setItems(data); setFiltered(data); }
    catch { setError('فشل تحميل البيانات'); }
    finally { setLoading(false); }
  }, []);

  const loadGrades = useCallback(async () => {
    setGradesLoading(true);
    try { const data = await schoolGradesApi.getAll(); setGrades(data); }
    catch { toast.error('فشل تحميل الصفوف الدراسية'); }
    finally { setGradesLoading(false); }
  }, []);

  useEffect(() => { load(); loadGrades(); }, [load, loadGrades]);

  useEffect(() => {
    if (!search.trim()) { setFiltered(items); return; }
    setFiltered(items.filter(i => i.name.includes(search) || i.schoolGradeName?.includes(search)));
  }, [search, items]);

  const openCreate = () => { setForm(EMPTY); setSelected(null); setModal('create'); };
  const openEdit = (item: SubjectDto) => {
    setSelected(item);
    setForm({ name: item.name, schoolGradeId: item.schoolGradeId, description: item.description });
    setModal('edit');
  };

  const handleSave = async () => {
    if (!form.name || !form.schoolGradeId) { toast.error('يرجى ملء الحقول المطلوبة'); return; }
    setSaving(true);
    try {
      if (modal === 'create') { await subjectsApi.create(form); toast.success('تم إضافة المادة'); }
      else if (selected) { await subjectsApi.update(selected.id, form); toast.success('تم التعديل'); }
      setModal(null); load();
    } catch (e: any) { toast.error(e?.message || 'حدث خطأ'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try { await subjectsApi.delete(deleteTarget.id); toast.success('تم الحذف'); setDeleteTarget(null); load(); }
    catch (e: any) { toast.error(e?.message || 'حدث خطأ'); }
    finally { setDeleting(false); }
  };

  return (
    <div>
      <PageHeader title="المواد الدراسية" subtitle="إدارة مواد المركز"
        action={<button onClick={openCreate} className="btn-primary"><Plus className="h-4 w-4" /> إضافة مادة</button>}
      />
      <div className="card">
        <div className="flex gap-3 mb-4">
          <SearchBar value={search} onChange={setSearch} placeholder="البحث في المواد..." />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="table-header">اسم المادة</th>
                <th className="table-header">الصف الدراسي</th>
                <th className="table-header">الوصف</th>
                <th className="table-header">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {loading && [1, 2, 3].map(i => <SkeletonRow key={i} cols={4} />)}
              {!loading && error && <ErrorState message={error} onRetry={load} />}
              {!loading && !error && filtered.length === 0 && <EmptyState message="لا توجد مواد دراسية" icon={<BookOpen />} />}
              {!loading && !error && filtered.map(item => (
                <tr key={item.id} className="table-row">
                  <td className="table-cell font-semibold text-slate-800">{item.name}</td>
                  <td className="table-cell">{item.schoolGradeName || '—'}</td>
                  <td className="table-cell text-slate-500">{item.description || '—'}</td>
                  <td className="table-cell">
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(item)} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600"><Pencil className="h-4 w-4" /></button>
                      <button onClick={() => setDeleteTarget(item)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-600"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={!!modal} title={modal === 'create' ? 'إضافة مادة دراسية' : 'تعديل المادة'} onClose={() => setModal(null)}>
        <div className="space-y-4">
          <FormRow label="اسم المادة" required>
            <input
              className="form-input"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="مثال: رياضيات"
            />
          </FormRow>

          {/* ── Combo box للصفوف الدراسية ── */}
          <FormRow label="الصف الدراسي" required>
            {gradesLoading ? (
              <div className="flex items-center gap-2 text-slate-500 text-sm py-2">
                <Spinner size="sm" /> جاري تحميل الصفوف...
              </div>
            ) : (
              <select
                className="form-input"
                value={form.schoolGradeId}
                onChange={e => setForm(f => ({ ...f, schoolGradeId: e.target.value }))}
              >
                <option value="">-- اختر الصف الدراسي --</option>
                {grades.map(grade => (
                  <option key={grade.id} value={grade.id}>
                    {grade.name}
                  </option>
                ))}
              </select>
            )}
          </FormRow>

          <FormRow label="الوصف">
            <textarea
              className="form-input"
              rows={2}
              value={form.description || ''}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="وصف اختياري"
            />
          </FormRow>

          <div className="flex gap-3 pt-2">
            <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 justify-center">
              {saving && <Spinner size="sm" />} {saving ? 'جاري الحفظ...' : 'حفظ'}
            </button>
            <button onClick={() => setModal(null)} className="btn-secondary flex-1 justify-center">إلغاء</button>
          </div>
        </div>
      </Modal>

      <ConfirmDelete
        isOpen={!!deleteTarget}
        itemName={deleteTarget?.name}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        isLoading={deleting}
      />
    </div>
  );
}