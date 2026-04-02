// ═══════════════════════════════════════════════════════════════════════════
//  AZTEC WAR — GAME.JS
//  Solo conecta: sockets ↔ engine ↔ renderer ↔ skins
//  La lógica está en engine.js, los personajes en skins.js
// ═══════════════════════════════════════════════════════════════════════════

const canvas  = document.getElementById('gameCanvas');
const ctx     = canvas.getContext('2d');
const mmCanvas= document.getElementById('minimap');
const mmCtx   = mmCanvas.getContext('2d');

// ── Constantes ────────────────────────────────────────────────────────────
const TILE    = 64;
const FOV     = 70 * Math.PI / 180;
const HALF_FOV= FOV / 2;
const HALF_PI = Math.PI / 2;
const TWO_PI  = Math.PI * 2;
const TEX_SZ  = 128;
const PLAYER_SPD = 3.8;
const TURN_SPD   = 0.045;
const BULLET_SPD = 12;

const ARMAS = [
    { nombre:'Macuahuitl', danio:15, cooldown:150, color:'#cc4400', ammoMax:999 },
    { nombre:'Atlatl',     danio:25, cooldown:250, color:'#886600', ammoMax:999 },
    { nombre:'Arco',       danio:40, cooldown:400, color:'#228844', ammoMax:999 }
];

// ── Estado global del cliente ─────────────────────────────────────────────
let W=0, H=0;
let zBuffer   = [];
let textures  = [];
let mapa      = null;
let jugadores = {};
let miId      = null;
let yo        = null;
let balas     = {};
let monedas   = {};
let corazones = {};
let ammoDrops = {};
let particulas= [];
let gameTime  = 0;
let playTimer = 0;
let nivelActual = 1;
let tiempoRestante = 0;
let armaActual = 0;
let lastShot   = 0;
let vivo       = true;
let socket     = null;
let keys       = {};
let lastTime   = 0;
let chatAbierto= false;
let lastMoveSent=0;
let bossData   = null;
let transicionando = false;

// ── Physics (physics.js cargado antes en game.html) ──────────────────────
// PHYSICS es global — accesible directamente
let saltando        = false;  // true mientras el jugador está en el aire
let interpBuffers   = {};     // buffers de interpolación por jugador id
let syncConfirmado  = false;  // true después de recibir sync_estado del servidor

// ── Arranque ──────────────────────────────────────────────────────────────
window.addEventListener('load', () => {
    const datos = JSON.parse(sessionStorage.getItem('aw_partida') || 'null');
    const token = localStorage.getItem('aw_token');
    if (!datos || !token) { window.location.href='/'; return; }

    resize();
    window.addEventListener('resize', resize);
    generarTexturas();
    SOUND.init(); // inicializar audio al primer load

    mapa       = datos.mapa;
    miId       = datos.tuId;
    jugadores  = datos.jugadores || {};
    yo         = jugadores[miId];
    nivelActual= datos.nivel || 1;

    // Pickups iniciales
    monedas = {};
    if (datos.monedas) Object.entries(datos.monedas).forEach(([k,v]) => monedas[k]=v);
    corazones = {};
    if (datos.corazones) Object.entries(datos.corazones).forEach(([k,v]) => corazones[k]=v);
    ammoDrops = {};
    if (datos.ammoDrops) Object.entries(datos.ammoDrops).forEach(([k,v]) => ammoDrops[k]=v);

    // NPCs
    if (datos.npcs) for (const id in datos.npcs) jugadores[id]={...datos.npcs[id]};

    conectarSocket(token, datos.salaId);
    initControles();
    requestAnimationFrame(loop);
});

function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
    zBuffer = new Float32Array(W);
}

// ── Texturas procedurales (idénticas al .c portadas) ─────────────────────
function noiseVal(x,y,seed){
    let n=(x*1619+y*31337+seed*2053)^((x*1619+y*31337+seed*2053)>>8);
    n=(n*(n*n*60493+19990303)+1376312589)&0x7fffffff;
    return n/0x7fffffff;
}
function smoothNoise(x,y,seed){
    const ix=Math.floor(x),iy=Math.floor(y);
    const fx=x-ix,fy=y-iy;
    const fx2=fx*fx*(3-2*fx),fy2=fy*fy*(3-2*fy);
    const v00=noiseVal(ix,iy,seed),v10=noiseVal(ix+1,iy,seed);
    const v01=noiseVal(ix,iy+1,seed),v11=noiseVal(ix+1,iy+1,seed);
    return v00+(v10-v00)*fx2+(v01-v00)*fy2+(v00-v10-v01+v11)*fx2*fy2;
}
function clamp(v){return Math.max(0,Math.min(1,v));}
function crearTex(sz,fn){
    const buf=new Uint8ClampedArray(sz*sz*4);
    for(let y=0;y<sz;y++) for(let x=0;x<sz;x++){
        const [r,g,b]=fn(x,y);
        const i=(y*sz+x)*4;
        buf[i]=r;buf[i+1]=g;buf[i+2]=b;buf[i+3]=255;
    }
    return buf;
}
function generarTexturas(){
    textures=[];
    textures.push(crearTex(TEX_SZ,(x,y)=>[0,0,0]));
    textures.push(crearTex(TEX_SZ,(x,y)=>{
        let n=smoothNoise(x*.12,y*.12,11)+.5*smoothNoise(x*.28,y*.28,77)+.25*smoothNoise(x*.55,y*.55,33);
        n/=1.75;n=clamp(n);
        const crack=smoothNoise(x*.5+.3,y*2,55)>.72;
        const moss=smoothNoise(x*.2,y*.35,19);
        const base=100+n*70;
        if(crack)return[40,40,40];
        if(moss>.6){const m=(moss-.6)/.4;return[base*(1-m*.3),base*(1-m*.1)+m*40,base*(1-m*.4)];}
        return[base,base*.95,base*.85];
    }));
    textures.push(crearTex(TEX_SZ,(x,y)=>{
        const bW=32,bH=32,by2=Math.floor(y/bH),off=(by2%2)?(bW/2):0;
        const lx2=(x+off)%bW,ly=y%bH,isJ=(lx2<=1||ly<=1);
        let n=smoothNoise(x*.15,y*.15,42)+.5*smoothNoise(x*.3,y*.3,99);
        n=n*.5+.5;n=clamp(n);
        const base=160+n*50;
        if(isJ)return[60,50,35];
        const det=smoothNoise(x*.6,y*.6,7)*.12;
        return[base+det*40,base*.82+det*30,base*.55+det*10];
    }));
    textures.push(crearTex(TEX_SZ,(x,y)=>{
        let n=smoothNoise(x*.1,y*.1,3)+.5*smoothNoise(x*.25,y*.25,88);
        n/=1.5;n=clamp(n);
        const vein=Math.sin((x*.15+y*.08+smoothNoise(x*.08,y*.08,22)*8)*Math.PI*2)*.5+.5;
        const vein2=Math.sin((x*.05-y*.18+smoothNoise(x*.12,y*.12,44)*5)*Math.PI*2)*.5+.5;
        if(vein>.85||vein2>.88)return[200,230,210];
        const gr=80+n*88,rb=50+n*57;return[rb,gr+40,rb];
    }));
    textures.push(crearTex(TEX_SZ,(x,y)=>{
        const stripe=Math.sin(y*.6)*.15,n=smoothNoise(x*.2,y*.2,66)*.3;
        const refl=smoothNoise((x+y)*.1,(x-y)*.1,13)*.25;
        let b=.7+stripe+n+refl;b=Math.max(.4,Math.min(1.3,b));
        if(x%16<2)return[160,130,0];
        return[215*b,175*b,0];
    }));
    textures.push(crearTex(TEX_SZ,(x,y)=>{
        const lx=x%21,isGap=(lx<=1);
        let g=smoothNoise(x*.08,y*.5,7)*.4+smoothNoise(x*.2,y*1.2,23)*.2+.4;g=clamp(g);
        const isH=((y>=28&&y<=36||y>=90&&y<=98)&&x>=8&&x<=118);
        const isB=((x===20||x===105)&&y>=28&&y<=98);
        if(isGap)return[30,20,10];
        if(isH||isB){const m=smoothNoise(x*.4,y*.4,55)*.2+.8;return[120*m,110*m,90*m];}
        return[90*g,60*g,30*g];
    }));
    textures.push(crearTex(TEX_SZ,(x,y)=>{
        let n=smoothNoise(x*.14,y*.14,8)+.5*smoothNoise(x*.3,y*.3,44);
        n/=1.5;n=clamp(n);
        const wet=smoothNoise(x*.18,y*.1+.8,31);
        const damp=y>TEX_SZ*.6?wet*.5:0;
        const crack=smoothNoise(x*.7+.1,y*1.8+.3,99)>.78;
        const base=45+n*55;
        if(crack)return[15,12,20];
        return[base*(1-damp)*.85,base*(1-damp)*.88,base*(1-damp*.5)];
    }));
    textures.push(null); // lava — animada
}
function actualizarTexLava(){
    const sz=TEX_SZ,t=gameTime,buf=new Uint8ClampedArray(sz*sz*4);
    for(let y=0;y<sz;y++) for(let x=0;x<sz;x++){
        const rock=clamp((smoothNoise(x*.13,y*.13,77)+.4*smoothNoise(x*.3,y*.3,22))/1.4);
        const lv=Math.sin((x*.2+y*.15+t*1.5)*2.5)*.5+.5;
        const lv2=Math.sin((x*.1-y*.22+t*1.2)*2)*.5+.5;
        const lava=(lv*lv2)**2;
        const rb=30+rock*50,i=(y*sz+x)*4;
        if(lava>.55){const p=.7+.3*Math.sin(t*4+x*.3+y*.2);buf[i]=240*p;buf[i+1]=80*p;buf[i+2]=0;}
        else{buf[i]=rb;buf[i+1]=rb*.6;buf[i+2]=rb*.4;}
        buf[i+3]=255;
    }
    textures[7]=buf;
}
function tileToTex(t){const m={1:1,2:2,3:3,4:4,5:5,6:6,7:7};return m[t]||1;}

