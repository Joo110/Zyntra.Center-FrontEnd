import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Plus, Save, Settings } from 'lucide-react';
import { settingsApi } from '../../api/services';
import type { SettingDto, CreateSettingDto } from '../../types';
import { PageHeader, Modal, SkeletonRow, EmptyState, ErrorState, FormRow, Spinner } from '../../components/common';

export default function SettingsPage() {
  const [items, setItems] = useState<SettingDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [modal, setModal] = useState(false);
  const [newForm, setNewForm] = useState<CreateSettingDto>({ key: '', value: '', description: '' });
  const [newSaving, setNewSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const data = await settingsApi.getAll();
      setItems(data);
      const init: Record<string, string> = {};
      data.forEach(s => { init[s.key] = s.value; });
      setEditing(init);
    } catch { setError('فشل تحميل الإعدادات'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSaveOne = async (item: SettingDto) => {
    setSaving(prev => ({ ...prev, [item.key]: true }));
    try {
      await settingsApi.update(item.key, { key: item.key, value: editing[item.key], description: item.description });
      toast.success(`تم حفظ: ${item.key}`);
      load();
    } catch (e: any) { toast.error(e?.message || 'حدث خطأ'); }
    finally { setSaving(prev => ({ ...prev, [item.key]: false })); }
  };

  const handleCreate = async () => {
    if (!newForm.key || !newForm.value) { toast.error('المفتاح والقيمة مطلوبان'); return; }
    setNewSaving(true);
    try {
      await settingsApi.create(newForm); toast.success('تم إضافة الإعداد'); setModal(false); load();
    } catch (e: any) { toast.error(e?.message || 'حدث خطأ'); }
    finally { setNewSaving(false); }
  };

  return (
    <div>
      <PageHeader title="الإعدادات" subtitle="إعدادات النظام"
        action={<button onClick={() => { setNewForm({ key: '', value: '', description: '' }); setModal(true); }} className="btn-primary"><Plus className="h-4 w-4" /> إضافة إعداد</button>}
      />
      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="table-header">المفتاح</th>
                <th className="table-header">القيمة</th>
                <th className="table-header">الوصف</th>
                <th className="table-header">حفظ</th>
              </tr>
            </thead>
            <tbody>
              {loading && [1,2,3].map(i => <SkeletonRow key={i} cols={4} />)}
              {!loading && error && <ErrorState message={error} onRetry={load} />}
              {!loading && !error && items.length === 0 && <EmptyState message="لا توجد إعدادات" icon={<Settings />} />}
              {!loading && !error && items.map(item => (
                <tr key={item.key} className="table-row">
                  <td className="table-cell font-mono text-sm text-slate-700 font-semibold" dir="ltr">{item.key}</td>
                  <td className="table-cell">
                    <input
                      className="form-input"
                      value={editing[item.key] ?? item.value}
                      onChange={e => setEditing(prev => ({ ...prev, [item.key]: e.target.value }))}
                    />
                  </td>
                  <td className="table-cell text-slate-500">{item.description || '—'}</td>
                  <td className="table-cell">
                    <button
                      onClick={() => handleSaveOne(item)}
                      disabled={saving[item.key] || editing[item.key] === item.value}
                      className="btn-primary text-xs px-3 py-1.5"
                    >
                      {saving[item.key] ? <Spinner size="sm" /> : <Save className="h-3.5 w-3.5" />}
                      {saving[item.key] ? 'حفظ...' : 'حفظ'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={modal} title="إضافة إعداد جديد" onClose={() => setModal(false)}>
        <div className="space-y-4">
          <FormRow label="المفتاح (key)" required>
            <input className="form-input" value={newForm.key} onChange={e => setNewForm(f => ({ ...f, key: e.target.value }))} placeholder="مثال: CENTER_NAME" dir="ltr" />
          </FormRow>
          <FormRow label="القيمة" required>
            <input className="form-input" value={newForm.value} onChange={e => setNewForm(f => ({ ...f, value: e.target.value }))} />
          </FormRow>
          <FormRow label="الوصف">
            <input className="form-input" value={newForm.description || ''} onChange={e => setNewForm(f => ({ ...f, description: e.target.value }))} />
          </FormRow>
          <div className="flex gap-3 pt-2">
            <button onClick={handleCreate} disabled={newSaving} className="btn-primary flex-1 justify-center">
              {newSaving && <Spinner size="sm" />} {newSaving ? 'جاري الحفظ...' : 'حفظ'}
            </button>
            <button onClick={() => setModal(false)} className="btn-secondary flex-1 justify-center">إلغاء</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
