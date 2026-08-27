import { api } from "./api.js";

export function listConteos(fecha) {
  const qs = fecha ? `?fecha=${fecha}` : "";
  return api.get(`/api/conteo-monedas${qs}`);
}

export function crearConteo(payload) {
  return api.post("/api/conteo-monedas", payload);
}
