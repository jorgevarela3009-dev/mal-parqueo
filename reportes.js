// Fotografías anonimizadas e intercambio local de reportes.
// Al subir una foto se detectan placas y rostros y solo esas zonas se pixelan.
// El resto queda nítido. El JPEG guardado es el anonimizado; el original no se almacena.
let fotoLista = '', fotoVersion = 0, fotoCargando = false, inicioMarca = null, cajasRevision = [];
const canvasFoto = $('foto-canvas');
const ctxFoto = canvasFoto.getContext('2d');
const canvasOverlay = $('foto-overlay');

function limpiarFoto() {
    fotoVersion++; fotoLista = ''; fotoCargando = false; inicioMarca = null; cajasRevision = [];
    $('foto-archivo').value = ''; if ($('foto-camara')) $('foto-camara').value = '';
    const chk = $('foto-confirmar'); chk.checked = false; chk.disabled = false;
    $('foto-editor').hidden = true; canvasFoto.width = 1; canvasFoto.height = 1;
    if (canvasOverlay) { canvasOverlay.width = 1; canvasOverlay.height = 1; }
    $('foto-msg').textContent = '';
}
function fotoParaGuardar() {
    if (fotoCargando || (!$('foto-editor').hidden && (!$('foto-confirmar').checked || !fotoLista))) {
        throw new Error('Confirma que las placas y los rostros están anonimizados, o elimina la foto.');
    }
    return fotoLista;
}
function exportarFotoLista() {
    fotoLista = '';
    for (const calidad of [0.65, 0.45, 0.25, 0.12]) {
        const s = canvasFoto.toDataURL('image/jpeg', calidad);
        if (s.length <= 100000) { fotoLista = s; break; }
    }
    return !!fotoLista;
}
function dibujarCajasRevision() {
    if (!canvasOverlay) return;
    canvasOverlay.width = canvasFoto.width;
    canvasOverlay.height = canvasFoto.height;
    const g = canvasOverlay.getContext('2d');
    g.clearRect(0, 0, canvasOverlay.width, canvasOverlay.height);
    for (const c of cajasRevision) {
        g.strokeStyle = c.tipo === 'placa' ? '#eab308' : c.tipo === 'manual' ? '#38bdf8' : '#f97316';
        g.lineWidth = Math.max(2, Math.round(Math.min(canvasOverlay.width, canvasOverlay.height) / 200));
        g.strokeRect(c.x, c.y, c.w, c.h);
    }
}

async function cargarFoto(evento) {
    const archivo = evento.target.files[0]; limpiarFoto(); if (!archivo) return;
    const version = fotoVersion; fotoCargando = true;
    $('foto-msg').textContent = 'Detectando placas y rostros…';
    try {
        if (!['image/jpeg','image/png','image/webp'].includes(archivo.type) || archivo.size > 20*1024*1024) throw new Error('Selecciona una imagen JPG, PNG o WebP de máximo 20 MB.');
        const url = URL.createObjectURL(archivo);
        try {
            const img = new Image(); img.src = url; await img.decode();
            if (version !== fotoVersion) return;
            const escala = Math.min(1, 800 / Math.max(img.width, img.height));
            canvasFoto.width = Math.max(1, Math.round(img.width * escala));
            canvasFoto.height = Math.max(1, Math.round(img.height * escala));
            ctxFoto.fillStyle = '#fff';
            ctxFoto.fillRect(0, 0, canvasFoto.width, canvasFoto.height);
            ctxFoto.drawImage(img, 0, 0, canvasFoto.width, canvasFoto.height);
            $('foto-editor').hidden = false;
            let res = { rostros: 0, placas: 0, rostrosDisponible: false, cajas: [] };
            if (window.Anonimizar) {
                res = await Anonimizar.auto(canvasFoto, ctxFoto);
            }
            if (version !== fotoVersion) return;
            cajasRevision = res.cajas || [];
            dibujarCajasRevision();
            exportarFotoLista();
            const chk = $('foto-confirmar');
            chk.checked = false;
            chk.disabled = false;
            $('foto-msg').textContent = window.Anonimizar
                ? Anonimizar.mensaje(res)
                : 'No se pudo cargar el detector. Toca o arrastra sobre placas y rostros para pixelelarlos.';
            if (!fotoLista) $('foto-msg').textContent = 'La imagen sigue siendo demasiado grande. Elimínala o selecciona otra.';
        } finally { URL.revokeObjectURL(url); }
    } catch (e) { if (version === fotoVersion) $('foto-msg').textContent = e.message; }
    finally { if (version === fotoVersion) fotoCargando = false; }
}
$('foto-archivo').addEventListener('change', cargarFoto);
$('foto-camara').addEventListener('change', cargarFoto);

