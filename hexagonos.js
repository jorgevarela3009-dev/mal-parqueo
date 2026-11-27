// hexagonos.js: agrupa reportes en hexágonos de 50 m (punta arriba).
// Solo geometría, sin librerías. mapa.js se encarga de pintarlos.
// Matemática según Red Blob Games: https://www.redblobgames.com/grids/hexagons/

// Misma proyección que Leaflet / OSM (EPSG:3857, Web Mercator).
// Así las celdas se calculan en un espacio independiente del zoom y
// coinciden con los puntos y las vías a cualquier nivel (no en una
// aproximación plana lat/lng, que se desalinea al alejar el mapa).
const RADIO_MERCATOR = 6378137;

// Origen fijo de la colmena (el centro de la zona en config.json),
// para que los hexágonos no se muevan al agregar o quitar reportes.
function origenDeCentro(centro) {
  return { lat: centro[0], lng: centro[1] };
}

function aMercator(lat, lng) {
  const x = RADIO_MERCATOR * (lng * Math.PI / 180);
  const y = RADIO_MERCATOR * Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360));
  return { x, y };
}

function deMercator(x, y) {
  const lng = (x / RADIO_MERCATOR) * 180 / Math.PI;
  const lat = (2 * Math.atan(Math.exp(y / RADIO_MERCATOR)) - Math.PI / 2) * 180 / Math.PI;
  return [lat, lng];
}

function aMetros(lat, lng, origen) {
  const p = aMercator(lat, lng);
  const o = aMercator(origen.lat, origen.lng);
  return { x: p.x - o.x, y: p.y - o.y };
}

function aLatLng(x, y, origen) {
  const o = aMercator(origen.lat, origen.lng);
  return deMercator(o.x + x, o.y + y);
}

// Ancho (lado plano a lado plano) = radio * sqrt(3) en hexágonos con punta arriba.
function radioDesdeAncho(anchoMetros) {
  return anchoMetros / Math.sqrt(3);
}

function hexagonoDePunto(x, y, radio) {
  const q = ((Math.sqrt(3) / 3) * x - (1 / 3) * y) / radio;
  const r = ((2 / 3) * y) / radio;
  return redondearHex(q, r);
}

function redondearHex(q, r) {
  const s = -q - r;
  let rq = Math.round(q), rr = Math.round(r), rs = Math.round(s);
  const dq = Math.abs(rq - q), dr = Math.abs(rr - r), ds = Math.abs(rs - s);
  if (dq > dr && dq > ds) rq = -rr - rs;
  else if (dr > ds) rr = -rq - rs;
  return { q: rq + 0, r: rr + 0 };
}

function centroDeHex(q, r, radio) {
  return { x: radio * Math.sqrt(3) * (q + r / 2), y: radio * 1.5 * r };
}

function esquinasDeHex(q, r, radio, origen) {
  const c = centroDeHex(q, r, radio);
  const esquinas = [];
  for (let i = 0; i < 6; i++) {
    const angulo = (Math.PI / 180) * (60 * i - 30); // punta arriba
    esquinas.push(aLatLng(c.x + radio * Math.cos(angulo), c.y + radio * Math.sin(angulo), origen));
  }
  return esquinas;
}

// Agrupa reportes (ya con criticidad.puntaje) en hexágonos de ancho dado.
function agruparEnHexagonos(reportes, anchoMetros, origen) {
  const radio = radioDesdeAncho(anchoMetros);
  const grupos = {};
  for (const rep of reportes) {
    const p = aMetros(rep.lat, rep.lng, origen);
    const h = hexagonoDePunto(p.x, p.y, radio);
    const clave = h.q + "," + h.r;
    if (!grupos[clave]) grupos[clave] = { q: h.q, r: h.r, cantidad: 0, suma: 0, ids: [] };
    grupos[clave].cantidad += 1;
    grupos[clave].suma += rep.criticidad.puntaje;
    grupos[clave].ids.push(rep.id);
  }
  return Object.values(grupos).map((g) => {
    const c = centroDeHex(g.q, g.r, radio);
    g.centro = aLatLng(c.x, c.y, origen);
    g.esquinas = esquinasDeHex(g.q, g.r, radio, origen);
    return g;
  }).sort((a, b) => b.suma - a.suma);
}

// Caja en metros, respecto al origen, que envuelve todas las cuadras de vias.json.
function cajaDeVias(vias, origen) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const via of Object.values(vias)) {
    for (const ll of (via.trazo || [])) {
      const p = aMetros(ll[0], ll[1], origen);
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }
  }
  return { minX, minY, maxX, maxY };
}

// Celdas que cubren la zona: caja de las cuadras + margenHex hexágonos.
// No depende de los reportes, así la grilla queda fija al filtrar.
function grillaDeZona(vias, anchoMetros, origen, margenHex) {
  if (margenHex === undefined) margenHex = 1;
  const radio = radioDesdeAncho(anchoMetros);
  const caja = cajaDeVias(vias, origen);
  const margen = margenHex * anchoMetros;
  const minX = caja.minX - margen, maxX = caja.maxX + margen;
  const minY = caja.minY - margen, maxY = caja.maxY + margen;
  const pasoX = radio * Math.sqrt(3);
  const pasoY = radio * 1.5;
  const rMin = Math.floor(minY / pasoY) - 2;
  const rMax = Math.ceil(maxY / pasoY) + 2;
  const lista = [];
  for (let r = rMin; r <= rMax; r++) {
    const qMin = Math.floor(minX / pasoX - r / 2) - 2;
    const qMax = Math.ceil(maxX / pasoX - r / 2) + 2;
    for (let q = qMin; q <= qMax; q++) {
      const c = centroDeHex(q, r, radio);
      if (c.x + radio < minX || c.x - radio > maxX || c.y + radio < minY || c.y - radio > maxY) continue;
      lista.push({
        q: q + 0, r: r + 0, cantidad: 0, suma: 0, ids: [],
        centro: aLatLng(c.x, c.y, origen),
        esquinas: esquinasDeHex(q, r, radio, origen)
      });
    }
  }
  return lista;
}

// Une la grilla fija de la zona con los reportes (filtrados).
// Las celdas sin reportes quedan en 0; las que sí tienen heredan cantidad, suma e ids.
function completarGrilla(reportes, anchoMetros, origen, vias, margenHex) {
  const llenos = {};
  for (const h of agruparEnHexagonos(reportes, anchoMetros, origen)) {
    llenos[h.q + "," + h.r] = h;
  }
  return grillaDeZona(vias, anchoMetros, origen, margenHex).map((celda) => {
    const d = llenos[celda.q + "," + celda.r];
    if (d) { celda.cantidad = d.cantidad; celda.suma = d.suma; celda.ids = d.ids; }
    return celda;
  }).sort((a, b) => b.suma - a.suma);
}
