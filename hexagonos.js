// hexagonos.js: agrupa reportes en hexágonos de 50 m (punta arriba).
// Solo geometría, sin librerías. mapa.js se encarga de pintarlos.
// Matemática según Red Blob Games: https://www.redblobgames.com/grids/hexagons/

const METROS_POR_GRADO = 111320;

// Origen fijo de la colmena (el centro de la zona en config.json),
// para que los hexágonos no se muevan al agregar o quitar reportes.
function origenDeCentro(centro) {
  return { lat: centro[0], lng: centro[1] };
}

function aMetros(lat, lng, origen) {
  const mLng = METROS_POR_GRADO * Math.cos((origen.lat * Math.PI) / 180);
  return { x: (lng - origen.lng) * mLng, y: (lat - origen.lat) * METROS_POR_GRADO };
}

function aLatLng(x, y, origen) {
  const mLng = METROS_POR_GRADO * Math.cos((origen.lat * Math.PI) / 180);
  return [origen.lat + y / METROS_POR_GRADO, origen.lng + x / mLng];
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
