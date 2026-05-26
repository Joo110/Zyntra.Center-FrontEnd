/** تحويل Date أو string إلى YYYY-MM-DD (DateOnly) */
export const toDateOnly = (val: Date | string): string => {
  if (!val) return '';
  const d = typeof val === 'string' ? new Date(val) : val;
  if (isNaN(d.getTime())) return typeof val === 'string' ? val : '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
};

/** عرض DateOnly بشكل مقروء: DD/MM/YYYY */
export const formatDate = (val?: string | null): string => {
  if (!val) return '—';
  const parts = val.split('-');
  if (parts.length !== 3) return val;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
};

/** اليوم بصيغة YYYY-MM-DD */
export const today = (): string => toDateOnly(new Date());

/** أول يوم في الشهر الحالي */
export const firstOfMonth = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
};
