import apiClient from './client';
import type {
  LoginDto, LoginResponseDto, ChangePasswordDto, UserDto,
  AcademicYearDto, CreateAcademicYearDto, UpdateAcademicYearDto,
  BranchDto, CreateBranchDto, UpdateBranchDto,
  RoomDto, CreateRoomDto, UpdateRoomDto,
  SubjectDto, CreateSubjectDto, UpdateSubjectDto,
  TeacherDto, CreateTeacherDto, UpdateTeacherDto, TeacherSalaryDto, CreateTeacherPaymentDto,
  StudentListDto, StudentDetailsDto, CreateStudentDto, UpdateStudentDto, EnrollStudentDto,
  GroupDto, CreateGroupDto, UpdateGroupDto,
  LessonDto, CreateLessonDto, UpdateLessonDto,
  AttendanceDto, CreateAttendanceDto, UpdateAttendanceDto, BulkAttendanceDto, AttendanceReportDto, LessonAttendanceSummaryDto,
  ExamDto, CreateExamDto, UpdateExamDto, ExamResultDto, BulkExamResultDto,
  PaymentDto, CreatePaymentDto, UpdatePaymentDto, ExpenseCategoryDto, ExpenseDto, CreateExpenseDto, UpdateExpenseDto,
  DailyCashFlowDto, CashFlowSummaryDto,
  RoleDto, PermissionDto, CreateRoleDto, UpdateRoleDto, AssignPermissionsDto,
  SettingDto, CreateSettingDto, UpdateSettingDto,
  AuditLogDto, SeedAdminRequest, ApiResponse, PagedResult,
  TeacherPaymentItemDto,
  SchoolGradeDto, CreateSchoolGradeDto, UpdateSchoolGradeDto,
} from '../types';

// Helper
const getData = async <T>(promise: Promise<{ data: ApiResponse<T> }>): Promise<T> => {
  const res = await promise;
  if (!res.data.success) throw new Error(res.data.error || 'خطأ في الخادم');
  return res.data.data;
};

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authApi = {
  login: (dto: LoginDto) => getData<LoginResponseDto>(apiClient.post('/Auth/login', dto)),
  me: () => getData<UserDto>(apiClient.get('/Auth/me')),
  changePassword: (dto: ChangePasswordDto) => getData<boolean>(apiClient.put('/Auth/change-password', dto)),
};

// ── Seed ──────────────────────────────────────────────────────────────────────
export const seedApi = {
  seedAdmin: (dto: SeedAdminRequest) => getData<UserDto>(apiClient.post('/Seed/admin', dto)),
};

// ── Academic Years ────────────────────────────────────────────────────────────
export const academicYearsApi = {
  getAll: () => getData<AcademicYearDto[]>(apiClient.get('/AcademicYears')),
  getById: (id: string) => getData<AcademicYearDto>(apiClient.get(`/AcademicYears/${id}`)),
  search: (keyword: string) => getData<AcademicYearDto[]>(apiClient.get('/AcademicYears/search', { params: { keyword } })),
  create: (dto: CreateAcademicYearDto) => getData<AcademicYearDto>(apiClient.post('/AcademicYears', dto)),
  update: (id: string, dto: UpdateAcademicYearDto) => getData<AcademicYearDto>(apiClient.put(`/AcademicYears/${id}`, dto)),
  delete: (id: string) => getData<boolean>(apiClient.delete(`/AcademicYears/${id}`)),
};

// ── Branches ──────────────────────────────────────────────────────────────────
export const branchesApi = {
  getAll: () => getData<BranchDto[]>(apiClient.get('/Branches')),
  getById: (id: string) => getData<BranchDto>(apiClient.get(`/Branches/${id}`)),
  search: (keyword: string) => getData<BranchDto[]>(apiClient.get('/Branches/search', { params: { keyword } })),
  create: (dto: CreateBranchDto) => getData<BranchDto>(apiClient.post('/Branches', dto)),
  update: (id: string, dto: UpdateBranchDto) => getData<BranchDto>(apiClient.put(`/Branches/${id}`, dto)),
  delete: (id: string) => getData<boolean>(apiClient.delete(`/Branches/${id}`)),
};

