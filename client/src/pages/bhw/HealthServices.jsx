import { useState, useEffect } from "react";
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
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default HealthServices;