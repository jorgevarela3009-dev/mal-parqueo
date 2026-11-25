
// Visualización de las vías estudiadas.

window.listo.then(async () => {

    try {

        const respuesta = await fetch("datos/vias.json");

        if (!respuesta.ok) {
            throw new Error("No se pudieron cargar las vías.");
        }

        const vias = await respuesta.json();

        const capaVias = L.layerGroup();

        Object.entries(vias).forEach(([id, via], i) => {

            if (!Array.isArray(via.trazo)) return;

            const color = i % 2 === 0
                ? "#0d9488"
                : "#2563eb";

            const linea = L.polyline(via.trazo, {
                color: color,
                weight: 6,
                opacity: 0.85,
                interactive: false
            });

            linea.bindTooltip(id, {
                permanent: true,
                direction: "center",
                className: "etiqueta-via"
            });

            linea.addTo(capaVias);

        });

        const control = document.getElementById("chk-vias");

        if (control.checked) {
            capaVias.addTo(estado.mapa);
        }

        control.addEventListener("change", () => {

            if (control.checked) {
                capaVias.addTo(estado.mapa);
            } else {
                estado.mapa.removeLayer(capaVias);
            }

        });

    } catch (error) {

        console.error("Error al mostrar las vías:", error);

    }

});
