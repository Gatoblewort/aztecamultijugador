// ═══════════════════════════════════════════════════════════════════════════
//  AZTEC WAR — SOUND.JS
//  Sonidos sintetizados con Web Audio API — sin archivos externos
//  Uso: SOUND.disparo(arma), SOUND.danio(), SOUND.moneda(), etc.
// ═══════════════════════════════════════════════════════════════════════════

const SOUND = (() => {

let ctx = null;
let musicaNode = null;
let musicaGain = null;
let volumen = 0.4;
let musicaActiva = false;
let pasosInterval = null;

// Inicializar AudioContext (requiere interacción del usuario)
function init() {
    if (ctx) return;
    try {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch(e) {
        console.warn('Web Audio no disponible:', e);
    }
}

// Reanudar contexto si está suspendido (política de autoplay)
function reanudar() {
    if (ctx && ctx.state === 'suspended') ctx.resume();
}

// ── Utilidad: crear oscilador simple ─────────────────────────────────────
function tono(freq, tipo, duracion, volMax, curva='exponential') {
    if (!ctx) return;
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = tipo;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(volMax * volumen, ctx.currentTime);
    if (curva === 'exponential') {
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duracion);
    } else {
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + duracion);
    }
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duracion);
}

// Ruido blanco (para impactos y explosiones)
function ruido(duracion, volMax, filtroFreq = 800) {
    if (!ctx) return;
    const bufSize = ctx.sampleRate * duracion;
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;

    const src    = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const gain   = ctx.createGain();

    src.buffer = buf;
    filter.type = 'lowpass';
    filter.frequency.value = filtroFreq;

    src.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    gain.gain.setValueAtTime(volMax * volumen, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duracion);
    src.start(ctx.currentTime);
}

// ── DISPAROS ──────────────────────────────────────────────────────────────
// arma: 0=Macuahuitl, 1=Atlatl, 2=Arco
function disparo(arma = 0) {
    if (!ctx) return;
    reanudar();
    if (arma === 0) {
        // Macuahuitl — golpe seco de piedra obsidiana
        ruido(0.08, 0.6, 400);
        tono(180, 'sawtooth', 0.06, 0.3);
    } else if (arma === 1) {
        // Atlatl — lanzamiento con silbido
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.3 * volumen, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.15);
        osc.start(); osc.stop(ctx.currentTime + 0.15);
        ruido(0.05, 0.2, 1200);
    } else {
        // Arco — cuerda vibrante
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(300, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.25 * volumen, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.2);
        osc.start(); osc.stop(ctx.currentTime + 0.2);
    }
}

// ── DAÑO RECIBIDO ─────────────────────────────────────────────────────────
function danio() {
    if (!ctx) return;
    reanudar();
    // Impacto sordo + tono bajo de dolor
    ruido(0.12, 0.5, 600);
    tono(120, 'sawtooth', 0.15, 0.2);
    // Flash de frecuencia alta
    tono(800, 'sine', 0.05, 0.15);
}

// ── MUERTE DE NPC ─────────────────────────────────────────────────────────
function muerteNPC() {
    if (!ctx) return;
    reanudar();
    // Grito corto descendente
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(440, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.25 * volumen, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.3);
    osc.start(); osc.stop(ctx.currentTime + 0.3);
    ruido(0.15, 0.3, 300);
}

// ── MUERTE DEL JUGADOR ────────────────────────────────────────────────────
function muerteJugador() {
    if (!ctx) return;
    reanudar();
    // Sonido dramático descendente largo
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 1.0);
    gain.gain.setValueAtTime(0.4 * volumen, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.0);
    osc.start(); osc.stop(ctx.currentTime + 1.0);

    // Capa de ruido
    ruido(0.5, 0.3, 400);

    // Acorde triste
    setTimeout(() => {
        if (!ctx) return;
        tono(220, 'sine', 0.6, 0.2);
        tono(165, 'sine', 0.6, 0.15);
    }, 200);
}

// ── RESPAWN ───────────────────────────────────────────────────────────────
function respawn() {
    if (!ctx) return;
    reanudar();
    // Ascendente esperanzador
    [300, 400, 500, 660].forEach((f, i) => {
        setTimeout(() => tono(f, 'sine', 0.15, 0.2), i * 80);
    });
}

// ── RECOGER MONEDA ────────────────────────────────────────────────────────
function moneda() {
    if (!ctx) return;
    reanudar();
    // Dos notas agudas tipo "ding"
    tono(880, 'sine', 0.1, 0.2);
    setTimeout(() => tono(1100, 'sine', 0.12, 0.15), 60);
}

// ── RECOGER CORAZON ───────────────────────────────────────────────────────
function corazon() {
    if (!ctx) return;
    reanudar();
    // Pulso suave ascendente
    tono(440, 'sine', 0.12, 0.2);
    setTimeout(() => tono(550, 'sine', 0.15, 0.25), 80);
    setTimeout(() => tono(660, 'sine', 0.1,  0.2),  160);
}

// ── RECOGER AMMO ─────────────────────────────────────────────────────────
function ammo() {
    if (!ctx) return;
    reanudar();
    // Metálico seco
    tono(300, 'square', 0.05, 0.15);
    setTimeout(() => tono(400, 'square', 0.06, 0.1), 40);
    ruido(0.05, 0.1, 1500);
}

// ── PASOS ─────────────────────────────────────────────────────────────────
function paso() {
    if (!ctx) return;
    ruido(0.04, 0.08, 200);
    tono(60, 'sine', 0.04, 0.1);
}

