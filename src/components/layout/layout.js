import { isAuthenticated, logout } from "../../services/auth.service.js";
import { navigate } from "../../router.js";

const NAV_ITEMS = [
  { path: "/dashboard", label: "Dashboard" },
  { path: "/cuentas", label: "Cuentas" },
  { path: "/servicios", label: "Servicios" },
  { path: "/arqueo", label: "Arqueo" },
  { path: "/conteo-monedas", label: "Conteo de monedas" },
  { path: "/ventas", label: "Ventas" },
  { path: "/comisiones", label: "Comisiones" },
  { path: "/directorio", label: "Directorio" },
  { path: "/inventario", label: "Inventario" },
];

export function renderShell() {
  const app = document.getElementById("app");
  app.innerHTML = "";

  if (!isAuthenticated()) {
    const outlet = document.createElement("div");
    outlet.id = "outlet";
    outlet.className = "outlet outlet--auth";
    app.appendChild(outlet);
    return;
  }

  const shell = document.createElement("div");
  shell.className = "shell";

  const nav = document.createElement("nav");
  nav.className = "sidebar";

  const brand = document.createElement("div");
  brand.className = "brand";
  brand.textContent = "Comput Digital";
  nav.appendChild(brand);

  const list = document.createElement("ul");
  const currentPath = window.location.hash.slice(1) || "/dashboard";
  NAV_ITEMS.forEach(({ path, label }) => {
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.href = `#${path}`;
    a.textContent = label;
    if (currentPath === path) a.classList.add("active");
    li.appendChild(a);
    list.appendChild(li);
  });
  nav.appendChild(list);

  const logoutBtn = document.createElement("button");
  logoutBtn.type = "button";
  logoutBtn.className = "logout-btn";
  logoutBtn.textContent = "Cerrar sesion";
  logoutBtn.addEventListener("click", () => {
    logout();
    navigate("/login");
  });
  nav.appendChild(logoutBtn);

  const main = document.createElement("main");
  main.className = "main";
  const outlet = document.createElement("div");
  outlet.id = "outlet";
  outlet.className = "outlet";
  main.appendChild(outlet);

  shell.appendChild(nav);
  shell.appendChild(main);
  app.appendChild(shell);
}
