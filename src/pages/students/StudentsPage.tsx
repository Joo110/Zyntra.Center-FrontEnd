import { useState, useEffect, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, Users, Search, X, Filter, Eye, AlertCircle } from 'lucide-react';
import { studentsApi, schoolGradesApi, groupsApi } from '../../api/services';
import type {
  StudentListDto,
  StudentDetailsDto,
  CreateStudentDto,
  UpdateStudentDto,
  SchoolGradeDto,
  GroupDto,
} from '../../types';
import { UserStatus } from '../../types';
import {
  PageHeader,
  SearchBar,
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
const STATIC_PARENT_ID = '3c10f8d7-3f0a-46c7-872a-38b5cd868325';

const EMPTY_CREATE: CreateStudentDto = {
  fullName: '',
  phone: '',
  email: '',
  dateOfBirth: '2005-01-01',
  schoolGradeId: '',
  parentId: STATIC_PARENT_ID,
  address: '',
  nationalId: '',
};

type ViewMode = 'all' | 'group';

type PagedLike<T> = {
  items?: T[];
  data?: T[];
  totalCount?: number;
  pageNumber?: number;
  pageSize?: number;
  totalPages?: number;
};

function getErrorMessage(error: any, fallback = 'حدث خطأ') {
  return error?.response?.data?.error || error?.message || fallback;
}

export default function StudentsPage() {
  const [items, setItems] = useState<StudentListDto[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  const [viewMode, setViewMode] = useState<ViewMode>('all');
  const [selectedGroupId, setSelectedGroupId] = useState('');

  const [loading, setLoading] = useState(true);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [error, setError] = useState('');
  const [operationError, setOperationError] = useState('');

  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [selected, setSelected] = useState<StudentListDto | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<StudentListDto | null>(null);

  const [formCreate, setFormCreate] = useState<CreateStudentDto>(EMPTY_CREATE);
  const [formUpdate, setFormUpdate] = useState<UpdateStudentDto | null>(null);

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [schoolGrades, setSchoolGrades] = useState<SchoolGradeDto[]>([]);
  const [groups, setGroups] = useState<GroupDto[]>([]);

  const [groupsModalOpen, setGroupsModalOpen] = useState(false);
  const [studentDetails, setStudentDetails] = useState<StudentDetailsDto | null>(null);
  const [loadingStudentDetails, setLoadingStudentDetails] = useState(false);

  const safeItems = Array.isArray(items) ? items : [];

  const loadReferenceData = useCallback(async () => {
    setLoadingGroups(true);
    try {
      const [grades, grps] = await Promise.all([schoolGradesApi.getAll(), groupsApi.getAll()]);
      setSchoolGrades(Array.isArray(grades) ? grades : []);
      setGroups(Array.isArray(grps) ? grps : []);
    } catch {
      toast.error('فشل تحميل البيانات المرجعية');
      setSchoolGrades([]);
      setGroups([]);
    } finally {
      setLoadingGroups(false);
    }
  }, []);

  useEffect(() => {
    loadReferenceData();
  }, [loadReferenceData]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    setOperationError('');

    try {
      if (viewMode === 'group') {
        if (!selectedGroupId) {
          setItems([]);
          setTotalCount(0);
          setTotalPages(1);
          return;
        }

        const groupStudents = await groupsApi.getEnrolledStudents(selectedGroupId);
        const normalized = Array.isArray(groupStudents) ? groupStudents : [];

        const filtered = search.trim()
          ? normalized.filter(s => {
              const haystack = [s.fullName, s.phone, s.statusLabel]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();

              return haystack.includes(search.trim().toLowerCase());
            })
          : normalized;

        setItems(filtered);
        setTotalCount(filtered.length);
        setTotalPages(1);
        setPage(1);
      } else {
        const res = (await studentsApi.getPaged(page, PAGE_SIZE, search || undefined)) as PagedLike<StudentListDto>;

        const normalizedItems = Array.isArray(res.items)
          ? res.items
          : Array.isArray(res.data)
            ? res.data
            : [];

        setItems(normalizedItems);
        setTotalCount(res.totalCount ?? normalizedItems.length ?? 0);
        setTotalPages(res.totalPages ?? 1);
      }
    } catch {
      setError('فشل تحميل البيانات');
      setItems([]);
      setTotalCount(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [page, search, selectedGroupId, viewMode]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSearch = () => {
    setSearch(searchInput);
    setPage(1);
  };

  const clearFilters = () => {
    setSearchInput('');
    setSearch('');
    setSelectedGroupId('');
    setViewMode('all');
    setPage(1);
    setOperationError('');
  };

  const openCreate = () => {
    setFormCreate(EMPTY_CREATE);
    setSelected(null);
    setFormUpdate(null);
    setModal('create');
    setOperationError('');
  };

  const openEdit = async (item: StudentListDto) => {
    setSelected(item);
    setOperationError('');

    try {
      const detail = await studentsApi.getById(item.id);

      setFormUpdate({
        fullName: detail.fullName,
        phone: detail.phone,
        email: detail.email ?? '',
        dateOfBirth: detail.dateOfBirth,
        schoolGradeId: detail.schoolGradeId,
        parentId: STATIC_PARENT_ID,
        address: detail.address ?? '',
        nationalId: detail.nationalId ?? '',
        status: detail.status,
      });

      setModal('edit');
    } catch {
      toast.error('فشل تحميل بيانات الطالب');
    }
  };

  const openStudentGroups = async (item: StudentListDto) => {
    setLoadingStudentDetails(true);
    setGroupsModalOpen(true);
    setStudentDetails(null);
    setOperationError('');

    try {
      const detail = await studentsApi.getById(item.id);
      setStudentDetails(detail);
    } catch {
      toast.error('فشل تحميل مجاميع الطالب');
      setGroupsModalOpen(false);
    } finally {
      setLoadingStudentDetails(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setOperationError('');

    try {
      if (modal === 'create') {
        if (!formCreate.fullName || !formCreate.phone || !formCreate.schoolGradeId || !formCreate.dateOfBirth) {
          toast.error('يرجى ملء الحقول المطلوبة');
          return;
        }

        await studentsApi.create({
          ...formCreate,
          parentId: STATIC_PARENT_ID,
        });

        toast.success('تم إضافة الطالب');
      } else if (selected && formUpdate) {
        await studentsApi.update(selected.id, {
          ...formUpdate,
          parentId: STATIC_PARENT_ID,
        });

        toast.success('تم التعديل');
      }

      setModal(null);
      await load();
    } catch (e: any) {
      const msg = getErrorMessage(e, 'حدث خطأ');
      setOperationError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    setDeleting(true);
    setOperationError('');

    try {
      await studentsApi.delete(deleteTarget.id);
      toast.success('تم الحذف');
      setDeleteTarget(null);
      await load();
    } catch (e: any) {
      const msg = getErrorMessage(e, 'حدث خطأ');
      setOperationError(msg);
      toast.error(msg);
    } finally {
      setDeleting(false);
    }
  };

  const statusLabel = (s: UserStatus) => {
    if (s === UserStatus.Active) return <span className="badge-green">نشط</span>;
    if (s === UserStatus.Inactive) return <span className="badge-gray">غير نشط</span>;
    return <span className="badge-red">موقوف</span>;
  };

  const visibleItems = useMemo(() => {
    if (!search.trim()) return safeItems;

    const q = search.trim().toLowerCase();
    return safeItems.filter(s => {
      const haystack = [s.fullName, s.phone, s.schoolGrade, s.statusLabel]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [safeItems, search]);

  const selectedGroupName = useMemo(() => {
    return groups.find(g => g.id === selectedGroupId)?.name || '';
  }, [groups, selectedGroupId]);

  const tableCols = viewMode === 'group' ? 4 : 6;

  return (
    <div>
      <PageHeader
        title="الطلاب"
        subtitle={
          viewMode === 'group' && selectedGroupName
            ? `طلاب مجموعة: ${selectedGroupName} — ${totalCount} طالب`
            : `إجمالي ${totalCount} طالب`
        }
        action={
          <button onClick={openCreate} className="btn-primary">
            <Plus className="h-4 w-4" /> إضافة طالب
          </button>
        }
      />

      <div className="card">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 mb-4">
          <div className="lg:col-span-5">
            <SearchBar
              value={searchInput}
              onChange={setSearchInput}
              onSearch={handleSearch}
              placeholder={viewMode === 'group' ? 'البحث داخل طلاب المجموعة...' : 'البحث بالاسم أو الهاتف...'}
            />
          </div>

          <div className="lg:col-span-3">
            <select
              className="form-select w-full"
              value={viewMode}
              onChange={(e) => {
                const mode = e.target.value as ViewMode;
                setViewMode(mode);
                setPage(1);
                setSearch('');
                setSearchInput('');
                setOperationError('');
                if (mode === 'all') setSelectedGroupId('');
              }}
            >
              <option value="all">كل الطلاب</option>
              <option value="group">طلاب مجموعة</option>
            </select>
          </div>

          <div className="lg:col-span-4 flex gap-2">
            {viewMode === 'group' && (
              <select
                className="form-select w-full"
                value={selectedGroupId}
                onChange={(e) => {
                  setSelectedGroupId(e.target.value);
                  setPage(1);
                  setOperationError('');
                }}
                disabled={loadingGroups}
              >
                <option value="">
                  {loadingGroups ? 'جاري تحميل المجموعات...' : '-- اختر المجموعة --'}
                </option>
                {groups.map(group => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
            )}

            <button onClick={handleSearch} className="btn-primary">
              <Search className="h-4 w-4" /> بحث
            </button>

            {(search || searchInput || selectedGroupId || viewMode !== 'all') && (
              <button onClick={clearFilters} className="btn-secondary">
                <X className="h-4 w-4" /> مسح
              </button>
            )}
          </div>
        </div>

        {operationError && (
          <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
            <div className="flex-1">
              <div className="font-semibold text-red-700">تعذر تنفيذ العملية</div>
              <div className="text-sm text-red-700 mt-1">{operationError}</div>
            </div>
            <button
              onClick={() => setOperationError('')}
              className="text-red-500 hover:text-red-700"
              title="إغلاق"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <div className="flex flex-wrap gap-3 mb-4">
          <div className="px-4 py-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-3">
            <Users className="h-5 w-5 text-slate-500" />
            <div>
              <div className="text-xs text-slate-500">إجمالي النتائج</div>
              <div className="font-semibold text-slate-800">{totalCount}</div>
            </div>
          </div>

          {viewMode === 'group' && selectedGroupName && (
            <div className="px-4 py-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-3">
              <Filter className="h-5 w-5 text-slate-500" />
              <div>
                <div className="text-xs text-slate-500">المجموعة المختارة</div>
                <div className="font-semibold text-slate-800">{selectedGroupName}</div>
              </div>
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="table-header">الاسم</th>
                <th className="table-header">الهاتف</th>
                {viewMode === 'all' && <th className="table-header">الصف</th>}
                {viewMode === 'all' && <th className="table-header">المجموعات</th>}
                <th className="table-header">الحالة</th>
                <th className="table-header">إجراءات</th>
              </tr>
            </thead>

            <tbody>
              {loading && [1, 2, 3, 4, 5].map(i => <SkeletonRow key={i} cols={tableCols} />)}

              {!loading && error && <ErrorState message={error} onRetry={load} />}

              {!loading && !error && visibleItems.length === 0 && (
                <EmptyState message="لا يوجد طلاب" icon={<Users />} />
              )}

              {!loading &&
                !error &&
                visibleItems.map(item => (
                  <tr key={item.id} className="table-row">
                    <td className="table-cell font-semibold text-slate-800">{item.fullName}</td>

                    <td className="table-cell" dir="ltr">
                      {item.phone || '—'}
                    </td>

                    {viewMode === 'all' && (
                      <td className="table-cell">
                        {item.schoolGrade && item.schoolGrade.trim() ? item.schoolGrade : '—'}
                      </td>
                    )}

                    {viewMode === 'all' && (
                      <td className="table-cell">
                        <button
                          onClick={() => openStudentGroups(item)}
                          className="p-1.5 rounded-lg hover:bg-slate-50 text-slate-600"
                          title="عرض المجاميع"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </td>
                    )}

                    <td className="table-cell">{statusLabel(item.status)}</td>

                    <td className="table-cell">
                      <div className="flex gap-1">
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

        {viewMode === 'all' && (
          <Pagination
            page={page}
            totalPages={totalPages}
            totalCount={totalCount}
            pageSize={PAGE_SIZE}
            onChange={setPage}
          />
        )}
      </div>

      <Modal
        isOpen={!!modal}
        title={modal === 'create' ? 'إضافة طالب جديد' : 'تعديل بيانات الطالب'}
        onClose={() => setModal(null)}
        size="lg"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {modal === 'create' ? (
            <>
              <FormRow label="الاسم الكامل" required>
                <input
                  className="form-input"
                  value={formCreate.fullName}
                  onChange={e => setFormCreate(f => ({ ...f, fullName: e.target.value }))}
                />
              </FormRow>

              <FormRow label="رقم الهاتف" required>
                <input
                  className="form-input"
                  value={formCreate.phone}
                  onChange={e => setFormCreate(f => ({ ...f, phone: e.target.value }))}
                  dir="ltr"
                />
              </FormRow>

              <FormRow label="البريد الإلكتروني">
                <input
                  type="email"
                  className="form-input"
                  value={formCreate.email || ''}
                  onChange={e => setFormCreate(f => ({ ...f, email: e.target.value }))}
                  dir="ltr"
                />
              </FormRow>

              <FormRow label="تاريخ الميلاد" required>
                <input
                  type="date"
                  className="form-input"
                  value={formCreate.dateOfBirth}
                  onChange={e => setFormCreate(f => ({ ...f, dateOfBirth: e.target.value }))}
                />
              </FormRow>

              <FormRow label="الصف الدراسي" required>
                <select
                  className="form-select"
                  value={formCreate.schoolGradeId}
                  onChange={e => setFormCreate(f => ({ ...f, schoolGradeId: e.target.value }))}
                >
                  <option value="">-- اختر الصف --</option>
                  {schoolGrades.map(grade => (
                    <option key={grade.id} value={grade.id}>
                      {grade.name}
                    </option>
                  ))}
                </select>
              </FormRow>

              <FormRow label="العنوان">
                <input
                  className="form-input"
                  value={formCreate.address || ''}
                  onChange={e => setFormCreate(f => ({ ...f, address: e.target.value }))}
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
          ) : formUpdate ? (
            <>
              <FormRow label="الاسم الكامل" required>
                <input
                  className="form-input"
                  value={formUpdate.fullName}
                  onChange={e => setFormUpdate(f => (f ? { ...f, fullName: e.target.value } : f))}
                />
              </FormRow>

              <FormRow label="رقم الهاتف" required>
                <input
                  className="form-input"
                  value={formUpdate.phone}
                  onChange={e => setFormUpdate(f => (f ? { ...f, phone: e.target.value } : f))}
                  dir="ltr"
                />
              </FormRow>

              <FormRow label="البريد الإلكتروني">
                <input
                  type="email"
                  className="form-input"
                  value={formUpdate.email || ''}
                  onChange={e => setFormUpdate(f => (f ? { ...f, email: e.target.value } : f))}
                  dir="ltr"
                />
              </FormRow>

              <FormRow label="تاريخ الميلاد" required>
                <input
                  type="date"
                  className="form-input"
                  value={formUpdate.dateOfBirth}
                  onChange={e => setFormUpdate(f => (f ? { ...f, dateOfBirth: e.target.value } : f))}
                />
              </FormRow>

              <FormRow label="الصف الدراسي" required>
                <select
                  className="form-select"
                  value={formUpdate.schoolGradeId}
                  onChange={e => setFormUpdate(f => (f ? { ...f, schoolGradeId: e.target.value } : f))}
                >
                  <option value="">-- اختر الصف --</option>
                  {schoolGrades.map(grade => (
                    <option key={grade.id} value={grade.id}>
                      {grade.name}
                    </option>
                  ))}
                </select>
              </FormRow>

              <FormRow label="العنوان">
                <input
                  className="form-input"
                  value={formUpdate.address || ''}
                  onChange={e => setFormUpdate(f => (f ? { ...f, address: e.target.value } : f))}
                />
              </FormRow>

              <FormRow label="الرقم القومي">
                <input
                  className="form-input"
                  value={formUpdate.nationalId || ''}
                  onChange={e => setFormUpdate(f => (f ? { ...f, nationalId: e.target.value } : f))}
                  dir="ltr"
                />
              </FormRow>

              <FormRow label="الحالة">
                <select
                  className="form-select"
                  value={formUpdate.status}
                  onChange={e =>
                    setFormUpdate(f => (f ? { ...f, status: Number(e.target.value) as UserStatus } : f))
                  }
                >
                  <option value={UserStatus.Active}>نشط</option>
                  <option value={UserStatus.Inactive}>غير نشط</option>
                  <option value={UserStatus.Suspended}>موقوف</option>
                </select>
              </FormRow>
            </>
          ) : null}
        </div>

        <div className="flex gap-3 pt-4 mt-2 border-t border-slate-100">
          <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 justify-center">
            {saving && <Spinner size="sm" />} {saving ? 'جاري الحفظ...' : 'حفظ'}
          </button>
          <button onClick={() => setModal(null)} className="btn-secondary flex-1 justify-center">
            إلغاء
          </button>
        </div>
      </Modal>

      <Modal
        isOpen={groupsModalOpen}
        title="مجاميع الطالب"
        onClose={() => setGroupsModalOpen(false)}
        size="lg"
      >
        {loadingStudentDetails ? (
          <div className="py-10 flex items-center justify-center">
            <Spinner />
          </div>
        ) : studentDetails ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <div className="text-sm text-slate-500">اسم الطالب</div>
              <div className="font-semibold text-slate-800">{studentDetails.fullName}</div>
              <div className="mt-2 text-sm text-slate-500">
                عدد المجاميع النشطة: <span className="font-semibold text-slate-800">{studentDetails.activeGroups?.length || 0}</span>
              </div>
            </div>

            <div className="space-y-3">
              {studentDetails.activeGroups && studentDetails.activeGroups.length > 0 ? (
                studentDetails.activeGroups.map(group => (
                  <div
                    key={group.id}
                    className="rounded-2xl border border-slate-100 p-4 bg-white shadow-sm"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="font-semibold text-slate-800">{group.name}</div>
                        <div className="text-xs text-slate-500 mt-1">
                          {group.subjectName} • {group.teacherName}
                        </div>
                      </div>

                      <span className="px-2 py-1 rounded-full bg-slate-100 text-slate-700 text-xs">
                        {group.isActive ? 'نشطة' : 'غير نشطة'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 text-sm">
                      <div>
                        <div className="text-slate-500 text-xs">الفرع</div>
                        <div className="font-medium text-slate-800">{group.branchName}</div>
                      </div>

                      <div>
                        <div className="text-slate-500 text-xs">العام الدراسي</div>
                        <div className="font-medium text-slate-800">{group.academicYearName}</div>
                      </div>

                      <div>
                        <div className="text-slate-500 text-xs">السعة</div>
                        <div className="font-medium text-slate-800">
                          {group.currentEnrollment} / {group.maxCapacity}
                        </div>
                      </div>

                      <div>
                        <div className="text-slate-500 text-xs">المصروفات</div>
                        <div className="font-medium text-slate-800">{group.fees}</div>
                      </div>

                      <div>
                        <div className="text-slate-500 text-xs">المدرس</div>
                        <div className="font-medium text-slate-800">{group.teacherName}</div>
                      </div>

                      <div>
                        <div className="text-slate-500 text-xs">المادة</div>
                        <div className="font-medium text-slate-800">{group.subjectName}</div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState message="الطالب غير مسجل في أي مجموعة حالياً" icon={<Users />} />
              )}
            </div>
          </div>
        ) : null}
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