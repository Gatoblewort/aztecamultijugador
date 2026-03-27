const express = require('express');
const jwt     = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'aztec_secret_2024';

function autenticar(req, res, next) {
    const token = req.headers.authorization;
    if (!token) return res.status(401).json({ error: 'Sin token' });
    try { req.jugador = jwt.verify(token, JWT_SECRET); next(); }
    catch { res.status(401).json({ error: 'Token inválido' }); }
}

module.exports = (pool) => {
    const router = express.Router();

    // Historial de partidas del jugador
    router.get('/historial', autenticar, async (req, res) => {
        try {
            const { rows } = await pool.query(
                `SELECT pj.*, p.mapa, p.creada_en, p.duracion_segundos
                 FROM partida_jugadores pj
                 JOIN partidas p ON p.id=pj.partida_id
                 WHERE pj.jugador_id=$1
                 ORDER BY p.creada_en DESC LIMIT 20`,
                [req.jugador.id]
            );
            res.json(rows);
        } catch(e) { res.status(500).json({ error: 'Error' }); }
    });

    // Todas las skins disponibles
    router.get('/skins', async (req, res) => {
        try {
            const { rows } = await pool.query(`SELECT * FROM skins ORDER BY nivel_requerido, costo_monedas`);
            res.json(rows);
        } catch(e) { res.status(500).json({ error: 'Error' }); }
    });

    return router;
};