// ── Socket ────────────────────────────────────────────────────────────────
function conectarSocket(token, salaId) {
    socket = io({ auth:{ token, salaId, socketIdAnterior: miId } });

    socket.on('connect', () => {
        console.log('🟢 Socket conectado, nuevo id:', socket.id);
        socket.emit('reconectar_sala', { salaId, socketIdAnterior: miId });
        SOUND.reanudar();
        SOUND.iniciarMusica();
    });

    // Movimiento de otros jugadores/NPCs
    socket.on('jugador_movio', (snap) => {
        // Renombrar vivo→snapVivo para NO hacer shadow de la variable global vivo
        const { id, x, y, angle, arma, estado, z, skin, hp, ts } = snap;
        const snapVivo = snap.vivo;

        // Ignorar completamente nuestros propios snapshots —
        // el movimiento local ya es authoritative en el cliente
        if (id === miId) return;

        // Crear entrada si no existe
        if (!jugadores[id]) {
            const esNPC = id.startsWith('e_') || id.startsWith('npc_');
            jugadores[id] = {
                nombre: esNPC ? (id.split('_')[2] || 'NPC') : id,
                vivo: true, hp: 100, maxHp: 100,
                esNPC, skin: skin || 'conquistador',
                x, y, z: z || 0, angle: angle || 0,
            };
            interpBuffers[id] = PHYSICS.crearBuffer();
        }

        // Guardar snapshot en buffer de interpolación
        if (!interpBuffers[id]) interpBuffers[id] = PHYSICS.crearBuffer();
        PHYSICS.pushSnapshot(interpBuffers[id], { x, y, z: z||0, angle, ts: ts || Date.now() });

        // Aplicar inmediatamente (con suavizado)
        PHYSICS.aplicarSnapshot(jugadores[id], snap, 256);
        jugadores[id].arma   = arma;
        jugadores[id].vivo   = snapVivo !== false; // usar snapVivo, no la global
        if (estado !== undefined) jugadores[id].estado = estado;
        if (skin)  jugadores[id].skin = skin;
        if (hp !== undefined) jugadores[id].hp = hp;
    });

    socket.on('npcs_spawned', npcs => {
        for (const id in npcs) jugadores[id]={...npcs[id]};
    });

    socket.on('bala_creada', bala => {
        balas[bala.id]={...bala,localLife:bala.vida||2.5};
    });

    socket.on('jugador_recibio_danio', ({id,hp,fromId,danio}) => {
        if (jugadores[id]) jugadores[id].hp=hp;
        if (id===miId) {
            yo.hp=hp; actualizarHP(); flashDanio(); SOUND.danio();
        }
    });

    socket.on('jugador_murio', ({id,matadoPor,kills,muertes}) => {
        // Marcar como muerto
        if (jugadores[id]) jugadores[id].vivo = false;

        const esNPCmuerto   = id && (id.startsWith('e_') || id.startsWith('npc_'));

        // Si es NPC, eliminarlo del objeto después de 800ms (pequeño delay visual)
        if (esNPCmuerto) {
            setTimeout(() => { delete jugadores[id]; delete interpBuffers[id]; }, 800);
        }
        const nombreVictima = jugadores[id]?.nombre || (esNPCmuerto ? 'Conquistador' : id);
        const nombreKiller  = jugadores[matadoPor]?.nombre || (matadoPor === 'boss' ? 'Hernán Cortés' : matadoPor);

        if (matadoPor === miId) {
            if (yo) { yo.kills = kills; setText('hudKills', kills); }
            SOUND.muerteNPC();
            addKillfeed(`⚔️ ${yo?.nombre||'Tú'} eliminó a ${nombreVictima}`, true);
        } else if (!esNPCmuerto) {
            // Solo mostrar killfeed si murió un jugador real, no un NPC
            addKillfeed(`💀 ${nombreKiller} eliminó a ${nombreVictima}`);
        }

        // Solo activar respawn si NOSOTROS morimos
        if (id === miId) { vivo = false; SOUND.muerteJugador(); mostrarRespawn(5); }
    });

    socket.on('jugador_respawn', ({id,x,y,hp}) => {
        if (!jugadores[id]) return;
        jugadores[id].x=x; jugadores[id].y=y; jugadores[id].hp=hp; jugadores[id].vivo=true;
        if (id===miId) {
            yo.x=x; yo.y=y; yo.hp=hp; vivo=true;
            document.getElementById('respawnOverlay').style.display='none';
            actualizarHP(); SOUND.respawn();
        }
    });

    // Pickups
    socket.on('moneda_recogida', ({monedaId,porId,monedas:m}) => {
        delete monedas[monedaId];
        if (porId===miId) { yo.monedas=m||0; setText('hudMonedas',yo.monedas); SOUND.moneda(); }
    });
    socket.on('corazon_recogido', ({id,porId,hp}) => {
        delete corazones[id];
        if (porId===miId) SOUND.corazon();
        if (porId===miId && yo) { yo.hp=hp; actualizarHP(); }
    });
    socket.on('ammo_recogido', ({id,porId,ammo}) => {
        delete ammoDrops[id];
        if (porId===miId && yo) { yo.ammo=ammo; SOUND.ammo(); actualizarHUDAmmo(); }
    });
    socket.on('pickup_spawned', ({tipo,data}) => {
        if (tipo==='moneda')   monedas[data.id]=data;
        else if (tipo==='corazon') corazones[data.id]=data;
        else if (tipo==='ammo')    ammoDrops[data.id]=data;
    });

    // Nivel
    socket.on('nivel_transicion', ({nivelActual:nA, nivelSiguiente:nS}) => {
        transicionando=true;
        nivelActual=nA;
        mostrarTransicion(nA, nS);
    });
    socket.on('nivel_cargado', ({nivel, mapa:mapaData, jugadores:jugs, npcs, monedas:m, corazones:c, ammoDrops:a}) => {
        transicionando=false;
        nivelActual=nivel;
        mapa=mapaData;
        if (jugs) jugadores={...jugs};
        yo=jugadores[miId];
        if (npcs) for (const id in npcs) jugadores[id]={...npcs[id]};
        monedas={}; if(m) Object.entries(m).forEach(([k,v])=>monedas[k]=v);
        corazones={}; if(c) Object.entries(c).forEach(([k,v])=>corazones[k]=v);
        ammoDrops={}; if(a) Object.entries(a).forEach(([k,v])=>ammoDrops[k]=v);
        balas={}; bossData=null;
        ocultarTransicion();
        setText('hudNivel','Nivel '+nivel);
        addKillfeed(`🏛️ ¡NIVEL ${nivel} INICIADO!`);
    });

    // Jefe
    socket.on('boss_update', data => { bossData=data; });
    socket.on('boss_muerto', () => {
        bossData=null;
        addKillfeed('💀 ¡HERNÁN CORTÉS HA CAÍDO!', true);
    });

    // Timer del servidor
    socket.on('tick_timer', ({playTimer:pt, nivel}) => {
        playTimer=pt; nivelActual=nivel||nivelActual;
        const m=Math.floor(pt/60).toString().padStart(2,'0');
        const s=Math.floor(pt%60).toString().padStart(2,'0');
        setText('hudTimer',`${m}:${s}`);
    });

    socket.on('chat_msg', ({nombre,msg}) => addChat(nombre,msg));

    socket.on('sync_estado', ({ jugadores: jugs, tuId, npcs }) => {
        // FIX BUG SYNC: guardar datos locales del jugador (posición, hp, etc.)
        const datosLocales = jugadores[miId] || {};
        const idAnterior   = miId;
        miId = tuId;

        for (const id in jugs) {
            if (id === miId) {
                // Mezclar: priorizar datos locales de posición, datos servidor para stats
                jugadores[miId] = {
                    ...jugs[id],
                    x:     datosLocales.x     ?? jugs[id].x,
                    y:     datosLocales.y     ?? jugs[id].y,
                    angle: datosLocales.angle ?? jugs[id].angle,
                    z:     datosLocales.z     || 0,
                };
                yo = jugadores[miId];
            } else {
                jugadores[id] = { ...jugs[id] };
                interpBuffers[id] = PHYSICS.crearBuffer();
            }
        }

        // Limpiar entrada con id anterior si cambió
        if (idAnterior !== miId && jugadores[idAnterior]) {
            delete jugadores[idAnterior];
            delete interpBuffers[idAnterior];
        }

        if (npcs) for (const id in npcs) jugadores[id] = { ...npcs[id] };

        // FIX BUG SYNC: ahora sí está seguro enviar movimiento
        syncConfirmado = true;
        actualizarHUDAmmo();
        console.log('🔄 Sync confirmado, miId:', miId);
    });

    socket.on('jugador_cambio_id', ({ idAnterior, idNuevo, jugador: jug }) => {
        // Otro jugador se reconectó con nuevo socket id
        if (jugadores[idAnterior]) {
            jugadores[idNuevo] = { ...jugadores[idAnterior], ...jug };
            delete jugadores[idAnterior];
        } else {
            jugadores[idNuevo] = { ...jug };
        }
        console.log(`🔄 Jugador cambió id: ${idAnterior} → ${idNuevo}`);
    });

    socket.on('jugador_salio', ({id}) => { delete jugadores[id]; });
    socket.on('jugador_unido', jug => { jugadores[jug.id]=jug; });

    socket.on('partida_terminada', ({razon,resultados}) => mostrarResultado(resultados));

    socket.on('disconnect', () => console.log('🔴 Socket desconectado'));
}

