import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
  ClipboardCheck, Save, Users, CheckCircle2, XCircle, Clock, FileCheck,
  RotateCcw, BarChart3, UserSearch, TrendingUp, AlertTriangle,
} from 'lucide-react';
import { attendanceApi, lessonsApi, groupsApi, studentsApi } from '../../api/services';
import type {
  LessonDto, GroupDto, StudentListDto, BulkAttendanceDto, AttendanceStatus,
  AttendanceReportDto, LessonAttendanceSummaryDto, AttendanceDto,
} from '../../types';
import { AttendanceStatus as AS } from '../../types';
import { formatDate } from '../../utils/date';
import { PageHeader, Spinner, EmptyState } from '../../components/common';

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = 'record' | 'lesson-summary' | 'student-report';

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_META: Record<
  number,
  { label: string; shortLabel: string; color: string; bg: string; ring: string; icon: React.ReactNode }
> = {
  [AS.Present]: {
    label: 'حاضر', shortLabel: 'حاضر',
    color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200',
    ring: 'ring-emerald-400', icon: <CheckCircle2 className="h-3.5 w-3.5" />,
  },
  [AS.Absent]: {
    label: 'غائب', shortLabel: 'غائب',
    color: 'text-red-700', bg: 'bg-red-50 border-red-200',
    ring: 'ring-red-400', icon: <XCircle className="h-3.5 w-3.5" />,
  },
  [AS.Late]: {
    label: 'متأخر', shortLabel: 'متأخر',
    color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200',
    ring: 'ring-amber-400', icon: <Clock className="h-3.5 w-3.5" />,
  },
  [AS.Excused]: {
    label: 'معذور', shortLabel: 'معذور',
    color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200',
    ring: 'ring-blue-400', icon: <FileCheck className="h-3.5 w-3.5" />,
  },
};

const STATUS_ORDER = [AS.Present, AS.Late, AS.Absent, AS.Excused];

// ─── Shared Sub-Components ────────────────────────────────────────────────────

function AttendanceBadge({ status }: { status: number }) {
  const meta = STATUS_META[status];
  if (!meta) return null;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${meta.bg} ${meta.color}`}>
      {meta.icon}
      {meta.label}
    </span>
  );
}

function ProgressBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-500 ${color}`}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

