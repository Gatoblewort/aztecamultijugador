// ═══════════════════════════════════════════════════════════════════════════
//  AZTEC WAR — SKINS.JS
//  Archivo de skins en pixel art procedural
//
//  CÓMO AGREGAR UNA SKIN NUEVA:
//  1. Agrega una entrada en el objeto SKINS con el nombre de tu skin
//  2. Define las funciones: body, head, legs, weapon, shadow
//  3. Cada función recibe: (ctx, x, y, w, h, t, bright)
//     - ctx     = canvas context 2D
//     - x,y     = esquina superior izquierda del sprite en pantalla
//     - w,h     = ancho y alto del sprite
//     - t       = tiempo (para animaciones), úsalo en sin/cos para animar
//     - bright  = brillo 0.0-1.0 (distancia al jugador)
//
//  HELPER: usa C(r,g,b,bright) para colores que respetan el brillo
// ═══════════════════════════════════════════════════════════════════════════

const SKINS = {};

// ── Helper: color con brillo aplicado ────────────────────────────────────
function C(r, g, b, bright=1) {
    return `rgb(${Math.floor(r*bright)},${Math.floor(g*bright)},${Math.floor(b*bright)})`;
}

// ── Fracción de la altura total ───────────────────────────────────────────
// En vez de hardcodear píxeles, usa fracciones del alto/ancho del sprite
// p.ej: PY(0.5) = mitad de la altura

