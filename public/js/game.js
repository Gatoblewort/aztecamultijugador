// ═══════════════════════════════════════════════════════════════════════════
//  AZTEC WAR — Motor Raycaster Multijugador
//  Inspirado en el aztecawarior.c — mismo algoritmo, pixel art puro
// ═══════════════════════════════════════════════════════════════════════════

const canvas  = document.getElementById('gameCanvas');
const ctx     = canvas.getContext('2d');
const mmCanvas= document.getElementById('minimap');
const mmCtx   = mmCanvas.getContext('2d');

// ── CONSTANTES ───────────────────────────────────────────────────────────
const TILE    = 64;
const FOV     = 70 * Math.PI / 180;
const HALF_FOV= FOV / 2;
const HALF_PI = Math.PI / 2;
const TWO_PI  = Math.PI * 2;
const TEX_SZ  = 128;
const PLAYER_SPD  = 3.0;
const TURN_SPD    = 0.045;
const BULLET_SPD  = 12;
const ARMAS = [
    { nombre:'Macuahuitl', danio:15, cooldown:150, color:'#cc4400' },
    { nombre:'Atlatl',     danio:25, cooldown:250, color:'#886600' },
    { nombre:'Arco',       danio:40, cooldown:400, color:'#228844' }
];

// ── ESTADO ───────────────────────────────────────────────────────────────
let W = 0, H = 0;
let zBuffer   = [];
let textures  = [];
let mapa      = null;
let jugadores = {};   // id -> estado
let miId      = null;
let yo        = null; // mi jugador local
let balas     = {};
let monedas   = {};
let particulas= [];
let gameTime  = 0;
let tiempoRestante = 300;
let armaActual = 0;
let lastShot   = 0;
let vivo       = true;
let socket     = null;
let keys       = {};
let lastTime   = 0;
let shootPending = false;
let chatAbierto  = false;
let lastMoveSent = 0;

// ── ARRRANQUE ─────────────────────────────────────────────────────────────
window.addEventListener('load', () => {
    const datos   = JSON.parse(sessionStorage.getItem('aw_partida') || 'null');
    const token   = localStorage.getItem('aw_token');
    if (!datos || !token) { window.location.href = '/'; return; }

    resize();
    window.addEventListener('resize', resize);
    generarTexturas();

    mapa = datos.mapa;
    miId = datos.tuId;
    jugadores = datos.jugadores;
    yo = jugadores[miId];
    monedas = {};
    if (datos.monedas) Object.entries(datos.monedas).forEach(([k,v]) => monedas[k]=v);
    tiempoRestante = datos.tiempoTotal || 300;

    conectarSocket(token, datos.salaId);
    initControles();
    requestAnimationFrame(loop);
});

function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
    zBuffer = new Float32Array(W);
}

// ── TEXTURAS PROCEDURALES (mismo algoritmo del C) ─────────────────────────
function noiseVal(x, y, seed) {
    let n = (x*1619 + y*31337 + seed*2053) ^ ((x*1619 + y*31337 + seed*2053) >> 8);
    n = (n * (n*n*60493 + 19990303) + 1376312589) & 0x7fffffff;
    return n / 0x7fffffff;
}
function smoothNoise(x, y, seed) {
    const ix=Math.floor(x), iy=Math.floor(y);
    const fx=x-ix, fy=y-iy;
    const fx2=fx*fx*(3-2*fx), fy2=fy*fy*(3-2*fy);
    const v00=noiseVal(ix,iy,seed), v10=noiseVal(ix+1,iy,seed);
    const v01=noiseVal(ix,iy+1,seed), v11=noiseVal(ix+1,iy+1,seed);
    return v00+(v10-v00)*fx2+(v01-v00)*fy2+(v00-v10-v01+v11)*fx2*fy2;
}