// ── Rooms ─────────────────────────────────────────────────────────────────────
export const roomsApi = {
  getAll: () => getData<RoomDto[]>(apiClient.get('/Rooms')),
  getById: (id: string) => getData<RoomDto>(apiClient.get(`/Rooms/${id}`)),
  search: (keyword: string) => getData<RoomDto[]>(apiClient.get('/Rooms/search', { params: { keyword } })),
  create: (dto: CreateRoomDto) => getData<RoomDto>(apiClient.post('/Rooms', dto)),
  update: (id: string, dto: UpdateRoomDto) => getData<RoomDto>(apiClient.put(`/Rooms/${id}`, dto)),
  delete: (id: string) => getData<boolean>(apiClient.delete(`/Rooms/${id}`)),
};

// ── School Grades ─────────────────────────────────────────────────────────────
export const schoolGradesApi = {
  getAll: () => getData<SchoolGradeDto[]>(apiClient.get('/SchoolGrades')),
  getById: (id: string) => getData<SchoolGradeDto>(apiClient.get(`/SchoolGrades/${id}`)),
  create: (dto: CreateSchoolGradeDto) => getData<SchoolGradeDto>(apiClient.post('/SchoolGrades', dto)),
  update: (id: string, dto: UpdateSchoolGradeDto) => getData<SchoolGradeDto>(apiClient.put(`/SchoolGrades/${id}`, dto)),
  delete: (id: string) => getData<boolean>(apiClient.delete(`/SchoolGrades/${id}`)),
};

// ── Subjects ──────────────────────────────────────────────────────────────────
export const subjectsApi = {
  getAll: () => getData<SubjectDto[]>(apiClient.get('/Subjects')),
  getById: (id: string) => getData<SubjectDto>(apiClient.get(`/Subjects/${id}`)),
  getByGrade: (schoolGradeId: string) => getData<SubjectDto[]>(apiClient.get(`/Subjects/by-grade/${schoolGradeId}`)),
  create: (dto: CreateSubjectDto) => getData<SubjectDto>(apiClient.post('/Subjects', dto)),
  update: (id: string, dto: UpdateSubjectDto) => getData<SubjectDto>(apiClient.put(`/Subjects/${id}`, dto)),
  delete: (id: string) => getData<boolean>(apiClient.delete(`/Subjects/${id}`)),
};

// ── Teachers ──────────────────────────────────────────────────────────────────
export const teachersApi = {
  getPaged: (pageNumber: number, pageSize: number, search?: string, activeOnly = true) =>
    getData<PagedResult<TeacherDto>>(apiClient.get('/Teachers', { params: { pageNumber, pageSize, search, activeOnly } })),
  getAll: () => getData<TeacherDto[]>(apiClient.get('/Teachers/all')),
  getById: (id: string) => getData<TeacherDto>(apiClient.get(`/Teachers/${id}`)),
  getGroups: (id: string) => getData<GroupDto[]>(apiClient.get(`/Teachers/${id}/groups`)),
  getSalary: (id: string) => getData<TeacherSalaryDto>(apiClient.get(`/Teachers/${id}/salary`)),
  getBalance: (id: string) => getData<number>(apiClient.get(`/Teachers/${id}/balance`)),
  create: (dto: CreateTeacherDto) => getData<TeacherDto>(apiClient.post('/Teachers', dto)),
  update: (id: string, dto: UpdateTeacherDto) => getData<TeacherDto>(apiClient.put(`/Teachers/${id}`, dto)),
  delete: (id: string) => getData<boolean>(apiClient.delete(`/Teachers/${id}`)),
  paySalary: (dto: CreateTeacherPaymentDto) => getData<TeacherPaymentItemDto>(apiClient.post('/Teachers/pay-salary', dto)),
};
// ── Students ──────────────────────────────────────────────────────────────────
export const studentsApi = {
  getPaged: (pageNumber: number, pageSize: number, search?: string, schoolGradeId?: string) =>
    getData<PagedResult<StudentListDto>>(apiClient.get('/Students', { params: { pageNumber, pageSize, search, schoolGradeId } })),

  getAll: () => getData<StudentListDto[]>(apiClient.get('/Students/all')),

  getById: (id: string) => getData<StudentDetailsDto>(apiClient.get(`/Students/${id}`)),

  // backend endpoint:
  // GET /api/v1/Groups/{id}/students
  getByGroup: (groupId: string) =>
    getData<StudentListDto[]>(apiClient.get(`/Groups/${groupId}/students`)),

  create: (dto: CreateStudentDto) => getData<StudentDetailsDto>(apiClient.post('/Students', dto)),
  update: (id: string, dto: UpdateStudentDto) => getData<StudentDetailsDto>(apiClient.put(`/Students/${id}`, dto)),
  delete: (id: string) => getData<boolean>(apiClient.delete(`/Students/${id}`)),
};

