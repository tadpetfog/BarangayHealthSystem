import { useState, useEffect } from "react";
import Navbar from "../components/Navbar.jsx";
import api from "../services/api.js";
import { StatusBadge, EmptyState } from "../components/dashboard/DashboardUI.jsx";
import { CalendarIcon } from "../components/Icons.jsx";

function PatientProfile() {
  const [patient, setPatient] = useState(null);
  const [patientId, setPatientId] = useState(null);
  const [fullName, setFullName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [sex, setSex] = useState("");
  const [address, setAddress] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [history, setHistory] = useState([]);
  const [appointmentHistory, setAppointmentHistory] = useState([]);
  const [consultationHistory, setConsultationHistory] = useState([]);
  const [showNewHistory, setShowNewHistory] = useState(false);
  const [newHistory, setNewHistory] = useState({
    date: "",
    time: "",
    service: "",
    status: "Completed",
    staff: ""
  });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    const normalizePatientId = (patient) => {
      if (!patient) return null;
      if (typeof patient._id === "string") return patient._id;
      if (patient._id?._id) return patient._id._id;
      if (typeof patient.userId === "string") return patient.userId;
      if (patient.userId?._id) return patient.userId._id;
      if (patient.userId?.id) return patient.userId.id;
      return null;
    };

    const extractPatientFields = (patient) => {
      if (!patient) return null;
      return {
        _id: patient._id,
        fullName: patient.fullName || "",
        birthDate: patient.birthDate ? patient.birthDate.split("T")[0] : "",
        sex: patient.sex || "",
        address: patient.address || "",
        contactNumber: patient.contactNumber || ""
      };
    };

    const loadPatient = async () => {
      setLoading(true);
      setMessage("");

      try {
        const user = JSON.parse(localStorage.getItem("user"));
        const userId = typeof user?.id === "string" ? user.id : null;

        let existing = null;
        try {
          const response = await api.get("/patients");
          existing =
            response?.data?.find(
              (p) =>
                p.userId?._id === userId ||
                p.userId?.id === userId ||
                p.userId === userId
            ) || null;
        } catch (patientListError) {
          setMessage(
            patientListError?.response?.data?.message ||
              patientListError?.response?.data?.error ||
              "Failed to load your patient information."
          );
          setLoading(false);
          return;
        }

        if (!existing) {
          setMessage(
            "We could not find your patient record. Please contact the health center."
          );
          setPatient(null);
          setPatientId(null);
          setLoading(false);
          return;
        }

        const fields = extractPatientFields(existing);
        if (!fields) {
          setMessage(
            "We could not read your patient record correctly."
          );
          setPatient(null);
          setPatientId(null);
          setLoading(false);
          return;
        }

        setPatient(existing);
        setPatientId(existing._id);
        setFullName(fields.fullName);
        setBirthDate(fields.birthDate);
        setSex(fields.sex);
        setAddress(fields.address);
        setContactNumber(fields.contactNumber);

        const historyId = normalizePatientId(existing);

        if (!historyId) {
          setLoading(false);
          return;
        }

        try {
          const historyResponse = await api.get(
            `/patients/${historyId}/history`
          );
          const payload = historyResponse.data;
          const historyArray =
            Array.isArray(payload)
              ? payload
              : payload && payload.history
                ? payload.history
                : [];
          if (!cancelled) {
            setAppointmentHistory(historyArray);
          }
        } catch (historyError) {
          if (!cancelled) {
            setMessage(
              historyError?.response?.data?.message ||
                historyError?.response?.data?.error ||
                "Failed to load your appointment history."
            );
            setAppointmentHistory([]);
          }
        }
      } catch (error) {
        if (!cancelled) {
          setMessage(
            error?.response?.data?.message ||
              error?.response?.data?.error ||
              error?.message ||
              "Failed to load patient information."
          );
          setPatient(null);
          setPatientId(null);
          setAppointmentHistory([]);
          setConsultationHistory([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadPatient();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = { fullName, birthDate, sex, address, contactNumber };

    try {
      let response;
      if (patientId) {
        response = await api.put(`/patients/${patientId}`, payload);
      } else {
        response = await api.post("/patients", payload);
      }
      setMessage(response.data.message || "Patient information saved.");
      if (response.data._id || patientId) {
        setPatientId(response.data._id || patientId);
      }
    } catch (error) {
      setMessage(
        error.response?.data?.message || "Failed to save patient information."
      );
    }
  };

  const formatDate = (value) => {
    if (!value) return "";
    const date = new Date(value);
    if (isNaN(date.getTime())) return value;
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  };

  return (
    <div>
      <Navbar />
      <div className="page">
        <h1>Patient Information</h1>

        <div className="card">
          <form onSubmit={handleSubmit}>
            <div>
              <label>Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>

            <div>
              <label>Birth Date</label>
              <input
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                required
              />
            </div>

            <div>
              <label>Sex</label>
              <select
                value={sex}
                onChange={(e) => setSex(e.target.value)}
                required
              >
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
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                required
              />
            </div>

            <div>
              <label>Contact Number</label>
              <input
                type="text"
                value={contactNumber}
                onChange={(e) => setContactNumber(e.target.value)}
                required
              />
            </div>

            <button type="submit">
              {patientId ? "Update Patient Information" : "Save Patient Information"}
            </button>
          </form>

          {message && <p className="message">{message}</p>}
        </div>

        <h2 style={{ marginTop: "2rem" }}>Appointment History</h2>

        <p style={{ color: "#6b7280", marginTop: 0 }}>
          Visits you booked and their current status.
        </p>

        {loading && (
          <p className="message">Loading your appointment history…</p>
        )}

        {!loading &&
          appointmentHistory.length === 0 && (
            <EmptyState
              icon={<CalendarIcon />}
              title="No appointment history yet."
              hint="Booked and completed visits will appear here automatically."
            />
          )}

        {!loading &&
          appointmentHistory.map((item) => {
            const serviceName =
              item.service && typeof item.service === "object"
                ? item.service.name
                : null;
            const staffName = item.staff && item.staff.name;
            const consultationStatus = item.consultation?.status;

            return (
              <div
                key={item._id}
                className="history-item"
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: "0.75rem",
                  padding: "1rem",
                  marginTop: "0.75rem",
                  backgroundColor: "#fff"
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: "0.5rem"
                  }}
                >
                  <h3 style={{ margin: 0 }}>
                    {serviceName || "Health Service"}
                  </h3>
                  <StatusBadge status={item.status} />
                </div>

                <div style={{ marginTop: "0.5rem" }}>
                  <p>
                    <strong>Date:</strong> {item.date ? formatDate(item.date) : ""}
                  </p>
                  <p>
                    <strong>Time:</strong> {item.time || ""}
                  </p>
                  <p>
                    <strong>Status:</strong>{" "}
                    <StatusBadge status={item.status} />
                  </p>
                  {staffName && (
                    <p style={{ marginTop: "0.25rem" }}>
                      <strong>Staff:</strong> {staffName}
                    </p>
                  )}
                  {consultationStatus && (
                    <p style={{ marginTop: "0.25rem" }}>
                      <strong>Consultation:</strong>{" "}
                      <StatusBadge status={consultationStatus} />
                    </p>
                  )}
                  {item.consultation?.completedAt && (
                    <p style={{ marginTop: "0.25rem" }}>
                      <strong>Date Completed:</strong>{" "}
                      {formatDate(item.consultation.completedAt)}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}

export default PatientProfile;