function generarTexturas() {
    textures = [];
    const sz = TEX_SZ;

    // 0: vacío (negro)
    textures.push(crearTex(sz, (x,y) => [0,0,0]));

    // 1: Piedra
    textures.push(crearTex(sz, (x,y) => {
        let n = smoothNoise(x*.12,y*.12,11) + .5*smoothNoise(x*.28,y*.28,77)
              + .25*smoothNoise(x*.55,y*.55,33);
        n /= 1.75; n=clamp(n);
        const crack = smoothNoise(x*.5+.3, y*2, 55) > .72;
        const moss  = smoothNoise(x*.2, y*.35, 19);
        const base  = 100 + n*70;
        if (crack) return [40,40,40];
        if (moss > .6) {
            const m = (moss-.6)/.4;
            return [base*(1-m*.3), base*(1-m*.1)+m*40, base*(1-m*.4)];
        }
        return [base, base*.95, base*.85];
    }));

    // 2: Pirámide
    textures.push(crearTex(sz, (x,y) => {
        const bW=32, bH=32, by2=Math.floor(y/bH);
        const off=(by2%2)?(bW/2):0;
        const lx2=(x+off)%bW, ly=y%bH;
        const isJ=(lx2<=1||ly<=1);
        let n = smoothNoise(x*.15,y*.15,42) + .5*smoothNoise(x*.3,y*.3,99);
        n = n*.5+.5; n=clamp(n);
        const base = 160+n*50;
        if (isJ) return [60,50,35];
        const det = smoothNoise(x*.6,y*.6,7)*.12;
        return [base+det*40, base*.82+det*30, base*.55+det*10];
    }));

    // 3: Jade
    textures.push(crearTex(sz, (x,y) => {
        let n = smoothNoise(x*.1,y*.1,3)+.5*smoothNoise(x*.25,y*.25,88);
        n /= 1.5; n=clamp(n);
        const vein  = Math.sin((x*.15+y*.08+smoothNoise(x*.08,y*.08,22)*8)*Math.PI*2)*.5+.5;
        const vein2 = Math.sin((x*.05-y*.18+smoothNoise(x*.12,y*.12,44)*5)*Math.PI*2)*.5+.5;
        if (vein>.85 || vein2>.88) return [200,230,210];
        const gr=80+n*88, rb=50+n*57;
        return [rb, gr+40, rb];
    }));

    // 4: Oro
    textures.push(crearTex(sz, (x,y) => {
        const stripe = Math.sin(y*.6)*.15;
        const n = smoothNoise(x*.2,y*.2,66)*.3;
        const refl = smoothNoise((x+y)*.1,(x-y)*.1,13)*.25;
        let b = .7+stripe+n+refl; b=Math.max(.4,Math.min(1.3,b));
        if (x%16 < 2) return [160,130,0];
        return [215*b, 175*b, 0];
    }));

    // 5: Puerta (madera)
    textures.push(crearTex(sz, (x,y) => {
        const lx=x%21, isGap=(lx<=1);
        let g = smoothNoise(x*.08,y*.5,7)*.4+smoothNoise(x*.2,y*1.2,23)*.2+.4;
        g=clamp(g);
        const isH=((y>=28&&y<=36||y>=90&&y<=98)&&x>=8&&x<=118);
        const isB=((x===20||x===105)&&y>=28&&y<=98);
        if(isGap) return [30,20,10];
        if(isH||isB){ const m=smoothNoise(x*.4,y*.4,55)*.2+.8; return [120*m,110*m,90*m]; }
        return [90*g,60*g,30*g];
    }));

    // 6: Oscuro (catacumba)
    textures.push(crearTex(sz, (x,y) => {
        let n = smoothNoise(x*.14,y*.14,8)+.5*smoothNoise(x*.3,y*.3,44);
        n /= 1.5; n=clamp(n);
        const wet = smoothNoise(x*.18,y*.1+.8,31);
        const damp = y>TEX_SZ*.6 ? wet*.5 : 0;
        const crack = smoothNoise(x*.7+.1,y*1.8+.3,99)>.78;
        const base = 45+n*55;
        if (crack) return [15,12,20];
        return [base*(1-damp)*.85, base*(1-damp)*.88, base*(1-damp*.5)];
    }));

    // 7: Lava (animada — se regenera con gameTime)
    textures.push(null); // placeholder, se genera en render
}

function crearTex(sz, fn) {
    const buf = new Uint8ClampedArray(sz*sz*4);
    for (let y=0;y<sz;y++) for (let x=0;x<sz;x++) {
        const [r,g,b] = fn(x,y);
        const i=(y*sz+x)*4;
        buf[i]=r; buf[i+1]=g; buf[i+2]=b; buf[i+3]=255;
    }
    return buf;
}

function actualizarTexLava() {
    const sz=TEX_SZ, t=gameTime, buf=new Uint8ClampedArray(sz*sz*4);
    for (let y=0;y<sz;y++) for (let x=0;x<sz;x++) {
        const rock = clamp((smoothNoise(x*.13,y*.13,77)+.4*smoothNoise(x*.3,y*.3,22))/1.4);
        const lv  = Math.sin((x*.2+y*.15+t*1.5)*2.5)*.5+.5;
        const lv2 = Math.sin((x*.1-y*.22+t*1.2)*2)*.5+.5;
        const lava = (lv*lv2)**2;
        const rb   = 30+rock*50;
        const i=(y*sz+x)*4;
        if (lava>.55) {
            const pulse=.7+.3*Math.sin(t*4+x*.3+y*.2);
            buf[i]=240*pulse; buf[i+1]=80*pulse; buf[i+2]=0;
        } else {
            buf[i]=rb; buf[i+1]=rb*.6; buf[i+2]=rb*.4;
        }
        buf[i+3]=255;
    }
    textures[7]=buf;
}

function clamp(v){return Math.max(0,Math.min(1,v));}

// ── SOCKET ────────────────────────────────────────────────────────────────
function conectarSocket(token, salaId) {
    socket = io({ auth: { token } });

    socket.on('connect', () => {
        // Re-unirse si hubo reconexión
        socket.data = { salaId };
    });

    socket.on('jugador_movio', ({ id, x, y, angle, arma }) => {
        if (!jugadores[id]) jugadores[id] = { nombre: id.startsWith('npc_') ? id.split('_')[2]||'NPC' : id, vivo: true, hp: 100, maxHp: 100, esNPC: id.startsWith('npc_'), skin: 'jaguar' };
        jugadores[id].x = x; jugadores[id].y = y;
        jugadores[id].angle = angle; jugadores[id].arma = arma;
    });

    socket.on('npcs_spawned', (npcs) => {
        for (const id in npcs) jugadores[id] = { ...npcs[id] };
        console.log(`🤖 ${Object.keys(npcs).length} NPCs recibidos`);
    });

    socket.on('bala_creada', (bala) => {
        balas[bala.id] = { ...bala, localLife: bala.vida };
    });

    socket.on('jugador_recibio_danio', ({ id, hp, fromId, danio }) => {
        if (jugadores[id]) jugadores[id].hp = hp;
        if (id === miId) {
            yo.hp = hp;
            actualizarHP();
            flashDanio();
        }
    });

    socket.on('jugador_murio', ({ id, matadoPor, kills, muertes }) => {
        if (jugadores[id]) jugadores[id].vivo = false;
        if (matadoPor === miId) {
            yo.kills = kills;
            document.getElementById('hudKills').textContent = kills;
            addKillfeed(`⚔️ ${yo.nombre} eliminó a ${jugadores[id]?.nombre}`, true);
        } else {
            addKillfeed(`💀 ${jugadores[matadoPor]?.nombre} eliminó a ${jugadores[id]?.nombre}`);
        }
        if (id === miId) { vivo=false; mostrarRespawn(5); }
    });

    socket.on('jugador_respawn', ({ id, x, y, hp }) => {
        if (!jugadores[id]) return;
        jugadores[id].x=x; jugadores[id].y=y; jugadores[id].hp=hp; jugadores[id].vivo=true;
        if (id===miId) { yo.x=x; yo.y=y; yo.hp=hp; vivo=true;
            document.getElementById('respawnOverlay').style.display='none'; actualizarHP(); }
    });

    socket.on('moneda_recogida', ({ monedaId, porId, monedas: m }) => {
        delete monedas[monedaId];
        if (porId===miId) { yo.monedas=m; document.getElementById('hudMonedas').textContent=m; }
    });

    socket.on('jugador_salio', ({ id }) => { delete jugadores[id]; });
    socket.on('jugador_unido', (jug) => {
        jugadores[jug.id] = jug;
        addKillfeed(`⚔️ ${jug.nombre} se unió a la batalla`);
    });

    socket.on('tick_timer', ({ tiempoRestante: t }) => {
        tiempoRestante = t;
        const m=Math.floor(t/60).toString().padStart(2,'0');
        const s=(t%60).toString().padStart(2,'0');
        const el=document.getElementById('hudTimer');
        el.textContent=`${m}:${s}`;
        if(t<=30) el.classList.add('urgente'); else el.classList.remove('urgente');
    });

    socket.on('chat_msg', ({ nombre, msg }) => {
        addChat(nombre, msg);
    });

    socket.on('partida_terminada', ({ razon, resultados }) => {
        mostrarResultado(resultados);
    });
}

