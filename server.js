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

// ─── SPAWN SEGURO ────────────────────────────────────────────────────────────
// Busca el tile libre más cercano al spawn deseado y devuelve coordenadas
// en píxeles centradas en ese tile. Nunca devuelve una posición dentro de pared.
function encontrarSpawnLibre(mapa, tileX, tileY) {
    // Radio de búsqueda en espiral
    for (let r = 0; r <= 5; r++) {
        for (let dy = -r; dy <= r; dy++) {
            for (let dx = -r; dx <= r; dx++) {
                if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue; // solo borde
                const tx = tileX + dx, ty = tileY + dy;
                if (tx < 1 || ty < 1 || tx >= mapa.ancho - 1 || ty >= mapa.alto - 1) continue;
                if (mapa.tiles[ty][tx] === 0) {
                    // Centro exacto del tile = tile * 64 + 32
                    return { x: tx * 64 + 32, y: ty * 64 + 32 };
                }
            }
        }
    }
    // Fallback: buscar cualquier tile vacío en el mapa
    for (let ty = 1; ty < mapa.alto - 1; ty++) {
        for (let tx = 1; tx < mapa.ancho - 1; tx++) {
            if (mapa.tiles[ty][tx] === 0) {
                return { x: tx * 64 + 32, y: ty * 64 + 32 };
            }
        }
    }
    return { x: 64 + 32, y: 64 + 32 }; // último recurso
}

// ─── MATCHMAKING ─────────────────────────────────────────────────────────────

// ── Constantes de IA (equivalentes al C) ──────────────────────────────────
const NPC_RADIO          = 20.0;   // ENEMY_RADIUS del C
const NPC_ALERT_DIST     = 600.0;  // alertDistance base
const NPC_SPD            = 2.2;    // velocidad base
const DT                 = 0.1;    // paso de simulación (100 ms)

// Estados de IA — mirror exacto del enum AIState del C
const AI_PATROL  = 'patrullar';
const AI_CHASE   = 'perseguir';
const AI_STRAFE  = 'strafear';    // en el C: AI_STRAFE  (antes llamado "flanquear" sin posición objetivo)
const AI_RETREAT = 'retroceder';
const AI_SHOOT   = 'disparar';
const AI_FLANK   = 'flanquear';   // en el C: AI_FLANK   (posición objetivo calculada)
const AI_PINCER  = 'pincer';      // en el C: AI_PINCER  (faltaba completamente)

// ── hasLOS: línea de visión real (igual que el C) ─────────────────────────
function hasLOS(mapa, x1, y1, x2, y2) {
    const dx = x2 - x1, dy = y2 - y1;
    const d  = Math.sqrt(dx*dx + dy*dy);
    if (d < 1) return true;
    const nx = dx/d, ny = dy/d;
    // Pasos de 10 unidades, igual que el C
    for (let t = 10; t < d; t += 10) {
        const cx = Math.floor((x1 + nx*t) / 64);
        const cy = Math.floor((y1 + ny*t) / 64);
        if (cy < 0 || cy >= mapa.alto || cx < 0 || cx >= mapa.ancho) return false;
        if (mapa.tiles[cy][cx] !== 0) return false;
    }
    return true;
}

// ── Colisión con radio AABB (4 esquinas, igual que checkCollisionR del C) ──
function colisionNPC(mapa, x, y, r) {
    const radio = r || NPC_RADIO;
    const corners = [[x+radio, y+radio],[x-radio, y+radio],[x+radio, y-radio],[x-radio, y-radio]];
    for (const [cx, cy] of corners) {
        const tx = Math.floor(cx/64), ty = Math.floor(cy/64);
        if (ty < 0 || ty >= mapa.alto || tx < 0 || tx >= mapa.ancho) return true;
        if (mapa.tiles[ty][tx] !== 0) return true;
    }
    return false;
}