// ── Loop principal ────────────────────────────────────────────────────────
function loop(ts) {
    const dt=Math.min((ts-lastTime)/1000,0.05);
    lastTime=ts; gameTime+=dt;

    if (!mapa||!yo) { requestAnimationFrame(loop); return; }

    actualizarTexLava();
    if (vivo) procesarInput(dt);
    actualizarBalas(dt);
    actualizarParticulas(dt);
    comprobarPickups();
    try { render(); } catch(e) { console.warn('render error:', e.message); }
    if (bossData?.active) SOUND.tickJefe(gameTime);
    try { renderMinimap(); } catch(e) { console.warn('minimap error:', e.message); }
    requestAnimationFrame(loop);
}

// ── Input ─────────────────────────────────────────────────────────────────
const MOUSE_SENS = 0.003; // sensibilidad mouse directa

function initControles() {
    document.addEventListener('keydown', e => {
        if (chatAbierto) return;
        keys[e.code]=true;
        if (e.code==='KeyQ' || e.code==='Tab') { e.preventDefault(); cambiarArma(); }
        if (e.code==='KeyT') { e.preventDefault(); abrirChat(); }
        if (e.code==='Escape') {
            if (document.pointerLockElement===canvas) document.exitPointerLock();
            else cerrarChat();
        }
    });
    document.addEventListener('keyup', e => { keys[e.code]=false; });

    // lookZone = div transparente encima del canvas
    // En desktop cubre TODO, en móvil solo la mitad derecha
    const lz = document.getElementById('lookZone');

    // Click en lookZone — capturar mouse (pointer lock)
    lz.addEventListener('click', () => {
        if (!chatAbierto) canvas.requestPointerLock();
    });

    // Pointer lock — feedback en crosshair
    document.addEventListener('pointerlockchange', () => {
        const locked = document.pointerLockElement === canvas;
        const ch = document.getElementById('crosshair');
        if (ch) ch.style.opacity = locked ? '1' : '0.4';
    });

    // Mouse move — rotación directa sin fricción
    document.addEventListener('mousemove', e => {
        if (document.pointerLockElement !== canvas || !vivo) return;
        yo.angle += e.movementX * MOUSE_SENS;
    });

    // Click izquierdo en lookZone — capturar O disparar
    lz.addEventListener('mousedown', e => {
        if (e.button === 0) {
            if (document.pointerLockElement !== canvas) {
                canvas.requestPointerLock();
            } else if (vivo) {
                disparar();
            }
        }
    });

    // Backup: cualquier click izquierdo dispara si ya hay pointer lock
    document.addEventListener('mousedown', e => {
        if (e.button === 0 && document.pointerLockElement === canvas && vivo) {
            disparar();
        }
    });

    // Rueda del mouse — cambiar arma
    document.addEventListener('wheel', e => {
        if (document.pointerLockElement === canvas) {
            e.preventDefault();
            cambiarArma();
        }
    }, { passive: false });

    initJoystick();
}

function procesarInput(dt) {
    if (!vivo||chatAbierto) return;
    const spd=PLAYER_SPD;
    let nx=yo.x, ny=yo.y;

    if (keys['KeyW']||keys['ArrowUp'])   { nx+=Math.cos(yo.angle)*spd; ny+=Math.sin(yo.angle)*spd; }
    if (keys['KeyS']||keys['ArrowDown']) { nx-=Math.cos(yo.angle)*spd; ny-=Math.sin(yo.angle)*spd; }
    if (keys['KeyA'])                    { nx+=Math.cos(yo.angle-HALF_PI)*spd; ny+=Math.sin(yo.angle-HALF_PI)*spd; }
    if (keys['KeyD'])                    { nx+=Math.cos(yo.angle+HALF_PI)*spd; ny+=Math.sin(yo.angle+HALF_PI)*spd; }
    if (keys['ArrowLeft'])  yo.angle-=TURN_SPD;
    if (keys['ArrowRight']) yo.angle+=TURN_SPD;

    if (joystick.active) {
        nx+=Math.cos(yo.angle)*(-joystick.y)*spd + Math.cos(yo.angle+HALF_PI)*joystick.x*spd;
        ny+=Math.sin(yo.angle)*(-joystick.y)*spd + Math.sin(yo.angle+HALF_PI)*joystick.x*spd;
    }

    const m=PLAYER_SPD*0.8;
    if (!colisiona(nx,yo.y,m)) yo.x=nx;
    if (!colisiona(yo.x,ny,m)) yo.y=ny;

    if (keys['ControlLeft'] && vivo) disparar();  // Ctrl también dispara

    // ── Salto ─────────────────────────────────────────────────────────────
    if ((keys['Space'] || keys['KeyF']) && !saltando) {
        if (PHYSICS.iniciarSalto(yo)) {
            saltando = true;
        }
    }

    // Tick física vertical
    PHYSICS.tickSalto(yo, dt);
    if (yo.onGround) saltando = false;

    // Sonido de pasos
    const seMoviendo = keys['KeyW']||keys['KeyS']||keys['KeyA']||keys['KeyD']||keys['ArrowUp']||keys['ArrowDown']||joystick.active;
    SOUND.iniciarPasos(seMoviendo && vivo);

    // FIX BUG SYNC: no enviar mover hasta confirmar sync con el servidor
    if (syncConfirmado && Date.now() - lastMoveSent > 50) {
        socket.emit('mover', { x: yo.x, y: yo.y, angle: yo.angle, z: yo.z || 0 });
        lastMoveSent = Date.now();
    }
}

