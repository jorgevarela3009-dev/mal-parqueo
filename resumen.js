
// resumen.js
// Ranking de cuadras y recomendaciones operativas.

// Obtener los valores predominantes.

function predominante(valores) {

    const conteos = new Map();

    for (const valor of valores) {

        if (!valor) continue;

        conteos.set(
            valor,
            (conteos.get(valor) || 0) + 1
        );

    }

    const ordenados = [...conteos.entries()]
        .sort((a, b) =>
            b[1] - a[1] ||
            a[0].localeCompare(b[0])
        );

    if (!ordenados.length) return "";

    return ordenados
        .filter(x => x[1] === ordenados[0][1])
        .map(x => x[0])
        .join(" / ");

}


// Agrupar incidentes por cuadra.

function calcularRanking(reportes) {

    const grupos = new Map();

    for (const r of reportes) {

        if (!Object.hasOwn(estado.vias, r.cuadra)) {
            continue;
        }

        if (!Number.isFinite(r.criticidad?.puntaje)) {
            continue;
        }

        if (!grupos.has(r.cuadra)) {

            grupos.set(r.cuadra, {

                id: r.cuadra,

                nombre: estado.vias[r.cuadra].nombre,

                cantidad: 0,

                puntaje: 0,

                altos: 0,

                categorias: [],

                franjas: []

            });

        }

        const grupo = grupos.get(r.cuadra);

        grupo.cantidad++;

        grupo.puntaje += r.criticidad.puntaje;

        if (r.criticidad.nivel === "Alto") {
            grupo.altos++;
        }

        grupo.categorias.push(r.categoria);

        grupo.franjas.push(r.criticidad.franja);

    }

    return [...grupos.values()]

        .map(g => ({

            ...g,

            categoria: predominante(g.categorias),

            franja: predominante(g.franjas),

            promedio: g.puntaje / g.cantidad

        }))

        .sort((a, b) =>

            b.puntaje - a.puntaje ||

            b.cantidad - a.cantidad ||

            a.id.localeCompare(b.id)

        )

        .slice(0, 5);

}


// Mostrar nombres comprensibles.

function nombreCategoria(categoria) {

    return categoria.split(" / ")

        .map(c => CATEGORIAS[c] || c)

        .join(" / ");

}


function nombreFranja(franja) {

    if (franja === "pico") return "Hora pico";

    if (franja === "valle") return "Hora valle";

    return "Pico y valle";

}


// Generar recomendaciones mediante reglas.

function generarRecomendacion(cuadra) {

    const reglas = {

        doble_fila:

            "Reforzar el control de estacionamiento, " +
            "realizar vigilancia vial y promover " +
            "el uso de zonas autorizadas de parqueo.",

        bloqueo_rampa_cebra_paradero:

            "Priorizar la liberación de rampas, " +
            "cruces peatonales y paraderos, " +
            "garantizando la accesibilidad.",

        invasion_anden:

            "Realizar acciones de recuperación " +
            "del espacio peatonal y sensibilización " +
            "sobre el uso adecuado de los andenes.",

        otro:

            "Inspeccionar las obstrucciones registradas " +
            "y definir medidas según su naturaleza."

    };

    const acciones = cuadra.categoria

        .split(" / ")

        .map(c => reglas[c] ||

            "Verificar la situación en campo.")

        .join(" ");

    const horario = cuadra.franja === "pico"

        ? "durante las horas pico"

        : cuadra.franja === "valle"

        ? "durante las horas valle"

        : "durante ambas franjas horarias";

    return `Priorizar la cuadra ${cuadra.id} ` +

        `${horario}, debido a sus ` +

        `${cuadra.cantidad} incidentes y ` +

        `${cuadra.puntaje} puntos acumulados ` +

        `de criticidad. ${acciones}`;

}


// Crear elementos sin interpretar HTML externo.

function elementoResumen(etiqueta, texto, clase) {

    const e = document.createElement(etiqueta);

    if (texto !== undefined) {
        e.textContent = texto;
    }

    if (clase) {
        e.className = clase;
    }

    return e;

}


// Dibujar gráfico de barras.

