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

- **Setup inicial** — completo: Vite, estructura de carpetas, `api.js`, login funcional contra el backend real (verificado con `npm run build` + llamadas HTTP simulando el navegador, incluyendo el preflight CORS), shell con navegación a los 8 módulos.
- **Dashboard** — implementado: resumen del día (ventas, comisiones, turno de caja, saldos de cuentas).
- **Cuentas** — implementado: lista maestro-detalle (click en una cuenta muestra su detalle), formulario de nuevo movimiento (el tipo `uso` solo aparece para cuentas `cupo_revolvente`, igual que la regla del backend), formulario de actualización de cupo transaccional (solo `cupo_revolvente`), y tabla de movimientos.
- **Servicios** — implementado: catálogo con formulario que se adapta al `tipo_precio` elegido (precio fijo, editor de tramos para escalonado, sin campos extra para variable — igual que valida el backend); editar reutiliza el mismo formulario con el tipo bloqueado (no se puede cambiar tras crear, como en la API); eliminar con confirmación.
- **Arqueo** — implementado: si hay un turno abierto muestra su info y el formulario de cierre (tabla de denominaciones USD estándar con cantidad editable, subtotal y total en vivo); si no hay turno abierto, muestra el formulario para abrir uno (saldo de apertura, default 40.00). Debajo, historial de arqueos pasados con saldo de apertura/cierre y ganancia neta.
- **Conteo de monedas** — implementado: misma tabla de denominaciones que Arqueo (compartida vía `utils/denominaciones.js`), campo de nota opcional, historial con filtro por fecha. Deja explícito en la UI que es solo una calculadora de apoyo y no afecta cuentas.
- **Ventas** — implementado: carrito de items (elegís servicio + cantidad; el precio unitario se previsualiza en el cliente replicando la misma lógica del backend — fijo usa `precio_base`, escalonado busca el tramo por cantidad, variable pide el precio a mano) y cuenta opcional para el depósito automático. El total estimado del carrito coincide exactamente con el que calcula el backend al confirmar (verificado). Historial con fecha, cuenta, items y total.
- **Comisiones** — implementado: tabla de proveedores (Payphone/Deuna) con edición inline de `comision_pct`/`aplica_iva`/`iva_pct`; calculadora que llama a `/api/comisiones/calcular` para previsualizar sin persistir, con botón para registrar la transacción una vez conforme; historial de transacciones con fecha, proveedor, valor recibido, comisión, IVA y valor cobrado.
- **Directorio** — implementado: CRUD de entradas (empresa/cliente) con nombre, código, red, cédula/cuenta y nota; buscador que filtra en el backend por cualquiera de esos campos (`ilike`); editar reutiliza el mismo formulario, eliminar con confirmación.
- **Inventario** — implementado: catálogo de accesorios (nombre, costo, precio de venta, stock), formulario de creación y edición (el stock no se edita a mano — solo cambia por movimientos, igual que valida el backend); botón "Movimiento" por fila abre un formulario inline de entrada/salida con motivo opcional; el backend rechaza salidas que superan el stock disponible y la página muestra ese error.
- **Pendiente**: ninguno — los 9 módulos de negocio están implementados.
