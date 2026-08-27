import { registerRoute, startRouter } from "./router.js";
import { renderLogin } from "./components/login.page.js";
import { renderDashboard } from "./components/dashboard/dashboard.page.js";
import { renderCuentas } from "./components/cuentas/cuentas.page.js";
import { renderServicios } from "./components/servicios/servicios.page.js";
import { renderArqueo } from "./components/arqueo/arqueo.page.js";
import { renderConteoMonedas } from "./components/conteo-monedas/conteo-monedas.page.js";
import { renderVentas } from "./components/ventas/ventas.page.js";
import { renderComisiones } from "./components/comisiones/comisiones.page.js";

registerRoute("/login", renderLogin);
registerRoute("/dashboard", renderDashboard);
registerRoute("/cuentas", renderCuentas);
registerRoute("/servicios", renderServicios);
registerRoute("/arqueo", renderArqueo);
registerRoute("/conteo-monedas", renderConteoMonedas);
registerRoute("/ventas", renderVentas);
registerRoute("/comisiones", renderComisiones);

startRouter();
