import { Link, useNavigate, useLocation } from "react-router-dom";
import { Phone, Mail, MapPin } from "lucide-react";
import CareTechLogo from "./CareTechLogo.jsx";

const dashboardPaths = {
  resident: "/dashboard",
  bhw: "/bhw-dashboard",
  staff: "/staff-dashboard",
  admin: "/admin-dashboard"
};

const roleLabels = {
  resident: "Resident",
  bhw: "Barangay Health Worker",
  staff: "Health Center Staff",
  admin: "Administrator"
};

const sectionLinks = {
  resident: [
    { to: "/dashboard", label: "Dashboard" },
    { to: "/book-appointment", label: "Book Appointment" },
    { to: "/my-appointments", label: "My Appointments" },
    { to: "/health-services", label: "Health Services" },
    { to: "/patient-profile", label: "My Profile" }
  ],
  bhw: [
    { to: "/bhw-dashboard", label: "Dashboard" },
    { to: "/bhw/patients", label: "Patient Records" },
    { to: "/bhw/appointments", label: "Appointments" },
    { to: "/bhw/health-services", label: "Health Services" },
    { to: "/bhw/consultations", label: "Consultations" },
    { to: "/bhw/analytics", label: "Reports" }
  ],
  staff: [
    { to: "/staff-dashboard", label: "Dashboard" },
    { to: "/staff/patients", label: "Patient Records" },
    { to: "/staff/appointments", label: "Appointments" },
    { to: "/staff/health-services", label: "Health Services" },
    { to: "/staff/consultations", label: "Consultations" },
    { to: "/staff/analytics", label: "Reports" }
  ],
  admin: [
    { to: "/admin-dashboard", label: "Dashboard" },
    { to: "/admin/patients", label: "Patient Records" },
    { to: "/admin/appointments", label: "Appointments" },
    { to: "/admin/health-services", label: "Health Services" },
    { to: "/admin/consultations", label: "Consultations" },
    { to: "/admin/analytics", label: "Reports" },
    { to: "/admin/users", label: "Accounts" }
  ]
};

function initials(name) {
  if (!name) return "?";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem("user"));

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const dashboardLink = dashboardPaths[user?.role] || "/login";
  const links = sectionLinks[user?.role] || [];

  const isActive = (to) =>
    to === dashboardLink
      ? location.pathname === to
      : location.pathname === to || location.pathname.startsWith(to + "/");

  return (
    <>
      <div className="care-topbar">
        <div className="care-topbar-inner">
          <a href="tel:+639123456789">
            <Phone aria-hidden="true" />
            +63 912 345 6789
          </a>
          <a href="mailto:info@caretech.ph" className="care-hide-sm">
            <Mail aria-hidden="true" />
            info@caretech.ph
          </a>
          <span className="care-hide-sm">
            <MapPin aria-hidden="true" />
            Barangay Health Center, Balic-Balic, Sampaloc, Manila
          </span>
          {user?.role && (
            <span className="care-role">{roleLabels[user.role] || user.role}</span>
          )}
        </div>
      </div>

      <nav className="navbar">
        <div className="navbar-inner">
          <Link to={dashboardLink} className="care-brand">
            <CareTechLogo />
          </Link>

          <div className="navbar-links">
            <span className="navbar-user" title={user?.name || "User"}>
              <span className="user-avatar" aria-hidden="true">
                {initials(user?.name)}
              </span>
              <span className="user-name">{user?.name || "User"}</span>
              {user?.role && (
                <span className="user-role-tag">
                  {roleLabels[user.role] || user.role}
                </span>
              )}
            </span>
            <button type="button" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>

        {links.length > 0 && (
          <div className="section-nav">
            <div className="section-nav-inner">
              {links.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={isActive(link.to) ? "is-active" : undefined}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        )}
      </nav>
    </>
  );
}

export default Navbar;
