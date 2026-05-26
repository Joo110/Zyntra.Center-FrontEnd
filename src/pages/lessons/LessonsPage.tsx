import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, CalendarDays, Search, X } from 'lucide-react';
import { lessonsApi, groupsApi, roomsApi } from '../../api/services';
import type { LessonDto, CreateLessonDto, UpdateLessonDto, GroupDto, RoomDto } from '../../types';
import { formatDate, today } from '../../utils/date';
import {
  PageHeader, Modal, ConfirmDelete, SkeletonRow,
  EmptyState, ErrorState, FormRow, Spinner,
} from '../../components/common';

function getErrorMessage(error: unknown): string {
  const e = error as any;

  return (
    e?.response?.data?.error ||
    e?.response?.data?.message ||
    e?.data?.error ||
    e?.message ||
    'حدث خطأ غير متوقع'
  );
}

export default function LessonsPage() {
  const [items, setItems] = useState<LessonDto[]>([]);
  const [groups, setGroups] = useState<GroupDto[]>([]);
  const [rooms, setRooms] = useState<RoomDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [fromDate, setFromDate] = useState(today());
  const [toDate, setToDate] = useState(today());
  const [filterGroupId, setFilterGroupId] = useState('');
  const [filterRoomId, setFilterRoomId] = useState('');
  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [selected, setSelected] = useState<LessonDto | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LessonDto | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [formError, setFormError] = useState('');

  const EMPTY_CREATE: CreateLessonDto = {
    groupId: '',
    roomId: '',
    startTime: today(),
    endTime: today(),
    topic: '',
    notes: '',
  };

  const [formCreate, setFormCreate] = useState<CreateLessonDto>(EMPTY_CREATE);
  const [formUpdate, setFormUpdate] = useState<UpdateLessonDto | null>(null);

  // getData unwraps automatically → returns LessonDto[] directly
  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await lessonsApi.getByDateRange(fromDate, toDate);
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(getErrorMessage(e) || 'فشل تحميل الحصص');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    Promise.allSettled([groupsApi.getAll(), roomsApi.getAll()]).then(([g, r]) => {
      if (g.status === 'fulfilled') setGroups(Array.isArray(g.value) ? g.value : []);
      if (r.status === 'fulfilled') setRooms(Array.isArray(r.value) ? r.value : []);
    });
  }, []);

  // فلترة محلية بعد ما الداتا ترجع
  const filteredItems = items.filter(item => {
    if (filterGroupId && item.groupId !== filterGroupId) return false;
    if (filterRoomId && item.roomId !== filterRoomId) return false;
    return true;
  });

  const resetFilters = () => {
    setFromDate(today());
    setToDate(today());
    setFilterGroupId('');
    setFilterRoomId('');
  };

  const openCreate = () => {
    setFormError('');
    setFormCreate({
      ...EMPTY_CREATE,
      groupId: groups[0]?.id || '',
      roomId: rooms[0]?.id || '',
    });
    setSelected(null);
    setFormUpdate(null);
    setModal('create');
  };

  const openEdit = (item: LessonDto) => {
    setFormError('');
    setSelected(item);
    setFormUpdate({
      roomId: item.roomId,
      startTime: item.startTime,
      endTime: item.endTime,
      topic: item.topic,
      notes: item.notes,
    });
    setModal('edit');
  };

  const handleSave = async () => {
    setSaving(true);
    setFormError('');

    try {
      if (modal === 'create') {
        if (!formCreate.groupId) {
          const msg = 'يرجى اختيار المجموعة';
          setFormError(msg);
          toast.error(msg);
          return;
        }
        if (!formCreate.roomId) {
          const msg = 'يرجى اختيار القاعة';
          setFormError(msg);
          toast.error(msg);
          return;
        }
        if (!formCreate.startTime) {
          const msg = 'يرجى تحديد تاريخ البداية';
          setFormError(msg);
          toast.error(msg);
          return;
        }
        if (!formCreate.endTime) {
          const msg = 'يرجى تحديد تاريخ النهاية';
          setFormError(msg);
          toast.error(msg);
          return;
        }

        // سيب التحقق النهائي للباك إند عشان الرسالة تظهر منه بوضوح على الشاشة
        await lessonsApi.create(formCreate);
        toast.success('تم إضافة الحصة');
        setModal(null);
        await load();
      } else if (selected && formUpdate) {
        if (!formUpdate.roomId) {
          const msg = 'يرجى اختيار القاعة';
          setFormError(msg);
          toast.error(msg);
          return;
        }

        // سيب التحقق النهائي للباك إند عشان الرسالة تظهر منه بوضوح على الشاشة
        await lessonsApi.update(selected.id, formUpdate);
        toast.success('تم التعديل');
        setModal(null);
        await load();
      }
    } catch (e) {
      const msg = getErrorMessage(e);
      setFormError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await lessonsApi.delete(deleteTarget.id);
      toast.success('تم الحذف');
      setDeleteTarget(null);
      await load();
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setDeleting(false);
    }
  };

  const hasActiveFilters =
    filterGroupId ||
    filterRoomId ||
    fromDate !== today() ||
    toDate !== today();

  return (
    <div>
      <PageHeader
        title="الحصص الدراسية"
        subtitle={`${filteredItems.length} حصة`}
        action={
          <button onClick={openCreate} className="btn-primary">
            <Plus className="h-4 w-4" /> إضافة حصة
          </button>
        }
      />

      {/* Filters */}
      <div className="card mb-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="form-label">من تاريخ</label>
            <input
              type="date"
              className="form-input"
              value={fromDate}
              onChange={e => setFromDate(e.target.value)}
            />
          </div>

          <div>
            <label className="form-label">إلى تاريخ</label>
            <input
              type="date"
              className="form-input"
              value={toDate}
              onChange={e => setToDate(e.target.value)}
            />
          </div>

          <div>
            <label className="form-label">المجموعة</label>
            <select
              className="form-select"
              value={filterGroupId}
              onChange={e => setFilterGroupId(e.target.value)}
            >
              <option value="">كل المجموعات</option>
              {groups.map(g => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="form-label">القاعة</label>
            <select
              className="form-select"
              value={filterRoomId}
              onChange={e => setFilterRoomId(e.target.value)}
            >
              <option value="">كل القاعات</option>
              {rooms.map(r => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>

          <button onClick={load} className="btn-primary">
            <Search className="h-4 w-4" /> عرض
          </button>

          {hasActiveFilters && (
            <button onClick={resetFilters} className="btn-secondary">
              <X className="h-4 w-4" /> إعادة تعيين
            </button>
          )}
        </div>
      </div>

      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="table-header">المجموعة</th>
                <th className="table-header">القاعة</th>
                <th className="table-header">تاريخ البداية</th>
                <th className="table-header">تاريخ النهاية</th>
                <th className="table-header">الموضوع</th>
                <th className="table-header">الملاحظات</th>
                <th className="table-header">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {loading && [1, 2, 3].map(i => <SkeletonRow key={i} cols={7} />)}
              {!loading && error && <ErrorState message={error} onRetry={load} />}
              {!loading && !error && filteredItems.length === 0 && (
                <EmptyState message="لا توجد حصص في هذا النطاق" icon={<CalendarDays />} />
              )}
              {!loading && !error && filteredItems.map(item => (
                <tr key={item.id} className="table-row">
                  <td className="table-cell font-semibold text-slate-800">{item.groupName || '—'}</td>
                  <td className="table-cell">{item.roomName || '—'}</td>
                  <td className="table-cell">{formatDate(item.startTime)}</td>
                  <td className="table-cell">{formatDate(item.endTime)}</td>
                  <td className="table-cell text-slate-500">{item.topic || '—'}</td>
                  <td className="table-cell text-slate-400 text-sm">{item.notes || '—'}</td>
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
      </div>

      <Modal
        isOpen={!!modal}
        title={modal === 'create' ? 'إضافة حصة جديدة' : 'تعديل الحصة'}
        onClose={() => {
          setModal(null);
          setFormError('');
        }}
        size="lg"
      >
        {formError && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {formError}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {modal === 'create' && (
            <FormRow label="المجموعة" required>
              <select
                className="form-select"
                value={formCreate.groupId}
                onChange={e => setFormCreate(f => ({ ...f, groupId: e.target.value }))}
              >
                <option value="">-- اختر المجموعة --</option>
                {groups.map(g => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </FormRow>
          )}

          <FormRow label="القاعة" required>
            <select
              className="form-select"
              value={modal === 'create' ? formCreate.roomId : formUpdate?.roomId || ''}
              onChange={e =>
                modal === 'create'
                  ? setFormCreate(f => ({ ...f, roomId: e.target.value }))
                  : setFormUpdate(f => f ? ({ ...f, roomId: e.target.value }) : f)
              }
            >
              <option value="">-- اختر القاعة --</option>
              {rooms.map(r => (
                <option key={r.id} value={r.id}>
                  {r.name}{r.branchName ? ` — ${r.branchName}` : ''}
                </option>
              ))}
            </select>
          </FormRow>

          <FormRow label="تاريخ البداية" required>
            <input
              type="date"
              className="form-input"
              value={modal === 'create' ? formCreate.startTime : formUpdate?.startTime || ''}
              onChange={e =>
                modal === 'create'
                  ? setFormCreate(f => ({ ...f, startTime: e.target.value }))
                  : setFormUpdate(f => f ? ({ ...f, startTime: e.target.value }) : f)
              }
            />
          </FormRow>

          <FormRow label="تاريخ النهاية" required>
            <input
              type="date"
              className="form-input"
              value={modal === 'create' ? formCreate.endTime : formUpdate?.endTime || ''}
              min={modal === 'create' ? formCreate.startTime : formUpdate?.startTime || ''}
              onChange={e =>
                modal === 'create'
                  ? setFormCreate(f => ({ ...f, endTime: e.target.value }))
                  : setFormUpdate(f => f ? ({ ...f, endTime: e.target.value }) : f)
              }
            />
          </FormRow>

          <FormRow label="الموضوع">
            <input
              className="form-input"
              value={modal === 'create' ? formCreate.topic || '' : formUpdate?.topic || ''}
              onChange={e =>
                modal === 'create'
                  ? setFormCreate(f => ({ ...f, topic: e.target.value }))
                  : setFormUpdate(f => f ? ({ ...f, topic: e.target.value }) : f)
              }
              placeholder="موضوع الحصة (اختياري)"
            />
          </FormRow>

          <FormRow label="ملاحظات">
            <input
              className="form-input"
              value={modal === 'create' ? formCreate.notes || '' : formUpdate?.notes || ''}
              onChange={e =>
                modal === 'create'
                  ? setFormCreate(f => ({ ...f, notes: e.target.value }))
                  : setFormUpdate(f => f ? ({ ...f, notes: e.target.value }) : f)
              }
              placeholder="ملاحظات اختيارية"
            />
          </FormRow>
        </div>

        <div className="flex gap-3 pt-4 mt-2 border-t border-slate-100">
          <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 justify-center">
            {saving && <Spinner size="sm" />} {saving ? 'جاري الحفظ...' : 'حفظ'}
          </button>
          <button
            onClick={() => {
              setModal(null);
              setFormError('');
            }}
            className="btn-secondary flex-1 justify-center"
          >
            إلغاء
          </button>
        </div>
      </Modal>

      <ConfirmDelete
        isOpen={!!deleteTarget}
        itemName={deleteTarget?.topic || 'الحصة'}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        isLoading={deleting}
      />
    </div>
  );
}