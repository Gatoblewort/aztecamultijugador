// ═══════════════════════════════════════════════════════════════════════════
//  AZTEC WAR — ENGINE.JS
//  Lógica de juego portada 1:1 desde aztecawarior.c
//  Maneja: niveles, oleadas, IA, balas, coleccionables, jefe, colisiones
//  NO toca el DOM ni el canvas — solo estado puro
// ═══════════════════════════════════════════════════════════════════════════

const ENGINE = (() => {

// ── Constantes (mirrors del .c) ───────────────────────────────────────────
const TILE          = 64;
const PLAYER_MARGIN = 16;
const ENEMY_RADIUS  = 20;
const JUMP_VEL      = 5.0;
const GRAVITY       = 12.0;
const PLAYER_SPEED  = 3.8;

const WEAPON_COOLDOWN  = [0.15, 0.25, 0.40];
const WEAPON_DAMAGE    = [15,   25,   40  ];
const WEAPON_BULL_SPD  = [12,   14,   18  ];
const WEAPON_NAMES     = ['Macuahuitl', 'Atlatl', 'Arco'];

// Estados IA — mismo enum que el .c
const AI = { PATROL:'patrol', CHASE:'chase', STRAFE:'strafe',
             RETREAT:'retreat', SHOOT:'shoot', FLANK:'flank', PINCER:'pincer' };

// ── Estado del juego para UNA sala ───────────────────────────────────────
function crearEstadoSala() {
    return {
        level:     1,
        gameTime:  0,
        playTimer: 0,           // cronómetro total (no se resetea entre niveles)
        transitionTimer: 0,
        transitionando: false,

        // Por jugador (socketId → PlayerState)
        players: new Map(),

        // Enemies, bullets, pickups
        enemies:   [],
        bullets:   [],
        coins:     [],
        hearts:    [],
        ammoDrops: [],
        particles: [],

        // Mapa actual
        mapa: null,

        // Jefe
        boss: null,   // null si no activo

        // Callbacks que el servidor asigna
        onBala:         null,  // (balaData) → broadcast
        onDanioJugador: null,  // (id, hp, fromId, danio)
        onMuerteJugador:null,  // (id, matadorId, kills, muertes)
        onRespawn:      null,  // (id, x, y, hp)
        onMonedaRecogida: null,// (monedaId, jugadorId, totalMonedas)
        onNivelTransicion: null,// (nivelActual, nivelSiguiente)
        onVictoria:     null,  // (resultados)
        onSpawnPickup:  null,  // (tipo, data)
        onBossUpdate:   null,  // (bossData)
        onBossMuerto:   null,  // ()
    };
}

// ── Colisión básica (igual que checkCollision del .c) ─────────────────────
function colision(mapa, x, y) {
    const mx = Math.floor(x / TILE), my = Math.floor(y / TILE);
    if (mx < 0 || mx >= mapa.ancho || my < 0 || my >= mapa.alto) return true;
    const t = mapa.tiles[my][mx];
    return t !== 0 && t !== 5; // 0=vacío, 5=puerta (traversable)
}

// Con radio AABB — checkCollisionR del .c
function colisionR(mapa, x, y, r) {
    return colision(mapa,x+r,y+r) || colision(mapa,x-r,y+r) ||
           colision(mapa,x+r,y-r) || colision(mapa,x-r,y-r);
}

// Línea de visión — hasLOS del .c
function hasLOS(mapa, x1, y1, x2, y2) {
    const dx = x2-x1, dy = y2-y1;
    const d = Math.sqrt(dx*dx+dy*dy);
    if (d < 1) return true;
    const nx = dx/d, ny = dy/d;
    for (let t = 10; t < d; t += 10) {
        if (colision(mapa, x1+nx*t, y1+ny*t)) return false;
    }
    return true;
}

// Distancia entre dos puntos
function dist(x1,y1,x2,y2) {
    const dx=x2-x1, dy=y2-y1;
    return Math.sqrt(dx*dx+dy*dy);
}

// ── Spawn seguro (busca tile vacío más cercano) ───────────────────────────
function spawnSeguro(mapa, tileX, tileY) {
    for (let r = 0; r <= 6; r++) {
        for (let dy = -r; dy <= r; dy++) {
            for (let dx = -r; dx <= r; dx++) {
                if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
                const tx = tileX+dx, ty = tileY+dy;
                if (tx<1||ty<1||tx>=mapa.ancho-1||ty>=mapa.alto-1) continue;
                if (mapa.tiles[ty][tx] === 0) return { x: tx*TILE+32, y: ty*TILE+32 };
            }
        }
    }
    return { x: TILE+32, y: TILE+32 };
}

// ── Generación de mapas (igual que el .c) ─────────────────────────────────
function generarMapa(nivel) {
    if (nivel === 1) {
        const W=24, H=24;
        const m = Array.from({length:H}, () => Array(W).fill(2));
        [3,4,8,9,14,15,19,20].forEach(r => { for(let x=1;x<W-1;x++) m[r][x]=0; });
        [3,4,8,9,14,15,19,20].forEach(c => { for(let y=1;y<H-1;y++) m[y][c]=0; });
        for(let y=9;y<16;y++) for(let x=9;x<16;x++) m[y][x]=0;
        for(let x=9;x<16;x++){m[9][x]=4;m[15][x]=4;}
        for(let y=9;y<16;y++){m[y][9]=4;m[y][15]=4;}
        m[9][11]=0;m[9][12]=0;m[9][13]=0;m[15][11]=0;m[15][12]=0;m[15][13]=0;
        m[11][9]=0;m[12][9]=0;m[13][9]=0;m[11][15]=0;m[12][15]=0;m[13][15]=0;
        m[2][2]=3;m[2][21]=3;m[21][2]=3;m[21][21]=3;
        [[6,6],[6,17],[17,6],[17,17]].forEach(([x,y])=>{m[y][x]=1;});
        return { tiles:m, ancho:W, alto:H,
            spawns:[{x:4,y:3},{x:19,y:3},{x:4,y:19},{x:19,y:19},
                    {x:11,y:4},{x:4,y:11},{x:19,y:11},{x:11,y:19}] };
    }
    if (nivel === 2) {
        const W=36, H=36;
        const m = Array.from({length:H}, () => Array(W).fill(6));
        [2,3,7,8,13,14,19,20,25,26,31,32].forEach(r=>{for(let x=1;x<W-1;x++)m[r][x]=0;});
        [2,3,7,8,13,14,19,20,25,26,31,32].forEach(c=>{for(let y=1;y<H-1;y++)m[y][c]=0;});
        [[2,2,8,8],[2,26,8,8],[26,2,8,8],[26,26,8,8]].forEach(([ox,oy,w,h])=>{
            for(let y=oy;y<oy+h;y++) for(let x=ox;x<ox+w;x++) m[y][x]=0;
        });
        for(let y=15;y<22;y++) for(let x=15;x<22;x++){
            if(y===15||y===21||x===15||x===21) m[y][x]=7; else m[y][x]=0;
        }
        m[15][18]=0;m[15][19]=0;m[21][18]=0;m[21][19]=0;
        m[18][15]=0;m[19][15]=0;m[18][21]=0;m[19][21]=0;
        m[9][9]=3;m[9][26]=3;m[26][9]=3;m[26][26]=3;
        m[5][17]=5;m[17][5]=5;m[29][17]=5;m[17][29]=5;
        return { tiles:m, ancho:W, alto:H,
            spawns:[{x:4,y:4},{x:30,y:4},{x:4,y:30},{x:30,y:30},
                    {x:18,y:3},{x:3,y:18},{x:30,y:18},{x:18,y:30}] };
    }
    // Nivel 3 — mapa 48×48 del .c
    const W=48, H=48;
    const m = Array.from({length:H}, () => Array(W).fill(6));
    [3,7,11,15,19,23,27,31,35,39,43].forEach(r=>{for(let x=1;x<W-1;x++)m[r][x]=0;});
    [3,7,11,15,19,23,27,31,35,39,43].forEach(c=>{for(let y=1;y<H-1;y++)m[y][c]=0;});
    [[2,2,10,10],[2,36,10,10],[36,2,10,10],[36,36,10,10]].forEach(([ox,oy,w,h])=>{
        for(let y=oy;y<oy+h;y++) for(let x=ox;x<ox+w;x++) m[y][x]=0;
    });
    for(let y=18;y<30;y++) for(let x=18;x<30;x++) m[y][x]=0;
    for(let x=18;x<30;x++){m[18][x]=4;m[29][x]=4;}
    for(let y=18;y<30;y++){m[y][18]=4;m[y][29]=4;}
    m[18][23]=0;m[18][24]=0;m[29][23]=0;m[29][24]=0;
    m[23][18]=0;m[24][18]=0;m[23][29]=0;m[24][29]=0;
    [[11,11],[11,35],[35,11],[35,35],[23,7],[23,39],[7,23],[39,23]].forEach(([ly,lx])=>{
        for(let dy=-1;dy<=1;dy++) for(let dx=-1;dx<=1;dx++) m[ly+dy][lx+dx]=7;
    });
    return { tiles:m, ancho:W, alto:H,
        spawns:[{x:4,y:3},{x:40,y:3},{x:4,y:40},{x:40,y:40},
                {x:23,y:3},{x:3,y:23},{x:40,y:23},{x:23,y:40}] };
}

// ── Spawn de enemigos por nivel (spawnEnemiesForLevel del .c) ─────────────
function spawnEnemigos(estado) {
    const { level, mapa } = estado;
    const count  = level===1 ? 20 : level===2 ? 30 : 55;
    const hp     = level===1 ? 50 : level===2 ? 70 : 90;
    const spd    = level===1 ? 1.3 : level===2 ? 1.6 : 1.9;
    const alert  = level===1 ? 520 : level===2 ? 700 : 800;

    estado.enemies = [];
    for (let i = 0; i < count; i++) {
        let ex, ey, intentos = 0;
        // Buscar posición libre lejos de todos los jugadores
        do {
            const tx = 3 + Math.floor(Math.random() * (mapa.ancho - 6));
            const ty = 3 + Math.floor(Math.random() * (mapa.alto  - 6));
            ex = tx * TILE + 32;
            ey = ty * TILE + 32;
            intentos++;
        } while ((colisionR(mapa, ex, ey, ENEMY_RADIUS) ||
                  [...estado.players.values()].some(p => dist(p.x,p.y,ex,ey) < 400))
                 && intentos < 200);

        estado.enemies.push({
            id:            `e_${i}`,
            x: ex, y: ey,
            angle:         Math.random() * Math.PI * 2,
            hp, maxHp: hp, spd,
            alertDistance: alert,
            active:        true,
            estado:        AI.PATROL,
            aiTimer:       2 + Math.random() * 2,
            coordTimer:    0,
            moveTimer:     0,
            stuckTimer:    0,
            lastValidX:    ex,
            lastValidY:    ey,
            shootTimer:    2 + Math.random() * 2,
            strafeDir:     Math.random() > 0.5 ? 1 : -1,
            burstCount:    0,
            burstTimer:    0,
            retreatTimer:  0,
            squadRole:     i % 4,
            alertedBy:     null,
            walkCycle:     Math.random() * Math.PI * 2,
        });
    }
}

// ── Spawn de pickups (loadLevel del .c) ───────────────────────────────────
function spawnPickups(estado) {
    const { level, mapa } = estado;
    estado.coins     = [];
    estado.hearts    = [];
    estado.ammoDrops = [];

    const coinCount  = level===1 ? 15 : level===2 ? 25 : 40;
    const heartCount = level===1 ?  6 : level===2 ? 10 : 15;
    const ammoCount  = level===1 ?  5 : level===2 ? 10 : 18;

    let id = 0;
    for (let i = 0; i < coinCount; i++) {
        let tx, ty, tries=0;
        do { tx=2+Math.floor(Math.random()*(mapa.ancho-4));
             ty=2+Math.floor(Math.random()*(mapa.alto-4)); tries++; }
        while (mapa.tiles[ty][tx] !== 0 && tries < 100);
        if (mapa.tiles[ty][tx] === 0)
            estado.coins.push({ id:`c${id++}`, x:tx*TILE+32, y:ty*TILE+32,
                                valor:10+Math.floor(Math.random()*30), bob:Math.random()*6.28 });
    }
    for (let i = 0; i < heartCount; i++) {
        let tx, ty, tries=0;
        do { tx=2+Math.floor(Math.random()*(mapa.ancho-4));
             ty=2+Math.floor(Math.random()*(mapa.alto-4)); tries++; }
        while (mapa.tiles[ty][tx] !== 0 && tries < 100);
        if (mapa.tiles[ty][tx] === 0)
            estado.hearts.push({ id:`h${id++}`, x:tx*TILE+32, y:ty*TILE+32,
                                 heal:25, bob:Math.random()*6.28 });
    }
    for (let i = 0; i < ammoCount; i++) {
        let tx, ty, tries=0;
        do { tx=2+Math.floor(Math.random()*(mapa.ancho-4));
             ty=2+Math.floor(Math.random()*(mapa.alto-4)); tries++; }
        while (mapa.tiles[ty][tx] !== 0 && tries < 100);
        if (mapa.tiles[ty][tx] === 0)
            estado.ammoDrops.push({ id:`a${id++}`, x:tx*TILE+32, y:ty*TILE+32,
                                    amount:15+Math.floor(Math.random()*20), bob:Math.random()*6.28 });
    }
}

// ── Cargar nivel (loadLevel del .c) ───────────────────────────────────────
function cargarNivel(estado, nivel) {
    estado.level   = nivel;
    estado.mapa    = generarMapa(nivel);
    estado.bullets = [];
    estado.particles = [];
    estado.transitionando = false;

    spawnEnemigos(estado);
    spawnPickups(estado);

    // Jefe en nivel 3
    if (nivel === 3) {
        estado.boss = {
            x: 23.5*TILE, y: 23.5*TILE,
            angle: 0,
            hp: 600, maxHp: 600,
            phase: 1,
            shootTimer: 2.0,
            moveTimer:  0,
            active:     true,
        };
    } else {
        estado.boss = null;
    }

    // Reubicar jugadores en sus spawns
    let i = 0;
    for (const [, player] of estado.players) {
        const spawn = estado.mapa.spawns[i % estado.mapa.spawns.length];
        const pos   = spawnSeguro(estado.mapa, spawn.x, spawn.y);
        player.x = pos.x; player.y = pos.y;
        player.hp = player.maxHp;
        player.vivo = true;
        i++;
    }
}

// ── Estado inicial de un jugador ──────────────────────────────────────────
function crearJugador(id, nombre, skin, nivel) {
    return {
        id, nombre, skin, nivel,
        x: 0, y: 0, z: 0, velZ: 0, onGround: true,
        angle: Math.random() * Math.PI * 2,
        hp: 100, maxHp: 100,
        ammo: 50,
        gold: 0,       // monedas acumuladas
        kills: 0, muertes: 0,
        arma: 1,       // WEAPON_ATLATL como default (igual que el .c)
        shootCooldown: 0,
        invulTime: 0,
        weaponBob: 0, weaponSwing: 0,
        vivo: true,
        ammoRegen: 0,  // timer de regeneración de munición
    };
}

// ── Disparar bala (shootBullet del .c) ────────────────────────────────────
function dispararBala(estado, x, y, angle, deJugador, fromId, dmg, velocidad=12) {
    const id = `b_${fromId}_${Date.now()}_${Math.random().toString(36).slice(2,5)}`;
    const bala = {
        id, x, y,
        dx: Math.cos(angle) * velocidad,
        dy: Math.sin(angle) * velocidad,
        fromId, deJugador,
        danio: dmg,
        vida: deJugador ? 2.5 : 3.0,
        active: true,
    };
    estado.bullets.push(bala);
    if (estado.onBala) estado.onBala(bala);
    return bala;
}

// ── Update balas (updateBullets del .c) ───────────────────────────────────
function updateBullets(estado, dt) {
    const { mapa, bullets, enemies, players, level, boss } = estado;

    for (let bi = bullets.length - 1; bi >= 0; bi--) {
        const b = bullets[bi];
        if (!b.active) { bullets.splice(bi,1); continue; }

        b.vida -= dt;
        if (b.vida <= 0) { b.active=false; bullets.splice(bi,1); continue; }

        // Mover en sub-pasos para mayor precisión
        const pasos = 3;
        const sx = b.dx/pasos, sy = b.dy/pasos;
        let hit = false;

        for (let p = 0; p < pasos && !hit; p++) {
            b.x += sx; b.y += sy;
            const btx = Math.floor(b.x/TILE), bty = Math.floor(b.y/TILE);
            if (bty<0||bty>=mapa.alto||btx<0||btx>=mapa.ancho||mapa.tiles[bty][btx]!==0) {
                if (mapa.tiles[bty]?.[btx] !== 0) { b.active=false; hit=true; break; }
            }

            if (b.deJugador) {
                // Chequear enemigos
                for (const e of enemies) {
                    if (!e.active) continue;
                    if (dist(b.x,b.y,e.x,e.y) < 64) {
                        e.hp -= b.danio;
                        b.active = true; // se destruye debajo
                        hit = true;
                        if (e.hp <= 0) {
                            e.active = false;
                            // Dar recompensa al tirador
                            const tirador = players.get(b.fromId);
                            if (tirador) {
                                tirador.kills++;
                                tirador.gold += 50 + level * 25;
                            }
                            // Spawn drops
                            estado.coins.push({ id:`dc_${Date.now()}`, x:e.x, y:e.y,
                                valor:50+level*25, bob:Math.random()*6.28 });
                            if (Math.random() < 0.3)
                                estado.hearts.push({ id:`dh_${Date.now()}`, x:e.x, y:e.y,
                                    heal:25, bob:Math.random()*6.28 });
                            if (Math.random() < 0.5)
                                estado.ammoDrops.push({ id:`da_${Date.now()}`, x:e.x+16, y:e.y+16,
                                    amount:10+Math.floor(Math.random()*15), bob:Math.random()*6.28 });
                            if (estado.onSpawnPickup) {
                                estado.onSpawnPickup('moneda', estado.coins[estado.coins.length-1]);
                                if (estado.hearts.length) estado.onSpawnPickup('corazon', estado.hearts[estado.hearts.length-1]);
                                if (estado.ammoDrops.length) estado.onSpawnPickup('ammo', estado.ammoDrops[estado.ammoDrops.length-1]);
                            }
                        }
                        if (estado.onBala) estado.onBala({ id:b.id+'_hit', hit:true, targetId:e.id, hp:e.hp });
                        break;
                    }
                }

                // Chequear jefe
                if (!hit && boss && boss.active) {
                    if (dist(b.x,b.y,boss.x,boss.y) < 64) {
                        boss.hp -= b.danio;
                        hit = true;
                        b.active = false;
                        if (boss.hp < boss.maxHp * 0.5 && boss.phase === 1) boss.phase = 2;
                        if (boss.hp <= 0) {
                            boss.active = false;
                            // drops del jefe
                            for (let c=0;c<8;c++)
                                estado.coins.push({id:`bdc_${c}`, x:boss.x+(Math.random()*100-50), y:boss.y+(Math.random()*100-50), valor:200, bob:0});
                            for (let h=0;h<3;h++)
                                estado.hearts.push({id:`bdh_${h}`, x:boss.x+(Math.random()*60-30), y:boss.y+(Math.random()*60-30), heal:50, bob:0});
                            if (estado.onBossMuerto) estado.onBossMuerto();
                        }
                        if (estado.onBossUpdate) estado.onBossUpdate(boss);
                    }
                }

                // Chequear jugadores enemigos (PvP)
                if (!hit) {
                    for (const [sid, target] of players) {
                        if (sid === b.fromId || !target.vivo) continue;
                        if (dist(b.x,b.y,target.x,target.y) < 64) {
                            let dmgReal = b.danio;
                            if (level === 3) dmgReal = Math.floor(dmgReal * 0.6); // reducción nivel 3
                            target.hp -= dmgReal;
                            hit = true;
                            b.active = false;
                            if (estado.onDanioJugador)
                                estado.onDanioJugador(sid, target.hp, b.fromId, dmgReal);
                            if (target.hp <= 0) {
                                target.vivo = false; target.muertes++;
                                const tirador = players.get(b.fromId);
                                if (tirador) { tirador.kills++; tirador.gold += 50; }
                                if (estado.onMuerteJugador)
                                    estado.onMuerteJugador(sid, b.fromId, tirador?.kills??0, target.muertes);
                            }
                            break;
                        }
                    }
                }

            } else {
                // Bala de enemigo — solo afecta jugadores
                for (const [sid, target] of players) {
                    if (!target.vivo || target.invulTime > 0) continue;
                    if (dist(b.x,b.y,target.x,target.y) < 48) {
                        let dmgReal = b.danio;
                        if (level === 3) dmgReal = Math.floor(dmgReal * 0.6);
                        target.hp -= dmgReal;
                        target.invulTime = 0.6;
                        hit = true;
                        b.active = false;
                        if (estado.onDanioJugador)
                            estado.onDanioJugador(sid, target.hp, b.fromId, dmgReal);
                        if (target.hp <= 0) {
                            target.vivo = false; target.muertes++;
                            if (estado.onMuerteJugador)
                                estado.onMuerteJugador(sid, b.fromId, 0, target.muertes);
                        }
                        break;
                    }
                }
            }

            if (hit) { b.active=false; break; }
        }
        if (!b.active) bullets.splice(bi, 1);
    }
}

// ── Update pickups ────────────────────────────────────────────────────────
function updatePickups(estado) {
    for (const [sid, player] of estado.players) {
        if (!player.vivo) continue;

        // Monedas
        for (let i = estado.coins.length-1; i >= 0; i--) {
            const c = estado.coins[i];
            if (dist(player.x,player.y,c.x,c.y) < 40) {
                player.gold += c.valor;
                if (estado.onMonedaRecogida)
                    estado.onMonedaRecogida(c.id, sid, player.gold);
                estado.coins.splice(i,1);
            }
        }

        // Corazones (solo si HP < máximo)
        for (let i = estado.hearts.length-1; i >= 0; i--) {
            const h = estado.hearts[i];
            if (dist(player.x,player.y,h.x,h.y) < 40) {
                player.hp = Math.min(player.maxHp, player.hp + h.heal);
                if (estado.onDanioJugador)
                    estado.onDanioJugador(sid, player.hp, null, 0); // reuse evento para HP update
                estado.hearts.splice(i,1);
            }
        }

        // Munición
        for (let i = estado.ammoDrops.length-1; i >= 0; i--) {
            const a = estado.ammoDrops[i];
            if (dist(player.x,player.y,a.x,a.y) < 40) {
                player.ammo = Math.min(999, player.ammo + a.amount);
                estado.ammoDrops.splice(i,1);
            }
        }
    }
}

// ── Update jefe (boss del .c) ─────────────────────────────────────────────
function updateBoss(estado, dt) {
    const { boss, mapa, players } = estado;
    if (!boss || !boss.active) return;

    // Encontrar jugador más cercano
    let nearX=boss.x, nearY=boss.y, nearDist=Infinity;
    for (const [, p] of players) {
        if (!p.vivo) continue;
        const d = dist(boss.x,boss.y,p.x,p.y);
        if (d < nearDist) { nearDist=d; nearX=p.x; nearY=p.y; }
    }

    boss.angle = Math.atan2(nearY-boss.y, nearX-boss.x);
    const bspd = boss.phase===2 ? 2.8 : 1.8;
    const nbx = boss.x + Math.cos(boss.angle)*bspd;
    const nby = boss.y + Math.sin(boss.angle)*bspd;
    if (!colisionR(mapa, nbx, nby, 32)) { boss.x=nbx; boss.y=nby; }

    boss.shootTimer -= dt;
    if (boss.shootTimer <= 0) {
        const shots = boss.phase===2 ? 5 : 3;
        for (let i=0; i<shots; i++) {
            const spread = (i/shots - 0.5) * 0.4;
            dispararBala(estado, boss.x, boss.y, boss.angle+spread, false, 'boss', 20+boss.phase*5, 10);
        }
        boss.shootTimer = boss.phase===2 ? 0.8 : 1.4;
    }

    // Daño por contacto
    for (const [sid, p] of players) {
        if (!p.vivo || p.invulTime > 0) continue;
        if (nearDist < 60) {
            const dmg = boss.phase===2 ? 9 : 6;
            p.hp -= dmg; p.invulTime = 1.0;
            if (estado.onDanioJugador) estado.onDanioJugador(sid, p.hp, 'boss', dmg);
            if (p.hp <= 0) {
                p.vivo=false; p.muertes++;
                if (estado.onMuerteJugador) estado.onMuerteJugador(sid, 'boss', 0, p.muertes);
            }
        }
    }

    if (estado.onBossUpdate) estado.onBossUpdate({ x:boss.x, y:boss.y, hp:boss.hp, maxHp:boss.maxHp, phase:boss.phase });
}

// ── Update IA enemigos (updateEnemies del .c — 1:1) ───────────────────────
function updateEnemigos(estado, dt) {
    const { enemies, players, mapa, level, bullets } = estado;
    const DT = dt;

    // FASE 1: compartir alertas
    for (const ei of enemies) {
        if (!ei.active) continue;
        let minD = Infinity;
        let sees = false;
        for (const [, p] of players) {
            if (!p.vivo) continue;
            const d = dist(ei.x,ei.y,p.x,p.y);
            if (d < minD) minD = d;
            if (d < ei.alertDistance && hasLOS(mapa, ei.x, ei.y, p.x, p.y)) sees=true;
        }
        if (sees) {
            for (const ej of enemies) {
                if (ej === ei || !ej.active || ej.estado !== AI.PATROL) continue;
                if (dist(ei.x,ei.y,ej.x,ej.y) < 300) {
                    ej.estado   = (ej.squadRole===1||ej.squadRole===2) ? AI.FLANK : AI.CHASE;
                    ej.aiTimer  = 1.5;
                    ej.alertedBy = ei.id;
                }
            }
        }
    }

    // FASE 2: actualizar cada enemigo
    for (const e of enemies) {
        if (!e.active) continue;

        // Jugador objetivo más cercano con LOS
        let minD=Infinity, tX=null, tY=null;
        for (const [, p] of players) {
            if (!p.vivo) continue;
            const d = dist(e.x,e.y,p.x,p.y);
            if (d < minD) { minD=d; tX=p.x; tY=p.y; }
        }
        const canSee = tX!==null && minD<e.alertDistance && hasLOS(mapa,e.x,e.y,tX,tY);
        const toPA   = tX!==null ? Math.atan2(tY-e.y, tX-e.x) : e.angle;

        e.aiTimer    -= DT;
        e.coordTimer -= DT;
        e.walkCycle  += DT * 4;

        // Transiciones de estado — mirror exacto del .c
        if (canSee) {
            if (minD < 120 && e.estado !== AI.RETREAT) {
                e.estado=AI.RETREAT; e.retreatTimer=1.2;
            } else if (e.aiTimer <= 0) {
                const rr = Math.floor(Math.random()*100);
                if (e.squadRole===0) {
                    if      (rr<40) { e.estado=AI.SHOOT;  e.aiTimer=1.5; e.burstCount=3+(Math.random()>.5?1:0); e.burstTimer=0; }
                    else if (rr<70) { e.estado=AI.CHASE;  e.aiTimer=0.8; }
                    else            { e.estado=AI.STRAFE; e.aiTimer=1.0; e.strafeDir=Math.random()>.5?1:-1; }
                } else if (e.squadRole===1||e.squadRole===2) {
                    if      (rr<50) { e.estado=AI.FLANK;  e.aiTimer=1.2; }
                    else if (rr<75) { e.estado=AI.SHOOT;  e.aiTimer=1.0; e.burstCount=2; e.burstTimer=0; }
                    else            { e.estado=AI.STRAFE; e.aiTimer=0.8; e.strafeDir=e.squadRole===1?1:-1; }
                } else {
                    if      (rr<35) { e.estado=AI.PINCER; e.aiTimer=1.5; }
                    else if (rr<60) { e.estado=AI.SHOOT;  e.aiTimer=1.2; e.burstCount=2; e.burstTimer=0; }
                    else            { e.estado=AI.CHASE;  e.aiTimer=0.7; }
                }
            }
        } else if (e.aiTimer<=0 && e.estado!==AI.PATROL) {
            e.estado=AI.PATROL; e.aiTimer=3; e.alertedBy=null;
        }

        let mx=0, my=0;
        const spd = e.spd;

        switch(e.estado) {
            case AI.PATROL:
                e.moveTimer += DT;
                if (e.moveTimer>2.5) { e.angle=Math.random()*Math.PI*2; e.moveTimer=0; }
                mx=Math.cos(e.angle)*spd*0.5; my=Math.sin(e.angle)*spd*0.5;
                break;
            case AI.CHASE:
                e.angle=toPA;
                mx=Math.cos(e.angle)*spd; my=Math.sin(e.angle)*spd;
                break;
            case AI.STRAFE:
                e.angle=toPA;
                { const perp=toPA+Math.PI/2*e.strafeDir;
                  mx=Math.cos(perp)*spd*0.9; my=Math.sin(perp)*spd*0.9; }
                e.shootTimer-=DT;
                if (e.shootTimer<=0) {
                    dispararBala(estado,e.x,e.y,toPA+(Math.random()-.5)*0.12,false,e.id,8+(level-1)*2,8);
                    e.shootTimer=1.8;
                }
                break;
            case AI.RETREAT:
                { const away=toPA+Math.PI;
                  mx=Math.cos(away)*spd*1.1; my=Math.sin(away)*spd*1.1; }
                e.angle=toPA; e.retreatTimer-=DT;
                e.shootTimer-=DT;
                if (e.shootTimer<=0) {
                    dispararBala(estado,e.x,e.y,toPA+(Math.random()-.5)*0.18,false,e.id,8+(level-1)*2,8);
                    e.shootTimer=1.0;
                }
                if (e.retreatTimer<=0) { e.estado=AI.STRAFE; e.aiTimer=1.0; e.strafeDir=Math.random()>.5?1:-1; }
                break;
            case AI.SHOOT:
                e.angle=toPA;
                e.burstTimer-=DT;
                if (e.burstTimer<=0&&e.burstCount>0) {
                    dispararBala(estado,e.x,e.y,toPA+(Math.random()-.5)*0.10,false,e.id,8+(level-1)*2,8);
                    e.burstCount--; e.burstTimer=0.18;
                }
                { const dodge=Math.sin(estado.gameTime*8+parseInt(e.id.split('_')[1]||0))*spd*0.3;
                  mx=Math.cos(toPA+Math.PI/2)*dodge; my=Math.sin(toPA+Math.PI/2)*dodge; }
                break;
            case AI.FLANK:
                e.angle=toPA;
                { const fo=(e.squadRole===1)?Math.PI/3:-Math.PI/3;
                  const ta=toPA+fo;
                  const fx=tX+Math.cos(ta+Math.PI)*200, fy=tY+Math.sin(ta+Math.PI)*200;
                  const toT=Math.atan2(fy-e.y,fx-e.x);
                  mx=Math.cos(toT)*spd*1.1; my=Math.sin(toT)*spd*1.1; }
                e.shootTimer-=DT;
                if (e.shootTimer<=0&&canSee) {
                    dispararBala(estado,e.x,e.y,toPA+(Math.random()-.5)*0.15,false,e.id,8+(level-1)*2,8);
                    e.shootTimer=2.0;
                }
                break;
            case AI.PINCER:
                { let lx=tX, ly=tY;
                  for (const n2 of enemies) {
                      if (n2===e||!n2.active||n2.squadRole!==0) continue;
                      if (dist(n2.x,n2.y,e.x,e.y)<400) { lx=n2.x; ly=n2.y; break; }
                  }
                  const la=Math.atan2(ly-tY,lx-tX);
                  const pa=la+Math.PI;
                  const px=tX+Math.cos(pa)*180, py=tY+Math.sin(pa)*180;
                  const toT=Math.atan2(py-e.y,px-e.x);
                  mx=Math.cos(toT)*spd*1.2; my=Math.sin(toT)*spd*1.2;
                  e.angle=toPA; }
                e.shootTimer-=DT;
                if (e.shootTimer<=0&&canSee) {
                    dispararBala(estado,e.x,e.y,toPA+(Math.random()-.5)*0.12,false,e.id,8+(level-1)*2,8);
                    e.shootTimer=1.5;
                }
                break;
        }

        // Separación entre enemigos
        for (const n2 of enemies) {
            if (n2===e||!n2.active) continue;
            const dij=dist(e.x,e.y,n2.x,n2.y);
            const sep=ENEMY_RADIUS*2.5;
            if (dij<sep&&dij>0.1) {
                const pa=Math.atan2(e.y-n2.y,e.x-n2.x);
                const push=(sep-dij)/sep*spd*0.5;
                mx+=Math.cos(pa)*push; my+=Math.sin(pa)*push;
            }
        }

        // Movimiento con colisión — FIX v15 del .c
        if (mx!==0||my!==0) {
            const nx2=e.x+mx, ny2=e.y+my;
            if (!colisionR(mapa,nx2,ny2,ENEMY_RADIUS)) {
                e.x=nx2; e.y=ny2; e.lastValidX=nx2; e.lastValidY=ny2; e.stuckTimer=0;
            } else if (!colisionR(mapa,nx2,e.y,ENEMY_RADIUS)) {
                e.x=nx2; e.lastValidX=nx2; e.stuckTimer=0;
            } else if (!colisionR(mapa,e.x,ny2,ENEMY_RADIUS)) {
                e.y=ny2; e.lastValidY=ny2; e.stuckTimer=0;
            } else {
                e.stuckTimer+=DT;
                if (e.stuckTimer>0.5) { e.angle+=1.2+Math.random()*1.8; e.stuckTimer=0; }
            }
            if (colisionR(mapa,e.x,e.y,ENEMY_RADIUS-2)) { e.x=e.lastValidX; e.y=e.lastValidY; }
        }
    }
}

// ── Update jugador (server-authoritative para movimiento y cooldowns) ─────
function updateJugador(player, dt) {
    if (player.invulTime > 0)    player.invulTime    -= dt;
    if (player.shootCooldown > 0) player.shootCooldown -= dt;
    // Regeneración de munición — 1 cada 3 segundos como en el .c
    player.ammoRegen += dt;
    if (player.ammoRegen >= 3.0 && player.ammo < 999) {
        player.ammo++;
        player.ammoRegen = 0;
    }
}

// ── Tick principal — llamado por el servidor cada 100ms ───────────────────
function tick(estado, dt) {
    estado.gameTime  += dt;
    estado.playTimer += dt;

    if (estado.transitionando) {
        estado.transitionTimer -= dt;
        if (estado.transitionTimer <= 0) {
            cargarNivel(estado, estado.level + 1);
            if (estado.onNivelTransicion) estado.onNivelTransicion(estado.level-1, estado.level);
        }
        return;
    }

    // Update jugadores
    for (const [, p] of estado.players) updateJugador(p, dt);

    // Respawn pendientes (se maneja con setTimeout en server.js)

    // Update lógica de juego
    updateEnemigos(estado, dt);
    updateBullets(estado, dt);
    updatePickups(estado);
    updateBoss(estado, dt);

    // Chequear si el nivel terminó (todos los enemigos muertos + jefe muerto)
    const vivos = estado.enemies.filter(e=>e.active).length;
    const bossVivo = estado.boss && estado.boss.active;

    if (vivos === 0 && !bossVivo && !estado.transitionando) {
        if (estado.level < 3) {
            // Transición al siguiente nivel
            estado.transitionando = true;
            estado.transitionTimer = 4.0;
            if (estado.onNivelTransicion) estado.onNivelTransicion(estado.level, estado.level+1);
        } else {
            // Victoria — nivel 3 completado
            if (estado.onVictoria) {
                const resultados = [...estado.players.values()]
                    .sort((a,b)=>b.kills-a.kills||a.muertes-b.muertes)
                    .map((p,i)=>({...p, posicion:i+1, tiempo: estado.playTimer}));
                estado.onVictoria(resultados);
            }
        }
    }
}

// ── Disparo del jugador (llamado por evento socket) ───────────────────────
function jugadorDispara(estado, socketId, angulo) {
    const player = estado.players.get(socketId);
    if (!player || !player.vivo) return false;
    if (player.shootCooldown > 0) return false;
    if (player.ammo <= 0) return false;

    const arma = player.arma;
    player.shootCooldown = WEAPON_COOLDOWN[arma];
    player.ammo--;
    player.weaponSwing = 1.0;

    dispararBala(estado, player.x, player.y, angulo, true, socketId,
                 WEAPON_DAMAGE[arma], WEAPON_BULL_SPD[arma]);
    return true;
}

// ── API pública del módulo ────────────────────────────────────────────────
return {
    crearEstadoSala,
    crearJugador,
    cargarNivel,
    tick,
    jugadorDispara,
    spawnSeguro,
    generarMapa,
    WEAPON_NAMES,
    WEAPON_COOLDOWN,
    WEAPON_DAMAGE,
    AI,
};

})(); // fin IIFE

if (typeof module !== 'undefined') module.exports = ENGINE;
