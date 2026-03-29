// ── ESTADO GLOBAL ──────────────────────────────────────────────────────
const API = window.location.origin + '/api';
let token    = localStorage.getItem('aw_token');
let jugador  = JSON.parse(localStorage.getItem('aw_jugador') || 'null');
let socket   = null;
let buscando = false;
let todasSkins = [];

// ── ARRANQUE ────────────────────────────────────────────────────────────
window.onload = () => {
    if (token && jugador) {
        // Mostrar pantalla de acceso rápido — no auto-entrar
        mostrarAccesoRapido();
    }
};

// Pantalla de acceso rápido cuando hay sesión guardada
function mostrarAccesoRapido() {
    const ini = jugador.nombre?.[0]?.toUpperCase() || '?';
    const box = document.getElementById('accesoRapidoBox');
    if (box) {
        document.getElementById('arNombre').textContent = jugador.nombre;
        document.getElementById('arAvatar').textContent = ini;
        document.getElementById('arNivel').textContent  = `Nivel ${jugador.nivel || 1}`;
        const btn = document.getElementById('arNombreBtn');
        if (btn) btn.textContent = jugador.nombre.toUpperCase();
        box.style.display = 'block';
        document.getElementById('loginForm').style.display    = 'none';
        document.getElementById('registerForm').style.display = 'none';
        document.querySelectorAll('.auth-tabs').forEach(t => t.style.display = 'none');
    }
}

function continuarSesion() {
    mostrarApp();
    conectarSocket();
}

function cerrarSesionRapida() {
    token = null; jugador = null;
    localStorage.removeItem('aw_token');
    localStorage.removeItem('aw_jugador');
    const box = document.getElementById('accesoRapidoBox');
    if (box) box.style.display = 'none';
    document.querySelectorAll('.auth-tabs').forEach(t => t.style.display = 'flex');
    document.getElementById('loginForm').style.display = 'block';
}

