// ─── ENGINE — lógica portada del aztecawarior.c ─────────────────────────────
const ENGINE  = require('./public/js/engine.js');
const PHYSICS = require('./public/js/physics.js');

require('dotenv').config();
const express    = require('express');
const http       = require('http');
const { Server } = require('socket.io');
const path       = require('path');
const { Pool }   = require('pg');
const jwt        = require('jsonwebtoken');

// ─── SEGURIDAD: JWT_SECRET obligatorio ───────────────────────────────────────
const JWT_SECRET = process.env.JWT_SECRET || (() => {
    if (process.env.NODE_ENV === 'production') {
        console.error('❌ FATAL: JWT_SECRET no definido en producción. Agrega la variable en Railway.');
        process.exit(1);
    }
    console.warn('⚠️  JWT_SECRET no definido, usando valor de desarrollo. NO uses esto en producción.');
    return 'aztec_dev_secret_cambiame';
})();

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
const salas = new Map();
let colaEspera = [];

const JUGADORES_POR_SALA = 8;

// ─── RATE LIMITING por socket ─────────────────────────────────────────────────
function crearRateLimiter(maxEventos, ventanaMs) {
    const contadores = new Map();
    setInterval(() => contadores.clear(), ventanaMs);
    return function(socketId) {
        const n = (contadores.get(socketId) || 0) + 1;
        contadores.set(socketId, n);
        return n <= maxEventos;
    };
}
const rlDisparar = crearRateLimiter(20, 1000);
const rlMover    = crearRateLimiter(30, 1000);
const rlChat     = crearRateLimiter(4,  3000);
const rlPickup   = crearRateLimiter(15, 1000);

// ─── VALIDACIÓN DE MOVIMIENTO (anti-teleport básico) ─────────────────────────
// PLAYER_SPD=3.8 por frame, enviamos cada ~50ms = ~2 frames → max ~10px
// Margen de 8x para lag y lag-spike
const MAX_MOVE_POR_TICK = 3.8 * 8;

function validarMovimiento(jugadorActual, dataNueva) {
    if (!jugadorActual || jugadorActual.x === undefined) return true;
    const dx = dataNueva.x - jugadorActual.x;
    const dy = dataNueva.y - jugadorActual.y;
    return Math.sqrt(dx*dx + dy*dy) <= MAX_MOVE_POR_TICK * 4;
}

// ─── SPAWN SEGURO ────────────────────────────────────────────────────────────
// Recibe coordenadas de TILE, devuelve coordenadas en PÍXELES
function encontrarSpawnLibre(mapa, tileX, tileY) {
    for (let r = 0; r <= 5; r++) {
        for (let dy = -r; dy <= r; dy++) {
            for (let dx = -r; dx <= r; dx++) {
                if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
                const tx = tileX + dx, ty = tileY + dy;
                if (tx < 1 || ty < 1 || tx >= mapa.ancho - 1 || ty >= mapa.alto - 1) continue;
                if (mapa.tiles[ty][tx] === 0) return { x: tx * 64 + 32, y: ty * 64 + 32 };
            }
        }
    }
    for (let ty = 1; ty < mapa.alto - 1; ty++) {
        for (let tx = 1; tx < mapa.ancho - 1; tx++) {
            if (mapa.tiles[ty][tx] === 0) return { x: tx * 64 + 32, y: ty * 64 + 32 };
        }
    }
    return { x: 64 + 32, y: 64 + 32 };
}

// ─── MATCHMAKING ─────────────────────────────────────────────────────────────