function puntoFoto(e) {
    const r = canvasFoto.getBoundingClientRect();
    return [
        Math.max(0, Math.min(canvasFoto.width, (e.clientX - r.left) * canvasFoto.width / r.width)),
        Math.max(0, Math.min(canvasFoto.height, (e.clientY - r.top) * canvasFoto.height / r.height))
    ];
}
canvasFoto.addEventListener('pointerdown', e => {
    inicioMarca = puntoFoto(e);
    canvasFoto.setPointerCapture(e.pointerId);
});
canvasFoto.addEventListener('pointercancel', () => { inicioMarca = null; });
canvasFoto.addEventListener('pointerup', e => {
    if (!inicioMarca) return;
    const [x, y] = inicioMarca, [a, b] = puntoFoto(e);
    inicioMarca = null;
    let bx, by, bw, bh;
    if (Math.abs(a - x) < 12 && Math.abs(b - y) < 12) {
        const lado = Math.max(48, Math.round(Math.min(canvasFoto.width, canvasFoto.height) * 0.12));
        bx = x - lado / 2; by = y - lado / 2; bw = lado; bh = lado;
    } else {
        bx = Math.min(x, a) - 3; by = Math.min(y, b) - 3; bw = Math.abs(a - x) + 6; bh = Math.abs(b - y) + 6;
    }
    if (window.Anonimizar) Anonimizar.pixelar(ctxFoto, bx, by, bw, bh);
    else { ctxFoto.fillStyle = '#111'; ctxFoto.fillRect(bx, by, bw, bh); }
    cajasRevision.push({ x: bx, y: by, w: bw, h: bh, tipo: 'manual' });
    dibujarCajasRevision();
    fotoLista = '';
    $('foto-confirmar').checked = false;
    $('foto-msg').textContent = 'Zona pixelada a mano. Revisa y confirma «Placas y rostros anonimizados» para guardar.';
});
$('foto-confirmar').addEventListener('change', () => {
    fotoLista = '';
    if (!$('foto-confirmar').checked) return;
    if (exportarFotoLista()) {
        $('foto-msg').textContent = 'Foto anonimizada y comprimida, lista para guardar.';
    } else {
        $('foto-confirmar').checked = false;
        $('foto-msg').textContent = 'La imagen sigue siendo demasiado grande. Elimínala o selecciona otra.';
    }
});
$('foto-quitar').addEventListener('click', limpiarFoto);

