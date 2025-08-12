// src/utils/axiosConfig.js
import axios from "axios";

const baseURL =
  import.meta.env.MODE === "production"
    ? "/api"
    : import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

const axiosInstance = axios.create({
  baseURL,
  withCredentials: true,
});

export default axiosInstance;
