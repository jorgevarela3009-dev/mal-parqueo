
// Herramienta para delimitar las cuadras estudiadas.

let modoCoordenadas = false;
let puntosVias = [];
let capaCoordenadas;

window.listo.then(() => {

    if (!estado.mapa) return;

    const boton = document.getElementById("btn-coordenadas");
    const panel = document.getElementById("panel-coordenadas");
    const lista = document.getElementById("lista-coordenadas");

    capaCoordenadas = L.layerGroup().addTo(estado.mapa);

    function actualizarCoordenadas() {

        capaCoordenadas.clearLayers();

        puntosVias.forEach((punto, i) => {

            L.circleMarker(punto, {
                radius: 9,
                color: "#ffffff",
                weight: 2,
                fillColor: "#12334a",
                fillOpacity: 1,
                interactive: false
            })
            .bindTooltip("P" + (i + 1), {
                permanent: true,
                direction: "top"
            })
            .addTo(capaCoordenadas);

        });

        if (puntosVias.length > 1) {

            L.polyline(puntosVias, {
                color: "#0d9488",
                weight: 5,
                opacity: 0.9,
                interactive: false
            }).addTo(capaCoordenadas);

        }

        lista.value = puntosVias.map((p, i) =>
            "P" + (i + 1) + ": " + p.join(", ")
        ).join("\n");

        document.getElementById("total-coordenadas")
            .textContent = puntosVias.length +
            " puntos seleccionados | " +
            Math.max(0, puntosVias.length - 1) +
            " segmentos";

    }

    boton.addEventListener("click", () => {

        modoCoordenadas = !modoCoordenadas;

        panel.hidden = !modoCoordenadas;

        boton.textContent = modoCoordenadas
            ? "Finalizar captura"
            : "Capturar coordenadas";

        if (modoCoordenadas) {
            limpiarFoto();
            limpiarUbicacion();
            activarRegistro(false);
            document.getElementById("panel").hidden = true;
        }

        estado.mapa.invalidateSize();

    });

    estado.mapa.on("click", (e) => {

        if (!modoCoordenadas) return;

        const lat = Number(e.latlng.lat.toFixed(6));
        const lng = Number(e.latlng.lng.toFixed(6));

        puntosVias.push([lat, lng]);

        actualizarCoordenadas();

    });

    document.getElementById("btn-deshacer-punto")
        .addEventListener("click", () => {

            puntosVias.pop();
            actualizarCoordenadas();

        });

    document.getElementById("btn-limpiar-puntos")
        .addEventListener("click", () => {

            puntosVias = [];
            actualizarCoordenadas();

        });

    document.getElementById("btn-copiar-puntos")
        .addEventListener("click", async () => {

            if (!puntosVias.length) {
                alert("Primero selecciona puntos en el mapa.");
                return;
            }

            try {

                await navigator.clipboard.writeText(
                    JSON.stringify(puntosVias, null, 2)
                );

                alert("Coordenadas copiadas correctamente.");

            } catch (error) {

                lista.focus();
                lista.select();

                alert("Presiona Ctrl + C para copiar.");

            }

        });

    actualizarCoordenadas();

});