function colisiona(x, y, radio) {
    // Usa PHYSICS para colisión consistente cliente/servidor
    return PHYSICS.colisionAABB(mapa, x, y, radio || PHYSICS.PLAYER_RADIUS);
}

function disparar() {
    if (!vivo) return;
    const now=Date.now();
    const arma=ARMAS[armaActual];
    if (now-lastShot<arma.cooldown) return;
    lastShot=now;
    const dx=Math.cos(yo.angle)*BULLET_SPD;
    const dy=Math.sin(yo.angle)*BULLET_SPD;
    spawnParticula(yo.x+Math.cos(yo.angle)*30,yo.y+Math.sin(yo.angle)*30,255,200,80,8);
    SOUND.disparo(armaActual);
    socket.emit('disparar',{x:yo.x,y:yo.y,dx,dy,danio:arma.danio,arma:armaActual,angle:yo.angle});
}

function cambiarArma() {
    armaActual=(armaActual+1)%ARMAS.length;
    setText('armaName',ARMAS[armaActual].nombre);
    document.getElementById('armaName').style.color=ARMAS[armaActual].color;
    actualizarHUDAmmo();
}
function actualizarHUDAmmo() {
    if (!yo) return;
    const ammoEl = document.getElementById('municion');
    if (!ammoEl) return;
    const ammo = yo.ammo !== undefined ? yo.ammo : 50;
    const max  = ARMAS[armaActual].ammoMax || 50;
    ammoEl.textContent = `🏹 ${ammo} / ${max}`;
    ammoEl.style.color = ammo <= 10 ? '#ff4444' : ammo <= 25 ? '#ffd60a' : '#8888aa';
}

// ── Balas (cliente — visual solamente) ───────────────────────────────────
function actualizarBalas(dt) {
    const aBorrar = [];
    for (const id in balas) {
        const b = balas[id];
        // Guard: bala inválida o sin posición
        if (!b || b.x === undefined || b.dx === undefined) { aBorrar.push(id); continue; }
        b.x += b.dx; b.y += b.dy;
        b.localLife -= dt;
        const tx = Math.floor(b.x / TILE), ty = Math.floor(b.y / TILE);
        const fueraDelMapa = ty < 0 || ty >= mapa.alto || tx < 0 || tx >= mapa.ancho;
        const golpePared   = !fueraDelMapa && mapa.tiles[ty][tx] !== 0;
        if (b.localLife <= 0 || fueraDelMapa || golpePared) {
            if (!fueraDelMapa) spawnParticula(b.x, b.y, 200, 200, 100, 4);
            aBorrar.push(id);
        }
    }
    // Borrar fuera del loop para no romper la iteración
    for (const id of aBorrar) delete balas[id];
}

// ── Pickups (colección visual en cliente) ─────────────────────────────────
function comprobarPickups() {
    if (!vivo) return;
    for (const id in monedas) {
        const m=monedas[id];
        const dx=m.x-yo.x,dy=m.y-yo.y;
        if (Math.sqrt(dx*dx+dy*dy)<36) {
            delete monedas[id];
            socket.emit('recoger_moneda',id);
        }
    }
    for (const id in corazones) {
        const h=corazones[id];
        const dx=h.x-yo.x,dy=h.y-yo.y;
        if (Math.sqrt(dx*dx+dy*dy)<36) {
            delete corazones[id];
            socket.emit('recoger_corazon',id);
        }
    }
    for (const id in ammoDrops) {
        const a=ammoDrops[id];
        const dx=a.x-yo.x,dy=a.y-yo.y;
        if (Math.sqrt(dx*dx+dy*dy)<36) {
            delete ammoDrops[id];
            socket.emit('recoger_ammo',id);
        }
    }
}

// ── Partículas ────────────────────────────────────────────────────────────
function spawnParticula(x,y,r,g,b,n) {
    for (let i=0;i<n;i++) {
        const a=Math.random()*TWO_PI,s=1+Math.random()*4;
        particulas.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:1,r,g,b});
    }
}
function actualizarParticulas(dt) {
    for (let i=particulas.length-1;i>=0;i--) {
        const p=particulas[i];
        p.x+=p.vx;p.y+=p.vy;p.vy+=.3;p.life-=dt*2.5;
        if (p.life<=0) particulas.splice(i,1);
    }
}

// ── Raycaster ─────────────────────────────────────────────────────────────
// ── Raycaster DDA (Digital Differential Analysis) — estándar desde Wolfenstein ──
// Mucho más rápido que el brute-force anterior: O(hits) en lugar de O(1400)
function castRay(angle) {
    const rdx = Math.cos(angle), rdy = Math.sin(angle);
    // Posición del jugador en coordenadas de tile
    let mapX = Math.floor(yo.x / TILE), mapY = Math.floor(yo.y / TILE);
    // Longitud del rayo para cruzar 1 tile en cada eje
    const deltaX = Math.abs(1 / rdx), deltaY = Math.abs(1 / rdy);
    // Paso de tile (±1) y distancia inicial al primer borde de tile
    const stepX = rdx < 0 ? -1 : 1;
    const stepY = rdy < 0 ? -1 : 1;
    let sideDistX = rdx < 0
        ? (yo.x / TILE - mapX) * deltaX
        : (mapX + 1 - yo.x / TILE) * deltaX;
    let sideDistY = rdy < 0
        ? (yo.y / TILE - mapY) * deltaY
        : (mapY + 1 - yo.y / TILE) * deltaY;

    let side = 0; // 0=vertical wall hit, 1=horizontal wall hit
    for (let i = 0; i < 256; i++) {
        if (sideDistX < sideDistY) { sideDistX += deltaX; mapX += stepX; side = 0; }
        else                       { sideDistY += deltaY; mapY += stepY; side = 1; }
        if (mapX < 0 || mapX >= mapa.ancho || mapY < 0 || mapY >= mapa.alto)
            return { hit: false, dist: 900 };
        const tile = mapa.tiles[mapY][mapX];
        if (tile !== 0) {
            // Distancia perpendicular (evita fish-eye)
            const perpDist = side === 0
                ? (mapX - yo.x / TILE + (1 - stepX) / 2) / rdx * TILE
                : (mapY - yo.y / TILE + (1 - stepY) / 2) / rdy * TILE;
            // Posición exacta en la pared para coordenada de textura
            const wallX = side === 0
                ? (yo.y + perpDist * rdy) / TILE % 1
                : (yo.x + perpDist * rdx) / TILE % 1;
            return { hit: true, dist: Math.abs(perpDist), tile, side, wallX: Math.max(0, wallX) };
        }
    }
    return { hit: false, dist: 900 };
}

function rgba(r,g,b,a=255){return((a&0xff)<<24)|((b&0xff)<<16)|((g&0xff)<<8)|(r&0xff);}

