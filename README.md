# Comput Digital — Frontend

SPA en JavaScript plano (sin framework, sin TypeScript) + Vite, consumiendo la API de `../computdigital-backend`.

## Setup local

```bash
npm install
cp .env.example .env
# VITE_API_URL apunta por defecto a http://localhost:8000 (el backend corriendo con uvicorn)
npm run dev
```

Abre `http://localhost:5173`. El backend debe estar corriendo (`uvicorn app.main:app --reload` desde `computdigital-backend/`, con `CORS_ORIGINS` incluyendo `http://localhost:5173` — ya es el default).

## Arquitectura

- **`src/router.js`** — router propio basado en hash (`#/ruta`), sin dependencias externas. Redirige a `/login` si no hay token, y de `/login` a `/dashboard` si ya hay sesión.
- **`src/services/api.js`** — wrapper de `fetch`: agrega el header `Authorization`, serializa JSON o `form-urlencoded`, y en un 401 limpia el token y redirige a `/login`.
- **`src/services/auth.service.js`** — `login`/`logout`/`isAuthenticated`. El token JWT se guarda en `localStorage`.
- **`src/components/layout/layout.js`** — arma el shell (sidebar + outlet) solo cuando hay sesión; si no, solo renderiza el outlet (para la pantalla de login).
- Cada módulo del negocio tiene su carpeta en `src/components/` (`cuentas/`, `servicios/`, `arqueo/`, `conteo-monedas/`, `ventas/`, `comisiones/`, `directorio/`, `inventario/`) y su `*.service.js` correspondiente en `src/services/` — de momento solo `dashboard/` está implementado.

## Estado

- **Setup inicial** — completo: Vite, estructura de carpetas, `api.js`, login funcional contra el backend real (verificado con `npm run build` + llamadas HTTP simulando el navegador, incluyendo el preflight CORS), shell con navegación a los 8 módulos (los links existen, las páginas todavía no).
- **Dashboard** — implementado: resumen del día (ventas, comisiones, turno de caja, saldos de cuentas).
- **Pendiente**: una página por módulo (cuentas, servicios, arqueo, conteo de monedas, ventas, comisiones, directorio, inventario) — se irán agregando de a una, como se hizo con las fases del backend.
