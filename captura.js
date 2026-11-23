// captura.js: ubicación, formulario y guardado en localStorage.

const CLAVE_LOCAL = "reportes_locales";
const CATEGORIAS = {
  doble_fila: "Doble fila o parqueo prohibido",
  bloqueo_rampa_cebra_paradero: "Bloqueo de rampa, cebra o paradero",
  invasion_anden: "Invasión de andén",
};
const ACTORES = {
  vehiculo_particular: "Vehículo particular", motocicleta: "Motocicleta",
  vehiculo_carga: "Vehículo de carga descargando", mobiliario_comercial: "Mobiliario comercial",
};

function leerLocales() {
  try { return JSON.parse(localStorage.getItem(CLAVE_LOCAL)) || []; } catch (e) { return []; }
}
function guardarLocales(lista) { localStorage.setItem(CLAVE_LOCAL, JSON.stringify(lista)); }

const $ = (id) => document.getElementById(id);
let punto = null, marcador = null, via = null, consulta = 0;

function msg(t) { $("msg").textContent = t; }
function ahoraLocal() {
  const d = new Date(), p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}
function llenar(sel, opciones) {
  for (const [v, t] of Object.entries(opciones)) sel.add(new Option(t, v));
}

function abrirPanel() {
  $("panel").hidden = false;
  if (!$("f-hora").value) $("f-hora").value = ahoraLocal();
  estado.mapa.invalidateSize();
}

async function fijarPunto(lat, lng) {
  punto = [lat, lng];
  if (marcador) marcador.setLatLng(punto); else marcador = L.marker(punto).addTo(estado.mapa);
  estado.mapa.panTo(punto);
  abrirPanel();
  via = null; $("f-via").hidden = true;
  const mia = ++consulta;                       // evita que una respuesta vieja pise a la nueva
  msg("Buscando la vía…");
  const r = await resolverVia(punto, estado.vias, estado.criterios);
  if (mia !== consulta) return;
  via = r;
  if (r) msg(`Vía: ${r.nombre} (${r.tipo}, según ${r.fuente})`);
  else { msg("No se pudo detectar la vía. Elige el tipo."); $("f-via").hidden = false; }
}

function guardar() {
  if (!punto) return msg("Marca la ubicación primero.");
  const tipo = via ? via.tipo : $("f-via").value;
  if (!tipo) return msg("Elige el tipo de vía.");
  const rep = {
    id: "CI-" + Date.now().toString(36),
    origen: $("f-campo").checked ? "campo" : "ciudadano",
    fecha_hora: $("f-hora").value || ahoraLocal(),
    lat: +punto[0].toFixed(5), lng: +punto[1].toFixed(5),
    cuadra: via ? via.id : "SIN-CUADRA", via_tipo: tipo, via_fuente: via ? via.fuente : "manual",
    categoria: $("f-categoria").value, actor: $("f-actor").value, foto: "",
  };
  guardarLocales([...leerLocales(), rep]);
  const c = calcularCriticidad(rep, estado.vias, estado.criterios);
  dibujar();
  msg(`Guardado. Criticidad: ${c.puntaje} (${c.nivel}).`);
  punto = null; via = null; consulta++;
  if (marcador) { estado.mapa.removeLayer(marcador); marcador = null; }
  $("f-hora").value = ahoraLocal();
}

window.listo.then(() => {
  llenar($("f-categoria"), CATEGORIAS);
  llenar($("f-actor"), ACTORES);
  estado.mapa.on("click", (e) => fijarPunto(e.latlng.lat, e.latlng.lng));
  $("btn-abrir").addEventListener("click", () => { abrirPanel(); msg("Toca el mapa o usa tu ubicación."); });
  $("btn-cerrar").addEventListener("click", () => { $("panel").hidden = true; estado.mapa.invalidateSize(); });
  $("btn-guardar").addEventListener("click", guardar);
  $("btn-gps").addEventListener("click", () => {
    msg("Buscando tu ubicación…");
    navigator.geolocation.getCurrentPosition(
      (p) => fijarPunto(p.coords.latitude, p.coords.longitude),
      () => msg("No se pudo obtener tu ubicación. Toca el mapa."),
      { enableHighAccuracy: true, timeout: 10000 });
  });
});
