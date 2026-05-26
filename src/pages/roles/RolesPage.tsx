import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, ShieldCheck } from 'lucide-react';
import { rolesApi } from '../../api/services';
import type { RoleDto, PermissionDto } from '../../types';
import { PageHeader, Modal, ConfirmDelete, SkeletonRow, EmptyState, ErrorState, FormRow, Spinner } from '../../components/common';

export default function RolesPage() {
  const [roles, setRoles] = useState<RoleDto[]>([]);
  const [allPermissions, setAllPermissions] = useState<PermissionDto[]>([]);
  const [permModules, setPermModules] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [selected, setSelected] = useState<RoleDto | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RoleDto | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formPerms, setFormPerms] = useState<string[]>([]);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [r, p] = await Promise.all([rolesApi.getAll(), rolesApi.getPermissions()]);
      setRoles(r); setAllPermissions(p);
      setPermModules([...new Set(p.map(x => x.module))]);
    } catch { setError('فشل تحميل البيانات'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setFormName(''); setFormDesc(''); setFormPerms([]); setSelected(null); setModal('create'); };
  const openEdit = (r: RoleDto) => { setSelected(r); setFormName(r.name); setFormDesc(r.description || ''); setFormPerms(r.permissions.map(p => p.id)); setModal('edit'); };

  const togglePerm = (id: string) => setFormPerms(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleModule = (mod: string) => {
    const modPerms = allPermissions.filter(p => p.module === mod).map(p => p.id);
    const allSelected = modPerms.every(id => formPerms.includes(id));
    setFormPerms(prev => allSelected ? prev.filter(id => !modPerms.includes(id)) : [...new Set([...prev, ...modPerms])]);
  };

  const handleSave = async () => {
    if (!formName) { toast.error('اسم الصلاحية مطلوب'); return; }
    setSaving(true);
    try {
      if (modal === 'create') {
        await rolesApi.create({ name: formName, description: formDesc, permissionIds: formPerms });
        toast.success('تم إنشاء الدور');
      } else if (selected) {
        await rolesApi.update(selected.id, { name: formName, description: formDesc, permissionIds: formPerms });
        toast.success('تم التعديل');
      }
      setModal(null); load();
    } catch (e: any) { toast.error(e?.message || 'حدث خطأ'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try { await rolesApi.delete(deleteTarget.id); toast.success('تم الحذف'); setDeleteTarget(null); load(); }
    catch (e: any) { toast.error(e?.message || 'حدث خطأ'); }
    finally { setDeleting(false); }
  };

  return (
    <div>
      <PageHeader title="الأدوار والصلاحيات" subtitle="إدارة أدوار المستخدمين وصلاحياتهم"
        action={<button onClick={openCreate} className="btn-primary"><Plus className="h-4 w-4" /> إضافة دور</button>}
      />
      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="table-header">اسم الدور</th>
                <th className="table-header">الوصف</th>
                <th className="table-header">عدد الصلاحيات</th>
                <th className="table-header">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {loading && [1,2,3].map(i => <SkeletonRow key={i} cols={4} />)}
              {!loading && error && <ErrorState message={error} onRetry={load} />}
              {!loading && !error && roles.length === 0 && <EmptyState message="لا توجد أدوار" icon={<ShieldCheck />} />}
              {!loading && !error && roles.map(r => (
                <tr key={r.id} className="table-row">
                  <td className="table-cell font-semibold text-slate-800">{r.name}</td>
                  <td className="table-cell text-slate-500">{r.description || '—'}</td>
                  <td className="table-cell"><span className="badge-blue">{r.permissions.length} صلاحية</span></td>
                  <td className="table-cell">
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(r)} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600"><Pencil className="h-4 w-4" /></button>
                      <button onClick={() => setDeleteTarget(r)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-600"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={!!modal} title={modal === 'create' ? 'إضافة دور جديد' : 'تعديل الدور'} onClose={() => setModal(null)} size="lg">
        <div className="space-y-4">
          <FormRow label="اسم الدور" required>
            <input className="form-input" value={formName} onChange={e => setFormName(e.target.value)} placeholder="مثال: مشرف" />
          </FormRow>
          <FormRow label="الوصف">
            <input className="form-input" value={formDesc} onChange={e => setFormDesc(e.target.value)} />
          </FormRow>
          <div>
            <p className="form-label mb-2">الصلاحيات ({formPerms.length} محددة)</p>
            <div className="border border-slate-200 rounded-xl overflow-hidden max-h-72 overflow-y-auto">
              {permModules.map(mod => {
                const modPerms = allPermissions.filter(p => p.module === mod);
                const allSel = modPerms.every(p => formPerms.includes(p.id));
                return (
                  <div key={mod} className="border-b border-slate-100 last:border-0">
                    <div
                      className="flex items-center gap-2 px-4 py-2 bg-slate-50 cursor-pointer hover:bg-slate-100"
                      onClick={() => toggleModule(mod)}
                    >
                      <input type="checkbox" checked={allSel} readOnly className="rounded" />
                      <span className="text-sm font-bold text-slate-700">{mod}</span>
                      <span className="text-xs text-slate-400">({modPerms.length})</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1 p-2">
                      {modPerms.map(p => (
                        <label key={p.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-50 cursor-pointer">
                          <input type="checkbox" checked={formPerms.includes(p.id)} onChange={() => togglePerm(p.id)} className="rounded" />
                          <span className="text-xs text-slate-600">{p.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
              {permModules.length === 0 && <p className="text-center text-slate-400 py-4 text-sm">لا توجد صلاحيات متاحة</p>}
            </div>
          </div>
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