// ── LOOP PRINCIPAL ────────────────────────────────────────────────────────
function loop(ts) {
    const dt = Math.min((ts - lastTime) / 1000, 0.05);
    lastTime = ts;
    gameTime += dt;

    if (!mapa || !yo) { requestAnimationFrame(loop); return; }

    actualizarTexLava();
    procesarInput(dt);
    actualizarBalas(dt);
    actualizarParticulas(dt);
    comprobarMonedas();

    render();
    renderMinimap();

    requestAnimationFrame(loop);
}

// ── INPUT ─────────────────────────────────────────────────────────────────
function initControles() {
    document.addEventListener('keydown', e => {
        if (chatAbierto) return;
        keys[e.code] = true;
        if (e.code==='KeyQ') cambiarArma();
        if (e.code==='KeyT') { e.preventDefault(); abrirChat(); }
        if (e.code==='Escape') cerrarChat();
    });
    document.addEventListener('keyup', e => { keys[e.code]=false; });
    canvas.addEventListener('click', () => {
        if (!chatAbierto) canvas.requestPointerLock();
    });
    document.addEventListener('pointerlockchange', () => {});
    document.addEventListener('mousemove', e => {
        if (document.pointerLockElement===canvas && vivo) {
            yo.angle += e.movementX * 0.003;
        }
    });
    canvas.addEventListener('mousedown', e => {
        if (e.button===0 && document.pointerLockElement===canvas) disparar();
    });
    initJoystick();
}

function procesarInput(dt) {
    if (!vivo || chatAbierto) return;
    const spd = PLAYER_SPD;
    let nx=yo.x, ny=yo.y;

    if (keys['KeyW']||keys['ArrowUp'])   { nx+=Math.cos(yo.angle)*spd; ny+=Math.sin(yo.angle)*spd; }
    if (keys['KeyS']||keys['ArrowDown']) { nx-=Math.cos(yo.angle)*spd; ny-=Math.sin(yo.angle)*spd; }
    if (keys['KeyA'])                    { nx+=Math.cos(yo.angle-HALF_PI)*spd; ny+=Math.sin(yo.angle-HALF_PI)*spd; }
    if (keys['KeyD'])                    { nx+=Math.cos(yo.angle+HALF_PI)*spd; ny+=Math.sin(yo.angle+HALF_PI)*spd; }
    if (keys['ArrowLeft'])  yo.angle -= TURN_SPD;
    if (keys['ArrowRight']) yo.angle += TURN_SPD;

    // Joystick
    if (joystick.active) {
        nx += Math.cos(yo.angle)*joystick.y*spd*.06 + Math.cos(yo.angle+HALF_PI)*joystick.x*spd*.06;
        ny += Math.sin(yo.angle)*joystick.y*spd*.06 + Math.sin(yo.angle+HALF_PI)*joystick.x*spd*.06;
        yo.angle += joystick.rx * 0.04;
    }

    const m=16;
    if (!colisiona(nx, yo.y, m)) yo.x=nx;
    if (!colisiona(yo.x, ny, m)) yo.y=ny;

    // Disparar con tecla
    if ((keys['Space']||keys['KeyF']||keys['ControlLeft']||shootPending) && vivo) {
        shootPending=false; disparar();
    }

    // Enviar posición al servidor (throttle 20fps)
    if (Date.now()-lastMoveSent > 50) {
        socket.emit('mover', { x:yo.x, y:yo.y, angle:yo.angle });
        lastMoveSent=Date.now();
    }
}

function colisiona(x, y, m) {
    const tx1=Math.floor((x-m)/TILE), ty1=Math.floor((y-m)/TILE);
    const tx2=Math.floor((x+m)/TILE), ty2=Math.floor((y+m)/TILE);
    for(let ty=ty1;ty<=ty2;ty++) for(let tx=tx1;tx<=tx2;tx++) {
        if(ty<0||ty>=mapa.alto||tx<0||tx>=mapa.ancho) return true;
        if(mapa.tiles[ty][tx]!==0) return true;
    }
    return false;
}

