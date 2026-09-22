import { Navigate } from "react-router-dom";

function App() {
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user"));

  if (!token || !user) {
    return <Navigate to="/" replace />;
  }

  const dashboardLink = {
    resident: "/dashboard",
    bhw: "/bhw-dashboard",
    staff: "/staff-dashboard",
    admin: "/admin-dashboard"
  }[user.role] || "/login";

  return <Navigate to={dashboardLink} replace />;
}

export default App;