// ── Generación de NPCs ────────────────────────────────────────────────────
function generarNPCs(mapa, cantidad, salaId) {
    const nombres = ['Cortés','Alvarado','Narváez','Velázquez','Sandoval','Olid','Montejo','Portocarrero'];
    const npcs = {};

    for (let i = 0; i < cantidad; i++) {
        const id = `npc_${salaId}_${i}`;

        // Buscar posición libre lejos del centro del mapa
        let spawnX, spawnY;
        let tries = 0;
        do {
            spawnX = (1 + Math.floor(Math.random() * (mapa.ancho - 2))) * 64 + 32;
            spawnY = (1 + Math.floor(Math.random() * (mapa.alto  - 2))) * 64 + 32;
            tries++;
        } while (colisionNPC(mapa, spawnX, spawnY, NPC_RADIO) && tries < 100);

        npcs[id] = {
            id,
            esNPC: true,
            nombre: nombres[i % nombres.length],
            skin: 'conquistador',
            x: spawnX,
            y: spawnY,
            angle: Math.random() * Math.PI * 2,
            hp: 100, maxHp: 100,
            vivo: true,
            arma: 0, kills: 0, muertes: 0, monedas: 0,

            // IA — mismos campos que el struct Enemy del C
            estado:       AI_PATROL,
            aiTimer:      2.0 + Math.random() * 2.0,
            coordTimer:   0,                          // ← nuevo (coordTimer del C)
            moveTimer:    0,                          // ← nuevo (moveTimer del C)
            stuckTimer:   0,                          // ← nuevo (stuckTimer del C)
            lastValidX:   spawnX,                     // ← nuevo (lastValidX del C)
            lastValidY:   spawnY,                     // ← nuevo (lastValidY del C)
            timerDisparo: 2.0 + Math.random() * 2.0,
            strafeDir:    Math.random() > 0.5 ? 1 : -1,
            burstCount:   0,
            burstTimer:   0,
            retreatTimer: 0,
            squadRole:    i % 4,                      // roles 0,1,2,3 como en el C
            alertedBy:    null,
            flankAngle:   (i % 4) * (Math.PI / 2),   // ← nuevo (flankAngle del C)
            walkCycle:    Math.random() * Math.PI * 2,
            alertDistance: NPC_ALERT_DIST
        };
    }
    return npcs;
}

// ── Disparo de NPC (con detección de hit en jugadores) ───────────────────
function dispararNPC(sala, io, npc, id, aimAngle, spread = 0.12) {
    const sp = (Math.random() - 0.5) * spread;
    const ang = aimAngle + sp;
    io.to(sala.id).emit('bala_creada', {
        id:  `nb_${id}_${Date.now()}`,
        x:   npc.x, y: npc.y,
        dx:  Math.cos(ang) * 10,
        dy:  Math.sin(ang) * 10,
        fromId: id, fromNPC: true,
        danio: 10, vida: 2.5
    });
    // Hit detection inmediato para jugadores cercanos (igual que el C)
    for (const [sid, jug] of sala.jugadores) {
        if (!jug.vivo) continue;
        const dx = jug.x - npc.x, dy = jug.y - npc.y;
        if (Math.sqrt(dx*dx + dy*dy) < 40) {
            jug.hp -= 10;
            io.to(sala.id).emit('jugador_recibio_danio', { id: sid, hp: jug.hp, fromId: id, danio: 10 });
            if (jug.hp <= 0) {
                jug.vivo = false; jug.muertes++; npc.kills++;
                io.to(sala.id).emit('jugador_murio', { id: sid, matadoPor: id, kills: npc.kills, muertes: jug.muertes });
                setTimeout(() => {
                    if (!salas.has(sala.id)) return;
                    const spawn = sala.mapa.spawns[Math.floor(Math.random() * sala.mapa.spawns.length)];
                    const sp = encontrarSpawnLibre(sala.mapa, spawn.x, spawn.y); jug.x = sp.x; jug.y = sp.y;
                    jug.hp = jug.maxHp; jug.vivo = true;
                    io.to(sala.id).emit('jugador_respawn', { id: sid, x: jug.x, y: jug.y, hp: jug.hp });
                }, 5000);
            }
        }
    }
}

