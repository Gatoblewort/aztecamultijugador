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
    // Retorna una matriz de tiles compatible con el raycaster del cliente
    // 0=vacío, 1=piedra, 2=pirámide, 3=jade, 4=oro, 5=puerta, 6=oscuro, 7=lava
    if (tipo === 'templo_1') {
        const W = 24, H = 24;
        const m = Array.from({ length: H }, () => Array(W).fill(2));
        // Pasillos horizontales
        [3,7,11,15,19].forEach(r => { for(let x=1;x<W-1;x++) m[r][x]=0; });
        // Pasillos verticales
        [3,7,11,15,19].forEach(c => { for(let y=1;y<H-1;y++) m[y][c]=0; });
        // Sala central
        for(let y=9;y<15;y++) for(let x=9;x<15;x++) m[y][x]=0;
        // Paredes doradas sala central
        for(let x=9;x<15;x++) { m[9][x]=4; m[14][x]=4; }
        for(let y=9;y<15;y++) { m[y][9]=4; m[y][14]=4; }
        m[9][11]=0; m[9][12]=0; m[14][11]=0; m[14][12]=0;
        m[11][9]=0; m[12][9]=0; m[11][14]=0; m[12][14]=0;
        // Jade en esquinas
        m[5][5]=3; m[5][18]=3; m[18][5]=3; m[18][18]=3;
        // Puertas
        m[3][11]=5; m[11][3]=5; m[15][11]=5;
        // Variedad aleatoria
        for(let i=0;i<20;i++){
            const rx=1+Math.floor(Math.random()*(W-2));
            const ry=1+Math.floor(Math.random()*(H-2));
            if(m[ry][rx]===2) m[ry][rx]=1;
        }
        return { tiles: m, ancho: W, alto: H,
                 spawns: [{x:3.5,y:3.5},{x:20.5,y:3.5},{x:3.5,y:20.5},{x:20.5,y:20.5},
                           {x:11.5,y:3.5},{x:3.5,y:11.5},{x:20.5,y:11.5},{x:11.5,y:20.5}] };
    }
    if (tipo === 'catacumba_2') {
        const W = 36, H = 36;
        const m = Array.from({ length: H }, () => Array(W).fill(6));
        [2,5,9,13,17,21,25,29,33].forEach(r => { for(let x=1;x<W-1;x++) m[r][x]=0; });
        [2,5,9,13,17,21,25,29,33].forEach(c => { for(let y=1;y<H-1;y++) m[y][c]=0; });
        [[3,3,6,6],[3,27,6,6],[27,3,6,6],[27,27,6,6]].forEach(([ox,oy,w,h])=>{
            for(let y=oy;y<oy+h;y++) for(let x=ox;x<ox+w;x++) m[y][x]=0;
        });
        for(let y=15;y<21;y++) for(let x=15;x<21;x++){
            if(y===15||x===15||x===20) m[y][x]=7; else m[y][x]=0;
        }
        m[9][9]=3; m[9][26]=3; m[26][9]=3; m[26][26]=3;
        m[5][17]=5; m[17][5]=5; m[29][17]=5; m[17][29]=5;
        for(let i=0;i<40;i++){
            const rx=1+Math.floor(Math.random()*(W-2));
            const ry=1+Math.floor(Math.random()*(H-2));
            if(m[ry][rx]===6) m[ry][rx]= Math.random()<0.3?7:1;
        }
        return { tiles: m, ancho: W, alto: H,
                 spawns: [{x:4,y:4},{x:32,y:4},{x:4,y:32},{x:32,y:32},
                           {x:18,y:4},{x:4,y:18},{x:32,y:18},{x:18,y:32}] };
    }
    // templo_3 por defecto
    const W = 32, H = 32;
    const m = Array.from({ length: H }, () => Array(W).fill(2));
    [3,7,11,15,19,23,27].forEach(r => { for(let x=1;x<W-1;x++) m[r][x]=0; });
    [3,7,11,15,19,23,27].forEach(c => { for(let y=1;y<H-1;y++) m[y][c]=0; });
    for(let y=13;y<19;y++) for(let x=13;x<19;x++) m[y][x]=0;
    for(let x=13;x<19;x++){m[13][x]=4;m[18][x]=4;}
    for(let y=13;y<19;y++){m[y][13]=4;m[y][18]=4;}
    m[13][15]=0;m[13][16]=0;m[18][15]=0;m[18][16]=0;
    m[15][13]=0;m[16][13]=0;m[15][18]=0;m[16][18]=0;
    [[3,3],[3,14],[3,25],[14,3],[25,3],[25,14],[25,25],[14,25]].forEach(([x,y])=>{m[y][x]=3;});
    [[7,7],[7,21],[21,7],[21,21]].forEach(([x,y])=>{m[y][x]=7;});
    for(let i=0;i<30;i++){
        const rx=1+Math.floor(Math.random()*(W-2));
        const ry=1+Math.floor(Math.random()*(H-2));
        if(m[ry][rx]===2) m[ry][rx]=1;
    }
    return { tiles: m, ancho: W, alto: H,
             spawns: [{x:3.5,y:3.5},{x:28.5,y:3.5},{x:3.5,y:28.5},{x:28.5,y:28.5},
                       {x:15.5,y:3.5},{x:3.5,y:15.5},{x:28.5,y:15.5},{x:15.5,y:28.5}] };
}