// ── Groups ────────────────────────────────────────────────────────────────────
export const groupsApi = {
  getPaged: (
    pageNumber: number,
    pageSize: number,
    teacherId?: string,
    branchId?: string,
    academicYearId?: string,
    activeOnly = true
  ) =>
    getData<PagedResult<GroupDto>>(
      apiClient.get('/Groups', { params: { pageNumber, pageSize, teacherId, branchId, academicYearId, activeOnly } })
    ),

  getAll: () => getData<GroupDto[]>(apiClient.get('/Groups/all')),
  getById: (id: string) => getData<GroupDto>(apiClient.get(`/Groups/${id}`)),
  getByTeacher: (teacherId: string) => getData<GroupDto[]>(apiClient.get(`/Groups/by-teacher/${teacherId}`)),

  // same endpoint, exposed here for the group view
  getEnrolledStudents: (id: string) => getData<StudentListDto[]>(apiClient.get(`/Groups/${id}/students`)),

  create: (dto: CreateGroupDto) => getData<GroupDto>(apiClient.post('/Groups', dto)),
  enroll: (dto: EnrollStudentDto) => getData<string>(apiClient.post('/Groups/enroll', dto)),
  unenroll: (groupId: string, studentId: string) =>
    getData<boolean>(apiClient.delete(`/Groups/${groupId}/students/${studentId}`)),
  update: (id: string, dto: UpdateGroupDto) => getData<GroupDto>(apiClient.put(`/Groups/${id}`, dto)),
  delete: (id: string) => getData<boolean>(apiClient.delete(`/Groups/${id}`)),
};

// ── Lessons ───────────────────────────────────────────────────────────────────
export const lessonsApi = {
  getById: (id: string) => getData<LessonDto>(apiClient.get(`/Lessons/${id}`)),
  getByGroup: (groupId: string) => getData<LessonDto[]>(apiClient.get(`/Lessons/by-group/${groupId}`)),
  getByDateRange: (from: string, to: string) => getData<LessonDto[]>(apiClient.get('/Lessons/by-date', { params: { from, to } })),
  create: (dto: CreateLessonDto) => getData<LessonDto>(apiClient.post('/Lessons', dto)),
  update: (id: string, dto: UpdateLessonDto) => getData<LessonDto>(apiClient.put(`/Lessons/${id}`, dto)),
  delete: (id: string) => getData<boolean>(apiClient.delete(`/Lessons/${id}`)),
};

// ── Attendance ────────────────────────────────────────────────────────────────
export const attendanceApi = {
  getByLesson: (lessonId: string) => getData<AttendanceDto[]>(apiClient.get(`/Attendance/by-lesson/${lessonId}`)),
  getByStudent: (studentId: string) => getData<AttendanceDto[]>(apiClient.get(`/Attendance/by-student/${studentId}`)),
  getStudentReport: (studentId: string, groupId: string) =>
    getData<AttendanceReportDto>(apiClient.get(`/Attendance/report/student/${studentId}/group/${groupId}`)),
  getLessonSummary: (lessonId: string) => getData<LessonAttendanceSummaryDto>(apiClient.get(`/Attendance/summary/lesson/${lessonId}`)),
  record: (dto: CreateAttendanceDto) => getData<AttendanceDto>(apiClient.post('/Attendance', dto)),
  recordBulk: (dto: BulkAttendanceDto) => getData<boolean>(apiClient.post('/Attendance/bulk', dto)),
  update: (id: string, dto: UpdateAttendanceDto) => getData<AttendanceDto>(apiClient.put(`/Attendance/${id}`, dto)),
};

// ── Exams ─────────────────────────────────────────────────────────────────────
export const examsApi = {
  getPaged: (pageNumber: number, pageSize: number, groupId?: string, activeOnly = true) =>
    getData<PagedResult<ExamDto>>(apiClient.get('/Exams', { params: { pageNumber, pageSize, groupId, activeOnly } })),
  getById: (id: string) => getData<ExamDto>(apiClient.get(`/Exams/${id}`)),
  getByGroup: (groupId: string) => getData<ExamDto[]>(apiClient.get(`/Exams/by-group/${groupId}`)),
  create: (dto: CreateExamDto) => getData<ExamDto>(apiClient.post('/Exams', dto)),
  update: (id: string, dto: UpdateExamDto) => getData<ExamDto>(apiClient.put(`/Exams/${id}`, dto)),
  delete: (id: string) => getData<boolean>(apiClient.delete(`/Exams/${id}`)),
  recordResult: (dto: ExamResultDto) => getData<ExamResultDto>(apiClient.post('/Exams/result', dto)),
  recordBulkResults: (dto: BulkExamResultDto) => getData<boolean>(apiClient.post('/Exams/results/bulk', dto)),
};