function SummaryCard({ count, total, statusKey }: { count: number; total: number; statusKey: number }) {
  const meta = STATUS_META[statusKey];
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${meta.bg}`}>
      <span className={meta.color}>{meta.icon}</span>
      <div className="min-w-0">
        <p className={`text-lg font-bold leading-none ${meta.color}`}>{count}</p>
        <p className={`text-xs mt-0.5 ${meta.color} opacity-80`}>{meta.label} · {pct}%</p>
      </div>
    </div>
  );
}

// ─── Student Row ──────────────────────────────────────────────────────────────

function StudentRow({
  student, idx, entry, onStatusChange, onNotesChange,
}: {
  student: StudentListDto;
  idx: number;
  entry: { status: AttendanceStatus; notes: string };
  onStatusChange: (id: string, status: AttendanceStatus) => void;
  onNotesChange: (id: string, notes: string) => void;
}) {
  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 p-3 rounded-xl border transition-all duration-150 ${
        entry.status === AS.Absent   ? 'bg-red-50/60 border-red-100'
        : entry.status === AS.Late  ? 'bg-amber-50/60 border-amber-100'
        : entry.status === AS.Excused ? 'bg-blue-50/60 border-blue-100'
        : 'bg-white border-slate-100 hover:border-slate-200'
      }`}
    >
      {/* Index + Name */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <span className="flex-shrink-0 w-7 h-7 rounded-full bg-slate-100 text-slate-500 text-xs font-bold flex items-center justify-center">
          {idx + 1}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-800 truncate">{student.fullName}</p>
          <p className="text-xs text-slate-400 truncate">{student.schoolGrade}</p>
        </div>
      </div>

      {/* Status Buttons */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {STATUS_ORDER.map(st => {
          const meta = STATUS_META[st];
          const active = entry.status === st;
          return (
            <button
              key={st}
              onClick={() => onStatusChange(student.id, st)}
              title={meta.label}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all duration-100 ${
                active
                  ? `${meta.bg} ${meta.color} ring-1 ${meta.ring} shadow-sm`
                  : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300 hover:text-slate-600'
              }`}
            >
              {meta.icon}
              <span className="hidden sm:inline">{meta.shortLabel}</span>
            </button>
          );
        })}
      </div>

      {/* Notes */}
      <input
        className="form-input w-full sm:w-36 text-xs placeholder-slate-300 flex-shrink-0"
        placeholder="ملاحظة..."
        value={entry.notes}
        onChange={e => onNotesChange(student.id, e.target.value)}
      />
    </div>
  );
}

// ─── Tab 1: Record ────────────────────────────────────────────────────────────

function RecordTab({ groups }: { groups: GroupDto[] }) {
  const [lessons, setLessons]                     = useState<LessonDto[]>([]);
  const [students, setStudents]                   = useState<StudentListDto[]>([]);
  const [selectedGroup, setSelectedGroup]         = useState('');
  const [selectedLesson, setSelectedLesson]       = useState('');
  const [entries, setEntries]                     = useState<Record<string, { status: AttendanceStatus; notes: string }>>({});
  const [saving, setSaving]                       = useState(false);
  const [loadingGroup, setLoadingGroup]           = useState(false);
  const [loadingLesson, setLoadingLesson]         = useState(false);
  const [hasExisting, setHasExisting]             = useState(false);
  const [justSaved, setJustSaved]                 = useState(false);

  const handleGroupChange = async (groupId: string) => {
    setSelectedGroup(groupId);
    setSelectedLesson('');
    setStudents([]);
    setLessons([]);
    setEntries({});
    setHasExisting(false);
    setJustSaved(false);
    if (!groupId) return;

    setLoadingGroup(true);
    try {
      const [ls, sts] = await Promise.all([
        lessonsApi.getByGroup(groupId),
        studentsApi.getByGroup(groupId),
      ]);
      setLessons(ls);
      setStudents(sts);
      const init: Record<string, { status: AttendanceStatus; notes: string }> = {};
      sts.forEach(s => { init[s.id] = { status: AS.Present, notes: '' }; });
      setEntries(init);
    } catch {
      toast.error('فشل تحميل بيانات المجموعة');
    } finally {
      setLoadingGroup(false);
    }
  };

  const handleLessonChange = async (lessonId: string) => {
    setSelectedLesson(lessonId);
    setHasExisting(false);
    setJustSaved(false);
    if (!lessonId) return;

    const init: Record<string, { status: AttendanceStatus; notes: string }> = {};
    students.forEach(s => { init[s.id] = { status: AS.Present, notes: '' }; });

    setLoadingLesson(true);
    try {
      const existing = await attendanceApi.getByLesson(lessonId);
      if (existing.length > 0) {
        setHasExisting(true);
        existing.forEach(a => { init[a.studentId] = { status: a.status, notes: a.notes || '' }; });
        toast.success('تم تحميل الحضور المسجّل مسبقاً', { icon: '📋' });
      }
    } catch { /* no existing */ } finally {
      setEntries(init);
      setLoadingLesson(false);
    }
  };

  const setStatus = (studentId: string, status: AttendanceStatus) =>
    setEntries(prev => ({ ...prev, [studentId]: { ...prev[studentId], status } }));

  const setNotes = (studentId: string, notes: string) =>
    setEntries(prev => ({ ...prev, [studentId]: { ...prev[studentId], notes } }));

  const markAll = (status: AttendanceStatus) => {
    const updated: Record<string, { status: AttendanceStatus; notes: string }> = {};
    students.forEach(s => { updated[s.id] = { status, notes: entries[s.id]?.notes || '' }; });
    setEntries(updated);
    toast.success(`تم تحديد الكل كـ "${STATUS_META[status].label}"`, { duration: 1500 });
  };

  const resetAll = () => {
    const updated: Record<string, { status: AttendanceStatus; notes: string }> = {};
    students.forEach(s => { updated[s.id] = { status: AS.Present, notes: '' }; });
    setEntries(updated);
    setJustSaved(false);
    toast.success('تم إعادة تعيين الحضور', { duration: 1500 });
  };

  const handleSave = async () => {
    if (!selectedLesson) { toast.error('يرجى اختيار الحصة أولاً'); return; }
    setSaving(true);
    try {
      const bulk: BulkAttendanceDto = {
        lessonId: selectedLesson,
        entries: students.map(s => ({
          studentId: s.id,
          status: entries[s.id]?.status ?? AS.Present,
          notes: entries[s.id]?.notes || undefined,
        })),
      };
      await attendanceApi.recordBulk(bulk);
      toast.success('تم حفظ الحضور بنجاح ✓');
      setHasExisting(true);
      setJustSaved(true);
    } catch (e: any) {
      toast.error(e?.message || 'حدث خطأ أثناء الحفظ');
    } finally {
      setSaving(false);
    }
  };

  // Computed summary
  const summary = students.reduce((acc, s) => {
    const st = entries[s.id]?.status ?? AS.Present;
    acc[st] = (acc[st] || 0) + 1;
    return acc;
  }, {} as Record<number, number>);

  const totalStudents      = students.length;
  const selectedGroupName  = groups.find(g => g.id === selectedGroup)?.name;
  const selectedLessonData = lessons.find(l => l.id === selectedLesson);

  return (
    <div className="space-y-4">
      {/* Selectors */}
      <div className="card">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="form-label">المجموعة <span className="text-red-500">*</span></label>
            <div className="relative">
              <select
                className="form-select pr-9"
                value={selectedGroup}
                onChange={e => handleGroupChange(e.target.value)}
                disabled={loadingGroup}
              >
                <option value="">-- اختر المجموعة --</option>
                {groups.map(g => (
                  <option key={g.id} value={g.id}>{g.name} — {g.teacherName}</option>
                ))}
              </select>
              {loadingGroup && <span className="absolute left-3 top-1/2 -translate-y-1/2"><Spinner size="sm" /></span>}
            </div>
          </div>

          <div>
            <label className="form-label">الحصة <span className="text-red-500">*</span></label>
            <div className="relative">
              <select
                className="form-select pr-9"
                value={selectedLesson}
                onChange={e => handleLessonChange(e.target.value)}
                disabled={!selectedGroup || loadingGroup || loadingLesson}
              >
                <option value="">-- اختر الحصة --</option>
                {lessons.map(l => (
                  <option key={l.id} value={l.id}>
                    {formatDate(l.startTime)} — {l.topic || 'بدون موضوع'}
                  </option>
                ))}
              </select>
              {loadingLesson && <span className="absolute left-3 top-1/2 -translate-y-1/2"><Spinner size="sm" /></span>}
            </div>
            {hasExisting && selectedLesson && (
              <p className="mt-1.5 text-xs text-blue-600 flex items-center gap-1">
                <FileCheck className="h-3 w-3" />
                يوجد حضور مسجّل لهذه الحصة — يمكنك تعديله والحفظ مجدداً
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Loading */}
      {loadingLesson && (
        <div className="card flex items-center justify-center py-10 gap-3 text-slate-400">
          <Spinner size="lg" />
          <span className="text-sm">جاري تحميل بيانات الحضور...</span>
        </div>
      )}

      {/* Post-save banner */}
      {justSaved && !loadingLesson && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-200">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />
          <p className="text-sm text-emerald-800">
            <span className="font-semibold">تم الحفظ بنجاح · </span>
            حاضر: <strong>{summary[AS.Present] || 0}</strong> ·{' '}
            غائب: <strong>{summary[AS.Absent] || 0}</strong> ·{' '}
            متأخر: <strong>{summary[AS.Late] || 0}</strong> ·{' '}
            معذور: <strong>{summary[AS.Excused] || 0}</strong>
          </p>
        </div>
      )}

      {/* Main section */}
      {!loadingLesson && students.length > 0 && (
        <>
          {/* Summary + Quick Actions */}
          <div className="card">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex flex-wrap gap-2">
                {STATUS_ORDER.map(st => (
                  <SummaryCard key={st} statusKey={st} count={summary[st] || 0} total={totalStudents} />
                ))}
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl border bg-slate-50 border-slate-200">
                  <Users className="h-4 w-4 text-slate-400" />
                  <div>
                    <p className="text-lg font-bold leading-none text-slate-700">{totalStudents}</p>
                    <p className="text-xs mt-0.5 text-slate-400">إجمالي</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2 items-end">
                <p className="text-xs text-slate-400 font-medium">تحديد الكل:</p>
                <div className="flex flex-wrap gap-1.5 justify-end">
                  {STATUS_ORDER.map(st => {
                    const meta = STATUS_META[st];
                    return (
                      <button
                        key={st}
                        onClick={() => markAll(st)}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all hover:shadow-sm ${meta.bg} ${meta.color}`}
                      >
                        {meta.icon}{meta.label}
                      </button>
                    );
                  })}
                  <button
                    onClick={resetAll}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 transition-all"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    إعادة تعيين
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Student List */}
          <div className="card">
            {selectedLessonData && (
              <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-100">
                <div>
                  <p className="text-sm font-semibold text-slate-700">
                    {selectedGroupName && <span className="text-slate-500">{selectedGroupName} · </span>}
                    {selectedLessonData.topic || 'حصة بدون موضوع'}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">{formatDate(selectedLessonData.startTime)}</p>
                </div>
                <span className="text-xs bg-slate-100 text-slate-500 px-2.5 py-1 rounded-full font-medium">
                  {totalStudents} طالب
                </span>
              </div>
            )}

            <div className="space-y-1.5 max-h-[55vh] overflow-y-auto -mx-1 px-1">
              {students.map((student, idx) => (
                <StudentRow
                  key={student.id}
                  student={student}
                  idx={idx}
                  entry={entries[student.id] || { status: AS.Present, notes: '' }}
                  onStatusChange={setStatus}
                  onNotesChange={setNotes}
                />
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
              <p className="text-xs text-slate-400">
                {summary[AS.Present] || 0} حاضر · {summary[AS.Absent] || 0} غائب ·{' '}
                {summary[AS.Late] || 0} متأخر · {summary[AS.Excused] || 0} معذور
              </p>
              <button
                onClick={handleSave}
                disabled={saving || !selectedLesson}
                className="btn-primary min-w-[160px] flex items-center justify-center gap-2"
              >
                {saving ? (
                  <><Spinner size="sm" /><span>جاري الحفظ...</span></>
                ) : (
                  <><Save className="h-4 w-4" /><span>{hasExisting ? 'تحديث الحضور' : 'حفظ الحضور'} ({totalStudents})</span></>
                )}
              </button>
            </div>
          </div>
        </>
      )}

      {selectedGroup && !loadingGroup && students.length === 0 && (
        <div className="card">
          <EmptyState message="لا يوجد طلاب مسجّلون في هذه المجموعة" icon={<ClipboardCheck />} />
        </div>
      )}

      {!selectedGroup && (
        <div className="card py-12 text-center">
          <ClipboardCheck className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">اختر مجموعة وحصة لبدء تسجيل الحضور</p>
        </div>
      )}
    </div>
  );
}