// ── DISPARAR ──────────────────────────────────────────────────────────────
function disparar() {
    if (!vivo) return;
    const now=Date.now();
    const arma=ARMAS[armaActual];
    if(now-lastShot < arma.cooldown) return;
    lastShot=now;

    const dx=Math.cos(yo.angle)*BULLET_SPD;
    const dy=Math.sin(yo.angle)*BULLET_SPD;
    spawnParticula(yo.x+Math.cos(yo.angle)*30, yo.y+Math.sin(yo.angle)*30,
                   255,200,80, 8);

    socket.emit('disparar', {
        x:yo.x, y:yo.y, dx, dy,
        danio:arma.danio, arma:armaActual
    });
}

function cambiarArma() {
    armaActual=(armaActual+1)%ARMAS.length;
    document.getElementById('armaName').textContent = ARMAS[armaActual].nombre;
    document.getElementById('armaName').style.color = ARMAS[armaActual].color;
}

// ── BALAS ─────────────────────────────────────────────────────────────────
function actualizarBalas(dt) {
    for (const id in balas) {
        const b=balas[id];
        b.x+=b.dx; b.y+=b.dy;
        b.localLife-=dt;
        const tx=Math.floor(b.x/TILE), ty=Math.floor(b.y/TILE);
        if(b.localLife<=0 || ty<0||ty>=mapa.alto||tx<0||tx>=mapa.ancho||mapa.tiles[ty][tx]!==0) {
            spawnParticula(b.x,b.y,200,200,100,4);
            delete balas[id];
        }
    }
}

// ── PARTÍCULAS ───────────────────────────────────────────────────────────
function spawnParticula(x,y,r,g,b,n) {
    for(let i=0;i<n;i++) {
        const a=Math.random()*TWO_PI, s=1+Math.random()*4;
        particulas.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,
            life:1, r,g,b});
    }
}
function actualizarParticulas(dt) {
    for(let i=particulas.length-1;i>=0;i--) {
        const p=particulas[i];
        p.x+=p.vx; p.y+=p.vy; p.vy+=.3; p.life-=dt*2.5;
        if(p.life<=0) particulas.splice(i,1);
    }
}

// ── MONEDAS ───────────────────────────────────────────────────────────────
function comprobarMonedas() {
    if (!vivo) return;
    for (const id in monedas) {
        const m=monedas[id];
        const dx=m.x-yo.x, dy=m.y-yo.y;
        if(Math.sqrt(dx*dx+dy*dy)<32) socket.emit('recoger_moneda', id);
    }
}

// ── RAYCASTER ─────────────────────────────────────────────────────────────
function render() {
    const imgData = ctx.createImageData(W, H);
    const buf32   = new Uint32Array(imgData.data.buffer);

    const horizon = H/2 + (Math.sin(gameTime*.3)*.5); // leve bob vertical
    const isMapa2 = (mapa.ancho >= 36);

    // ── Cielo y suelo ──
    for(let y=0;y<H;y++) {
        if(y<horizon) {
            // Cielo degradado
            const t=y/horizon;
            if(isMapa2) {
                // catacumba: cielo casi negro
                const r=5+t*15, g=3+t*8, b=15+t*20;
                for(let x=0;x<W;x++) buf32[y*W+x]=rgba(r,g,b);
            } else {
                // templo: cielo azul-naranja
                const r=20+t*60, g=10+t*30, b=40+t*80;
                for(let x=0;x<W;x++) buf32[y*W+x]=rgba(r,g,b);
            }
        } else {
            // Suelo tileado con textura de piedra
            const rowDist=(H*.5)/(y-horizon+.001);
            const floorX0=yo.x/TILE+(Math.cos(yo.angle-HALF_FOV)*rowDist);
            const floorY0=yo.y/TILE+(Math.sin(yo.angle-HALF_FOV)*rowDist);
            const floorXW=yo.x/TILE+(Math.cos(yo.angle+HALF_FOV)*rowDist);
            const floorYW=yo.y/TILE+(Math.sin(yo.angle+HALF_FOV)*rowDist);
            const stepX=(floorXW-floorX0)/W, stepY=(floorYW-floorY0)/W;
            let fx=floorX0, fy=floorY0;
            const bright=Math.max(.08,.4-rowDist*.015);
            for(let x=0;x<W;x++) {
                const tx=((Math.floor(fx*TEX_SZ))&(TEX_SZ-1));
                const ty2=((Math.floor(fy*TEX_SZ))&(TEX_SZ-1));
                const idx=(ty2*TEX_SZ+tx)*4;
                const tex=textures[1]; // piedra para el suelo
                const r=tex[idx]*bright, g=tex[idx+1]*bright, b=tex[idx+2]*bright;
                buf32[(y)*W+x]=rgba(r,g,b);
                fx+=stepX; fy+=stepY;
            }
        }
    }

    // ── Paredes ──
    const fogStart = isMapa2 ? 200 : 300;
    const fogEnd   = isMapa2 ? 500 : 700;
    const fogR = isMapa2?30:180, fogG=isMapa2?10:160, fogB=isMapa2?40:120;

    for(let x=0;x<W;x++) {
        const ra = (yo.angle-HALF_FOV)+(x/W)*FOV;
        const hit = castRay(ra);
        const pw  = hit.hit ? hit.dist*Math.cos(ra-yo.angle) : 900;
        zBuffer[x]=pw;
        if(!hit.hit) continue;

        const wh  = (TILE/pw)*600;
        const wT  = Math.floor(horizon - wh/2);
        const wB  = Math.floor(horizon + wh/2);
        let bright= 1/(1+pw*.004);
        if(isMapa2) bright*=.65;
        if(hit.side) bright*=.65;
        bright=Math.max(.08,bright);

        const fogF=Math.max(0,Math.min(1,(pw-fogStart)/(fogEnd-fogStart)));
        const texIdx = tileToTex(hit.tile);
        const texBuf = textures[texIdx];
        if(!texBuf) continue;
        const txX = Math.floor(hit.wallX*TEX_SZ);
        const clT=Math.max(0,wT), clB=Math.min(H-1,wB);
        const wallH=Math.max(1,wB-wT);
        const texStep=TEX_SZ/wallH;
        let texPos=(clT-wT)*texStep;

        for(let y=clT;y<=clB;y++,texPos+=texStep) {
            const tY=Math.min(TEX_SZ-1,Math.floor(texPos));
            const i=(tY*TEX_SZ+Math.min(TEX_SZ-1,txX))*4;
            let r=texBuf[i]*bright, g=texBuf[i+1]*bright, b=texBuf[i+2]*bright;
            if(fogF>0) {
                const nf=1-fogF*.78;
                r=r*nf+fogR*fogF*.78; g=g*nf+fogG*fogF*.78; b=b*nf+fogB*fogF*.78;
            }
            buf32[y*W+x]=rgba(r,g,b);
        }
    }

    ctx.putImageData(imgData,0,0);

    // ── Sprites (otros jugadores, balas, monedas, partículas) ──
    renderSprites();
    renderBalas();
    renderArma();
    renderParticulas2D();
}

