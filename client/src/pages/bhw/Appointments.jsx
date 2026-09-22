import { useState, useEffect } from "react";
import Navbar from "../../components/Navbar.jsx";
import api from "../../services/api.js";
import { checkBooking } from "../../utils/availability.js";
import { Alert, StatusBadge, EmptyState } from "../../components/dashboard/DashboardUI.jsx";
import { CalendarIcon } from "../../components/Icons.jsx";

function Appointments() {
  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [services, setServices] = useState([]);
  const [message, setMessage] = useState("");
  const [editingId, setEditingId] = useState(null);
  const emptyAppt = { patientId: "", serviceId: "", date: "", time: "", purpose: "", status: "Pending" };
  const [form, setForm] = useState(emptyAppt);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    api
      .get("/appointments")
      .then((response) => {
        if (!cancelled) setAppointments(response.data);
      })
      .catch((error) => {
        if (!cancelled) {
          setMessage(
            error.response?.data?.message || "Failed to load appointments."
          );
        }
      });

    api.get("/patients").then(
      (response) => { if (!cancelled) setPatients(response.data); },
      () => {}
    );

    api.get("/health-services").then(
      (response) => { if (!cancelled) setServices(response.data); },
      () => {}
    );

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const refresh = () => setReloadKey((key) => key + 1);

  const startEdit = (appt) => {
    setEditingId(appt._id);
    setForm({
      patientId: appt.patientId?._id || appt.patientId || "",
      serviceId: appt.serviceId?._id || appt.serviceId || "",
      date: appt.date ? appt.date.split("T")[0] : "",
      time: appt.time || "",
      purpose: appt.purpose || "",
      status: appt.status || "Pending"
    });
    setMessage("");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(emptyAppt);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const selected = services.find((s) => s._id === form.serviceId) || null;
    if (selected && form.date && form.time) {
      const precheck = checkBooking(selected, form.date, form.time);
      if (!precheck.ok) {
        setMessage(precheck.message);
        return;
      }
    }
    try {
      const response = editingId
        ? await api.put(`/appointments/${editingId}`, form)
        : await api.post("/appointments", form);
      setMessage(response.data.message || "Appointment saved.");
      cancelEdit();
      refresh();
    } catch (error) {
      setMessage(error.response?.data?.message || "Failed to save.");
    }
  };

  const handleDelete = async (appt) => {
    if (!window.confirm("Delete this appointment record?")) return;
    try {
      const response = await api.delete(`/appointments/${appt._id}`);
      setMessage(response.data.message || "Appointment deleted.");
      if (editingId === appt._id) cancelEdit();
      refresh();
    } catch (error) {
      setMessage(error.response?.data?.message || "Failed to delete.");
    }
  };

  const set = (field) => (e) =>
    setForm((c) => ({ ...c, [field]: e.target.value }));

  return (
    <div>
      <Navbar />
      <div className="page">
        <h1>Appointments</h1>

        {message && <Alert message={message} />}

        <div className="card">
          <h2>{editingId ? "Update Appointment" : "Add Appointment"}</h2>
          <form onSubmit={handleSubmit}>
            <div>
              <label>Patient</label>
              <select value={form.patientId} onChange={set("patientId")} required>
                <option value="">Select Patient</option>
                {patients.map((p) => (
                  <option key={p._id} value={p._id}>{p.fullName}</option>
                ))}
              </select>
            </div>
            <div>
              <label>Service</label>
              <select value={form.serviceId} onChange={set("serviceId")} required>
                <option value="">Select Service</option>
                {services.map((s) => (
                  <option key={s._id} value={s._id}>{s.name}</option>
                ))}
              </select>
            </div>
            {(() => {
              const selected = services.find((s) => s._id === form.serviceId) || null;
              if (!selected) return null;
              const days = Array.isArray(selected.availableDays) ? selected.availableDays.join(", ") : selected.availableDays;
              return (
                <p className="message" style={{ marginTop: "0.25rem" }}>
                  Available: {days} · {selected.startTime}–{selected.endTime}
                </p>
              );
            })()}
            <div>
              <label>Date</label>
              <input type="date" value={form.date} onChange={set("date")} required />
            </div>
            <div>
              <label>Time</label>
              <input type="text" value={form.time} onChange={set("time")} required />
            </div>
            <div>
              <label>Purpose</label>
              <input type="text" value={form.purpose} onChange={set("purpose")} />
            </div>
            <div>
              <label>Status</label>
              <select value={form.status} onChange={set("status")}>
                {["Pending", "Confirmed", "Completed", "Cancelled"].map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <button type="submit">{editingId ? "Update" : "Add"}</button>
            {editingId && (
              <button type="button" className="secondary" onClick={cancelEdit}>
                Cancel
              </button>
            )}
          </form>
        </div>

        {appointments.length === 0 && !message && (
          <EmptyState
            icon={<CalendarIcon />}
            title="No appointments found."
            hint="Appointments will appear here once residents or staff book them."
          />
        )}

        <ul>
          {appointments.map((appt) => (
            <li key={appt._id}>
              <h3>{appt.patientId?.fullName || "Patient"}</h3>
              <p><strong>Service:</strong> {appt.serviceId?.name || "Service"}</p>
              <p><strong>Date:</strong> {appt.date ? appt.date.split("T")[0] : ""}</p>
              <p><strong>Time:</strong> {appt.time}</p>
              <p><strong>Purpose:</strong> {appt.purpose}</p>
              <p style={{ margin: "0.55rem 0 0" }}>
                <StatusBadge status={appt.status} />
              </p>
              <div className="record-actions">
                <button type="button" onClick={() => startEdit(appt)}>Edit</button>
                <button type="button" className="danger" onClick={() => handleDelete(appt)}>Delete</button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default Appointments;