function intentarCrearSala() {
    if (colaEspera.length < 1) return;

    const grupo   = colaEspera.splice(0, Math.min(JUGADORES_POR_SALA, colaEspera.length));
    const salaId  = 'sala_' + Date.now();
    const engineEstado = ENGINE.crearEstadoSala();

    grupo.forEach(entry => {
        const jData  = entry.jugadorData;
        const player = ENGINE.crearJugador(entry.socket.id, jData.nombre, jData.skin || 'guerrero_base', jData.nivel || 1);
        player.dbId  = jData.dbId;
        engineEstado.players.set(entry.socket.id, player);
    });

    ENGINE.cargarNivel(engineEstado, 1);

    // Callbacks engine → sockets
    engineEstado.onBala = (bala) => io.to(salaId).emit('bala_creada', bala);

    engineEstado.onDanioJugador = (id, hp, fromId, danio) => {
        const p = engineEstado.players.get(id);
        if (p && hp <= 0 && p.vivo) {
            p.vivo = false; p.muertes++;
            io.to(salaId).emit('jugador_murio', { id, matadoPor: fromId,
                kills: engineEstado.players.get(fromId)?.kills || 0, muertes: p.muertes });
            setTimeout(() => {
                if (!salas.has(salaId)) return;
                const spawn = engineEstado.mapa.spawns[Math.floor(Math.random()*engineEstado.mapa.spawns.length)];
                // spawns están en coords de tile; spawnSeguro devuelve píxeles
                const pos = ENGINE.spawnSeguro(engineEstado.mapa, spawn.x, spawn.y);
                p.x=pos.x; p.y=pos.y; p.hp=p.maxHp; p.vivo=true;
                io.to(salaId).emit('jugador_respawn', { id, x:p.x, y:p.y, hp:p.hp });
            }, 5000);
        } else {
            io.to(salaId).emit('jugador_recibio_danio', { id, hp, fromId, danio });
        }
    };

    engineEstado.onMuerteJugador = (id, matadoPor, kills, muertes) =>
        io.to(salaId).emit('jugador_murio', { id, matadoPor, kills, muertes });

    engineEstado.onMonedaRecogida = (monedaId, jugadorId, total) =>
        io.to(salaId).emit('moneda_recogida', { monedaId, porId: jugadorId, monedas: total });

    engineEstado.onSpawnPickup = (tipo, data) =>
        io.to(salaId).emit('pickup_spawned', { tipo, data });

    engineEstado.onDanioNPC = (npcId, hp) =>
        io.to(salaId).emit('jugador_recibio_danio', { id: npcId, hp, fromId: null, danio: 0 });

    engineEstado.onMuerteNPC = (npcId, matadorId, kills) =>
        io.to(salaId).emit('jugador_murio', { id: npcId, matadoPor: matadorId, kills, muertes: 0 });

    engineEstado.onBossUpdate = (bossData) => io.to(salaId).emit('boss_update', bossData);
    engineEstado.onBossMuerto = () => io.to(salaId).emit('boss_muerto');

    engineEstado.onNivelTransicion = (nivelActual, nivelSiguiente) => {
        if (nivelSiguiente > 3) { terminarPartida(salaId, 'victoria'); return; }
        io.to(salaId).emit('nivel_transicion', { nivelActual, nivelSiguiente });
        setTimeout(() => {
            if (!salas.has(salaId)) return;
            ENGINE.cargarNivel(engineEstado, nivelSiguiente);
            const jugadoresObj = {}; for (const [s,p] of engineEstado.players) jugadoresObj[s]=p;
            const npcsObj = {}; for (const e of engineEstado.enemies) npcsObj[e.id]={...e,esNPC:true,skin:'conquistador',nombre:e.id};
            const monedasObj = {}; engineEstado.coins.forEach(c=>monedasObj[c.id]=c);
            const corazonesObj = {}; engineEstado.hearts.forEach(h=>corazonesObj[h.id]=h);
            const ammoObj = {}; engineEstado.ammoDrops.forEach(a=>ammoObj[a.id]=a);
            io.to(salaId).emit('nivel_cargado', {
                nivel: nivelSiguiente,
                mapa: { tiles:engineEstado.mapa.tiles, ancho:engineEstado.mapa.ancho, alto:engineEstado.mapa.alto },
                jugadores: jugadoresObj, npcs: npcsObj,
                monedas: monedasObj, corazones: corazonesObj, ammoDrops: ammoObj,
            });
        }, 4000);
    };

    engineEstado.onVictoria = () => terminarPartida(salaId, 'victoria');

    const sala = {
        id: salaId, engine: engineEstado,
        mapa: engineEstado.mapa, tipoMapa: 'templo_1',
        estado: 'jugando', jugadores: engineEstado.players,
        timerInterval: null, engineInterval: null,
    };

    // Enviar estado inicial a cada jugador del grupo
    grupo.forEach(entry => {
        entry.socket.join(salaId);
        entry.socket.data.salaId = salaId;
        const jugadoresObj = {}; for (const [s,p] of engineEstado.players) jugadoresObj[s]={...p};
        const npcsObj = {}; for (const e of engineEstado.enemies) npcsObj[e.id]={...e,esNPC:true,skin:'conquistador',nombre:e.id};
        const monedasObj = {}; engineEstado.coins.forEach(c=>monedasObj[c.id]=c);
        const corazonesObj = {}; engineEstado.hearts.forEach(h=>corazonesObj[h.id]=h);
        const ammoObj = {}; engineEstado.ammoDrops.forEach(a=>ammoObj[a.id]=a);
        entry.socket.emit('partida_iniciada', {
            salaId, mapa:{tiles:engineEstado.mapa.tiles,ancho:engineEstado.mapa.ancho,alto:engineEstado.mapa.alto},
            tipoMapa:'templo_1', jugadores:jugadoresObj, tuId:entry.socket.id,
            tiempoTotal:0, nivel:1, npcs:npcsObj,
            monedas:monedasObj, corazones:corazonesObj, ammoDrops:ammoObj,
        });
    });

    salas.set(salaId, sala);
    console.log(`🏛️  Sala ${salaId} — ${grupo.length} jugadores, nivel 1`);

    sala.engineInterval = setInterval(() => {
        if (!salas.has(salaId)) { clearInterval(sala.engineInterval); return; }
        ENGINE.tick(engineEstado, 0.1);
        for (const e of engineEstado.enemies) {
            if (!e.active) continue;
            io.to(salaId).emit('jugador_movio', { id:e.id, x:e.x, y:e.y, angle:e.angle, arma:0, estado:e.estado });
        }
        io.to(salaId).emit('tick_timer', { playTimer:engineEstado.playTimer, nivel:engineEstado.level });
    }, 100);
}

