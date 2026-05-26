import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, FileQuestion, ClipboardList } from 'lucide-react';
import { examsApi, groupsApi, subjectsApi } from '../../api/services';
import type { ExamDto, CreateExamDto, UpdateExamDto, GroupDto, SubjectDto, ExamResultDto, BulkExamResultDto } from '../../types';
import { formatDate, today } from '../../utils/date';
import { PageHeader, Modal, ConfirmDelete, SkeletonRow, EmptyState, ErrorState, FormRow, Spinner } from '../../components/common';

export default function ExamsPage() {
  const [groups, setGroups] = useState<GroupDto[]>([]);
  const [subjects, setSubjects] = useState<SubjectDto[]>([]);
  const [selectedGroup, setSelectedGroup] = useState('');
  const [exams, setExams] = useState<ExamDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [modal, setModal] = useState<'create' | 'edit' | 'results' | null>(null);
  const [selected, setSelected] = useState<ExamDto | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ExamDto | null>(null);
  const [results, setResults] = useState<ExamResultDto[]>([]);
  const [resultMarks, setResultMarks] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // DateOnly: examDate always YYYY-MM-DD
  const EMPTY: CreateExamDto = { title: '', groupId: '', subjectId: '', examDate: today(), totalMarks: 100, passingMarks: 50 };
  const [formCreate, setFormCreate] = useState<CreateExamDto>(EMPTY);
  const [formUpdate, setFormUpdate] = useState<UpdateExamDto | null>(null);

  useEffect(() => {
    Promise.allSettled([groupsApi.getAll(), subjectsApi.getAll()]).then(([g, s]) => {
      if (g.status === 'fulfilled') setGroups(g.value);
      if (s.status === 'fulfilled') setSubjects(s.value);
    });
  }, []);

  const loadExams = useCallback(async () => {
    if (!selectedGroup) return;
    setLoading(true); setError('');
    try { setExams(await examsApi.getByGroup(selectedGroup)); }
    catch { setError('فشل تحميل الامتحانات'); }
    finally { setLoading(false); }
  }, [selectedGroup]);

  useEffect(() => { loadExams(); }, [loadExams]);

  const openCreate = () => {
    setFormCreate({ ...EMPTY, groupId: selectedGroup, subjectId: subjects[0]?.id || '' });
    setSelected(null); setModal('create');
  };
  const openEdit = (item: ExamDto) => {
    setSelected(item);
    setFormUpdate({ title: item.title, examDate: item.examDate, totalMarks: item.totalMarks, passingMarks: item.passingMarks });
    setModal('edit');
  };
  const openResults = async (item: ExamDto) => {
    setSelected(item);
    try {
      const res = await examsApi.getResultsByExam(item.id);
      setResults(res);
      const marks: Record<string, string> = {};
      res.forEach(r => { marks[r.studentId] = String(r.marksObtained); });
      setResultMarks(marks);
    } catch { toast.error('فشل تحميل النتائج'); }
    setModal('results');
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (modal === 'create') {
        if (!formCreate.title || !formCreate.groupId || !formCreate.examDate) { toast.error('يرجى ملء الحقول المطلوبة'); setSaving(false); return; }
        await examsApi.create(formCreate); toast.success('تم إضافة الامتحان');
      } else if (selected && formUpdate) {
        await examsApi.update(selected.id, formUpdate); toast.success('تم التعديل');
      }
      setModal(null); loadExams();
    } catch (e: any) { toast.error(e?.message || 'حدث خطأ'); }
    finally { setSaving(false); }
  };

  const handleSaveResults = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const bulk: BulkExamResultDto = {
        examId: selected.id,
        results: results.map(r => ({ studentId: r.studentId, marksObtained: parseFloat(resultMarks[r.studentId] || '0'), notes: r.notes })),
      };
      await examsApi.submitBulkResults(bulk);
      toast.success('تم حفظ النتائج');
      setModal(null);
    } catch (e: any) { toast.error(e?.message || 'حدث خطأ'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try { await examsApi.delete(deleteTarget.id); toast.success('تم الحذف'); setDeleteTarget(null); loadExams(); }
    catch (e: any) { toast.error(e?.message || 'حدث خطأ'); }
    finally { setDeleting(false); }
  };

  return (
    <div>
      <PageHeader title="الامتحانات" subtitle="إدارة الامتحانات والنتائج" />

      <div className="card mb-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px]">
            <label className="form-label">اختر المجموعة</label>
            <select className="form-select" value={selectedGroup} onChange={e => setSelectedGroup(e.target.value)}>
              <option value="">-- اختر المجموعة --</option>
              {groups.map(g => <option key={g.id} value={g.id}>{g.name} — {g.teacherName}</option>)}
            </select>
          </div>
          {selectedGroup && (
            <button onClick={openCreate} className="btn-primary"><Plus className="h-4 w-4" /> إضافة امتحان</button>
          )}
        </div>
      </div>

      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="table-header">عنوان الامتحان</th>
                <th className="table-header">المادة</th>
                <th className="table-header">تاريخ الامتحان</th>
                <th className="table-header">الدرجة الكاملة</th>
                <th className="table-header">درجة النجاح</th>
                <th className="table-header">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {loading && [1,2,3].map(i => <SkeletonRow key={i} cols={6} />)}
              {!loading && error && <ErrorState message={error} onRetry={loadExams} />}
              {!loading && !error && exams.length === 0 && (
                <EmptyState message={selectedGroup ? 'لا توجد امتحانات لهذه المجموعة' : 'اختر مجموعة لعرض الامتحانات'} icon={<FileQuestion />} />
              )}
              {!loading && !error && exams.map(item => (
                <tr key={item.id} className="table-row">
                  <td className="table-cell font-semibold text-slate-800">{item.title}</td>
                  <td className="table-cell">{item.subjectName}</td>
                  {/* examDate is DateOnly → YYYY-MM-DD */}
                  <td className="table-cell">{formatDate(item.examDate)}</td>
                  <td className="table-cell">{item.totalMarks}</td>
                  <td className="table-cell">{item.passingMarks}</td>
                  <td className="table-cell">
                    <div className="flex gap-1">
                      <button onClick={() => openResults(item)} className="p-1.5 rounded-lg hover:bg-violet-50 text-violet-600" title="النتائج"><ClipboardList className="h-4 w-4" /></button>
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

      {/* Create/Edit Modal */}
      <Modal isOpen={modal === 'create' || modal === 'edit'} title={modal === 'create' ? 'إضافة امتحان' : 'تعديل الامتحان'} onClose={() => setModal(null)}>
        <div className="space-y-4">
          <FormRow label="عنوان الامتحان" required>
            <input className="form-input"
              value={modal === 'create' ? formCreate.title : formUpdate?.title || ''}
              onChange={e => modal === 'create' ? setFormCreate(f => ({ ...f, title: e.target.value })) : setFormUpdate(f => f && ({ ...f, title: e.target.value }))}
              placeholder="مثال: امتحان نصف الترم" />
          </FormRow>
          {modal === 'create' && (
            <FormRow label="المادة" required>
              <select className="form-select" value={formCreate.subjectId} onChange={e => setFormCreate(f => ({ ...f, subjectId: e.target.value }))}>
                <option value="">-- اختر المادة --</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </FormRow>
          )}
          {/* DateOnly: input type=date → YYYY-MM-DD */}
          <FormRow label="تاريخ الامتحان" required>
            <input type="date" className="form-input"
              value={modal === 'create' ? formCreate.examDate : formUpdate?.examDate || ''}
              onChange={e => modal === 'create' ? setFormCreate(f => ({ ...f, examDate: e.target.value })) : setFormUpdate(f => f && ({ ...f, examDate: e.target.value }))} />
          </FormRow>
          <div className="grid grid-cols-2 gap-3">
            <FormRow label="الدرجة الكاملة" required>
              <input type="number" className="form-input"
                value={modal === 'create' ? formCreate.totalMarks : formUpdate?.totalMarks || 100}
                onChange={e => modal === 'create' ? setFormCreate(f => ({ ...f, totalMarks: +e.target.value })) : setFormUpdate(f => f && ({ ...f, totalMarks: +e.target.value }))} />
            </FormRow>
            <FormRow label="درجة النجاح" required>
              <input type="number" className="form-input"
                value={modal === 'create' ? formCreate.passingMarks : formUpdate?.passingMarks || 50}
                onChange={e => modal === 'create' ? setFormCreate(f => ({ ...f, passingMarks: +e.target.value })) : setFormUpdate(f => f && ({ ...f, passingMarks: +e.target.value }))} />
            </FormRow>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 justify-center">
              {saving && <Spinner size="sm" />} {saving ? 'جاري الحفظ...' : 'حفظ'}
            </button>
            <button onClick={() => setModal(null)} className="btn-secondary flex-1 justify-center">إلغاء</button>
          </div>
        </div>
      </Modal>

      {/* Results Modal */}
      <Modal isOpen={modal === 'results'} title={`نتائج: ${selected?.title}`} onClose={() => setModal(null)} size="xl">
        <div className="space-y-2 max-h-[60vh] overflow-y-auto mb-4">
          {results.length === 0 ? (
            <p className="text-center text-slate-400 py-8">لا توجد نتائج مسجلة بعد</p>
          ) : results.map(r => (
            <div key={r.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-800">{r.studentName}</p>
              </div>
              <input
                type="number"
                className="form-input w-24 text-center"
                value={resultMarks[r.studentId] ?? ''}
                min={0}
                max={selected?.totalMarks}
                onChange={e => setResultMarks(prev => ({ ...prev, [r.studentId]: e.target.value }))}
              />
              <span className="text-xs text-slate-500">/ {selected?.totalMarks}</span>
              <span className={r.passed ? 'badge-green' : 'badge-red'}>{r.passed ? 'ناجح' : 'راسب'}</span>
            </div>
          ))}
        </div>
        <div className="flex gap-3">
          <button onClick={handleSaveResults} disabled={saving} className="btn-primary flex-1 justify-center">
            {saving && <Spinner size="sm" />} {saving ? 'جاري الحفظ...' : 'حفظ النتائج'}
          </button>
          <button onClick={() => setModal(null)} className="btn-secondary flex-1 justify-center">إغلاق</button>
        </div>
      </Modal>

      <ConfirmDelete isOpen={!!deleteTarget} itemName={deleteTarget?.title} onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} isLoading={deleting} />
    </div>
  );
}
