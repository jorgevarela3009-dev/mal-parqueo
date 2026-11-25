
// filtros.js
// Filtros dinámicos e indicadores estadísticos.

const FILTROS = {

    cuadra: "fil-cuadra",
    categoria: "fil-categoria",
    actor: "fil-actor",
    franja: "fil-franja",
    nivel: "fil-nivel"

};

// Agregar opciones a los filtros.

function llenarFiltro(id, opciones) {

    const select = document.getElementById(id);

    if (!select) return;

    for (const [valor, texto] of Object.entries(opciones)) {

        select.add(new Option(texto, valor));

    }

}

// Obtener los filtros seleccionados.

function obtenerFiltros() {

    const valores = {};

    for (const [campo, id] of Object.entries(FILTROS)) {

        valores[campo] =
            document.getElementById(id)?.value || "";

    }

    return valores;

}

// Aplicar todos los filtros simultáneamente.

function aplicarFiltros(reportes) {

    const f = obtenerFiltros();

    return reportes.filter(r => {

        const cumpleCuadra =
            !f.cuadra || r.cuadra === f.cuadra;

        const cumpleCategoria =
            !f.categoria || r.categoria === f.categoria;

        const cumpleActor =
            !f.actor || r.actor === f.actor;

        const cumpleFranja =
            !f.franja || r.criticidad.franja === f.franja;

        const cumpleNivel =
            !f.nivel || r.criticidad.nivel === f.nivel;

        return cumpleCuadra
            && cumpleCategoria
            && cumpleActor
            && cumpleFranja
            && cumpleNivel;

    });

}

// Actualizar los indicadores del aplicativo.

function actualizarIndicadores(datos, total) {

    const cuadras = new Set(
        datos.map(r => r.cuadra)
    );

    const altos = datos.filter(
        r => r.criticidad.nivel === "Alto"
    ).length;

    const medios = datos.filter(
        r => r.criticidad.nivel === "Medio"
    ).length;

    const bajos = datos.filter(
        r => r.criticidad.nivel === "Bajo"
    ).length;

    const valores = {

        "conteo": datos.length + " reportes",
        "ind-cuadras": cuadras.size,
        "ind-alto": altos,
        "ind-medio": medios,
        "ind-bajo": bajos,

        "resultado-filtros":
            `Mostrando ${datos.length} de ${total} reportes`

    };

    for (const [id, valor] of Object.entries(valores)) {

        const elemento = document.getElementById(id);

        if (elemento) {
            elemento.textContent = valor;
        }

    }

    const aviso = document.getElementById("sin-resultados");

    if (aviso) {
        aviso.hidden = datos.length !== 0;
    }

}

// Inicializar los filtros cuando el mapa esté listo.

window.listo.then(() => {

    if (!estado.mapa || !estado.vias) return;

    const cuadras = {};

    for (const [id, via] of Object.entries(estado.vias)) {

        cuadras[id] = id + " - " + via.nombre;

    }

    llenarFiltro("fil-cuadra", cuadras);

    llenarFiltro("fil-categoria", CATEGORIAS);

    llenarFiltro("fil-actor", ACTORES);

    llenarFiltro("fil-franja", {

        pico: "Hora pico",
        valle: "Hora valle"

    });

    llenarFiltro("fil-nivel", {

        Alto: "Alto",
        Medio: "Medio",
        Bajo: "Bajo"

    });

    for (const id of Object.values(FILTROS)) {

        document.getElementById(id)
            .addEventListener("change", () => {

                dibujar();

            });

    }

    document.getElementById("btn-limpiar-filtros")
        .addEventListener("click", () => {

            for (const id of Object.values(FILTROS)) {

                document.getElementById(id).value = "";

            }

            dibujar();

        });

    dibujar();

});
