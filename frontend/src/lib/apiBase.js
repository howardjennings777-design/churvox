export const API_BASE =
  (
    (typeof import.meta !== "undefined" &&
      process.env &&
      process.env.VITE_BACKEND_URL) ||
    process.env.REACT_APP_BACKEND_URL ||
    ""
  ).replace(/\/$/, "");

export default API_BASE;
