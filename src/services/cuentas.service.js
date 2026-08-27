import { api } from "./api.js";

export function listCuentas() {
  return api.get("/api/cuentas");
}

export function getCuenta(id) {
  return api.get(`/api/cuentas/${id}`);
}

export function listMovimientos(id) {
  return api.get(`/api/cuentas/${id}/movimientos`);
}

export function crearMovimiento(id, payload) {
  return api.post(`/api/cuentas/${id}/movimientos`, payload);
}

export function actualizarCupo(id, payload) {
  return api.patch(`/api/cuentas/${id}/cupo`, payload);
}

export function iniciarDia(id, saldo) {
  return api.post(`/api/cuentas/${id}/iniciar-dia`, { saldo });
}

export function cerrarDia(id, saldo) {
  return api.post(`/api/cuentas/${id}/cerrar-dia`, { saldo });
}
