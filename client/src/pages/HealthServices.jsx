import { useState, useEffect } from "react";
import Navbar from "../components/Navbar.jsx";
import api from "../services/api.js";
import { Alert, StatusBadge, EmptyState } from "../components/dashboard/DashboardUI.jsx";
import { HeartIcon } from "../components/Icons.jsx";

function HealthServices() {
  const [services, setServices] = useState([]);
  const [received, setReceived] = useState([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    api
      .get("/health-services")
      .then((response) => {
        if (!cancelled) setServices(response.data);
      })
      .catch((error) => {
        if (!cancelled) {
          setMessage(
            error.response?.data?.message || "Failed to load health services."
          );
        }
      });

    api
      .get("/consultations")
      .then((response) => {
        if (!cancelled) setReceived(response.data);
      })
      .catch((error) => {
        if (!cancelled) {
          setMessage(
            error.response?.data?.message || "Failed to load your health services."
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div>
      <Navbar />
      <div className="page">
        <h1>Health Services</h1>

        {message && <Alert message={message} />}

        <h2>My Health Services Received</h2>

        {received.length === 0 && !message && (
          <EmptyState
            icon={<HeartIcon />}
            title="No services have been recorded for you yet."
            hint="Services provided during your visits will appear here."
          />
        )}

        <ul>
          {received.map((service) => (
            <li key={service._id}>
              <h3>{service.serviceProvided}</h3>
              <p>
                <strong>Date:</strong>{" "}
                {service.consultationDate ? service.consultationDate.split("T")[0] : ""}
              </p>
              <p><strong>Notes:</strong> {service.notes}</p>
              <p style={{ margin: "0.55rem 0 0" }}>
                <StatusBadge status={service.status} />
              </p>
            </li>
          ))}
        </ul>

        <h2>Available Health Services</h2>

        {services.length === 0 && !message && (
          <EmptyState
            icon={<HeartIcon />}
            title="No health services available at the moment."
            hint="Please check back later — services are managed by the health center."
          />
        )}

        <ul>
          {services.map((service) => (
            <li key={service._id}>
              <h3>{service.name}</h3>
              <p>{service.description}</p>
              <p><strong>Available Days:</strong> {Array.isArray(service.availableDays) ? service.availableDays.join(", ") : service.availableDays}</p>
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