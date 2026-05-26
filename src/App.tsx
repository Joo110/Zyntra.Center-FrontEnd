import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/layout/ProtectedRoute';
import Layout from './components/layout/Layout';
import LoginPage from './pages/auth/LoginPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import AcademicYearsPage from './pages/academic-years/AcademicYearsPage';
import BranchesPage from './pages/branches/BranchesPage';
import RoomsPage from './pages/rooms/RoomsPage';
import SubjectsPage from './pages/subjects/SubjectsPage';
import TeachersPage from './pages/teachers/TeachersPage';
import StudentsPage from './pages/students/StudentsPage';
import GroupsPage from './pages/groups/GroupsPage';
import LessonsPage from './pages/lessons/LessonsPage';
import AttendancePage from './pages/attendance/AttendancePage';
import ExamsPage from './pages/exams/ExamsPage';
import FinancePage from './pages/finance/FinancePage';
import RolesPage from './pages/roles/RolesPage';
import UsersPage from './pages/users/UsersPage';
import SettingsPage from './pages/settings/SettingsPage';
import AuditPage from './pages/audit/AuditPage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 3500,
            style: { fontFamily: 'Cairo, sans-serif', direction: 'rtl', borderRadius: '12px' },
            success: { style: { background: '#f0fdf4', border: '1px solid #86efac', color: '#166534' } },
            error: { style: { background: '#fef2f2', border: '1px solid #fca5a5', color: '#991b1b' } },
          }}
        />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/academic-years" element={<AcademicYearsPage />} />
              <Route path="/branches" element={<BranchesPage />} />
              <Route path="/rooms" element={<RoomsPage />} />
              <Route path="/subjects" element={<SubjectsPage />} />
              <Route path="/teachers" element={<TeachersPage />} />
              <Route path="/students" element={<StudentsPage />} />
              <Route path="/groups" element={<GroupsPage />} />
              <Route path="/lessons" element={<LessonsPage />} />
              <Route path="/attendance" element={<AttendancePage />} />
              <Route path="/exams" element={<ExamsPage />} />
              <Route path="/finance" element={<FinancePage />} />
              <Route path="/roles" element={<RolesPage />} />
              <Route path="/users" element={<UsersPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/audit" element={<AuditPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
