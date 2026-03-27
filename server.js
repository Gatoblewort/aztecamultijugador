require('dotenv').config();
const express    = require('express');
const http       = require('http');
const { Server } = require('socket.io');
const path       = require('path');
const { Pool }   = require('pg');
const jwt        = require('jsonwebtoken');

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, { cors: { origin: '*' } });

// ─── DB ────────────────────────────────────────────────────────────────────
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

pool.connect()
    .then(() => console.log('✅ PostgreSQL conectado'))
    .catch(e => console.error('❌ DB error:', e.message));

// Inicializar schema
async function initDB() {
    const fs = require('fs');
    const schema = fs.readFileSync(path.join(__dirname, 'db/schema.sql'), 'utf8');
    try { await pool.query(schema); console.log('✅ Schema aplicado'); }
    catch(e) { console.error('Schema error:', e.message); }
}
initDB();

// ─── MIDDLEWARE ─────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ─── RUTAS API ───────────────────────────────────────────────────────────────
app.use('/api/auth',    require('./routes/auth')(pool));
app.use('/api/game',    require('./routes/game')(pool));
app.use('/api/ranking', require('./routes/ranking')(pool));

// ─── ESTADO DEL SERVIDOR ─────────────────────────────────────────────────────
// salas[salaId] = { jugadores: Map<socketId, jugadorData>, estado, mapa, tiempoInicio }
const salas = new Map();
// cola de espera: [ { socket, jugadorData } ]
let colaEspera = [];

const JUGADORES_POR_SALA = 8;    // máximo por sala
const TIEMPO_PARTIDA     = 5 * 60; // 5 minutos
const NPCS_BASE          = 4;    // NPCs cuando juegas solo

// ─── MAPAS ────────────────────────────────────────────────────────────────────
const MAPAS = ['templo_1', 'catacumba_2', 'templo_3'];

