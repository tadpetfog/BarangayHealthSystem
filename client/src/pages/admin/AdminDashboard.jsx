import { useState, useEffect } from "react";
import Navbar from "../../components/Navbar.jsx";
import api from "../../services/api.js";
import {
  DashboardHeader,
  SectionHeader,
  StatCard,
  QuickAction
} from "../../components/dashboard/DashboardUI.jsx";
import {
  UserIcon,
  CalendarIcon,
  ClipboardIcon,
  HeartIcon,
  ChartIcon,
  UsersIcon
} from "../../components/Icons.jsx";

function AdminDashboard() {
  const user = JSON.parse(localStorage.getItem("user"));
  const [analytics, setAnalytics] = useState(null);
  const [accountCount, setAccountCount] = useState(null);
  const [serviceCounts, setServiceCounts] = useState(null);

  useEffect(() => {
    let cancelled = false;

    api
      .get("/analytics")
      .then((response) => {
        if (!cancelled) setAnalytics(response.data);
      })
      .catch(() => {});

    api
      .get("/users")
      .then((response) => {
        if (!cancelled && Array.isArray(response.data)) {
          setAccountCount(response.data.length);
        }
      })
      .catch(() => {});

    api
      .get("/health-services")
      .then((response) => {
        if (!cancelled && Array.isArray(response.data)) {
          setServiceCounts({
            total: response.data.length,
            active: response.data.filter((s) => s.status === "Active").length
          });
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div>
      <Navbar />
      <div className="page">
        <DashboardHeader
          eyebrow="Administrator"
          title="Admin Dashboard"
          subtitle={`Welcome, ${user?.name || "Administrator"} — a live overview of the whole barangay health system.`}
        />

        {analytics && (
          <div className="stats">
            <StatCard
              icon={<UserIcon />}
              label="Total Patients"
              value={analytics.totalPatients}
              hint="Registered health records."
              tone="blue"
            />

            <StatCard
              icon={<CalendarIcon />}
              label="Appointments"
              value={analytics.totalAppointments}
              hint={`${analytics.pendingAppointments} pending · ${analytics.completedAppointments} completed`}
              tone="amber"
            />

            <StatCard
              icon={<ClipboardIcon />}
              label="Consultations"
              value={analytics.totalConsultations}
              hint="Health services provided."
              tone="teal"
            />

            {accountCount !== null && (
              <StatCard
                icon={<UsersIcon />}
                label="System Accounts"
                value={accountCount}
                hint="Residents and health center staff."
                tone="navy"
              />
            )}

            {serviceCounts !== null && (
              <StatCard
                icon={<HeartIcon />}
                label="Health Services"
                value={serviceCounts.total}
                hint={`${serviceCounts.active} currently active.`}
                tone="green"
              />
            )}
          </div>
        )}

        <SectionHeader
          title="System Management"
          description="Administer every part of the health platform."
        />

        <div className="quick-actions">
          <QuickAction
            to="/admin/users"
            icon={<UsersIcon />}
            title="Manage Accounts"
            description="Create staff, BHW and administrator accounts."
            featured
          />
          <QuickAction
            to="/admin/patients"
            icon={<UserIcon />}
            title="Patient Records"
            description="Oversee all resident health records."
          />
          <QuickAction
            to="/admin/appointments"
            icon={<CalendarIcon />}
            title="Appointments"
            description="Full control of the appointment schedule."
          />
          <QuickAction
            to="/admin/health-services"
            icon={<HeartIcon />}
            title="Health Services"
            description="Manage the catalogue residents book from."
          />
          <QuickAction
            to="/admin/consultations"
            icon={<ClipboardIcon />}
            title="Consultations"
            description="Review services rendered across the system."
          />
          <QuickAction
            to="/admin/analytics"
            icon={<ChartIcon />}
            title="Health Data & Reports"
            description="System-wide statistics and printable reports."
          />
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;