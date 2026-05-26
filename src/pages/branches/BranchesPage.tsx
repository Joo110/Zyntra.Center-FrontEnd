import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, Building2 } from 'lucide-react';
import { branchesApi } from '../../api/services';
import type { BranchDto, CreateBranchDto } from '../../types';
import {
  PageHeader, SearchBar, Modal, ConfirmDelete,
  SkeletonRow, EmptyState, ErrorState, FormRow, Spinner
} from '../../components/common';

const EMPTY: CreateBranchDto = { name: '', address: '', phone: '', isActive: true };

export default function BranchesPage() {
  const [items, setItems] = useState<BranchDto[]>([]);
  const [filtered, setFiltered] = useState<BranchDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [selected, setSelected] = useState<BranchDto | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BranchDto | null>(null);
  const [form, setForm] = useState<CreateBranchDto>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const data = await branchesApi.getAll();
      setItems(data); setFiltered(data);
    } catch { setError('فشل تحميل البيانات'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!search.trim()) { setFiltered(items); return; }
    setFiltered(items.filter(i => i.name.includes(search) || i.address.includes(search)));
  }, [search, items]);

  const openCreate = () => { setForm(EMPTY); setSelected(null); setModal('create'); };
  const openEdit = (item: BranchDto) => {
    setSelected(item);
    setForm({ name: item.name, address: item.address, phone: item.phone, isActive: item.isActive });
    setModal('edit');
  };

  const handleSave = async () => {
    if (!form.name || !form.address || !form.phone) { toast.error('يرجى ملء جميع الحقول المطلوبة'); return; }
    setSaving(true);
    try {
      if (modal === 'create') {
        await branchesApi.create(form);
        toast.success('تم إضافة الفرع بنجاح');
      } else if (selected) {
        await branchesApi.update(selected.id, { ...form, id: selected.id });
        toast.success('تم تعديل الفرع بنجاح');
      }
      setModal(null); load();
    } catch (e: any) { toast.error(e?.message || 'حدث خطأ'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await branchesApi.delete(deleteTarget.id);
      toast.success('تم حذف الفرع');
      setDeleteTarget(null); load();
    } catch (e: any) { toast.error(e?.message || 'حدث خطأ'); }
    finally { setDeleting(false); }
  };

  return (
    <div>
      <PageHeader
        title="الفروع"
        subtitle="إدارة فروع المركز التعليمي"
        action={
          <button onClick={openCreate} className="btn-primary">
            <Plus className="h-4 w-4" /> إضافة فرع
          </button>
        }
      />

      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <SearchBar value={search} onChange={setSearch} placeholder="البحث في الفروع..." />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="table-header">اسم الفرع</th>
                <th className="table-header">العنوان</th>
                <th className="table-header">الهاتف</th>
                <th className="table-header">الحالة</th>
                <th className="table-header">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {loading && [1,2,3].map(i => <SkeletonRow key={i} cols={5} />)}
              {!loading && error && <ErrorState message={error} onRetry={load} />}
              {!loading && !error && filtered.length === 0 && <EmptyState message="لا توجد فروع" icon={<Building2 />} />}
              {!loading && !error && filtered.map(item => (
                <tr key={item.id} className="table-row">
                  <td className="table-cell font-semibold text-slate-800">{item.name}</td>
                  <td className="table-cell">{item.address}</td>
                  <td className="table-cell" dir="ltr">{item.phone}</td>
                  <td className="table-cell">
                    <span className={item.isActive ? 'badge-green' : 'badge-red'}>
                      {item.isActive ? 'نشط' : 'غير نشط'}
                    </span>
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(item)} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button onClick={() => setDeleteTarget(item)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-600 transition-colors">
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

      {/* Create/Edit Modal */}
      <Modal
        isOpen={!!modal}
        title={modal === 'create' ? 'إضافة فرع جديد' : 'تعديل الفرع'}
        onClose={() => setModal(null)}
      >
        <div className="space-y-4">
          <FormRow label="اسم الفرع" required>
            <input className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="مثال: فرع المعادي" />
          </FormRow>
          <FormRow label="العنوان" required>
            <input className="form-input" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="العنوان التفصيلي" />
          </FormRow>
          <FormRow label="رقم الهاتف" required>
            <input className="form-input" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="01xxxxxxxxx" dir="ltr" />
          </FormRow>
          <FormRow label="الحالة">
            <select className="form-select" value={form.isActive ? '1' : '0'} onChange={e => setForm(f => ({ ...f, isActive: e.target.value === '1' }))}>
              <option value="1">نشط</option>
              <option value="0">غير نشط</option>
            </select>
          </FormRow>
          <div className="flex gap-3 pt-2">
            <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 justify-center">
              {saving ? <Spinner size="sm" /> : null}
              {saving ? 'جاري الحفظ...' : 'حفظ'}
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
