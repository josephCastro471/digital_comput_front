import { api } from "./api.js";

export function getResumen(fecha) {
  return api.get(`/api/dashboard/resumen?fecha=${fecha}`);
}

export function getRango(desde, hasta) {
  return api.get(`/api/dashboard/rango?desde=${desde}&hasta=${hasta}`);
}
