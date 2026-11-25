// mapa.js: mapa base, capa de calor, puntos individuales y hexágonos opcionales.

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
// Ajustar el mapa a todas las vías estudiadas.

const trazos = Object.values(vias)
    .filter(v => Array.isArray(v.trazo))
    .flatMap(v => v.trazo);

if (trazos.length > 0) {
    estado.mapa.fitBounds(
        L.latLngBounds(trazos),
        {
            padding: [35, 35],
            maxZoom: 17
        }
    );
}
  estado.mapa.createPane("hexagonos");
  estado.mapa.getPane("hexagonos").style.zIndex = 390;
  estado.mapa.createPane("puntos");
  estado.mapa.getPane("puntos").style.zIndex = 620;

  estado.origenHex = origenDeCentro(zona.centro);
  estado.capaCalor = L.heatLayer([], { radius: 30, blur: 22, maxZoom: 17 });
  estado.capaHex = L.layerGroup();
  estado.capaPuntos = L.layerGroup();
  for (const [id, capa] of [["chk-calor", estado.capaCalor], ["chk-hex", estado.capaHex], ["chk-puntos", estado.capaPuntos]]) {
    const chk = document.getElementById(id);
    if (chk.checked) capa.addTo(estado.mapa);
    chk.addEventListener("change", () => {
      chk.checked ? capa.addTo(estado.mapa) : estado.mapa.removeLayer(capa);
      if (id === "chk-hex") dibujar();
    });
  }
  dibujar();
}

// Junta los reportes precargados y los del navegador, sin repetir ids, y redibuja.

// Protege los textos antes de mostrarlos como HTML.

function escaparHTML(valor) {

    return String(valor ?? "").replace(
        /[&<>"']/g,
        caracter => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        })[caracter]
    );

}


// Actualizar mapa, filtros e indicadores.

function dibujar() {

    const maximo = puntajeMaximo(estado.criterios);

    const vistos = new Set();

    const todos = [];

    // Unir reportes del repositorio y del navegador.

    for (const r of [...estado.base, ...leerLocales()]) {

        if (!r || typeof r !== "object") continue;

        if (typeof r.id !== "string" ||
            !r.id.trim()) continue;

        if (!Number.isFinite(r.lat) ||
            !Number.isFinite(r.lng)) continue;

        if (Math.abs(r.lat) > 90 ||
            Math.abs(r.lng) > 180) continue;

        if (vistos.has(r.id)) continue;

        const c = calcularCriticidad(
            r,
            estado.vias,
            estado.criterios
        );

        if (!c) continue;

        vistos.add(r.id);

        todos.push({
            ...r,
            criticidad: c
        });

    }

    // Aplicar los filtros seleccionados.

    const datos = typeof aplicarFiltros === "function"
        ? aplicarFiltros(todos)
        : todos;

    // Conservar los datos para futuras funcionalidades.

    estado.reportesTodos = todos;

    estado.reportesFiltrados = datos;

    // Actualizar el mapa de calor.

    estado.capaCalor.setLatLngs(

        datos.map(r => [

            r.lat,
            r.lng,
            r.criticidad.puntaje / maximo

        ])

    );

    // Actualizar los puntos individuales.

    estado.capaPuntos.clearLayers();

    for (const r of datos) {

        const categoria =
            CATEGORIAS[r.categoria] || r.categoria;

        const actor =
            ACTORES[r.actor] || r.actor;

        L.circleMarker([r.lat, r.lng], {

            radius: 7,

            color: "#ffffff",

            weight: 1.5,

            bubblingMouseEvents: false,

            fillColor: COLORES[r.criticidad.nivel],

            fillOpacity: 0.9,

            pane: "puntos"

        }).bindPopup(

            `<b>${escaparHTML(r.cuadra)}</b><br>` +

            `${escaparHTML(r.categoria_otro || categoria)}<br>` +

            `Actor: ${escaparHTML(r.actor_otro || actor)}<br>` +

            `Fecha: ${escaparHTML(r.fecha_hora.replace("T", " "))}<br>` +

            `Franja: ${escaparHTML(r.criticidad.franja)}<br>` +

            `Criticidad: <b>${r.criticidad.puntaje} ` +

            `(${escaparHTML(r.criticidad.nivel)})</b>`

        ).addTo(estado.capaPuntos);

    }

    // Actualizar los hexágonos con los mismos filtros.

    dibujarHexagonos(datos);

    // Actualizar indicadores estadísticos.

    if (typeof actualizarIndicadores === "function") {

        actualizarIndicadores(datos, todos.length);
      if (typeof actualizarResumen === "function") {

    actualizarResumen(datos);

}

    } else {

        document.getElementById("conteo").textContent =
            datos.length + " reportes";

    }

}


const COLORES_HEX = ["#fff5b1", "#fed976", "#feb24c", "#fd8d3c", "#f03b20", "#bd0026"];
const ANCHO_HEX = 50; // metros, punta arriba

function colorHex(fraccion) {
  const i = Math.min(COLORES_HEX.length - 1, Math.floor(fraccion * COLORES_HEX.length));
  return COLORES_HEX[i];
}

// Capa opcional: color = suma de puntajes de criticidad dentro de cada hexágono.
function dibujarHexagonos(datos) {
  if (!estado.capaHex) return;
  estado.capaHex.clearLayers();
  const leyenda = document.getElementById("leyenda-hex");
  const chk = document.getElementById("chk-hex");
  if (!chk || !chk.checked || !datos.length) {
    if (leyenda) leyenda.hidden = true;
    return;
  }
  const hexagonos = agruparEnHexagonos(datos, ANCHO_HEX, estado.origenHex);
  const sumaMaxima = hexagonos[0].suma;
  for (const h of hexagonos) {
    L.polygon(h.esquinas, {
      color: "#7f1d1d", weight: 1, fillColor: colorHex(h.suma / sumaMaxima),
      fillOpacity: 0.65, pane: "hexagonos",
    }).bindPopup(
      `<b>Hexágono de ${ANCHO_HEX} m</b><br>` +
      `Reportes: <b>${h.cantidad}</b><br>` +
      `Suma de criticidad: <b>${h.suma}</b><br>` +
      `<small>Ids: ${escaparHTML(h.ids.join(", "))}</small>`
    ).addTo(estado.capaHex);
  }
  if (leyenda) leyenda.hidden = false;
}

window.listo = iniciar().catch((err) => {
  document.getElementById("conteo").textContent =
    "Error: " + err.message + ". Usa Live Server o GitHub Pages, no doble clic.";
});