function castRay(angle) {
    const rdx=Math.cos(angle), rdy=Math.sin(angle);
    let rx=yo.x, ry=yo.y;
    for(let i=0;i<1200;i++) {
        rx+=rdx*.5; ry+=rdy*.5;
        const mx=Math.floor(rx/TILE), my=Math.floor(ry/TILE);
        if(mx<0||mx>=mapa.ancho||my<0||my>=mapa.alto) return {hit:false,dist:900};
        const tile=mapa.tiles[my][mx];
        if(tile!==0) {
            const dx=rx-yo.x, dy=ry-yo.y;
            const dist=Math.sqrt(dx*dx+dy*dy);
            const px=rx-rdx*.5, py=ry-rdy*.5;
            const side=(Math.floor(px/TILE)!==mx)?1:0;
            const wallX=side===0?((ry/TILE)%1):((rx/TILE)%1);
            return {hit:true,dist,tile,side,wallX:Math.max(0,wallX)};
        }
    }
    return {hit:false,dist:900};
}

function tileToTex(t) {
    const m={1:1,2:2,3:3,4:4,5:5,6:6,7:7};
    return m[t]||1;
}

// ── SPRITES ───────────────────────────────────────────────────────────────
function renderSprites() {
    // Recopilar sprites a renderizar
    const sprites=[];

    // Otros jugadores
    for(const id in jugadores) {
        if(id===miId) continue;
        const j=jugadores[id];
        if(!j.vivo) continue;
        const dx=j.x-yo.x, dy=j.y-yo.y;
        sprites.push({type:'jugador',dist:Math.sqrt(dx*dx+dy*dy),j,dx,dy});
    }

    // Monedas
    for(const id in monedas) {
        const m=monedas[id];
        const dx=m.x-yo.x, dy=m.y-yo.y;
        sprites.push({type:'moneda',dist:Math.sqrt(dx*dx+dy*dy),m:m,dx,dy});
    }

    // Ordenar de lejos a cerca
    sprites.sort((a,b)=>b.dist-a.dist);

    for(const sp of sprites) {
        const angle=Math.atan2(sp.dy,sp.dx)-yo.angle;
        let a=angle;
        while(a< -Math.PI) a+=TWO_PI;
        while(a>  Math.PI) a-=TWO_PI;
        if(Math.abs(a)>FOV/1.8) continue;

        const scx=(a/FOV+.5)*W;
        const sh=(TILE/sp.dist)*600, sw=sh;
        const groundLine=H/2+sh*.5;
        const drawY=groundLine-sh;

        if(sp.type==='jugador') {
            const iw=Math.max(1,Math.floor(sw)), ih=Math.max(1,Math.floor(sh));
            const drawX=Math.floor(scx-sw/2);
            // Verificar visibilidad con zBuffer
            let vis=false;
            for(let c=0;c<iw;c++){const sc=drawX+c;if(sc>=0&&sc<W&&sp.dist<zBuffer[sc]){vis=true;break;}}
            if(!vis) continue;

            ctx.save();
            // Dibujar jugador como sprite pixelart procedural
            dibujarJugador3D(sp.j, drawX, Math.floor(drawY), iw, ih, sp.dist);
            ctx.restore();

            // Nombre sobre la cabeza
            if(sp.dist < 300) {
                const alpha=Math.max(0,Math.min(1,1-sp.dist/300));
                ctx.globalAlpha=alpha;
                ctx.fillStyle='#fff';
                ctx.font=`bold ${Math.max(8,Math.floor(10*sh/100))}px monospace`;
                ctx.textAlign='center';
                ctx.fillText(sp.j.nombre||'?', scx, drawY-4);
                // Barra HP
                const bw=Math.min(80,iw); const bx=Math.floor(scx-bw/2);
                const by2=Math.floor(drawY)-12;
                ctx.fillStyle='#222'; ctx.fillRect(bx,by2,bw,5);
                const hpPct=Math.max(0,(sp.j.hp||0)/100);
                ctx.fillStyle=hpPct>.5?'#06d6a0':hpPct>.25?'#ffd60a':'#cc2222';
                ctx.fillRect(bx,by2,Math.floor(bw*hpPct),5);
                ctx.globalAlpha=1;
            }

        } else if(sp.type==='moneda') {
            const csz=Math.max(4,Math.floor(sw*.7));
            const cx2=Math.floor(scx), cy2=Math.floor(H/2+Math.sin(gameTime*3)*5);
            let vis=false;
            for(let c=cx2-csz/2;c<cx2+csz/2&&!vis;c++){if(c>=0&&c<W&&sp.dist<zBuffer[c])vis=true;}
            if(!vis) continue;
            const rot=Math.abs(Math.cos(gameTime*3));
            const vw=Math.max(4,Math.floor(csz*rot));
            ctx.fillStyle='#ffd60a';
            ctx.shadowColor='#ffd60a'; ctx.shadowBlur=8;
            ctx.fillRect(cx2-vw/2,cy2-csz/2,vw,csz);
            ctx.shadowBlur=0;
        }
    }
}

