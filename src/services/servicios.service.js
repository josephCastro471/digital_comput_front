import { api } from "./api.js";

export function listServicios() {
  return api.get("/api/servicios");
}

export function crearServicio(payload) {
  return api.post("/api/servicios", payload);
}

export function actualizarServicio(id, payload) {
  return api.patch(`/api/servicios/${id}`, payload);
}

export function eliminarServicio(id) {
  return api.del(`/api/servicios/${id}`);
}
