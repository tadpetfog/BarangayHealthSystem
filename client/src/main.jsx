import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import App from "./App.jsx";
import Landing from "./pages/Landing.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import ResidentDashboard from "./pages/ResidentDashboard.jsx";
import PatientProfile from "./pages/PatientProfile.jsx";
import HealthServices from "./pages/HealthServices.jsx";
import BookAppointment from "./pages/BookAppointment.jsx";
import MyAppointments from "./pages/MyAppointments.jsx";
import BHWDashboard from "./pages/bhw/BHWDashboard.jsx";
import BHWPatients from "./pages/bhw/Patients.jsx";
import BHWAppointments from "./pages/bhw/Appointments.jsx";
import BHWHealthServices from "./pages/bhw/HealthServices.jsx";
import BHWConsultations from "./pages/bhw/Consultations.jsx";
import StaffDashboard from "./pages/staff/StaffDashboard.jsx";
import AdminDashboard from "./pages/admin/AdminDashboard.jsx";
import AdminUsers from "./pages/admin/Users.jsx";
import Analytics from "./pages/admin/Analytics.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import "./index.css";
import "./App.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route path="/app" element={<App />} />

        {}
        <Route path="/dashboard" element={
          <ProtectedRoute allowedRoles={["resident"]}>
            <ResidentDashboard />
          </ProtectedRoute>
        } />
        <Route path="/patient-profile" element={
          <ProtectedRoute allowedRoles={["resident"]}>
            <PatientProfile />
          </ProtectedRoute>
        } />
        <Route path="/health-services" element={
          <ProtectedRoute allowedRoles={["resident"]}>
            <HealthServices />
          </ProtectedRoute>
        } />
        <Route path="/book-appointment" element={
          <ProtectedRoute allowedRoles={["resident"]}>
            <BookAppointment />
          </ProtectedRoute>
        } />
        <Route path="/my-appointments" element={
          <ProtectedRoute allowedRoles={["resident"]}>
            <MyAppointments />
          </ProtectedRoute>
        } />

        {}
        <Route path="/bhw-dashboard" element={
          <ProtectedRoute allowedRoles={["bhw"]}>
            <BHWDashboard />
          </ProtectedRoute>
        } />
        <Route path="/bhw/patients" element={
          <ProtectedRoute allowedRoles={["bhw"]}>
            <BHWPatients />
          </ProtectedRoute>
        } />
        <Route path="/bhw/appointments" element={
          <ProtectedRoute allowedRoles={["bhw"]}>
            <BHWAppointments />
          </ProtectedRoute>
        } />
        <Route path="/bhw/health-services" element={
          <ProtectedRoute allowedRoles={["bhw"]}>
            <BHWHealthServices />
          </ProtectedRoute>
        } />
        <Route path="/bhw/consultations" element={
          <ProtectedRoute allowedRoles={["bhw"]}>
            <BHWConsultations />
          </ProtectedRoute>
        } />
        <Route path="/bhw/analytics" element={
          <ProtectedRoute allowedRoles={["bhw"]}>
            <Analytics />
          </ProtectedRoute>
        } />

        {}
        <Route path="/staff-dashboard" element={
          <ProtectedRoute allowedRoles={["staff"]}>
            <StaffDashboard />
          </ProtectedRoute>
        } />
        <Route path="/staff/patients" element={
          <ProtectedRoute allowedRoles={["staff"]}>
            <BHWPatients />
          </ProtectedRoute>
        } />
        <Route path="/staff/appointments" element={
          <ProtectedRoute allowedRoles={["staff"]}>
            <BHWAppointments />
          </ProtectedRoute>
        } />
        <Route path="/staff/health-services" element={
          <ProtectedRoute allowedRoles={["staff"]}>
            <BHWHealthServices />
          </ProtectedRoute>
        } />
        <Route path="/staff/consultations" element={
          <ProtectedRoute allowedRoles={["staff"]}>
            <BHWConsultations />
          </ProtectedRoute>
        } />
        <Route path="/staff/analytics" element={
          <ProtectedRoute allowedRoles={["staff"]}>
            <Analytics />
          </ProtectedRoute>
        } />

        {}
        <Route path="/admin-dashboard" element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <AdminDashboard />
          </ProtectedRoute>
        } />
        <Route path="/admin/patients" element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <BHWPatients />
          </ProtectedRoute>
        } />
        <Route path="/admin/appointments" element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <BHWAppointments />
          </ProtectedRoute>
        } />
        <Route path="/admin/health-services" element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <BHWHealthServices />
          </ProtectedRoute>
        } />
        <Route path="/admin/consultations" element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <BHWConsultations />
          </ProtectedRoute>
        } />
        <Route path="/admin/analytics" element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <Analytics />
          </ProtectedRoute>
        } />
        <Route path="/admin/users" element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <AdminUsers />
          </ProtectedRoute>
        } />
      {}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
);