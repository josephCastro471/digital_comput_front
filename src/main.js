import { registerRoute, startRouter } from "./router.js";
import { renderLogin } from "./components/login.page.js";
import { renderDashboard } from "./components/dashboard/dashboard.page.js";
import { renderCuentas } from "./components/cuentas/cuentas.page.js";

registerRoute("/login", renderLogin);
registerRoute("/dashboard", renderDashboard);
registerRoute("/cuentas", renderCuentas);

startRouter();
