const API_BASE =
  (
    (typeof import.meta !== "undefined" &&
      import.meta.env &&
      import.meta.env.VITE_BACKEND_URL) ||
    process.env.REACT_APP_BACKEND_URL ||
    ""
  ).replace(/\/$/, "");

export default API_BASE;
