// criticidad.js: recibe un reporte y devuelve puntaje y nivel.
// No toca el mapa ni la pantalla, así se puede probar sola.

function aMinutos(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

// Deduce "pico" o "valle" a partir de la hora del reporte.
function franjaDe(fechaHora, criterios) {
  const minutos = aMinutos(fechaHora.slice(11, 16)); // "2026-11-18T11:40" -> "11:40"
  for (const rango of criterios.horas_pico) {      // repetición
    const [ini, fin] = rango.split("-");
    if (minutos >= aMinutos(ini) && minutos <= aMinutos(fin)) return "pico"; // condición
  }
  return "valle";
}

function nivelDe(puntaje, criterios) {
  for (const [nivel, [min, max]] of Object.entries(criterios.niveles)) {
    if (puntaje >= min && puntaje <= max) return nivel;
  }
  return "Alto"; // si se pasa del rango, se trata como Alto
}

// Puntaje = categoría + tipo de vía + franja horaria
function calcularCriticidad(reporte, vias, criterios) {
  const via = vias[reporte.cuadra];
  if (!via) return null; // cuadra no registrada en vias.json
  const franja = franjaDe(reporte.fecha_hora, criterios);
  const puntaje =
    criterios.categoria[reporte.categoria] +
    criterios.via[via.tipo] +
    criterios.franja[franja];
  return { puntaje, nivel: nivelDe(puntaje, criterios), franja };
}

// Puntaje máximo posible (sirve para escalar la intensidad del calor)
function puntajeMaximo(criterios) {
  const max = (obj) => Math.max(...Object.values(obj));
  return max(criterios.categoria) + max(criterios.via) + max(criterios.franja);
}