function generarMapa(tipo) {
    // 0=vacío, 1=piedra, 2=pirámide, 3=jade, 4=oro, 5=puerta, 6=oscuro, 7=lava
    if (tipo === 'templo_1') {
        const W = 24, H = 24;
        const m = Array.from({ length: H }, () => Array(W).fill(2));
        // Pasillos anchos (3 tiles de ancho)
        [3,4,  8,9,  14,15,  19,20].forEach(r => { for(let x=1;x<W-1;x++) m[r][x]=0; });
        [3,4,  8,9,  14,15,  19,20].forEach(c => { for(let y=1;y<H-1;y++) m[y][c]=0; });
        // Sala central amplia
        for(let y=9;y<16;y++) for(let x=9;x<16;x++) m[y][x]=0;
        // Paredes doradas sala central con entradas amplias
        for(let x=9;x<16;x++) { m[9][x]=4; m[15][x]=4; }
        for(let y=9;y<16;y++) { m[y][9]=4; m[y][15]=4; }
        // Entradas amplias (2 tiles)
        m[9][11]=0; m[9][12]=0; m[9][13]=0;
        m[15][11]=0; m[15][12]=0; m[15][13]=0;
        m[11][9]=0; m[12][9]=0; m[13][9]=0;
        m[11][15]=0; m[12][15]=0; m[13][15]=0;
        // Jade en esquinas
        m[2][2]=3; m[2][21]=3; m[21][2]=3; m[21][21]=3;
        // Solo pilares decorativos en intersecciones (no en pasillos)
        [[6,6],[6,17],[17,6],[17,17]].forEach(([x,y]) => { m[y][x]=1; });
        return { tiles: m, ancho: W, alto: H,
                 spawns: [{x:4,y:3},{x:19,y:3},{x:4,y:19},{x:19,y:19},
                           {x:11,y:4},{x:4,y:11},{x:19,y:11},{x:11,y:19}] };
    }
    if (tipo === 'catacumba_2') {
        const W = 36, H = 36;
        const m = Array.from({ length: H }, () => Array(W).fill(6));
        // Pasillos anchos
        [2,3,7,8,13,14,19,20,25,26,31,32].forEach(r => { for(let x=1;x<W-1;x++) m[r][x]=0; });
        [2,3,7,8,13,14,19,20,25,26,31,32].forEach(c => { for(let y=1;y<H-1;y++) m[y][c]=0; });
        // Salas en esquinas
        [[2,2,8,8],[2,26,8,8],[26,2,8,8],[26,26,8,8]].forEach(([ox,oy,w,h])=>{
            for(let y=oy;y<oy+h;y++) for(let x=ox;x<ox+w;x++) m[y][x]=0;
        });
        // Sala central con lava
        for(let y=15;y<22;y++) for(let x=15;x<22;x++){
            if(y===15||y===21||x===15||x===21) m[y][x]=7; else m[y][x]=0;
        }
        // Entradas a sala central
        m[15][18]=0; m[15][19]=0; m[21][18]=0; m[21][19]=0;
        m[18][15]=0; m[19][15]=0; m[18][21]=0; m[19][21]=0;
        m[9][9]=3; m[9][26]=3; m[26][9]=3; m[26][26]=3;
        m[5][17]=5; m[17][5]=5; m[29][17]=5; m[17][29]=5;
        return { tiles: m, ancho: W, alto: H,
                 spawns: [{x:4,y:4},{x:30,y:4},{x:4,y:30},{x:30,y:30},
                           {x:18,y:3},{x:3,y:18},{x:30,y:18},{x:18,y:30}] };
    }
    // templo_3
    const W = 32, H = 32;
    const m = Array.from({ length: H }, () => Array(W).fill(2));
    [3,4,9,10,16,17,23,24,28,29].forEach(r => { for(let x=1;x<W-1;x++) m[r][x]=0; });
    [3,4,9,10,16,17,23,24,28,29].forEach(c => { for(let y=1;y<H-1;y++) m[y][c]=0; });
    for(let y=13;y<20;y++) for(let x=13;x<20;x++) m[y][x]=0;
    for(let x=13;x<20;x++){m[13][x]=4;m[19][x]=4;}
    for(let y=13;y<20;y++){m[y][13]=4;m[y][19]=4;}
    m[13][15]=0;m[13][16]=0;m[13][17]=0;
    m[19][15]=0;m[19][16]=0;m[19][17]=0;
    m[15][13]=0;m[16][13]=0;m[17][13]=0;
    m[15][19]=0;m[16][19]=0;m[17][19]=0;
    [[3,3],[3,28],[28,3],[28,28]].forEach(([x,y])=>{m[y][x]=3;});
    [[7,7],[7,24],[24,7],[24,24]].forEach(([x,y])=>{m[y][x]=7;});
    return { tiles: m, ancho: W, alto: H,
             spawns: [{x:4,y:3},{x:26,y:3},{x:4,y:26},{x:26,y:26},
                       {x:15,y:3},{x:3,y:15},{x:27,y:15},{x:15,y:27}] };
}

// ─── MATCHMAKING ─────────────────────────────────────────────────────────────
function generarNPCs(mapa, cantidad, salaId) {
    const nombres = ['Cortés','Alvarado','Narváez','Velázquez','Sandoval','Olid','Montejo','Portocarrero'];
    const npcs = {};
    for (let i = 0; i < cantidad; i++) {
        const spawn = mapa.spawns[(i + 1) % mapa.spawns.length];
        const id = `npc_${salaId}_${i}`;
        // Spawn en centro exacto del tile para evitar colisiones
        let spawnX = spawn.x * 64 + 32, spawnY = spawn.y * 64 + 32;
        // Buscar tile libre si el spawn está ocupado
        for (let tries = 0; tries < 50; tries++) {
            const tx = Math.floor(spawnX/64), ty = Math.floor(spawnY/64);
            if (ty>=0&&ty<mapa.alto&&tx>=0&&tx<mapa.ancho&&mapa.tiles[ty][tx]===0) break;
            spawnX = (1 + Math.floor(Math.random()*(mapa.ancho-2))) * 64 + 32;
            spawnY = (1 + Math.floor(Math.random()*(mapa.alto-2))) * 64 + 32;
        }
        npcs[id] = {
            id, esNPC: true,
            nombre: nombres[i % nombres.length],
            skin: 'conquistador',
            x: spawnX,
            y: spawnY,
            angle: Math.random() * Math.PI * 2,
            hp: 100, maxHp: 100, vivo: true,
            arma: 0, kills: 0, muertes: 0, monedas: 0,
            estado: 'patrullar',
            aiTimer: 2 + Math.random() * 2,
            timerDisparo: 2 + Math.random() * 2,
            timerCambio: 2 + Math.random() * 3,
            strafeDir: Math.random() > 0.5 ? 1 : -1,
            burstCount: 0, burstTimer: 0, retreatTimer: 0,
            squadRole: i % 4,
            alertedBy: null,
            walkCycle: Math.random() * Math.PI * 2
        };
    }
    return npcs;
}