// ── Payments ──────────────────────────────────────────────────────────────────
export const paymentsApi = {
  getPaged: (pageNumber: number, pageSize: number, studentId?: string, groupId?: string, from?: string, to?: string) =>
    getData<PagedResult<PaymentDto>>(
      apiClient.get('/Payments', { params: { pageNumber, pageSize, studentId, groupId, from, to } })
    ),
  getById: (id: string) => getData<PaymentDto>(apiClient.get(`/Payments/${id}`)),
  create: (dto: CreatePaymentDto) => getData<PaymentDto>(apiClient.post('/Payments', dto)),
  update: (id: string, dto: UpdatePaymentDto) => getData<PaymentDto>(apiClient.put(`/Payments/${id}`, dto)),
  delete: (id: string) => getData<boolean>(apiClient.delete(`/Payments/${id}`)),
};

// ── Expenses ──────────────────────────────────────────────────────────────────
export const expenseCategoriesApi = {
  getAll: () => getData<ExpenseCategoryDto[]>(apiClient.get('/ExpenseCategories')),
  create: (dto: CreateExpenseDto) => getData<ExpenseCategoryDto>(apiClient.post('/ExpenseCategories', dto)),
  update: (id: string, dto: UpdateExpenseDto) => getData<ExpenseCategoryDto>(apiClient.put(`/ExpenseCategories/${id}`, dto)),
  delete: (id: string) => getData<boolean>(apiClient.delete(`/ExpenseCategories/${id}`)),
};

export const expensesApi = {
  getPaged: (pageNumber: number, pageSize: number, categoryId?: string, from?: string, to?: string) =>
    getData<PagedResult<ExpenseDto>>(apiClient.get('/Expenses', { params: { pageNumber, pageSize, categoryId, from, to } })),
  getById: (id: string) => getData<ExpenseDto>(apiClient.get(`/Expenses/${id}`)),
  create: (dto: CreateExpenseDto) => getData<ExpenseDto>(apiClient.post('/Expenses', dto)),
  update: (id: string, dto: UpdateExpenseDto) => getData<ExpenseDto>(apiClient.put(`/Expenses/${id}`, dto)),
  delete: (id: string) => getData<boolean>(apiClient.delete(`/Expenses/${id}`)),
};

// ── Cash Flow ─────────────────────────────────────────────────────────────────
export const cashFlowApi = {
  getDaily: (date: string) => getData<DailyCashFlowDto>(apiClient.get('/CashFlow/daily', { params: { date } })),
  getSummary: (from: string, to: string) => getData<CashFlowSummaryDto>(apiClient.get('/CashFlow/summary', { params: { from, to } })),
};


export const permissionsApi = {
  getAll: () => getData<PermissionDto[]>(apiClient.get('/Permissions')),
};


export const auditLogsApi = {
  getPaged: (pageNumber: number, pageSize: number, userId?: string, action?: string, from?: string, to?: string) =>
    getData<PagedResult<AuditLogDto>>(
      apiClient.get('/AuditLogs', { params: { pageNumber, pageSize, userId, action, from, to } })
    ),
};



