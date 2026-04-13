import axios from "axios";
import useAppStore from "../store/useAppStore";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const api = axios.create({ baseURL: BASE_URL });

// Attach JWT on every request
api.interceptors.request.use((config) => {
  const token = useAppStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto-logout on 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      useAppStore.getState().clearAuth();
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

// ── Auth ─────────────────────────────────────────────────────────────────────
export const login = (email, password) =>
  api.post("/auth/login", { email, password }).then((r) => r.data);

export const getMe = () => 
  api.get("/me").then((r) => r.data);

// ── Analyses (Import/Bulk) ──────────────────────────────────────────────────
export const getAnalyses = () => api.get("/analyses").then((r) => r.data);
export const getAnalysis = (id) => api.get(`/analyses/${id}`).then((r) => r.data);
export const createAnalysis = (data) => api.post("/analyses", data).then((r) => r.data);
export const deleteAnalysis = (id) => api.delete(`/analyses/${id}`).then((r) => r.data);

export const uploadFile = (analysisId, file, mapping) => {
  const form = new FormData();
  form.append("file", file);
  if (mapping) form.append("mapping", JSON.stringify(mapping));
  return api.post(`/upload/${analysisId}`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  }).then((r) => r.data);
};

export const exportAnalysis = (analysisId, name) => {
  return api.get(`/export/${analysisId}`, { responseType: "blob" }).then((r) => {
    const url = URL.createObjectURL(r.data);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${name.replace(/\s+/g, "_")}_risk_register.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  });
};

// ── Risk Items (Legacy/Bulk Import Support) ──────────────────────────────────
export const addRiskItem = (data) => api.post("/risk-items", data).then((r) => r.data);
export const updateRiskItem = (id, data) => api.put(`/risk-items/${id}`, data).then((r) => r.data);
export const deleteRiskItem = (id) => api.delete(`/risk-items/${id}`).then((r) => r.data);
export const deleteRiskItemsBulk = (ids) => api.post('/risk-items/bulk-delete', { ids }).then(r => r.data);

// ── Departments ───────────────────────────────────────────────────────────────
export const getDepartments = () =>
  api.get("/departments").then((r) => r.data);

export const createDepartment = (data) =>
  api.post("/departments", data).then((r) => r.data);

export const updateDepartment = (id, data) =>
  api.put(`/departments/${id}`, data).then((r) => r.data);

export const deleteDepartment = (id) =>
  api.delete(`/departments/${id}`).then((r) => r.data);

// ── Users ─────────────────────────────────────────────────────────────────────
export const getUsers = () =>
  api.get("/users").then((r) => r.data);

export const createUser = (data) =>
  api.post("/users", data).then((r) => r.data);

export const updateUser = (id, data) =>
  api.put(`/users/${id}`, data).then((r) => r.data);

export const deleteUser = (id) =>
  api.delete(`/users/${id}`).then((r) => r.data);

// ── Risks ─────────────────────────────────────────────────────────────────────
export const getRisks = (params = {}) =>
  api.get("/risks", { params }).then((r) => r.data);

export const createRisk = (data) =>
  api.post("/risks", data).then((r) => r.data);

export const updateRisk = (id, data) =>
  api.put(`/risks/${id}`, data).then((r) => r.data);

export const deleteRisk = (id) =>
  api.delete(`/risks/${id}`).then((r) => r.data);

export const updateRiskStatus = (id, status) =>
  api.patch(`/risks/${id}/status`, { status }).then((r) => r.data);

export const suggestTags = (description) =>
  api.post("/risks/suggest-tags", { description }).then((r) => r.data);

// ── Dashboard ────────────────────────────────────────────────────────────────
export const getDashboardSummary = (params = {}) =>
  api.get("/dashboard/summary", { params }).then((r) => r.data);

export const getDashboardByDept = () =>
  api.get("/dashboard/by-department").then((r) => r.data);

export const getDashboardHeatmap = (params = {}) =>
  api.get("/dashboard/heatmap", { params }).then((r) => r.data);

export const getDashboardTrend = (params = {}) =>
  api.get("/dashboard/trend", { params }).then((r) => r.data);

export const getDashboardByCategory = (params = {}) =>
  api.get("/dashboard/by-category", { params }).then((r) => r.data);

// ── Audit ─────────────────────────────────────────────────────────────────────
export const getAuditLog = (params = {}) =>
  api.get("/audit", { params }).then((r) => r.data);

// ── Categories ────────────────────────────────────────────────────────────────
export const getCategories = () =>
  api.get("/categories").then((r) => r.data);

export default api;
