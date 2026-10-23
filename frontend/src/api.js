import axios from "axios";

export const BACKEND_BASE_URL = (
  import.meta.env.VITE_BACKEND_URL || ""
).replace(/\/+$/, "");

const apiClient = axios.create({

  baseURL:
    import.meta.env.VITE_API_BASE_URL ||
    (BACKEND_BASE_URL ? `${BACKEND_BASE_URL}/api` : "/api"),

  headers: {
    "Content-Type": "application/json",
  },

});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});


export const getRegisteredApis = () =>
  apiClient.get("/apis");


export const monitorApi = (payload) =>
  apiClient.post("/monitor", payload);


export const updateRegisteredApi = (payload) =>
  apiClient.put("/apis", payload);


export const deleteRegisteredApi = (url) =>
  apiClient.delete("/apis", {
    data: {
      url,
    },
  });


export const getSecurityStatus = () =>
  apiClient.get("/security");


export const getUserAlerts = () =>
  apiClient.get("/alerts");

export const getUserActivity = () =>
  apiClient.get("/activity");

export const clearUserAlerts = () =>
  apiClient.delete("/alerts");

export const deleteAccount = () =>
  apiClient.delete("/account");


export default apiClient;