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
  // Leaflet.heat debe quedarse en overlayPane (z-index 400). Un pane propio
  // desincroniza el canvas en el zoom animado y el arrastre en móvil.
  estado.mapa.createPane("hexagonos");
  estado.mapa.getPane("hexagonos").style.zIndex = 450; // encima del calor
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
      if (id === "chk-calor") protegerCapaCalor();
      if (id === "chk-hex") dibujar();
    });
  }
  // Leaflet.heat 0.2.0 solo se realinea en zoomanim y moveend. En un pellizco,
  // Leaflet 1.9 no dispara zoomanim hasta soltar los dedos, así que se
  // redibuja el lienzo en zoom (sin reset a mitad de un arrastre).
  estado.mapa.on("zoom", alinearCapaCalor);
  protegerCapaCalor();
  dibujar();
}

// El lienzo de calor no debe interceptar toques ni clics (los puntos van encima).
function protegerCapaCalor() {
  const canvas = estado.capaCalor && estado.capaCalor._canvas;
  if (canvas) canvas.style.pointerEvents = "none";
}

// Solo se redibuja el calor cuando no hay animación CSS ni arrastre:
// un _reset o invalidateSize en ese momento lo despega del mapPane.
function alinearCapaCalor() {
  const mapa = estado.mapa;
  const heat = estado.capaCalor;
  if (!heat || !mapa || typeof heat._reset !== "function") return;
  if (mapa._animatingZoom) return;
  if (mapa.dragging && mapa.dragging.moving()) return;
  heat._reset();
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

    protegerCapaCalor();

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

        }).bindPopup(() => {
            const ficha = document.createElement('div');
            ficha.className = 'ficha-incidente';
            ficha.innerHTML = `<h3>Incidente · ${escaparHTML(r.cuadra)}</h3>` +
                `<dl><dt>Categoría</dt><dd>${escaparHTML(r.categoria_otro || categoria)}</dd>` +
                `<dt>Actor</dt><dd>${escaparHTML(r.actor_otro || actor)}</dd>` +
                `<dt>Fecha y hora</dt><dd>${escaparHTML(r.fecha_hora.replace('T',' '))}</dd>` +
                `<dt>Franja</dt><dd>${r.criticidad.franja === 'pico' ? 'Hora pico' : 'Hora valle'}</dd>` +
                `<dt>Criticidad</dt><dd><strong>${r.criticidad.puntaje} puntos · ${escaparHTML(r.criticidad.nivel)}</strong></dd></dl>`;
            ficha.append(fotoPopup(r));
            return ficha;
        }, {maxWidth: 300, minWidth: 190, maxHeight: 420, className: 'popup-incidente'}).addTo(estado.capaPuntos);

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

// Capa opcional: grilla completa de la zona. Color = suma de criticidad;
// las celdas vacías van en gris y no interceptan clics.
function dibujarHexagonos(datos) {
  if (!estado.capaHex) return;
  estado.capaHex.clearLayers();
  const leyenda = document.getElementById("leyenda-hex");
  const chk = document.getElementById("chk-hex");
  if (!chk || !chk.checked) {
    if (leyenda) leyenda.hidden = true;
    return;
  }
  const hexagonos = completarGrilla(datos, ANCHO_HEX, estado.origenHex, estado.vias, 1);
  const llenos = hexagonos.filter(h => h.cantidad > 0);
  const sumaMaxima = llenos.length ? llenos[0].suma : 0;
  for (const h of hexagonos) {
    if (h.cantidad === 0) {
      L.polygon(h.esquinas, {
        color: "#64748b", weight: 1, fillColor: "#cbd5e1",
        fillOpacity: 0.22, pane: "hexagonos", interactive: false
      }).addTo(estado.capaHex);
      continue;
    }
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