// ── Render 3D ─────────────────────────────────────────────────────────────
function render() {
    const imgData=ctx.createImageData(W,H);
    const buf32=new Uint32Array(imgData.data.buffer);
    const horizon=H/2+(Math.sin(gameTime*.3)*.5);
    const isNivel2=(mapa.ancho>=36&&mapa.ancho<48);
    const isNivel3=(mapa.ancho>=48);

    // Cielo y suelo
    for (let y=0;y<H;y++) {
        if (y<horizon) {
            const t=y/horizon;
            let r,g,b;
            if (isNivel3)      {r=10;g=5;b=20;}
            else if (isNivel2) {r=5+t*15;g=3+t*8;b=15+t*20;}
            else               {r=20+t*60;g=10+t*30;b=40+t*80;}
            for (let x=0;x<W;x++) buf32[y*W+x]=rgba(r,g,b);
        } else {
            const rowDist=(H*.5)/(y-horizon+.001);
            const floorX0=yo.x/TILE+(Math.cos(yo.angle-HALF_FOV)*rowDist);
            const floorY0=yo.y/TILE+(Math.sin(yo.angle-HALF_FOV)*rowDist);
            const floorXW=yo.x/TILE+(Math.cos(yo.angle+HALF_FOV)*rowDist);
            const floorYW=yo.y/TILE+(Math.sin(yo.angle+HALF_FOV)*rowDist);
            const stepX=(floorXW-floorX0)/W,stepY=(floorYW-floorY0)/W;
            let fx=floorX0,fy=floorY0;
            const bright=Math.max(.06,.4-rowDist*.015);
            for (let x=0;x<W;x++) {
                const tx=((Math.floor(fx*TEX_SZ))&(TEX_SZ-1));
                const ty2=((Math.floor(fy*TEX_SZ))&(TEX_SZ-1));
                const idx=(ty2*TEX_SZ+tx)*4;
                const tex=textures[1];
                buf32[y*W+x]=rgba(tex[idx]*bright,tex[idx+1]*bright,tex[idx+2]*bright);
                fx+=stepX;fy+=stepY;
            }
        }
    }

    // Paredes
    const fogStart=isNivel3?150:isNivel2?200:300;
    const fogEnd  =isNivel3?400:isNivel2?500:700;
    const fogR=isNivel2||isNivel3?30:180,fogG=isNivel2||isNivel3?10:160,fogB=isNivel2||isNivel3?40:120;

    for (let x=0;x<W;x++) {
        const ra=(yo.angle-HALF_FOV)+(x/W)*FOV;
        const hit=castRay(ra);
        const pw=hit.hit?hit.dist*Math.cos(ra-yo.angle):900;
        zBuffer[x]=pw;
        if (!hit.hit) continue;
        const wh=(TILE/pw)*600,wT=Math.floor(horizon-wh/2),wB=Math.floor(horizon+wh/2);
        let bright=1/(1+pw*.004);
        if (isNivel2||isNivel3) bright*=.65;
        if (hit.side) bright*=.65;
        bright=Math.max(.06,bright);
        const fogF=Math.max(0,Math.min(1,(pw-fogStart)/(fogEnd-fogStart)));
        const texIdx=tileToTex(hit.tile);
        const texBuf=textures[texIdx];
        if (!texBuf) continue;
        const txX=Math.floor(hit.wallX*TEX_SZ);
        const clT=Math.max(0,wT),clB=Math.min(H-1,wB);
        const wallH=Math.max(1,wB-wT);
        const texStep=TEX_SZ/wallH;
        let texPos=(clT-wT)*texStep;
        for (let y=clT;y<=clB;y++,texPos+=texStep) {
            const tY=Math.min(TEX_SZ-1,Math.floor(texPos));
            const i=(tY*TEX_SZ+Math.min(TEX_SZ-1,txX))*4;
            let r=texBuf[i]*bright,g=texBuf[i+1]*bright,b=texBuf[i+2]*bright;
            if (fogF>0) {
                const nf=1-fogF*.78;
                r=r*nf+fogR*fogF*.78;g=g*nf+fogG*fogF*.78;b=b*nf+fogB*fogF*.78;
            }
            buf32[y*W+x]=rgba(r,g,b);
        }
    }

    ctx.putImageData(imgData,0,0);
    renderSprites();
    renderBalas();
    renderArma();
    renderParticulas2D();
    renderBoss();
}

// ── Sprites (jugadores y pickups) con SKINS.JS ───────────────────────────
function renderSprites() {
    const sprites=[];
    for (const id in jugadores) {
        if (id === miId) continue;
        const j = jugadores[id];
        // Guard: saltar si muerto, sin posición, o sin yo válido
        if (!j || !j.vivo || j.x === undefined || j.y === undefined) continue;
        const dx = j.x - yo.x, dy = j.y - yo.y;
        sprites.push({type:'jugador', dist: Math.sqrt(dx*dx+dy*dy), j, dx, dy});
    }
    for (const id in monedas) {
        const m=monedas[id];
        const dx=m.x-yo.x,dy=m.y-yo.y;
        sprites.push({type:'moneda',dist:Math.sqrt(dx*dx+dy*dy),m,dx,dy});
    }
    for (const id in corazones) {
        const h=corazones[id];
        const dx=h.x-yo.x,dy=h.y-yo.y;
        sprites.push({type:'corazon',dist:Math.sqrt(dx*dx+dy*dy),h,dx,dy});
    }
    for (const id in ammoDrops) {
        const a=ammoDrops[id];
        const dx=a.x-yo.x,dy=a.y-yo.y;
        sprites.push({type:'ammo',dist:Math.sqrt(dx*dx+dy*dy),a,dx,dy});
    }
    sprites.sort((a,b)=>b.dist-a.dist);

    for (const sp of sprites) {
        const angle=Math.atan2(sp.dy,sp.dx)-yo.angle;
        let a=angle;
        while(a<-Math.PI)a+=TWO_PI;
        while(a>Math.PI)a-=TWO_PI;
        // FOV/1.8 era muy amplio — reducir a FOV/2 para no ver sprites detrás de paredes
        if (Math.abs(a)>FOV/2) continue;

        const scx=(a/FOV+.5)*W;
        // Guard: evitar división por cero y sprites gigantes cuando dist es muy pequeña
        const safeDist = Math.max(sp.dist, 8);
        const sh=Math.min((TILE/safeDist)*600, H*3), sw=sh;
        const groundLine=H/2+sh*.5,drawY=groundLine-sh;

        if (sp.type==='jugador') {
            const iw=Math.max(1,Math.min(Math.floor(sw), W)),ih=Math.max(1,Math.min(Math.floor(sh), H*2));
            const drawX=Math.floor(scx-sw/2);
            let vis=false;
            for (let c=0;c<iw;c++){const sc=drawX+c;if(sc>=0&&sc<W&&safeDist<zBuffer[sc]){vis=true;break;}}
            if (!vis) continue;

            const bright=Math.max(.3,1-safeDist/600);
            // Usar skins.js para dibujar el personaje
            ctx.save();
            try {
                dibujarSkin(ctx, sp.j.skin||'guerrero_base', drawX, Math.floor(drawY), iw, ih, gameTime, bright, {aiEstado:sp.j.estado});
            } catch(e) { console.warn('skin draw error:', e.message); }
            ctx.restore();

            // Nombre + barra HP
            if (sp.dist<320) {
                const alpha=Math.max(0,Math.min(1,1-sp.dist/320));
                ctx.globalAlpha=alpha;
                ctx.fillStyle='#fff';
                ctx.font=`bold ${Math.max(8,Math.floor(10*sh/100))}px monospace`;
                ctx.textAlign='center';
                ctx.fillText(sp.j.nombre||'?',scx,drawY-4);
                const bw=Math.min(80,iw),bx=Math.floor(scx-bw/2),by2=Math.floor(drawY)-12;
                ctx.fillStyle='#222';ctx.fillRect(bx,by2,bw,5);
                const hpPct=Math.max(0,(sp.j.hp||0)/100);
                ctx.fillStyle=hpPct>.5?'#06d6a0':hpPct>.25?'#ffd60a':'#cc2222';
                ctx.fillRect(bx,by2,Math.floor(bw*hpPct),5);
                ctx.globalAlpha=1;
            }

        } else if (sp.type==='moneda') {
            // Moneda pixel art circular estilo Mario — pequeña y redonda
            const csz=Math.max(4,Math.floor(sw*.32)); // bien pequeña
            const bob=Math.sin(gameTime*4+(sp.m.bob||0))*3;
            const cx2=Math.floor(scx), cy2=Math.floor(H/2+bob);
            let vis=false;
            for(let c=cx2-csz;c<cx2+csz&&!vis;c++)if(c>=0&&c<W&&sp.dist<zBuffer[c])vis=true;
            if(!vis) continue;
            // Efecto giro: aplanar en X como moneda girando
            const giro=Math.abs(Math.cos(gameTime*3+(sp.m.bob||0)));
            const px=Math.max(1,Math.floor(csz/7)); // tamaño de cada píxel del grid
            // Grid 7×7 circular (0=vacío, 1=borde oscuro, 2=dorado, 3=brillo)
            const cmap=[
                [0,0,1,1,1,0,0],
                [0,1,2,2,2,1,0],
                [1,2,3,2,2,2,1],
                [1,2,3,2,2,2,1],
                [1,2,2,2,2,2,1],
                [0,1,2,2,2,1,0],
                [0,0,1,1,1,0,0],
            ];
            ctx.imageSmoothingEnabled=false;
            ctx.shadowColor='#ffd60a'; ctx.shadowBlur=5;
            const anchoGiro=Math.max(1,Math.floor(7*px*giro));
            const offX=cx2-Math.floor(anchoGiro/2);
            const oy2=cy2-Math.floor(7*px/2);
            for(let row=0;row<7;row++){
                for(let col=0;col<7;col++){
                    const v=cmap[row][col];
                    if(!v) continue;
                    const x0=offX+Math.floor(col*anchoGiro/7);
                    const x1=offX+Math.floor((col+1)*anchoGiro/7);
                    const wd=Math.max(1,x1-x0);
                    ctx.fillStyle=v===3?'#fff5a0':v===2?'#f5c400':'#8a5c00';
                    ctx.fillRect(x0, oy2+row*px, wd, px);
                }
            }
            ctx.shadowBlur=0;
            ctx.imageSmoothingEnabled=true;

        } else if (sp.type==='corazon') {
            // Corazón pixel art — forma clásica de corazón en cuadrícula
            const hsz=Math.max(8,Math.floor(sw*.65));
            const bob=Math.sin(gameTime*2.5+(sp.h.bob||0))*5;
            const cx2=Math.floor(scx), cy2=Math.floor(H/2+bob);
            let vis=false;
            for(let c=cx2-hsz;c<cx2+hsz&&!vis;c++)if(c>=0&&c<W&&sp.dist<zBuffer[c])vis=true;
            if(!vis) continue;
            const p=Math.max(1,Math.floor(hsz/8)); // tamaño de cada píxel
            // pulso de escala suave
            const pulso=1+0.12*Math.sin(gameTime*4+(sp.h.bob||0));
            const s=Math.floor(hsz*pulso);
            const ox=cx2-Math.floor(s/2), oy=cy2-Math.floor(s/2);
            ctx.imageSmoothingEnabled=false;
            // Mapa de píxeles del corazón (8×8 grid, 0=vacío 1=rojo 2=claro)
            // Clásica forma de corazón pixel art
            const px=Math.max(1,Math.floor(s/8));
            const hmap=[
                [0,1,1,0,0,1,1,0],
                [1,2,1,1,1,1,2,1],
                [1,2,2,1,1,2,2,1],
                [1,1,1,1,1,1,1,1],
                [0,1,1,1,1,1,1,0],
                [0,0,1,1,1,1,0,0],
                [0,0,0,1,1,0,0,0],
                [0,0,0,0,0,0,0,0],
            ];
            ctx.shadowColor='#ff4466'; ctx.shadowBlur=10;
            for(let row=0;row<8;row++){
                for(let col=0;col<8;col++){
                    const v=hmap[row][col];
                    if(!v) continue;
                    ctx.fillStyle=v===2?'#ff8899':'#dd1144';
                    ctx.fillRect(ox+col*px, oy+row*px, px, px);
                }
            }
            ctx.shadowBlur=0;
            ctx.imageSmoothingEnabled=true;

        } else if (sp.type==='ammo') {
            // Munición pixel art — pequeña, grid 5×9 un solo cartucho
            const asz=Math.max(4,Math.floor(sw*.28)); // muy pequeña
            const bob=Math.sin(gameTime*3.5+(sp.a.bob||0))*3;
            const cx2=Math.floor(scx), cy2=Math.floor(H/2+bob);
            let vis=false;
            for(let c=cx2-asz;c<cx2+asz&&!vis;c++)if(c>=0&&c<W&&sp.dist<zBuffer[c])vis=true;
            if(!vis) continue;
            ctx.imageSmoothingEnabled=false;
            const p=Math.max(1,Math.floor(asz/5)); // tamaño de cada píxel
            // Grid 5 cols × 9 filas (0=vacío, 1=plomo, 2=bronce, 3=brillo, 4=base oscura)
            const amap=[
                [0,1,1,1,0],
                [0,1,3,1,0],
                [1,2,3,2,1],
                [1,2,3,2,1],
                [1,2,2,2,1],
                [1,2,2,2,1],
                [1,2,2,2,1],
                [1,2,2,2,1],
                [1,4,4,4,1],
            ];
            const ox2=cx2-Math.floor(5*p/2);
            const oy3=cy2-Math.floor(9*p/2);
            ctx.shadowColor='#c87010'; ctx.shadowBlur=4;
            for(let row=0;row<9;row++){
                for(let col=0;col<5;col++){
                    const v=amap[row][col];
                    if(!v) continue;
                    ctx.fillStyle=v===1?'#b0b5b8':v===2?'#c87010':v===3?'#e8c060':'#3a1800';
                    ctx.fillRect(ox2+col*p, oy3+row*p, p, p);
                }
            }
            ctx.shadowBlur=0;
            ctx.imageSmoothingEnabled=true;
        }
    }
}

