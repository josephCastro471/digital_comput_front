import { getResumen } from "../../services/dashboard.service.js";
import { formatCurrency } from "../../utils/format.js";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function buildCard(title, value, subtitle) {
  const card = document.createElement("div");
  card.className = "card";
  card.innerHTML = `<p class="card-title">${title}</p><p class="card-value">${value}</p><p class="card-subtitle">${subtitle}</p>`;
  return card;
}

export async function renderDashboard(outlet) {
  outlet.innerHTML = "<p>Cargando...</p>";

  const fecha = todayIso();
  let resumen;
  try {
    resumen = await getResumen(fecha);
  } catch (err) {
    outlet.innerHTML = `<p class="error-msg">No se pudo cargar el dashboard: ${err.message}</p>`;
    return;
  }

  outlet.innerHTML = "";

  const header = document.createElement("h1");
  header.textContent = `Resumen del ${fecha}`;
  outlet.appendChild(header);

  const cards = document.createElement("div");
  cards.className = "cards";

  cards.appendChild(
    buildCard("Ventas del dia", formatCurrency(resumen.ventas.total), `${resumen.ventas.cantidad} venta(s)`)
  );
  cards.appendChild(
    buildCard(
      "Comisiones cobradas",
      formatCurrency(resumen.comisiones.total_valor_cobrado),
      `${resumen.comisiones.cantidad} transaccion(es)`
    )
  );

  const turnoAbierto = resumen.arqueos.find((a) => a.estado === "abierto");
  cards.appendChild(
    buildCard(
      "Turno de caja",
      turnoAbierto ? "Abierto" : "Sin turno abierto",
      turnoAbierto ? `Apertura: ${formatCurrency(turnoAbierto.saldo_apertura)}` : ""
    )
  );

  outlet.appendChild(cards);

  const cuentasTitle = document.createElement("h2");
  cuentasTitle.textContent = "Saldos de cuentas";
  outlet.appendChild(cuentasTitle);

  const table = document.createElement("table");
  table.className = "table";
  const thead = document.createElement("thead");
  thead.innerHTML = "<tr><th>Cuenta</th><th>Tipo</th><th>Saldo</th></tr>";
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  resumen.cuentas.forEach((cuenta) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${cuenta.nombre}</td><td>${cuenta.tipo}</td><td>${formatCurrency(cuenta.saldo_actual)}</td>`;
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  outlet.appendChild(table);
}
