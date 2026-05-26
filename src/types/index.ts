// DateOnly type alias — always sent/received as "YYYY-MM-DD"
export type DateOnly = string;
// DateTime fields also formatted as "YYYY-MM-DD" after backend change
export type DateTimeStr = string;

// ── Enums ─────────────────────────────────────────────────────────────────────
export const GenderType = { Male: 0, Female: 1 } as const; export type GenderType = typeof GenderType[keyof typeof GenderType];
export const UserStatus = { Active: 0, Inactive: 1, Suspended: 2 } as const; export type UserStatus = typeof UserStatus[keyof typeof UserStatus];
export const AttendanceStatus = { Present: 0, Absent: 1, Late: 2, Excused: 3 } as const; export type AttendanceStatus = typeof AttendanceStatus[keyof typeof AttendanceStatus];
export const PaymentMethod = { Cash: 0, BankTransfer: 1, Card: 2, InstaPay: 3 } as const; export type PaymentMethod = typeof PaymentMethod[keyof typeof PaymentMethod];
export const PaymentStatus = { Paid: 0, Pending: 1, PartiallyPaid: 2, Refunded: 3 } as const; export type PaymentStatus = typeof PaymentStatus[keyof typeof PaymentStatus];
export const SalaryType = { Monthly: 0, PerLesson: 1, Bonus: 2, Advance: 3 } as const; export type SalaryType = typeof SalaryType[keyof typeof SalaryType];
export const ActionType = { Create: 0, Update: 1, Delete: 2, Login: 3, Logout: 4 } as const; export type ActionType = typeof ActionType[keyof typeof ActionType];

// ── API Response ──────────────────────────────────────────────────────────────
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}
export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
}

// ── Auth ──────────────────────────────────────────────────────────────────────
export interface LoginDto { username: string; password: string; }
export interface ChangePasswordDto { currentPassword: string; newPassword: string; confirmPassword: string; }
export interface LoginResponseDto {
  token: string;
  refreshToken: string;
  expiresAt: DateOnly;
  user: UserDto;
}

// ── User ──────────────────────────────────────────────────────────────────────
export interface UserDto {
  id: string; fullName: string; username: string; email?: string; phone?: string;
  status: UserStatus; statusLabel: string; roles: string[];
  createdAt: DateOnly; lastLoginAt?: DateOnly;
}
export interface CreateUserDto {
  fullName: string; username: string; password: string;
  email?: string; phone?: string; roleIds: string[];
}
export interface UpdateUserDto {
  fullName: string; email?: string; phone?: string;
  status: UserStatus; roleIds: string[];
}

// ── Seed ──────────────────────────────────────────────────────────────────────
export interface SeedAdminRequest {
  fullName: string; username: string; password: string;
  email?: string; phone?: string; roleIds?: string[];
}

// ── Academic Year ─────────────────────────────────────────────────────────────
export interface AcademicYearDto {
  id: string; name: string;
  startDate: DateOnly; endDate: DateOnly; isActive: boolean;
}
export interface CreateAcademicYearDto {
  name: string; startDate: DateOnly; endDate: DateOnly; isActive: boolean;
}
export interface UpdateAcademicYearDto {
  id: string; name: string; startDate: DateOnly; endDate: DateOnly; isActive: boolean;
}

// ── Branch ────────────────────────────────────────────────────────────────────
export interface BranchDto {
  id: string; name: string; address: string; phone: string; isActive: boolean;
}
export interface CreateBranchDto { name: string; address: string; phone: string; isActive: boolean; }
export interface UpdateBranchDto { id: string; name: string; address: string; phone: string; isActive: boolean; }

// ── Room ──────────────────────────────────────────────────────────────────────
export interface RoomDto {
  id: string; name: string; branchId: string; branchName: string;
  capacity: number; isActive: boolean;
}
export interface CreateRoomDto { name: string; branchId: string; capacity: number; isActive: boolean; }
export interface UpdateRoomDto { id: string; name: string; branchId: string; capacity: number; isActive: boolean; }

// ── Subject ───────────────────────────────────────────────────────────────────
export interface SubjectDto {
  id: string; name: string; schoolGradeId: string; schoolGradeName: string; description?: string;
}
export interface CreateSubjectDto { name: string; schoolGradeId: string; description?: string; }
export interface UpdateSubjectDto { name: string; schoolGradeId: string; description?: string; }

