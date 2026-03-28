// ═══════════════════════════════════════════════════════════════════════════
//  AZTEC WAR — PHYSICS.JS  v1.0
//  Módulo compartido: corre igual en Node.js (server.js) y en el navegador
//  Maneja:
//    • Colisión AABB con paredes (jugadores, NPCs, balas)
//    • Sistema cardinal N/S/E/O + ángulo
//    • Física de salto (gravedad, impulso, aterrizaje)
//    • Separación entre entidades (anti-overlap)
//    • Lag compensation / predicción cliente
// ═══════════════════════════════════════════════════════════════════════════

const PHYSICS = (() => {

// ── Constantes ────────────────────────────────────────────────────────────
const TILE          = 64;
const PLAYER_RADIUS = 16;   // AABB radio jugador
const ENEMY_RADIUS  = 20;   // AABB radio NPC
const BULLET_RADIUS = 4;

// Salto
const JUMP_VELOCITY = 7.0;  // impulso inicial hacia arriba
const GRAVITY       = 18.0; // aceleración gravitacional (unidades/s²)
const JUMP_HEIGHT   = 96;   // altura máxima visual en píxeles
const FLOOR_Z       = 0;    // Z del suelo

// Lag compensation
const INTERP_DELAY  = 100;  // ms de delay para interpolación
const MAX_SNAPSHOTS = 20;   // snapshots guardados por entidad

// ── Sistema Cardinal ──────────────────────────────────────────────────────
// Convierte un ángulo (radianes) al cardinal más cercano
function angleToCardinal(angle) {
    // Normalizar a [0, 2π)
    let a = angle % (Math.PI * 2);
    if (a < 0) a += Math.PI * 2;

    // N=arriba(270°), E=derecha(0°), S=abajo(90°), O=izquierda(180°)
    if (a < Math.PI * 0.25 || a >= Math.PI * 1.75) return 'E';
    if (a < Math.PI * 0.75) return 'S';
    if (a < Math.PI * 1.25) return 'O';
    return 'N';
}

// Retorna el ángulo en grados (0-360) desde el norte, sentido horario
function angleToDegrees(angle) {
    let deg = (angle * 180 / Math.PI + 90) % 360;
    if (deg < 0) deg += 360;
    return Math.round(deg);
}

// Ángulo entre dos puntos (radianes)
function angleBetween(x1, y1, x2, y2) {
    return Math.atan2(y2 - y1, x2 - x1);
}

// Distancia entre dos puntos
function dist(x1, y1, x2, y2) {
    const dx = x2 - x1, dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
}

// Desplazamiento cardinal → vector
// cardinal: 'N'|'S'|'E'|'O', speed: número
function cardinalToVector(cardinal, speed) {
    switch (cardinal) {
        case 'N': return { dx: 0,      dy: -speed };
        case 'S': return { dx: 0,      dy:  speed };
        case 'E': return { dx:  speed, dy: 0      };
        case 'O': return { dx: -speed, dy: 0      };
        default:  return { dx: 0,      dy: 0      };
    }
}

// ── Colisión básica con mapa ──────────────────────────────────────────────
// Retorna true si el punto (x,y) está dentro de una pared
function colisionPunto(mapa, x, y) {
    const mx = Math.floor(x / TILE);
    const my = Math.floor(y / TILE);
    if (mx < 0 || mx >= mapa.ancho || my < 0 || my >= mapa.alto) return true;
    const t = mapa.tiles[my][mx];
    return t !== 0 && t !== 5; // 5 = puerta traversable
}

// AABB con radio — chequea 4 esquinas
function colisionAABB(mapa, x, y, radio) {
    return colisionPunto(mapa, x + radio, y + radio) ||
           colisionPunto(mapa, x - radio, y + radio) ||
           colisionPunto(mapa, x + radio, y - radio) ||
           colisionPunto(mapa, x - radio, y - radio);
}

// Alias con radio por defecto de jugador
function colisionJugador(mapa, x, y) {
    return colisionAABB(mapa, x, y, PLAYER_RADIUS);
}

function colisionNPC(mapa, x, y) {
    return colisionAABB(mapa, x, y, ENEMY_RADIUS);
}

function colisionBala(mapa, x, y) {
    return colisionPunto(mapa, x, y);
}

// ── Mover entidad con colisión por ejes independientes ───────────────────
// Devuelve { x, y, colisionX, colisionY, bloqueado }
// Funciona igual para jugadores, NPCs y cualquier entidad 2D
function moverConColision(mapa, entidad, dx, dy, radio) {
    const r = radio !== undefined ? radio : PLAYER_RADIUS;
    let { x, y } = entidad;
    let colisionX = false, colisionY = false;

    const nx = x + dx;
    const ny = y + dy;

    if (!colisionAABB(mapa, nx, ny, r)) {
        // Movimiento libre completo
        return { x: nx, y: ny, colisionX: false, colisionY: false, bloqueado: false };
    }

    // Intentar solo eje X
    if (!colisionAABB(mapa, nx, y, r)) {
        return { x: nx, y, colisionX: false, colisionY: true, bloqueado: false };
    }

    // Intentar solo eje Y
    if (!colisionAABB(mapa, x, ny, r)) {
        return { x, y: ny, colisionX: true, colisionY: false, bloqueado: false };
    }

    // Completamente bloqueado
    return { x, y, colisionX: true, colisionY: true, bloqueado: true };
}

// ── Física de Salto ───────────────────────────────────────────────────────
// Estado de salto en una entidad:
//   entidad.z       → altura actual (0 = suelo)
//   entidad.velZ    → velocidad vertical
//   entidad.onGround→ bool

function iniciarSalto(entidad) {
    if (!entidad.onGround) return false; // no puede saltar en el aire
    entidad.velZ     = JUMP_VELOCITY;
    entidad.onGround = false;
    entidad.z        = entidad.z || 0;
    return true;
}

// Actualiza la física vertical de una entidad (llamar cada tick con dt en segundos)
function tickSalto(entidad, dt) {
    if (entidad.onGround) return;

    entidad.z    = (entidad.z    || 0);
    entidad.velZ = (entidad.velZ || 0);

    entidad.velZ -= GRAVITY * dt;
    entidad.z    += entidad.velZ * dt * TILE; // escalar a unidades del mapa

    if (entidad.z <= FLOOR_Z) {
        entidad.z        = FLOOR_Z;
        entidad.velZ     = 0;
        entidad.onGround = true;
    }
}

// Altura visual que debe usarse en el render (en píxeles, relativa al suelo)
function alturaVisual(entidad) {
    return Math.max(0, entidad.z || 0);
}

// ── Separación anti-overlap entre entidades ───────────────────────────────
// Recibe un array de entidades [{x,y,...}] y las separa si están muy juntas
// radio: radio de cada entidad (o usa PLAYER_RADIUS por defecto)
// Modifica las entidades in-place, retorna el array modificado
function separarEntidades(entidades, radio) {
    const r = radio !== undefined ? radio : PLAYER_RADIUS;
    const sep = r * 2.2; // distancia mínima entre centros

    for (let i = 0; i < entidades.length; i++) {
        for (let j = i + 1; j < entidades.length; j++) {
            const a = entidades[i], b = entidades[j];
            const dx = a.x - b.x, dy = a.y - b.y;
            const d  = Math.sqrt(dx * dx + dy * dy);
            if (d < sep && d > 0.01) {
                const push = (sep - d) / sep * r * 0.5;
                const angle = Math.atan2(dy, dx);
                a.x += Math.cos(angle) * push;
                a.y += Math.sin(angle) * push;
                b.x -= Math.cos(angle) * push;
                b.y -= Math.sin(angle) * push;
            }
        }
    }
    return entidades;
}

// ── Lag Compensation / Interpolación ─────────────────────────────────────
// Buffer de snapshots por entidad para interpolación en el cliente
// Uso:
//   const buf = PHYSICS.crearBuffer()
//   PHYSICS.pushSnapshot(buf, {x, y, angle, ts: Date.now()})
//   const interpolado = PHYSICS.interpolar(buf, Date.now() - INTERP_DELAY)

function crearBuffer() {
    return []; // array de snapshots ordenados por ts
}

function pushSnapshot(buffer, snapshot) {
    // snapshot = { x, y, angle, z, ts }
    buffer.push(snapshot);
    // Mantener solo los últimos MAX_SNAPSHOTS
    if (buffer.length > MAX_SNAPSHOTS) buffer.shift();
}

// Retorna el estado interpolado para el timestamp dado
function interpolar(buffer, targetTs) {
    if (!buffer || buffer.length === 0) return null;
    if (buffer.length === 1) return { ...buffer[0] };

    // Buscar los dos snapshots que rodean targetTs
    let prev = buffer[0], next = buffer[buffer.length - 1];

    for (let i = 0; i < buffer.length - 1; i++) {
        if (buffer[i].ts <= targetTs && buffer[i + 1].ts >= targetTs) {
            prev = buffer[i];
            next = buffer[i + 1];
            break;
        }
    }

    if (targetTs <= prev.ts) return { ...prev };
    if (targetTs >= next.ts) return { ...next };

    const t = (targetTs - prev.ts) / (next.ts - prev.ts);

    // Interpolar ángulo correctamente (evitar salto de 359°→0°)
    let da = next.angle - prev.angle;
    if (da > Math.PI)  da -= Math.PI * 2;
    if (da < -Math.PI) da += Math.PI * 2;

    return {
        x:     prev.x     + (next.x     - prev.x)     * t,
        y:     prev.y     + (next.y     - prev.y)     * t,
        z:     (prev.z || 0) + ((next.z || 0) - (prev.z || 0)) * t,
        angle: prev.angle + da * t,
        ts:    targetTs,
    };
}

// ── Predicción cliente (dead reckoning) ──────────────────────────────────
// Extrapola la posición de una entidad hacia adelante dt segundos
// basándose en su última velocidad conocida
function predecir(entidad, dt) {
    if (!entidad) return null;
    const speed = entidad.speed || 0;
    return {
        ...entidad,
        x: entidad.x + Math.cos(entidad.angle) * speed * dt,
        y: entidad.y + Math.sin(entidad.angle) * speed * dt,
    };
}

// ── Spawn seguro ──────────────────────────────────────────────────────────
// Busca el tile vacío más cercano a (tileX, tileY) y retorna coords en píxeles
function spawnSeguro(mapa, tileX, tileY) {
    for (let r = 0; r <= 6; r++) {
        for (let dy = -r; dy <= r; dy++) {
            for (let dx = -r; dx <= r; dx++) {
                if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
                const tx = tileX + dx, ty = tileY + dy;
                if (tx < 1 || ty < 1 || tx >= mapa.ancho - 1 || ty >= mapa.alto - 1) continue;
                if (mapa.tiles[ty][tx] === 0) {
                    return { x: tx * TILE + 32, y: ty * TILE + 32 };
                }
            }
        }
    }
    return { x: TILE + 32, y: TILE + 32 };
}

// ── Línea de visión ───────────────────────────────────────────────────────
function hasLOS(mapa, x1, y1, x2, y2) {
    const dx = x2 - x1, dy = y2 - y1;
    const d  = Math.sqrt(dx * dx + dy * dy);
    if (d < 1) return true;
    const nx = dx / d, ny = dy / d;
    for (let t = 10; t < d; t += 10) {
        if (colisionPunto(mapa, x1 + nx * t, y1 + ny * t)) return false;
    }
    return true;
}

// ── Detección de bala contra entidades ───────────────────────────────────
// Retorna el primer objetivo golpeado o null
// targets = array de {id, x, y, radio?, vivo}
function detectarHitBala(bala, targets, radioOverride) {
    for (const t of targets) {
        if (!t.vivo && !t.active) continue;
        const r = radioOverride || t.radio || PLAYER_RADIUS + BULLET_RADIUS;
        if (dist(bala.x, bala.y, t.x, t.y) < r) return t;
    }
    return null;
}

// ── Sincronización de posición (fix bug principal) ────────────────────────
// Genera un snapshot de posición listo para enviar por socket
function snapshotJugador(jugador, socketId) {
    return {
        id:    socketId,
        x:     jugador.x,
        y:     jugador.y,
        z:     jugador.z     || 0,
        angle: jugador.angle || 0,
        arma:  jugador.arma  || 0,
        skin:  jugador.skin  || 'guerrero_base',
        vivo:  jugador.vivo  !== false,
        hp:    jugador.hp    || 100,
        ts:    Date.now(),
    };
}

// Aplica un snapshot recibido a la entidad local (cliente)
// Hace reconciliación suave: si la diferencia es pequeña, interpola
// Si es grande (desynced), teletransporta
function aplicarSnapshot(entidadLocal, snapshot, umbralTeleport = 200) {
    if (!entidadLocal || !snapshot) return;
    const d = dist(entidadLocal.x, entidadLocal.y, snapshot.x, snapshot.y);
    if (d > umbralTeleport) {
        // Desynced — teletransportar
        entidadLocal.x = snapshot.x;
        entidadLocal.y = snapshot.y;
    } else if (d > 1) {
        // Suavizar
        entidadLocal.x += (snapshot.x - entidadLocal.x) * 0.3;
        entidadLocal.y += (snapshot.y - entidadLocal.y) * 0.3;
    }
    entidadLocal.angle = snapshot.angle;
    entidadLocal.z     = snapshot.z || 0;
    entidadLocal.arma  = snapshot.arma;
    entidadLocal.vivo  = snapshot.vivo;
    if (snapshot.hp !== undefined) entidadLocal.hp = snapshot.hp;
}

// ── API pública ───────────────────────────────────────────────────────────
return {
    // Constantes
    TILE,
    PLAYER_RADIUS,
    ENEMY_RADIUS,
    BULLET_RADIUS,
    JUMP_VELOCITY,
    GRAVITY,
    JUMP_HEIGHT,
    INTERP_DELAY,

    // Cardinal
    angleToCardinal,
    angleToDegrees,
    angleBetween,
    cardinalToVector,
    dist,

    // Colisión
    colisionPunto,
    colisionAABB,
    colisionJugador,
    colisionNPC,
    colisionBala,
    moverConColision,

    // Salto
    iniciarSalto,
    tickSalto,
    alturaVisual,

    // Separación
    separarEntidades,

    // Lag compensation
    crearBuffer,
    pushSnapshot,
    interpolar,
    predecir,

    // Utilidades
    spawnSeguro,
    hasLOS,
    detectarHitBala,
    snapshotJugador,
    aplicarSnapshot,
};

})();

// Exportar para Node.js (server.js) — en el browser queda como global PHYSICS
if (typeof module !== 'undefined') module.exports = PHYSICS;