// ── Render jefe ───────────────────────────────────────────────────────────
function renderBoss() {
    if (!bossData||!bossData.active) return;
    const dx=bossData.x-yo.x,dy=bossData.y-yo.y;
    const d=Math.sqrt(dx*dx+dy*dy);if(d<1)return;
    const angle=Math.atan2(dy,dx)-yo.angle;
    let a=angle;while(a<-Math.PI)a+=TWO_PI;while(a>Math.PI)a-=TWO_PI;
    if(Math.abs(a)>FOV/1.5)return;
    const scx=(a/FOV+.5)*W;
    const bsh=(TILE*2.5/d)*600,bsw=bsh*1.2;
    const bdrY=Math.floor(H/2+bsh*.5-bsh);
    const bdX=Math.floor(scx-bsw/2),biw=Math.floor(bsw),bih=Math.floor(bsh);
    if(biw<4||bih<4)return;
    let vis=false;for(let c=0;c<biw;c++){const sc=bdX+c;if(sc>=0&&sc<W&&d<zBuffer[sc]){vis=true;break;}}
    if(!vis)return;
    const br=Math.max(.2,1-d*.002);
    // Dibujar jefe como sprite grande (Hernán Cortés glorificado)
    ctx.save();
    // Escala extra del jefe
    dibujarSkin(ctx,'conquistador',bdX,bdrY,biw,bih,gameTime,br,{aiEstado:'boss',isBoss:true});
    // Halo de fase 2
    if(bossData.phase===2){
        const pulse=.5+.5*Math.sin(gameTime*8);
        ctx.strokeStyle=`rgba(255,50,0,${pulse})`;
        ctx.lineWidth=Math.max(3,biw*.05);
        ctx.strokeRect(bdX,bdrY,biw,bih);
    }
    ctx.restore();
    // Barra HP del jefe
    const bhp=bossData.hp/bossData.maxHp;
    const barW=Math.min(400,W*0.5),barX=W/2-barW/2;
    ctx.fillStyle='#3c0000';ctx.fillRect(barX,H-140,barW,16);
    ctx.fillStyle=`rgb(${Math.floor(220*(1-bhp))},${Math.floor(220*bhp)},0)`;
    ctx.fillRect(barX,H-140,Math.floor(barW*bhp),16);
    ctx.strokeStyle='#ffd60a';ctx.lineWidth=2;ctx.strokeRect(barX,H-140,barW,16);
    ctx.fillStyle='#ff6400';ctx.font='bold 13px monospace';ctx.textAlign='center';
    ctx.fillText(bossData.phase===2?'HERNÁN CORTÉS [FASE 2]':'HERNÁN CORTÉS [JEFE]',W/2,H-148);
}

