  import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
  import { AuthProvider, useAuth } from "./context/AuthContext";
  import ProtectedRoute from "./routes/ProtectedRoute";

  import LoginPage from "./pages/LoginPage";
  import RegisterPage from "./pages/RegisterPage";
  import TeacherDashboard from "./components/teacher/TeacherDashboard";
  import StudentDashboard from "./components/student/StudentDashboard";

  function RootRedirect() {
    const { user, role } = useAuth();
    if (!user) return <Navigate to="/login" replace />;
    return <Navigate to={role === "teacher" ? "/teacher" : "/student"} replace />;
  }

  export default function App() {
    return (
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* Teacher */}
            <Route
              path="/teacher/*"
              element={
                <ProtectedRoute role="teacher">
                  <TeacherDashboard />
                </ProtectedRoute>
              }
            />

            {/* Student */}
            <Route
              path="/student/*"
              element={
                <ProtectedRoute role="student">
                  <StudentDashboard />
                </ProtectedRoute>
              }
            />

            {/* Default */}
            <Route path="*" element={<RootRedirect />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    );
  }