// ── Finance ───────────────────────────────────────────────────────────────────
export const financeApi = {
  getPayments: (pageNumber: number, pageSize: number, from?: string, to?: string, groupId?: string) =>
    getData<PagedResult<PaymentDto>>(apiClient.get('/Finance/payments', { params: { pageNumber, pageSize, from, to, groupId } })),
  getPaymentsByStudent: (studentId: string) => getData<PaymentDto[]>(apiClient.get(`/Finance/payments/by-student/${studentId}`)),
  getPaymentById: (id: string) => getData<PaymentDto>(apiClient.get(`/Finance/payments/${id}`)),
  createPayment: (dto: CreatePaymentDto) => getData<PaymentDto>(apiClient.post('/Finance/payments', dto)),
  updatePayment: (id: string, dto: UpdatePaymentDto) => getData<PaymentDto>(apiClient.put(`/Finance/payments/${id}`, dto)),
  getExpenses: (pageNumber: number, pageSize: number, from?: string, to?: string, categoryId?: string) =>
    getData<PagedResult<ExpenseDto>>(apiClient.get('/Finance/expenses', { params: { pageNumber, pageSize, from, to, categoryId } })),
  getExpenseById: (id: string) => getData<ExpenseDto>(apiClient.get(`/Finance/expenses/${id}`)),
  createExpense: (dto: CreateExpenseDto) => getData<ExpenseDto>(apiClient.post('/Finance/expenses', dto)),
  updateExpense: (id: string, dto: UpdateExpenseDto) => getData<ExpenseDto>(apiClient.put(`/Finance/expenses/${id}`, dto)),
  deleteExpense: (id: string) => getData<boolean>(apiClient.delete(`/Finance/expenses/${id}`)),
  getExpenseCategories: () => getData<ExpenseCategoryDto[]>(apiClient.get('/Finance/expense-categories')),
  getDailyCashFlow: (date: string) => getData<DailyCashFlowDto>(apiClient.get('/Finance/reports/daily-cashflow', { params: { date } })),
  getCashFlowSummary: (from: string, to: string) => getData<CashFlowSummaryDto>(apiClient.get('/Finance/reports/cashflow-summary', { params: { from, to } })),
};

// ── Roles ─────────────────────────────────────────────────────────────────────
export const rolesApi = {
  getAll: () => getData<RoleDto[]>(apiClient.get('/Roles')),
  getById: (id: string) => getData<RoleDto>(apiClient.get(`/Roles/${id}`)),
  getPermissions: () => getData<PermissionDto[]>(apiClient.get('/Roles/permissions')),
  create: (dto: CreateRoleDto) => getData<RoleDto>(apiClient.post('/Roles', dto)),
  update: (id: string, dto: UpdateRoleDto) => getData<RoleDto>(apiClient.put(`/Roles/${id}`, dto)),
  assignPermissions: (id: string, dto: AssignPermissionsDto) => getData<boolean>(apiClient.post(`/Roles/${id}/permissions`, dto)),
  delete: (id: string) => getData<boolean>(apiClient.delete(`/Roles/${id}`)),
};

// ── Users ─────────────────────────────────────────────────────────────────────
export const usersApi = {
  getPaged: (pageNumber: number, pageSize: number, search?: string) =>
    getData<PagedResult<UserDto>>(apiClient.get('/Users', { params: { pageNumber, pageSize, search } })),
  getAll: () => getData<UserDto[]>(apiClient.get('/Users/all')),
  getById: (id: string) => getData<UserDto>(apiClient.get(`/Users/${id}`)),
  create: (dto: import('../types').CreateUserDto) => getData<UserDto>(apiClient.post('/Users', dto)),
  update: (id: string, dto: import('../types').UpdateUserDto) => getData<UserDto>(apiClient.put(`/Users/${id}`, dto)),
  changePassword: (id: string, dto: ChangePasswordDto) => getData<boolean>(apiClient.put(`/Users/${id}/change-password`, dto)),
  delete: (id: string) => getData<boolean>(apiClient.delete(`/Users/${id}`)),
};

// ── Settings ──────────────────────────────────────────────────────────────────
export const settingsApi = {
  getAll: () => getData<SettingDto[]>(apiClient.get('/Settings')),
  getByKey: (key: string) => getData<SettingDto>(apiClient.get(`/Settings/${key}`)),
  create: (dto: CreateSettingDto) => getData<SettingDto>(apiClient.post('/Settings', dto)),
  update: (key: string, dto: UpdateSettingDto) => getData<SettingDto>(apiClient.put(`/Settings/${key}`, dto)),
};

// ── Audit ─────────────────────────────────────────────────────────────────────
export const auditApi = {
  getPaged: (pageNumber: number, pageSize: number, userId?: string, entityName?: string, from?: string, to?: string) =>
    getData<PagedResult<AuditLogDto>>(apiClient.get('/Audit', { params: { pageNumber, pageSize, userId, entityName, from, to } })),
  getByEntity: (entityName: string, entityId: string) =>
    getData<AuditLogDto[]>(apiClient.get(`/Audit/by-entity/${entityName}/${entityId}`)),
};