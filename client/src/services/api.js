import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:3000/api"
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// A token expires after a day (see authController). Without this, an expired
// token is never cleared and every page keeps showing "Invalid or expired
// token." instead of asking the user to sign in again.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");

      // Stay on the login page so a wrong password still shows its message.
      if (window.location.pathname !== "/login") {
        window.location.replace("/login");
      }
    }

    return Promise.reject(error);
  }
);

export default api;
