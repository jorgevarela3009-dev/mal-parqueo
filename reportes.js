// Fotografías anonimizadas e intercambio local de reportes.
let fotoLista = '', fotoVersion = 0, fotoCargando = false, inicioMarca = null;
const canvasFoto = $('foto-canvas');
const ctxFoto = canvasFoto.getContext('2d');
function limpiarFoto() {
    fotoVersion++; fotoLista = ''; fotoCargando = false; inicioMarca = null;
    $('foto-archivo').value = ''; if ($('foto-camara')) $('foto-camara').value = ''; $('foto-confirmar').checked = false;
    $('foto-editor').hidden = true; canvasFoto.width = 1; canvasFoto.height = 1;
    $('foto-msg').textContent = '';
}
function fotoParaGuardar() {
    if (fotoCargando || (!$('foto-editor').hidden && (!$('foto-confirmar').checked || !fotoLista))) throw new Error('Confirma la anonimización de la foto o elimínala.');
    return fotoLista;
}
async function cargarFoto(evento) {
    const archivo = evento.target.files[0]; limpiarFoto(); if (!archivo) return;
    const version = fotoVersion; fotoCargando = true;
    try {
        if (!['image/jpeg','image/png','image/webp'].includes(archivo.type) || archivo.size > 20*1024*1024) throw new Error('Selecciona una imagen JPG, PNG o WebP de máximo 20 MB.');
        const url = URL.createObjectURL(archivo);
        try {
            const img = new Image(); img.src = url; await img.decode();
            if (version !== fotoVersion) return;
            const escala = Math.min(1,800/Math.max(img.width,img.height));
            canvasFoto.width = Math.max(1,Math.round(img.width*escala)); canvasFoto.height = Math.max(1,Math.round(img.height*escala));
            ctxFoto.fillStyle = '#fff'; ctxFoto.fillRect(0,0,canvasFoto.width,canvasFoto.height);
            ctxFoto.drawImage(img,0,0,canvasFoto.width,canvasFoto.height);
            $('foto-editor').hidden = false;
            $('foto-msg').textContent = 'Arrastra sobre cada rostro o placa para cubrirlo completamente.';
        } finally { URL.revokeObjectURL(url); }
    } catch(e) { if(version===fotoVersion) $('foto-msg').textContent=e.message; }
    finally { if(version===fotoVersion) fotoCargando=false; }
}
$('foto-archivo').addEventListener('change', cargarFoto);
$('foto-camara').addEventListener('change', cargarFoto);
function puntoFoto(e) { const r=canvasFoto.getBoundingClientRect(); return [Math.max(0,Math.min(canvasFoto.width,(e.clientX-r.left)*canvasFoto.width/r.width)),Math.max(0,Math.min(canvasFoto.height,(e.clientY-r.top)*canvasFoto.height/r.height))]; }
canvasFoto.addEventListener('pointerdown',e=>{inicioMarca=puntoFoto(e);canvasFoto.setPointerCapture(e.pointerId);});
canvasFoto.addEventListener('pointercancel',()=>{inicioMarca=null;});
canvasFoto.addEventListener('pointerup',e=>{
    if(!inicioMarca)return; const [x,y]=inicioMarca,[a,b]=puntoFoto(e); inicioMarca=null;
    ctxFoto.fillStyle='#111'; ctxFoto.fillRect(Math.min(x,a)-3,Math.min(y,b)-3,Math.abs(a-x)+6,Math.abs(b-y)+6);
    fotoLista=''; $('foto-confirmar').checked=false;
});
$('foto-confirmar').addEventListener('change',()=>{
    fotoLista=''; if(!$('foto-confirmar').checked)return;
    for(const calidad of [.65,.45,.25,.12]) { const s=canvasFoto.toDataURL('image/jpeg',calidad); if(s.length<=100000){fotoLista=s;break;} }
    if(!fotoLista){$('foto-confirmar').checked=false;$('foto-msg').textContent='La imagen sigue siendo demasiado grande. Elimínala o selecciona otra.';}
    else $('foto-msg').textContent='Foto anonimizada y comprimida, lista para guardar.';
});
$('foto-quitar').addEventListener('click',limpiarFoto);
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
