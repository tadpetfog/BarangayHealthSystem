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
  ChartIcon
} from "../../components/Icons.jsx";

function StaffDashboard() {
  const user = JSON.parse(localStorage.getItem("user"));
  const [analytics, setAnalytics] = useState(null);
  const [activeServices, setActiveServices] = useState(null);

  useEffect(() => {
    let cancelled = false;

    api
      .get("/analytics")
      .then((response) => {
        if (!cancelled) setAnalytics(response.data);
      })
      .catch(() => {});

    api
      .get("/health-services")
      .then((response) => {
        if (!cancelled) {
          setActiveServices(
            response.data.filter((s) => s.status === "Active").length
          );
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
          eyebrow="Health Center Staff"
          title="Staff Dashboard"
          subtitle={`Welcome, ${user?.name || "Staff"} — keep the health center running smoothly.`}
        />

        {analytics && (
          <div className="stats">
            <StatCard
              icon={<CalendarIcon />}
              label="Appointments"
              value={analytics.totalAppointments}
              hint={`${analytics.pendingAppointments} awaiting confirmation.`}
              tone="amber"
            />

            <StatCard
              icon={<UserIcon />}
              label="Patient Records"
              value={analytics.totalPatients}
              hint="Residents with a health record."
              tone="blue"
            />

            <StatCard
              icon={<ClipboardIcon />}
              label="Consultations"
              value={analytics.totalConsultations}
              hint="Services rendered to residents."
              tone="teal"
            />

            {activeServices !== null && (
              <StatCard
                icon={<HeartIcon />}
                label="Active Services"
                value={activeServices}
                hint="Currently open for booking."
                tone="green"
              />
            )}
          </div>
        )}

        <SectionHeader
          title="Workspace"
          description="Fast access to the tools you use most."
        />

        <div className="quick-actions">
          <QuickAction
            to="/staff/appointments"
            icon={<CalendarIcon />}
            title="Appointments"
            description="Keep the daily schedule moving."
            featured
          />
          <QuickAction
            to="/staff/patients"
            icon={<UserIcon />}
            title="Patient Records"
            description="Assist with resident health records."
          />
          <QuickAction
            to="/staff/health-services"
            icon={<HeartIcon />}
            title="Health Services"
            description="Assist with the service catalogue."
          />
          <QuickAction
            to="/staff/consultations"
            icon={<ClipboardIcon />}
            title="Consultations"
            description="Review services rendered to residents."
          />
          <QuickAction
            to="/staff/analytics"
            icon={<ChartIcon />}
            title="Health Data & Reports"
            description="Aggregated statistics and printable reports."
          />
        </div>
      </div>
    </div>
  );
}

export default StaffDashboard;