async function terminarPartida(salaId, razon) {
    const sala = salas.get(salaId);
    if (!sala || sala.estado === 'terminada') return;
    sala.estado = 'terminada';
    clearInterval(sala.timerInterval);
    if (sala.engineInterval) clearInterval(sala.engineInterval);

    const jugadoresFuente = sala.engine
        ? [...sala.engine.players.values()]
        : Array.from(sala.jugadores.values());
    const resultados = jugadoresFuente
        .sort((a,b) => b.kills - a.kills || a.muertes - b.muertes)
        .map((j,i) => ({ ...j, posicion:i+1, tiempo:sala.engine?.playTimer||0 }));

    io.to(salaId).emit('partida_terminada', { razon, resultados });

    try {
        const partidaId = require('uuid').v4();
        const duracion = Math.floor(sala.engine?.playTimer || 0); // FIX: usar playTimer real
        await pool.query(
            `INSERT INTO partidas (id,mapa,estado,duracion_segundos,terminada_en) VALUES ($1,$2,'terminada',$3,NOW())`,
            [partidaId, sala.tipoMapa, duracion]
        );
        for (const j of resultados) {
            if (!j.dbId) continue;
            const xp = Math.max(10, j.kills*25 - j.muertes*5 + (j.posicion===1?100:0));
            await pool.query(
                `INSERT INTO partida_jugadores (partida_id,jugador_id,kills,muertes,monedas_ganadas,experiencia_ganada,posicion_final)
                 VALUES ($1,$2,$3,$4,$5,$6,$7)`,
                [partidaId,j.dbId,j.kills,j.muertes,j.gold||0,xp,j.posicion]
            );
            await pool.query(
                `UPDATE jugadores SET
                    kills_total=kills_total+$1, muertes_total=muertes_total+$2,
                    monedas=monedas+$3, experiencia=experiencia+$4,
                    partidas_jugadas=partidas_jugadas+1, partidas_ganadas=partidas_ganadas+$5,
                    nivel=GREATEST(nivel,FLOOR(SQRT((experiencia+$4)/100))::int+1)
                 WHERE id=$6`,
                [j.kills,j.muertes,j.gold||0,xp,j.posicion===1?1:0,j.dbId]
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
        const payload = jwt.verify(token, JWT_SECRET);
        socket.data.jugador = payload;
        next();
    } catch { next(new Error('Token inválido')); }
});

io.on('connection', (socket) => {
    const j = socket.data.jugador;
    console.log(`🟢 Conectado: ${j.nombre} (${socket.id})`);

    socket.on('buscar_partida', async (skinData) => {
        if (colaEspera.find(e => e.socket.id === socket.id)) return;
        const jugadorData = {
            nombre: j.nombre, dbId: j.id,
            skin: skinData?.skin || j.skin_activa || 'guerrero_base',
            nivel: j.nivel || 1,
            kills:0, muertes:0, monedas:0, hp:100, maxHp:100, vivo:true,
        };

        // Buscar sala en curso con espacio — permite unirse a partidas en progreso
        let salaEnCurso = null;
        for (const [, sala] of salas) {
            if (sala.estado === 'jugando' && sala.jugadores.size < JUGADORES_POR_SALA) {
                salaEnCurso = sala; break;
            }
        }

        if (salaEnCurso) {
            // FIX SYNC-1/2: usar encontrarSpawnLibre correctamente (coords de tile)
            const spawns = salaEnCurso.mapa.spawns;
            const spawnTile = spawns[Math.floor(Math.random() * spawns.length)];
            const spawnPos = encontrarSpawnLibre(salaEnCurso.mapa, spawnTile.x, spawnTile.y);

            const newPlayer = ENGINE.crearJugador(socket.id, jugadorData.nombre, jugadorData.skin, jugadorData.nivel);
            newPlayer.dbId = jugadorData.dbId;
            newPlayer.x = spawnPos.x;
            newPlayer.y = spawnPos.y;
            newPlayer.angle = Math.random() * Math.PI * 2;
            salaEnCurso.engine.players.set(socket.id, newPlayer);

            socket.join(salaEnCurso.id);
            socket.data.salaId = salaEnCurso.id;

            const jugadoresObj={}; for (const [s,p] of salaEnCurso.engine.players) jugadoresObj[s]={...p};
            const npcsObj={}; for (const e of salaEnCurso.engine.enemies) npcsObj[e.id]={...e,esNPC:true,skin:'conquistador',nombre:e.id};
            const monedasObj={}; salaEnCurso.engine.coins.forEach(c=>monedasObj[c.id]=c);
            const corazonesObj={}; salaEnCurso.engine.hearts.forEach(h=>corazonesObj[h.id]=h);
            const ammoObj={}; salaEnCurso.engine.ammoDrops.forEach(a=>ammoObj[a.id]=a);

            socket.emit('partida_iniciada', {
                salaId:salaEnCurso.id,
                mapa:{tiles:salaEnCurso.mapa.tiles,ancho:salaEnCurso.mapa.ancho,alto:salaEnCurso.mapa.alto},
                tipoMapa:salaEnCurso.tipoMapa,
                jugadores:jugadoresObj, tuId:socket.id,
                tiempoTotal:0, nivel:salaEnCurso.engine.level,
                npcs:npcsObj, monedas:monedasObj, corazones:corazonesObj, ammoDrops:ammoObj,
            });
            socket.to(salaEnCurso.id).emit('jugador_unido', { id:socket.id, ...newPlayer });
            console.log(`⚔️ ${j.nombre} se unió a sala en curso ${salaEnCurso.id}`);
            return;
        }

        colaEspera.push({ socket, jugadorData });
        socket.emit('en_cola', { posicion: colaEspera.length });
        io.emit('cola_actualizada', { enCola: colaEspera.length });
        console.log(`⏳ Cola: ${colaEspera.length} jugadores`);

        if (colaEspera.length >= JUGADORES_POR_SALA) {
            intentarCrearSala();
        } else {
            setTimeout(() => { if (colaEspera.length >= 1) intentarCrearSala(); }, 30000);
        }
    });

    socket.on('reconectar_sala', ({ salaId, socketIdAnterior }) => {
        if (!salaId) return;
        const sala = salas.get(salaId);
        if (!sala) return;

        const jugadorAnterior = sala.jugadores.get(socketIdAnterior);
        if (jugadorAnterior) {
            sala.jugadores.delete(socketIdAnterior);
            jugadorAnterior.socketId = socket.id;
            sala.jugadores.set(socket.id, jugadorAnterior);
            if (sala.engine) {
                const ep = sala.engine.players.get(socketIdAnterior);
                if (ep) { sala.engine.players.delete(socketIdAnterior); sala.engine.players.set(socket.id, ep); }
            }
            jugadorAnterior._desconectando = false;
        }

        socket.join(salaId);
        socket.data.salaId = salaId;

        const jugadoresObj={}; for (const [s,p] of sala.jugadores) jugadoresObj[s]={...p};
        socket.emit('sync_estado', { jugadores:jugadoresObj, tuId:socket.id, npcs:{} });
        socket.to(salaId).emit('jugador_cambio_id', { idAnterior:socketIdAnterior, idNuevo:socket.id, jugador:jugadorAnterior||{} });
        for (const [s,p] of sala.jugadores) io.to(salaId).emit('jugador_movio', PHYSICS.snapshotJugador(p,s));
    });

    socket.on('cancelar_busqueda', () => {
        colaEspera = colaEspera.filter(e => e.socket.id !== socket.id);
        io.emit('cola_actualizada', { enCola: colaEspera.length });
    });

    // Movimiento con validación anti-teleport
    socket.on('mover', (data) => {
        if (!rlMover(socket.id)) return;
        const salaId = socket.data.salaId;
        if (!salaId) return;
        const sala = salas.get(salaId);
        if (!sala) return;
        const jugador = sala.jugadores.get(socket.id);
        if (!jugador || !jugador.vivo) return;

        // FIX CVE-1: rechazar movimientos sospechosamente largos
        if (!validarMovimiento(jugador, data)) return;

        jugador.x=data.x; jugador.y=data.y; jugador.angle=data.angle;
        if (data.z !== undefined) jugador.z=data.z;
        if (sala.engine) {
            const ep = sala.engine.players.get(socket.id);
            if (ep) { ep.x=data.x; ep.y=data.y; ep.angle=data.angle; ep.z=data.z||0; }
        }
        io.to(salaId).emit('jugador_movio', PHYSICS.snapshotJugador(jugador, socket.id));
    });

    // Disparo con rate limit — FIX CVE-4: NO sincronizar posición desde cliente
    socket.on('disparar', (data) => {
        if (!rlDisparar(socket.id)) return;
        const salaId = socket.data.salaId;
        const sala   = salas.get(salaId);
        if (!sala?.engine) return;
        const player = sala.engine.players.get(socket.id);
        if (!player?.vivo) return;
        // NO sobreescribir player.x/player.y desde data — posición la mantiene el servidor
        ENGINE.jugadorDispara(sala.engine, socket.id, data.angle ?? Math.atan2(data.dy, data.dx));
    });

    // Recoger moneda con validación de proximidad — FIX CVE-2
    socket.on('recoger_moneda', (monedaId) => {
        if (!rlPickup(socket.id)) return;
        const sala = salas.get(socket.data.salaId);
        if (!sala?.engine) return;
        const eng=sala.engine, idx=eng.coins.findIndex(c=>c.id===monedaId);
        if (idx===-1) return;
        const moneda=eng.coins[idx], player=eng.players.get(socket.id);
        if (!player) return;
        const dx=moneda.x-player.x, dy=moneda.y-player.y;
        if (Math.sqrt(dx*dx+dy*dy)>96) return; // fuera de rango
        player.gold+=moneda.valor;
        eng.coins.splice(idx,1);
        io.to(socket.data.salaId).emit('moneda_recogida',{monedaId,porId:socket.id,monedas:player.gold});
    });

    // Recoger corazón con validación de proximidad
    socket.on('recoger_corazon', (id) => {
        if (!rlPickup(socket.id)) return;
        const sala = salas.get(socket.data.salaId);
        if (!sala?.engine) return;
        const eng=sala.engine, idx=eng.hearts.findIndex(h=>h.id===id);
        if (idx===-1) return;
        const heart=eng.hearts[idx], player=eng.players.get(socket.id);
        if (!player) return;
        const dx=heart.x-player.x, dy=heart.y-player.y;
        if (Math.sqrt(dx*dx+dy*dy)>96) return;
        player.hp=Math.min(player.maxHp,player.hp+heart.heal);
        eng.hearts.splice(idx,1);
        io.to(socket.data.salaId).emit('corazon_recogido',{id,porId:socket.id,hp:player.hp});
    });

    // Recoger ammo con validación de proximidad
    socket.on('recoger_ammo', (id) => {
        if (!rlPickup(socket.id)) return;
        const sala = salas.get(socket.data.salaId);
        if (!sala?.engine) return;
        const eng=sala.engine, idx=eng.ammoDrops.findIndex(a=>a.id===id);
        if (idx===-1) return;
        const drop=eng.ammoDrops[idx], player=eng.players.get(socket.id);
        if (!player) return;
        const dx=drop.x-player.x, dy=drop.y-player.y;
        if (Math.sqrt(dx*dx+dy*dy)>96) return;
        player.ammo=Math.min(999,player.ammo+drop.amount);
        eng.ammoDrops.splice(idx,1);
        io.to(socket.data.salaId).emit('ammo_recogido',{id,porId:socket.id,ammo:player.ammo});
    });

    socket.on('chat', (msg) => {
        if (!rlChat(socket.id)) return;
        const salaId = socket.data.salaId;
        if (!salaId) return;
        io.to(salaId).emit('chat_msg',{nombre:j.nombre,msg:String(msg).slice(0,100),ts:Date.now()});
    });

    socket.on('disconnect', () => {
        console.log(`🔴 Desconectado: ${j.nombre}`);
        colaEspera = colaEspera.filter(e => e.socket.id !== socket.id);
        const salaId = socket.data.salaId;
        if (!salaId) return;
        const sala = salas.get(salaId);
        if (!sala) return;
        const jug = sala.jugadores.get(socket.id);
        if (jug) jug._desconectando = true;
        io.to(salaId).emit('jugador_salio', { id: socket.id });

        setTimeout(() => {
            const salaActual = salas.get(salaId);
            if (!salaActual) return;
            // FIX SYNC-4: recolectar IDs primero, borrar después
            const aEliminar = [];
            for (const [sid, p] of salaActual.jugadores) {
                if (p._desconectando) aEliminar.push(sid);
            }
            for (const sid of aEliminar) {
                salaActual.jugadores.delete(sid);
                if (salaActual.engine) {
                    const ep = salaActual.engine.players.get(sid);
                    if (ep) {
                        ep.vivo = false;
                        setTimeout(() => { if (salaActual.engine) salaActual.engine.players.delete(sid); }, 500);
                    }
                }
            }
            if (salaActual.jugadores.size < 1) terminarPartida(salaId, 'abandono');
        }, 15000);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🏛️  Aztec War server en puerto ${PORT}`));
