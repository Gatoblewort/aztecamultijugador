const express = require('express');

module.exports = (pool) => {
    const router = express.Router();

    // Top 50 global
    router.get('/', async (req, res) => {
        try {
            const { rows } = await pool.query(
                `SELECT nombre, nivel, kills_total, muertes_total,
                        partidas_jugadas, partidas_ganadas, skin_activa,
                        CASE WHEN muertes_total=0 THEN kills_total
                             ELSE ROUND(kills_total::numeric/muertes_total,2) END as kd_ratio,
                        (kills_total*10 + partidas_ganadas*50) as puntos
                 FROM jugadores
                 ORDER BY puntos DESC, kills_total DESC
                 LIMIT 50`
            );
            res.json(rows);
        } catch(e) { res.status(500).json({ error: 'Error' }); }
    });

    // Top por K/D ratio
    router.get('/kd', async (req, res) => {
        try {
            const { rows } = await pool.query(
                `SELECT nombre, nivel, kills_total, muertes_total, skin_activa,
                        CASE WHEN muertes_total=0 THEN kills_total
                             ELSE ROUND(kills_total::numeric/muertes_total,2) END as kd_ratio
                 FROM jugadores WHERE partidas_jugadas >= 3
                 ORDER BY kd_ratio DESC LIMIT 50`
            );
            res.json(rows);
        } catch(e) { res.status(500).json({ error: 'Error' }); }
    });

    return router;
};