// ── SPRITE JUGADOR PIXELART ───────────────────────────────────────────────
function dibujarJugador3D(j, drawX, drawY, iw, ih, dist) {
    const bright=Math.max(.3,1-dist/600);
    const sk=j.skin||'guerrero_base';

    // Colores por skin (mismos del server)
    const skinColors={
        guerrero_base:  [180,130,70,  80,60,30],
        jaguar:         [140,90,50,  160,120,40],
        aguila:         [200,170,120,220,200,160],
        sacerdote:      [100,60,140,  60,40,80],
        tlaloc:         [60,100,180,  40,80,140],
        quetzalcoatl:   [220,200,40, 180,160,20],
        mictlantecuhtli:[60,20,20,  100,20,20],
        tonatiuh:       [240,160,20, 200,100,0]
    };
    const c=skinColors[sk]||skinColors['guerrero_base'];
    const sr=c[0]*bright, sg=c[1]*bright, sb=c[2]*bright;
    const ar=c[3]*bright, ag=c[4]*bright, ab=c[5]*bright;

    const u=iw/10; // unidad de escala
    ctx.imageSmoothingEnabled=false;

    // Cuerpo (torso)
    ctx.fillStyle=`rgb(${ar},${ag},${ab})`;
    ctx.fillRect(drawX+iw*.2, drawY+ih*.3, iw*.6, ih*.35);

    // Cabeza
    ctx.fillStyle=`rgb(${sr},${sg},${sb})`;
    ctx.fillRect(drawX+iw*.3, drawY+ih*.05, iw*.4, ih*.28);

    // Casco/penacho (distintivo por skin)
    const penachoColors={
        guerrero_base:'#cc4400', jaguar:'#996600', aguila:'#ccaa00',
        sacerdote:'#884488', tlaloc:'#2244cc', quetzalcoatl:'#44cc44',
        mictlantecuhtli:'#440000', tonatiuh:'#ffaa00'
    };
    ctx.fillStyle=penachoColors[sk]||'#cc4400';
    ctx.fillRect(drawX+iw*.25, drawY, iw*.5, ih*.08);
    // Plumas del penacho
    for(let p=0;p<3;p++) {
        ctx.fillRect(drawX+iw*(.3+p*.15), drawY-ih*.06, iw*.1, ih*.07);
    }

    // Piernas
    ctx.fillStyle=`rgb(${ar},${ag},${ab})`;
    const walkOff=Math.sin(gameTime*8+(j.x+j.y)*.1)*ih*.05;
    ctx.fillRect(drawX+iw*.2, drawY+ih*.65, iw*.25, ih*.3+walkOff);
    ctx.fillRect(drawX+iw*.55, drawY+ih*.65, iw*.25, ih*.3-walkOff);

    // Brazos
    ctx.fillStyle=`rgb(${sr},${sg},${sb})`;
    ctx.fillRect(drawX+iw*.05, drawY+ih*.3, iw*.15, ih*.3);
    ctx.fillRect(drawX+iw*.8, drawY+ih*.3, iw*.15, ih*.3);

    // Arma
    const armaColor=ARMAS[j.arma||0]?.color||'#884400';
    ctx.fillStyle=armaColor;
    ctx.fillRect(drawX+iw*.82, drawY+ih*.2, iw*.12, ih*.5);

    // HP indicator (punto de color)
    if(j.hp<50) {
        ctx.fillStyle=j.hp<25?'#ff2222':'#ffaa00';
        ctx.fillRect(drawX+iw*.4, drawY-ih*.02, iw*.2, ih*.03);
    }
}

// ── ARMA EN PRIMERA PERSONA ───────────────────────────────────────────────
function renderArma() {
    const bob=Math.sin(gameTime*8)*(vivo?12:0);
    const swing=Math.max(0,(Date.now()-lastShot)/400);
    const swingY=swing<1?(1-swing)*30:0;
    const bx=W/2-80, by=H-200+bob+swingY;
    const arma=ARMAS[armaActual];

    ctx.imageSmoothingEnabled=false;
    const skinC=getSkinColors();

    // Brazo izquierdo
    ctx.fillStyle=`rgb(${skinC[0]},${skinC[1]},${skinC[2]})`;
    ctx.fillRect(bx+10, by+120, 30, 70);
    ctx.fillRect(bx+10, by+185, 35, 20); // mano
    // Brazo derecho
    ctx.fillRect(bx+120, by+120, 30, 70);
    ctx.fillRect(bx+115, by+185, 35, 20);

    // Arma
    ctx.fillStyle=arma.color;
    switch(armaActual) {
        case 0: // Macuahuitl
            ctx.fillRect(bx+30, by+40, 100, 20);  // hoja
            ctx.fillRect(bx+38, by+30, 10, 60);   // filo obsidiana
            ctx.fillRect(bx+52, by+30, 10, 60);
            ctx.fillRect(bx+66, by+30, 10, 60);
            ctx.fillStyle='#222';
            ctx.fillRect(bx+30, by+58, 100, 8);   // mango
            break;
        case 1: // Atlatl
            ctx.fillRect(bx+20, by+50, 120, 12);  // varal
            ctx.fillStyle='#ffcc00';
            ctx.fillRect(bx+130, by+42, 6, 26);   // punta
            ctx.fillStyle='#886600';
            ctx.fillRect(bx+20, by+50, 30, 12);   // empuñadura
            break;
        case 2: // Arco
            ctx.strokeStyle=arma.color;
            ctx.lineWidth=6;
            ctx.beginPath();
            ctx.arc(bx+75, by+100, 70, -Math.PI*.7, Math.PI*.7);
            ctx.stroke();
            ctx.strokeStyle='#ccaa44';
            ctx.lineWidth=2;
            ctx.beginPath();
            ctx.moveTo(bx+75, by+30); ctx.lineTo(bx+75, by+170);
            ctx.stroke();
            break;
    }

    // Flash de disparo
    if(Date.now()-lastShot < 80) {
        ctx.fillStyle='rgba(255,200,80,.6)';
        ctx.beginPath();
        ctx.arc(bx+75, by+40, 20, 0, TWO_PI);
        ctx.fill();
    }
}