// ─── Tab 2: Lesson Summary ────────────────────────────────────────────────────

function LessonSummaryTab({ groups }: { groups: GroupDto[] }) {
  const [selectedGroup, setSelectedGroup]   = useState('');
  const [selectedLesson, setSelectedLesson] = useState('');
  const [lessons, setLessons]               = useState<LessonDto[]>([]);
  const [summary, setSummary]               = useState<LessonAttendanceSummaryDto | null>(null);
  const [loading, setLoading]               = useState(false);
  const [loadingLessons, setLoadingLessons] = useState(false);

  const handleGroupChange = async (groupId: string) => {
    setSelectedGroup(groupId);
    setSelectedLesson('');
    setSummary(null);
    setLessons([]);
    if (!groupId) return;
    setLoadingLessons(true);
    try {
      const ls = await lessonsApi.getByGroup(groupId);
      setLessons(ls);
    } catch {
      toast.error('فشل تحميل الحصص');
    } finally {
      setLoadingLessons(false);
    }
  };

  const handleLessonChange = async (lessonId: string) => {
    setSelectedLesson(lessonId);
    setSummary(null);
    if (!lessonId) return;
    setLoading(true);
    try {
      const data = await attendanceApi.getLessonSummary(lessonId);
      setSummary(data);
    } catch {
      toast.error('لا يوجد ملخص لهذه الحصة أو لم يُسجَّل حضور بعد');
    } finally {
      setLoading(false);
    }
  };

  // Derive late/excused counts from details since backend DTO doesn't include them
  const lateCount    = summary?.details.filter(d => d.status === AS.Late).length    ?? 0;
  const excusedCount = summary?.details.filter(d => d.status === AS.Excused).length ?? 0;
  const total        = summary?.totalStudents ?? 0;

  const absenceRate = total > 0 && summary
    ? Math.round((summary.absentCount / total) * 100)
    : 0;

  return (
    <div className="space-y-4">
      {/* Selectors */}
      <div className="card">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="form-label">المجموعة <span className="text-red-500">*</span></label>
            <select
              className="form-select"
              value={selectedGroup}
              onChange={e => handleGroupChange(e.target.value)}
            >
              <option value="">-- اختر المجموعة --</option>
              {groups.map(g => (
                <option key={g.id} value={g.id}>{g.name} — {g.teacherName}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label">الحصة <span className="text-red-500">*</span></label>
            <div className="relative">
              <select
                className="form-select"
                value={selectedLesson}
                onChange={e => handleLessonChange(e.target.value)}
                disabled={!selectedGroup || loadingLessons}
              >
                <option value="">-- اختر الحصة --</option>
                {lessons.map(l => (
                  <option key={l.id} value={l.id}>
                    {formatDate(l.startTime)} — {l.topic || 'بدون موضوع'}
                  </option>
                ))}
              </select>
              {loadingLessons && (
                <span className="absolute left-3 top-1/2 -translate-y-1/2"><Spinner size="sm" /></span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="card flex items-center justify-center py-12 gap-3 text-slate-400">
          <Spinner size="lg" />
          <span className="text-sm">جاري تحميل ملخص الحصة...</span>
        </div>
      )}

      {/* Result */}
      {!loading && summary && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <SummaryCard statusKey={AS.Present} count={summary.presentCount} total={total} />
            <SummaryCard statusKey={AS.Late}    count={lateCount}            total={total} />
            <SummaryCard statusKey={AS.Absent}  count={summary.absentCount}  total={total} />
            <SummaryCard statusKey={AS.Excused} count={excusedCount}         total={total} />
          </div>

          {/* Detail card */}
          <div className="card space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-700">
                  {summary.lessonTopic || 'حصة بدون موضوع'}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {formatDate(summary.lessonDate)} · إجمالي الطلاب:{' '}
                  <span className="font-semibold text-slate-600">{total}</span>
                </p>
              </div>
              <div className="text-left flex-shrink-0">
                <p className={`text-2xl font-extrabold leading-none ${
                  summary.presentCount / total >= 0.8 ? 'text-emerald-600'
                  : summary.presentCount / total >= 0.6 ? 'text-amber-500'
                  : 'text-red-600'
                }`}>
                  {total > 0 ? Math.round((summary.presentCount / total) * 100) : 0}%
                </p>
                <p className="text-xs text-slate-400 mt-1">نسبة الحضور</p>
              </div>
            </div>

            {/* Progress bars */}
            <div className="space-y-3">
              {[
                { label: 'حاضر',  count: summary.presentCount, color: 'bg-emerald-500' },
                { label: 'متأخر', count: lateCount,            color: 'bg-amber-400'   },
                { label: 'غائب',  count: summary.absentCount,  color: 'bg-red-400'     },
                { label: 'معذور', count: excusedCount,         color: 'bg-blue-400'    },
              ].map(item => (
                <div key={item.label} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">{item.label}</span>
                    <span className="font-semibold text-slate-700">
                      {item.count} ({total > 0 ? Math.round((item.count / total) * 100) : 0}%)
                    </span>
                  </div>
                  <ProgressBar value={total > 0 ? (item.count / total) * 100 : 0} color={item.color} />
                </div>
              ))}
            </div>

            {/* High absence alert */}
            {absenceRate > 30 && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-100">
                <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-red-700">
                  نسبة الغياب مرتفعة في هذه الحصة ({absenceRate}%). يُنصح بالمتابعة مع الطلاب الغائبين.
                </p>
              </div>
            )}
          </div>

          {/* Details list */}
          {summary.details.length > 0 && (
            <div className="card">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">
                تفاصيل الطلاب ({summary.details.length})
              </h3>
              <div className="space-y-1.5 max-h-72 overflow-y-auto">
                {summary.details.map((a, idx) => (
                  <div
                    key={a.id}
                    className={`flex items-center justify-between p-3 rounded-xl border ${
                      a.status === AS.Absent  ? 'bg-red-50/60 border-red-100'
                      : a.status === AS.Late  ? 'bg-amber-50/60 border-amber-100'
                      : a.status === AS.Excused ? 'bg-blue-50/60 border-blue-100'
                      : 'bg-white border-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-500 text-xs font-bold flex items-center justify-center flex-shrink-0">
                        {idx + 1}
                      </span>
                      <span className="text-sm font-medium text-slate-700">{a.studentName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {a.notes && (
                        <span className="text-xs text-slate-400 hidden sm:inline truncate max-w-[120px]">{a.notes}</span>
                      )}
                      <AttendanceBadge status={a.status} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {!loading && !summary && selectedLesson && (
        <div className="card">
          <EmptyState message="لا توجد بيانات حضور لهذه الحصة بعد" icon={<BarChart3 />} />
        </div>
      )}

      {!selectedGroup && (
        <div className="card py-12 text-center">
          <BarChart3 className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">اختر مجموعة وحصة لعرض الملخص</p>
        </div>
      )}
    </div>
  );
}

// ─── Tab 3: Student Report ────────────────────────────────────────────────────

function StudentReportTab({ groups }: { groups: GroupDto[] }) {
  const [selectedGroup, setSelectedGroup]     = useState('');
  const [selectedStudent, setSelectedStudent] = useState('');
  const [students, setStudents]               = useState<StudentListDto[]>([]);
  const [report, setReport]                   = useState<AttendanceReportDto | null>(null);
  const [history, setHistory]                 = useState<AttendanceDto[]>([]);
  const [loading, setLoading]                 = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [activeView, setActiveView]           = useState<'bars' | 'history'>('bars');

  const handleGroupChange = async (groupId: string) => {
    setSelectedGroup(groupId);
    setSelectedStudent('');
    setReport(null);
    setHistory([]);
    setStudents([]);
    if (!groupId) return;
    setLoadingStudents(true);
    try {
      const sts = await studentsApi.getByGroup(groupId);
      setStudents(sts);
    } catch {
      toast.error('فشل تحميل الطلاب');
    } finally {
      setLoadingStudents(false);
    }
  };

  const handleStudentChange = async (studentId: string) => {
    setSelectedStudent(studentId);
    setReport(null);
    setHistory([]);
    if (!studentId || !selectedGroup) return;
    setLoading(true);
    try {
      const [rep, hist] = await Promise.all([
        attendanceApi.getStudentReport(studentId, selectedGroup),
        attendanceApi.getByStudent(studentId),
      ]);
      setReport(rep);
      setHistory(hist);
    } catch {
      toast.error('فشل تحميل بيانات الطالب');
    } finally {
      setLoading(false);
    }
  };

  const pct = report?.attendancePercentage ?? 0;
  const pctColor =
    pct >= 80 ? 'text-emerald-600'
    : pct >= 60 ? 'text-amber-500'
    : 'text-red-600';
  const barColor =
    pct >= 80 ? 'bg-emerald-500'
    : pct >= 60 ? 'bg-amber-400'
    : 'bg-red-400';

  return (
    <div className="space-y-4">
      {/* Selectors */}
      <div className="card">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="form-label">المجموعة <span className="text-red-500">*</span></label>
            <select
              className="form-select"
              value={selectedGroup}
              onChange={e => handleGroupChange(e.target.value)}
            >
              <option value="">-- اختر المجموعة --</option>
              {groups.map(g => (
                <option key={g.id} value={g.id}>{g.name} — {g.teacherName}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label">الطالب <span className="text-red-500">*</span></label>
            <div className="relative">
              <select
                className="form-select"
                value={selectedStudent}
                onChange={e => handleStudentChange(e.target.value)}
                disabled={!selectedGroup || loadingStudents}
              >
                <option value="">-- اختر الطالب --</option>
                {students.map(s => (
                  <option key={s.id} value={s.id}>{s.fullName}</option>
                ))}
              </select>
              {loadingStudents && (
                <span className="absolute left-3 top-1/2 -translate-y-1/2"><Spinner size="sm" /></span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="card flex items-center justify-center py-12 gap-3 text-slate-400">
          <Spinner size="lg" />
          <span className="text-sm">جاري تحميل بيانات الطالب...</span>
        </div>
      )}

      {/* Report */}
      {!loading && report && (
        <>
          {/* Overview */}
          <div className="card space-y-5">
            {/* Header row */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-slate-800">{report.studentName}</h3>
                <p className="text-xs text-slate-400 mt-0.5">{report.groupName}</p>
              </div>
              <div className="flex-shrink-0 text-left">
                <p className={`text-3xl font-extrabold leading-none ${pctColor}`}>
                  {Math.round(pct)}%
                </p>
                <p className="text-xs text-slate-400 mt-1">نسبة الحضور</p>
              </div>
            </div>

            {/* Attendance bar */}
            <ProgressBar value={pct} color={barColor} />

            {/* Low attendance alert */}
            {pct < 60 && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-100">
                <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-red-700">
                  نسبة حضور الطالب منخفضة جداً ({Math.round(pct)}%). يُنصح بالتواصل مع ولي الأمر.
                </p>
              </div>
            )}

            {/* Stat cards */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              <div className="col-span-2 sm:col-span-1 flex items-center gap-3 px-4 py-3 rounded-xl border bg-slate-50 border-slate-200">
                <Users className="h-4 w-4 text-slate-400" />
                <div>
                  <p className="text-lg font-bold leading-none text-slate-700">{report.totalLessons}</p>
                  <p className="text-xs mt-0.5 text-slate-400">إجمالي الحصص</p>
                </div>
              </div>
              <SummaryCard statusKey={AS.Present} count={report.presentCount} total={report.totalLessons} />
              <SummaryCard statusKey={AS.Late}    count={report.lateCount}    total={report.totalLessons} />
              <SummaryCard statusKey={AS.Absent}  count={report.absentCount}  total={report.totalLessons} />
              <SummaryCard statusKey={AS.Excused} count={report.excusedCount} total={report.totalLessons} />
            </div>
          </div>

          {/* History card */}
          <div className="card">
            {/* Sub-tab toggle */}
            <div className="flex items-center gap-1 mb-4 pb-3 border-b border-slate-100">
              <button
                onClick={() => setActiveView('bars')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeView === 'bars' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                <TrendingUp className="h-3.5 w-3.5" />
                توزيع الحضور
              </button>
              <button
                onClick={() => setActiveView('history')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeView === 'history' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                <ClipboardCheck className="h-3.5 w-3.5" />
                السجل الكامل {history.length > 0 && `(${history.length})`}
              </button>
            </div>

            {/* Bars view */}
            {activeView === 'bars' && (
              <div className="space-y-3">
                {[
                  { label: 'حاضر',  count: report.presentCount, color: 'bg-emerald-500' },
                  { label: 'متأخر', count: report.lateCount,    color: 'bg-amber-400'   },
                  { label: 'غائب',  count: report.absentCount,  color: 'bg-red-400'     },
                  { label: 'معذور', count: report.excusedCount, color: 'bg-blue-400'    },
                ].map(item => (
                  <div key={item.label} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">{item.label}</span>
                      <span className="font-semibold text-slate-700">
                        {item.count} حصة{' '}
                        ({report.totalLessons > 0 ? Math.round((item.count / report.totalLessons) * 100) : 0}%)
                      </span>
                    </div>
                    <ProgressBar
                      value={report.totalLessons > 0 ? (item.count / report.totalLessons) * 100 : 0}
                      color={item.color}
                    />
                  </div>
                ))}
              </div>
            )}

            {/* History view */}
            {activeView === 'history' && (
              history.length > 0 ? (
                <div className="space-y-1.5 max-h-72 overflow-y-auto">
                  {history.map((a, idx) => (
                    <div
                      key={a.id}
                      className={`flex items-center justify-between p-3 rounded-xl border ${
                        a.status === AS.Absent  ? 'bg-red-50/60 border-red-100'
                        : a.status === AS.Late  ? 'bg-amber-50/60 border-amber-100'
                        : a.status === AS.Excused ? 'bg-blue-50/60 border-blue-100'
                        : 'bg-white border-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-500 text-xs font-bold flex items-center justify-center flex-shrink-0">
                          {idx + 1}
                        </span>
                        <div>
                          <p className="text-xs font-medium text-slate-700">
                            {a.lessonTopic || 'حصة بدون موضوع'}
                          </p>
                          <p className="text-xs text-slate-400">{a.recordedAt ? formatDate(a.recordedAt) : '—'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {a.notes && (
                          <span className="text-xs text-slate-400 hidden sm:inline truncate max-w-[100px]">{a.notes}</span>
                        )}
                        <AttendanceBadge status={a.status} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState message="لا يوجد سجل حضور لهذا الطالب بعد" icon={<ClipboardCheck />} />
              )
            )}
          </div>
        </>
      )}

      {!loading && !report && selectedStudent && (
        <div className="card">
          <EmptyState message="لا توجد بيانات لهذا الطالب" icon={<UserSearch />} />
        </div>
      )}

      {!selectedGroup && (
        <div className="card py-12 text-center">
          <UserSearch className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">اختر مجموعة وطالباً لعرض تقرير الحضور</p>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'record',         label: 'تسجيل الحضور', icon: <ClipboardCheck className="h-4 w-4" /> },
  { id: 'lesson-summary', label: 'ملخص الحصة',   icon: <BarChart3 className="h-4 w-4" />      },
  { id: 'student-report', label: 'تقرير الطالب', icon: <UserSearch className="h-4 w-4" />     },
];

const TAB_SUBTITLES: Record<Tab, string> = {
  'record':         'سجّل حضور الطلاب على الحصص بسرعة ودقة',
  'lesson-summary': 'إحصائيات حضور حصة معينة مع تفاصيل الطلاب',
  'student-report': 'نسبة حضور الطالب وسجله الكامل في المجموعة',
};

export default function AttendancePage() {
  const [activeTab, setActiveTab] = useState<Tab>('record');
  const [groups, setGroups]       = useState<GroupDto[]>([]);

  useEffect(() => {
    groupsApi.getAll().then(setGroups).catch(() => {});
  }, []);

  return (
    <div className="space-y-4">
      <PageHeader
        title="الحضور والغياب"
        subtitle={TAB_SUBTITLES[activeTab]}
      />

      {/* Tab Bar */}
      <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl w-fit">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-150 ${
              activeTab === tab.id
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'record'         && <RecordTab         groups={groups} />}
      {activeTab === 'lesson-summary' && <LessonSummaryTab  groups={groups} />}
      {activeTab === 'student-report' && <StudentReportTab  groups={groups} />}
    </div>
  );
}