import { api, setToken, clearToken, getToken } from "./api.js";

export async function login(username, password) {
  const form = new URLSearchParams();
  form.set("username", username);
  form.set("password", password);

  const data = await api.post("/api/auth/login", form, { form: true });
  setToken(data.access_token);
}

export function logout() {
  clearToken();
}

export function isAuthenticated() {
  return Boolean(getToken());
}
