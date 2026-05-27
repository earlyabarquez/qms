import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";


export default function ProtectedRoute({ children, role }) {
  const { user, role: userRole } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (role && userRole !== role) {
    return <Navigate to={userRole === "teacher" ? "/teacher" : "/student"} replace />;
  }

  return children;
}