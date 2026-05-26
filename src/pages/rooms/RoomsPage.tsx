import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, DoorOpen } from 'lucide-react';
import { roomsApi, branchesApi } from '../../api/services';
import type { RoomDto, CreateRoomDto, BranchDto } from '../../types';
import { PageHeader, SearchBar, Modal, ConfirmDelete, SkeletonRow, EmptyState, ErrorState, FormRow, Spinner } from '../../components/common';

const EMPTY: CreateRoomDto = { name: '', branchId: '', capacity: 30, isActive: true };

export default function RoomsPage() {
  const [items, setItems] = useState<RoomDto[]>([]);
  const [filtered, setFiltered] = useState<RoomDto[]>([]);
  const [branches, setBranches] = useState<BranchDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [selected, setSelected] = useState<RoomDto | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RoomDto | null>(null);
  const [form, setForm] = useState<CreateRoomDto>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [rooms, brs] = await Promise.all([roomsApi.getAll(), branchesApi.getAll()]);
      setItems(rooms); setFiltered(rooms); setBranches(brs);
    } catch { setError('فشل تحميل البيانات'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!search.trim()) { setFiltered(items); return; }
    setFiltered(items.filter(i => i.name.includes(search) || i.branchName.includes(search)));
  }, [search, items]);

  const openCreate = () => {
    setForm({ ...EMPTY, branchId: branches[0]?.id || '' });
    setSelected(null); setModal('create');
  };
  const openEdit = (item: RoomDto) => {
    setSelected(item);
    setForm({ name: item.name, branchId: item.branchId, capacity: item.capacity, isActive: item.isActive });
    setModal('edit');
  };

  const handleSave = async () => {
    if (!form.name || !form.branchId) { toast.error('يرجى ملء الحقول المطلوبة'); return; }
    setSaving(true);
    try {
      if (modal === 'create') { await roomsApi.create(form); toast.success('تم إضافة القاعة'); }
      else if (selected) { await roomsApi.update(selected.id, { ...form, id: selected.id }); toast.success('تم التعديل'); }
      setModal(null); load();
    } catch (e: any) { toast.error(e?.message || 'حدث خطأ'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try { await roomsApi.delete(deleteTarget.id); toast.success('تم الحذف'); setDeleteTarget(null); load(); }
    catch (e: any) { toast.error(e?.message || 'حدث خطأ'); }
    finally { setDeleting(false); }
  };

  return (
    <div>
      <PageHeader title="القاعات" subtitle="إدارة قاعات الدراسة"
        action={<button onClick={openCreate} className="btn-primary"><Plus className="h-4 w-4" /> إضافة قاعة</button>}
      />
      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <SearchBar value={search} onChange={setSearch} placeholder="البحث في القاعات..." />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="table-header">اسم القاعة</th>
                <th className="table-header">الفرع</th>
                <th className="table-header">السعة</th>
                <th className="table-header">الحالة</th>
                <th className="table-header">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {loading && [1,2,3].map(i => <SkeletonRow key={i} cols={5} />)}
              {!loading && error && <ErrorState message={error} onRetry={load} />}
              {!loading && !error && filtered.length === 0 && <EmptyState message="لا توجد قاعات" icon={<DoorOpen />} />}
              {!loading && !error && filtered.map(item => (
                <tr key={item.id} className="table-row">
                  <td className="table-cell font-semibold text-slate-800">{item.name}</td>
                  <td className="table-cell">{item.branchName}</td>
                  <td className="table-cell">{item.capacity} طالب</td>
                  <td className="table-cell"><span className={item.isActive ? 'badge-green' : 'badge-red'}>{item.isActive ? 'نشطة' : 'مغلقة'}</span></td>
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

      <Modal isOpen={!!modal} title={modal === 'create' ? 'إضافة قاعة' : 'تعديل القاعة'} onClose={() => setModal(null)}>
        <div className="space-y-4">
          <FormRow label="اسم القاعة" required>
            <input className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="مثال: قاعة 1" />
          </FormRow>
          <FormRow label="الفرع" required>
            <select className="form-select" value={form.branchId} onChange={e => setForm(f => ({ ...f, branchId: e.target.value }))}>
              <option value="">-- اختر الفرع --</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </FormRow>
          <FormRow label="السعة (عدد الطلاب)" required>
            <input type="number" className="form-input" value={form.capacity} min={1} onChange={e => setForm(f => ({ ...f, capacity: +e.target.value }))} />
          </FormRow>
          <FormRow label="الحالة">
            <select className="form-select" value={form.isActive ? '1' : '0'} onChange={e => setForm(f => ({ ...f, isActive: e.target.value === '1' }))}>
              <option value="1">نشطة</option>
              <option value="0">مغلقة</option>
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
      <ConfirmDelete isOpen={!!deleteTarget} itemName={deleteTarget?.name} onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} isLoading={deleting} />
    </div>
  );
}