function dibujarRanking(ranking) {

    const contenedor =
        document.getElementById("grafico-ranking");

    contenedor.replaceChildren();

    if (!ranking.length) {

        contenedor.appendChild(

            elementoResumen(
                "p",
                "No hay incidentes para generar el ranking."
            )

        );

        return;

    }

    const maximo = ranking[0].puntaje || 1;

    ranking.forEach((r, i) => {

        const fila = elementoResumen(
            "div", undefined, "ranking-fila"
        );

        const encabezado = elementoResumen(
            "div", undefined, "ranking-encabezado"
        );

        encabezado.append(

            elementoResumen(
                "strong",
                `${i + 1}. ${r.id}`
            ),

            elementoResumen(
                "strong",
                `${r.puntaje} puntos`
            )

        );

        const fondo = elementoResumen(
            "div", undefined, "ranking-fondo"
        );

        const barra = elementoResumen(
            "div", undefined, "ranking-barra"
        );

        barra.style.width =
            `${r.puntaje / maximo * 100}%`;

        if (i === 0) {
            barra.classList.add("ranking-prioritaria");
        }

        fondo.appendChild(barra);

        const detalle = elementoResumen(

            "small",

            `${r.cantidad} incidentes · ` +
            `${nombreCategoria(r.categoria)}`

        );

        fila.append(encabezado, fondo, detalle);

        contenedor.appendChild(fila);

    });

}


// Dibujar tabla del ranking.

function dibujarTablaRanking(ranking) {

    const cuerpo =
        document.getElementById("tabla-ranking");

    cuerpo.replaceChildren();

    for (const [i, r] of ranking.entries()) {

        const fila = document.createElement("tr");

        const valores = [

            i + 1,

            r.id,

            r.cantidad,

            r.puntaje,

            r.promedio.toFixed(2),

            r.altos,

            nombreCategoria(r.categoria),

            nombreFranja(r.franja)

        ];

        for (const valor of valores) {

            fila.appendChild(
                elementoResumen("td", valor)
            );

        }

        cuerpo.appendChild(fila);

    }

    if (!ranking.length) {

        const fila = document.createElement("tr");

        const celda = elementoResumen(
            "td",
            "Sin incidentes para los filtros seleccionados."
        );

        celda.colSpan = 8;

        fila.appendChild(celda);

        cuerpo.appendChild(fila);

    }

}


// Mostrar filtros utilizados en el informe.

function descripcionFiltrosResumen() {

    const ids = [

        "fil-cuadra",

        "fil-categoria",

        "fil-actor",

        "fil-franja",

        "fil-nivel"

    ];

    const activos = [];

    for (const id of ids) {

        const select = document.getElementById(id);

        if (select && select.value) {

            activos.push(
                select.options[select.selectedIndex].text
            );

        }

    }

    return activos.length

        ? activos.join(" | ")

        : "Todos los reportes";

}



// Comparación pico vs valle por cuadra, con los reportes ya filtrados.
function contarPicoVallePorCuadra(reportes) {
    const grupos = new Map();

    for (const r of reportes || []) {
        if (!r || !r.cuadra) continue;
        if (!grupos.has(r.cuadra)) {
            grupos.set(r.cuadra, { cuadra: r.cuadra, pico: 0, valle: 0 });
        }
        const g = grupos.get(r.cuadra);
        const f = r.criticidad && r.criticidad.franja;
        if (f === "pico") g.pico += 1;
        else if (f === "valle") g.valle += 1;
    }

    return [...grupos.values()].map(g => {
        const info = estado.vias && estado.vias[g.cuadra];
        return {
            cuadra: g.cuadra,
            nombre: info ? info.nombre : g.cuadra,
            pico: g.pico,
            valle: g.valle,
            total: g.pico + g.valle
        };
    }).sort((a, b) =>
        (b.total - a.total) ||
        (b.pico - a.pico) ||
        a.cuadra.localeCompare(b.cuadra)
    );
}

