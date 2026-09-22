import { useState } from "react";
import api from "../services/api.js";
import { Link, useNavigate } from "react-router-dom";
import CareTechLogo from "../components/CareTechLogo.jsx";

const roleRedirects = {
  resident: "/dashboard",
  bhw: "/bhw-dashboard",
  staff: "/staff-dashboard",
  admin: "/admin-dashboard"
};

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      const response = await api.post("/auth/login", { email, password });

      localStorage.setItem("token", response.data.token);
      localStorage.setItem("user", JSON.stringify(response.data.user));

      const redirectPath = roleRedirects[response.data.user.role] || "/login";
      navigate(redirectPath);
    } catch (error) {
      setMessage(error.response?.data?.message || "Login failed.");
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card split">
        <div className="auth-image">
          <img
            src="https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=900&q=80"
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
          <h2>Sign in to your account</h2>

          <form onSubmit={handleLogin}>
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

            <button type="submit">Login</button>
          </form>

          {message && <p className="message">{message}</p>}

          <p className="helper">
            Don't have an account? <Link to="/register">Register</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;