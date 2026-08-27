import { registerRoute, startRouter } from "./router.js";
import { renderLogin } from "./components/login.page.js";
import { renderDashboard } from "./components/dashboard/dashboard.page.js";

registerRoute("/login", renderLogin);
registerRoute("/dashboard", renderDashboard);

startRouter();
