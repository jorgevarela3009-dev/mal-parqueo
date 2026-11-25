
// criticidad.js
// Cálculo y validación de criticidad de incidentes.

function aMinutos(hhmm) {

    const [h, m] = hhmm.split(":").map(Number);

    return h * 60 + m;

}

// Verifica que la fecha y hora sean válidas.

function fechaValida(fechaHora) {

    if (typeof fechaHora !== "string") {
        return false;
    }

    const partes = fechaHora.match(
        /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/
    );

    if (!partes) return false;

    const [, anio, mes, dia, hora, minuto, segundo] =
        partes;

    const fecha = new Date(
        Number(anio),
        Number(mes) - 1,
        Number(dia),
        Number(hora),
        Number(minuto),
        Number(segundo || 0)
    );

    return fecha.getFullYear() === Number(anio)
        && fecha.getMonth() + 1 === Number(mes)
        && fecha.getDate() === Number(dia)
        && fecha.getHours() === Number(hora)
        && fecha.getMinutes() === Number(minuto)
        && fecha.getSeconds() === Number(segundo || 0);

}

// Identifica la franja horaria.

function franjaDe(fechaHora, criterios) {

    if (!fechaValida(fechaHora)) return null;

    const minutos = aMinutos(
        fechaHora.slice(11, 16)
    );

    for (const rango of criterios.horas_pico) {

        const [ini, fin] = rango.split("-");

        if (minutos >= aMinutos(ini) &&
            minutos <= aMinutos(fin)) {

            return "pico";

        }

    }

    return "valle";

}

// Determina el nivel según el puntaje.

function nivelDe(puntaje, criterios) {

    if (!Number.isFinite(puntaje)) return null;

    for (const [nivel, [min, max]]
        of Object.entries(criterios.niveles)) {

        if (puntaje >= min && puntaje <= max) {

            return nivel;

        }

    }

    return null;

}

// Calcula la criticidad del reporte.

function calcularCriticidad(reporte, vias, criterios) {

    if (!reporte || !vias || !criterios) {
        return null;
    }

    const enJson = Object.hasOwn(vias, reporte.cuadra)
        ? vias[reporte.cuadra]
        : null;

    const tipo = enJson
        ? enJson.tipo
        : reporte.via_tipo;

    if (!tipo) return null;

    const franja = franjaDe(
        reporte.fecha_hora,
        criterios
    );

    if (!franja) return null;

    const pesoCategoria =
        criterios.categoria[reporte.categoria];

    const pesoVia =
        criterios.via[tipo];

    const pesoFranja =
        criterios.franja[franja];

    if (![pesoCategoria, pesoVia, pesoFranja]
        .every(Number.isFinite)) {

        return null;

    }

    const puntaje =
        pesoCategoria +
        pesoVia +
        pesoFranja;

    const nivel = nivelDe(puntaje, criterios);

    if (!nivel) return null;

    return {
        puntaje,
        nivel,
        franja
    };

}

// Calcula el puntaje máximo posible.

function puntajeMaximo(criterios) {

    const max = obj =>
        Math.max(...Object.values(obj));

    return max(criterios.categoria)
        + max(criterios.via)
        + max(criterios.franja);

}