function getSkinColors() {
    const j2=JSON.parse(localStorage.getItem('aw_jugador')||'{}');
    const sk=j2.skin_activa||'guerrero_base';
    const m={guerrero_base:[180,130,70],jaguar:[140,90,50],aguila:[200,170,120],
             sacerdote:[100,60,140],tlaloc:[60,100,180],quetzalcoatl:[220,200,40],
             mictlantecuhtli:[60,20,20],tonatiuh:[240,160,20]};
    return m[sk]||m['guerrero_base'];
}

// ── PARTÍCULAS 2D (balas y efectos) ──────────────────────────────────────
function renderParticulas2D() {
    for(const p of particulas) {
        const dx=p.x-yo.x, dy=p.y-yo.y;
        const dist=Math.sqrt(dx*dx+dy*dy);
        if(dist>300) continue;
        const angle=Math.atan2(dy,dx)-yo.angle;
        let a=angle;
        while(a<-Math.PI)a+=TWO_PI; while(a>Math.PI)a-=TWO_PI;
        if(Math.abs(a)>FOV/1.5) continue;
        const scx=(a/FOV+.5)*W;
        // Partículas MUY pequeñas — máx 4px
        const sh=Math.min(4,(TILE/Math.max(1,dist))*30);
        if(dist<zBuffer[Math.floor(scx)]||dist<1) {
            ctx.globalAlpha=p.life*0.9;
            ctx.fillStyle=`rgb(${p.r},${p.g},${p.b})`;
            ctx.fillRect(scx-sh/2, H/2-sh/2, sh, sh);
            ctx.globalAlpha=1;
        }
    }
}

// ── RENDER BALAS (proyectiles pequeños) ──────────────────────────────────
function renderBalas() {
    for(const id in balas) {
        const b=balas[id];
        const dx=b.x-yo.x, dy=b.y-yo.y;
        const dist=Math.sqrt(dx*dx+dy*dy);
        if(dist>400||dist<5) continue;
        const angle=Math.atan2(dy,dx)-yo.angle;
        let a=angle;
        while(a<-Math.PI)a+=TWO_PI; while(a>Math.PI)a-=TWO_PI;
        if(Math.abs(a)>FOV/1.6) continue;
        const scx=(a/FOV+.5)*W;
        const sc=Math.floor(scx);
        if(sc<0||sc>=W||dist>=zBuffer[sc]) continue;
        // Proyectil: solo 3x3 pixels
        const sz=3;
        const sy=H/2;
        ctx.fillStyle=b.fromId===miId?'#ffcc00':'#ff4400';
        ctx.fillRect(scx-sz/2, sy-sz/2, sz, sz);
    }
}
function renderMinimap() {
    if(!mapa) return;
    const sz=120, ts=sz/mapa.ancho;
    mmCanvas.width=mmCanvas.height=sz;
    mmCtx.fillStyle='#00000099';
    mmCtx.fillRect(0,0,sz,sz);
    const colors={0:'#00000000',1:'#666',2:'#aa8855',3:'#06d6a0',
                  4:'#ffd60a',5:'#884422',6:'#334',7:'#ff4400'};
    for(let y=0;y<mapa.alto;y++) for(let x=0;x<mapa.ancho;x++) {
        const t=mapa.tiles[y][x];
        if(t===0) continue;
        mmCtx.fillStyle=colors[t]||'#555';
        mmCtx.fillRect(x*ts,y*ts,ts,ts);
    }
    // Otros jugadores
    for(const id in jugadores) {
        if(id===miId||!jugadores[id].vivo) continue;
        const j=jugadores[id];
        mmCtx.fillStyle='#ff4444';
        mmCtx.fillRect(j.x/TILE*ts-1.5,j.y/TILE*ts-1.5,3,3);
    }
    // Monedas
    for(const id in monedas) {
        const m=monedas[id];
        mmCtx.fillStyle='#ffd60a';
        mmCtx.fillRect(m.x/TILE*ts-1,m.y/TILE*ts-1,2,2);
    }
    // Yo
    if(yo) {
        mmCtx.fillStyle='#a855f7';
        mmCtx.fillRect(yo.x/TILE*ts-3,yo.y/TILE*ts-3,6,6);
        // Dirección
        mmCtx.strokeStyle='#fff';
        mmCtx.lineWidth=1.5;
        mmCtx.beginPath();
        mmCtx.moveTo(yo.x/TILE*ts, yo.y/TILE*ts);
        mmCtx.lineTo(yo.x/TILE*ts+Math.cos(yo.angle)*8, yo.y/TILE*ts+Math.sin(yo.angle)*8);
        mmCtx.stroke();
    }
}