// ── Teacher ───────────────────────────────────────────────────────────────────
export interface TeacherDto {
  id: string; fullName: string; phone: string; email?: string; specialization?: string;
  isActive: boolean; activeGroupsCount: number; joinedAt: DateOnly;
}
export interface CreateTeacherDto {
  fullName: string; phone: string; email?: string; specialization?: string; nationalId?: string;
}
export interface UpdateTeacherDto {
  fullName: string; phone: string; email?: string; specialization?: string;
  nationalId?: string; isActive: boolean;
}
export interface TeacherSalaryDto {
  teacherId: string; teacherName: string; currentBalance: number;
  payments: TeacherPaymentItemDto[]; totalPaid: number;
}
export interface TeacherPaymentItemDto {
  id: string; amount: number; salaryType: SalaryType; salaryTypeLabel: string;
  method: PaymentMethod; methodLabel: string; paymentDate: DateOnly; notes?: string;
}
export interface CreateTeacherPaymentDto {
  teacherId: string; amount: number; salaryType: SalaryType;
  method: PaymentMethod; paymentDate: DateOnly; notes?: string;
}

// ── Student ───────────────────────────────────────────────────────────────────
export interface StudentListDto {
  id: string; fullName: string; phone?: string; schoolGrade: string;
  activeGroupsCount: number; status: UserStatus; statusLabel: string; createdAt: DateOnly;
}
export interface StudentDetailsDto {
  id: string; fullName: string; phone?: string; email?: string;
  dateOfBirth: DateOnly; age: number;
  schoolGradeId: string; schoolGrade: string; address?: string; nationalId?: string;
  status: UserStatus; statusLabel: string; createdAt: DateOnly;
  parent?: ParentDto;
  activeGroups: GroupDto[];
  recentPayments: PaymentDto[];
  attendanceSummary: AttendanceReportDto[];
}
export interface CreateStudentDto {
  fullName: string; phone?: string; email?: string;
  dateOfBirth: DateOnly;        // YYYY-MM-DD
  schoolGradeId: string; parentId?: string; address?: string; nationalId?: string;
}
export interface UpdateStudentDto {
  fullName: string; phone?: string; email?: string;
  dateOfBirth: DateOnly;        // YYYY-MM-DD
  schoolGradeId: string; parentId?: string; address?: string; nationalId?: string;
  status: UserStatus;
}
export interface EnrollStudentDto { studentId: string; groupId: string; }

// ── Parent ────────────────────────────────────────────────────────────────────
export interface ParentDto {
  id: string; fullName: string; phone: string; alternativePhone?: string;
  email?: string; nationalId?: string; studentNames: string[];
}
export interface CreateParentDto {
  fullName: string; phone: string; alternativePhone?: string; email?: string; nationalId?: string;
}
export interface UpdateParentDto {
  fullName: string; phone: string; alternativePhone?: string; email?: string; nationalId?: string;
}

// ── Group ─────────────────────────────────────────────────────────────────────
export interface GroupDto {
  id: string; name: string;
  academicYearId: string; academicYearName: string;
  branchId: string; branchName: string;
  subjectId: string; subjectName: string;
  teacherId: string; teacherName: string;
  maxCapacity: number; currentEnrollment: number; fees: number; isActive: boolean;
}
export interface CreateGroupDto {
  name: string; academicYearId: string; branchId: string;
  subjectId: string; teacherId: string; maxCapacity: number; fees: number;
}
export interface UpdateGroupDto {
  name: string; branchId: string; teacherId: string;
  maxCapacity: number; fees: number; isActive: boolean;
}

// ── Lesson ────────────────────────────────────────────────────────────────────
export interface LessonDto {
  id: string; groupId: string; groupName: string; roomId: string; roomName: string;
  startTime: DateOnly; endTime: DateOnly; topic?: string; notes?: string;
}
export interface CreateLessonDto {
  groupId: string; roomId: string;
  startTime: DateOnly; endTime: DateOnly;   // YYYY-MM-DD
  topic?: string; notes?: string;
}
export interface UpdateLessonDto {
  roomId: string;
  startTime: DateOnly; endTime: DateOnly;   // YYYY-MM-DD
  topic?: string; notes?: string;
}

// ── Attendance ────────────────────────────────────────────────────────────────
export interface AttendanceDto {
  id: string; studentId: string; studentName: string;
  lessonId: string; lessonTopic: string;
  status: AttendanceStatus; statusLabel: string; recordedAt: DateOnly; notes?: string;
}
export interface CreateAttendanceDto {
  studentId: string; lessonId: string; status: AttendanceStatus; notes?: string;
}
export interface UpdateAttendanceDto { status: AttendanceStatus; notes?: string; }
export interface BulkAttendanceDto {
  lessonId: string; entries: StudentAttendanceItemDto[];
}
export interface StudentAttendanceItemDto {
  studentId: string; status: AttendanceStatus; notes?: string;
}
export interface AttendanceReportDto {
  studentId: string; studentName: string; groupId: string; groupName: string;
  totalLessons: number; presentCount: number; absentCount: number;
  lateCount: number; excusedCount: number; attendancePercentage: number;
}
export interface LessonAttendanceSummaryDto {
  lessonId: string; lessonTopic: string; lessonDate: DateOnly;
  totalStudents: number; presentCount: number; absentCount: number;
  details: AttendanceDto[];
}

