# MoviTech SM | Reto 2 — Movilidad Santa Marta
Universidad del Magdalena · Ingeniería de Sistemas · Introducción a la Ingeniería de Sistemas · 2026-II · Docente Aquiles Cohen.

## Equipo (roles propuestos, por confirmar)
- Jorge Varela: integrador del mapa e instrucciones para IA.
- Juan Peña: analista de campo y privacidad; sustentación principal.
- Daniel Narváez: lógica y clasificación.
- Nesvell Briceño: interfaz y documentación.

## Abrir el prototipo
[GitHub Pages](https://jorgevarela3009-dev.github.io/mal-parqueo/) · [Repositorio](https://github.com/jorgevarela3009-dev/mal-parqueo).
Abrir con conexión a internet. No abrir index.html directamente mediante file:// porque fetch necesita HTTP. No requiere backend.

## Uso
Activar registro, seleccionar punto o GPS, categoría, actor y hora; adjuntar foto opcional y anonimizarla; guardar. Consultar calor, puntos, filtros y ranking. Exportar/importar JSON para reunir dispositivos. Los datos nuevos quedan en localStorage; la base precargada se carga desde datos/reportes.json. Los IDs se deduplican.

## Datos y reglas
Nueve segmentos Calle 29H (UNI-01 a UNI-09), configurados como arteriales, clasificación por confirmar. 30 entradas, 25 pico, 5 valle, 17 invasión de andén, 13 doble fila; 243 puntos. Todas altas con los pesos actuales. Tres jornadas informadas, fechas exactas desconocidas: fecha_hora conserva fecha técnica y hora real informada. No permite análisis diario. Registros 17/29 comparten foto, hora y cuadra; 8/30 requieren revisión por similitud. No se acredita todavía independencia de los 30. Fotos públicas con pixelado integral preventivo; revisar antes de publicar.

Criticidad = categoría + vía + franja. Pesos y rangos en criterios.json; pico 06:30–08:30, 11:30–14:00, 17:00–19:30. Bajo 0–4, Medio 5–6, Alto 7–9. Ranking por suma de puntos, luego cantidad e ID; recomendaciones por categoría y franja predominantes.

## Archivos
- index.html / estilos.css: interfaz.
- captura.js / via.js: captura y detección de cuadra.
- reportes.js: almacenamiento, fotos e intercambio.
- criticidad.js / filtros.js / resumen.js: análisis.
- mapa.js / vias-mapa.js / hexagonos.js / coordenadas.js: visualización y apoyo geográfico.
- datos/: configuración, vías, criterios y reportes.
- documentos/: evidencia, arquitectura y bitácora.
- documentos/arquitectura.png y documentos/arquitectura.mmd: diagrama de arquitectura en capas (cliente SPA sin backend).

## Arquitectura
La app es una SPA estática, sin servidor ni base de datos en línea: presentación, aplicación, dominio, mapa y persistencia local corren en el navegador, y se publica en GitHub Pages.

![Diagrama de arquitectura en capas](documentos/arquitectura.png)

## IA y pendientes
ChatGPT apoyó desarrollo y documentación. Pendiente: anexos originales de conversaciones, cronómetro RF-01, validación de recorridos y clasificación, revisión de fotos y posibles duplicados, commits individuales y video de contingencia. El nombre del repositorio actual no sigue literalmente la convención de nombre de equipo y reto; confirmar con el docente antes de renombrar (cambiaría el enlace).
