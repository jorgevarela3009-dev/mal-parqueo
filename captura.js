
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

        const datos = JSON.parse(
            localStorage.getItem(CLAVE_LOCAL)
        );

        return Array.isArray(datos) ? datos : [];

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
let modoRegistro = false;

function activarRegistro(activo) {
    modoRegistro = activo;
    $("mapa").classList.toggle("modo-registro", activo);
    $("ayuda-mapa").textContent = activo ? "Selecciona una ubicación en el mapa o usa el GPS en el formulario." : "Explora el mapa o pulsa Reportar incidente para registrar una ubicación.";
}

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

    $("btn-guardar").disabled = true;
    caja.hidden = true;

    if (!punto || !via || !fechaValida(fecha)) {
        return;
    }

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

    caja.hidden = false;

    $("btn-guardar").disabled = false;

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
    $("panel").scrollIntoView({block: "start", behavior: "smooth"});

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
    if (!fechaValida($("f-hora").value)) {

    return msg("Selecciona una fecha y hora válidas.");

}

if (!Object.hasOwn(ACTORES, act)) {

    return msg("Selecciona un actor válido.");

}

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

    let foto;
    try { foto = fotoParaGuardar(); } catch(e) { return msg(e.message); }
    const rep = {

        id: "CI-" + crypto.randomUUID(),

        origen: $("f-campo").checked
            ? "campo"
            : "ciudadano",

        fecha_hora: $("f-hora").value,

        lat: +punto[0].toFixed(6),
        lng: +punto[1].toFixed(6),

        cuadra: via.id,
        via_nombre: via.nombre,
        via_tipo: via.tipo,
        via_fuente: via.fuente,

        categoria: cat,
        actor: act,
        foto,

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
        return msg("No se pudo guardar. Revisa el espacio disponible o elimina la foto e inténtalo nuevamente.");
    }

    dibujar();
    activarRegistro(false);
    limpiarFoto();
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

    $("panel").hidden = true;
    $("ayuda-mapa").textContent = "Reporte guardado en " + rep.cuadra + ". Selecciona un punto para consultar su información.";
    $("mapa").scrollIntoView({block: "center", behavior: "smooth"});
    msg(
        "Reporte guardado en " + rep.cuadra +
        ". Criticidad: " + c.puntaje +
        " (" + c.nivel + ")."
    );

}

window.listo.then(() => {

    if (!estado.mapa || !estado.capaPuntos) return;
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

        if (!modoRegistro) return;
        fijarPunto(e.latlng.lat, e.latlng.lng);

    });

    $("btn-abrir").addEventListener("click", () => {

        if (typeof modoCoordenadas !== "undefined"
            && modoCoordenadas) {
            $("btn-coordenadas").click();
        }

        limpiarFoto();
        limpiarUbicacion();

        $("f-hora").value = ahoraLocal();

        abrirPanel();

        activarRegistro(true);
        msg("Toca el mapa o usa tu ubicación.");
        $("mapa").scrollIntoView({block: "center", behavior: "smooth"});

    });

    $("btn-cerrar").addEventListener("click", () => {

        limpiarUbicacion();

        limpiarFoto();
        activarRegistro(false);
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

        if (!navigator.geolocation) return msg("GPS no disponible. Selecciona la ubicación en el mapa.");
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
