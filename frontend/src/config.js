// src/config.js
const API_URL =
  import.meta.env.MODE === "development"
    ? "http://localhost:8000"
    : "https://ml-audit-pro.onrender.com";

export default API_URL;