function colisionNPC(mapa, x, y, radio) {
    const r = radio || 18;
    // Primero verificar el tile central
    const ctx2 = Math.floor(x/64), cty = Math.floor(y/64);
    if (cty < 0 || cty >= mapa.alto || ctx2 < 0 || ctx2 >= mapa.ancho) return true;
    if (mapa.tiles[cty][ctx2] !== 0) return true;
    // Luego las esquinas con radio reducido
    const checks = [[x+r,y],[x-r,y],[x,y+r],[x,y-r]];
    for (const [cx,cy] of checks) {
        const tx = Math.floor(cx/64), ty = Math.floor(cy/64);
        if (ty < 0 || ty >= mapa.alto || tx < 0 || tx >= mapa.ancho) return true;
        if (mapa.tiles[ty][tx] !== 0) return true;
    }
    return false;
}

function dispararNPC(sala, io, npc, id, aimAngle) {
    const spread = (Math.random() - 0.5) * 0.25;
    const ang = aimAngle + spread;
    io.to(sala.id).emit('bala_creada', {
        id: `nb_${id}_${Date.now()}`,
        x: npc.x, y: npc.y,
        dx: Math.cos(ang) * 10,
        dy: Math.sin(ang) * 10,
        fromId: id, fromNPC: true,
        danio: 10, vida: 2.5
    });
    for (const [sid, jug] of sala.jugadores) {
        if (!jug.vivo) continue;
        const dx = jug.x - npc.x, dy = jug.y - npc.y;
        if (Math.sqrt(dx*dx+dy*dy) < 40) {
            jug.hp -= 10;
            io.to(sala.id).emit('jugador_recibio_danio', { id: sid, hp: jug.hp, fromId: id, danio: 10 });
            if (jug.hp <= 0) {
                jug.vivo = false; jug.muertes++; npc.kills++;
                io.to(sala.id).emit('jugador_murio', { id: sid, matadoPor: id, kills: npc.kills, muertes: jug.muertes });
                setTimeout(() => {
                    if (!salas.has(sala.id)) return;
                    const spawn = sala.mapa.spawns[Math.floor(Math.random()*sala.mapa.spawns.length)];
                    jug.x = spawn.x*64; jug.y = spawn.y*64; jug.hp = jug.maxHp; jug.vivo = true;
                    io.to(sala.id).emit('jugador_respawn', { id: sid, x: jug.x, y: jug.y, hp: jug.hp });
                }, 5000);
            }
        }
    }
}

