// criticidad.js: recibe un reporte y devuelve puntaje y nivel.
// No toca el mapa ni la pantalla, así se puede probar sola.

function aMinutos(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function franjaDe(fechaHora, criterios) {
  const minutos = aMinutos(fechaHora.slice(11, 16));
  for (const rango of criterios.horas_pico) {
    const [ini, fin] = rango.split("-");
    if (minutos >= aMinutos(ini) && minutos <= aMinutos(fin)) return "pico";
  }
  return "valle";
}

function nivelDe(puntaje, criterios) {
  for (const [nivel, [min, max]] of Object.entries(criterios.niveles)) {
    if (puntaje >= min && puntaje <= max) return nivel;
  }
  return "Alto";
}

// Puntaje = categoría + tipo de vía + franja horaria.
// El tipo de vía sale de vias.json si la cuadra está ahí; si no, del que
// guardó el reporte (detectado con OpenStreetMap o elegido a mano).
function calcularCriticidad(reporte, vias, criterios) {
  const enJson = vias[reporte.cuadra];
  const tipo = enJson ? enJson.tipo : reporte.via_tipo;
  if (!tipo) return null;
  const franja = franjaDe(reporte.fecha_hora, criterios);
  const puntaje =
    criterios.categoria[reporte.categoria] +
    criterios.via[tipo] +
    criterios.franja[franja];
  return { puntaje, nivel: nivelDe(puntaje, criterios), franja };
}

function puntajeMaximo(criterios) {
  const max = (obj) => Math.max(...Object.values(obj));
  return max(criterios.categoria) + max(criterios.via) + max(criterios.franja);
}
