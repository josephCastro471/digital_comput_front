import { api } from "./api.js";

export function listVentas(fecha) {
  const qs = fecha ? `?fecha=${fecha}` : "";
  return api.get(`/api/ventas${qs}`);
}

export function crearVenta(payload) {
  return api.post("/api/ventas", payload);
}