// ── School Grade ──────────────────────────────────────────────────────────────
export interface SchoolGradeDto {
  id: string;
  name: string;
  order: number;
  studentCount: number;
  subjectCount: number;
}
export interface CreateSchoolGradeDto { name: string; order: number; }
export interface UpdateSchoolGradeDto { name: string; order: number; }

// ── Exam ──────────────────────────────────────────────────────────────────────
export interface ExamDto {
  id: string; title: string; groupId: string; groupName: string;
  subjectId: string; subjectName: string;
  examDate: DateOnly; totalMarks: number; passingMarks: number;
}
export interface CreateExamDto {
  title: string; groupId: string; subjectId: string;
  examDate: DateOnly;    // YYYY-MM-DD
  totalMarks: number; passingMarks: number;
}
export interface UpdateExamDto {
  title: string;
  examDate: DateOnly;    // YYYY-MM-DD
  totalMarks: number; passingMarks: number;
}
export interface ExamResultDto {
  id: string; examId: string; examTitle: string;
  studentId: string; studentName: string;
  marksObtained: number; totalMarks: number; percentage: number;
  grade?: string; passed: boolean; notes?: string;
}
export interface CreateExamResultDto {
  examId: string; studentId: string; marksObtained: number; notes?: string;
}
export interface BulkExamResultDto { examId: string; results: StudentResultItemDto[]; }
export interface StudentResultItemDto { studentId: string; marksObtained: number; notes?: string; }

// ── Finance ───────────────────────────────────────────────────────────────────
export interface PaymentDto {
  id: string; studentId: string; studentName: string; groupId: string; groupName: string;
  amount: number; discount?: number; netAmount: number;
  method: PaymentMethod; methodLabel: string;
  status: PaymentStatus; statusLabel: string;
  paymentDate: DateOnly; collectedBy: string; notes?: string;
}
export interface CreatePaymentDto {
  studentId: string; groupId: string; amount: number; discount?: number;
  method: PaymentMethod; status: PaymentStatus;
  paymentDate: DateOnly;    // YYYY-MM-DD
  notes?: string;
}
export interface UpdatePaymentDto {
  amount: number; discount?: number;
  method: PaymentMethod; status: PaymentStatus;
  paymentDate: DateOnly;    // YYYY-MM-DD
  notes?: string;
}
export interface ExpenseCategoryDto { id: string; name: string; }
export interface ExpenseDto {
  id: string; categoryId: string; categoryName: string; description: string;
  amount: number; paymentMethod: PaymentMethod; paymentMethodLabel: string;
  date: DateOnly; createdByUsername: string;
}
export interface CreateExpenseDto {
  categoryId: string; description: string; amount: number;
  paymentMethod: PaymentMethod;
  date: DateOnly;    // YYYY-MM-DD
}
export interface UpdateExpenseDto {
  categoryId: string; description: string; amount: number;
  paymentMethod: PaymentMethod;
  date: DateOnly;    // YYYY-MM-DD
}
export interface DailyCashFlowDto {
  date: DateOnly; totalIncome: number; totalExpenses: number; netCashFlow: number;
  payments: PaymentDto[]; expenses: ExpenseDto[];
}
export interface CashFlowSummaryDto {
  from: DateOnly; to: DateOnly;
  totalIncome: number; totalExpenses: number; netCashFlow: number;
  dailyBreakdown: DailyCashFlowDto[];
}

// ── Roles ─────────────────────────────────────────────────────────────────────
export interface PermissionDto { id: string; name: string; module: string; description?: string; }
export interface RoleDto { id: string; name: string; description?: string; permissions: PermissionDto[]; }
export interface CreateRoleDto { name: string; description?: string; permissionIds: string[]; }
export interface UpdateRoleDto { name: string; description?: string; permissionIds: string[]; }
export interface AssignPermissionsDto { roleId: string; permissionIds: string[]; }

// ── Settings ──────────────────────────────────────────────────────────────────
export interface SettingDto { id: string; key: string; value: string; description?: string; }
export interface CreateSettingDto { key: string; value: string; description?: string; }
export interface UpdateSettingDto { key: string; value: string; description?: string; }

// ── Audit ─────────────────────────────────────────────────────────────────────
export interface AuditLogDto {
  id: string; userId: string; username: string;
  action: ActionType; actionLabel: string;
  entityName: string; entityId: string;
  oldValues?: string; newValues?: string; createdAt: DateOnly;
}
