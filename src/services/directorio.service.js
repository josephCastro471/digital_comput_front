import { api } from "./api.js";

export function listDirectorio(buscar) {
  const qs = buscar ? `?buscar=${encodeURIComponent(buscar)}` : "";
  return api.get(`/api/directorio${qs}`);
}

export function crearDirectorio(payload) {
  return api.post("/api/directorio", payload);
}

export function actualizarDirectorio(id, payload) {
  return api.patch(`/api/directorio/${id}`, payload);
}

export function eliminarDirectorio(id) {
  return api.del(`/api/directorio/${id}`);
}
