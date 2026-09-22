import { useState, useEffect } from "react";
import Navbar from "../../components/Navbar.jsx";
import api from "../../services/api.js";
import { Alert, StatusBadge, EmptyState } from "../../components/dashboard/DashboardUI.jsx";
import { ClipboardIcon } from "../../components/Icons.jsx";

function Consultations() {
  const [consultations, setConsultations] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [patientServiceMap, setPatientServiceMap] = useState({});
  const [appointmentId, setAppointmentId] = useState("");
  const [serviceProvided, setServiceProvided] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("Completed");
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({
    serviceProvided: "",
    notes: "",
    status: "Completed"
  });
  const [message, setMessage] = useState("");
  const [completingId, setCompletingId] = useState(null);

  const loadConsultations = async () => {
    try {
      const response = await api.get("/consultations");
      setConsultations(response.data);
    } catch (error) {
      setMessage("Failed to load consultations.");
    }
  };

  const loadAppointments = async () => {
    try {
      const response = await api.get("/appointments");
      const map = {};
      for (const a of response.data) {
        if (a._id && a.serviceId) {
          map[a._id] = {
            _id: a._id,
            patientId: a.patientId?._id || a.patientId,
            patientName: a.patientId?.fullName || "",
            serviceId: a.serviceId._id || a.serviceId,
            serviceName:
              typeof a.serviceId === "object"
                ? a.serviceId.name
                : a.serviceName || ""
          };
        }
      }
      setPatientServiceMap(map);
      setAppointments(response.data);
    } catch (error) {
      setMessage("Failed to load appointments.");
    }
  };

  useEffect(() => {
    loadConsultations();
    loadAppointments();
  }, []);

  const startEdit = (consultation) => {
    setEditingId(consultation._id);
    setEditForm({
      serviceProvided: consultation.serviceProvided || "",
      notes: consultation.notes || "",
      status: consultation.status || "Completed"
    });
    setMessage("");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({ serviceProvided: "", notes: "", status: "Completed" });
  };

  const saveEdit = async (id) => {
    try {
      const response = await api.put(`/consultations/${id}`, editForm);
      setMessage(response.data.message || "Consultation updated.");
      cancelEdit();
      loadConsultations();
    } catch (error) {
      setMessage(
        error.response?.data?.message || "Failed to update consultation."
      );
    }
  };

  const handleDelete = async (consultation) => {
    if (!window.confirm("Delete this consultation record?")) return;
    try {
      const response = await api.delete(
        `/consultations/${consultation._id}`
      );
      setMessage(response.data.message || "Consultation deleted.");
      if (editingId === consultation._id) cancelEdit();
      loadConsultations();
    } catch (error) {
      setMessage(
        error.response?.data?.message || "Failed to delete consultation."
      );
    }
  };

  const completeConsultation = async (consultation) => {
    if (!window.confirm(
      `Complete this consultation and mark the linked appointment as completed?`
    ))
      return;
    setCompletingId(consultation._id);
    try {
      const response = await api.post(`/consultations/${consultation._id}/complete`);
      setMessage(response.data.message || "Consultation completed.");
      loadConsultations();
      loadAppointments();
    } catch (error) {
      setMessage(
        error.response?.data?.message ||
          "Failed to complete consultation."
      );
    } finally {
      setCompletingId(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const selected = appointments.find((a) => a._id === appointmentId);

    if (!selected) {
      setMessage("Please select a valid appointment.");
      return;
    }

    try {
      const user = JSON.parse(localStorage.getItem("user"));

      await api.post("/consultations", {
        appointmentId: selected._id,
        patientId: selected.patientId?._id || selected.patientId,
        healthWorkerId: user?.id,
        consultationDate: new Date().toISOString(),
        serviceProvided,
        notes,
        status
      });

      setMessage("Consultation record added.");
      setAppointmentId("");
      setServiceProvided("");
      setNotes("");
      setStatus("Completed");
      loadConsultations();
    } catch (error) {
      setMessage(error.response?.data?.message || "Failed to add consultation.");
    }
  };

  return (
    <div>
      <Navbar />
      <div className="page">
        <h1>Consultations</h1>

        {message && <Alert message={message} />}

        <div className="card">
          <h2>Add Consultation Record</h2>
          <form onSubmit={handleSubmit}>
            <div>
              <label>Appointment</label>
              <select value={appointmentId} onChange={(e) => setAppointmentId(e.target.value)} required>
                <option value="">Select Appointment</option>
                {appointments.map((appt) => (
                  <option key={appt._id} value={appt._id}>
                    {(appt.patientId?.fullName || "Patient") +
                      " - " +
                      (appt.serviceId?.name || "Service") +
                      " - " +
                      (appt.date ? appt.date.split("T")[0] : "")}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label>Service Provided</label>
              <input type="text" value={serviceProvided} onChange={(e) => setServiceProvided(e.target.value)} required />
            </div>

            <div>
              <label>Notes</label>
              <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} required />
            </div>

            <div>
              <label>Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)} required>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>

            <button type="submit">Add Consultation</button>
          </form>
        </div>

        <h2>Existing Consultations</h2>

        {consultations.length === 0 && !message && (
          <EmptyState
            icon={<ClipboardIcon />}
            title="No consultations yet."
            hint="Record a service provided after an appointment to see it here."
          />
        )}

        <ul>
          {consultations.map((c) => (
            <li key={c._id}>
              <h3>{c.patientId?.fullName || "Patient"}</h3>

              {editingId === c._id ? (
                <div>
                  <div>
                    <label>Service Provided</label>
                    <input
                      type="text"
                      value={editForm.serviceProvided}
                      onChange={(e) => setEditForm((f) => ({ ...f, serviceProvided: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <label>Notes</label>
                    <input
                      type="text"
                      value={editForm.notes}
                      onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label>Status</label>
                    <select
                      value={editForm.status}
                      onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value }))}
                    >
                      <option value="Completed">Completed</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </div>
                  <button type="button" onClick={() => saveEdit(c._id)}>
                    Save
                  </button>
                  <button type="button" className="secondary" onClick={cancelEdit}>
                    Cancel
                  </button>
                </div>
              ) : (
                <div>
                  <p><strong>Service Provided:</strong> {c.serviceProvided}</p>
                  <p><strong>Notes:</strong> {c.notes}</p>
                  <p><strong>Date:</strong> {c.consultationDate ? c.consultationDate.split("T")[0] : ""}</p>
                  <p style={{ margin: "0.55rem 0 0" }}>
                    <StatusBadge status={c.status} />
                  </p>
                  <div className="record-actions">
                    <button type="button" onClick={() => startEdit(c)}>
                      Edit
                    </button>
                    <button type="button" className="danger" onClick={() => handleDelete(c)}>
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default Consultations;