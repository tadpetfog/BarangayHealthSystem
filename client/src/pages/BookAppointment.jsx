import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import api from "../services/api.js";
import { checkBooking } from "../utils/availability.js";

function BookAppointment() {
  const [services, setServices] = useState([]);
  const [serviceId, setServiceId] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [purpose, setPurpose] = useState("");
  const [message, setMessage] = useState("");
  const [scheduleHint, setScheduleHint] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const loadServices = async () => {
      try {
        const response = await api.get("/health-services");
        setServices(response.data.filter((s) => s.status === "Active"));
      } catch (error) {
        setMessage("Failed to load services.");
      }
    };
    loadServices();
  }, []);

  const selectedService = services.find((s) => s._id === serviceId) || null;

  const describeAvailability = () => {
    if (!selectedService) return "";
    if (!date || !time) {
      return `Available: ${(selectedService.availableDays || []).join(", ")} · ${selectedService.startTime}–${selectedService.endTime}.`;
    }

    const check = checkBooking(selectedService, date, time);
    return check.ok
      ? `Within schedule: ${(selectedService.availableDays || []).join(", ")} · ${selectedService.startTime}–${selectedService.endTime}.`
      : check.message;
  };

  useEffect(() => {
    setScheduleHint(describeAvailability());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceId, date, time, services.length]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (selectedService && date && time) {
      const precheck = checkBooking(selectedService, date, time);
      if (!precheck.ok) {
        setMessage(precheck.message);
        setScheduleHint(precheck.message);
        return;
      }
    }

    try {
      const user = JSON.parse(localStorage.getItem("user"));
      const patientResponse = await api.get("/patients");
      const patient = patientResponse.data.find(
        (p) => p.userId?._id === user?.id || p.userId?.id === user?.id || p.userId === user?.id
      );

      if (!patient) {
        setMessage("Please complete your Patient Information first.");
        return;
      }

      await api.post("/appointments", {
        patientId: patient._id,
        serviceId,
        date,
        time,
        purpose
      });

      setMessage("Appointment booked successfully.");
      setTimeout(() => navigate("/my-appointments"), 800);
    } catch (error) {
      setMessage(error.response?.data?.message || "Failed to book appointment.");
    }
  };

  return (
    <div>
      <Navbar />
      <div className="page">
        <h1>Book Appointment</h1>

        <div className="card">
          <form onSubmit={handleSubmit}>
            <div>
              <label>Service</label>
              <select value={serviceId} onChange={(e) => setServiceId(e.target.value)} required>
                <option value="">Select Service</option>
                {services.map((s) => (
                  <option key={s._id} value={s._id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label>Date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>

            <div>
              <label>Time</label>
              <input type="text" placeholder="e.g. 09:00 AM" value={time} onChange={(e) => setTime(e.target.value)} required />
            </div>

            <div>
              <label>Purpose</label>
              <input type="text" value={purpose} onChange={(e) => setPurpose(e.target.value)} required />
            </div>

            {scheduleHint && (
              <p className="message" style={{ marginTop: "0.5rem" }}>
                {scheduleHint}
              </p>
            )}

            <button type="submit">Book Appointment</button>
          </form>

          {message && <p className="message">{message}</p>}
        </div>
      </div>
    </div>
  );
}

export default BookAppointment;