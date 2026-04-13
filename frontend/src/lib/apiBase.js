const API_BASE = (
  process.env.REACT_APP_BACKEND_URL ||
  "https://grassley-backend.onrender.com"
).replace(/\/$/, "");

export default API_BASE;
