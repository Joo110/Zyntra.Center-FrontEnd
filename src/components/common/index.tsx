
import type { ReactNode } from 'react';
import { X, AlertTriangle, ChevronRight, ChevronLeft, Search, Loader2 } from 'lucide-react';

// ── Loading Spinner ───────────────────────────────────────────────────────────
export function Spinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const s = size === 'sm' ? 'h-4 w-4' : size === 'lg' ? 'h-10 w-10' : 'h-6 w-6';
  return <Loader2 className={`${s} animate-spin text-blue-600`} />;
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
export function SkeletonRow({ cols = 5 }: { cols?: number }) {
  return (
    <tr className="border-b border-slate-100">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="skeleton h-4 w-full rounded" />
        </td>
      ))}
    </tr>
  );
}

// ── Empty State ───────────────────────────────────────────────────────────────
export function EmptyState({ message = 'لا توجد بيانات', icon }: { message?: string; icon?: ReactNode }) {
  return (
    <tr>
      <td colSpan={100}>
        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
          <div className="mb-3 text-5xl">{icon || '📭'}</div>
          <p className="text-sm font-medium">{message}</p>
        </div>
      </td>
    </tr>
  );
}

// ── Error State ───────────────────────────────────────────────────────────────
export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <tr>
      <td colSpan={100}>
        <div className="flex flex-col items-center justify-center py-16 text-red-500">
          <AlertTriangle className="mb-2 h-10 w-10" />
          <p className="text-sm font-medium">{message || 'حدث خطأ في تحميل البيانات'}</p>
          {onRetry && (
            <button onClick={onRetry} className="mt-3 btn-secondary text-xs">
              إعادة المحاولة
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

// ── Confirm Delete Modal ──────────────────────────────────────────────────────
interface ConfirmDeleteProps {
  isOpen: boolean;
  itemName?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}
export function ConfirmDelete({ isOpen, itemName, onConfirm, onCancel, isLoading }: ConfirmDeleteProps) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <AlertTriangle className="h-6 w-6 text-red-600" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800">تأكيد الحذف</h3>
            <p className="text-sm text-slate-500 mt-0.5">
              {itemName ? `سيتم حذف "${itemName}" نهائياً` : 'هل أنت متأكد من الحذف؟'}
            </p>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onConfirm} disabled={isLoading} className="btn-danger flex-1 justify-center">
            {isLoading ? <Spinner size="sm" /> : null}
            {isLoading ? 'جاري الحذف...' : 'حذف'}
          </button>
          <button onClick={onCancel} disabled={isLoading} className="btn-secondary flex-1 justify-center">
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modal Wrapper ─────────────────────────────────────────────────────────────
interface ModalProps {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}
export function Modal({ isOpen, title, onClose, children, size = 'md' }: ModalProps) {
  if (!isOpen) return null;
  const widths = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className={`bg-white rounded-2xl shadow-xl w-full ${widths[size]} max-h-[90vh] flex flex-col`}>
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-800">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 p-5">{children}</div>
      </div>
    </div>
  );
}

// ── Pagination ────────────────────────────────────────────────────────────────
interface PaginationProps {
  page: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
  onChange: (page: number) => void;
}
export function Pagination({ page, totalPages, totalCount, pageSize, onChange }: PaginationProps) {
  if (totalPages <= 1) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalCount);
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
      <p className="text-xs text-slate-500">
        عرض <span className="font-semibold text-slate-700">{from}–{to}</span> من{' '}
        <span className="font-semibold text-slate-700">{totalCount}</span> نتيجة
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onChange(page - 1)}
          disabled={page === 1}
          className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
        {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
          let p = i + 1;
          if (totalPages > 5) {
            if (page <= 3) p = i + 1;
            else if (page >= totalPages - 2) p = totalPages - 4 + i;
            else p = page - 2 + i;
          }
          return (
            <button
              key={p}
              onClick={() => onChange(p)}
              className={`h-8 w-8 rounded-lg text-xs font-medium transition-colors ${
                p === page ? 'bg-blue-600 text-white' : 'hover:bg-slate-100 text-slate-600'
              }`}
            >
              {p}
            </button>
          );
        })}
        <button
          onClick={() => onChange(page + 1)}
          disabled={page === totalPages}
          className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// ── Search Bar ────────────────────────────────────────────────────────────────
interface SearchBarProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  onSearch?: () => void;
}
export function SearchBar({ value, onChange, placeholder = 'بحث...', onSearch }: SearchBarProps) {
  return (
    <div className="relative flex-1 min-w-[200px] max-w-sm">
      <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && onSearch?.()}
        placeholder={placeholder}
        className="form-input pr-9"
      />
    </div>
  );
}

// ── Status Badge ──────────────────────────────────────────────────────────────
export function StatusBadge({ label, type }: { label: string; type: 'success' | 'danger' | 'warning' | 'info' | 'gray' }) {
  const cls = {
    success: 'badge-green',
    danger: 'badge-red',
    warning: 'badge-yellow',
    info: 'badge-blue',
    gray: 'badge-gray',
  }[type];
  return <span className={cls}>{label}</span>;
}

// ── Page Header ───────────────────────────────────────────────────────────────
export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">{title}</h1>
        {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

// ── Form Row ──────────────────────────────────────────────────────────────────
export function FormRow({ label, required, children, error }: {
  label: string; required?: boolean; children: ReactNode; error?: string;
}) {
  return (
    <div>
      <label className="form-label">
        {label}{required && <span className="text-red-500 mr-1">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}
