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

## CI

`.github/workflows/build.yml` corre `npm ci && npm run build` en cada push/PR a `main`, para detectar errores de build antes de desplegar.

## Deploy a producción (Vercel)

1. En Vercel: **Add New > Project**, importar este repo. Vercel detecta Vite automáticamente (`npm run build`, carpeta `dist`) — no hace falta `vercel.json`.
2. En las variables de entorno del proyecto (Vercel dashboard), agregar `VITE_API_URL` apuntando a la URL del backend en Render (ej: `https://computdigital-backend.onrender.com`). Al ser un router por hash (`#/ruta`), no hace falta configurar rewrites/fallback — cualquier ruta sirve el mismo `index.html`.
3. Una vez desplegado, copiar la URL que asigna Vercel (ej: `https://digital-comput-front.vercel.app`) y agregarla a `CORS_ORIGINS` en el backend de Render — si no, el navegador bloquea las llamadas por CORS.

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

## Fixes post-revisión (Fase 9)

- **Comisiones**: la fórmula de cálculo estaba mal (sumaba comisión+IVA sobre `valor_recibir` en vez de calcular el valor a cobrar de forma que, tras descontar la comisión y el IVA, el negocio se quede exactamente con `valor_recibir`). Corregido en el backend con la fórmula de "gross-up"; verificado contra los casos reales de Joseph (Payphone 5%: recibir 50 → cobrar 53.05; Deuna 4%: recibir 48 → cobrar 50.31). Se agregó una nota en la UI aclarando que los porcentajes se ingresan como número entero (`15` para 15%, no `0.15`).
- **Ventas**: el selector de servicio se veía diminuto e inutilizable — vivía dentro de un `.inline-form` (`display:flex`) sin `min-width`, y los `<select>` se colapsan por defecto en flexbox. Se agregó `min-width` a `.inline-form select` para que nunca colapse, sin `flex-grow` para que no se estire de forma absurda cuando no tiene contenido. Ademas, la causa raíz real de que el selector apareciera vacío era que la base de datos real todavía no tiene ningún servicio cargado (regla de negocio: el catálogo no se precarga, Joseph lo carga directo) — ahora la página muestra un aviso claro ("No hay servicios activos...") en vez de un dropdown vacío cuando pasa esto.

## Fase 9 — Pulido

- **Responsive**: breakpoint a 768px. El sidebar pasa de columna fija (220px) a una barra superior horizontal con los links envolviendo en filas; las tablas se vuelven scrolleables horizontalmente (`overflow-x: auto`) en vez de romper el layout; el layout maestro-detalle de Cuentas colapsa a una sola columna; el login-card usa `min(320px, 90vw)` para no desbordar en pantallas muy angostas.
- **Atajos de teclado**:
  - `Alt+1` a `Alt+9` navega directo a cada uno de los 9 módulos (el número corresponde al orden del sidebar; aparece como tooltip al pasar el mouse sobre cada link). Implementado en `src/shortcuts.js`, ignora la combinación si hay Ctrl/Shift/Meta presionado (para no pisar AltGr) o si no hay sesión iniciada.
  - `Escape` cancela el modo de edición activo en Servicios, Directorio e Inventario (y también cierra el formulario de movimiento abierto en Inventario), sin necesidad de hacer click en "Cancelar".
- **Deploy a producción**: pendiente — se aborda cuando se decida el proveedor de hosting.