// ── AUTH TABS ────────────────────────────────────────────────────────────
function setAuthTab(tab, btn) {
    document.querySelectorAll('.auth-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('loginForm').style.display    = tab==='login'    ? 'block' : 'none';
    document.getElementById('registerForm').style.display = tab==='register' ? 'block' : 'none';
    document.getElementById('authError').textContent = '';
}

// ── LOGIN ────────────────────────────────────────────────────────────────
async function login() {
    const email    = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    if (!email || !password) return setError('Completa todos los campos');
    try {
        const res  = await fetch(`${API}/auth/login`, {
            method:'POST', headers:{'Content-Type':'application/json'},
            body: JSON.stringify({ email, contrasena: password })
        });
        const data = await res.json();
        if (!res.ok) return setError(data.error);
        token   = data.token;
        jugador = data.jugador;
        localStorage.setItem('aw_token',   token);
        localStorage.setItem('aw_jugador', JSON.stringify(jugador));
        mostrarApp();
        conectarSocket();
        showToast(`¡Que comience la batalla, ${jugador.nombre}! ⚔️`);
    } catch { setError('Error de conexión'); }
}

// ── REGISTER ─────────────────────────────────────────────────────────────
async function register() {
    const nombre   = document.getElementById('regNombre').value.trim();
    const email    = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPassword').value;
    if (!nombre || !email || !password) return setError('Completa todos los campos');
    try {
        const res  = await fetch(`${API}/auth/register`, {
            method:'POST', headers:{'Content-Type':'application/json'},
            body: JSON.stringify({ nombre, email, contrasena: password })
        });
        const data = await res.json();
        if (!res.ok) return setError(data.error);
        setError('');
        showToast('¡Guerrero creado! Ahora inicia sesión');
        setAuthTab('login', document.querySelector('.auth-tab'));
    } catch { setError('Error de conexión'); }
}

// ── LOGOUT ───────────────────────────────────────────────────────────────
function logout() {
    if (socket) socket.disconnect();
    localStorage.removeItem('aw_token');
    localStorage.removeItem('aw_jugador');
    token = null; jugador = null; buscando = false;
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById('authScreen').classList.add('active');
}

// ── MOSTRAR APP ───────────────────────────────────────────────────────────
function mostrarApp() {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById('appScreen').classList.add('active');
    // Ocultar panel de auth que quedaba visible
    document.getElementById('authScreen').style.display = 'none';
    actualizarUI();
    cargarPerfil();
    cargarRanking('puntos', document.querySelector('.rtab'));
}

function actualizarUI() {
    if (!jugador) return;
    const ini = jugador.nombre?.[0]?.toUpperCase() || '?';
    setText('sideAvatar',  ini);
    setText('sideNombre',  jugador.nombre);
    setText('sideLevel',   `Nivel ${jugador.nivel || 1} · ${jugador.skin_activa || 'guerrero_base'}`);
    setText('sideKills',   jugador.kills_total   || 0);
    setText('sidePartidas',jugador.partidas_jugadas || 0);
    setText('sideMonedas', jugador.monedas        || 0);
    setText('sideXp',      jugador.experiencia    || 0);
    setText('headerNombre',jugador.nombre);

    // Stats inicio
    setText('statKills',   jugador.kills_total    || 0);
    setText('statMuertes', jugador.muertes_total  || 0);
    setText('statPartidas',jugador.partidas_jugadas || 0);
    setText('statGanadas', jugador.partidas_ganadas || 0);
    setText('statMonedas', jugador.monedas         || 0);
    const kd = jugador.muertes_total > 0
        ? (jugador.kills_total / jugador.muertes_total).toFixed(2)
        : (jugador.kills_total || 0).toFixed(2);
    setText('statKD', kd);

    // Barra XP
    const xpNivel = Math.pow(jugador.nivel || 1, 2) * 100;
    const pct = Math.min(100, Math.round((jugador.experiencia || 0) / xpNivel * 100));
    const bar = document.getElementById('sideXpBar');
    if (bar) bar.style.width = pct + '%';
}

// ── CARGAR PERFIL (fresco desde API) ─────────────────────────────────────
async function cargarPerfil() {
    try {
        const res = await fetch(`${API}/auth/perfil`, { headers:{authorization:token} });
        if (!res.ok) return;
        jugador = await res.json();
        localStorage.setItem('aw_jugador', JSON.stringify(jugador));
        actualizarUI();
        cargarSkins();
        cargarHistorial();
    } catch {}
}

// ── NAVEGACIÓN ────────────────────────────────────────────────────────────
function irPagina(id, btn) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById('page' + id.charAt(0).toUpperCase() + id.slice(1))
        .classList.add('active');

    document.querySelectorAll('.nav-btn,.mobile-nav-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
}

// ── MATCHMAKING ───────────────────────────────────────────────────────────
function buscarPartida() {
    if (buscando) return;
    buscando = true;
    document.getElementById('btnJugar').disabled = true;
    document.getElementById('colaStatus').style.display = 'flex';
    setText('colaTexto', 'Buscando batalla... (entrarás en 3s si no hay más guerreros)');
    socket.emit('buscar_partida', { skin: jugador.skin_activa });
}

function cancelarBusqueda() {
    buscando = false;
    socket.emit('cancelar_busqueda');
    document.getElementById('btnJugar').disabled = false;
    document.getElementById('colaStatus').style.display = 'none';
}

// ── SKINS ─────────────────────────────────────────────────────────────────
async function cargarSkins() {
    try {
        const [resSkins] = await Promise.all([
            fetch(`${API}/game/skins`)
        ]);
        todasSkins = await resSkins.json();
        renderSkins();
    } catch {}
}

function renderSkins() {
    const grid = document.getElementById('skinsGrid');
    if (!grid) return;
    const misSkinsClaves = (jugador.skins || []).map(s => s.clave || s);
    grid.innerHTML = todasSkins.map(skin => {
        const tengo    = misSkinsClaves.includes(skin.clave);
        const esActiva = jugador.skin_activa === skin.clave;
        const puedeNivel = (jugador.nivel || 1) >= skin.nivel_requerido;
        const puedeMonedas = (jugador.monedas || 0) >= skin.costo_monedas;

        const emoji = skinEmoji(skin.clave);
        let badgeClass, badgeText;
        if (esActiva)        { badgeClass='equipada';   badgeText='Equipada'; }
        else if (tengo)      { badgeClass='disponible'; badgeText='Disponible'; }
        else                 { badgeClass='bloqueada';  badgeText='Bloqueada'; }

        return `<div class="skin-card ${esActiva?'activa':''} ${!tengo?'bloqueada':''}"
                     onclick="accionSkin('${skin.clave}',${tengo},${esActiva})">
            <span class="skin-badge ${badgeClass}">${badgeText}</span>
            <div class="skin-preview">${emoji}</div>
            <div class="skin-name">${skin.nombre}</div>
            <div class="skin-desc">${skin.descripcion}</div>
            ${!tengo ? `<div class="skin-cost">🪙 ${skin.costo_monedas} monedas</div>
                        <div class="skin-nivel">Nivel ${skin.nivel_requerido} requerido</div>` :
                        `<div class="skin-cost" style="color:var(--jade)">✅ Desbloqueada</div>`}
        </div>`;
    }).join('');
}

function skinEmoji(clave) {
    const map = {
        guerrero_base:'⚔️', jaguar:'🐆', aguila:'🦅',
        sacerdote:'🔮', tlaloc:'🌧️', quetzalcoatl:'🐍',
        mictlantecuhtli:'💀', tonatiuh:'☀️'
    };
    return map[clave] || '🗡️';
}

async function accionSkin(clave, tengo, esActiva) {
    if (esActiva) return showToast('¡Ya tienes este guerrero equipado!');
    if (tengo) {
        // Equipar
        try {
            const res = await fetch(`${API}/auth/skin`, {
                method:'PATCH', headers:{'Content-Type':'application/json', authorization:token},
                body: JSON.stringify({ skin_clave: clave })
            });
            if (!res.ok) return;
            jugador.skin_activa = clave;
            localStorage.setItem('aw_jugador', JSON.stringify(jugador));
            actualizarUI(); renderSkins();
            showToast('⚔️ ¡Guerrero equipado!');
        } catch {}
    } else {
        // Comprar
        const skin = todasSkins.find(s => s.clave === clave);
        if (!skin) return;
        if ((jugador.nivel||1) < skin.nivel_requerido)
            return showToast(`Necesitas nivel ${skin.nivel_requerido}`);
        if ((jugador.monedas||0) < skin.costo_monedas)
            return showToast(`Necesitas ${skin.costo_monedas} 🪙`);
        if (!confirm(`¿Comprar ${skin.nombre} por ${skin.costo_monedas} 🪙?`)) return;
        try {
            const res = await fetch(`${API}/auth/comprar-skin`, {
                method:'POST', headers:{'Content-Type':'application/json', authorization:token},
                body: JSON.stringify({ skin_clave: clave })
            });
            const data = await res.json();
            if (!res.ok) return showToast(data.error);
            showToast(data.mensaje);
            cargarPerfil();
        } catch {}
    }
}

// ── RANKING ───────────────────────────────────────────────────────────────
async function cargarRanking(tipo, btn) {
    document.querySelectorAll('.rtab').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    try {
        const url = tipo === 'kd' ? `${API}/ranking/kd` : `${API}/ranking`;
        const res  = await fetch(url);
        const data = await res.json();
        const body = document.getElementById('rankingBody');
        if (!body) return;
        const medallas = ['🥇','🥈','🥉'];
        body.innerHTML = data.map((r, i) => `
            <tr>
                <td><span class="rank-pos ${i===0?'gold':i===1?'silver':i===2?'bronze':''}">${medallas[i]||i+1}</span></td>
                <td>
                    <div class="rank-name">${escapeHtml(r.nombre)} ${skinEmoji(r.skin_activa||'guerrero_base')}</div>
                    <div class="rank-nivel">Nivel ${r.nivel}</div>
                </td>
                <td>${r.nivel}</td>
                <td>${r.kills_total}</td>
                <td class="rank-kd">${r.kd_ratio}</td>
                <td>${r.partidas_ganadas||0}</td>
            </tr>
        `).join('');
    } catch {}
}

// ── HISTORIAL ─────────────────────────────────────────────────────────────
async function cargarHistorial() {
    try {
        const res  = await fetch(`${API}/game/historial`, { headers:{authorization:token} });
        const data = await res.json();
        const list = document.getElementById('historialList');
        if (!list) return;
        if (!data.length) { list.innerHTML = '<p style="color:var(--text2);text-align:center;padding:40px">Sin partidas aún</p>'; return; }
        list.innerHTML = data.map(p => `
            <div class="historial-item">
                <div>
                    <div class="hi-mapa">🏛️ ${p.mapa?.replace('_',' ') || 'Templo'}</div>
                    <div class="hi-fecha">${new Date(p.creada_en).toLocaleDateString('es-MX',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</div>
                </div>
                <div class="hi-stats">
                    <div class="hi-stat"><div class="v">${p.kills}</div><div class="l">Bajas</div></div>
                    <div class="hi-stat"><div class="v">${p.muertes}</div><div class="l">Muertes</div></div>
                    <div class="hi-stat"><div class="v" style="color:var(--gold)">${p.monedas_ganadas}</div><div class="l">🪙</div></div>
                </div>
                <div class="hi-pos ${p.posicion_final===1?'win':''}">
                    ${p.posicion_final===1?'🏆':'#'+p.posicion_final}
                </div>
            </div>
        `).join('');
    } catch {}
}

// ── SOCKET ────────────────────────────────────────────────────────────────
function conectarSocket() {
    socket = io({ auth: { token } });

    socket.on('connect', () => {
        console.log('🟢 Socket conectado');
        setText('onlineNum', '?');
    });

    socket.on('cola_actualizada', ({ enCola }) => {
        setText('onlineNum', enCola);
        if (buscando) setText('colaTexto', `En cola... (${enCola} guerrero${enCola!==1?'s':''} buscando)`);
    });

    socket.on('en_cola', ({ posicion }) => {
        setText('colaTexto', `Buscando guerreros... entrando en 30s`);
        // Countdown visual
        let seg = 30;
        if (window._colaTimer) clearInterval(window._colaTimer);
        window._colaTimer = setInterval(() => {
            seg--;
            if (seg <= 0) { clearInterval(window._colaTimer); return; }
            if (buscando) setText('colaTexto', `Buscando guerreros... entrando en ${seg}s`);
        }, 1000);
    });

    socket.on('partida_iniciada', (datos) => {
        buscando = false;
        document.getElementById('btnJugar').disabled = false;
        document.getElementById('colaStatus').style.display = 'none';
        // Guardar datos de la partida y abrir el juego
        sessionStorage.setItem('aw_partida', JSON.stringify(datos));
        sessionStorage.setItem('aw_socket_id', socket.id);
        showToast('⚔️ ¡Partida encontrada! Entrando al campo de batalla...');
        setTimeout(() => { window.location.href = '/game.html'; }, 1200);
    });

    socket.on('disconnect', () => console.log('🔴 Socket desconectado'));
    socket.on('connect_error', (e) => console.warn('Socket error:', e.message));
}

// ── UTILIDADES ────────────────────────────────────────────────────────────
function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
}
function setError(msg) {
    const el = document.getElementById('authError');
    if (el) el.textContent = msg;
}
function escapeHtml(t) {
    if (!t) return '';
    const d = document.createElement('div');
    d.textContent = t;
    return d.innerHTML;
}
function showToast(msg) {
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3200);
}