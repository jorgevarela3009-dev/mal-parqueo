// mapa.js: mapa base, capa de calor y capa de puntos individuales.

const COLORES = { Bajo: "#2e9e5b", Medio: "#e0a100", Alto: "#c62828" };

async function cargarJSON(ruta) {
  const r = await fetch(ruta);
  if (!r.ok) throw new Error("No se pudo cargar " + ruta);
  return r.json();
}

async function iniciar() {
  const [config, vias, criterios, reportes] = await Promise.all([
    cargarJSON("datos/config.json"),
    cargarJSON("datos/vias.json"),
    cargarJSON("datos/criterios.json"),
    cargarJSON("datos/reportes.json"),
  ]);

  // 1. Mapa base (teselas de OpenStreetMap), centrado según la zona activa
  const zona = config.zonas[config.zona_activa];
  const mapa = L.map("mapa").setView(zona.centro, zona.zoom);
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap",
  }).addTo(mapa);

  // 2. Calcular la criticidad de cada reporte
  const maximo = puntajeMaximo(criterios);
  const datos = reportes.map((rep) => ({
    ...rep,
    criticidad: calcularCriticidad(rep, vias, criterios) || rep.criticidad,
  })).filter((rep) => rep.criticidad);

  // 3. Capa de calor: la intensidad depende del puntaje
  const puntosCalor = datos.map((r) => [r.lat, r.lng, r.criticidad.puntaje / maximo]);
  const capaCalor = L.heatLayer(puntosCalor, { radius: 30, blur: 22, maxZoom: 17 }).addTo(mapa);

  // 4. Capa de puntos individuales
  const capaPuntos = L.layerGroup(
    datos.map((r) =>
      L.circleMarker([r.lat, r.lng], {
        radius: 7, color: "#fff", weight: 1.5,
        fillColor: COLORES[r.criticidad.nivel], fillOpacity: 0.9,
      }).bindPopup(
        `<b>${r.cuadra}</b><br>${r.categoria} · ${r.actor}<br>` +
        `${r.fecha_hora.replace("T", " ")}<br>` +
        `Criticidad: <b>${r.criticidad.puntaje} (${r.criticidad.nivel})</b>`
      )
    )
  ).addTo(mapa);

  // 5. Casillas para mostrar u ocultar capas
  const alternar = (id, capa) =>
    document.getElementById(id).addEventListener("change", (e) =>
      e.target.checked ? capa.addTo(mapa) : mapa.removeLayer(capa));
  alternar("chk-calor", capaCalor);
  alternar("chk-puntos", capaPuntos);

  document.getElementById("conteo").textContent = datos.length + " reportes";

  // 6. Ayuda para el trabajo de campo: tocar el mapa muestra lat/lng
  mapa.on("click", (e) => {
    document.getElementById("info").textContent =
      `lat: ${e.latlng.lat.toFixed(5)}, lng: ${e.latlng.lng.toFixed(5)}`;
  });
}

iniciar().catch((err) => {
  document.getElementById("info").textContent =
    "Error: " + err.message + ". Abre la página con Live Server o GitHub Pages, no con doble clic.";
});
