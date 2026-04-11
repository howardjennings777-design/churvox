const API_BASE =
  (
    (typeof import.meta !== "undefined" &&
      import.meta.env &&
      import.meta.env.VITE_BACKEND_URL) ||
    "https://grassley-backend.onrender.com"
  ).replace(/\/$/, "");

export default API_BASE;
