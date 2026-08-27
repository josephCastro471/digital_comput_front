import { api } from "./api.js";

export function listInventario() {
  return api.get("/api/inventario");
}

export function crearAccesorio(payload) {
  return api.post("/api/inventario", payload);
}

export function actualizarAccesorio(id, payload) {
  return api.patch(`/api/inventario/${id}`, payload);
}

export function registrarMovimiento(id, payload) {
  return api.post(`/api/inventario/${id}/movimiento`, payload);
}
