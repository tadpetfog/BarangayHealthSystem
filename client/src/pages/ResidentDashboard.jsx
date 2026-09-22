import { useState, useEffect } from "react";
import Navbar from "../components/Navbar.jsx";
import api from "../services/api.js";
import {
  DashboardHeader,
  SectionHeader,
  StatCard,
  QuickAction
} from "../components/dashboard/DashboardUI.jsx";
import {
  UserIcon,
  CalendarIcon,
  ClipboardIcon,
  HeartIcon,
  ShieldIcon
} from "../components/Icons.jsx";

function ResidentDashboard() {
  const user = JSON.parse(localStorage.getItem("user"));
  const [hasProfile, setHasProfile] = useState(false);
  const [appointmentCount, setAppointmentCount] = useState(0);

  useEffect(() => {
    const loadSummary = async () => {
      try {
        const patientResponse = await api.get("/patients");
        const patient = patientResponse.data.find(
          (p) =>
            p.userId?._id === user?.id ||
            p.userId?.id === user?.id ||
            p.userId === user?.id
        );

        if (patient) {
          setHasProfile(true);

          const apptResponse = await api.get("/appointments");
          const mine = apptResponse.data.filter(
            (a) =>
              a.patientId?._id === patient._id ||
              a.patientId === patient._id
          );
          setAppointmentCount(mine.length);
        }
      } catch (error) {
      }
    };

    loadSummary();
  }, [user?.id]);

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric"
  });

  const firstName = user?.name?.split(" ")[0] || "Resident";

  return (
    <div>
      <Navbar />
      <div className="page">
        <DashboardHeader
          eyebrow="CareTech — Barangay Health Center"
          title={`Welcome back, ${firstName}.`}
          subtitle={today}
        />

        <div className="stats">
          <StatCard
            icon={<UserIcon />}
            label="Patient Profile"
            value={hasProfile ? "Complete" : "Not set up"}
            hint={
              hasProfile
                ? "Your health information is up to date."
                : "Complete your profile to book faster."
            }
            tone={hasProfile ? "green" : "amber"}
          />

          <StatCard
            icon={<CalendarIcon />}
            label="My Appointments"
            value={appointmentCount}
            hint="Visits booked at the health center."
            tone="blue"
          />

          <StatCard
            icon={<ShieldIcon />}
            label="Account"
            value="Resident"
            hint="Signed in with resident access."
            tone="navy"
          />
        </div>

        <SectionHeader
          title="Quick Actions"
          description="Everything you need, one tap away."
        />

        <div className="quick-actions">
          <QuickAction
            to="/patient-profile"
            icon={<UserIcon />}
            title="Manage Patient Information"
            description="Keep your personal and health details current."
          />
          <QuickAction
            to="/book-appointment"
            icon={<CalendarIcon />}
            title="Book an Appointment"
            description="Choose a service, date and time that suit you."
            featured
          />
          <QuickAction
            to="/my-appointments"
            icon={<ClipboardIcon />}
            title="My Appointments"
            description="Track, reschedule or cancel upcoming visits."
          />
          <QuickAction
            to="/health-services"
            icon={<HeartIcon />}
            title="View Health Services"
            description="See available services and what you've received."
          />
        </div>
      </div>
    </div>
  );
}

export default ResidentDashboard;