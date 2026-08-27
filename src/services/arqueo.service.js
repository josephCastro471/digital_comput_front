import { api } from "./api.js";

export function listArqueos(params = {}) {
  const query = new URLSearchParams();
  if (params.estado) query.set("estado", params.estado);
  if (params.fecha) query.set("fecha", params.fecha);
  const qs = query.toString();
  return api.get(`/api/arqueo${qs ? `?${qs}` : ""}`);
}

export function abrirArqueo(payload) {
  return api.post("/api/arqueo/abrir", payload);
}

export function cerrarArqueo(id, payload) {
  return api.post(`/api/arqueo/${id}/cerrar`, payload);
}
