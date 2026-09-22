import { useState, useEffect } from "react";
import Navbar from "../../components/Navbar.jsx";
import api from "../../services/api.js";
import { Alert, StatusBadge, EmptyState } from "../../components/dashboard/DashboardUI.jsx";
import { UserIcon, CalendarIcon } from "../../components/Icons.jsx";

const emptyForm = {
  userId: "",
  fullName: "",
  birthDate: "",
  sex: "",
  address: "",
  contactNumber: ""
};

const roleLabels = {
  resident: "Resident",
  bhw: "Barangay Health Worker",
  staff: "Health Center Staff",
  admin: "Administrator"
};

const APPOINTMENT_STATUSES = ["Pending", "Confirmed", "Completed", "Cancelled"];

function Patients() {
  const [patients, setPatients] = useState([]);
  const [residents, setResidents] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [expandedHistoryId, setExpandedHistoryId] = useState(null);
  const [historyByPatient, setHistoryByPatient] = useState({});
  const [historyLoadingId, setHistoryLoadingId] = useState(null);
  const [historyMessage, setHistoryMessage] = useState("");
  const [historyEditingId, setHistoryEditingId] = useState(null);
  const [historyEdit, setHistoryEdit] = useState({
    date: "",
    time: "",
    purpose: "",
    status: ""
  });

  useEffect(() => {
    let cancelled = false;

    api
      .get("/patients")
      .then((response) => {
        if (!cancelled) setPatients(response.data);
      })
      .catch((error) => {
        if (!cancelled) {
          setMessage(
            error.response?.data?.message || "Failed to load patient records."
          );
        }
      });

    api
      .get("/users/residents")
      .then((response) => {
        if (!cancelled) setResidents(response.data);
      })
      .catch((error) => {
        if (!cancelled) {
          setMessage(
            error.response?.data?.message || "Failed to load residents."
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const refresh = () => setReloadKey((key) => key + 1);

  const updateField = (field) => (event) =>
    setForm((current) => ({ ...current, [field]: event.target.value }));

  const startEdit = (patient) => {
    setEditingId(patient._id);
    setForm({
      userId: patient.userId?._id || patient.userId || "",
      fullName: patient.fullName || "",
      birthDate: patient.birthDate ? patient.birthDate.split("T")[0] : "",
      sex: patient.sex || "",
      address: patient.address || "",
      contactNumber: patient.contactNumber || ""
    });
    setMessage("");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      const response = editingId
        ? await api.put(`/patients/${editingId}`, form)
        : await api.post("/patients", form);

      setMessage(
        response.data.message ||
          (editingId ? "Patient record updated." : "Patient record created.")
      );
      cancelEdit();
      refresh();
    } catch (error) {
      setMessage(
        error.response?.data?.message || "Failed to save patient record."
      );
    }
  };

  const handleDelete = async (patient) => {
    if (!window.confirm(`Delete the patient record of ${patient.fullName}?`)) {
      return;
    }

    try {
      const response = await api.delete(`/patients/${patient._id}`);

      setMessage(response.data.message || "Patient record deleted.");
      if (editingId === patient._id) cancelEdit();
      if (expandedHistoryId === patient._id) setExpandedHistoryId(null);
      refresh();
    } catch (error) {
      setMessage(
        error.response?.data?.message || "Failed to delete patient record."
      );
    }
  };

  const toggleHistory = async (patient) => {
    if (expandedHistoryId === patient._id) {
      setExpandedHistoryId(null);
      setHistoryEditingId(null);
      setHistoryMessage("");
      return;
    }

    setExpandedHistoryId(patient._id);
    setHistoryEditingId(null);
    setHistoryMessage("");
    setHistoryLoadingId(patient._id);

    try {
      const response = await api.get(`/appointments?patientId=${patient._id}`);
      setHistoryByPatient((current) => ({
        ...current,
        [patient._id]: response.data
      }));
    } catch (error) {
      setHistoryMessage(
        error.response?.data?.message || "Failed to load appointment history."
      );
    } finally {
      setHistoryLoadingId(null);
    }
  };

  const reloadHistory = async (patientId) => {
    try {
      const response = await api.get(`/appointments?patientId=${patientId}`);
      setHistoryByPatient((current) => ({
        ...current,
        [patientId]: response.data
      }));
    } catch (error) {
      setHistoryMessage(
        error.response?.data?.message || "Failed to load appointment history."
      );
    }
  };

  const startHistoryEdit = (appt) => {
    setHistoryEditingId(appt._id);
    setHistoryEdit({
      date: appt.date ? appt.date.split("T")[0] : "",
      time: appt.time || "",
      purpose: appt.purpose || "",
      status: appt.status || "Pending"
    });
    setHistoryMessage("");
  };

  const cancelHistoryEdit = () => {
    setHistoryEditingId(null);
    setHistoryEdit({ date: "", time: "", purpose: "", status: "" });
  };

  const saveHistoryEdit = async (patientId, apptId) => {
    try {
      const response = await api.put(`/appointments/${apptId}`, historyEdit);
      setHistoryMessage(response.data.message || "Appointment updated.");
      cancelHistoryEdit();
      await reloadHistory(patientId);
    } catch (error) {
      setHistoryMessage(
        error.response?.data?.message || "Failed to update appointment."
      );
    }
  };

  const deleteHistoryAppointment = async (patientId, appt) => {
    const label = appt.date ? appt.date.split("T")[0] : "this appointment";
    if (!window.confirm(`Delete the appointment on ${label}?`)) return;

    try {
      const response = await api.delete(`/appointments/${appt._id}`);
      setHistoryMessage(response.data.message || "Appointment deleted.");
      if (historyEditingId === appt._id) cancelHistoryEdit();
      await reloadHistory(patientId);
    } catch (error) {
      setHistoryMessage(
        error.response?.data?.message || "Failed to delete appointment."
      );
    }
  };

  const linkedResidentIds = patients.map((patient) =>
    String(patient.userId?._id || patient.userId)
  );
  const currentResidentId = editingId ? String(form.userId) : "";

  const selectableResidents = residents.filter(
    (resident) =>
      !linkedResidentIds.includes(String(resident._id)) ||
      String(resident._id) === currentResidentId
  );

  return (
    <div>
      <Navbar />
      <div className="page">
        <h1>Patient Records</h1>

        {message && <Alert message={message} />}

        <div className="card">
          <h2>{editingId ? "Update Patient Record" : "Add Patient Record"}</h2>

          <form onSubmit={handleSubmit}>
            <div>
              <label>Resident</label>
              <select value={form.userId} onChange={updateField("userId")} required>
                <option value="">Select Resident</option>
                {selectableResidents.map((resident) => (
                  <option key={resident._id} value={resident._id}>
                    {resident.name} ({resident.email})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label>Full Name</label>
              <input
                type="text"
                value={form.fullName}
                onChange={updateField("fullName")}
                required
              />
            </div>

            <div>
              <label>Birth Date</label>
              <input
                type="date"
                value={form.birthDate}
                onChange={updateField("birthDate")}
                required
              />
            </div>

            <div>
              <label>Sex</label>
              <select value={form.sex} onChange={updateField("sex")} required>
                <option value="">Select Sex</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label>Address</label>
              <input
                type="text"
                value={form.address}
                onChange={updateField("address")}
                required
              />
            </div>

            <div>
              <label>Contact Number</label>
              <input
                type="text"
                value={form.contactNumber}
                onChange={updateField("contactNumber")}
                required
              />
            </div>

            <button type="submit">
              {editingId ? "Update Record" : "Add Record"}
            </button>

            {editingId && (
              <button type="button" className="secondary" onClick={cancelEdit}>
                Cancel
              </button>
            )}
          </form>
        </div>

        <h2>Saved Patient Records</h2>

        {patients.length === 0 && !message && (
          <EmptyState
            icon={<UserIcon />}
            title="No patient records found."
            hint="Add a record above to file health information against a resident."
          />
        )}

        <ul>
          {patients.map((patient) => {
            const role = patient.userId?.role || "resident";
            const history = historyByPatient[patient._id] || [];
            const expanded = expandedHistoryId === patient._id;

            return (
              <li key={patient._id}>
                <h3>{patient.fullName}</h3>
                <p><strong>Birth Date:</strong> {patient.birthDate ? patient.birthDate.split("T")[0] : "N/A"}</p>
                <p><strong>Sex:</strong> {patient.sex}</p>
                <p><strong>Address:</strong> {patient.address}</p>
                <p><strong>Contact:</strong> {patient.contactNumber}</p>
                <p>
                  <strong>Role:</strong>{" "}
                  <button
                    type="button"
                    className="role-badge resident role-clickable"
                    onClick={() => toggleHistory(patient)}
                    title="Click to view appointment history"
                    style={{ cursor: "pointer", border: "none" }}
                  >
                    {roleLabels[role] || role} — View History
                  </button>
                </p>
                <div className="record-actions">
                  <button type="button" onClick={() => startEdit(patient)}>
                    Edit
                  </button>
                  <button
                    type="button"
                    className="danger"
                    onClick={() => handleDelete(patient)}
                  >
                    Delete
                  </button>
                </div>

                {expanded && (
                  <div className="card" style={{ marginTop: "0.75rem" }}>
                    <h3>Appointment History — {patient.fullName}</h3>
                    {historyLoadingId === patient._id && <p>Loading history…</p>}
                    {historyMessage && <p className="message">{historyMessage}</p>}
                    {historyLoadingId !== patient._id && history.length === 0 && (
                      <EmptyState
                        icon={<CalendarIcon />}
                        title="No appointments for this patient yet."
                        hint="Click the role badge again to collapse this panel."
                      />
                    )}

                    {history.map((appt) => (
                      <div key={appt._id} style={{ marginTop: "0.5rem" }}>
                        {historyEditingId === appt._id ? (
                          <div>
                            <div>
                              <label>Date</label>
                              <input
                                type="date"
                                value={historyEdit.date}
                                onChange={(e) => setHistoryEdit((c) => ({ ...c, date: e.target.value }))}
                                required
                              />
                            </div>
                            <div>
                              <label>Time</label>
                              <input
                                type="text"
                                value={historyEdit.time}
                                onChange={(e) => setHistoryEdit((c) => ({ ...c, time: e.target.value }))}
                                required
                              />
                            </div>
                            <div>
                              <label>Purpose</label>
                              <input
                                type="text"
                                value={historyEdit.purpose}
                                onChange={(e) => setHistoryEdit((c) => ({ ...c, purpose: e.target.value }))}
                              />
                            </div>
                            <div>
                              <label>Status</label>
                              <select
                                value={historyEdit.status}
                                onChange={(e) => setHistoryEdit((c) => ({ ...c, status: e.target.value }))}
                              >
                                {APPOINTMENT_STATUSES.map((s) => (
                                  <option key={s} value={s}>{s}</option>
                                ))}
                              </select>
                            </div>
                            <button type="button" onClick={() => saveHistoryEdit(patient._id, appt._id)}>
                              Save
                            </button>
                            <button type="button" className="secondary" onClick={cancelHistoryEdit}>
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div>
                            <p><strong>Service:</strong> {appt.serviceId?.name || "Service"}</p>
                            <p><strong>Date:</strong> {appt.date ? appt.date.split("T")[0] : ""}</p>
                            <p><strong>Time:</strong> {appt.time}</p>
                            <p><strong>Purpose:</strong> {appt.purpose}</p>
                            <p style={{ margin: "0.55rem 0 0.65rem" }}>
                              <StatusBadge status={appt.status} />
                            </p>
                            <div className="record-actions">
                              <button type="button" onClick={() => startHistoryEdit(appt)}>
                                Edit
                              </button>
                              <button
                                type="button"
                                className="danger"
                                onClick={() => deleteHistoryAppointment(patient._id, appt)}
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

export default Patients;