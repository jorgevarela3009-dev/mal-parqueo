
# Movilidad Santa Marta

## Reto 2: Control de mal parqueo e invasión del espacio público

Universidad del Magdalena
Ingeniería de Sistemas
Introducción a la Ingeniería de Sistemas
Periodo académico 2026-II

## Descripción del proyecto

Aplicativo web orientado al registro, visualización
y análisis de incidentes relacionados con el mal
parqueo y la invasión del espacio público en Santa Marta.

El proyecto busca identificar sectores críticos
mediante información georreferenciada y criterios
de valoración de los incidentes.

## Zona de estudio

Corredor vial de la Calle 29H, sector de la
Universidad del Magdalena.

Se han delimitado nueve segmentos identificados
desde UNI-01 hasta UNI-09, pendientes de validación
definitiva en campo.

## Funcionalidades implementadas

- Registro georreferenciado de incidentes.
- Selección de ubicación mediante mapa o GPS.
- Identificación automática de la cuadra.
- Validación de la zona de estudio.
- Clasificación de incidentes y actores.
- Identificación de horas pico y valle.
- Cálculo automático de criticidad.
- Visualización mediante mapa de calor.
- Visualización de puntos individuales.
- Visualización mediante hexágonos.
- Visualización de las vías estudiadas.
- Herramienta de captura de coordenadas.
- Almacenamiento local de reportes.
- Filtros dinámicos por cuadra, categoría, actor,
  franja horaria y nivel de criticidad.
- Indicadores estadísticos de reportes visibles.
- Conteo de cuadras con incidentes.
- Distribución de incidentes por nivel de criticidad.
- Actualización simultánea del mapa de calor,
  puntos individuales y hexágonos según los filtros.

## Tecnologías utilizadas

- HTML5.
- CSS3.
- JavaScript.
- Leaflet.
- Leaflet.heat.
- OpenStreetMap.
- JSON.
- LocalStorage.
- GitHub.
- GitHub Pages.

## Cálculo de criticidad

La criticidad se obtiene sumando los pesos
correspondientes a la categoría del incidente,
el tipo de vía y la franja horaria.

Niveles:

- Bajo: 0 a 4 puntos.
- Medio: 5 a 6 puntos.
- Alto: 7 a 9 puntos.

Los parámetros se encuentran en datos/criterios.json.

La clasificación arterial de los segmentos y
la tolerancia geográfica de 25 metros son
decisiones iniciales sujetas a validación de campo.

## Estructura del proyecto

- index.html: interfaz principal.
- estilos.css: diseño visual.
- mapa.js: visualización geográfica.
- captura.js: registro de incidentes.
- criticidad.js: cálculo de criticidad.
- via.js: identificación de cuadras.
- vias-mapa.js: visualización de vías.
- coordenadas.js: delimitación geográfica.
- hexagonos.js: agrupación espacial.
- datos/: archivos de configuración y reportes.
- filtros.js: procesamiento de filtros e indicadores.

## Almacenamiento de información

Los reportes registrados por el usuario se guardan
en el almacenamiento local de su navegador.

El aplicativo no utiliza un servidor de base
de datos ni requiere un backend.

## Funcionalidades pendientes

- Fotografías opcionales anonimizadas.
- Ranking de las cinco cuadras más críticas.
- Recomendaciones operativas.
- Impresión del resumen.
- Importación y exportación de reportes JSON.
- Validación y recolección de datos de campo.

## Integrantes

- Integrante 1: pendiente.
- Integrante 2: pendiente.
- Integrante 3: pendiente.
- Integrante 4: pendiente.

## Publicación

Aplicativo publicado mediante GitHub Pages.

Enlace: pendiente de incorporar.

## Control de versiones

El desarrollo se organiza mediante ramas de trabajo,
commits y solicitudes de integración (Pull Requests).
