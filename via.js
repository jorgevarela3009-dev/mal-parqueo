// via.js: dado un punto del mapa, decide la cuadra y el tipo de vía.
// 1) Busca en vias.json la cuadra clasificada por el equipo (campo "trazo").
// 2) Si no hay, consulta OpenStreetMap (necesita internet).
// 3) Si tampoco, devuelve null y la pantalla pide el tipo de vía.

// Distancia en metros de un punto a un segmento (aproximación plana, sirve en una ciudad).
function distanciaASegmentoM(p, a, b) {
  const k = 111320, cx = Math.cos((p[0] * Math.PI) / 180);
  const px = p[1] * k * cx, py = p[0] * k;
  const ax = a[1] * k * cx, ay = a[0] * k;
  const bx = b[1] * k * cx, by = b[0] * k;
  const dx = bx - ax, dy = by - ay;
  let t = ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy || 1);
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

function buscarEnViasJson(punto, vias, maxM = 40) {
  let mejor = null;
  for (const [id, v] of Object.entries(vias)) {      // para cada cuadra...
    if (!v.trazo) continue;
    const d = distanciaASegmentoM(punto, v.trazo[0], v.trazo[1]);
    if (d <= maxM && (!mejor || d < mejor.d)) {      // ...si está cerca y es la más cercana
      mejor = { id, tipo: v.tipo, nombre: v.nombre || id, d, fuente: "vias.json" };
    }
  }
  return mejor;
}

async function consultarOSM(punto, criterios) {
  const url = "https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=17&accept-language=es" +
    `&lat=${punto[0]}&lon=${punto[1]}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error("OSM no respondió");
  const d = await r.json();
  const nombre = d.name || (d.address && d.address.road);
  if (!nombre) throw new Error("sin nombre de vía");
  const arteriales = criterios.osm_arterial || ["motorway", "trunk", "primary", "secondary"];
  return { id: "OSM-" + nombre, nombre, tipo: arteriales.includes(d.type) ? "arterial" : "secundaria", fuente: "osm" };
}

async function resolverVia(punto, vias, criterios) {
  const local = buscarEnViasJson(punto, vias);
  if (local) return local;
  try { return await consultarOSM(punto, criterios); }
  catch (e) { return null; }
}
