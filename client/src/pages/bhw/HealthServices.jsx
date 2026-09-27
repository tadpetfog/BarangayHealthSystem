import { useState, useEffect, useRef } from "react";
import Navbar from "../../components/Navbar.jsx";
import api from "../../services/api.js";
import { Alert, StatusBadge, EmptyState } from "../../components/dashboard/DashboardUI.jsx";
import { HeartIcon } from "../../components/Icons.jsx";

function HealthServices() {
  const [services, setServices] = useState([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [availableDays, setAvailableDays] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [message, setMessage] = useState("");
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [deleteError, setDeleteError] = useState("");
  const cancelDeleteRef = useRef(null);

  const loadServices = async () => {
    try {
      const response = await api.get("/health-services");
      setServices(response.data);
    } catch (error) {
      setMessage("Failed to load health services.");
    }
  };

  useEffect(() => {
    loadServices();
  }, []);

  useEffect(() => {
    if (!pendingDelete) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") setPendingDelete(null);
    };

    document.addEventListener("keydown", handleKeyDown);
    cancelDeleteRef.current?.focus();

    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [pendingDelete]);

  const openDeleteDialog = (service) => {
    setMessage("");
    setDeleteError("");
    setPendingDelete(service);
  };

  const closeDeleteDialog = () => {
    if (deletingId) return;
    setDeleteError("");
    setPendingDelete(null);
  };

  // The backend decides whether a service may be deleted, so the result shown
  // here always comes from its response (409 = still used by appointments).
  const confirmDelete = async () => {
    const service = pendingDelete;

    if (!service) return;

    setDeletingId(service._id);
    setDeleteError("");

    try {
      const response = await api.delete(`/health-services/${service._id}`);

      setServices((current) =>
        current.filter((item) => item._id !== service._id)
      );
      setMessage(
        response.data.message || `${service.name} was deleted successfully.`
      );
      setPendingDelete(null);
      await loadServices();
    } catch (error) {
      setDeleteError(
        error.response?.data?.message || "Failed to delete this health service."
      );
      await loadServices();
    } finally {
      setDeletingId(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      await api.post("/health-services", {
        name,
        description,
        availableDays: availableDays.split(",").map((d) => d.trim()).filter(Boolean),
        startTime,
        endTime,
        status: "Active"
      });

      setMessage("Health service added.");
      setName("");
      setDescription("");
      setAvailableDays("");
      setStartTime("");
      setEndTime("");
      loadServices();
    } catch (error) {
      setMessage(error.response?.data?.message || "Failed to add service.");
    }
  };

  return (
    <div>
      <Navbar />
      <div className="page">
        <h1>Health Services</h1>

        {message && <Alert message={message} />}

        <div className="card">
          <h2>Add New Service</h2>
          <form onSubmit={handleSubmit}>
            <div>
              <label>Name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>

            <div>
              <label>Description</label>
              <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} required />
            </div>

            <div>
              <label>Available Days (comma separated)</label>
              <input type="text" placeholder="Monday, Tuesday, Friday" value={availableDays} onChange={(e) => setAvailableDays(e.target.value)} required />
            </div>

            <div>
              <label>Start Time</label>
              <input type="text" placeholder="08:00 AM" value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
            </div>

            <div>
              <label>End Time</label>
              <input type="text" placeholder="05:00 PM" value={endTime} onChange={(e) => setEndTime(e.target.value)} required />
            </div>

            <button type="submit">Add Service</button>
          </form>
        </div>

        <h2>Existing Services</h2>

        {services.length === 0 && !message && (
          <EmptyState
            icon={<HeartIcon />}
            title="No services yet."
            hint="Add a health service above so residents can start booking."
          />
        )}

        <ul>
          {services.map((service) => (
            <li key={service._id}>
              <h3>{service.name}</h3>
              <p>{service.description}</p>
              <p><strong>Days:</strong> {Array.isArray(service.availableDays) ? service.availableDays.join(", ") : service.availableDays}</p>
              <p><strong>Time:</strong> {service.startTime} - {service.endTime}</p>
              <p style={{ margin: "0.55rem 0 0" }}>
                <StatusBadge status={service.status} />
              </p>
              <div className="record-actions">
                <button
                  type="button"
                  className="danger"
                  onClick={() => openDeleteDialog(service)}
                  disabled={Boolean(deletingId)}
                  title={`Delete the ${service.name} health service`}
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {pendingDelete && (
        <div
          className="confirm-overlay"
          role="presentation"
          onClick={closeDeleteDialog}
        >
          <div
            className="confirm-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-service-delete-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="confirm-service-delete-title">Delete this health service?</h2>
            <p className="confirm-lead">
              This permanently removes the service so nobody can book it again.
              Appointments that were already booked for it are never deleted
              together with the service.
            </p>

            <dl className="confirm-account">
              <div>
                <dt>Service Name</dt>
                <dd>{pendingDelete.name}</dd>
              </div>
              <div>
                <dt>Schedule</dt>
                <dd>
                  {Array.isArray(pendingDelete.availableDays)
                    ? pendingDelete.availableDays.join(", ")
                    : pendingDelete.availableDays}{" "}
                  · {pendingDelete.startTime}–{pendingDelete.endTime}
                </dd>
              </div>
            </dl>

            {deleteError && <p className="confirm-error">{deleteError}</p>}

            <div className="confirm-actions">
              <button
                type="button"
                className="secondary"
                ref={cancelDeleteRef}
                onClick={closeDeleteDialog}
                disabled={Boolean(deletingId)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="danger"
                onClick={confirmDelete}
                disabled={Boolean(deletingId)}
              >
                {deletingId ? "Deleting…" : "Delete service"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default HealthServices;