import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  Plus,
  Pencil,
  Trash2,
  FileQuestion,
  ClipboardList,
} from 'lucide-react';

import {
  examsApi,
  groupsApi,
  subjectsApi,
} from '../../api/services';

import type {
  ExamDto,
  CreateExamDto,
  UpdateExamDto,
  GroupDto,
  SubjectDto,
  ExamResultDto,
} from '../../types';

import {
  formatDate,
  today,
} from '../../utils/date';

import {
  PageHeader,
  ConfirmDelete,
  SkeletonRow,
  EmptyState,
  ErrorState,
} from '../../components/common';

export default function ExamsPage() {
  const [groups, setGroups] = useState<GroupDto[]>([]);
  const [subjects, setSubjects] = useState<SubjectDto[]>([]);

  const [selectedGroup, setSelectedGroup] = useState('');

  const [exams, setExams] = useState<ExamDto[]>([]);

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState('');

  const [, setSelected] =
    useState<ExamDto | null>(null);

  const [deleteTarget, setDeleteTarget] =
    useState<ExamDto | null>(null);

  const [, setResults] = useState<
    ExamResultDto[]
  >([]);

  const [, setResultMarks] =
    useState<Record<string, string>>({});

  const [deleting, setDeleting] = useState(false);

  const EMPTY: CreateExamDto = {
    title: '',
    groupId: '',
    subjectId: '',
    examDate: today(),
    totalMarks: 100,
    passingMarks: 50,
  };

  const [, setFormCreate] =
    useState<CreateExamDto>(EMPTY);

  const [, setFormUpdate] =
    useState<UpdateExamDto | null>(null);

  useEffect(() => {
    Promise.allSettled([
      groupsApi.getAll(),
      subjectsApi.getAll(),
    ]).then(([g, s]) => {
      if (g.status === 'fulfilled') {
        setGroups(g.value);
      }

      if (s.status === 'fulfilled') {
        setSubjects(s.value);
      }
    });
  }, []);

  const loadExams = useCallback(async () => {
    if (!selectedGroup) return;

    setLoading(true);

    setError('');

    try {
      const data =
        await examsApi.getByGroup(selectedGroup);

      setExams(data);
    } catch {
      setError('فشل تحميل الامتحانات');
    } finally {
      setLoading(false);
    }
  }, [selectedGroup]);

  useEffect(() => {
    loadExams();
  }, [loadExams]);

  const openCreate = () => {
    setFormCreate({
      ...EMPTY,
      groupId: selectedGroup,
      subjectId: subjects[0]?.id || '',
    });

    toast('واجهة الإضافة غير مفعلة حالياً');
  };

  const openEdit = (item: ExamDto) => {
    setSelected(item);

    setFormUpdate({
      title: item.title,
      examDate: item.examDate,
      totalMarks: item.totalMarks,
      passingMarks: item.passingMarks,
    });

    toast('واجهة التعديل غير مفعلة حالياً');
  };

  const openResults = async (item: ExamDto) => {
    setSelected(item);

    try {
      const res = await examsApi.getResults(
        item.id
      );

      setResults(res);

      const marks: Record<string, string> = {};

      res.forEach((r: ExamResultDto) => {
        marks[r.studentId] = String(
          r.marksObtained
        );
      });

      setResultMarks(marks);

      toast.success('تم تحميل النتائج');
    } catch {
      toast.error('فشل تحميل النتائج');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    setDeleting(true);

    try {
      await examsApi.delete(deleteTarget.id);

      toast.success('تم الحذف');

      setDeleteTarget(null);

      await loadExams();
    } catch (e: any) {
      toast.error(e?.message || 'حدث خطأ');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="الامتحانات"
        subtitle="إدارة الامتحانات والنتائج"
      />

      <div className="card mb-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px]">
            <label className="form-label">
              اختر المجموعة
            </label>

            <select
              className="form-select"
              value={selectedGroup}
              onChange={(e) =>
                setSelectedGroup(e.target.value)
              }
            >
              <option value="">
                -- اختر المجموعة --
              </option>

              {groups.map((g) => (
                <option
                  key={g.id}
                  value={g.id}
                >
                  {g.name} — {g.teacherName}
                </option>
              ))}
            </select>
          </div>

          {selectedGroup && (
            <button
              onClick={openCreate}
              className="btn-primary"
            >
              <Plus className="h-4 w-4" />
              إضافة امتحان
            </button>
          )}
        </div>
      </div>

      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="table-header">
                  عنوان الامتحان
                </th>

                <th className="table-header">
                  المادة
                </th>

                <th className="table-header">
                  تاريخ الامتحان
                </th>

                <th className="table-header">
                  الدرجة الكاملة
                </th>

                <th className="table-header">
                  درجة النجاح
                </th>

                <th className="table-header">
                  إجراءات
                </th>
              </tr>
            </thead>

            <tbody>
              {loading &&
                [1, 2, 3].map((i) => (
                  <SkeletonRow
                    key={i}
                    cols={6}
                  />
                ))}

              {!loading && error && (
                <ErrorState
                  message={error}
                  onRetry={loadExams}
                />
              )}

              {!loading &&
                !error &&
                exams.length === 0 && (
                  <EmptyState
                    message={
                      selectedGroup
                        ? 'لا توجد امتحانات لهذه المجموعة'
                        : 'اختر مجموعة لعرض الامتحانات'
                    }
                    icon={<FileQuestion />}
                  />
                )}

              {!loading &&
                !error &&
                exams.map((item) => (
                  <tr
                    key={item.id}
                    className="table-row"
                  >
                    <td className="table-cell font-semibold text-slate-800">
                      {item.title}
                    </td>

                    <td className="table-cell">
                      {item.subjectName}
                    </td>

                    <td className="table-cell">
                      {formatDate(
                        item.examDate
                      )}
                    </td>

                    <td className="table-cell">
                      {item.totalMarks}
                    </td>

                    <td className="table-cell">
                      {item.passingMarks}
                    </td>

                    <td className="table-cell">
                      <div className="flex gap-1">
                        <button
                          onClick={() =>
                            openResults(item)
                          }
                          className="p-1.5 rounded-lg hover:bg-violet-50 text-violet-600"
                          title="النتائج"
                        >
                          <ClipboardList className="h-4 w-4" />
                        </button>

                        <button
                          onClick={() =>
                            openEdit(item)
                          }
                          className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>

                        <button
                          onClick={() =>
                            setDeleteTarget(item)
                          }
                          className="p-1.5 rounded-lg hover:bg-red-50 text-red-600"
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

      <ConfirmDelete
        isOpen={!!deleteTarget}
        itemName={deleteTarget?.title}
        onConfirm={handleDelete}
        onCancel={() =>
          setDeleteTarget(null)
        }
        isLoading={deleting}
      />
    </div>
  );
}