function actualizarNPCs(sala, io) {
    if (!sala.npcs || Object.keys(sala.npcs).length === 0) return;
    const mapa = sala.mapa;
    const DT = 0.1;

    // FASE 1: alertas compartidas
    for (const id in sala.npcs) {
        const npc = sala.npcs[id];
        if (!npc.vivo) continue;
        let minDist = 999999;
        for (const [,jug] of sala.jugadores) {
            if (!jug.vivo) continue;
            const dx = jug.x-npc.x, dy = jug.y-npc.y;
            const d = Math.sqrt(dx*dx+dy*dy);
            if (d < minDist) minDist = d;
        }
        if (minDist < 500 && npc.estado === 'patrullar') {
            for (const id2 in sala.npcs) {
                if (id2 === id) continue;
                const n2 = sala.npcs[id2];
                if (!n2.vivo || n2.estado !== 'patrullar') continue;
                const dij = Math.sqrt((npc.x-n2.x)**2+(npc.y-n2.y)**2);
                if (dij < 300) {
                    n2.estado = (n2.squadRole===1||n2.squadRole===2) ? 'flanquear' : 'perseguir';
                    n2.aiTimer = 1.5; n2.alertedBy = id;
                }
            }
        }
    }

    // FASE 2: actualizar cada NPC
    for (const id in sala.npcs) {
        const npc = sala.npcs[id];
        if (!npc.vivo) continue;

        let minDist = 999999, targetX = null, targetY = null;
        for (const [,jug] of sala.jugadores) {
            if (!jug.vivo) continue;
            const dx = jug.x-npc.x, dy = jug.y-npc.y;
            const d = Math.sqrt(dx*dx+dy*dy);
            if (d < minDist) { minDist = d; targetX = jug.x; targetY = jug.y; }
        }

        const canSee = targetX !== null && minDist < 600;
        const toPlayerAngle = targetX !== null ? Math.atan2(targetY-npc.y, targetX-npc.x) : npc.angle;

        npc.aiTimer -= DT;
        npc.timerDisparo -= DT;
        npc.walkCycle += DT * 4;

        // Transiciones de estado
        if (canSee) {
            if (minDist < 100 && npc.estado !== 'retroceder') {
                npc.estado = 'retroceder'; npc.retreatTimer = 1.2;
            } else if (npc.aiTimer <= 0) {
                const r = Math.random() * 100;
                if (npc.squadRole === 0) {
                    if (r<40)      { npc.estado='disparar'; npc.burstCount=3; npc.burstTimer=0; }
                    else if (r<70) { npc.estado='perseguir'; }
                    else           { npc.estado='flanquear'; npc.strafeDir=Math.random()>.5?1:-1; }
                    npc.aiTimer = 1.5;
                } else if (npc.squadRole===1||npc.squadRole===2) {
                    if (r<50)      { npc.estado='flanquear'; }
                    else if (r<75) { npc.estado='disparar'; npc.burstCount=2; npc.burstTimer=0; }
                    else           { npc.estado='perseguir'; }
                    npc.aiTimer = 1.2;
                } else {
                    if (r<60)      { npc.estado='disparar'; npc.burstCount=2; npc.burstTimer=0; }
                    else           { npc.estado='perseguir'; }
                    npc.aiTimer = 2.0;
                }
            }
        } else if (!canSee && npc.aiTimer <= 0 && npc.estado !== 'patrullar') {
            npc.estado = 'patrullar'; npc.aiTimer = 3; npc.alertedBy = null;
        }

        let moveX = 0, moveY = 0;
        const spd = 2.2;

        switch (npc.estado) {
            case 'patrullar':
                npc.timerCambio -= DT;
                if (npc.timerCambio <= 0) { npc.angle=Math.random()*Math.PI*2; npc.timerCambio=2+Math.random()*3; }
                moveX = Math.cos(npc.angle)*spd*0.5; moveY = Math.sin(npc.angle)*spd*0.5;
                break;
            case 'perseguir':
                npc.angle = toPlayerAngle;
                moveX = Math.cos(npc.angle)*spd; moveY = Math.sin(npc.angle)*spd;
                if (npc.timerDisparo<=0 && minDist<400) { npc.timerDisparo=1.8; dispararNPC(sala,io,npc,id,toPlayerAngle); }
                break;
            case 'flanquear': {
                npc.angle = toPlayerAngle;
                const perp = toPlayerAngle + Math.PI/2 * npc.strafeDir;
                moveX = Math.cos(perp)*spd*0.9; moveY = Math.sin(perp)*spd*0.9;
                if (npc.timerDisparo<=0 && minDist<350) { npc.timerDisparo=1.5; dispararNPC(sala,io,npc,id,toPlayerAngle); }
                break;
            }
            case 'retroceder':
                npc.retreatTimer -= DT; npc.angle = toPlayerAngle;
                moveX = Math.cos(toPlayerAngle+Math.PI)*spd*1.1; moveY = Math.sin(toPlayerAngle+Math.PI)*spd*1.1;
                if (npc.timerDisparo<=0) { npc.timerDisparo=1.0; dispararNPC(sala,io,npc,id,toPlayerAngle); }
                if (npc.retreatTimer<=0) { npc.estado='flanquear'; npc.aiTimer=1.0; }
                break;
            case 'disparar':
                npc.angle = toPlayerAngle;
                npc.burstTimer -= DT;
                if (npc.burstTimer<=0 && npc.burstCount>0) { npc.burstCount--; npc.burstTimer=0.2; dispararNPC(sala,io,npc,id,toPlayerAngle); }
                moveX = Math.cos(toPlayerAngle+Math.PI/2)*Math.sin(npc.walkCycle)*spd*0.3;
                moveY = Math.sin(toPlayerAngle+Math.PI/2)*Math.sin(npc.walkCycle)*spd*0.3;
                break;
        }

        // Separación entre NPCs
        for (const id2 in sala.npcs) {
            if (id2===id) continue;
            const n2=sala.npcs[id2]; if (!n2.vivo) continue;
            const dij=Math.sqrt((npc.x-n2.x)**2+(npc.y-n2.y)**2);
            if (dij<50&&dij>0.1) {
                const pa=Math.atan2(npc.y-n2.y,npc.x-n2.x), push=(50-dij)/50*spd*0.5;
                moveX+=Math.cos(pa)*push; moveY+=Math.sin(pa)*push;
            }
        }

        // Mover con colisión por ejes independientes
        if (moveX!==0||moveY!==0) {
            if (!colisionNPC(mapa,npc.x+moveX,npc.y+moveY,20))      { npc.x+=moveX; npc.y+=moveY; }
            else if (!colisionNPC(mapa,npc.x+moveX,npc.y,20))        { npc.x+=moveX; }
            else if (!colisionNPC(mapa,npc.x,npc.y+moveY,20))        { npc.y+=moveY; }
            else { npc.angle += Math.PI/2+(Math.random()-0.5); }
        }

        io.to(sala.id).emit('jugador_movio', { id, x: npc.x, y: npc.y, angle: npc.angle, arma: 0 });
    }
}


