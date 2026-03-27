const express  = require('express');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'aztec_secret_2024';

module.exports = (pool) => {
    const router = express.Router();

    // ── Registro ──────────────────────────────────────────────────────────────
    router.post('/register', async (req, res) => {
        const { nombre, email, contrasena } = req.body;
        if (!nombre || !email || !contrasena)
            return res.status(400).json({ error: 'Faltan campos' });
        if (nombre.length < 3 || nombre.length > 20)
            return res.status(400).json({ error: 'Nombre: 3–20 caracteres' });
        try {
            const hash = await bcrypt.hash(contrasena, 10);
            const { rows } = await pool.query(
                `INSERT INTO jugadores (nombre, email, contrasena)
                 VALUES ($1, $2, $3) RETURNING id, nombre, email, nivel, monedas, skin_activa`,
                [nombre.trim(), email.toLowerCase().trim(), hash]
            );
            // Dar skin base al nuevo jugador
            await pool.query(
                `INSERT INTO jugador_skins (jugador_id, skin_clave) VALUES ($1,'guerrero_base')
                 ON CONFLICT DO NOTHING`, [rows[0].id]
            );
            res.json({ ok: true, mensaje: '¡Cuenta creada! Que comience la batalla.' });
        } catch(e) {
            if (e.code === '23505') {
                const campo = e.detail?.includes('email') ? 'Email' : 'Nombre de guerrero';
                return res.status(409).json({ error: `${campo} ya en uso` });
            }
            res.status(500).json({ error: 'Error del servidor' });
        }
    });

    // ── Login ──────────────────────────────────────────────────────────────────
    router.post('/login', async (req, res) => {
        const { email, contrasena } = req.body;
        if (!email || !contrasena)
            return res.status(400).json({ error: 'Faltan campos' });
        try {
            const { rows } = await pool.query(
                `SELECT j.*,
                    (SELECT json_agg(skin_clave) FROM jugador_skins WHERE jugador_id=j.id) as skins_desbloqueadas
                 FROM jugadores j WHERE email=$1`, [email.toLowerCase().trim()]
            );
            if (!rows[0]) return res.status(401).json({ error: 'Credenciales incorrectas' });
            const ok = await bcrypt.compare(contrasena, rows[0].contrasena);
            if (!ok) return res.status(401).json({ error: 'Credenciales incorrectas' });

            const jugador = rows[0];
            delete jugador.contrasena;

            const token = jwt.sign({
                id: jugador.id, nombre: jugador.nombre,
                nivel: jugador.nivel, skin_activa: jugador.skin_activa
            }, JWT_SECRET, { expiresIn: '7d' });

            res.json({ token, jugador });
        } catch(e) { res.status(500).json({ error: 'Error del servidor' }); }
    });

    // ── Perfil ─────────────────────────────────────────────────────────────────
    router.get('/perfil', autenticar, async (req, res) => {
        try {
            const { rows } = await pool.query(
                `SELECT j.id, j.nombre, j.email, j.nivel, j.experiencia, j.monedas,
                        j.kills_total, j.muertes_total, j.partidas_jugadas, j.partidas_ganadas,
                        j.skin_activa, j.creado_en,
                        (SELECT json_agg(s.*) FROM skins s
                         JOIN jugador_skins js ON js.skin_clave=s.clave
                         WHERE js.jugador_id=j.id) as skins
                 FROM jugadores j WHERE j.id=$1`, [req.jugador.id]
            );
            if (!rows[0]) return res.status(404).json({ error: 'Jugador no encontrado' });
            res.json(rows[0]);
        } catch(e) { res.status(500).json({ error: 'Error' }); }
    });

    // ── Cambiar skin ──────────────────────────────────────────────────────────
    router.patch('/skin', autenticar, async (req, res) => {
        const { skin_clave } = req.body;
        try {
            // Verificar que la tiene desbloqueada
            const { rows } = await pool.query(
                `SELECT 1 FROM jugador_skins WHERE jugador_id=$1 AND skin_clave=$2`,
                [req.jugador.id, skin_clave]
            );
            if (!rows[0]) return res.status(403).json({ error: 'Skin no desbloqueada' });
            await pool.query(
                `UPDATE jugadores SET skin_activa=$1 WHERE id=$2`,
                [skin_clave, req.jugador.id]
            );
            res.json({ ok: true });
        } catch(e) { res.status(500).json({ error: 'Error' }); }
    });

    // ── Comprar skin ──────────────────────────────────────────────────────────
    router.post('/comprar-skin', autenticar, async (req, res) => {
        const { skin_clave } = req.body;
        try {
            const { rows: skinRows } = await pool.query(
                `SELECT * FROM skins WHERE clave=$1`, [skin_clave]
            );
            if (!skinRows[0]) return res.status(404).json({ error: 'Skin no existe' });
            const skin = skinRows[0];

            const { rows: jRows } = await pool.query(
                `SELECT nivel, monedas FROM jugadores WHERE id=$1`, [req.jugador.id]
            );
            const jug = jRows[0];
            if (jug.nivel < skin.nivel_requerido)
                return res.status(403).json({ error: `Necesitas nivel ${skin.nivel_requerido}` });
            if (jug.monedas < skin.costo_monedas)
                return res.status(403).json({ error: 'Monedas insuficientes' });

            // Verificar que no la tenga
            const { rows: yaRows } = await pool.query(
                `SELECT 1 FROM jugador_skins WHERE jugador_id=$1 AND skin_clave=$2`,
                [req.jugador.id, skin_clave]
            );
            if (yaRows[0]) return res.status(409).json({ error: 'Ya tienes esta skin' });

            await pool.query(
                `UPDATE jugadores SET monedas=monedas-$1 WHERE id=$2`,
                [skin.costo_monedas, req.jugador.id]
            );
            await pool.query(
                `INSERT INTO jugador_skins (jugador_id, skin_clave) VALUES ($1,$2)`,
                [req.jugador.id, skin_clave]
            );
            res.json({ ok: true, mensaje: `¡${skin.nombre} desbloqueada!` });
        } catch(e) { res.status(500).json({ error: 'Error' }); }
    });

    // ── Middleware auth ────────────────────────────────────────────────────────
    function autenticar(req, res, next) {
        const token = req.headers.authorization;
        if (!token) return res.status(401).json({ error: 'Sin token' });
        try {
            req.jugador = jwt.verify(token, JWT_SECRET);
            next();
        } catch { res.status(401).json({ error: 'Token inválido' }); }
    }

    return router;
};