// ── Render arma primera persona (usa skins.js indirectamente) ────────────
function renderArma() {
    const bob=Math.sin(gameTime*8)*(vivo?12:0);
    const swing=Math.max(0,(Date.now()-lastShot)/400);
    const swingY=swing<1?(1-swing)*30:0;
    const bx=W/2-80,by=H-200+bob+swingY;
    const arma=ARMAS[armaActual];
    const skinNombre=yo?.skin||'guerrero_base';

    ctx.imageSmoothingEnabled=false;
    // Color de piel según skin activa
    const skinColors={
        guerrero_base:[180,130,70],jaguar:[140,90,50],aguila:[200,170,120],
        sacerdote:[100,60,140],tlaloc:[60,100,180],quetzalcoatl:[220,200,40],
        mictlantecuhtli:[60,20,20],tonatiuh:[240,160,20]
    };
    const [sr,sg,sb]=skinColors[skinNombre]||skinColors.guerrero_base;

    // Brazos
    ctx.fillStyle=`rgb(${sr},${sg},${sb})`;
    ctx.fillRect(bx+10,by+120,30,70);
    ctx.fillRect(bx+10,by+185,35,20);
    ctx.fillRect(bx+120,by+120,30,70);
    ctx.fillRect(bx+115,by+185,35,20);
    // Brazaletes dorados
    ctx.fillStyle='#ffd60a';
    ctx.fillRect(bx+8,by+183,37,5);
    ctx.fillRect(bx+113,by+183,37,5);

    // Arma
    ctx.fillStyle=arma.color;
    switch(armaActual){
        case 0: // Macuahuitl
            ctx.fillRect(bx+30,by+40,100,20);
            ctx.fillStyle='#222';ctx.fillRect(bx+38,by+30,10,60);
            ctx.fillRect(bx+52,by+30,10,60);ctx.fillRect(bx+66,by+30,10,60);
            ctx.fillStyle='#ccccff';
            ctx.fillRect(bx+35,by+30,6,60);ctx.fillRect(bx+49,by+30,6,60);
            ctx.fillRect(bx+63,by+30,6,60);ctx.fillRect(bx+77,by+30,6,60);
            ctx.fillStyle='#006b3c';ctx.fillRect(bx+56,by+55,58,18);
            break;
        case 1: // Atlatl
            ctx.fillRect(bx+20,by+50,120,12);
            ctx.fillStyle='#ffcc00';ctx.fillRect(bx+130,by+42,6,26);
            ctx.fillStyle='#886600';ctx.fillRect(bx+20,by+50,30,12);
            ctx.fillStyle='#cc2800';ctx.fillRect(bx+18,by+35,16,30);
            ctx.fillStyle='#0044cc';ctx.fillRect(bx+96,by+35,16,30);
            break;
        case 2: // Arco
            ctx.strokeStyle=arma.color;ctx.lineWidth=7;
            ctx.beginPath();ctx.arc(bx+75,by+100,70,-Math.PI*.7,Math.PI*.7);ctx.stroke();
            ctx.strokeStyle='#ccaa44';ctx.lineWidth=2;
            ctx.beginPath();ctx.moveTo(bx+75,by+30);ctx.lineTo(bx+75,by+170);ctx.stroke();
            ctx.fillStyle='#b0b8d0';ctx.fillRect(bx+44,by+24,16,20);
            break;
    }

    // Flash de disparo
    if (Date.now()-lastShot<80) {
        ctx.fillStyle='rgba(255,200,80,.7)';
        ctx.beginPath();ctx.arc(bx+75,by+40,22,0,TWO_PI);ctx.fill();
    }
}

// ── Render balas ──────────────────────────────────────────────────────────
function renderBalas() {
    for (const id in balas) {
        const b=balas[id];
        if (!b || b.x===undefined || isNaN(b.x) || isNaN(b.y)) continue;
        const dx=b.x-yo.x,dy=b.y-yo.y;
        const d=Math.sqrt(dx*dx+dy*dy);if(d>500||d<5)continue;
        const angle=Math.atan2(dy,dx)-yo.angle;
        let a=angle;while(a<-Math.PI)a+=TWO_PI;while(a>Math.PI)a-=TWO_PI;
        if(Math.abs(a)>FOV/1.6)continue;
        const scx=(a/FOV+.5)*W,sc=Math.floor(scx);
        if(sc<0||sc>=W||d>=zBuffer[sc])continue;
        const sh=(TILE/d)*600,sz=Math.max(3,Math.floor(8*sh/200));
        const esPropia=b.fromId===miId;
        ctx.fillStyle=esPropia?'#ffdd00':'#ff4400';
        ctx.shadowColor=esPropia?'#ffdd00':'#ff4400';ctx.shadowBlur=6;
        ctx.fillRect(scx-sz/2,H/2-sz/2,sz,sz);ctx.shadowBlur=0;
    }
}

// ── Render partículas ─────────────────────────────────────────────────────
function renderParticulas2D() {
    for (const p of particulas) {
        const dx=p.x-yo.x,dy=p.y-yo.y;
        const d=Math.sqrt(dx*dx+dy*dy);if(d>300)continue;
        const angle=Math.atan2(dy,dx)-yo.angle;
        let a=angle;while(a<-Math.PI)a+=TWO_PI;while(a>Math.PI)a-=TWO_PI;
        if(Math.abs(a)>FOV/1.5)continue;
        const scx=(a/FOV+.5)*W;
        const sh=Math.min(4,(TILE/Math.max(1,d))*30),sy=H/2;
        if(d<zBuffer[Math.floor(scx)]||d<1){
            ctx.globalAlpha=p.life*.9;
            ctx.fillStyle=`rgb(${p.r},${p.g},${p.b})`;
            ctx.fillRect(scx-sh/2,sy-sh/2,sh,sh);
            ctx.globalAlpha=1;
        }
    }
}

// ── Minimap ───────────────────────────────────────────────────────────────
function renderMinimap() {
    if (!mapa) return;
    const sz=130,ts=sz/Math.max(mapa.ancho,mapa.alto);
    mmCanvas.width=mmCanvas.height=sz;
    mmCtx.fillStyle='#000000aa';mmCtx.fillRect(0,0,sz,sz);
    const colors={0:'#00000000',1:'#666',2:'#aa8855',3:'#06d6a0',4:'#ffd60a',5:'#884422',6:'#334',7:'#ff4400'};
    for(let y=0;y<mapa.alto;y++) for(let x=0;x<mapa.ancho;x++){
        const t=mapa.tiles[y][x];
        if(t===0)continue;
        mmCtx.fillStyle=colors[t]||'#555';
        mmCtx.fillRect(x*ts,y*ts,ts,ts);
    }
    // NPCs y jugadores con colores por estado
    for(const id in jugadores){
        if(id===miId||!jugadores[id].vivo)continue;
        const j=jugadores[id];
        if(j.esNPC){
            const e=j.estado||'patrol';
            if(e==='patrol')mmCtx.fillStyle='#c85050';
            else if(e==='flank')mmCtx.fillStyle='#ff8c00';
            else if(e==='pincer')mmCtx.fillStyle='#ff00c8';
            else if(e==='shoot')mmCtx.fillStyle='#ff3232';
            else mmCtx.fillStyle='#ff0000';
            mmCtx.fillRect(j.x/TILE*ts-2,j.y/TILE*ts-2,4,4);
        } else {
            mmCtx.fillStyle='#44aaff';
            mmCtx.fillRect(j.x/TILE*ts-2,j.y/TILE*ts-2,4,4);
        }
    }
    // Monedas, corazones, ammo
    for(const id in monedas){const m=monedas[id];mmCtx.fillStyle='#ffd60a';mmCtx.fillRect(m.x/TILE*ts-1,m.y/TILE*ts-1,2,2);}
    for(const id in corazones){const h=corazones[id];mmCtx.fillStyle='#ff4466';mmCtx.fillRect(h.x/TILE*ts-1,h.y/TILE*ts-1,2,2);}
    for(const id in ammoDrops){const a=ammoDrops[id];mmCtx.fillStyle='#50c8ff';mmCtx.fillRect(a.x/TILE*ts-1,a.y/TILE*ts-1,2,2);}
    // Boss
    if(bossData&&bossData.active){
        mmCtx.fillStyle=`rgba(255,50,0,${.7+.3*Math.sin(gameTime*5)})`;
        mmCtx.fillRect(bossData.x/TILE*ts-4,bossData.y/TILE*ts-4,8,8);
    }
    // Yo
    if(yo){
        mmCtx.fillStyle='#a855f7';mmCtx.fillRect(yo.x/TILE*ts-3,yo.y/TILE*ts-3,6,6);
        mmCtx.strokeStyle='#fff';mmCtx.lineWidth=1.5;
        mmCtx.beginPath();mmCtx.moveTo(yo.x/TILE*ts,yo.y/TILE*ts);
        mmCtx.lineTo(yo.x/TILE*ts+Math.cos(yo.angle)*10,yo.y/TILE*ts+Math.sin(yo.angle)*10);
        mmCtx.stroke();
    }
}