function intentarCrearSala() {
    if (colaEspera.length < 1) return; // ¡1 jugador es suficiente!

    const grupo = colaEspera.splice(0, Math.min(JUGADORES_POR_SALA, colaEspera.length));
    const salaId = 'sala_' + Date.now();
    const tipoMapa = MAPAS[Math.floor(Math.random() * MAPAS.length)];
    const mapa = generarMapa(tipoMapa);

    const sala = {
        id: salaId,
        mapa,
        tipoMapa,
        estado: 'jugando',
        tiempoInicio: Date.now(),
        jugadores: new Map(),
        balas: new Map(),
        monedas: generarMonedas(mapa),
        npcs: {},
        timerInterval: null,
        npcInterval: null
    };

    // Generar NPCs ANTES de emitir partida_iniciada para incluirlos en el payload
    const numNPCs = Math.max(0, NPCS_BASE - (grupo.length - 1));
    if (numNPCs > 0) {
        sala.npcs = generarNPCs(mapa, numNPCs, salaId);
        console.log(`🤖 ${numNPCs} NPCs generados para sala ${salaId}`);
    }

    grupo.forEach((entry, i) => {
        const spawn = mapa.spawns[i % mapa.spawns.length];
        const jugadorEnSala = {
            ...entry.jugadorData,
            socketId: entry.socket.id,
            x: (spawn.x + (Math.random()-0.5)*0.5) * 64,
            y: (spawn.y + (Math.random()-0.5)*0.5) * 64,
            angle: Math.random() * Math.PI * 2,
            hp: 100,
            maxHp: 100,
            kills: 0,
            muertes: 0,
            monedas: 0,
            arma: 'macuahuitl',
            vivo: true,
            respawnTimer: 0
        };
        sala.jugadores.set(entry.socket.id, jugadorEnSala);
        entry.socket.join(salaId);
        entry.socket.data.salaId = salaId;
        entry.socket.emit('partida_iniciada', {
            salaId,
            mapa: { tiles: mapa.tiles, ancho: mapa.ancho, alto: mapa.alto },
            tipoMapa,
            jugadores: Object.fromEntries(sala.jugadores),
            tuId: entry.socket.id,
            tiempoTotal: TIEMPO_PARTIDA,
            npcs: sala.npcs || {}
        });
    });

    salas.set(salaId, sala);
    console.log(`🏛️  Sala ${salaId} creada con ${grupo.length} jugadores — mapa: ${tipoMapa}`);

    // Iniciar loop de IA si hay NPCs
    if (numNPCs > 0) {
        // Loop de IA de NPCs cada 100ms
        sala.npcInterval = setInterval(() => {
            if (!salas.has(salaId)) { clearInterval(sala.npcInterval); return; }
            actualizarNPCs(sala, io);
        }, 100);
    }

    // Timer de la partida
    let tiempoRestante = TIEMPO_PARTIDA;
    sala.timerInterval = setInterval(() => {
        tiempoRestante--;
        io.to(salaId).emit('tick_timer', { tiempoRestante });
        if (tiempoRestante <= 0) terminarPartida(salaId, 'tiempo');
    }, 1000);
}