function escaparXml(s) {
    return String(s == null ? "" : s)
        .replace(/&/g, "&amp;").replace(/</g, "&lt;")
        .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// Barras horizontales agrupadas (pico y valle) en SVG, sin dependencias nuevas.
function dibujarGraficaPicoValle(contenedor, filas) {
    if (!contenedor) return;
    if (!filas || !filas.length) {
        contenedor.replaceChildren(
            elementoResumen("p", "No hay reportes con estos filtros para comparar pico y valle.", "nota-resumen")
        );
        return;
    }

    let max = 0, totalPico = 0, totalValle = 0;
    for (const f of filas) {
        if (f.pico > max) max = f.pico;
        if (f.valle > max) max = f.valle;
        totalPico += f.pico;
        totalValle += f.valle;
    }
    if (max < 1) max = 1;

    const ancho = 400, margenIzq = 118, margenDer = 28, tope = 28;
    const altoFila = 44, altoBarra = 12, hueco = 4;
    const alto = tope + filas.length * altoFila + 8;
    const maxBarra = ancho - margenIzq - margenDer;
    const partes = [];
    partes.push("<svg class='svg-pico-valle' viewBox='0 0 " + ancho + " " + alto + "' width='100%' height='" + alto + "' role='img' aria-label='Reportes en hora pico y hora valle por cuadra'>");
    partes.push("<rect width='" + ancho + "' height='" + alto + "' fill='transparent'/>");
    partes.push("<rect x='0' y='6' width='10' height='10' rx='2' fill='#c2410c'/>");
    partes.push("<text x='14' y='15' font-size='11' fill='#1f2937'>Hora pico (" + totalPico + ")</text>");
    partes.push("<rect x='130' y='6' width='10' height='10' rx='2' fill='#0f3d63'/>");
    partes.push("<text x='144' y='15' font-size='11' fill='#1f2937'>Hora valle (" + totalValle + ")</text>");

    filas.forEach((f, i) => {
        const y = tope + i * altoFila;
        partes.push("<g>");
        partes.push("<title>" + escaparXml(f.nombre) + " · pico " + f.pico + " · valle " + f.valle + "</title>");
        partes.push("<text x='" + (margenIzq - 8) + "' y='" + (y + 16) + "' text-anchor='end' font-size='10' font-weight='600' fill='#1f2937'>" + escaparXml(f.cuadra) + "</text>");
        let wPico = Math.round((f.pico / max) * maxBarra);
        let wValle = Math.round((f.valle / max) * maxBarra);
        if (f.pico > 0 && wPico < 2) wPico = 2;
        if (f.valle > 0 && wValle < 2) wValle = 2;
        partes.push("<rect x='" + margenIzq + "' y='" + y + "' width='" + wPico + "' height='" + altoBarra + "' rx='2' fill='#c2410c'/>");
        partes.push("<text x='" + (margenIzq + wPico + 4) + "' y='" + (y + 10) + "' font-size='10' fill='#1f2937'>" + f.pico + "</text>");
        partes.push("<rect x='" + margenIzq + "' y='" + (y + altoBarra + hueco) + "' width='" + wValle + "' height='" + altoBarra + "' rx='2' fill='#0f3d63'/>");
        partes.push("<text x='" + (margenIzq + wValle + 4) + "' y='" + (y + altoBarra + hueco + 10) + "' font-size='10' fill='#1f2937'>" + f.valle + "</text>");
        partes.push("</g>");
    });
    partes.push("</svg>");
    contenedor.innerHTML = partes.join("");
}


// Actualizar todo el resumen operativo.

function actualizarResumen(reportes) {

    const panel =
        document.getElementById("resumen-operativo");

    if (!panel) return;

    const datos = reportes.filter(r =>

        Object.hasOwn(estado.vias, r.cuadra) &&

        Number.isFinite(r.criticidad?.puntaje)

    );

    const ranking = calcularRanking(datos);

    const totalPuntos = datos.reduce(

        (total, r) =>
            total + r.criticidad.puntaje,

        0

    );

    document.getElementById(
        "res-total-incidentes"
    ).textContent = datos.length;

    document.getElementById(
        "res-total-puntos"
    ).textContent = totalPuntos;

    document.getElementById(
        "res-cuadra-prioritaria"
    ).textContent = ranking.length

        ? ranking[0].id

        : "Sin datos";

    document.getElementById(
        "res-filtros"
    ).textContent = descripcionFiltrosResumen();

    document.getElementById(
        "res-fecha"
    ).textContent = new Date()

        .toLocaleString("es-CO", {

            timeZone: "America/Bogota"

        });

    const excluidos = reportes.length - datos.length;
    const aviso = document.getElementById("res-excluidos");
    aviso.hidden = excluidos === 0;
    aviso.textContent = `${excluidos} reportes visibles no tienen una cuadra reconocida y no se incluyen en el ranking.`;

    dibujarRanking(ranking);

    dibujarTablaRanking(ranking);

    dibujarGraficaPicoValle(
        document.getElementById("grafica-pico-valle"),
        contarPicoVallePorCuadra(datos)
    );

    const recomendaciones = document.getElementById(
        "recomendaciones-resumen"
    );

    recomendaciones.replaceChildren();

    if (!ranking.length) {

        recomendaciones.appendChild(

            elementoResumen(

                "p",

                "No hay información suficiente " +
                "para generar recomendaciones."

            )

        );

    } else {

        ranking.forEach(r => {

            const tarjeta = elementoResumen(
                "div",
                undefined,
                "recomendacion-item"
            );

            tarjeta.append(

                elementoResumen("strong", r.id),

                elementoResumen(
                    "p",
                    generarRecomendacion(r)
                )

            );

            recomendaciones.appendChild(tarjeta);

        });

    }

    estado.rankingCuadras = ranking;

}


// Inicializar resumen e impresión.

window.listo.then(() => {

    const boton = document.getElementById(
        "btn-imprimir-resumen"
    );

    if (boton) {

        boton.addEventListener("click", () => {

            actualizarResumen(
                estado.reportesFiltrados || []
            );

            window.print();

        });

    }

    actualizarResumen(
        estado.reportesFiltrados || []
    );

});
