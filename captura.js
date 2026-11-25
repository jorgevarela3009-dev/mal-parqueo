
const CLAVE_LOCAL = "reportes_locales";

const CATEGORIAS = {
    doble_fila: "Doble fila o parqueo prohibido",
    bloqueo_rampa_cebra_paradero: "Bloqueo de rampa, cebra o paradero",
    invasion_anden: "Invasión de andén",
    otro: "Otro (especificar)"
};

const ACTORES = {
    vehiculo_particular: "Vehículo particular",
    motocicleta: "Motocicleta",
    vehiculo_carga: "Vehículo de carga descargando",
    mobiliario_comercial: "Mobiliario comercial",
    otro: "Otro (especificar)"
};

function leerLocales() {
    try {
        return JSON.parse(
            localStorage.getItem(CLAVE_LOCAL)
        ) || [];
    } catch (e) {
        return [];
    }
}

function guardarLocales(lista) {
    localStorage.setItem(
        CLAVE_LOCAL,
        JSON.stringify(lista)
    );
}

const $ = (id) => document.getElementById(id);

let punto = null;
let marcador = null;
let via = null;
let consulta = 0;

function msg(t) {
    $("msg").textContent = t;
}

function ahoraLocal() {
    const d = new Date();
    const p = n => String(n).padStart(2, "0");

    return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

function llenar(sel, opciones) {
    for (const [v, t] of Object.entries(opciones)) {
        sel.add(new Option(t, v));
    }
}

function abrirPanel() {
    $("panel").hidden = false;

    if (!$("f-hora").value) {
        $("f-hora").value = ahoraLocal();
    }

    estado.mapa.invalidateSize();
    actualizarCriticidad();
}

function mostrarVia() {

    const tarjeta = $("info-via");

    tarjeta.hidden = !punto;

    if (!punto) return;

    tarjeta.classList.toggle("via-invalida", !via);

    $("via-codigo").textContent =
        via ? via.id : "Fuera de la zona";

    $("via-nombre").textContent =
        via ? via.nombre : "Ubicación no admitida";

    $("via-tipo").textContent =
        via ? via.tipo : "No identificado";

    $("via-estado").textContent =
        via
        ? "Ubicación dentro de la zona estudiada"
        : "Selecciona un punto sobre las vías estudiadas";

}

function actualizarCriticidad() {

    const caja = $("info-criticidad");
    const fecha = $("f-hora").value;

    $("btn-guardar").disabled = !punto || !via;

    caja.hidden = !via || !fecha;

    if (!via || !fecha) return;

    const temporal = {
        cuadra: via.id,
        via_tipo: via.tipo,
        categoria: $("f-categoria").value,
        fecha_hora: fecha
    };

    const c = calcularCriticidad(
        temporal,
        estado.vias,
        estado.criterios
    );

    if (!c) return;

    $("franja-detectada").textContent =
        c.franja === "pico"
        ? "Hora pico"
        : "Hora valle";

    $("puntaje-detectado").textContent =
        c.puntaje + " puntos";

    $("nivel-detectado").textContent = c.nivel;

    caja.dataset.nivel = c.nivel;

}

async function fijarPunto(lat, lng) {

    punto = [lat, lng];
    via = null;

    const mia = ++consulta;

    if (marcador) {
        marcador.setLatLng(punto);
    } else {
        marcador = L.marker(punto).addTo(estado.mapa);
    }

    estado.mapa.panTo(punto);

    abrirPanel();

    $("info-via").hidden = true;

    msg("Identificando la cuadra...");

    const r = await resolverVia(
        punto,
        estado.vias,
        estado.criterios
    );

    if (mia !== consulta) return;

    via = r;

    mostrarVia();
    actualizarCriticidad();

    if (via) {
        msg("Ubicación validada correctamente.");
    } else {
        msg("No se permiten reportes fuera de la zona estudiada.");
    }

}

function limpiarUbicacion() {

    punto = null;
    via = null;
    consulta++;

    if (marcador) {
        estado.mapa.removeLayer(marcador);
        marcador = null;
    }

    $("info-via").hidden = true;
    $("info-criticidad").hidden = true;
    $("btn-guardar").disabled = true;

}

function guardar() {

    if (!punto) {
        return msg("Marca la ubicación primero.");
    }

    if (!via) {
        return msg("Selecciona una vía estudiada.");
    }

    const cat = $("f-categoria").value;
    const act = $("f-actor").value;

    if (estado.criterios.categoria[cat] === undefined) {
        return msg("Categoría no configurada.");
    }

    if (cat === "otro" &&
        !$("f-categoria-otro").value.trim()) {
        return msg("Describe la obstrucción.");
    }

    if (act === "otro" &&
        !$("f-actor-otro").value.trim()) {
        return msg("Describe el actor.");
    }

    const rep = {

        id: "CI-" + crypto.randomUUID(),

        origen: $("f-campo").checked
            ? "campo"
            : "ciudadano",

        fecha_hora: $("f-hora").value || ahoraLocal(),

        lat: +punto[0].toFixed(6),
        lng: +punto[1].toFixed(6),

        cuadra: via.id,
        via_nombre: via.nombre,
        via_tipo: via.tipo,
        via_fuente: via.fuente,

        categoria: cat,
        actor: act,
        foto: "",

        categoria_otro: cat === "otro"
            ? $("f-categoria-otro").value.trim()
            : "",

        actor_otro: act === "otro"
            ? $("f-actor-otro").value.trim()
            : ""

    };

    const c = calcularCriticidad(
        rep,
        estado.vias,
        estado.criterios
    );

    if (!c) {
        return msg("No se pudo calcular la criticidad.");
    }

    rep.franja = c.franja;
    rep.puntaje = c.puntaje;
    rep.nivel = c.nivel;

    try {
        guardarLocales([...leerLocales(), rep]);
    } catch (e) {
        return msg("No se pudo guardar el reporte.");
    }

    dibujar();

    limpiarUbicacion();

    $("f-hora").value = ahoraLocal();

    for (const id of [
        "f-categoria-otro",
        "f-actor-otro"
    ]) {
        $(id).value = "";
        $(id).hidden = true;
    }

    $("f-categoria").selectedIndex = 0;
    $("f-actor").selectedIndex = 0;

    msg(
        "Reporte guardado en " + rep.cuadra +
        ". Criticidad: " + c.puntaje +
        " (" + c.nivel + ")."
    );

}

window.listo.then(() => {

    llenar($("f-categoria"), CATEGORIAS);
    llenar($("f-actor"), ACTORES);

    $("f-categoria").addEventListener("change", () => {

        $("f-categoria-otro").hidden =
            $("f-categoria").value !== "otro";

        actualizarCriticidad();

    });

    $("f-actor").addEventListener("change", () => {

        $("f-actor-otro").hidden =
            $("f-actor").value !== "otro";

    });

    $("f-hora").addEventListener(
        "input",
        actualizarCriticidad
    );

    estado.mapa.on("click", (e) => {

        if (typeof modoCoordenadas !== "undefined"
            && modoCoordenadas) {
            return;
        }

        fijarPunto(e.latlng.lat, e.latlng.lng);

    });

    $("btn-abrir").addEventListener("click", () => {

        if (typeof modoCoordenadas !== "undefined"
            && modoCoordenadas) {
            $("btn-coordenadas").click();
        }

        limpiarUbicacion();

        $("f-hora").value = ahoraLocal();

        abrirPanel();

        msg("Toca el mapa o usa tu ubicación.");

    });

    $("btn-cerrar").addEventListener("click", () => {

        limpiarUbicacion();

        $("panel").hidden = true;

        estado.mapa.invalidateSize();

    });

    $("btn-guardar").addEventListener(
        "click",
        guardar
    );

    $("btn-gps").addEventListener("click", () => {

        limpiarUbicacion();

        msg("Buscando tu ubicación...");

        const solicitud = consulta;

        navigator.geolocation.getCurrentPosition(

            (p) => {

                if (solicitud !== consulta ||
                    $("panel").hidden) return;

                fijarPunto(
                    p.coords.latitude,
                    p.coords.longitude
                );

            },

            () => {
                if (solicitud === consulta) {
                    msg("No se pudo obtener tu ubicación. Toca el mapa.");
                }
            },

            {
                enableHighAccuracy: true,
                timeout: 10000
            }

        );

    });

    $("btn-guardar").disabled = true;

});