function generarMonedas(mapa) {
    const monedas = new Map();
    let id = 0;
    for (let i = 0; i < 20; i++) {
        let x, y, intentos = 0;
        do {
            x = 1 + Math.floor(Math.random() * (mapa.ancho - 2));
            y = 1 + Math.floor(Math.random() * (mapa.alto - 2));
            intentos++;
        } while (mapa.tiles[y][x] !== 0 && intentos < 50);
        if (mapa.tiles[y][x] === 0) {
            monedas.set(`m${id}`, { id: `m${id}`, x: x*64+32, y: y*64+32, valor: 10+Math.floor(Math.random()*40) });
            id++;
        }
    }
    return monedas;
}

async function terminarPartida(salaId, razon) {
    const sala = salas.get(salaId);
    if (!sala || sala.estado === 'terminada') return;
    sala.estado = 'terminada';
    clearInterval(sala.timerInterval);
    if (sala.npcInterval) clearInterval(sala.npcInterval);

    // Calcular ranking de la sala
    const resultados = Array.from(sala.jugadores.values())
        .sort((a,b) => b.kills - a.kills || a.muertes - b.muertes)
        .map((j,i) => ({ ...j, posicion: i+1 }));

    io.to(salaId).emit('partida_terminada', { razon, resultados });

    // Guardar estadísticas en DB
    try {
        const partidaId = require('uuid').v4();
        await pool.query(
            `INSERT INTO partidas (id, mapa, estado, duracion_segundos, terminada_en)
             VALUES ($1,$2,'terminada',$3,NOW())`,
            [partidaId, sala.tipoMapa, TIEMPO_PARTIDA - (sala.tiempoRestante||0)]
        );
        for (const j of resultados) {
            if (!j.dbId) continue;
            const xpGanada = Math.max(10, j.kills * 25 - j.muertes * 5 + (j.posicion===1?100:0));
            await pool.query(
                `INSERT INTO partida_jugadores (partida_id,jugador_id,kills,muertes,monedas_ganadas,experiencia_ganada,posicion_final)
                 VALUES ($1,$2,$3,$4,$5,$6,$7)`,
                [partidaId, j.dbId, j.kills, j.muertes, j.monedas, xpGanada, j.posicion]
            );
            await pool.query(
                `UPDATE jugadores SET
                    kills_total = kills_total + $1,
                    muertes_total = muertes_total + $2,
                    monedas = monedas + $3,
                    experiencia = experiencia + $4,
                    partidas_jugadas = partidas_jugadas + 1,
                    partidas_ganadas = partidas_ganadas + $5,
                    nivel = GREATEST(nivel, FLOOR(SQRT((experiencia+$4)/100))::int + 1)
                 WHERE id = $6`,
                [j.kills, j.muertes, j.monedas, xpGanada, j.posicion===1?1:0, j.dbId]
            );
        }
    } catch(e) { console.error('Error guardando stats:', e.message); }

    setTimeout(() => salas.delete(salaId), 30000);
}

// ─── SOCKET.IO ────────────────────────────────────────────────────────────────
io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Sin token'));
    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET || 'aztec_secret_2024');
        socket.data.jugador = payload;
        next();
    } catch { next(new Error('Token inválido')); }
});

