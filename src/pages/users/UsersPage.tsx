import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, UserCog, KeyRound } from 'lucide-react';
import { usersApi, rolesApi } from '../../api/services';
import type { UserDto, CreateUserDto, UpdateUserDto, RoleDto } from '../../types';
import { UserStatus } from '../../types';
import { formatDate } from '../../utils/date';
import { PageHeader, SearchBar, Modal, ConfirmDelete, SkeletonRow, EmptyState, ErrorState, Pagination, FormRow, Spinner } from '../../components/common';

const PAGE_SIZE = 20;
const STATUS_LABELS: Record<number, string> = { 0: 'نشط', 1: 'غير نشط', 2: 'موقوف' };
const STATUS_COLORS: Record<number, string> = { 0: 'badge-green', 1: 'badge-gray', 2: 'badge-red' };

export default function UsersPage() {
  const [items, setItems] = useState<UserDto[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [roles, setRoles] = useState<RoleDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState<'create' | 'edit' | 'password' | null>(null);
  const [selected, setSelected] = useState<UserDto | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UserDto | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [createForm, setCreateForm] = useState<CreateUserDto>({ fullName: '', username: '', password: '', email: '', phone: '', roleIds: [] });
  const [updateForm, setUpdateForm] = useState<UpdateUserDto | null>(null);
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });

 const load = useCallback(async () => {
  setLoading(true);
  setError('');
  try {
    const res = await usersApi.getPaged(page, PAGE_SIZE, search || undefined) as any;
    setItems(Array.isArray(res?.data) ? res.data : []);
    setTotalCount(typeof res?.totalCount === 'number' ? res.totalCount : 0);
    setTotalPages(typeof res?.totalPages === 'number' && res.totalPages > 0 ? res.totalPages : 1);
  } catch {
    setError('فشل تحميل البيانات');
    setItems([]);
    setTotalCount(0);
    setTotalPages(1);
  } finally {
    setLoading(false);
  }
}, [page, search]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    rolesApi.getAll()
      .then((res) => {
        setRoles(Array.isArray(res) ? res : []);
      })
      .catch(() => {
        setRoles([]);
      });
  }, []);

  const handleSearch = () => {
    setSearch(searchInput);
    setPage(1);
  };

  const openCreate = () => {
    setCreateForm({ fullName: '', username: '', password: '', email: '', phone: '', roleIds: [] });
    setSelected(null);
    setModal('create');
  };

  const openEdit = (u: UserDto) => {
    setSelected(u);
    setUpdateForm({
      fullName: u.fullName,
      email: u.email,
      phone: u.phone,
      status: u.status,
      roleIds: Array.isArray((u as any)?.roleIds) ? (u as any).roleIds : [],
    });
    setModal('edit');
  };

  const openPassword = (u: UserDto) => {
    setSelected(u);
    setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setModal('password');
  };

  const toggleRole = (id: string, current: string[]) =>
    current.includes(id) ? current.filter(x => x !== id) : [...current, id];

  const handleSave = async () => {
    setSaving(true);
    try {
      if (modal === 'create') {
        if (!createForm.fullName || !createForm.username || !createForm.password) {
          toast.error('يرجى ملء الحقول المطلوبة');
          setSaving(false);
          return;
        }
        await usersApi.create(createForm);
        toast.success('تم إنشاء المستخدم');
      } else if (selected && updateForm) {
        await usersApi.update(selected.id, updateForm);
        toast.success('تم التعديل');
      }
      setModal(null);
      load();
    } catch (e: any) {
      toast.error(e?.message || 'حدث خطأ');
    } finally {
      setSaving(false);
    }
  };

  const handlePassword = async () => {
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      toast.error('كلمة المرور الجديدة غير متطابقة');
      return;
    }
    if (!selected) return;

    setSaving(true);
    try {
      await usersApi.changePassword(selected.id, pwForm);
      toast.success('تم تغيير كلمة المرور');
      setModal(null);
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
      await usersApi.delete(deleteTarget.id);
      toast.success('تم الحذف');
      setDeleteTarget(null);
      load();
    } catch (e: any) {
      toast.error(e?.message || 'حدث خطأ');
    } finally {
      setDeleting(false);
    }
  };

  const safeItems = Array.isArray(items) ? items : [];
  const safeRoles = Array.isArray(roles) ? roles : [];

  return (
    <div>
      <PageHeader
        title="المستخدمين"
        subtitle={`إجمالي ${totalCount} مستخدم`}
        action={
          <button onClick={openCreate} className="btn-primary">
            <Plus className="h-4 w-4" /> إضافة مستخدم
          </button>
        }
      />

      <div className="card">
        <div className="flex flex-wrap gap-3 mb-4">
          <SearchBar value={searchInput} onChange={setSearchInput} onSearch={handleSearch} placeholder="البحث بالاسم..." />
          <button onClick={handleSearch} className="btn-primary">بحث</button>
          {search && <button onClick={() => { setSearch(''); setSearchInput(''); setPage(1); }} className="btn-secondary text-xs">إعادة تعيين</button>}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="table-header">الاسم</th>
                <th className="table-header">اسم المستخدم</th>
                <th className="table-header">البريد</th>
                <th className="table-header">الأدوار</th>
                <th className="table-header">آخر دخول</th>
                <th className="table-header">الحالة</th>
                <th className="table-header">إجراءات</th>
              </tr>
            </thead>

            <tbody>
              {loading && [1, 2, 3].map(i => <SkeletonRow key={i} cols={7} />)}
              {!loading && error && <ErrorState message={error} onRetry={load} />}
              {!loading && !error && safeItems.length === 0 && <EmptyState message="لا يوجد مستخدمون" icon={<UserCog />} />}

              {!loading && !error && safeItems.map(u => (
                <tr key={u.id} className="table-row">
                  <td className="table-cell font-semibold text-slate-800">{u.fullName}</td>
                  <td className="table-cell font-mono text-sm" dir="ltr">{u.username}</td>
                  <td className="table-cell text-slate-500" dir="ltr">{u.email || '—'}</td>
                  <td className="table-cell">
                    <div className="flex flex-wrap gap-1">
                      {Array.isArray((u as any)?.roles) ? (u as any).roles.map((r: string) => (
                        <span key={r} className="badge-blue text-xs">{r}</span>
                      )) : null}
                    </div>
                  </td>
                  <td className="table-cell">{formatDate(u.lastLoginAt)}</td>
                  <td className="table-cell">
                    <span className={STATUS_COLORS[u.status]}>{STATUS_LABELS[u.status]}</span>
                  </td>
                  <td className="table-cell">
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(u)} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600" title="تعديل">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button onClick={() => openPassword(u)} className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-600" title="تغيير كلمة المرور">
                        <KeyRound className="h-4 w-4" />
                      </button>
                      <button onClick={() => setDeleteTarget(u)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-600" title="حذف">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Pagination page={page} totalPages={totalPages} totalCount={totalCount} pageSize={PAGE_SIZE} onChange={setPage} />
      </div>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={modal === 'create' || modal === 'edit'}
        title={modal === 'create' ? 'إضافة مستخدم' : 'تعديل المستخدم'}
        onClose={() => setModal(null)}
        size="lg"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormRow label="الاسم الكامل" required>
            <input
              className="form-input"
              value={modal === 'create' ? createForm.fullName : updateForm?.fullName || ''}
              onChange={e => modal === 'create'
                ? setCreateForm(f => ({ ...f, fullName: e.target.value }))
                : setUpdateForm(f => f && ({ ...f, fullName: e.target.value }))}
            />
          </FormRow>

          {modal === 'create' && (
            <FormRow label="اسم المستخدم" required>
              <input
                className="form-input"
                value={createForm.username}
                onChange={e => setCreateForm(f => ({ ...f, username: e.target.value }))}
                dir="ltr"
              />
            </FormRow>
          )}

          {modal === 'create' && (
            <FormRow label="كلمة المرور" required>
              <input
                type="password"
                className="form-input"
                value={createForm.password}
                onChange={e => setCreateForm(f => ({ ...f, password: e.target.value }))}
              />
            </FormRow>
          )}

          <FormRow label="البريد الإلكتروني">
            <input
              type="email"
              className="form-input"
              value={modal === 'create' ? createForm.email || '' : updateForm?.email || ''}
              onChange={e => modal === 'create'
                ? setCreateForm(f => ({ ...f, email: e.target.value }))
                : setUpdateForm(f => f && ({ ...f, email: e.target.value }))}
              dir="ltr"
            />
          </FormRow>

          <FormRow label="رقم الهاتف">
            <input
              className="form-input"
              value={modal === 'create' ? createForm.phone || '' : updateForm?.phone || ''}
              onChange={e => modal === 'create'
                ? setCreateForm(f => ({ ...f, phone: e.target.value }))
                : setUpdateForm(f => f && ({ ...f, phone: e.target.value }))}
              dir="ltr"
            />
          </FormRow>

          {modal === 'edit' && updateForm && (
            <FormRow label="الحالة">
              <select
                className="form-select"
                value={updateForm.status}
                onChange={e => setUpdateForm(f => f && ({ ...f, status: +e.target.value as UserStatus }))}
              >
                <option value={UserStatus.Active}>نشط</option>
                <option value={UserStatus.Inactive}>غير نشط</option>
                <option value={UserStatus.Suspended}>موقوف</option>
              </select>
            </FormRow>
          )}
        </div>

        {/* Roles */}
        <div className="mt-4">
          <p className="form-label mb-2">الأدوار</p>
          <div className="flex flex-wrap gap-2 p-3 border border-slate-200 rounded-xl">
            {safeRoles.map(r => {
              const current = modal === 'create' ? createForm.roleIds : updateForm?.roleIds || [];
              const checked = current.includes(r.id);

              return (
                <label
                  key={r.id}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer border transition-colors ${
                    checked ? 'bg-blue-50 border-blue-300 text-blue-700' : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => {
                      if (modal === 'create') {
                        setCreateForm(f => ({ ...f, roleIds: toggleRole(r.id, Array.isArray(f.roleIds) ? f.roleIds : []) }));
                      } else {
                        setUpdateForm(f => f && ({ ...f, roleIds: toggleRole(r.id, Array.isArray(f.roleIds) ? f.roleIds : []) }));
                      }
                    }}
                    className="rounded"
                  />
                  <span className="text-sm font-medium">{r.name}</span>
                </label>
              );
            })}
          </div>
        </div>

        <div className="flex gap-3 pt-4 mt-2 border-t border-slate-100">
          <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 justify-center">
            {saving && <Spinner size="sm" />} {saving ? 'جاري الحفظ...' : 'حفظ'}
          </button>
          <button onClick={() => setModal(null)} className="btn-secondary flex-1 justify-center">إلغاء</button>
        </div>
      </Modal>

      {/* Password Modal */}
      <Modal isOpen={modal === 'password'} title={`تغيير كلمة مرور: ${selected?.fullName}`} onClose={() => setModal(null)}>
        <div className="space-y-4">
          <FormRow label="كلمة المرور الحالية" required>
            <input
              type="password"
              className="form-input"
              value={pwForm.currentPassword}
              onChange={e => setPwForm(f => ({ ...f, currentPassword: e.target.value }))}
            />
          </FormRow>

          <FormRow label="كلمة المرور الجديدة" required>
            <input
              type="password"
              className="form-input"
              value={pwForm.newPassword}
              onChange={e => setPwForm(f => ({ ...f, newPassword: e.target.value }))}
            />
          </FormRow>

          <FormRow label="تأكيد كلمة المرور الجديدة" required>
            <input
              type="password"
              className="form-input"
              value={pwForm.confirmPassword}
              onChange={e => setPwForm(f => ({ ...f, confirmPassword: e.target.value }))}
            />
          </FormRow>

          <div className="flex gap-3 pt-2">
            <button onClick={handlePassword} disabled={saving} className="btn-primary flex-1 justify-center">
              {saving && <Spinner size="sm" />} {saving ? 'جاري التغيير...' : 'تغيير'}
            </button>
            <button onClick={() => setModal(null)} className="btn-secondary flex-1 justify-center">إلغاء</button>
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