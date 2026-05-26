import { useState, useEffect, useCallback } from 'react';
import { auditApi } from '../../api/services';
import type { AuditLogDto } from '../../types';
import { formatDate, firstOfMonth, today } from '../../utils/date';
import { PageHeader, SkeletonRow, EmptyState, ErrorState, Pagination } from '../../components/common';
import { ScrollText } from 'lucide-react';

const PAGE_SIZE = 30;
const ACTION_LABELS: Record<number, string> = { 0: 'إنشاء', 1: 'تعديل', 2: 'حذف', 3: 'دخول', 4: 'خروج' };
const ACTION_COLORS: Record<number, string> = { 0: 'badge-green', 1: 'badge-blue', 2: 'badge-red', 3: 'badge-yellow', 4: 'badge-gray' };

export default function AuditPage() {
  const [items, setItems] = useState<AuditLogDto[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [from, setFrom] = useState(firstOfMonth());
  const [to, setTo] = useState(today());
  const [entityName, setEntityName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

 const load = useCallback(async () => {
  setLoading(true);
  setError('');
  try {
    const res = await auditApi.getPaged(page, PAGE_SIZE, undefined, entityName || undefined, from, to) as any;
    setItems(Array.isArray(res?.data) ? res.data : []);
    setTotalCount(typeof res?.totalCount === 'number' ? res.totalCount : 0);
    setTotalPages(typeof res?.totalPages === 'number' && res.totalPages > 0 ? res.totalPages : 1);
  } catch {
    setItems([]);
    setTotalCount(0);
    setTotalPages(1);
    setError('فشل تحميل السجلات');
  } finally {
    setLoading(false);
  }
}, [page, from, to, entityName]);

  useEffect(() => {
    load();
  }, [load]);

  const ENTITIES = ['Student', 'Teacher', 'Group', 'Lesson', 'Payment', 'Expense', 'User', 'Role', 'Branch', 'Room', 'Subject'];
  const safeItems = Array.isArray(items) ? items : [];

  return (
    <div>
      <PageHeader title="سجل العمليات" subtitle={`إجمالي ${totalCount} عملية مسجلة`} />

      <div className="card mb-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="form-label">من تاريخ</label>
            <input
              type="date"
              className="form-input"
              value={from}
              onChange={e => {
                setFrom(e.target.value);
                setPage(1);
              }}
            />
          </div>

          <div>
            <label className="form-label">إلى تاريخ</label>
            <input
              type="date"
              className="form-input"
              value={to}
              onChange={e => {
                setTo(e.target.value);
                setPage(1);
              }}
            />
          </div>

          <div>
            <label className="form-label">نوع الكيان</label>
            <select
              className="form-select"
              value={entityName}
              onChange={e => {
                setEntityName(e.target.value);
                setPage(1);
              }}
            >
              <option value="">-- الكل --</option>
              {ENTITIES.map(e => (
                <option key={e} value={e}>
                  {e}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => {
              setFrom(firstOfMonth());
              setTo(today());
              setEntityName('');
              setPage(1);
            }}
            className="btn-secondary"
          >
            إعادة تعيين
          </button>
        </div>
      </div>

      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="table-header">المستخدم</th>
                <th className="table-header">العملية</th>
                <th className="table-header">الكيان</th>
                <th className="table-header">التاريخ</th>
                <th className="table-header">التفاصيل</th>
              </tr>
            </thead>

            <tbody>
              {loading && [1, 2, 3, 4, 5].map(i => <SkeletonRow key={i} cols={5} />)}
              {!loading && error && <ErrorState message={error} onRetry={load} />}
              {!loading && !error && safeItems.length === 0 && <EmptyState message="لا توجد سجلات" icon={<ScrollText />} />}
              {!loading && !error && safeItems.map(item => (
                <tr key={item.id} className="table-row">
                  <td className="table-cell font-semibold text-slate-800">{item.username || '—'}</td>

                  <td className="table-cell">
                    <span className={ACTION_COLORS[item.action] || 'badge-gray'}>
                      {ACTION_LABELS[item.action] || 'غير معروف'}
                    </span>
                  </td>

                  <td className="table-cell">
                    <span className="badge-blue">{item.entityName || '—'}</span>
                    <span className="text-xs text-slate-400 mr-1" dir="ltr">
                      #{String(item.entityId || '').slice(0, 8)}
                    </span>
                  </td>

                  <td className="table-cell text-slate-500">{formatDate(item.createdAt)}</td>

                  <td className="table-cell">
                    {(item.newValues || item.oldValues) && (
                      <details className="text-xs cursor-pointer">
                        <summary className="text-blue-600 hover:underline">عرض التفاصيل</summary>
                        <div className="mt-1 p-2 bg-slate-50 rounded-lg max-w-xs">
                          {item.oldValues && <p className="text-red-500 truncate">قبل: {item.oldValues}</p>}
                          {item.newValues && <p className="text-green-600 truncate">بعد: {item.newValues}</p>}
                        </div>
                      </details>
                    )}
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
    </div>
  );
}