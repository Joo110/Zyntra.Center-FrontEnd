import { useState, useEffect, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import {
  Plus,
  Pencil,
  Trash2,
  UsersRound,
  UserPlus,
  UserMinus,
  Search,
  X,
  Loader2,
} from 'lucide-react';
import { groupsApi, academicYearsApi, branchesApi, subjectsApi, teachersApi, studentsApi } from '../../api/services';
import type {
  GroupDto,
  CreateGroupDto,
  UpdateGroupDto,
  AcademicYearDto,
  BranchDto,
  SubjectDto,
  TeacherDto,
  StudentListDto,
} from '../../types';
import {
  PageHeader,
  Modal,
  ConfirmDelete,
  SkeletonRow,
  EmptyState,
  ErrorState,
  Pagination,
  FormRow,
  Spinner,
} from '../../components/common';

const PAGE_SIZE = 20;

export default function GroupsPage() {
  const [items, setItems] = useState<GroupDto[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [selected, setSelected] = useState<GroupDto | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<GroupDto | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [years, setYears] = useState<AcademicYearDto[]>([]);
  const [branches, setBranches] = useState<BranchDto[]>([]);
  const [subjects, setSubjects] = useState<SubjectDto[]>([]);
  const [teachers, setTeachers] = useState<TeacherDto[]>([]);

  const [formCreate, setFormCreate] = useState<CreateGroupDto>({
    name: '',
    academicYearId: '',
    branchId: '',
    subjectId: '',
    teacherId: '',
    maxCapacity: 30,
    fees: 0,
  });
  const [formUpdate, setFormUpdate] = useState<UpdateGroupDto | null>(null);

  // ── Enrollment modal state ────────────────────────────────────────────────
  const [enrollModalOpen, setEnrollModalOpen] = useState(false);
  const [enrollGroup, setEnrollGroup] = useState<GroupDto | null>(null);
  const [enrollLoading, setEnrollLoading] = useState(false);
  const [enrollSavingId, setEnrollSavingId] = useState<string | null>(null);
  const [groupStudents, setGroupStudents] = useState<StudentListDto[]>([]);
  const [allStudents, setAllStudents] = useState<StudentListDto[]>([]);
  const [studentSearch, setStudentSearch] = useState('');

  const loadLookups = async () => {
    const [y, b, s, t] = await Promise.allSettled([
      academicYearsApi.getAll(),
      branchesApi.getAll(),
      subjectsApi.getAll(),
      teachersApi.getAll(),
    ]);

    if (y.status === 'fulfilled') setYears(Array.isArray(y.value) ? y.value : []);
    if (b.status === 'fulfilled') setBranches(Array.isArray(b.value) ? b.value : []);
    if (s.status === 'fulfilled') setSubjects(Array.isArray(s.value) ? s.value : []);
    if (t.status === 'fulfilled') setTeachers(Array.isArray(t.value) ? t.value : []);
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await groupsApi.getPaged(page, PAGE_SIZE) as any;

      let list: GroupDto[] = [];
      let count = 0;
      let pages = 1;

      if (Array.isArray(res?.data?.data?.data)) {
        list  = res.data.data.data;
        count = res.data.data.totalCount ?? 0;
        pages = res.data.data.totalPages ?? 1;
      } else if (Array.isArray(res?.data?.data)) {
        list  = res.data.data;
        count = res.data.totalCount ?? 0;
        pages = res.data.totalPages ?? 1;
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
      setItems([]);
      setTotalCount(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    load();
    loadLookups();
  }, [load]);

  const openCreate = () => {
    setFormCreate({
      name: '',
      academicYearId: years[0]?.id || '',
      branchId: branches[0]?.id || '',
      subjectId: subjects[0]?.id || '',
      teacherId: teachers[0]?.id || '',
      maxCapacity: 30,
      fees: 0,
    });
    setSelected(null);
    setFormUpdate(null);
    setModal('create');
  };

  const openEdit = (item: GroupDto) => {
    setSelected(item);
    setFormUpdate({
      name: item.name ?? '',
      branchId: item.branchId ?? '',
      teacherId: item.teacherId ?? '',
      maxCapacity: item.maxCapacity ?? 30,
      fees: item.fees ?? 0,
      isActive: item.isActive,
    });
    setModal('edit');
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (modal === 'create') {
        if (!formCreate.name || !formCreate.academicYearId || !formCreate.branchId || !formCreate.subjectId || !formCreate.teacherId) {
          toast.error('يرجى ملء الحقول المطلوبة');
          return;
        }
        await groupsApi.create(formCreate);
        toast.success('تم إنشاء المجموعة');
      } else if (selected && formUpdate) {
        await groupsApi.update(selected.id, formUpdate);
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
      await groupsApi.delete(deleteTarget.id);
      toast.success('تم الحذف');
      setDeleteTarget(null);
      await load();
    } catch (e: any) {
      toast.error(e?.message || 'حدث خطأ');
    } finally {
      setDeleting(false);
    }
  };

  const openEnrollModal = async (group: GroupDto) => {
    setEnrollGroup(group);
    setEnrollModalOpen(true);
    setEnrollLoading(true);
    setStudentSearch('');

    try {
      const [enrolled, all] = await Promise.all([
        groupsApi.getEnrolledStudents(group.id),
        studentsApi.getAll(),
      ]);

      setGroupStudents(Array.isArray(enrolled) ? enrolled : []);
      setAllStudents(Array.isArray(all) ? all : []);
    } catch (e: any) {
      toast.error(e?.message || 'فشل تحميل طلاب المجموعة');
      setGroupStudents([]);
      setAllStudents([]);
    } finally {
      setEnrollLoading(false);
    }
  };

  const refreshEnrollData = async () => {
    if (!enrollGroup) return;
    const [enrolled, all] = await Promise.all([
      groupsApi.getEnrolledStudents(enrollGroup.id),
      studentsApi.getAll(),
    ]);
    setGroupStudents(Array.isArray(enrolled) ? enrolled : []);
    setAllStudents(Array.isArray(all) ? all : []);
  };

  const handleEnrollStudent = async (studentId: string) => {
    if (!enrollGroup) return;
    setEnrollSavingId(studentId);
    try {
      const msg = await groupsApi.enroll({
        studentId,
        groupId: enrollGroup.id,
      });
      toast.success(typeof msg === 'string' ? msg : 'تم تسجيل الطالب في المجموعة');
      await refreshEnrollData();
      await load();
    } catch (e: any) {
      toast.error(e?.message || 'حدث خطأ أثناء تسجيل الطالب');
    } finally {
      setEnrollSavingId(null);
    }
  };

  const handleUnenrollStudent = async (studentId: string) => {
    if (!enrollGroup) return;
    setEnrollSavingId(studentId);
    try {
      await groupsApi.unenroll(enrollGroup.id, studentId);
      toast.success('تم حذف الطالب من المجموعة');
      await refreshEnrollData();
      await load();
    } catch (e: any) {
      toast.error(e?.message || 'حدث خطأ أثناء حذف الطالب');
    } finally {
      setEnrollSavingId(null);
    }
  };

  const enrolledIds = useMemo(() => new Set(groupStudents.map(s => s.id)), [groupStudents]);

  const filteredAvailableStudents = useMemo(() => {
    const q = studentSearch.trim().toLowerCase();

    return allStudents.filter(s => {
      if (enrolledIds.has(s.id)) return false;
      if (!q) return true;

      return (
        s.fullName?.toLowerCase().includes(q) ||
        s.phone?.toLowerCase().includes(q) ||
        s.schoolGrade?.toLowerCase().includes(q)
      );
    });
  }, [allStudents, enrolledIds, studentSearch]);

  return (
    <div>
      <PageHeader
        title="المجموعات الدراسية"
        subtitle={`إجمالي ${totalCount} مجموعة`}
        action={
          <button onClick={openCreate} className="btn-primary">
            <Plus className="h-4 w-4" /> إنشاء مجموعة
          </button>
        }
      />

      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="table-header">اسم المجموعة</th>
                <th className="table-header">المادة</th>
                <th className="table-header">المدرس</th>
                <th className="table-header">الفرع</th>
                <th className="table-header">الرسوم</th>
                <th className="table-header">الحالة</th>
                <th className="table-header">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {loading && [1, 2, 3].map((i) => <SkeletonRow key={i} cols={7} />)}
              {!loading && error && <ErrorState message={error} onRetry={load} />}
              {!loading && !error && items.length === 0 && (
                <EmptyState message="لا توجد مجموعات" icon={<UsersRound />} />
              )}
              {!loading && !error && items.map((item) => (
                <tr key={item.id} className="table-row">
                  <td className="table-cell font-semibold text-slate-800">{item.name ?? '—'}</td>
                  <td className="table-cell">{item.subjectName ?? '—'}</td>
                  <td className="table-cell">{item.teacherName ?? '—'}</td>
                  <td className="table-cell">{item.branchName ?? '—'}</td>
                  <td className="table-cell font-semibold text-slate-700">
                    {(item.fees ?? 0).toLocaleString('ar-EG')} ج
                  </td>
                  <td className="table-cell">
                    <span className={item.isActive ? 'badge-green' : 'badge-red'}>
                      {item.isActive ? 'نشطة' : 'مغلقة'}
                    </span>
                  </td>
                  <td className="table-cell">
                    <div className="flex gap-1">
                      <button
                        onClick={() => openEnrollModal(item)}
                        className="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-600"
                        title="إدارة الطلاب"
                      >
                        <UsersRound className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => openEdit(item)}
                        className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600"
                        title="تعديل"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(item)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-red-600"
                        title="حذف"
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

      {/* Create / Edit Modal */}
      <Modal
        isOpen={!!modal}
        title={modal === 'create' ? 'إنشاء مجموعة جديدة' : 'تعديل المجموعة'}
        onClose={() => setModal(null)}
        size="lg"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormRow label="اسم المجموعة" required>
            <input
              className="form-input"
              value={modal === 'create' ? formCreate.name : formUpdate?.name || ''}
              onChange={(e) =>
                modal === 'create'
                  ? setFormCreate((f) => ({ ...f, name: e.target.value }))
                  : setFormUpdate((f) => (f ? { ...f, name: e.target.value } : f))
              }
              placeholder="مثال: رياضيات أ"
            />
          </FormRow>

          {modal === 'create' && (
            <FormRow label="السنة الدراسية" required>
              <select
                className="form-select"
                value={formCreate.academicYearId}
                onChange={(e) => setFormCreate((f) => ({ ...f, academicYearId: e.target.value }))}
              >
                <option value="">-- اختر --</option>
                {years.map((y) => (
                  <option key={y.id} value={y.id}>{y.name}</option>
                ))}
              </select>
            </FormRow>
          )}

          <FormRow label="الفرع" required>
            <select
              className="form-select"
              value={modal === 'create' ? formCreate.branchId : formUpdate?.branchId || ''}
              onChange={(e) =>
                modal === 'create'
                  ? setFormCreate((f) => ({ ...f, branchId: e.target.value }))
                  : setFormUpdate((f) => (f ? { ...f, branchId: e.target.value } : f))
              }
            >
              <option value="">-- اختر الفرع --</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </FormRow>

          {modal === 'create' && (
            <FormRow label="المادة" required>
              <select
                className="form-select"
                value={formCreate.subjectId}
                onChange={(e) => setFormCreate((f) => ({ ...f, subjectId: e.target.value }))}
              >
                <option value="">-- اختر المادة --</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </FormRow>
          )}

          <FormRow label="المدرس" required>
            <select
              className="form-select"
              value={modal === 'create' ? formCreate.teacherId : formUpdate?.teacherId || ''}
              onChange={(e) =>
                modal === 'create'
                  ? setFormCreate((f) => ({ ...f, teacherId: e.target.value }))
                  : setFormUpdate((f) => (f ? { ...f, teacherId: e.target.value } : f))
              }
            >
              <option value="">-- اختر المدرس --</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>{t.fullName}</option>
              ))}
            </select>
          </FormRow>

          <FormRow label="الحد الأقصى" required>
            <input
              type="number"
              className="form-input"
              min={1}
              value={modal === 'create' ? formCreate.maxCapacity : formUpdate?.maxCapacity || 30}
              onChange={(e) =>
                modal === 'create'
                  ? setFormCreate((f) => ({ ...f, maxCapacity: +e.target.value }))
                  : setFormUpdate((f) => (f ? { ...f, maxCapacity: +e.target.value } : f))
              }
            />
          </FormRow>

          <FormRow label="الرسوم الشهرية (جنيه)" required>
            <input
              type="number"
              className="form-input"
              min={0}
              value={modal === 'create' ? formCreate.fees : formUpdate?.fees || 0}
              onChange={(e) =>
                modal === 'create'
                  ? setFormCreate((f) => ({ ...f, fees: +e.target.value }))
                  : setFormUpdate((f) => (f ? { ...f, fees: +e.target.value } : f))
              }
            />
          </FormRow>

          {modal === 'edit' && formUpdate && (
            <FormRow label="الحالة">
              <select
                className="form-select"
                value={formUpdate.isActive ? '1' : '0'}
                onChange={(e) => setFormUpdate((f) => (f ? { ...f, isActive: e.target.value === '1' } : f))}
              >
                <option value="1">نشطة</option>
                <option value="0">مغلقة</option>
              </select>
            </FormRow>
          )}
        </div>

        <div className="flex gap-3 pt-4 mt-2 border-t border-slate-100">
          <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 justify-center">
            {saving && <Spinner size="sm" />} {saving ? 'جاري الحفظ...' : 'حفظ'}
          </button>
          <button onClick={() => setModal(null)} className="btn-secondary flex-1 justify-center">إلغاء</button>
        </div>
      </Modal>

      {/* Enroll Students Modal */}
      <Modal
        isOpen={enrollModalOpen}
        title={`إدارة طلاب المجموعة${enrollGroup?.name ? `: ${enrollGroup.name}` : ''}`}
        onClose={() => setEnrollModalOpen(false)}
        size="xl"
      >
        {enrollLoading ? (
          <div className="py-12 flex items-center justify-center gap-3 text-slate-500">
            <Spinner size="lg" />
            <span>جاري تحميل الطلاب...</span>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  className="form-input pr-10"
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  placeholder="بحث بالاسم أو الهاتف أو الصف..."
                />
              </div>
              <button
                onClick={() => setStudentSearch('')}
                className="btn-secondary whitespace-nowrap"
              >
                <X className="h-4 w-4" />
                مسح
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Enrolled Students */}
              <div className="card border">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-slate-800">الطلاب المسجّلين</h3>
                  <span className="badge-blue">{groupStudents.length}</span>
                </div>

                <div className="space-y-2 max-h-[380px] overflow-y-auto">
                  {groupStudents.length === 0 ? (
                    <EmptyState message="لا يوجد طلاب مسجّلون بعد" icon={<UsersRound />} />
                  ) : (
                    groupStudents.map((student) => (
                      <div
                        key={student.id}
                        className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-white px-3 py-2"
                      >
                        <div className="min-w-0">
                          <p className="font-semibold text-sm text-slate-800 truncate">{student.fullName}</p>
                          <p className="text-xs text-slate-400 truncate">
                            {student.schoolGrade || '—'}{student.phone ? ` · ${student.phone}` : ''}
                          </p>
                        </div>

                        <button
                          onClick={() => handleUnenrollStudent(student.id)}
                          disabled={enrollSavingId === student.id}
                          className="btn-secondary text-xs gap-2"
                        >
                          {enrollSavingId === student.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <UserMinus className="h-4 w-4" />
                          )}
                          حذف
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Available Students */}
              <div className="card border">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-slate-800">طلاب متاحون للإضافة</h3>
                  <span className="badge-green">{filteredAvailableStudents.length}</span>
                </div>

                <div className="space-y-2 max-h-[380px] overflow-y-auto">
                  {filteredAvailableStudents.length === 0 ? (
                    <EmptyState message="لا يوجد طلاب متاحون" icon={<UserPlus />} />
                  ) : (
                    filteredAvailableStudents.map((student) => (
                      <div
                        key={student.id}
                        className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-white px-3 py-2"
                      >
                        <div className="min-w-0">
                          <p className="font-semibold text-sm text-slate-800 truncate">{student.fullName}</p>
                          <p className="text-xs text-slate-400 truncate">
                            {student.schoolGrade || '—'}{student.phone ? ` · ${student.phone}` : ''}
                          </p>
                        </div>

                        <button
                          onClick={() => handleEnrollStudent(student.id)}
                          disabled={enrollSavingId === student.id}
                          className="btn-primary text-xs gap-2"
                        >
                          {enrollSavingId === student.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <UserPlus className="h-4 w-4" />
                          )}
                          إضافة
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
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