// ── Joystick móvil ────────────────────────────────────────────────────────
const joystick={active:false,x:0,y:0,rx:0,baseX:0,baseY:0,id:-1};
function initJoystick(){
    const isMobile=('ontouchstart' in window)||navigator.maxTouchPoints>0;
    if(!isMobile){
        document.getElementById('joystickWrap').style.display='none';
        document.getElementById('btnDisparar').style.display='none';
        document.getElementById('btnCambiarArma').style.display='none';
        return;
    }
    const wrap=document.getElementById('joystickWrap');
    const thumb=document.getElementById('joystickThumb');
    const maxR=45;

    wrap.addEventListener('touchstart',e=>{e.preventDefault();const t=e.changedTouches[0];
        joystick.id=t.identifier;joystick.active=true;joystick.baseX=t.clientX;joystick.baseY=t.clientY;
    },{passive:false});
    wrap.addEventListener('touchmove',e=>{e.preventDefault();
        for(const t of e.changedTouches){if(t.identifier!==joystick.id)continue;
            const dx=t.clientX-joystick.baseX,dy=t.clientY-joystick.baseY;
            const d=Math.sqrt(dx*dx+dy*dy);
            const cx=dx/Math.max(d,1)*Math.min(d,maxR),cy=dy/Math.max(d,1)*Math.min(d,maxR);
            joystick.x=cx/maxR;joystick.y=cy/maxR;
            thumb.style.transform=`translate(${cx}px,${cy}px)`;
        }
    },{passive:false});
    const resetJ=()=>{joystick.active=false;joystick.x=0;joystick.y=0;thumb.style.transform='';};
    wrap.addEventListener('touchend',resetJ);wrap.addEventListener('touchcancel',resetJ);

    const btnD=document.getElementById('btnDisparar');
    let fi=null;
    btnD.addEventListener('touchstart',e=>{e.preventDefault();e.stopPropagation();
        disparar();if(fi)clearInterval(fi);fi=setInterval(()=>disparar(),120);
    },{passive:false});
    btnD.addEventListener('touchend',e=>{e.preventDefault();if(fi){clearInterval(fi);fi=null;}},{passive:false});
    btnD.addEventListener('touchcancel',()=>{if(fi){clearInterval(fi);fi=null;}},{passive:false});

    const btnA=document.getElementById('btnCambiarArma');
    btnA.addEventListener('touchstart',e=>{e.preventDefault();e.stopPropagation();cambiarArma();},{passive:false});

    // ── Zona de cámara — div en HTML mitad derecha ────────────────────────
    // El div#lookZone ya existe en el HTML con z-index:18, encima del canvas
    // En Android el canvas tiene pointer-events:none así que los touches
    // llegan directamente al lookZone sin interferencia
    const lookZone = document.getElementById('lookZone');

    let lookId = -1, lookLastX = 0;

    lookZone.addEventListener('touchstart', e => {
        e.preventDefault();
        if (lookId !== -1) return;
        const t = e.changedTouches[0];
        lookId    = t.identifier;
        lookLastX = t.clientX;
    }, { passive: false });

    lookZone.addEventListener('touchmove', e => {
        e.preventDefault();
        for (const t of e.changedTouches) {
            if (t.identifier !== lookId) continue;
            const dx = t.clientX - lookLastX;
            if (yo && vivo) yo.angle += dx * 0.008;
            lookLastX = t.clientX;
        }
    }, { passive: false });

    const endLook = e => {
        for (const t of e.changedTouches) {
            if (t.identifier === lookId) { lookId = -1; joystick.rx = 0; }
        }
    };
    lookZone.addEventListener('touchend',    endLook, { passive: false });
    lookZone.addEventListener('touchcancel', endLook, { passive: false });
}

// ── HUD helpers ───────────────────────────────────────────────────────────
function actualizarHP(){
    const hp=Math.max(0,yo.hp||0),pct=hp/100;
    const fill=document.getElementById('hpFill');
    const text=document.getElementById('hpText');
    if(fill){fill.style.width=pct*100+'%';fill.className='hp-fill '+(pct>.5?'alto':pct>.25?'medio':'');}
    if(text)text.textContent=hp;
}
function flashDanio(){
    const c=document.createElement('div');
    c.style.cssText='position:fixed;inset:0;background:#cc000044;pointer-events:none;z-index:9;';
    document.body.appendChild(c);setTimeout(()=>c.remove(),200);
}
function mostrarRespawn(seg){
    const ov=document.getElementById('respawnOverlay');
    const tm=document.getElementById('respawnTimer');
    ov.style.display='flex';
    let t=seg; tm.textContent=t;
    const iv=setInterval(()=>{
        t--;
        tm.textContent=Math.max(0,t);
        if(t<=0){
            clearInterval(iv);
            // Si el servidor no mandó jugador_respawn todavía, no bloquear el juego
            // El overlay se cierra al recibir jugador_respawn — esto es solo seguridad
            setTimeout(()=>{
                if(!vivo && yo){
                    // Reubicar en última posición conocida y reactivar
                    vivo=true;
                    yo.hp=yo.maxHp||100;
                    actualizarHP();
                    ov.style.display='none';
                    console.warn('Respawn forzado por timeout');
                }
            }, 2000);
        }
    },1000);
}
function mostrarResultado(resultados){
    const yo2=resultados.find(r=>r.id===miId||r.socketId===miId)||resultados[0];
    const pos=yo2?.posicion||'?';
    const m=Math.floor(playTimer/60).toString().padStart(2,'0');
    const s=Math.floor(playTimer%60).toString().padStart(2,'0');
    document.getElementById('resultadoTitulo').textContent=pos===1?'🏆 ¡VICTORIA!':'⚔️ Partida terminada';
    document.getElementById('resultadoSub').textContent=`Posición #${pos} — Tiempo: ${m}:${s}`;
    setText('resKills',yo2?.kills||0);setText('resMuertes',yo2?.muertes||0);
    setText('resMonedas',yo2?.gold||yo2?.monedas||0);setText('resPosicion','#'+(pos||'?'));
    document.getElementById('resultadoOverlay').style.display='flex';
}
function mostrarTransicion(nA,nS){
    let div=document.getElementById('nivelOverlay');
    if(!div){div=document.createElement('div');div.id='nivelOverlay';
        div.style.cssText='position:fixed;inset:0;background:#000000cc;display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:60;';
        document.body.appendChild(div);}
    div.innerHTML=`<div style="color:#ffd60a;font-size:32px;font-weight:900;font-family:monospace">
        ¡NIVEL ${nA} COMPLETADO!</div>
        <div style="color:#fff;font-size:20px;margin-top:16px;font-family:monospace">Preparando Nivel ${nS}...</div>
        <div style="color:#aaa;font-size:14px;margin-top:8px;font-family:monospace">${nS===2?'30 enemigos — Catacumbas oscuras':nS===3?'55 soldados — Hernán Cortés espera':'...'}</div>`;
    div.style.display='flex';
}
function ocultarTransicion(){
    const div=document.getElementById('nivelOverlay');if(div)div.style.display='none';
}

// ── Chat ──────────────────────────────────────────────────────────────────
function abrirChat(){chatAbierto=true;document.exitPointerLock();
    const inp=document.getElementById('chatInput');inp.style.display='block';inp.focus();}
function cerrarChat(){chatAbierto=false;const inp=document.getElementById('chatInput');inp.style.display='none';inp.value='';}
function chatKeydown(e){
    if(e.key==='Enter'){const msg=e.target.value.trim();if(msg)socket.emit('chat',msg);cerrarChat();}
    if(e.key==='Escape')cerrarChat();
}
function addChat(nombre,msg){
    const log=document.getElementById('chatLog');
    const div=document.createElement('div');div.className='chat-msg';
    div.innerHTML=`<span class="cn">${escHtml(nombre)}:</span> ${escHtml(msg)}`;
    log.appendChild(div);while(log.children.length>6)log.removeChild(log.firstChild);
    setTimeout(()=>div.remove(),8000);
}

// ── Killfeed ──────────────────────────────────────────────────────────────
function addKillfeed(txt,esMio=false){
    const feed=document.getElementById('killfeed');
    const div=document.createElement('div');div.className='kf-item'+(esMio?' tuyo':'');
    div.textContent=txt;feed.appendChild(div);
    while(feed.children.length>5)feed.removeChild(feed.firstChild);
    setTimeout(()=>div.remove(),5000);
}

// ── Utilidades ────────────────────────────────────────────────────────────
function setText(id,val){const el=document.getElementById(id);if(el)el.textContent=val;}
function escHtml(t){const d=document.createElement('div');d.textContent=t;return d.innerHTML;}
function volverLobby(){
    SOUND.detenerMusica();
    if (socket) { socket.disconnect(); socket = null; }
    sessionStorage.removeItem('aw_partida');
    sessionStorage.removeItem('aw_socket_id');
    // replace evita que el back-button regrese al juego
    window.location.replace('/');
}
function rgba32(r,g,b,a=255){return((a&0xff)<<24)|((b&0xff)<<16)|((g&0xff)<<8)|(r&0xff);}