// ─── MATCHMAKING ─────────────────────────────────────────────────────────────
function generarNPCs(mapa, cantidad, salaId) {
    const nombres = ['Tlacaelel','Itzcoatl','Cuauhtémoc','Moctezuma','Tezozomoc','Ahuitzotl','Chimalli','Xochitl'];
    const skins   = ['jaguar','aguila','sacerdote','guerrero_base'];
    const npcs    = {};
    for (let i = 0; i < cantidad; i++) {
        const spawn = mapa.spawns[(i + 1) % mapa.spawns.length];
        const id    = `npc_${salaId}_${i}`;
        npcs[id] = {
            id, esNPC: true,
            nombre: nombres[i % nombres.length],
            skin: skins[i % skins.length],
            x: (spawn.x + (Math.random()-0.5)) * 64,
            y: (spawn.y + (Math.random()-0.5)) * 64,
            angle: Math.random() * Math.PI * 2,
            hp: 100, maxHp: 100, vivo: true,
            arma: 0, kills: 0, muertes: 0, monedas: 0,
            // IA
            estado: 'patrullar',
            velX: 0, velY: 0,
            timerCambio: 0,
            timerDisparo: 2 + Math.random() * 2
        };
    }
    return npcs;
}

function actualizarNPCs(sala, io) {
    if (!sala.npcs || Object.keys(sala.npcs).length === 0) return;
    const mapa = sala.mapa;

    for (const id in sala.npcs) {
        const npc = sala.npcs[id];
        if (!npc.vivo) continue;

        // Encontrar jugador humano más cercano
        let targetX = null, targetY = null, minDist = 999999;
        for (const [sid, jug] of sala.jugadores) {
            if (!jug.vivo) continue;
            const dx = jug.x - npc.x, dy = jug.y - npc.y;
            const d = Math.sqrt(dx*dx + dy*dy);
            if (d < minDist) { minDist = d; targetX = jug.x; targetY = jug.y; }
        }

        npc.timerCambio -= 0.1;
        npc.timerDisparo -= 0.1;

        if (targetX !== null && minDist < 400) {
            // Perseguir jugador
            const dx = targetX - npc.x, dy = targetY - npc.y;
            const d  = Math.sqrt(dx*dx + dy*dy) || 1;
            npc.angle = Math.atan2(dy, dx);
            const spd = 2.2;
            const nx  = npc.x + (dx/d)*spd;
            const ny  = npc.y + (dy/d)*spd;
            // Colisión simple
            const tx = Math.floor(nx/64), ty = Math.floor(ny/64);
            if (ty >= 0 && ty < mapa.alto && tx >= 0 && tx < mapa.ancho && mapa.tiles[ty][tx] === 0) {
                npc.x = nx; npc.y = ny;
            }
            // Disparar si está cerca
            if (npc.timerDisparo <= 0 && minDist < 300) {
                npc.timerDisparo = 1.5 + Math.random() * 1.5;
                const spread = (Math.random() - 0.5) * 0.3;
                io.to(sala.id).emit('bala_creada', {
                    id: `nb_${id}_${Date.now()}`,
                    x: npc.x, y: npc.y,
                    dx: Math.cos(npc.angle + spread) * 10,
                    dy: Math.sin(npc.angle + spread) * 10,
                    fromId: id, fromNPC: true,
                    danio: 10, vida: 2.5
                });
                // Verificar hit en jugadores
                for (const [sid, jug] of sala.jugadores) {
                    if (!jug.vivo) continue;
                    const ddx = jug.x - npc.x, ddy = jug.y - npc.y;
                    if (Math.sqrt(ddx*ddx + ddy*ddy) < 35) {
                        jug.hp -= 10;
                        io.to(sala.id).emit('jugador_recibio_danio', { id: sid, hp: jug.hp, fromId: id, danio: 10 });
                        if (jug.hp <= 0) {
                            jug.vivo = false; jug.muertes++;
                            npc.kills++;
                            io.to(sala.id).emit('jugador_murio', { id: sid, matadoPor: id, kills: npc.kills, muertes: jug.muertes });
                            setTimeout(() => {
                                if (!salas.has(sala.id)) return;
                                const spawn = sala.mapa.spawns[Math.floor(Math.random() * sala.mapa.spawns.length)];
                                jug.x = spawn.x * 64; jug.y = spawn.y * 64;
                                jug.hp = jug.maxHp; jug.vivo = true;
                                io.to(sala.id).emit('jugador_respawn', { id: sid, x: jug.x, y: jug.y, hp: jug.hp });
                            }, 5000);
                        }
                    }
                }
            }
        } else {
            // Patrullar
            if (npc.timerCambio <= 0) {
                npc.angle = Math.random() * Math.PI * 2;
                npc.timerCambio = 2 + Math.random() * 3;
            }
            const nx = npc.x + Math.cos(npc.angle) * 1.5;
            const ny = npc.y + Math.sin(npc.angle) * 1.5;
            const tx = Math.floor(nx/64), ty = Math.floor(ny/64);
            if (ty >= 0 && ty < mapa.alto && tx >= 0 && tx < mapa.ancho && mapa.tiles[ty][tx] === 0) {
                npc.x = nx; npc.y = ny;
            } else {
                npc.angle += Math.PI / 2;
            }
        }

        // Broadcast posición NPC
        io.to(sala.id).emit('jugador_movio', {
            id, x: npc.x, y: npc.y, angle: npc.angle, arma: 0
        });
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
            tiempoTotal: TIEMPO_PARTIDA
        });
    });

    salas.set(salaId, sala);
    console.log(`🏛️  Sala ${salaId} creada con ${grupo.length} jugadores — mapa: ${tipoMapa}`);

    // Generar NPCs si hay pocos jugadores humanos
    const numNPCs = Math.max(0, NPCS_BASE - (grupo.length - 1));
    if (numNPCs > 0) {
        sala.npcs = generarNPCs(mapa, numNPCs, salaId);
        // Notificar a todos los jugadores de los NPCs
        const npcData = {};
        for (const id in sala.npcs) npcData[id] = sala.npcs[id];
        io.to(salaId).emit('npcs_spawned', npcData);
        console.log(`🤖 ${numNPCs} NPCs generados para sala ${salaId}`);
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
        colaEspera.push({ socket, jugadorData });
        socket.emit('en_cola', { posicion: colaEspera.length });
        io.emit('cola_actualizada', { enCola: colaEspera.length });
        console.log(`⏳ Cola: ${colaEspera.length} jugadores`);
        // Si hay 2+ jugadores arranca de inmediato, si hay 1 espera 3s
        if (colaEspera.length >= 2) {
            intentarCrearSala();
        } else {
            setTimeout(() => {
                if (colaEspera.length >= 1) intentarCrearSala();
            }, 3000);
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

        // Detección de hit en servidor
        for (const [sid, objetivo] of sala.jugadores) {
            if (sid === socket.id || !objetivo.vivo) continue;
            const dx = objetivo.x - data.x;
            const dy = objetivo.y - data.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            if (dist < 30) {
                objetivo.hp -= bala.danio;
                sala.balas.delete(balaId);
                io.to(salaId).emit('jugador_recibio_danio', {
                    id: sid, hp: objetivo.hp,
                    fromId: socket.id, danio: bala.danio
                });
                if (objetivo.hp <= 0) {
                    objetivo.vivo = false;
                    objetivo.muertes++;
                    tirador.kills++;
                    tirador.monedas += 50;
                    io.to(salaId).emit('jugador_murio', {
                        id: sid,
                        matadoPor: socket.id,
                        kills: tirador.kills,
                        muertes: objetivo.muertes
                    });
                    // Respawn en 5 segundos
                    setTimeout(() => {
                        if (!salas.has(salaId)) return;
                        const spawn = sala.mapa.spawns[Math.floor(Math.random()*sala.mapa.spawns.length)];
                        objetivo.x = spawn.x * 64;
                        objetivo.y = spawn.y * 64;
                        objetivo.hp = objetivo.maxHp;
                        objetivo.vivo = true;
                        io.to(salaId).emit('jugador_respawn', {
                            id: sid, x: objetivo.x, y: objetivo.y,
                            hp: objetivo.hp
                        });
                    }, 5000);
                    // Verificar si queda 1 jugador
                    const vivos = Array.from(sala.jugadores.values()).filter(j2 => j2.vivo).length;
                    if (vivos <= 1) terminarPartida(salaId, 'eliminacion');
                }
                break;
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