io.on('connection', (socket) => {
    const j = socket.data.jugador;
    console.log(`🟢 Conectado: ${j.nombre} (${socket.id})`);

    // ── Buscar partida ──
    socket.on('buscar_partida', async (skinData) => {
        // Evitar doble entrada
        if (colaEspera.find(e => e.socket.id === socket.id)) return;
        const jugadorData = {
            nombre: j.nombre,
            dbId: j.id,
            skin: skinData?.skin || j.skin_activa || 'guerrero_base',
            nivel: j.nivel || 1,
            kills: 0, muertes: 0, monedas: 0,
            hp: 100, maxHp: 100, vivo: true,
            arma: 'macuahuitl'
        };

        // Buscar sala en curso con espacio
        let salaEnCurso = null;
        for (const [sid, sala] of salas) {
            if (sala.estado === 'jugando' && sala.jugadores.size < JUGADORES_POR_SALA) {
                salaEnCurso = sala;
                break;
            }
        }

        if (salaEnCurso) {
            // Unirse a sala en curso
            const spawn = salaEnCurso.mapa.spawns[Math.floor(Math.random() * salaEnCurso.mapa.spawns.length)];
            const jugadorEnSala = {
                ...jugadorData,
                socketId: socket.id,
                x: spawn.x * 64, y: spawn.y * 64,
                angle: Math.random() * Math.PI * 2,
            };
            salaEnCurso.jugadores.set(socket.id, jugadorEnSala);
            socket.join(salaEnCurso.id);
            socket.data.salaId = salaEnCurso.id;
            socket.emit('partida_iniciada', {
                salaId: salaEnCurso.id,
                mapa: { tiles: salaEnCurso.mapa.tiles, ancho: salaEnCurso.mapa.ancho, alto: salaEnCurso.mapa.alto },
                tipoMapa: salaEnCurso.tipoMapa,
                jugadores: Object.fromEntries(salaEnCurso.jugadores),
                tuId: socket.id,
                tiempoTotal: TIEMPO_PARTIDA
            });
            // Notificar NPCs al nuevo jugador
            if (salaEnCurso.npcs && Object.keys(salaEnCurso.npcs).length > 0) {
                socket.emit('npcs_spawned', salaEnCurso.npcs);
            }
            // Avisar a los demás del nuevo jugador
            socket.to(salaEnCurso.id).emit('jugador_unido', { id: socket.id, ...jugadorEnSala });
            showToast && showToast(`${j.nombre} se unió a la batalla`);
            console.log(`⚔️ ${j.nombre} se unió a sala en curso ${salaEnCurso.id}`);
            return;
        }

        // No hay sala disponible — ir a cola
        colaEspera.push({ socket, jugadorData });
        socket.emit('en_cola', { posicion: colaEspera.length });
        io.emit('cola_actualizada', { enCola: colaEspera.length });
        console.log(`⏳ Cola: ${colaEspera.length} jugadores`);

        // 30 segundos de espera, luego arranca solo o con quien haya
        if (colaEspera.length >= JUGADORES_POR_SALA) {
            intentarCrearSala();
        } else {
            setTimeout(() => {
                if (colaEspera.length >= 1) intentarCrearSala();
            }, 30000);
        }
    });

    // ── Cancelar búsqueda ──
    socket.on('cancelar_busqueda', () => {
        colaEspera = colaEspera.filter(e => e.socket.id !== socket.id);
        io.emit('cola_actualizada', { enCola: colaEspera.length });
    });

    // ── Movimiento del jugador ──
    socket.on('mover', (data) => {
        const salaId = socket.data.salaId;
        const sala = salas.get(salaId);
        if (!sala) return;
        const jugador = sala.jugadores.get(socket.id);
        if (!jugador || !jugador.vivo) return;

        jugador.x     = data.x;
        jugador.y     = data.y;
        jugador.angle = data.angle;

        // Broadcast a los demás en la sala
        socket.to(salaId).emit('jugador_movio', {
            id: socket.id,
            x: data.x, y: data.y, angle: data.angle,
            arma: jugador.arma
        });
    });

    // ── Disparo ──
    socket.on('disparar', (data) => {
        const salaId = socket.data.salaId;
        const sala = salas.get(salaId);
        if (!sala) return;
        const tirador = sala.jugadores.get(socket.id);
        if (!tirador || !tirador.vivo) return;

        const balaId = `b_${socket.id}_${Date.now()}`;
        const bala = {
            id: balaId,
            x: data.x, y: data.y,
            dx: data.dx, dy: data.dy,
            danio: data.danio || 15,
            fromId: socket.id,
            vida: 2.5
        };
        sala.balas.set(balaId, bala);

        // Broadcast bala a todos en la sala
        io.to(salaId).emit('bala_creada', bala);

        // Detección de hit — simular trayectoria de la bala paso a paso
        const HIT_RADIO = 50;
        let balaX = data.x, balaY = data.y;
        // Normalizar dirección y usar pasos más pequeños para mayor precisión
        const bSpeed = Math.sqrt(data.dx*data.dx + data.dy*data.dy) || 1;
        const bStepX = (data.dx / bSpeed) * 8;
        const bStepY = (data.dy / bSpeed) * 8;
        let hitRegistrado = false;

        for (let paso = 0; paso < 150 && !hitRegistrado; paso++) {
            balaX += bStepX; balaY += bStepY;
            // Colision con pared
            const btx = Math.floor(balaX/64), bty = Math.floor(balaY/64);
            if (bty < 0 || bty >= sala.mapa.alto || btx < 0 || btx >= sala.mapa.ancho) break;
            if (sala.mapa.tiles[bty][btx] !== 0) break;

            // Chequear jugadores humanos
            for (const [sid, objetivo] of sala.jugadores) {
                if (sid === socket.id || !objetivo.vivo) continue;
                const dx = objetivo.x - balaX, dy = objetivo.y - balaY;
                if (Math.sqrt(dx*dx + dy*dy) < HIT_RADIO) {
                    objetivo.hp -= bala.danio;
                    sala.balas.delete(balaId);
                    hitRegistrado = true;
                    io.to(salaId).emit('jugador_recibio_danio', {
                        id: sid, hp: objetivo.hp,
                        fromId: socket.id, danio: bala.danio
                    });
                    if (objetivo.hp <= 0) {
                        objetivo.vivo = false; objetivo.muertes++;
                        tirador.kills++; tirador.monedas += 50;
                        io.to(salaId).emit('jugador_murio', {
                            id: sid, matadoPor: socket.id,
                            kills: tirador.kills, muertes: objetivo.muertes
                        });
                        setTimeout(() => {
                            if (!salas.has(salaId)) return;
                            const spawn = sala.mapa.spawns[Math.floor(Math.random()*sala.mapa.spawns.length)];
                            objetivo.x = spawn.x*64; objetivo.y = spawn.y*64;
                            objetivo.hp = objetivo.maxHp; objetivo.vivo = true;
                            io.to(salaId).emit('jugador_respawn', { id: sid, x: objetivo.x, y: objetivo.y, hp: objetivo.hp });
                        }, 5000);
                        const vivos = Array.from(sala.jugadores.values()).filter(j2 => j2.vivo).length;
                        if (vivos <= 1) terminarPartida(salaId, 'eliminacion');
                    }
                    break;
                }
            }
            if (hitRegistrado) break;

            // Chequear NPCs
            for (const nid in sala.npcs) {
                const npc = sala.npcs[nid];
                if (!npc.vivo) continue;
                const dx = npc.x - balaX, dy = npc.y - balaY;
                if (Math.sqrt(dx*dx + dy*dy) < HIT_RADIO) {
                    npc.hp -= bala.danio;
                    sala.balas.delete(balaId);
                    hitRegistrado = true;
                    io.to(salaId).emit('jugador_recibio_danio', {
                        id: nid, hp: npc.hp,
                        fromId: socket.id, danio: bala.danio
                    });
                    if (npc.hp <= 0) {
                        npc.vivo = false;
                        tirador.kills++; tirador.monedas += 50;
                        io.to(salaId).emit('jugador_murio', {
                            id: nid, matadoPor: socket.id,
                            kills: tirador.kills, muertes: 0
                        });
                    }
                    break;
                }
            }
        }

    });

    // ── Recoger moneda ──
    socket.on('recoger_moneda', (monedaId) => {
        const salaId = socket.data.salaId;
        const sala = salas.get(salaId);
        if (!sala) return;
        const moneda = sala.monedas.get(monedaId);
        if (!moneda) return;
        const jugador = sala.jugadores.get(socket.id);
        if (!jugador) return;
        jugador.monedas += moneda.valor;
        sala.monedas.delete(monedaId);
        io.to(salaId).emit('moneda_recogida', {
            monedaId, porId: socket.id, monedas: jugador.monedas
        });
    });

    // ── Chat en sala ──
    socket.on('chat', (msg) => {
        const salaId = socket.data.salaId;
        if (!salaId) return;
        io.to(salaId).emit('chat_msg', {
            nombre: j.nombre, msg: msg.slice(0, 100),
            ts: Date.now()
        });
    });

    // ── Desconexión ──
    socket.on('disconnect', () => {
        console.log(`🔴 Desconectado: ${j.nombre}`);
        colaEspera = colaEspera.filter(e => e.socket.id !== socket.id);
        const salaId = socket.data.salaId;
        if (salaId) {
            const sala = salas.get(salaId);
            if (sala) {
                sala.jugadores.delete(socket.id);
                io.to(salaId).emit('jugador_salio', { id: socket.id });
                if (sala.jugadores.size < 1) terminarPartida(salaId, 'abandono');
            }
        }
    });
});

// ─── ARRANQUE ─────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🏛️  Aztec War server en puerto ${PORT}`));
