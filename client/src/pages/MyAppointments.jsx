import { useState, useEffect } from "react";
import Navbar from "../components/Navbar.jsx";
import api from "../services/api.js";
import { checkBooking } from "../utils/availability.js";
import { Alert, StatusBadge, EmptyState } from "../components/dashboard/DashboardUI.jsx";
import { CalendarIcon, ClipboardIcon } from "../components/Icons.jsx";

function MyAppointments() {
  const [appointments, setAppointments] = useState([]);
  const [servicesReceived, setServicesReceived] = useState([]);
  const [hasProfile, setHasProfile] = useState(true);
  const [message, setMessage] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editDate, setEditDate] = useState("");
  const [editTime, setEditTime] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    api
      .get("/patients")
      .then((response) => {
        if (!cancelled) setHasProfile(response.data.length > 0);
      })
      .catch(() => {
        if (!cancelled) setMessage("Failed to load your patient information.");
      });

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

    api
      .get("/consultations")
      .then((response) => {
        if (!cancelled) setServicesReceived(response.data);
      })
      .catch(() => {
        if (!cancelled) setServicesReceived([]);
      });

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const saveChanges = async (id, payload, successMessage) => {
    try {
      await api.put(`/appointments/${id}`, payload);
      setMessage(successMessage);
      setEditingId(null);
      setReloadKey((key) => key + 1);
    } catch (error) {
      setMessage(
        error.response?.data?.message || "Failed to update appointment."
      );
    }
  };

  const startReschedule = (appointment) => {
    setEditingId(appointment._id);
    setEditDate(appointment.date ? appointment.date.split("T")[0] : "");
    setEditTime(appointment.time || "");
    setMessage("");
  };

  const precheckReschedule = (appointment, newDate, newTime) => {
    if (!newDate || !newTime) return { ok: true };
    const service = appointment.serviceId || null;
    if (!service || !service.name) return { ok: true };
    return checkBooking(
      {
        name: service.name,
        status: service.status,
        availableDays: service.availableDays,
        startTime: service.startTime,
        endTime: service.endTime
      },
      newDate,
      newTime
    );
  };

  return (
    <div>
      <Navbar />
      <div className="page">
        <h1>My Appointments</h1>

        {message && <Alert message={message} />}

        {!hasProfile && <p>Please complete your Patient Information first.</p>}

        {hasProfile && appointments.length === 0 && !message && (
          <EmptyState
            icon={<CalendarIcon />}
            title="You have no appointments yet."
            hint="Book an appointment to see it listed here."
          />
        )}

        <ul>
          {appointments.map((appt) => (
            <li key={appt._id}>
              <h3>{appt.serviceId?.name || "Service"}</h3>
              <p><strong>Date:</strong> {appt.date ? appt.date.split("T")[0] : ""}</p>
              <p><strong>Time:</strong> {appt.time}</p>
              <p><strong>Purpose:</strong> {appt.purpose}</p>
              <p style={{ margin: "0.55rem 0 0" }}>
                <StatusBadge status={appt.status} />
              </p>

              {editingId === appt._id ? (
                <div style={{ marginTop: "0.5rem" }}>
                  <div>
                    <label>New Date</label>
                    <input
                      type="date"
                      value={editDate}
                      onChange={(e) => setEditDate(e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <label>New Time</label>
                    <input
                      type="text"
                      value={editTime}
                      onChange={(e) => setEditTime(e.target.value)}
                      required
                    />
                  </div>

                  <button
                    className="success"
                    onClick={() => {
                      const precheck = precheckReschedule(appt, editDate, editTime);
                      if (!precheck.ok) {
                        setMessage(precheck.message);
                        return;
                      }
                      saveChanges(
                        appt._id,
                        { date: editDate, time: editTime },
                        "Appointment rescheduled."
                      );
                    }}
                  >
                    Save New Schedule
                  </button>
                  <button
                    className="secondary"
                    onClick={() => setEditingId(null)}
                  >
                    Discard
                  </button>
                </div>
              ) : (
                appt.status !== "Cancelled" && (
                  <div className="record-actions">
                    <button onClick={() => startReschedule(appt)}>
                      Reschedule
                    </button>
                    <button
                      className="danger"
                      onClick={() =>
                        saveChanges(
                          appt._id,
                          { status: "Cancelled" },
                          "Appointment cancelled."
                        )
                      }
                    >
                      Cancel Appointment
                    </button>
                  </div>
                )
              )}
            </li>
          ))}
        </ul>

        <h2 style={{ marginTop: "2rem" }}>Services Received</h2>

        {servicesReceived.length === 0 && (
          <EmptyState
            icon={<ClipboardIcon />}
            title="No health services have been provided to you yet."
            hint="Completed consultations at the health center will appear here."
          />
        )}

        <ul>
          {servicesReceived.map((service) => (
            <li key={service._id}>
              <h3>{service.serviceProvided}</h3>
              <p><strong>Date:</strong> {service.consultationDate ? service.consultationDate.split("T")[0] : ""}</p>
              <p><strong>Notes:</strong> {service.notes}</p>
              <p style={{ margin: "0.55rem 0 0" }}>
                <StatusBadge status={service.status} />
              </p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default MyAppointments;