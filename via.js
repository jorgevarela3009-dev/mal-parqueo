
// via.js: detección automática de cuadras estudiadas.

// Distancia máxima permitida desde el eje de la vía.
const DISTANCIA_MAXIMA_VIA = 25;

// Calcula la distancia entre un punto y un segmento.
function distanciaASegmentoM(p, a, b) {

    const k = 111320;
    const cx = Math.cos(p[0] * Math.PI / 180);

    const px = p[1] * k * cx;
    const py = p[0] * k;

    const ax = a[1] * k * cx;
    const ay = a[0] * k;

    const bx = b[1] * k * cx;
    const by = b[0] * k;

    const dx = bx - ax;
    const dy = by - ay;

    let t = ((px - ax) * dx + (py - ay) * dy)
        / (dx * dx + dy * dy || 1);

    t = Math.max(0, Math.min(1, t));

    return Math.hypot(
        px - (ax + t * dx),
        py - (ay + t * dy)
    );
}

// Busca la cuadra más cercana.
function buscarEnViasJson(
    punto,
    vias,
    maxM = DISTANCIA_MAXIMA_VIA
) {

    let mejor = null;

    for (const [id, v] of Object.entries(vias)) {

        if (!Array.isArray(v.trazo) ||
            v.trazo.length < 2) continue;

        for (let i = 0; i < v.trazo.length - 1; i++) {

            const d = distanciaASegmentoM(
                punto,
                v.trazo[i],
                v.trazo[i + 1]
            );

            if (d <= maxM && (!mejor || d < mejor.d)) {

                mejor = {
                    id: id,
                    tipo: v.tipo,
                    nombre: v.nombre || id,
                    zona: v.zona,
                    d: d,
                    fuente: "vias.json"
                };

            }

        }

    }

    return mejor;

}

// Resuelve la vía utilizando únicamente los datos del equipo.
async function resolverVia(punto, vias, criterios) {

    return buscarEnViasJson(punto, vias);

}
