// anonimizar.js — Pixela solo placas y rostros, en el navegador y sin CDN.
// Entrada: un canvas con la foto nítida.
// Salida: el mismo canvas, con esas zonas pixeladas, y una lista de cajas para revisión.
// Placas: regla de color (placa colombiana amarilla con caracteres oscuros).
// Rostros: FaceDetector nativo si existe, y el detector pico.js vendido en lib/pico/.
(function (global) {
    'use strict';

    function pixelar(ctx, x, y, w, h, bloque) {
        const cv = ctx.canvas;
        x = Math.max(0, Math.floor(x));
        y = Math.max(0, Math.floor(y));
        w = Math.min(cv.width - x, Math.ceil(w));
        h = Math.min(cv.height - y, Math.ceil(h));
        if (w < 2 || h < 2) return;
        const b = bloque || Math.max(8, Math.min(w, h) / 3);
        const t = document.createElement('canvas');
        t.width = Math.max(1, Math.ceil(w / b));
        t.height = Math.max(1, Math.ceil(h / b));
        const tg = t.getContext('2d');
        tg.imageSmoothingEnabled = false;
        tg.drawImage(cv, x, y, w, h, 0, 0, t.width, t.height);
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(t, 0, 0, t.width, t.height, x, y, w, h);
        ctx.restore();
    }

    function ampliar(c, f) {
        const mx = c.w * f, my = c.h * f;
        return { x: c.x - mx, y: c.y - my, w: c.w + 2 * mx, h: c.h + 2 * my, tipo: c.tipo };
    }

    // Placa colombiana: mancha amarilla con forma alargada y caracteres oscuros dentro.
    function buscarPlacas(datos, ancho, alto) {
        const n = ancho * alto;
        const amarillo = new Uint8Array(n), oscuro = new Uint8Array(n);
        for (let i = 0, p = 0; i < n; i++, p += 4) {
            const r = datos[p], g = datos[p + 1], b = datos[p + 2];
            const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
            const v = max / 255, s = max ? d / max : 0;
            if (v < 0.3) oscuro[i] = 1;
            if (!d) continue;
            let h = max === r ? 60 * (((g - b) / d) % 6) : max === g ? 60 * ((b - r) / d + 2) : 60 * ((r - g) / d + 4);
            if (h < 0) h += 360;
            if (h >= 40 && h <= 65 && s > 0.4 && v > 0.5) amarillo[i] = 1;
        }
        const visto = new Uint8Array(n), pila = new Int32Array(n), cajas = [];
        for (let i0 = 0; i0 < n; i0++) {
            if (!amarillo[i0] || visto[i0]) continue;
            let sp = 0, area = 0, x0 = ancho, y0 = alto, x1 = 0, y1 = 0;
            pila[sp++] = i0; visto[i0] = 1;
            while (sp) {
                const i = pila[--sp], x = i % ancho, y = (i / ancho) | 0;
                area++;
                if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
                if (x > 0 && amarillo[i - 1] && !visto[i - 1]) { visto[i - 1] = 1; pila[sp++] = i - 1; }
                if (x < ancho - 1 && amarillo[i + 1] && !visto[i + 1]) { visto[i + 1] = 1; pila[sp++] = i + 1; }
                if (y > 0 && amarillo[i - ancho] && !visto[i - ancho]) { visto[i - ancho] = 1; pila[sp++] = i - ancho; }
                if (y < alto - 1 && amarillo[i + ancho] && !visto[i + ancho]) { visto[i + ancho] = 1; pila[sp++] = i + ancho; }
            }
            const w = x1 - x0 + 1, h = y1 - y0 + 1, rel = w / h;
            if (w < 14 || h < 6 || w > ancho * 0.45) continue;
            if (rel < 0.9 || rel > 4.5) continue;
            if (area / (w * h) < 0.35) continue;
            let osc = 0;
            for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) osc += oscuro[y * ancho + x];
            const fo = osc / (w * h);
            if (fo < 0.06 || fo > 0.55) continue;
            cajas.push({ x: x0, y: y0, w, h, tipo: 'placa' });
        }
        return cajas;
    }

    function placas(cv) {
        const k = Math.min(1, 640 / Math.max(cv.width, cv.height));
        const w = Math.max(1, Math.round(cv.width * k)), h = Math.max(1, Math.round(cv.height * k));
        const t = document.createElement('canvas'); t.width = w; t.height = h;
        const g = t.getContext('2d', { willReadFrequently: true });
        g.drawImage(cv, 0, 0, w, h);
        return buscarPlacas(g.getImageData(0, 0, w, h).data, w, h)
            .map(c => ampliar({ x: c.x / k, y: c.y / k, w: c.w / k, h: c.h / k, tipo: 'placa' }, 0.25));
    }

    async function rostrosNativo(cv) {
        if (typeof global.FaceDetector !== 'function') return null;
        try {
            const det = new global.FaceDetector({ fastMode: false, maxDetectedFaces: 20 });
            return (await det.detect(cv)).map(c => ampliar({
                x: c.boundingBox.x, y: c.boundingBox.y,
                w: c.boundingBox.width, h: c.boundingBox.height, tipo: 'rostro'
            }, 0.35));
        } catch (e) {
            return null;
        }
    }

    let clasificarCara = null, cargaRostros = null;

    function cargarRostros() {
        if (cargaRostros) return cargaRostros;
        cargaRostros = (async function () {
            if (typeof pico === 'undefined' || !pico.unpack_cascade) return false;
            const r = await fetch('lib/pico/facefinder.bin');
            if (!r.ok) return false;
            clasificarCara = pico.unpack_cascade(new Int8Array(await r.arrayBuffer()));
            return true;
        })().catch(function () { return false; });
        return cargaRostros;
    }

    function rgbaAGris(rgba, filas, cols) {
        const gray = new Uint8Array(filas * cols);
        for (let y = 0; y < filas; y++) {
            for (let x = 0; x < cols; x++) {
                const i = (y * cols + x) * 4;
                gray[y * cols + x] = (2 * rgba[i] + 7 * rgba[i + 1] + rgba[i + 2]) / 10;
            }
        }
        return gray;
    }

    function iou(a, b) {
        const x0 = Math.max(a.x, b.x), y0 = Math.max(a.y, b.y);
        const x1 = Math.min(a.x + a.w, b.x + b.w), y1 = Math.min(a.y + a.h, b.y + b.h);
        const inter = Math.max(0, x1 - x0) * Math.max(0, y1 - y0);
        const uni = a.w * a.h + b.w * b.h - inter;
        return uni ? inter / uni : 0;
    }

    function fusionarCajas(lista) {
        const out = [];
        lista.forEach(function (c) {
            if (!out.some(function (o) { return o.tipo === c.tipo && iou(o, c) > 0.35; })) out.push(c);
        });
        return out;
    }

    function rostrosPico(cv) {
        if (!clasificarCara) return null;
        const k = Math.min(1, 640 / Math.max(cv.width, cv.height));
        const w = Math.max(1, Math.round(cv.width * k)), h = Math.max(1, Math.round(cv.height * k));
        const t = document.createElement('canvas'); t.width = w; t.height = h;
        const g = t.getContext('2d', { willReadFrequently: true });
        g.drawImage(cv, 0, 0, w, h);
        const rgba = g.getImageData(0, 0, w, h).data;
        const image = { pixels: rgbaAGris(rgba, h, w), nrows: h, ncols: w, ldim: w };
        const params = { shiftfactor: 0.1, minsize: 24, maxsize: 1000, scalefactor: 1.1 };
        let dets = pico.run_cascade(image, clasificarCara, params);
        dets = pico.cluster_detections(dets, 0.2);
        const cajas = [];
        for (let i = 0; i < dets.length; i++) {
            if (dets[i][3] <= 5) continue;
            const r = dets[i][0], c = dets[i][1], s = dets[i][2];
            cajas.push(ampliar({
                x: (c - s / 2) / k, y: (r - s / 2) / k, w: s / k, h: s / k, tipo: 'rostro'
            }, 0.35));
        }
        return cajas;
    }

    async function rostros(cv) {
        const nativo = await rostrosNativo(cv);
        const picoOk = await cargarRostros();
        const conPico = picoOk ? rostrosPico(cv) : null;
        if (nativo === null && conPico === null) return null;
        return fusionarCajas((nativo || []).concat(conPico || []));
    }

    async function auto(cv, ctx) {
        const r = await rostros(cv);
        const p = placas(cv);
        const cajas = (r || []).concat(p);
        cajas.forEach(function (c) { pixelar(ctx, c.x, c.y, c.w, c.h); });
        return {
            rostros: r ? r.length : 0,
            rostrosDisponible: r !== null,
            placas: p.length,
            cajas: cajas
        };
    }

    function mensaje(res) {
        const base = 'Se pixelaron automáticamente ' + res.rostros + ' rostro(s) y ' + res.placas + ' placa(s).';
        const extra = res.rostrosDisponible
            ? ''
            : ' No se pudieron detectar rostros en este navegador: tócalos tú.';
        return base + extra + ' Revisa la foto (los recuadros marcan lo detectado). Si falta alguna placa o rostro, toca o arrastra para pixelelarlo. Confirma «Placas y rostros anonimizados» antes de guardar.';
    }

    const API = { pixelar, auto, mensaje, buscarPlacas, placas, cargarRostros };
    global.Anonimizar = API;
    if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);

// Precarga el cascade de rostros en cuanto se carga la página.
if (typeof window !== 'undefined' && window.Anonimizar) window.Anonimizar.cargarRostros();