function iniciarPasos(estaMoviendo) {
    if (estaMoviendo && !pasosInterval) {
        pasosInterval = setInterval(() => {
            if (ctx && ctx.state !== 'suspended') paso();
        }, 350);
    } else if (!estaMoviendo && pasosInterval) {
        clearInterval(pasosInterval);
        pasosInterval = null;
    }
}

// ── SONIDO DEL JEFE ───────────────────────────────────────────────────────
let jefeSonidoTimer = 0;
function tickJefe(tiempoJuego) {
    // Gruñido del jefe cada ~4 segundos
    if (tiempoJuego - jefeSonidoTimer < 4) return;
    jefeSonidoTimer = tiempoJuego;
    if (!ctx) return;
    reanudar();

    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    const dist = ctx.createWaveShaper();

    // Distorsión para efecto monstruoso
    const curve = new Float32Array(256);
    for (let i = 0; i < 256; i++) {
        const x = (i * 2) / 256 - 1;
        curve[i] = (Math.PI + 200) * x / (Math.PI + 200 * Math.abs(x));
    }
    dist.curve = curve;

    osc.connect(dist); dist.connect(gain); gain.connect(ctx.destination);
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(80, ctx.currentTime);
    osc.frequency.setValueAtTime(60, ctx.currentTime + 0.3);
    osc.frequency.setValueAtTime(90, ctx.currentTime + 0.5);
    gain.gain.setValueAtTime(0.2 * volumen, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.7);
    osc.start(); osc.stop(ctx.currentTime + 0.7);
}

// ── MÚSICA DE FONDO ───────────────────────────────────────────────────────
// Música procedural estilo azteca — osciladores + percusión
let musicLoop = null;
let beatCount = 0;

const ESCALA_AZTECA = [130, 146, 164, 174, 196, 220, 246, 261]; // escala menor

function tocarNota(freq, duracion, vol = 0.06) {
    if (!ctx) return;
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    const rev  = ctx.createConvolver ? null : null; // reverb opcional futuro
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = 'triangle';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol * volumen, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duracion);
    osc.start(); osc.stop(ctx.currentTime + duracion);
}

function tambor(vol = 0.12) {
    if (!ctx) return;
    ruido(0.08, vol, 150);
    tono(55, 'sine', 0.08, vol * 0.5);
}

function tambor2(vol = 0.07) {
    if (!ctx) return;
    ruido(0.04, vol, 400);
    tono(80, 'sine', 0.04, vol * 0.3);
}

function iniciarMusica() {
    if (musicaActiva || !ctx) return;
    musicaActiva = true;
    beatCount = 0;

    const BPM = 95;
    const beat = 60000 / BPM; // ms por beat

    function ciclo() {
        if (!musicaActiva) return;

        const b = beatCount % 16; // patrón de 16 beats

        // Tambor principal en beats 0, 4, 8, 12
        if (b % 4 === 0) tambor(0.12);

        // Tambor secundario en off-beats
        if (b % 2 === 1) tambor2(0.06);

        // Melodía azteca — flauta de caña sintetizada
        if (b === 0)  tocarNota(ESCALA_AZTECA[0], beat*1.5/1000, 0.07);
        if (b === 2)  tocarNota(ESCALA_AZTECA[2], beat*0.5/1000, 0.05);
        if (b === 3)  tocarNota(ESCALA_AZTECA[4], beat*1.0/1000, 0.06);
        if (b === 5)  tocarNota(ESCALA_AZTECA[3], beat*1.0/1000, 0.05);
        if (b === 7)  tocarNota(ESCALA_AZTECA[2], beat*0.5/1000, 0.04);
        if (b === 8)  tocarNota(ESCALA_AZTECA[5], beat*1.5/1000, 0.07);
        if (b === 10) tocarNota(ESCALA_AZTECA[4], beat*0.5/1000, 0.05);
        if (b === 11) tocarNota(ESCALA_AZTECA[6], beat*1.0/1000, 0.06);
        if (b === 13) tocarNota(ESCALA_AZTECA[5], beat*0.5/1000, 0.04);
        if (b === 14) tocarNota(ESCALA_AZTECA[7], beat*0.5/1000, 0.05);
        if (b === 15) tocarNota(ESCALA_AZTECA[4], beat*0.5/1000, 0.04);

        // Bajo — nota de bordón cada 4 beats
        if (b % 8 === 0) {
            const osc  = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain); gain.connect(ctx.destination);
            osc.type = 'sine';
            osc.frequency.value = ESCALA_AZTECA[0] / 2;
            gain.gain.setValueAtTime(0.08 * volumen, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + beat * 3 / 1000);
            osc.start(); osc.stop(ctx.currentTime + beat * 3 / 1000);
        }

        beatCount++;
        musicLoop = setTimeout(ciclo, beat);
    }

    ciclo();
}

function detenerMusica() {
    musicaActiva = false;
    if (musicLoop) { clearTimeout(musicLoop); musicLoop = null; }
}

// ── Volumen ───────────────────────────────────────────────────────────────
function setVolumen(v) {
    volumen = Math.max(0, Math.min(1, v));
}

function getVolumen() { return volumen; }

// ── API pública ───────────────────────────────────────────────────────────
return {
    init,
    reanudar,
    disparo,
    danio,
    muerteNPC,
    muerteJugador,
    respawn,
    moneda,
    corazon,
    ammo,
    paso,
    iniciarPasos,
    tickJefe,
    iniciarMusica,
    detenerMusica,
    setVolumen,
    getVolumen,
};

})();