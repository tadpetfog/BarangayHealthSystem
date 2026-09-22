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

function BHWDashboard() {
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
          eyebrow="Barangay Health Worker"
          title="BHW Dashboard"
          subtitle={`Welcome, ${user?.name || "Health Worker"} — your community health workspace.`}
        />

        {analytics && (
          <div className="stats">
            <StatCard
              icon={<UserIcon />}
              label="Patient Records"
              value={analytics.totalPatients}
              hint="Residents with a health record."
              tone="blue"
            />

            <StatCard
              icon={<CalendarIcon />}
              label="Appointments"
              value={analytics.totalAppointments}
              hint={`${analytics.pendingAppointments} awaiting confirmation.`}
              tone="amber"
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
          description="Jump straight into your daily tasks."
        />

        <div className="quick-actions">
          <QuickAction
            to="/bhw/patients"
            icon={<UserIcon />}
            title="Patient Records"
            description="Manage resident health records and histories."
            featured
          />
          <QuickAction
            to="/bhw/appointments"
            icon={<CalendarIcon />}
            title="Appointments"
            description="Confirm, reschedule and track visits."
          />
          <QuickAction
            to="/bhw/health-services"
            icon={<HeartIcon />}
            title="Health Services"
            description="Maintain the service catalogue and schedules."
          />
          <QuickAction
            to="/bhw/consultations"
            icon={<ClipboardIcon />}
            title="Consultations"
            description="Record services provided after each visit."
          />
          <QuickAction
            to="/bhw/analytics"
            icon={<ChartIcon />}
            title="Health Data & Reports"
            description="Aggregated statistics and printable reports."
          />
        </div>
      </div>
    </div>
  );
}

export default BHWDashboard;