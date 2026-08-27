export function formatCurrency(value) {
  const num = Number(value);
  return `$${num.toFixed(2)}`;
}
