export function describeError(err) {
  if (!err) return "Error desconocido";
  try {
    const parsed = JSON.parse(err.message);
    if (Array.isArray(parsed)) {
      return parsed.map((item) => item.msg || JSON.stringify(item)).join(" | ");
    }
  } catch {
    // el mensaje no era JSON, era texto plano - se usa tal cual
  }
  return err.message;
}
