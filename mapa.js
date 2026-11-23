// mapa.js: mapa base, capa de calor y capa de puntos individuales.

const COLORES = { Bajo: "#2e9e5b", Medio: "#e0a100", Alto: "#c62828" };
const estado = {}; // mapa, capas y datos cargados, compartido con captura.js

async function cargarJSON(ruta) {
  const r = await fetch(ruta);
  if (!r.ok) throw new Error("No se pudo cargar " + ruta);
  return r.json();
}

async function iniciar() {
  const [config, vias, criterios, base] = await Promise.all([
    cargarJSON("datos/config.json"), cargarJSON("datos/vias.json"),
    cargarJSON("datos/criterios.json"), cargarJSON("datos/reportes.json"),
  ]);
  Object.assign(estado, { vias, criterios, base });

  const zona = config.zonas[config.zona_activa];
  estado.mapa = L.map("mapa").setView(zona.centro, zona.zoom);
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19, attribution: "&copy; OpenStreetMap",
  }).addTo(estado.mapa);

  estado.capaCalor = L.heatLayer([], { radius: 30, blur: 22, maxZoom: 17 });
  estado.capaPuntos = L.layerGroup();
  for (const [id, capa] of [["chk-calor", estado.capaCalor], ["chk-puntos", estado.capaPuntos]]) {
    const chk = document.getElementById(id);
    if (chk.checked) capa.addTo(estado.mapa);
    chk.addEventListener("change", () =>
      chk.checked ? capa.addTo(estado.mapa) : estado.mapa.removeLayer(capa));
  }
  dibujar();
}

// Junta los reportes precargados y los del navegador, sin repetir ids, y redibuja.
function dibujar() {
  const maximo = puntajeMaximo(estado.criterios);
  const vistos = new Set();
  const datos = [];
  for (const r of [...estado.base, ...leerLocales()]) {
    if (vistos.has(r.id)) continue;
    vistos.add(r.id);
    const c = calcularCriticidad(r, estado.vias, estado.criterios);
    if (c) datos.push({ ...r, criticidad: c });
  }
  estado.capaCalor.setLatLngs(datos.map((r) => [r.lat, r.lng, r.criticidad.puntaje / maximo]));
  estado.capaPuntos.clearLayers();
  for (const r of datos) {
    L.circleMarker([r.lat, r.lng], {
      radius: 7, color: "#fff", weight: 1.5, bubblingMouseEvents: false,
      fillColor: COLORES[r.criticidad.nivel], fillOpacity: 0.9,
    }).bindPopup(
      `<b>${r.cuadra}</b><br>${r.categoria} · ${r.actor}<br>${r.fecha_hora.replace("T", " ")}<br>` +
      `Criticidad: <b>${r.criticidad.puntaje} (${r.criticidad.nivel})</b>`
    ).addTo(estado.capaPuntos);
  }
  document.getElementById("conteo").textContent = datos.length + " reportes";
}

window.listo = iniciar().catch((err) => {
  document.getElementById("conteo").textContent =
    "Error: " + err.message + ". Usa Live Server o GitHub Pages, no doble clic.";
});