// ══════════════════════════════════════════════════════════════════════════
//  CONQUISTADOR ESPAÑOL (enemigo NPC)
// ══════════════════════════════════════════════════════════════════════════
SKINS.conquistador = {
    nombre: 'Conquistador',

    draw(ctx, x, y, w, h, t, bright, aiEstado, flashTs=0) {
        const br   = bright;
        const B    = (r,g,b) => C(r,g,b,br);
        // Walk: solo desplazamiento Y muy pequeño, NO modifica altura
        const wk   = Math.sin(t * 7) * h * 0.008;
        const R    = (fx,fy,fw,fh,r,g,b) => {
            ctx.fillStyle = B(r,g,b);
            ctx.fillRect(x+fx*w, y+fy*h, fw*w, fh*h);
        };
        const msSinceFlash = Date.now() - flashTs;
        const flashActivo  = flashTs > 0 && msSinceFlash < 200;
        const enCombate    = aiEstado && aiEstado !== 'patrol';

        // ── SOMBRA ────────────────────────────────────────────────────────
        ctx.fillStyle = 'rgba(0,0,0,0.38)';
        ctx.beginPath();
        ctx.ellipse(x+w*0.50, y+h*0.99, w*0.30, h*0.030, 0, 0, Math.PI*2);
        ctx.fill();

        // ════════════════════════════════════════════════════════
        //  ESCUDO izquierda
        // ════════════════════════════════════════════════════════
        const shCX = x+w*0.11, shCY = y+h*0.52, shR = w*0.185;
        ctx.fillStyle = B(100,105,115);
        ctx.beginPath(); ctx.arc(shCX, shCY, shR, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = B(162,128,48);
        ctx.beginPath(); ctx.arc(shCX, shCY, shR*0.85, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = B(118,92,28);
        ctx.beginPath(); ctx.arc(shCX, shCY, shR*0.42, 0, Math.PI*2); ctx.fill();
        // Cruz del escudo
        ctx.fillStyle = B(192,16,16);
        ctx.fillRect(shCX-shR*0.72, shCY-shR*0.22, shR*1.44, shR*0.44);
        ctx.fillRect(shCX-shR*0.22, shCY-shR*0.72, shR*0.44, shR*1.44);
        ctx.fillStyle = B(210,22,22);
        ctx.fillRect(shCX-shR*0.22, shCY-shR*0.22, shR*0.44, shR*0.44);
        ctx.fillStyle = `rgba(255,255,255,${br*0.22})`;
        ctx.beginPath(); ctx.arc(shCX-shR*0.28, shCY-shR*0.30, shR*0.28, 0, Math.PI*2); ctx.fill();

        // ════════════════════════════════════════════════════════
        //  PIERNAS — walk solo en Y, tamaño fijo
        // ════════════════════════════════════════════════════════
        // Pierna izq sube cuando pierna der baja (alternado)
        const wkL =  wk, wkR = -wk;
        // Muslos
        R(0.225, 0.640+wkL, 0.240, 0.155,  142,147,157);
        R(0.535, 0.640+wkR, 0.240, 0.155,  142,147,157);
        R(0.228, 0.643+wkL, 0.072, 0.145,  172,177,187);
        R(0.538, 0.643+wkR, 0.072, 0.145,  172,177,187);
        // Rodilleras
        R(0.215, 0.790+wkL, 0.260, 0.055,  102,107,117);
        R(0.525, 0.790+wkR, 0.260, 0.055,  102,107,117);
        R(0.238, 0.794+wkL, 0.075, 0.036,  155,160,170);
        R(0.548, 0.794+wkR, 0.075, 0.036,  155,160,170);
        // Espinillas
        R(0.228, 0.840+wkL, 0.230, 0.085,  138,143,153);
        R(0.538, 0.840+wkR, 0.230, 0.085,  138,143,153);
        R(0.232, 0.843+wkL, 0.068, 0.075,  165,170,180);
        // Botas
        R(0.195, 0.920+wkL, 0.285, 0.038,  78,52,24);
        R(0.195, 0.953+wkL, 0.285, 0.024,  58,38,14);
        R(0.185, 0.972+wkL, 0.305, 0.020,  36,22,8);
        R(0.528, 0.920+wkR, 0.285, 0.038,  78,52,24);
        R(0.528, 0.953+wkR, 0.285, 0.024,  58,38,14);
        R(0.518, 0.972+wkR, 0.305, 0.020,  36,22,8);

        // ════════════════════════════════════════════════════════
        //  CINTURÓN + FALDÓN
        // ════════════════════════════════════════════════════════
        R(0.220, 0.618, 0.560, 0.030,  62,42,18);
        R(0.440, 0.618, 0.120, 0.030,  148,112,32);
        R(0.458, 0.620, 0.072, 0.024,  188,148,42);
        R(0.248, 0.644, 0.095, 0.045,  74,50,20);
        R(0.388, 0.644, 0.095, 0.042,  64,42,16);
        R(0.528, 0.644, 0.095, 0.045,  74,50,20);

        // ════════════════════════════════════════════════════════
        //  TORSO + PETO
        // ════════════════════════════════════════════════════════
        R(0.228, 0.285, 0.544, 0.338,  150,155,165);
        R(0.468, 0.290, 0.058, 0.328,  92,97,107);
        R(0.228, 0.370, 0.544, 0.015,  105,110,120);
        R(0.228, 0.460, 0.544, 0.015,  105,110,120);
        R(0.228, 0.548, 0.544, 0.015,  105,110,120);
        R(0.232, 0.288, 0.082, 0.330,  188,193,203);
        R(0.235, 0.290, 0.038, 0.325,  208,213,223);
        R(0.708, 0.288, 0.058, 0.332,  105,108,118);
        // Cruz roja — barra H
        R(0.288, 0.340, 0.002, 0.118,  138,10,10);
        R(0.288, 0.340, 0.424, 0.002,  138,10,10);
        R(0.288, 0.456, 0.424, 0.002,  138,10,10);
        R(0.710, 0.340, 0.002, 0.118,  138,10,10);
        R(0.290, 0.342, 0.420, 0.112,  198,20,20);
        // Cruz roja — barra V
        R(0.422, 0.290, 0.002, 0.318,  138,10,10);
        R(0.422, 0.290, 0.156, 0.002,  138,10,10);
        R(0.576, 0.290, 0.002, 0.318,  138,10,10);
        R(0.422, 0.606, 0.156, 0.002,  138,10,10);
        R(0.424, 0.292, 0.152, 0.316,  198,20,20);
        R(0.424, 0.342, 0.152, 0.112,  215,25,25);

        // ════════════════════════════════════════════════════════
        //  HOMBRERAS ROJAS
        // ════════════════════════════════════════════════════════
        R(0.062, 0.248, 0.200, 0.026,  105,110,120);
        R(0.055, 0.270, 0.210, 0.088,  178,22,22);
        R(0.058, 0.273, 0.065, 0.076,  205,35,35);
        R(0.055, 0.353, 0.210, 0.018,  105,110,120);
        R(0.072, 0.278, 0.025, 0.018,  130,135,145);
        R(0.148, 0.278, 0.025, 0.018,  130,135,145);
        R(0.738, 0.248, 0.200, 0.026,  105,110,120);
        R(0.735, 0.270, 0.210, 0.088,  178,22,22);
        R(0.835, 0.273, 0.065, 0.076,  205,35,35);
        R(0.735, 0.353, 0.210, 0.018,  105,110,120);
        R(0.748, 0.278, 0.025, 0.018,  130,135,145);
        R(0.825, 0.278, 0.025, 0.018,  130,135,145);

        // ════════════════════════════════════════════════════════
        //  BRAZOS
        // ════════════════════════════════════════════════════════
        R(0.060, 0.352, 0.152, 0.132,  135,140,150);
        R(0.062, 0.355, 0.048, 0.125,  165,170,180);
        R(0.048, 0.468, 0.165, 0.043,  102,107,117);
        R(0.062, 0.505, 0.138, 0.100,  132,137,147);
        R(0.788, 0.352, 0.152, 0.132,  135,140,150);
        R(0.852, 0.355, 0.048, 0.125,  165,170,180);
        R(0.788, 0.468, 0.165, 0.043,  102,107,117);
        R(0.800, 0.505, 0.138, 0.100,  132,137,147);
        // Guantelete derecho
        R(0.798, 0.598, 0.145, 0.060,  92,97,107);
        R(0.802, 0.602, 0.092, 0.043,  112,117,127);
        R(0.802, 0.602, 0.020, 0.040,  122,127,137);
        R(0.824, 0.602, 0.020, 0.040,  122,127,137);
        R(0.846, 0.602, 0.020, 0.040,  122,127,137);

        // ════════════════════════════════════════════════════════
        //  PISTOLA / ARCABUZ
        // ════════════════════════════════════════════════════════
        R(0.805, 0.560, 0.095, 0.142,  85,50,20);
        R(0.810, 0.564, 0.052, 0.090,  105,62,26);
        R(0.818, 0.572, 0.025, 0.058,  125,76,30);
        R(0.658, 0.558, 0.152, 0.053,  70,70,76);
        R(0.662, 0.561, 0.105, 0.030,  90,90,96);
        R(0.718, 0.558, 0.024, 0.015,  142,118,35);
        R(0.778, 0.612, 0.030, 0.058,  62,62,68);
        R(0.755, 0.628, 0.068, 0.012,  52,52,58);
        R(0.755, 0.665, 0.068, 0.012,  52,52,58);
        R(0.755, 0.628, 0.010, 0.050,  52,52,58);
        R(0.815, 0.628, 0.010, 0.050,  52,52,58);
        // Cañón largo
        R(0.015, 0.566, 0.648, 0.062,  50,50,56);
        R(0.018, 0.570, 0.635, 0.033,  70,70,76);
        R(0.018, 0.572, 0.575, 0.015,  86,86,92);
        // Boca del cañón
        R(-0.075, 0.558, 0.095, 0.078,  40,40,46);
        R(-0.062, 0.563, 0.068, 0.063,  26,26,32);
        R(-0.052, 0.570, 0.045, 0.048,  15,15,20);
        R(-0.080, 0.556, 0.020, 0.082,  36,36,42);

        // ════════════════════════════════════════════════════════
        //  FLASH DE DISPARO sincronizado
        // ════════════════════════════════════════════════════════
        if (flashActivo) {
            const alpha = Math.max(0, 1 - msSinceFlash / 200) * br;
            const fx = x - w*0.052, fy = y + h*0.597;
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.fillStyle = `rgb(255,115,0)`;
            ctx.beginPath(); ctx.arc(fx, fy, w*0.125, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = `rgb(255,218,55)`;
            ctx.beginPath(); ctx.arc(fx, fy, w*0.088, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = `rgb(255,252,195)`;
            ctx.beginPath(); ctx.arc(fx, fy, w*0.055, 0, Math.PI*2); ctx.fill();
            const rayos = [
                [Math.PI,       0.32, 0.028],
                [Math.PI*1.25,  0.20, 0.020],
                [Math.PI*0.75,  0.20, 0.020],
                [Math.PI*1.5,   0.15, 0.016],
                [Math.PI*0.5,   0.15, 0.016],
                [Math.PI*1.38,  0.11, 0.013],
                [Math.PI*0.62,  0.11, 0.013],
                [0,             0.08, 0.011],
            ];
            rayos.forEach(([ang, len, gros]) => {
                ctx.save(); ctx.translate(fx, fy); ctx.rotate(ang);
                ctx.fillStyle = `rgb(255,95,0)`;
                ctx.fillRect(0, -gros*w*1.2, len*w, gros*w*2.4);
                ctx.fillStyle = `rgb(255,225,75)`;
                ctx.fillRect(0, -gros*w*0.5, len*w*0.72, gros*w*1.0);
                ctx.restore();
            });
            ctx.fillStyle = `rgb(255,255,255)`;
            ctx.beginPath(); ctx.arc(fx, fy, w*0.028, 0, Math.PI*2); ctx.fill();
            ctx.restore();
        }

        // ════════════════════════════════════════════════════════
        //  GORGUERA
        // ════════════════════════════════════════════════════════
        R(0.318, 0.242, 0.364, 0.020,  128,133,143);
        R(0.326, 0.260, 0.348, 0.017,  115,120,130);
        R(0.334, 0.275, 0.332, 0.015,  102,107,117);
        R(0.340, 0.288, 0.320, 0.010,  92,97,107);

        // ════════════════════════════════════════════════════════
        //  CABEZA — expresión amenazante, cara de malo
        // ════════════════════════════════════════════════════════
        // Cara base (tono piel más oscuro/curtido)
        R(0.298, 0.130, 0.404, 0.138,  195,148,112);
        // Mejillas hundidas (sombra lateral)
        R(0.298, 0.148, 0.060, 0.075,  165,122,88);
        R(0.622, 0.148, 0.060, 0.075,  165,122,88);
        // Pómulos marcados (más oscuros en los lados)
        R(0.298, 0.130, 0.048, 0.138,  148,108,78);
        R(0.634, 0.130, 0.048, 0.138,  148,108,78);
        // Nariz ancha y prominente
        R(0.448, 0.158, 0.068, 0.060,  172,132,98);
        R(0.455, 0.162, 0.052, 0.042,  188,145,108);
        R(0.448, 0.178, 0.022, 0.020,  138,98,68); // ventana izq nariz
        R(0.498, 0.178, 0.022, 0.020,  138,98,68); // ventana der nariz
        // Boca — labios apretados, gesto agresivo (línea recta)
        R(0.368, 0.215, 0.150, 0.016,  138,88,62); // labio superior
        R(0.360, 0.228, 0.165, 0.018,  108,62,38); // labio inferior / sombra
        // Comisuras hacia abajo (cara de malo)
        R(0.360, 0.212, 0.018, 0.025,  108,72,48);
        R(0.500, 0.212, 0.018, 0.025,  108,72,48);
        // Barba tupida y oscura
        R(0.308, 0.220, 0.375, 0.055,  62,38,18);
        R(0.318, 0.218, 0.270, 0.032,  78,50,24);
        R(0.340, 0.215, 0.175, 0.020,  92,60,28);
        // Bigote grueso que conecta con la barba
        R(0.345, 0.188, 0.155, 0.032,  62,38,18);
        R(0.358, 0.190, 0.115, 0.022,  80,52,24);
        // Sombra bajo los pómulos
        R(0.298, 0.188, 0.055, 0.030,  155,112,78);
        R(0.628, 0.188, 0.055, 0.030,  155,112,78);
        // Cicatriz facial (detalle de malo)
        R(0.348, 0.148, 0.012, 0.045,  155,108,75);
        R(0.350, 0.148, 0.008, 0.040,  178,128,90);

        // ════════════════════════════════════════════════════════
        //  MORIÓN ESPAÑOL — ala ancha
        // ════════════════════════════════════════════════════════
        R(0.358, -0.040, 0.284, 0.040,  145,150,160);
        R(0.312, -0.002, 0.376, 0.046,  152,157,167);
        R(0.272,  0.042, 0.456, 0.046,  150,155,165);
        R(0.248,  0.084, 0.504, 0.040,  145,150,160);
        // Cimera
        R(0.464, -0.060, 0.072, 0.105,  115,120,130);
        R(0.474, -0.056, 0.052, 0.095,  138,143,153);
        R(0.482, -0.052, 0.036, 0.082,  160,165,175);
        R(0.488, -0.046, 0.024, 0.060,  180,185,195);
        // Ala izquierda ancha
        R(0.020,  0.112, 0.240, 0.040,  138,143,153);
        R(0.010,  0.120, 0.258, 0.026,  125,130,140);
        R(0.002,  0.130, 0.265, 0.016,  112,117,127);
        R(-0.005, 0.140, 0.268, 0.010,  98,103,113);
        // Ala derecha
        R(0.740,  0.112, 0.240, 0.040,  138,143,153);
        R(0.732,  0.120, 0.258, 0.026,  125,130,140);
        R(0.733,  0.130, 0.265, 0.016,  112,117,127);
        R(0.737,  0.140, 0.268, 0.010,  98,103,113);
        // Visera frontal
        R(0.268, 0.122, 0.464, 0.034,  132,137,147);
        R(0.278, 0.150, 0.180, 0.020,  118,123,133);
        R(0.542, 0.150, 0.155, 0.020,  118,123,133);
        R(0.358, 0.150, 0.188, 0.020,  105,110,120);
        R(0.240, 0.124, 0.520, 0.013,  95,100,110);
        // Brillos casco
        R(0.275,  0.002, 0.108, 0.103,  190,195,205);
        R(0.282,  0.005, 0.055, 0.093,  206,211,221);
        R(0.375, -0.032, 0.045, 0.053,  192,197,207);
        R(0.670,  0.045, 0.070, 0.080,  105,108,118);
        // Remaches
        R(0.280, 0.092, 0.020, 0.016,  170,175,185);
        R(0.480, 0.092, 0.020, 0.016,  170,175,185);
        R(0.700, 0.092, 0.020, 0.016,  170,175,185);

        // ════════════════════════════════════════════════════════
        //  PLUMAS bicolor animadas
        // ════════════════════════════════════════════════════════
        const nSeg = 7;
        for (let i = 0; i < nSeg; i++) {
            const pf = i / nSeg;
            const sw = Math.sin(t*3.2 + i*0.55) * w * 0.015;
            ctx.fillStyle = B(185-i*5, 14+i*3, 14);
            ctx.fillRect(x+w*(0.318+pf*0.052)+sw, y+h*(-0.035-pf*0.058),
                         w*(0.054-pf*0.004), h*(0.066+pf*0.004));
            ctx.fillStyle = B(138-i*3, 8, 8);
            const rw2 = w*(0.054-pf*0.004);
            ctx.fillRect(x+w*(0.318+pf*0.052)+sw+rw2*0.42,
                         y+h*(-0.035-pf*0.058), rw2*0.16, h*(0.066+pf*0.004));
        }
        for (let i = 0; i < nSeg-1; i++) {
            const pf = i / nSeg;
            const sw = Math.sin(t*3.8 + i*0.65 + 1.4) * w * 0.014;
            ctx.fillStyle = B(212+i*4, 165+i*8, 16+i*3);
            ctx.fillRect(x+w*(0.524+pf*0.045)+sw, y+h*(-0.025-pf*0.048),
                         w*(0.050-pf*0.003), h*(0.060+pf*0.004));
            ctx.fillStyle = B(162+i*3, 122+i*5, 10);
            const yw2 = w*(0.050-pf*0.003);
            ctx.fillRect(x+w*(0.524+pf*0.045)+sw+yw2*0.42,
                         y+h*(-0.025-pf*0.048), yw2*0.16, h*(0.060+pf*0.004));
        }

        // ════════════════════════════════════════════════════════
        //  OJOS — expresión agresiva, siempre amenazante
        // ════════════════════════════════════════════════════════
        const eyeY = y + h*0.150;
        // Sombra de cuenca del ojo (hace la mirada más dura)
        R(0.322, 0.138, 0.130, 0.062,  148,108,75);
        R(0.545, 0.138, 0.130, 0.062,  148,108,75);
        // Blanco del ojo (reducido — mirada entrecerrada)
        R(0.335, 0.150, 0.108, 0.038,  210,210,210);
        R(0.558, 0.150, 0.108, 0.038,  210,210,210);
        // Iris siempre rojizo (malo siempre)
        ctx.fillStyle = enCombate ? B(220,12,12) : B(168,28,28);
        ctx.fillRect(x+w*0.348, eyeY+h*0.005, w*0.072, h*0.026);
        ctx.fillRect(x+w*0.570, eyeY+h*0.005, w*0.072, h*0.026);
        // Pupila vertical (reptiliana/malévola)
        ctx.fillStyle = B(8,4,4);
        ctx.fillRect(x+w*0.375, eyeY+h*0.004, w*0.018, h*0.030);
        ctx.fillRect(x+w*0.598, eyeY+h*0.004, w*0.018, h*0.030);
        // Brillo ojo pequeño (destello frío)
        ctx.fillStyle = B(255,200,200);
        ctx.fillRect(x+w*0.350, eyeY+h*0.007, w*0.012, h*0.010);
        ctx.fillRect(x+w*0.572, eyeY+h*0.007, w*0.012, h*0.010);
        // Cejas muy fruncidas (siempre enojado)
        // Ceja izquierda — inclinada hacia el centro (V)
        R(0.328, 0.128, 0.125, 0.018,  42,25,10);
        R(0.328, 0.128, 0.125, 0.010,  58,35,15);
        // Ceja derecha — espejada
        R(0.548, 0.128, 0.125, 0.018,  42,25,10);
        R(0.548, 0.128, 0.125, 0.010,  58,35,15);
        // Fruncido central (arrugas entre cejas)
        R(0.452, 0.128, 0.020, 0.025,  148,108,75);
        R(0.478, 0.128, 0.020, 0.025,  148,108,75);
        R(0.455, 0.125, 0.015, 0.012,  165,122,88);
        R(0.480, 0.125, 0.015, 0.012,  165,122,88);
    }
};

// ══════════════════════════════════════════════════════════════════════════
//  GUERRERO AZTECA BASE
// ══════════════════════════════════════════════════════════════════════════
SKINS.guerrero_base = {
    nombre: 'Guerrero Azteca',

    // Paleta de colores de la skin
    piel:     [180, 130, 70],
    armadura: [80,  60,  30],
    penacho:  [204, 68,   0],

    draw(ctx, x, y, w, h, t, bright) {
        const br = bright;
        const [pr,pg,pb] = this.piel;
        const [ar,ag,ab] = this.armadura;
        const walk = Math.sin(t*8) * h * 0.05;

        // Sombra
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.beginPath();
        ctx.ellipse(x+w/2, y+h, w*0.3, h*0.04, 0, 0, Math.PI*2);
        ctx.fill();

        // Penacho (plumas arriba de la cabeza)
        const plumas = [[0.25,0],[0.38,-0.06],[0.50,-0.08],[0.62,-0.06],[0.75,0]];
        plumas.forEach(([fx, fy], i) => {
            const swing = Math.sin(t*3 + i*0.8) * w * 0.02;
            ctx.fillStyle = i%2===0 ? C(this.penacho[0],this.penacho[1],this.penacho[2],br)
                                    : C(255,215,0,br);
            ctx.fillRect(x+w*fx+swing, y+h*fy-h*0.08, w*0.10, h*0.10);
        });

        // Piernas
        ctx.fillStyle = C(ar,ag,ab, br);
        ctx.fillRect(x+w*0.20, y+h*0.65, w*0.25, h*0.30+walk);
        ctx.fillRect(x+w*0.55, y+h*0.65, w*0.25, h*0.30-walk);

        // Faja/taparrabos
        ctx.fillStyle = C(this.penacho[0],this.penacho[1],this.penacho[2], br);
        ctx.fillRect(x+w*0.25, y+h*0.60, w*0.50, h*0.10);

        // Torso — pectoral de jade
        ctx.fillStyle = C(ar,ag,ab, br);
        ctx.fillRect(x+w*0.20, y+h*0.30, w*0.60, h*0.32);

        // Decoración del pectoral
        ctx.fillStyle = C(0,168,107, br);
        ctx.fillRect(x+w*0.35, y+h*0.33, w*0.30, h*0.12);

        // Brazos con brazaletes
        ctx.fillStyle = C(pr,pg,pb, br);
        ctx.fillRect(x+w*0.04, y+h*0.30, w*0.16, h*0.30);
        ctx.fillRect(x+w*0.80, y+h*0.30, w*0.16, h*0.30);

        // Brazaletes dorados
        ctx.fillStyle = C(255,215,0, br);
        ctx.fillRect(x+w*0.03, y+h*0.50, w*0.18, h*0.05);
        ctx.fillRect(x+w*0.79, y+h*0.50, w*0.18, h*0.05);

        // Arma (macuahuitl) en mano derecha
        ctx.fillStyle = C(120,70,25, br);
        ctx.fillRect(x+w*0.82, y+h*0.20, w*0.10, h*0.50);
        ctx.fillStyle = C(15,15,30, br);
        ctx.fillRect(x+w*0.78, y+h*0.20, w*0.06, h*0.40);
        // Filos de obsidiana
        ctx.fillStyle = C(200,200,240, br);
        for (let i=0;i<3;i++)
            ctx.fillRect(x+w*0.77, y+h*(0.22+i*0.12), w*0.04, h*0.06);

        // Cabeza
        ctx.fillStyle = C(pr,pg,pb, br);
        ctx.fillRect(x+w*0.30, y+h*0.05, w*0.40, h*0.26);

        // Ojos
        ctx.fillStyle = C(30,20,10, br);
        ctx.fillRect(x+w*0.36, y+h*0.12, w*0.10, h*0.06);
        ctx.fillRect(x+w*0.54, y+h*0.12, w*0.10, h*0.06);

        // Pintura de guerra (rayas en la cara)
        ctx.fillStyle = C(200,20,20, br);
        ctx.fillRect(x+w*0.32, y+h*0.18, w*0.36, h*0.03);
    }
};

// ══════════════════════════════════════════════════════════════════════════
//  CABALLERO JAGUAR
// ══════════════════════════════════════════════════════════════════════════
SKINS.jaguar = {
    nombre: 'Caballero Jaguar',
    piel:     [140,  90,  50],
    armadura: [160, 120,  40],
    penacho:  [99,   66,   0],

    draw(ctx, x, y, w, h, t, bright) {
        const br = bright;
        const walk = Math.sin(t*8) * h * 0.05;

        // Sombra
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.ellipse(x+w/2, y+h, w*0.3, h*0.04, 0, 0, Math.PI*2);
        ctx.fill();

        // Piernas con piel de jaguar
        ctx.fillStyle = C(160,120,40, br);
        ctx.fillRect(x+w*0.20, y+h*0.65, w*0.25, h*0.30+walk);
        ctx.fillRect(x+w*0.55, y+h*0.65, w*0.25, h*0.30-walk);
        // Manchas del jaguar en piernas
        ctx.fillStyle = C(80,50,20, br);
        ctx.fillRect(x+w*0.22, y+h*0.70, w*0.08, h*0.07);
        ctx.fillRect(x+w*0.57, y+h*0.72, w*0.08, h*0.07);

        // Torso — piel de jaguar
        ctx.fillStyle = C(160,120,40, br);
        ctx.fillRect(x+w*0.18, y+h*0.28, w*0.64, h*0.38);
        // Manchas en torso
        ctx.fillStyle = C(80,50,20, br);
        for (let i=0;i<4;i++)
            ctx.fillRect(x+w*(0.22+i*0.14), y+h*(0.32+Math.sin(i)*0.05), w*0.08, h*0.06);

        // Brazos
        ctx.fillStyle = C(140,90,50, br);
        ctx.fillRect(x+w*0.03, y+h*0.28, w*0.15, h*0.32);
        ctx.fillRect(x+w*0.82, y+h*0.28, w*0.15, h*0.32);

        // Arma — macuahuitl con decoración jaguar
        ctx.fillStyle = C(120,70,25, br);
        ctx.fillRect(x+w*0.84, y+h*0.18, w*0.10, h*0.52);
        ctx.fillStyle = C(15,15,30, br);
        ctx.fillRect(x+w*0.80, y+h*0.18, w*0.06, h*0.42);
        ctx.fillStyle = C(200,200,240, br);
        for (let i=0;i<4;i++)
            ctx.fillRect(x+w*0.79, y+h*(0.20+i*0.10), w*0.04, h*0.06);

        // CASCO DE JAGUAR — boca abierta del jaguar encuadrando la cara
        ctx.fillStyle = C(160,120,40, br);
        ctx.fillRect(x+w*0.20, y, w*0.60, h*0.30);
        // Orejas del jaguar
        ctx.fillRect(x+w*0.18, y-h*0.05, w*0.14, h*0.10);
        ctx.fillRect(x+w*0.68, y-h*0.05, w*0.14, h*0.10);
        // Dientes del casco
        ctx.fillStyle = C(255,255,255, br);
        for (let i=0;i<5;i++) {
            ctx.fillRect(x+w*(0.26+i*0.10), y+h*0.26, w*0.06, h*0.06);
        }
        // Cara interior (del guerrero)
        ctx.fillStyle = C(140,90,50, br);
        ctx.fillRect(x+w*0.32, y+h*0.08, w*0.36, h*0.18);
        // Ojos pintados
        ctx.fillStyle = C(255,215,0, br);
        ctx.fillRect(x+w*0.36, y+h*0.12, w*0.10, h*0.06);
        ctx.fillRect(x+w*0.54, y+h*0.12, w*0.10, h*0.06);
        ctx.fillStyle = C(10,10,10, br);
        ctx.fillRect(x+w*0.40, y+h*0.13, w*0.05, h*0.04);
        ctx.fillRect(x+w*0.58, y+h*0.13, w*0.05, h*0.04);
        // Manchas en casco
        ctx.fillStyle = C(80,50,20, br);
        ctx.fillRect(x+w*0.23, y+h*0.05, w*0.08, h*0.06);
        ctx.fillRect(x+w*0.69, y+h*0.05, w*0.08, h*0.06);
    }
};

// ══════════════════════════════════════════════════════════════════════════
//  CABALLERO ÁGUILA
// ══════════════════════════════════════════════════════════════════════════
SKINS.aguila = {
    nombre: 'Caballero Águila',
    piel:     [200, 170, 120],
    armadura: [220, 200, 160],
    penacho:  [255, 255, 255],

    draw(ctx, x, y, w, h, t, bright) {
        const br = bright;
        const walk = Math.sin(t*8) * h * 0.05;
        const wingFlap = Math.sin(t*4) * w * 0.04;

        // Sombra
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.beginPath();
        ctx.ellipse(x+w/2, y+h, w*0.3, h*0.04, 0, 0, Math.PI*2);
        ctx.fill();

        // Alas de águila en los brazos (animadas)
        ctx.fillStyle = C(200,185,150, br);
        // Ala izquierda
        ctx.fillRect(x-wingFlap, y+h*0.25, w*0.22, h*0.35);
        // Ala derecha
        ctx.fillRect(x+w*0.78+wingFlap, y+h*0.25, w*0.22, h*0.35);
        // Plumas de las alas
        ctx.fillStyle = C(255,255,255, br);
        for (let i=0;i<3;i++) {
            ctx.fillRect(x-wingFlap+w*0.03, y+h*(0.28+i*0.10), w*0.12, h*0.05);
            ctx.fillRect(x+w*0.85+wingFlap, y+h*(0.28+i*0.10), w*0.12, h*0.05);
        }

        // Piernas con plumas blancas
        ctx.fillStyle = C(220,200,160, br);
        ctx.fillRect(x+w*0.20, y+h*0.65, w*0.25, h*0.30+walk);
        ctx.fillRect(x+w*0.55, y+h*0.65, w*0.25, h*0.30-walk);
        // Plumas en las piernas
        ctx.fillStyle = C(255,255,255, br);
        ctx.fillRect(x+w*0.20, y+h*0.68, w*0.25, h*0.05);
        ctx.fillRect(x+w*0.55, y+h*0.68, w*0.25, h*0.05);

        // Torso — peto con plumas
        ctx.fillStyle = C(220,200,160, br);
        ctx.fillRect(x+w*0.20, y+h*0.28, w*0.60, h*0.38);
        // Plumas decorativas en el peto
        ctx.fillStyle = C(255,255,255, br);
        for (let i=0;i<3;i++)
            ctx.fillRect(x+w*(0.28+i*0.15), y+h*0.32, w*0.10, h*0.14);

        // Arma — atlatl (lanzajabalinas) del águila
        ctx.fillStyle = C(150,100,50, br);
        ctx.fillRect(x+w*0.83, y+h*0.25, w*0.08, h*0.50);
        ctx.fillStyle = C(255,215,0, br);
        ctx.fillRect(x+w*0.85, y+h*0.22, w*0.06, h*0.06);
        // Dardo
        ctx.fillStyle = C(180,190,210, br);
        ctx.fillRect(x+w*0.86, y+h*0.10, w*0.04, h*0.14);

        // CASCO DE ÁGUILA — pico y cabeza del ave
        // Parte trasera de la cabeza del águila
        ctx.fillStyle = C(255,255,255, br);
        ctx.fillRect(x+w*0.20, y, w*0.60, h*0.24);
        // Pico del águila (sobresale a la derecha)
        ctx.fillStyle = C(255,215,0, br);
        const pikePts = [[x+w*0.80, y+h*0.10], [x+w*0.92, y+h*0.15], [x+w*0.80, y+h*0.20]];
        ctx.beginPath(); ctx.moveTo(...pikePts[0]); ctx.lineTo(...pikePts[1]); ctx.lineTo(...pikePts[2]); ctx.fill();
        // Ojo del águila
        ctx.fillStyle = C(200,20,20, br);
        ctx.fillRect(x+w*0.70, y+h*0.10, w*0.10, h*0.06);
        ctx.fillStyle = C(0,0,0, br);
        ctx.fillRect(x+w*0.74, y+h*0.11, w*0.04, h*0.04);
        // Cara interior del guerrero
        ctx.fillStyle = C(200,170,120, br);
        ctx.fillRect(x+w*0.32, y+h*0.08, w*0.34, h*0.16);
        ctx.fillStyle = C(30,20,10, br);
        ctx.fillRect(x+w*0.37, y+h*0.12, w*0.08, h*0.05);
        ctx.fillRect(x+w*0.55, y+h*0.12, w*0.08, h*0.05);
    }
};

// ══════════════════════════════════════════════════════════════════════════
//  SACERDOTE GUERRERO
// ══════════════════════════════════════════════════════════════════════════
SKINS.sacerdote = {
    nombre: 'Sacerdote Guerrero',
    piel:     [100,  60, 140],
    armadura: [ 60,  40,  80],
    penacho:  [136,  68, 204],

    draw(ctx, x, y, w, h, t, bright) {
        const br = bright;
        const walk = Math.sin(t*8) * h * 0.05;
        // Aura mágica pulsante
        const aura = 0.5 + 0.5*Math.sin(t*5);
        ctx.fillStyle = `rgba(136,68,204,${aura*0.3*br})`;
        ctx.beginPath();
        ctx.ellipse(x+w/2, y+h*0.5, w*0.6, h*0.55, 0, 0, Math.PI*2);
        ctx.fill();

        // Sombra
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.beginPath();
        ctx.ellipse(x+w/2, y+h, w*0.3, h*0.04, 0, 0, Math.PI*2);
        ctx.fill();

        // Túnica larga morada
        ctx.fillStyle = C(60,40,80, br);
        ctx.fillRect(x+w*0.15, y+h*0.28, w*0.70, h*0.72);
        // Borde dorado de la túnica
        ctx.fillStyle = C(255,215,0, br);
        ctx.fillRect(x+w*0.15, y+h*0.28, w*0.04, h*0.72);
        ctx.fillRect(x+w*0.81, y+h*0.28, w*0.04, h*0.72);
        ctx.fillRect(x+w*0.15, y+h*0.95, w*0.70, h*0.04);

        // Piernas asoman debajo de la túnica
        ctx.fillStyle = C(60,40,80, br);
        ctx.fillRect(x+w*0.25, y+h*0.80, w*0.22, h*0.20+walk);
        ctx.fillRect(x+w*0.53, y+h*0.80, w*0.22, h*0.20-walk);

        // Brazos con mangas
        ctx.fillStyle = C(60,40,80, br);
        ctx.fillRect(x+w*0.00, y+h*0.30, w*0.18, h*0.36);
        ctx.fillRect(x+w*0.82, y+h*0.30, w*0.18, h*0.36);

        // Manos con glyphicons mágicos
        ctx.fillStyle = C(100,60,140, br);
        ctx.fillRect(x+w*0.00, y+h*0.62, w*0.18, h*0.10);
        ctx.fillRect(x+w*0.82, y+h*0.62, w*0.18, h*0.10);
        // Glifos mágicos en las manos
        ctx.fillStyle = `rgba(200,180,255,${(0.7+0.3*Math.sin(t*6))*br})`;
        ctx.fillRect(x+w*0.03, y+h*0.63, w*0.12, h*0.03);
        ctx.fillRect(x+w*0.85, y+h*0.63, w*0.12, h*0.03);

        // Báculo en mano derecha con cristal
        ctx.fillStyle = C(80,50,20, br);
        ctx.fillRect(x+w*0.86, y+h*0.05, w*0.06, h*0.62);
        // Cristal pulsante en la punta
        ctx.fillStyle = `rgba(200,100,255,${(0.7+0.3*Math.sin(t*8))*br})`;
        ctx.fillRect(x+w*0.83, y+h*0.01, w*0.12, h*0.08);
        ctx.fillStyle = C(255,255,255, br);
        ctx.fillRect(x+w*0.87, y+h*0.02, w*0.05, h*0.04);

        // Cabeza
        ctx.fillStyle = C(100,60,140, br);
        ctx.fillRect(x+w*0.28, y+h*0.05, w*0.44, h*0.24);

        // Corona de espinas/plumas rituales
        ctx.fillStyle = C(255,215,0, br);
        for (let i=0;i<5;i++) {
            const swing = Math.sin(t*2+i)*w*0.01;
            ctx.fillRect(x+w*(0.30+i*0.08)+swing, y-h*0.04, w*0.05, h*0.10);
        }
        // Gemas en la corona
        ctx.fillStyle = `rgba(255,50,50,${br})`;
        ctx.fillRect(x+w*0.48, y-h*0.02, w*0.06, h*0.05);

        // Calavera ritual pintada en la cara
        ctx.fillStyle = C(255,255,255, br);
        ctx.fillRect(x+w*0.32, y+h*0.10, w*0.36, h*0.12);
        // Ojos negros de calavera
        ctx.fillStyle = C(10,10,10, br);
        ctx.fillRect(x+w*0.36, y+h*0.11, w*0.10, h*0.08);
        ctx.fillRect(x+w*0.54, y+h*0.11, w*0.10, h*0.08);
        // Dientes
        for (let i=0;i<4;i++)
            ctx.fillRect(x+w*(0.37+i*0.07), y+h*0.20, w*0.05, h*0.04);
    }
};

// ══════════════════════════════════════════════════════════════════════════
//  GUERRERO DE TLÁLOC
// ══════════════════════════════════════════════════════════════════════════
SKINS.tlaloc = {
    nombre: 'Guerrero de Tláloc',
    piel:     [ 60, 100, 180],
    armadura: [ 40,  80, 140],
    penacho:  [ 34, 136, 204],

    draw(ctx, x, y, w, h, t, bright) {
        const br = bright;
        const walk = Math.sin(t*8) * h * 0.05;
        // Aura de lluvia (gotas)
        for (let i=0;i<6;i++) {
            const drop = (t*3 + i*1.05) % 1;
            ctx.fillStyle = `rgba(100,180,255,${(1-drop)*0.4*br})`;
            ctx.fillRect(x+w*(0.1+i*0.13), y+h*(drop*1.2)-h*0.1, 2, h*0.10);
        }

        // Sombra
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.beginPath();
        ctx.ellipse(x+w/2, y+h, w*0.3, h*0.04, 0, 0, Math.PI*2);
        ctx.fill();

        // Piernas — armadura azul-turquesa
        ctx.fillStyle = C(40,80,140, br);
        ctx.fillRect(x+w*0.20, y+h*0.65, w*0.25, h*0.30+walk);
        ctx.fillRect(x+w*0.55, y+h*0.65, w*0.25, h*0.30-walk);
        // Espirales de Tláloc
        ctx.fillStyle = C(100,180,255, br);
        ctx.fillRect(x+w*0.22, y+h*0.70, w*0.08, h*0.04);
        ctx.fillRect(x+w*0.57, y+h*0.70, w*0.08, h*0.04);

        // Torso con escamas de serpiente
        ctx.fillStyle = C(40,80,140, br);
        ctx.fillRect(x+w*0.18, y+h*0.28, w*0.64, h*0.38);
        // Escamas
        ctx.fillStyle = C(60,120,200, br);
        for (let row=0;row<3;row++)
            for (let col=0;col<4;col++)
                ctx.fillRect(x+w*(0.22+col*0.14), y+h*(0.32+row*0.10), w*0.12, h*0.07);

        // Brazos
        ctx.fillStyle = C(60,100,180, br);
        ctx.fillRect(x+w*0.03, y+h*0.28, w*0.15, h*0.34);
        ctx.fillRect(x+w*0.82, y+h*0.28, w*0.15, h*0.34);

        // Arco de lluvia
        ctx.strokeStyle = C(40,80,140, br);
        ctx.lineWidth = Math.max(3, w*0.08);
        ctx.beginPath();
        ctx.arc(x+w*0.84, y+h*0.55, h*0.35, -Math.PI*0.7, Math.PI*0.7);
        ctx.stroke();
        // Cuerda del arco
        ctx.strokeStyle = C(200,220,255, br);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x+w*0.84, y+h*0.20);
        ctx.lineTo(x+w*0.84, y+h*0.90);
        ctx.stroke();
        // Flecha
        ctx.fillStyle = C(180,190,210, br);
        ctx.fillRect(x+w*0.82, y+h*0.16, w*0.06, h*0.12);

        // MÁSCARA DE TLÁLOC — ojos de serpiente
        ctx.fillStyle = C(40,80,140, br);
        ctx.fillRect(x+w*0.22, y, w*0.56, h*0.28);
        // Ojo derecho de Tláloc (círculo concéntrico)
        ctx.fillStyle = C(0,200,255, br);
        ctx.beginPath(); ctx.arc(x+w*0.38, y+h*0.12, w*0.09, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = C(0,80,160, br);
        ctx.beginPath(); ctx.arc(x+w*0.38, y+h*0.12, w*0.05, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = C(0,220,255, br);
        ctx.beginPath(); ctx.arc(x+w*0.38, y+h*0.12, w*0.02, 0, Math.PI*2); ctx.fill();
        // Ojo izquierdo
        ctx.fillStyle = C(0,200,255, br);
        ctx.beginPath(); ctx.arc(x+w*0.62, y+h*0.12, w*0.09, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = C(0,80,160, br);
        ctx.beginPath(); ctx.arc(x+w*0.62, y+h*0.12, w*0.05, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = C(0,220,255, br);
        ctx.beginPath(); ctx.arc(x+w*0.62, y+h*0.12, w*0.02, 0, Math.PI*2); ctx.fill();
        // Boca de serpiente
        ctx.fillStyle = C(0,150,220, br);
        ctx.fillRect(x+w*0.30, y+h*0.20, w*0.40, h*0.06);
        ctx.fillStyle = C(255,255,255, br);
        for (let i=0;i<4;i++)
            ctx.fillRect(x+w*(0.33+i*0.09), y+h*0.20, w*0.04, h*0.06);
    }
};

// ══════════════════════════════════════════════════════════════════════════
//  QUETZALCÓATL (Serpiente Emplumada)
// ══════════════════════════════════════════════════════════════════════════
SKINS.quetzalcoatl = {
    nombre: 'Serpiente Emplumada',
    piel:     [220, 200,  40],
    armadura: [180, 160,  20],
    penacho:  [ 50, 200,  50],

    draw(ctx, x, y, w, h, t, bright) {
        const br = bright;
        const walk = Math.sin(t*8) * h * 0.05;
        // Aura dorada radiante
        const aura = 0.4+0.4*Math.sin(t*4);
        ctx.fillStyle = `rgba(255,215,0,${aura*0.25*br})`;
        ctx.beginPath();
        ctx.ellipse(x+w/2, y+h*0.5, w*0.7, h*0.6, 0, 0, Math.PI*2);
        ctx.fill();

        // Sombra
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.beginPath();
        ctx.ellipse(x+w/2, y+h, w*0.3, h*0.04, 0, 0, Math.PI*2);
        ctx.fill();

        // Plumas iridiscentes (verdes/azules) que salen de los brazos
        const plumColors = [[0,200,100],[0,150,255],[100,255,100],[255,215,0]];
        for (let i=0;i<4;i++) {
            const swing = Math.sin(t*3+i*0.7)*h*0.06;
            const [r,g,b] = plumColors[i%4];
            ctx.fillStyle = C(r,g,b,br);
            ctx.fillRect(x-w*0.10+i*w*0.05, y+h*(0.25+i*0.04)+swing, w*0.12, h*0.30);
            ctx.fillRect(x+w*(0.90-i*0.05), y+h*(0.25+i*0.04)-swing, w*0.12, h*0.30);
        }

        // Piernas — escamas verdes
        ctx.fillStyle = C(50,160,50, br);
        ctx.fillRect(x+w*0.20, y+h*0.65, w*0.25, h*0.30+walk);
        ctx.fillRect(x+w*0.55, y+h*0.65, w*0.25, h*0.30-walk);
        // Escamas brillantes
        ctx.fillStyle = C(100,220,100, br);
        for (let i=0;i<3;i++) ctx.fillRect(x+w*(0.21+i*0.06), y+h*(0.67+i*0.08), w*0.05, h*0.05);

        // Torso — piel de serpiente dorada
        ctx.fillStyle = C(220,200,40, br);
        ctx.fillRect(x+w*0.18, y+h*0.28, w*0.64, h*0.38);
        // Escamas doradas del torso
        ctx.fillStyle = C(255,215,0, br);
        for (let row=0;row<3;row++)
            for (let col=0;col<4;col++) {
                ctx.beginPath();
                ctx.ellipse(x+w*(0.24+col*0.14), y+h*(0.34+row*0.11), w*0.06, h*0.04, 0, 0, Math.PI*2);
                ctx.fill();
            }

        // Brazos con plumas largas
        ctx.fillStyle = C(180,160,20, br);
        ctx.fillRect(x+w*0.03, y+h*0.28, w*0.15, h*0.36);
        ctx.fillRect(x+w*0.82, y+h*0.28, w*0.15, h*0.36);

        // Bastón con la serpiente enroscada
        ctx.fillStyle = C(80,50,20, br);
        ctx.fillRect(x+w*0.87, y+h*0.10, w*0.05, h*0.55);
        // Serpiente enroscada
        ctx.strokeStyle = C(0,200,100, br);
        ctx.lineWidth = Math.max(2, w*0.04);
        ctx.beginPath();
        for (let i=0;i<20;i++) {
            const ty2 = y+h*(0.12+i*0.025);
            const tx2 = x+w*0.89 + Math.sin(i*0.8+t*4)*w*0.06;
            if (i===0) ctx.moveTo(tx2,ty2); else ctx.lineTo(tx2,ty2);
        }
        ctx.stroke();

        // CABEZA DE SERPIENTE emplumada
        ctx.fillStyle = C(220,200,40, br);
        ctx.fillRect(x+w*0.25, y+h*0.03, w*0.50, h*0.25);
        // Escamas en la cabeza
        ctx.fillStyle = C(255,215,0, br);
        ctx.fillRect(x+w*0.30, y+h*0.05, w*0.40, h*0.08);
        // Penacho enorme de plumas largas
        const plumasHead = [
            {x:0.20, y:-0.18, c:[0,200,100]},
            {x:0.30, y:-0.22, c:[255,215,0]},
            {x:0.40, y:-0.25, c:[0,150,255]},
            {x:0.50, y:-0.22, c:[255,50,50]},
            {x:0.60, y:-0.18, c:[0,200,100]},
            {x:0.70, y:-0.14, c:[255,215,0]},
        ];
        plumasHead.forEach(({x:fx, y:fy, c:[r,g,b]}, i) => {
            const swing = Math.sin(t*2.5+i*0.6)*w*0.03;
            ctx.fillStyle = C(r,g,b,br);
            ctx.fillRect(x+w*fx+swing, y+h*fy, w*0.08, h*0.20);
        });
        // Ojos de serpiente (verticales)
        ctx.fillStyle = C(255,215,0, br);
        ctx.fillRect(x+w*0.34, y+h*0.10, w*0.10, h*0.10);
        ctx.fillRect(x+w*0.56, y+h*0.10, w*0.10, h*0.10);
        ctx.fillStyle = C(0,0,0, br);
        ctx.fillRect(x+w*0.38, y+h*0.10, w*0.03, h*0.10); // pupila vertical
        ctx.fillRect(x+w*0.60, y+h*0.10, w*0.03, h*0.10);
        // Lengua bífida
        ctx.fillStyle = C(255,50,50, br);
        ctx.fillRect(x+w*0.46, y+h*0.26, w*0.08, h*0.04);
        ctx.fillRect(x+w*0.44, y+h*0.29, w*0.04, h*0.03);
        ctx.fillRect(x+w*0.52, y+h*0.29, w*0.04, h*0.03);
    }
};

// ══════════════════════════════════════════════════════════════════════════
//  MICTLANTECUHTLI (Señor del Inframundo)
// ══════════════════════════════════════════════════════════════════════════
SKINS.mictlantecuhtli = {
    nombre: 'Señor del Inframundo',
    piel:     [ 60,  20,  20],
    armadura: [100,  20,  20],
    penacho:  [ 80,   0,   0],

    draw(ctx, x, y, w, h, t, bright) {
        const br = bright;
        const walk = Math.sin(t*8) * h * 0.05;
        // Aura oscura / llamas del inframundo
        for (let i=0;i<5;i++) {
            const flameH = 0.2+0.1*Math.sin(t*5+i*1.2);
            const flameX = x+w*(0.15+i*0.16);
            ctx.fillStyle = `rgba(255,50,0,${(0.4-i*0.06)*br})`;
            ctx.fillRect(flameX, y+h*(0.7-flameH), w*0.12, h*flameH);
        }

        // Sombra oscura y amplia
        ctx.fillStyle = 'rgba(200,0,0,0.3)';
        ctx.beginPath();
        ctx.ellipse(x+w/2, y+h, w*0.4, h*0.05, 0, 0, Math.PI*2);
        ctx.fill();

        // Piernas — huesos decorados
        ctx.fillStyle = C(60,20,20, br);
        ctx.fillRect(x+w*0.20, y+h*0.65, w*0.25, h*0.32+walk);
        ctx.fillRect(x+w*0.55, y+h*0.65, w*0.25, h*0.32-walk);
        // Costillas en piernas
        ctx.fillStyle = C(200,200,180, br);
        for (let i=0;i<3;i++) {
            ctx.fillRect(x+w*0.21, y+h*(0.68+i*0.08), w*0.08, h*0.03);
            ctx.fillRect(x+w*0.56, y+h*(0.68+i*0.08), w*0.08, h*0.03);
        }

        // Capa/manto negro del inframundo
        ctx.fillStyle = C(20,5,5, br);
        ctx.fillRect(x+w*0.10, y+h*0.25, w*0.80, h*0.72);
        // Bordes de llamas en la capa
        ctx.fillStyle = `rgba(255,80,0,${(0.6+0.4*Math.sin(t*6))*br})`;
        ctx.fillRect(x+w*0.10, y+h*0.25, w*0.04, h*0.72);
        ctx.fillRect(x+w*0.86, y+h*0.25, w*0.04, h*0.72);

        // Torso — costillas expuestas
        ctx.fillStyle = C(60,20,20, br);
        ctx.fillRect(x+w*0.22, y+h*0.28, w*0.56, h*0.36);
        ctx.fillStyle = C(200,200,180, br);
        for (let i=0;i<5;i++)
            ctx.fillRect(x+w*0.26, y+h*(0.30+i*0.06), w*0.48, h*0.03);

        // Brazos esqueléticos
        ctx.fillStyle = C(60,20,20, br);
        ctx.fillRect(x+w*0.03, y+h*0.28, w*0.16, h*0.38);
        ctx.fillRect(x+w*0.81, y+h*0.28, w*0.16, h*0.38);
        // Huesos en los brazos
        ctx.fillStyle = C(200,200,180, br);
        for (let i=0;i<4;i++) {
            ctx.fillRect(x+w*0.04, y+h*(0.30+i*0.09), w*0.06, h*0.02);
            ctx.fillRect(x+w*0.90, y+h*(0.30+i*0.09), w*0.06, h*0.02);
        }

        // Guadaña de hueso
        ctx.fillStyle = C(200,200,180, br);
        ctx.fillRect(x+w*0.84, y, w*0.06, h*0.60);
        // Hoja curva de la guadaña
        ctx.beginPath();
        ctx.moveTo(x+w*0.90, y+h*0.02);
        ctx.quadraticCurveTo(x+w*1.10, y+h*0.15, x+w*0.90, y+h*0.28);
        ctx.strokeStyle = C(200,200,180, br);
        ctx.lineWidth = Math.max(3, w*0.06);
        ctx.stroke();

        // CALAVERA — cabeza de Mictlantecuhtli
        // Cráneo
        ctx.fillStyle = C(200,200,180, br);
        ctx.fillRect(x+w*0.25, y, w*0.50, h*0.28);
        // Cuencas de los ojos (vacías y oscuras)
        ctx.fillStyle = C(0,0,0, br);
        ctx.beginPath(); ctx.arc(x+w*0.37, y+h*0.10, w*0.10, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(x+w*0.63, y+h*0.10, w*0.10, 0, Math.PI*2); ctx.fill();
        // Llamas en las cuencas
        ctx.fillStyle = `rgba(255,80,0,${(0.7+0.3*Math.sin(t*8))*br})`;
        ctx.beginPath(); ctx.arc(x+w*0.37, y+h*0.10, w*0.06, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(x+w*0.63, y+h*0.10, w*0.06, 0, Math.PI*2); ctx.fill();
        // Nariz (triángulo oscuro)
        ctx.fillStyle = C(0,0,0, br);
        ctx.fillRect(x+w*0.46, y+h*0.16, w*0.08, h*0.06);
        // Dientes
        ctx.fillStyle = C(220,220,200, br);
        for (let i=0;i<6;i++)
            ctx.fillRect(x+w*(0.30+i*0.07), y+h*0.22, w*0.05, h*0.06);
        // Corona de espinas/picos del inframundo
        ctx.fillStyle = C(100,20,20, br);
        for (let i=0;i<5;i++) {
            const swing = Math.sin(t*3+i)*w*0.01;
            ctx.fillRect(x+w*(0.28+i*0.11)+swing, y-h*0.08, w*0.06, h*0.10);
        }
    }
};

// ══════════════════════════════════════════════════════════════════════════
//  TONATIUH (Hijo del Sol)
// ══════════════════════════════════════════════════════════════════════════
SKINS.tonatiuh = {
    nombre: 'Hijo del Sol',
    piel:     [240, 160,  20],
    armadura: [200, 100,   0],
    penacho:  [255, 215,   0],

    draw(ctx, x, y, w, h, t, bright) {
        const br = bright;
        const walk = Math.sin(t*8) * h * 0.05;
        // Rayos solares animados (el elemento más llamativo)
        const numRays = 12;
        for (let i=0;i<numRays;i++) {
            const angle = (i/numRays)*Math.PI*2 + t*0.5;
            const rayLen = (0.4+0.15*Math.sin(t*3+i)) * w;
            const cx = x+w*0.50, cy = y+h*0.12;
            ctx.strokeStyle = `rgba(255,215,0,${(0.5+0.5*Math.sin(t*4+i))*br})`;
            ctx.lineWidth = Math.max(2, w*0.04);
            ctx.beginPath();
            ctx.moveTo(cx + Math.cos(angle)*w*0.22, cy + Math.sin(angle)*w*0.22);
            ctx.lineTo(cx + Math.cos(angle)*rayLen,   cy + Math.sin(angle)*rayLen);
            ctx.stroke();
        }

        // Sombra dorada
        ctx.fillStyle = `rgba(255,165,0,0.3)`;
        ctx.beginPath();
        ctx.ellipse(x+w/2, y+h, w*0.3, h*0.04, 0, 0, Math.PI*2);
        ctx.fill();

        // Piernas doradas
        ctx.fillStyle = C(200,100,0, br);
        ctx.fillRect(x+w*0.20, y+h*0.65, w*0.25, h*0.30+walk);
        ctx.fillRect(x+w*0.55, y+h*0.65, w*0.25, h*0.30-walk);
        // Escamas doradas
        ctx.fillStyle = C(255,215,0, br);
        ctx.fillRect(x+w*0.20, y+h*0.66, w*0.25, h*0.04);
        ctx.fillRect(x+w*0.55, y+h*0.66, w*0.25, h*0.04);

        // Torso — armadura solar con grabados
        ctx.fillStyle = C(200,100,0, br);
        ctx.fillRect(x+w*0.18, y+h*0.28, w*0.64, h*0.38);
        // Sol grabado en el pecho
        ctx.fillStyle = C(255,215,0, br);
        ctx.beginPath();
        ctx.arc(x+w*0.50, y+h*0.45, w*0.15, 0, Math.PI*2);
        ctx.fill();
        ctx.fillStyle = C(200,100,0, br);
        ctx.beginPath();
        ctx.arc(x+w*0.50, y+h*0.45, w*0.08, 0, Math.PI*2);
        ctx.fill();
        // Rayos pequeños del sol en el pecho
        for (let i=0;i<8;i++) {
            const a = (i/8)*Math.PI*2;
            ctx.fillStyle = C(255,215,0, br);
            ctx.fillRect(
                x+w*0.50 + Math.cos(a)*w*0.11 - w*0.02,
                y+h*0.45 + Math.sin(a)*w*0.11 - h*0.01,
                w*0.04, h*0.02
            );
        }

        // Brazos dorados
        ctx.fillStyle = C(240,160,20, br);
        ctx.fillRect(x+w*0.03, y+h*0.28, w*0.15, h*0.36);
        ctx.fillRect(x+w*0.82, y+h*0.28, w*0.15, h*0.36);
        // Brazaletes de oro
        ctx.fillStyle = C(255,215,0, br);
        ctx.fillRect(x+w*0.02, y+h*0.50, w*0.17, h*0.05);
        ctx.fillRect(x+w*0.81, y+h*0.50, w*0.17, h*0.05);

        // Espada de luz solar
        ctx.fillStyle = `rgba(255,240,100,${br})`;
        ctx.fillRect(x+w*0.84, y+h*0.16, w*0.08, h*0.48);
        // Brillo pulsante de la espada
        ctx.fillStyle = `rgba(255,255,255,${(0.5+0.5*Math.sin(t*10))*br})`;
        ctx.fillRect(x+w*0.86, y+h*0.17, w*0.04, h*0.46);
        ctx.fillStyle = C(200,100,0, br);
        ctx.fillRect(x+w*0.80, y+h*0.34, w*0.16, h*0.04);

        // DISCO SOLAR — cabeza/casco de Tonatiuh
        // Cara del sol
        ctx.fillStyle = C(255,215,0, br);
        ctx.beginPath();
        ctx.arc(x+w*0.50, y+h*0.12, w*0.28, 0, Math.PI*2);
        ctx.fill();
        // Cara dentro del sol
        ctx.fillStyle = C(240,160,20, br);
        ctx.beginPath();
        ctx.arc(x+w*0.50, y+h*0.12, w*0.20, 0, Math.PI*2);
        ctx.fill();
        // Ojos brillantes del sol
        ctx.fillStyle = C(255,255,255, br);
        ctx.beginPath(); ctx.arc(x+w*0.40, y+h*0.10, w*0.06, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(x+w*0.60, y+h*0.10, w*0.06, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = `rgba(255,100,0,${br})`;
        ctx.beginPath(); ctx.arc(x+w*0.40, y+h*0.10, w*0.03, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(x+w*0.60, y+h*0.10, w*0.03, 0, Math.PI*2); ctx.fill();
        // Nariz
        ctx.fillStyle = C(200,100,0, br);
        ctx.fillRect(x+w*0.47, y+h*0.14, w*0.06, h*0.05);
        // Lengua del sol (glifo azteca)
        ctx.fillStyle = C(200,50,0, br);
        ctx.fillRect(x+w*0.44, y+h*0.19, w*0.12, h*0.04);
        ctx.fillRect(x+w*0.48, y+h*0.22, w*0.04, h*0.03);
    }
};

// ══════════════════════════════════════════════════════════════════════════
//  FUNCIÓN PRINCIPAL — dibuja cualquier skin por nombre
// ══════════════════════════════════════════════════════════════════════════
function dibujarSkin(ctx, skinNombre, x, y, w, h, t, bright, extra={}) {
    const skin = SKINS[skinNombre] || SKINS.guerrero_base;
    ctx.save();
    skin.draw(ctx, x, y, w, h, t, bright, extra.aiEstado, extra.flashTs || 0);
    ctx.restore();
}

// ══════════════════════════════════════════════════════════════════════════
//  LISTA DE SKINS disponibles para el lobby/tienda
// ══════════════════════════════════════════════════════════════════════════
const SKIN_CATALOG = [
    { clave:'guerrero_base',   nombre:'Guerrero Azteca',    costo:0,    nivel:1,  emoji:'⚔️'  },
    { clave:'jaguar',          nombre:'Caballero Jaguar',   costo:500,  nivel:3,  emoji:'🐆'  },
    { clave:'aguila',          nombre:'Caballero Águila',   costo:500,  nivel:3,  emoji:'🦅'  },
    { clave:'sacerdote',       nombre:'Sacerdote Guerrero', costo:800,  nivel:5,  emoji:'🔮'  },
    { clave:'tlaloc',          nombre:'Guerrero de Tláloc', costo:1200, nivel:7,  emoji:'🌧️'  },
    { clave:'quetzalcoatl',    nombre:'Serpiente Emplumada',costo:2000, nivel:10, emoji:'🐍'  },
    { clave:'mictlantecuhtli', nombre:'Sr. del Inframundo', costo:3000, nivel:15, emoji:'💀'  },
    { clave:'tonatiuh',        nombre:'Hijo del Sol',       costo:5000, nivel:20, emoji:'☀️'  },
];

if (typeof module !== 'undefined') module.exports = { SKINS, dibujarSkin, SKIN_CATALOG, C };