// ── Loop principal de IA — equivalente a updateEnemies() del C ────────────
function actualizarNPCs(sala, io) {
    if (!sala.npcs || Object.keys(sala.npcs).length === 0) return;
    const mapa = sala.mapa;

    // ── FASE 1: Compartir alertas (igual que el C) ─────────────────────────
    for (const id in sala.npcs) {
        const ei = sala.npcs[id];
        if (!ei.vivo) continue;

        // Encontrar jugador más cercano visible
        let minDist = Infinity;
        for (const [, jug] of sala.jugadores) {
            if (!jug.vivo) continue;
            const dx = jug.x - ei.x, dy = jug.y - ei.y;
            const d = Math.sqrt(dx*dx + dy*dy);
            if (d < minDist) minDist = d;
        }

        // Si este NPC ve al jugador, alerta a los cercanos
        const iSees = minDist < ei.alertDistance && (() => {
            for (const [, jug] of sala.jugadores) {
                if (!jug.vivo) continue;
                if (hasLOS(mapa, ei.x, ei.y, jug.x, jug.y)) return true;
            }
            return false;
        })();

        if (iSees) {
            for (const id2 in sala.npcs) {
                if (id2 === id) continue;
                const ej = sala.npcs[id2];
                if (!ej.vivo || ej.estado !== AI_PATROL) continue;
                const dij = Math.sqrt((ei.x - ej.x)**2 + (ei.y - ej.y)**2);
                if (dij < 300) {
                    // roles 1 y 2 → flanquean; roles 0 y 3 → persiguen
                    ej.estado    = (ej.squadRole === 1 || ej.squadRole === 2) ? AI_FLANK : AI_CHASE;
                    ej.aiTimer   = 1.5;
                    ej.alertedBy = id;
                }
            }
        }
    }

    // ── FASE 2: Actualizar cada NPC ───────────────────────────────────────
    for (const id in sala.npcs) {
        const npc = sala.npcs[id];
        if (!npc.vivo) continue;

        // Jugador objetivo más cercano CON línea de visión
        let minDist = Infinity, targetX = null, targetY = null;
        for (const [, jug] of sala.jugadores) {
            if (!jug.vivo) continue;
            const dx = jug.x - npc.x, dy = jug.y - npc.y;
            const d  = Math.sqrt(dx*dx + dy*dy);
            if (d < minDist) { minDist = d; targetX = jug.x; targetY = jug.y; }
        }

        // canSee usa hasLOS — igual que el C
        const canSee = targetX !== null
            && minDist < npc.alertDistance
            && hasLOS(mapa, npc.x, npc.y, targetX, targetY);

        const toPlayerAngle = targetX !== null
            ? Math.atan2(targetY - npc.y, targetX - npc.x)
            : npc.angle;

        npc.aiTimer    -= DT;
        npc.coordTimer -= DT;
        npc.walkCycle  += DT * 4;

        // ── Transiciones de estado (espejo exacto del C) ──────────────────
        if (canSee) {
            if (minDist < 120 && npc.estado !== AI_RETREAT) {
                npc.estado       = AI_RETREAT;
                npc.retreatTimer = 1.2;
            } else if (npc.aiTimer <= 0) {
                const rr = Math.floor(Math.random() * 100);

                if (npc.squadRole === 0) {
                    // Líder: dispara en bursts, persigue, o strafea
                    if      (rr < 40) { npc.estado = AI_SHOOT;  npc.aiTimer = 1.5; npc.burstCount = 3 + (Math.random() > 0.5 ? 1 : 0); npc.burstTimer = 0; }
                    else if (rr < 70) { npc.estado = AI_CHASE;  npc.aiTimer = 0.8; }
                    else              { npc.estado = AI_STRAFE; npc.aiTimer = 1.0; npc.strafeDir = Math.random() > 0.5 ? 1 : -1; }
                } else if (npc.squadRole === 1 || npc.squadRole === 2) {
                    // Flanqueadores: flanquean con posición objetivo, o disparan
                    if      (rr < 50) { npc.estado = AI_FLANK;  npc.aiTimer = 1.2; }
                    else if (rr < 75) { npc.estado = AI_SHOOT;  npc.aiTimer = 1.0; npc.burstCount = 2; npc.burstTimer = 0; }
                    else              { npc.estado = AI_STRAFE; npc.aiTimer = 0.8; npc.strafeDir = npc.squadRole === 1 ? 1 : -1; }
                } else {
                    // Role 3: Pincer — rodea al jugador desde el lado opuesto al líder
                    if      (rr < 35) { npc.estado = AI_PINCER; npc.aiTimer = 1.5; }
                    else if (rr < 60) { npc.estado = AI_SHOOT;  npc.aiTimer = 1.2; npc.burstCount = 2; npc.burstTimer = 0; }
                    else              { npc.estado = AI_CHASE;  npc.aiTimer = 0.7; }
                }
            }
        } else if (npc.aiTimer <= 0 && npc.estado !== AI_PATROL) {
            npc.estado    = AI_PATROL;
            npc.aiTimer   = 3.0;
            npc.alertedBy = null;
        }

        // ── Comportamiento por estado (espejo del switch del C) ───────────
        let moveX = 0, moveY = 0;

        switch (npc.estado) {

            case AI_PATROL: {
                // Patrulla aleatoria — moveTimer controla cambio de ángulo
                npc.moveTimer += DT;
                if (npc.moveTimer > 2.5) {
                    npc.angle     = Math.random() * Math.PI * 2;
                    npc.moveTimer = 0;
                }
                moveX = Math.cos(npc.angle) * NPC_SPD * 0.5;
                moveY = Math.sin(npc.angle) * NPC_SPD * 0.5;
                break;
            }

            case AI_CHASE: {
                // Persecución directa
                npc.angle = toPlayerAngle;
                moveX = Math.cos(npc.angle) * NPC_SPD;
                moveY = Math.sin(npc.angle) * NPC_SPD;
                break;
            }

            case AI_STRAFE: {
                // Strafeo perpendicular mientras dispara — igual que AI_STRAFE del C
                npc.angle = toPlayerAngle;
                const perpS = toPlayerAngle + Math.PI / 2 * npc.strafeDir;
                moveX = Math.cos(perpS) * NPC_SPD * 0.9;
                moveY = Math.sin(perpS) * NPC_SPD * 0.9;
                npc.timerDisparo -= DT;
                if (npc.timerDisparo <= 0) {
                    dispararNPC(sala, io, npc, id, toPlayerAngle, 0.12);
                    npc.timerDisparo = 1.8;
                }
                break;
            }

            case AI_RETREAT: {
                // Retrocede mientras dispara — igual que AI_RETREAT del C
                const awayAngle = toPlayerAngle + Math.PI;
                moveX = Math.cos(awayAngle) * NPC_SPD * 1.1;
                moveY = Math.sin(awayAngle) * NPC_SPD * 1.1;
                npc.angle = toPlayerAngle;
                npc.retreatTimer -= DT;
                npc.timerDisparo -= DT;
                if (npc.timerDisparo <= 0) {
                    dispararNPC(sala, io, npc, id, toPlayerAngle, 0.18);
                    npc.timerDisparo = 1.0;
                }
                if (npc.retreatTimer <= 0) {
                    npc.estado    = AI_STRAFE;
                    npc.aiTimer   = 1.0;
                    npc.strafeDir = Math.random() > 0.5 ? 1 : -1;
                }
                break;
            }

            case AI_SHOOT: {
                // Dispara en burst con micro-dodge lateral — igual que AI_SHOOT del C
                npc.angle = toPlayerAngle;
                npc.burstTimer -= DT;
                if (npc.burstTimer <= 0 && npc.burstCount > 0) {
                    dispararNPC(sala, io, npc, id, toPlayerAngle, 0.10);
                    npc.burstCount--;
                    npc.burstTimer = 0.18;
                }
                // Micro-dodge sinusoidal (igual que el C: dodge = sin(gameTime*8+i)*speed*0.3)
                const dodge = Math.sin(Date.now() * 0.008 + parseInt(id.split('_').pop())) * NPC_SPD * 0.3;
                moveX = Math.cos(toPlayerAngle + Math.PI / 2) * dodge;
                moveY = Math.sin(toPlayerAngle + Math.PI / 2) * dodge;
                break;
            }

            case AI_FLANK: {
                // Flanqueo con POSICIÓN OBJETIVO calculada — igual que AI_FLANK del C
                npc.angle = toPlayerAngle;
                const flankOff    = (npc.squadRole === 1) ? Math.PI / 3 : -Math.PI / 3;
                const targetAngle = toPlayerAngle + flankOff;
                const approachDist = 200.0;
                // Punto objetivo: 200 unidades del jugador, desviado 60°
                const tx = targetX + Math.cos(targetAngle + Math.PI) * approachDist;
                const ty = targetY + Math.sin(targetAngle + Math.PI) * approachDist;
                const toTargetA = Math.atan2(ty - npc.y, tx - npc.x);
                moveX = Math.cos(toTargetA) * NPC_SPD * 1.1;
                moveY = Math.sin(toTargetA) * NPC_SPD * 1.1;
                npc.timerDisparo -= DT;
                if (npc.timerDisparo <= 0 && canSee) {
                    dispararNPC(sala, io, npc, id, toPlayerAngle, 0.15);
                    npc.timerDisparo = 2.0;
                }
                break;
            }

            case AI_PINCER: {
                // Pincer: busca al líder (role 0) y se coloca en el lado OPUESTO al jugador
                // Igual que AI_PINCER del C
                let leaderX = targetX, leaderY = targetY;
                for (const id2 in sala.npcs) {
                    const n2 = sala.npcs[id2];
                    if (!n2.vivo || n2.squadRole !== 0 || id2 === id) continue;
                    const dij = Math.sqrt((n2.x - npc.x)**2 + (n2.y - npc.y)**2);
                    if (dij < 400) { leaderX = n2.x; leaderY = n2.y; break; }
                }
                const leaderAngle  = Math.atan2(leaderY - targetY, leaderX - targetX);
                const pincerAngle  = leaderAngle + Math.PI;
                const ptx = targetX + Math.cos(pincerAngle) * 180;
                const pty = targetY + Math.sin(pincerAngle) * 180;
                const toTA = Math.atan2(pty - npc.y, ptx - npc.x);
                moveX = Math.cos(toTA) * NPC_SPD * 1.2;
                moveY = Math.sin(toTA) * NPC_SPD * 1.2;
                npc.angle = toPlayerAngle;
                npc.timerDisparo -= DT;
                if (npc.timerDisparo <= 0 && canSee) {
                    dispararNPC(sala, io, npc, id, toPlayerAngle, 0.12);
                    npc.timerDisparo = 1.5;
                }
                break;
            }
        }

        // ── Separación entre NPCs (igual que el C: radio 2.5×) ───────────
        for (const id2 in sala.npcs) {
            if (id2 === id) continue;
            const n2 = sala.npcs[id2];
            if (!n2.vivo) continue;
            const dij = Math.sqrt((npc.x - n2.x)**2 + (npc.y - n2.y)**2);
            const sep = NPC_RADIO * 2.5;
            if (dij < sep && dij > 0.1) {
                const pushA = Math.atan2(npc.y - n2.y, npc.x - n2.x);
                const push  = (sep - dij) / sep * NPC_SPD * 0.5;
                moveX += Math.cos(pushA) * push;
                moveY += Math.sin(pushA) * push;
            }
        }

        // ── Movimiento con colisión por ejes independientes + stuckTimer ──
        // Equivalente exacto del FIX v15 del C
        if (moveX !== 0 || moveY !== 0) {
            const nx2 = npc.x + moveX, ny2 = npc.y + moveY;

            if (!colisionNPC(mapa, nx2, ny2, NPC_RADIO)) {
                // Movimiento completo
                npc.x = nx2; npc.y = ny2;
                npc.lastValidX = nx2; npc.lastValidY = ny2;
                npc.stuckTimer = 0;
            } else if (!colisionNPC(mapa, nx2, npc.y, NPC_RADIO)) {
                // Solo eje X
                npc.x = nx2;
                npc.lastValidX = nx2;
                npc.stuckTimer = 0;
            } else if (!colisionNPC(mapa, npc.x, ny2, NPC_RADIO)) {
                // Solo eje Y
                npc.y = ny2;
                npc.lastValidY = ny2;
                npc.stuckTimer = 0;
            } else {
                // Completamente bloqueado — acumular stuckTimer y girar
                npc.stuckTimer += DT;
                if (npc.stuckTimer > 0.5) {
                    npc.angle += 1.2 + Math.random() * 1.8;
                    npc.stuckTimer = 0;
                }
            }

            // Garantía final: si de algún modo está en pared, volver a última posición válida
            if (colisionNPC(mapa, npc.x, npc.y, NPC_RADIO - 2)) {
                npc.x = npc.lastValidX;
                npc.y = npc.lastValidY;
            }
        }

        io.to(sala.id).emit('jugador_movio', { id, x: npc.x, y: npc.y, angle: npc.angle, arma: 0, estado: npc.estado });
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
        // Spawn en el centro exacto del tile garantizado libre
        const spawnPos = encontrarSpawnLibre(mapa, spawn.x, spawn.y);
        const jugadorEnSala = {
            ...entry.jugadorData,
            socketId: entry.socket.id,
            x: spawnPos.x,
            y: spawnPos.y,
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
                x: encontrarSpawnLibre(salaEnCurso.mapa, spawn.x, spawn.y).x, y: encontrarSpawnLibre(salaEnCurso.mapa, spawn.x, spawn.y).y,
                angle: Math.random() * Math.PI * 2,
            };
            salaEnCurso.jugadores.set(socket.id, jugadorEnSala);
            socket.join(salaEnCurso.id);
            socket.data.salaId = salaEnCurso.id;
            // Incluir monedas activas y NPCs en el payload — fix: antes se perdian
            socket.emit('partida_iniciada', {
                salaId: salaEnCurso.id,
                mapa: { tiles: salaEnCurso.mapa.tiles, ancho: salaEnCurso.mapa.ancho, alto: salaEnCurso.mapa.alto },
                tipoMapa: salaEnCurso.tipoMapa,
                jugadores: Object.fromEntries(salaEnCurso.jugadores),
                tuId: socket.id,
                tiempoTotal: TIEMPO_PARTIDA,
                npcs: salaEnCurso.npcs || {},
                monedas: Object.fromEntries(salaEnCurso.monedas)
            });
            // Avisar a los demas del nuevo jugador
            socket.to(salaEnCurso.id).emit('jugador_unido', { id: socket.id, ...jugadorEnSala });
            console.log(`⚔️ ${j.nombre} se unio a sala en curso ${salaEnCurso.id}`);
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

        // Detección de hit — simular trayectoria paso a paso con radio generoso
        // Radio ampliado a 64px para compensar latencia de red
        const HIT_RADIO = 64;
        let balaX = data.x, balaY = data.y;
        const bSpeed = Math.sqrt(data.dx*data.dx + data.dy*data.dy) || 1;
        const bStepX = (data.dx / bSpeed) * 6;   // pasos más pequeños = más precisión
        const bStepY = (data.dy / bSpeed) * 6;
        let hitRegistrado = false;

        for (let paso = 0; paso < 200 && !hitRegistrado; paso++) {
            balaX += bStepX; balaY += bStepY;
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
                            const sp2=encontrarSpawnLibre(sala.mapa,spawn.x,spawn.y); objetivo.x=sp2.x; objetivo.y=sp2.y;
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
