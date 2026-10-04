import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import api from "../services/api.js";
import {
  checkBooking,
  getSlotStart,
  describeAvailability as describeSlotSentence
} from "../utils/availability.js";

function BookAppointment() {
  const [services, setServices] = useState([]);
  const [serviceId, setServiceId] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [purpose, setPurpose] = useState("");
  const [message, setMessage] = useState("");
  const [scheduleHint, setScheduleHint] = useState("");
  const [servicesLoaded, setServicesLoaded] = useState(false);
  const [slot, setSlot] = useState(null);
  const navigate = useNavigate();

  const loadServices = async () => {
    try {
      const response = await api.get("/health-services");
      setServices(response.data.filter((s) => s.status === "Active"));
      setServicesLoaded(true);
    } catch {
      setMessage("Failed to load services.");
    }
  };

  useEffect(() => {
    loadServices();
  }, []);

  const selectedService = services.find((s) => s._id === serviceId) || null;

  useEffect(() => {
    if (!servicesLoaded || !serviceId) return;

    if (!services.some((s) => s._id === serviceId)) {
      setServiceId("");
      setScheduleHint("");
      setMessage(
        "The health service you selected is no longer available. Please choose another service."
      );
    }
  }, [services, servicesLoaded, serviceId]);

  const describeAvailability = () => {
    if (!selectedService) return "";
    if (!date || !time) {
      return `Available: ${(selectedService.availableDays || []).join(", ")} · ${selectedService.startTime}–${selectedService.endTime}.`;
    }

    const check = checkBooking(selectedService, date, time);
    if (!check.ok) return check.message;

    const withinSchedule = `Within schedule: ${(selectedService.availableDays || []).join(", ")} · ${selectedService.startTime}–${selectedService.endTime}.`;

    return slot ? `${withinSchedule} ${describeSlotSentence(slot)}` : withinSchedule;
  };

  useEffect(() => {
    let cancelled = false;

    if (!serviceId || !date || getSlotStart(time) === null) {
      setSlot(null);
      return undefined;
    }

    api
      .get("/appointments/slot", { params: { serviceId, date, time } })
      .then((response) => {
        if (!cancelled) setSlot(response.data);
      })
      .catch(() => {
        if (!cancelled) setSlot(null);
      });

    return () => {
      cancelled = true;
    };
  }, [serviceId, date, time]);

  useEffect(() => {
    setScheduleHint(describeAvailability());
  }, [serviceId, date, time, services.length, slot]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (selectedService && date && time) {
      const precheck = checkBooking(selectedService, date, time);
      if (!precheck.ok) {
        setMessage(precheck.message);
        setScheduleHint(precheck.message);
        return;
      }

      if (slot?.full) {
        const full = describeSlotSentence(slot);
        setMessage(full);
        setScheduleHint(full);
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
      const status = error.response?.status;

      setMessage(
        error.response?.data?.message || "Failed to book appointment."
      );

      if (status === 400 || status === 409) {
        await loadServices();
      }
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