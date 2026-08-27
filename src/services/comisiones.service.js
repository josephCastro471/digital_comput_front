import { api } from "./api.js";

export function listProveedores() {
  return api.get("/api/comisiones/proveedores");
}

export function actualizarProveedor(id, payload) {
  return api.patch(`/api/comisiones/proveedores/${id}`, payload);
}

export function calcularComision(payload) {
  return api.post("/api/comisiones/calcular", payload);
}

export function crearTransaccion(payload) {
  return api.post("/api/comisiones/transacciones", payload);
}

export function listTransacciones(fecha) {
  const qs = fecha ? `?fecha=${fecha}` : "";
  return api.get(`/api/comisiones/transacciones${qs}`);
}
