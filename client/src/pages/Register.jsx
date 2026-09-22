import { useState } from "react";
import api from "../services/api.js";
import { Link, useNavigate } from "react-router-dom";
import CareTechLogo from "../components/CareTechLogo.jsx";

function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();

    try {
      await api.post("/auth/register", { name, email, password });
      setMessage("Account created successfully. Redirecting to login...");
      setTimeout(() => navigate("/login"), 1200);
    } catch (error) {
      setMessage(error.response?.data?.message || "Registration failed.");
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card split">
        <div className="auth-image">
          <img
            src="https://images.unsplash.com/photo-1584515933487-779824d29309?auto=format&fit=crop&w=900&q=80"
            alt="Healthcare"
          />
        </div>

        <div className="auth-form">
          <Link to="/" className="auth-home">
            ← Back to home
          </Link>
          <h1 className="care-brand">
            <Link to="/" className="care-brand-link">
              <CareTechLogo />
            </Link>
          </h1>
          <h2>Create your resident account</h2>

          <form onSubmit={handleRegister}>
            <div>
              <label>Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div>
              <label>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <label>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <div>
              <label>Role</label>
              <input type="text" value="Resident" readOnly />
            </div>

            <button type="submit">Register</button>
          </form>

          {message && <p className="message">{message}</p>}

          <p className="helper">
            Already have an account? <Link to="/login">Login</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Register;