function fotoSegura(s){return typeof s==='string' && s.length<=100000 && /^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(s);}
function fotoPopup(r) {
    const caja = document.createElement('section'); caja.className = 'evidencia-popup';
    const titulo = document.createElement('strong'); titulo.textContent = 'Evidencia fotográfica'; caja.append(titulo);
    const aviso = document.createElement('p'); aviso.className = 'foto-ausente';
    if (!fotoSegura(r.foto)) { aviso.textContent = r.foto ? 'Fotografía no disponible.' : 'Este reporte no tiene fotografía.'; caja.append(aviso); return caja; }
    const img = document.createElement('img'); img.className = 'foto-popup'; img.alt = 'Evidencia anonimizada del incidente';
    img.addEventListener('error', () => { img.remove(); aviso.textContent = 'No se pudo visualizar la fotografía.'; caja.append(aviso); });
    img.addEventListener('load', () => { if (estado.mapa && estado.mapa._popup) estado.mapa._popup.update(); });
    img.src = r.foto; caja.append(img); return caja;
}
function validarImportado(r){
    if(!r || typeof r!=='object' || typeof r.id!=='string' || !/^[\w-]{1,100}$/.test(r.id) || !fechaValida(r.fecha_hora) || !Number.isFinite(r.lat) || !Number.isFinite(r.lng) || Math.abs(r.lat)>90 || Math.abs(r.lng)>180 || !Object.hasOwn(CATEGORIAS,r.categoria) || !Object.hasOwn(ACTORES,r.actor) || !['campo','ciudadano'].includes(r.origen)) return null;
    if (!Object.hasOwn(estado.vias,r.cuadra)) return null;
    const v=buscarEnViasJson([r.lat,r.lng],{[r.cuadra]:estado.vias[r.cuadra]},25.15); if(!v)return null;
    const extra=k=>typeof r[k]==='string'?r[k].trim().slice(0,60):'';
    const categoria_otro=extra('categoria_otro'),actor_otro=extra('actor_otro');
    if((r.categoria==='otro'&&!categoria_otro)||(r.actor==='otro'&&!actor_otro))return null;
    if(r.foto && !fotoSegura(r.foto))return null;
    const limpio={id:r.id,origen:r.origen,fecha_hora:r.fecha_hora,lat:r.lat,lng:r.lng,cuadra:v.id,via_nombre:v.nombre,via_tipo:v.tipo,via_fuente:v.fuente,categoria:r.categoria,actor:r.actor,categoria_otro,actor_otro,foto:r.foto||''};
    const c=calcularCriticidad(limpio,estado.vias,estado.criterios); return c?{...limpio,...c}:null;
}
window.listo.then(()=>{
    if(!estado.mapa||!estado.vias)return;
    const aviso=t=>$('intercambio-msg').textContent=t;
    $('btn-exportar').addEventListener('click',()=>{
        const vistos=new Set(), datos=[];
        for(const r of [...estado.base,...leerLocales()]){if(!r||typeof r.id!=='string'||vistos.has(r.id))continue;vistos.add(r.id);datos.push(r);}
        const url=URL.createObjectURL(new Blob([JSON.stringify(datos,null,2)],{type:'application/json'}));
        const a=document.createElement('a');a.href=url;a.download='reportes-movilidad-'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);aviso(`${datos.length} reportes exportados, sin aplicar filtros.`);
    });
    $('btn-importar').addEventListener('click',()=>$('archivo-importar').click());
    $('archivo-importar').addEventListener('change',async()=>{
        const archivo=$('archivo-importar').files[0];$('archivo-importar').value='';if(!archivo)return;
        $('btn-importar').disabled=true;
        try{
            if(archivo.size>8*1024*1024)throw new Error('Archivo demasiado grande (máximo 8 MB).');
            const datos=JSON.parse(await archivo.text());if(!Array.isArray(datos))throw new Error('El JSON debe contener una lista de reportes.');
            const locales=leerLocales(), vistos=new Set([...estado.base,...locales].filter(Boolean).map(r=>r.id));let duplicados=0,invalidos=0;const nuevos=[];
            for(const r of datos){const limpio=validarImportado(r);if(!limpio){invalidos++;continue;}if(vistos.has(limpio.id)){duplicados++;continue;}vistos.add(limpio.id);nuevos.push(limpio);}
            if(nuevos.some(r=>r.foto)&&!confirm('Confirma que revisaste las fotografías del archivo y que no contienen rostros ni placas visibles.')){aviso('Importación cancelada.');return;}
            if(nuevos.length)guardarLocales([...locales,...nuevos]);dibujar();aviso(`Importados: ${nuevos.length}. Duplicados: ${duplicados}. Inválidos: ${invalidos}.`);
        }catch(e){aviso(e.name==='QuotaExceededError'?'Almacenamiento lleno. No se importaron los nuevos registros. Exporta una copia de seguridad.':'No se pudo importar: '+e.message);}
        finally{$('btn-importar').disabled=false;}
    });
});