// ── JOYSTICK MÓVIL ────────────────────────────────────────────────────────
const joystick={active:false,x:0,y:0,rx:0,baseX:0,baseY:0,id:-1};
function initJoystick() {
    const isMobile=('ontouchstart' in window);
    if(!isMobile){
        document.getElementById('joystickWrap').style.display='none';
        document.getElementById('btnDisparar').style.display='none';
        document.getElementById('btnCambiarArma').style.display='none';
        return;
    }
    const wrap=document.getElementById('joystickWrap');
    const thumb=document.getElementById('joystickThumb');
    const maxR=40;

    wrap.addEventListener('touchstart',e=>{
        e.preventDefault();
        const t=e.changedTouches[0];
        joystick.id=t.identifier; joystick.active=true;
        joystick.baseX=t.clientX; joystick.baseY=t.clientY;
    },{passive:false});
    wrap.addEventListener('touchmove',e=>{
        e.preventDefault();
        for(const t of e.changedTouches) {
            if(t.identifier!==joystick.id) continue;
            const dx=t.clientX-joystick.baseX, dy=t.clientY-joystick.baseY;
            const d=Math.sqrt(dx*dx+dy*dy);
            const cx=dx/Math.max(d,1)*Math.min(d,maxR);
            const cy=dy/Math.max(d,1)*Math.min(d,maxR);
            joystick.x=cx/maxR; joystick.y=cy/maxR;
            thumb.style.transform=`translate(${cx}px,${cy}px)`;
        }
    },{passive:false});
    const endJ=()=>{joystick.active=false;joystick.x=0;joystick.y=0;
        thumb.style.transform='';};
    wrap.addEventListener('touchend',endJ);
    wrap.addEventListener('touchcancel',endJ);

    // Deslizar pantalla derecha para mirar
    let lookId=-1,lookStartX=0;
    canvas.addEventListener('touchstart',e=>{
        for(const t of e.changedTouches){
            if(t.clientX>W*.5&&lookId===-1){lookId=t.identifier;lookStartX=t.clientX;}
        }
    });
    canvas.addEventListener('touchmove',e=>{
        e.preventDefault();
        for(const t of e.changedTouches){
            if(t.identifier===lookId&&vivo){
                joystick.rx=(t.clientX-lookStartX)*.01;
                lookStartX=t.clientX;
            }
        }
    },{passive:false});
    canvas.addEventListener('touchend',e=>{
        for(const t of e.changedTouches) if(t.identifier===lookId){lookId=-1;joystick.rx=0;}
    });
}

// ── CHAT ─────────────────────────────────────────────────────────────────
function abrirChat() {
    chatAbierto=true;
    document.exitPointerLock();
    document.getElementById('chatInput').style.display='block';
    document.getElementById('chatInput').focus();
}
function cerrarChat() {
    chatAbierto=false;
    document.getElementById('chatInput').style.display='none';
    document.getElementById('chatInput').value='';
}
function chatKeydown(e) {
    if(e.key==='Enter') {
        const msg=e.target.value.trim();
        if(msg) socket.emit('chat', msg);
        cerrarChat();
    }
    if(e.key==='Escape') cerrarChat();
}
function addChat(nombre, msg) {
    const log=document.getElementById('chatLog');
    const div=document.createElement('div');
    div.className='chat-msg';
    div.innerHTML=`<span class="cn">${escHtml(nombre)}:</span> ${escHtml(msg)}`;
    log.appendChild(div);
    while(log.children.length>6) log.removeChild(log.firstChild);
    setTimeout(()=>div.remove(),8000);
}

// ── KILLFEED ──────────────────────────────────────────────────────────────
function addKillfeed(txt, esMio=false) {
    const feed=document.getElementById('killfeed');
    const div=document.createElement('div');
    div.className='kf-item'+(esMio?' tuyo':'');
    div.textContent=txt;
    feed.appendChild(div);
    while(feed.children.length>5) feed.removeChild(feed.firstChild);
    setTimeout(()=>div.remove(),5000);
}

// ── HUD HELPERS ───────────────────────────────────────────────────────────
function actualizarHP() {
    const hp=Math.max(0,yo.hp||0);
    const pct=hp/100;
    const fill=document.getElementById('hpFill');
    const text=document.getElementById('hpText');
    fill.style.width=pct*100+'%';
    fill.className='hp-fill '+(pct>.5?'alto':pct>.25?'medio':'');
    text.textContent=hp;
}

let flashTimer=null;
function flashDanio() {
    const c=document.createElement('div');
    c.style.cssText='position:fixed;inset:0;background:#cc000033;pointer-events:none;z-index:9;';
    document.body.appendChild(c);
    setTimeout(()=>c.remove(),200);
}

// ── RESPAWN ───────────────────────────────────────────────────────────────
function mostrarRespawn(seg) {
    const ov=document.getElementById('respawnOverlay');
    const tm=document.getElementById('respawnTimer');
    ov.style.display='flex';
    let t=seg;
    tm.textContent=t;
    const iv=setInterval(()=>{
        t--;
        tm.textContent=Math.max(0,t);
        if(t<=0) clearInterval(iv);
    },1000);
}

// ── RESULTADO ─────────────────────────────────────────────────────────────
function mostrarResultado(resultados) {
    const yo2=resultados.find(r=>r.socketId===miId)||resultados[0];
    const ov=document.getElementById('resultadoOverlay');
    const pos=yo2?.posicion||'?';
    document.getElementById('resultadoTitulo').textContent=
        pos===1?'🏆 ¡VICTORIA!':'💀 Partida terminada';
    document.getElementById('resultadoSub').textContent=
        `Posición #${pos} de ${resultados.length} guerreros`;
    document.getElementById('resKills').textContent=yo2?.kills||0;
    document.getElementById('resMuertes').textContent=yo2?.muertes||0;
    document.getElementById('resMonedas').textContent=yo2?.monedas||0;
    document.getElementById('resPosicion').textContent='#'+(pos||'?');
    ov.style.display='flex';
}

function volverLobby() {
    socket.disconnect();
    sessionStorage.removeItem('aw_partida');
    window.location.href='/';
}

// ── UTILS ─────────────────────────────────────────────────────────────────
function rgba(r,g,b,a=255) {
    return ((a&0xff)<<24)|((b&0xff)<<16)|((g&0xff)<<8)|(r&0xff);
}
function escHtml(t){ const d=document.createElement('div'); d.textContent=t; return d.innerHTML; }
