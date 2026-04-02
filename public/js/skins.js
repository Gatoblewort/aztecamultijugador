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
        // Movimiento de caminar muy sutil — solo 1.5% del alto
        const walk = Math.sin(t * 7) * h * 0.015;
        const R    = (fx,fy,fw,fh,r,g,b) => {
            ctx.fillStyle = B(r,g,b);
            ctx.fillRect(x+fx*w, y+fy*h, fw*w, fh*h);
        };
        // Flash sincronizado con bala_creada
        const msSinceFlash = Date.now() - flashTs;
        const flashActivo  = flashTs > 0 && msSinceFlash < 200;

        // ── SOMBRA ────────────────────────────────────────────────────────
        ctx.fillStyle = 'rgba(0,0,0,0.38)';
        ctx.beginPath();
        ctx.ellipse(x+w*0.50, y+h*0.99, w*0.30, h*0.030, 0, 0, Math.PI*2);
        ctx.fill();

        // ════════════════════════════════════════════════════════
        //  ESCUDO (izquierda, detrás del brazo) — más grande
        // ════════════════════════════════════════════════════════
        const shCX = x+w*0.11, shCY = y+h*0.52, shR = w*0.185;
        // Aro metálico exterior
        ctx.fillStyle = B(100,105,115);
        ctx.beginPath(); ctx.arc(shCX, shCY, shR, 0, Math.PI*2); ctx.fill();
        // Madera dorada
        ctx.fillStyle = B(162,128,48);
        ctx.beginPath(); ctx.arc(shCX, shCY, shR*0.85, 0, Math.PI*2); ctx.fill();
        // Anillo interior
        ctx.fillStyle = B(118,92,28);
        ctx.beginPath(); ctx.arc(shCX, shCY, shR*0.42, 0, Math.PI*2); ctx.fill();
        // Cruz roja — barra H
        ctx.fillStyle = B(192,16,16);
        ctx.fillRect(shCX-shR*0.72, shCY-shR*0.22, shR*1.44, shR*0.44);
        // Cruz roja — barra V
        ctx.fillRect(shCX-shR*0.22, shCY-shR*0.72, shR*0.44, shR*1.44);
        // Centro más brillante
        ctx.fillStyle = B(210,22,22);
        ctx.fillRect(shCX-shR*0.22, shCY-shR*0.22, shR*0.44, shR*0.44);
        // Brillo del escudo
        ctx.fillStyle = `rgba(255,255,255,${br*0.25})`;
        ctx.beginPath(); ctx.arc(shCX-shR*0.28, shCY-shR*0.30, shR*0.30, 0, Math.PI*2); ctx.fill();

        // ════════════════════════════════════════════════════════
        //  PIERNAS — proporción compacta, movimiento mínimo
        // ════════════════════════════════════════════════════════
        // Muslos plateados
        R(0.225, 0.640, 0.240, 0.155+walk*0.3,  142,147,157);
        R(0.535, 0.640, 0.240, 0.155-walk*0.3,  142,147,157);
        // Brillo muslo
        R(0.228, 0.643, 0.072, 0.145+walk*0.3,  172,177,187);
        R(0.538, 0.643, 0.072, 0.145-walk*0.3,  172,177,187);
        // Rodilleras
        R(0.215, 0.788+walk*0.2, 0.260, 0.058,  102,107,117);
        R(0.525, 0.788-walk*0.2, 0.260, 0.058,  102,107,117);
        R(0.238, 0.792+walk*0.2, 0.075, 0.038,  155,160,170);
        R(0.548, 0.792-walk*0.2, 0.075, 0.038,  155,160,170);
        // Espinillas
        R(0.228, 0.840+walk*0.35, 0.230, 0.088,  138,143,153);
        R(0.538, 0.840-walk*0.35, 0.230, 0.088,  138,143,153);
        R(0.232, 0.843+walk*0.35, 0.068, 0.078,  165,170,180);
        // Botas marrón oscuro (3 capas)
        R(0.195, 0.922+walk*0.4, 0.285, 0.038,  78,52,24);
        R(0.195, 0.955+walk*0.4, 0.285, 0.024,  58,38,14);
        R(0.185, 0.974+walk*0.4, 0.305, 0.020,  36,22,8);
        R(0.528, 0.922-walk*0.4, 0.285, 0.038,  78,52,24);
        R(0.528, 0.955-walk*0.4, 0.285, 0.024,  58,38,14);
        R(0.518, 0.974-walk*0.4, 0.305, 0.020,  36,22,8);

        // ════════════════════════════════════════════════════════
        //  CINTURÓN
        // ════════════════════════════════════════════════════════
        R(0.220, 0.616, 0.560, 0.032,  62,42,18);
        R(0.440, 0.616, 0.120, 0.032,  148,112,32);
        R(0.458, 0.618, 0.072, 0.026,  188,148,42);
        // Tiras del faldón
        R(0.248, 0.644, 0.095, 0.048,  74,50,20);
        R(0.388, 0.644, 0.095, 0.044,  64,42,16);
        R(0.528, 0.644, 0.095, 0.048,  74,50,20);

        // ════════════════════════════════════════════════════════
        //  TORSO — peto plateado con CRUZ ROJA grande
        // ════════════════════════════════════════════════════════
        // Base peto
        R(0.228, 0.285, 0.544, 0.338,  150,155,165);
        // Línea central
        R(0.468, 0.290, 0.058, 0.328,  92,97,107);
        // Acanalados horizontales
        R(0.228, 0.370, 0.544, 0.016,  105,110,120);
        R(0.228, 0.460, 0.544, 0.016,  105,110,120);
        R(0.228, 0.548, 0.544, 0.016,  105,110,120);
        // Brillo izquierdo del peto
        R(0.232, 0.288, 0.082, 0.330,  188,193,203);
        R(0.235, 0.290, 0.038, 0.325,  208,213,223);
        // Sombra derecha
        R(0.708, 0.288, 0.058, 0.332,  105,108,118);

        // CRUZ ROJA en el peto (bien centrada y proporcionada)
        // Bordes oscuros para profundidad
        R(0.288, 0.340, 0.002, 0.118,  138,10,10);  // borde izq barra H
        R(0.288, 0.340, 0.424, 0.002,  138,10,10);  // borde sup barra H
        R(0.288, 0.456, 0.424, 0.002,  138,10,10);  // borde inf barra H
        R(0.710, 0.340, 0.002, 0.118,  138,10,10);  // borde der barra H
        // Relleno barra H
        R(0.290, 0.342, 0.420, 0.112,  198,20,20);
        // Bordes barra V
        R(0.422, 0.290, 0.002, 0.318,  138,10,10);
        R(0.422, 0.290, 0.156, 0.002,  138,10,10);
        R(0.576, 0.290, 0.002, 0.318,  138,10,10);
        R(0.422, 0.606, 0.156, 0.002,  138,10,10);
        // Relleno barra V
        R(0.424, 0.292, 0.152, 0.316,  198,20,20);
        // Intersección más brillante
        R(0.424, 0.342, 0.152, 0.112,  215,25,25);

        // ════════════════════════════════════════════════════════
        //  HOMBRERAS ROJAS — característica de la imagen
        // ════════════════════════════════════════════════════════
        // Hombrera izquierda — roja con borde metálico
        R(0.062, 0.248, 0.200, 0.028,  105,110,120);  // lámina metálica sup
        R(0.055, 0.272, 0.210, 0.088,  178,22,22);     // cuerpo rojo
        R(0.058, 0.275, 0.065, 0.078,  205,35,35);     // brillo hombrera
        R(0.055, 0.355, 0.210, 0.020,  105,110,120);  // ribete inferior metálico
        // Remaches
        R(0.072, 0.280, 0.025, 0.020,  130,135,145);
        R(0.148, 0.280, 0.025, 0.020,  130,135,145);

        // Hombrera derecha — espejada
        R(0.738, 0.248, 0.200, 0.028,  105,110,120);
        R(0.735, 0.272, 0.210, 0.088,  178,22,22);
        R(0.835, 0.275, 0.065, 0.078,  205,35,35);
        R(0.735, 0.355, 0.210, 0.020,  105,110,120);
        R(0.748, 0.280, 0.025, 0.020,  130,135,145);
        R(0.825, 0.280, 0.025, 0.020,  130,135,145);

        // ════════════════════════════════════════════════════════
        //  BRAZOS
        // ════════════════════════════════════════════════════════
        // Brazo izquierdo
        R(0.060, 0.352, 0.152, 0.132,  135,140,150);
        R(0.062, 0.355, 0.048, 0.125,  165,170,180);
        R(0.048, 0.468, 0.165, 0.045,  102,107,117);  // codo
        R(0.062, 0.508, 0.138, 0.102,  132,137,147);  // antebrazo
        // Brazo derecho
        R(0.788, 0.352, 0.152, 0.132,  135,140,150);
        R(0.852, 0.355, 0.048, 0.125,  165,170,180);
        R(0.788, 0.468, 0.165, 0.045,  102,107,117);
        R(0.800, 0.508, 0.138, 0.102,  132,137,147);
        // Guantelete derecho
        R(0.798, 0.602, 0.145, 0.062,  92,97,107);
        R(0.802, 0.606, 0.092, 0.045,  112,117,127);
        // Nudillos
        R(0.802, 0.606, 0.020, 0.042,  122,127,137);
        R(0.824, 0.606, 0.020, 0.042,  122,127,137);
        R(0.846, 0.606, 0.020, 0.042,  122,127,137);

        // ════════════════════════════════════════════════════════
        //  PISTOLA / ARCABUZ
        // ════════════════════════════════════════════════════════
        // Culata madera
        R(0.805, 0.562, 0.095, 0.145,  85,50,20);
        R(0.810, 0.566, 0.052, 0.092,  105,62,26);
        R(0.818, 0.574, 0.025, 0.060,  125,76,30);
        // Caja del mecanismo
        R(0.658, 0.560, 0.152, 0.055,  70,70,76);
        R(0.662, 0.563, 0.105, 0.032,  90,90,96);
        R(0.718, 0.560, 0.024, 0.016,  142,118,35);  // pirita
        // Gatillo + guardamonte
        R(0.778, 0.615, 0.030, 0.060,  62,62,68);
        R(0.755, 0.630, 0.068, 0.013,  52,52,58);
        R(0.755, 0.668, 0.068, 0.013,  52,52,58);
        R(0.755, 0.630, 0.010, 0.052,  52,52,58);
        R(0.815, 0.630, 0.010, 0.052,  52,52,58);
        // Cañón largo horizontal
        R(0.015, 0.568, 0.648, 0.065,  50,50,56);
        R(0.018, 0.572, 0.635, 0.035,  70,70,76);
        R(0.018, 0.574, 0.575, 0.016,  86,86,92);
        // Boca del cañón
        R(-0.075, 0.560, 0.095, 0.080,  40,40,46);
        R(-0.062, 0.565, 0.068, 0.065,  26,26,32);
        R(-0.052, 0.572, 0.045, 0.050,  15,15,20);
        R(-0.080, 0.558, 0.020, 0.085,  36,36,42);

        // ════════════════════════════════════════════════════════
        //  FLASH DE DISPARO sincronizado
        // ════════════════════════════════════════════════════════
        if (flashActivo) {
            const alpha = Math.max(0, 1 - msSinceFlash / 200) * br;
            const fx = x - w*0.052, fy = y + h*0.600;
            ctx.save();
            ctx.globalAlpha = alpha;
            // Halo naranja
            ctx.fillStyle = `rgb(255,115,0)`;
            ctx.beginPath(); ctx.arc(fx, fy, w*0.125, 0, Math.PI*2); ctx.fill();
            // Halo amarillo
            ctx.fillStyle = `rgb(255,218,55)`;
            ctx.beginPath(); ctx.arc(fx, fy, w*0.088, 0, Math.PI*2); ctx.fill();
            // Núcleo blanco
            ctx.fillStyle = `rgb(255,252,195)`;
            ctx.beginPath(); ctx.arc(fx, fy, w*0.055, 0, Math.PI*2); ctx.fill();
            // Rayos
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
                ctx.save();
                ctx.translate(fx, fy); ctx.rotate(ang);
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
        //  GORGUERA (cuello con láminas)
        // ════════════════════════════════════════════════════════
        R(0.318, 0.242, 0.364, 0.020,  128,133,143);
        R(0.326, 0.260, 0.348, 0.018,  115,120,130);
        R(0.334, 0.276, 0.332, 0.016,  102,107,117);
        R(0.340, 0.290, 0.320, 0.010,  92,97,107);

        // ════════════════════════════════════════════════════════
        //  CABEZA
        // ════════════════════════════════════════════════════════
        // Cara
        R(0.298, 0.128, 0.404, 0.142,  210,170,138);
        // Mejillas
        R(0.302, 0.152, 0.078, 0.060,  225,182,150);
        R(0.572, 0.152, 0.078, 0.060,  225,182,150);
        // Nariz
        R(0.452, 0.160, 0.062, 0.050,  188,150,118);
        R(0.460, 0.163, 0.045, 0.035,  202,162,128);
        // Barba — marrón con capas
        R(0.312, 0.218, 0.376, 0.050,  85,58,32);
        R(0.322, 0.215, 0.275, 0.026,  102,70,40);
        R(0.346, 0.212, 0.172, 0.016,  118,82,48);
        // Bigote
        R(0.350, 0.190, 0.142, 0.026,  85,58,32);
        R(0.362, 0.192, 0.102, 0.016,  105,72,42);
        // Labios
        R(0.398, 0.208, 0.072, 0.016,  175,122,100);

        // ════════════════════════════════════════════════════════
        //  MORIÓN ESPAÑOL — ala ancha tipo sombrero
        // ════════════════════════════════════════════════════════
        // Copa redondeada (4 niveles)
        R(0.358, -0.040, 0.284, 0.040,  145,150,160);
        R(0.312, -0.002, 0.376, 0.046,  152,157,167);
        R(0.272,  0.042, 0.456, 0.046,  150,155,165);
        R(0.248,  0.084, 0.504, 0.040,  145,150,160);
        // Cimera central (cresta del morión)
        R(0.464, -0.060, 0.072, 0.105,  115,120,130);
        R(0.474, -0.056, 0.052, 0.095,  138,143,153);
        R(0.482, -0.052, 0.036, 0.082,  160,165,175);
        R(0.488, -0.046, 0.024, 0.060,  180,185,195);
        // ALA ANCHA — característica del morión (como sombrero)
        // Ala izquierda — sobresale bastante
        R(0.020, 0.112, 0.240, 0.042,  138,143,153);
        R(0.010, 0.120, 0.258, 0.028,  125,130,140);
        R(0.002, 0.130, 0.265, 0.018,  112,117,127);
        R(-0.005,0.140, 0.268, 0.010,  98,103,113);
        // Ala derecha
        R(0.740, 0.112, 0.240, 0.042,  138,143,153);
        R(0.732, 0.120, 0.258, 0.028,  125,130,140);
        R(0.733, 0.130, 0.265, 0.018,  112,117,127);
        R(0.737, 0.140, 0.268, 0.010,  98,103,113);
        // Frente del casco / visera
        R(0.268, 0.122, 0.464, 0.036,  132,137,147);
        R(0.278, 0.152, 0.180, 0.022,  118,123,133);
        R(0.542, 0.152, 0.155, 0.022,  118,123,133);
        R(0.358, 0.152, 0.188, 0.022,  105,110,120);
        // Reborde inferior del casco
        R(0.240, 0.124, 0.520, 0.014,  95,100,110);
        // Brillos del casco
        R(0.275,  0.002, 0.108, 0.105,  190,195,205);
        R(0.282,  0.005, 0.055, 0.095,  206,211,221);
        R(0.375, -0.032, 0.045, 0.055,  192,197,207);
        // Sombra lateral derecha
        R(0.670, 0.045, 0.070, 0.082,  105,108,118);
        // Remaches
        R(0.280, 0.092, 0.020, 0.017,  170,175,185);
        R(0.480, 0.092, 0.020, 0.017,  170,175,185);
        R(0.700, 0.092, 0.020, 0.017,  170,175,185);

        // ════════════════════════════════════════════════════════
        //  PLUMAS — roja (izq) + amarilla (der), segmentadas
        // ════════════════════════════════════════════════════════
        const nSeg = 7;
        for (let i = 0; i < nSeg; i++) {
            const pf = i / nSeg;
            const sw = Math.sin(t*3.2 + i*0.55) * w * 0.016;
            // Pluma roja
            ctx.fillStyle = B(185-i*5, 14+i*3, 14);
            ctx.fillRect(x+w*(0.318+pf*0.052)+sw, y+h*(-0.035-pf*0.060),
                         w*(0.054-pf*0.004), h*(0.068+pf*0.004));
            // Nervio central rojo
            ctx.fillStyle = B(138-i*3, 8, 8);
            ctx.fillRect(x+w*(0.318+pf*0.052)+sw+w*(0.054-pf*0.004)*0.42,
                         y+h*(-0.035-pf*0.060), w*(0.054-pf*0.004)*0.16,
                         h*(0.068+pf*0.004));
        }
        for (let i = 0; i < nSeg-1; i++) {
            const pf = i / nSeg;
            const sw = Math.sin(t*3.8 + i*0.65 + 1.4) * w * 0.015;
            // Pluma amarilla
            ctx.fillStyle = B(212+i*4, 165+i*8, 16+i*3);
            ctx.fillRect(x+w*(0.524+pf*0.045)+sw, y+h*(-0.025-pf*0.050),
                         w*(0.050-pf*0.003), h*(0.062+pf*0.004));
            // Nervio central amarillo
            ctx.fillStyle = B(162+i*3, 122+i*5, 10);
            ctx.fillRect(x+w*(0.524+pf*0.045)+sw+w*(0.050-pf*0.003)*0.42,
                         y+h*(-0.025-pf*0.050), w*(0.050-pf*0.003)*0.16,
                         h*(0.062+pf*0.004));
        }

        // ════════════════════════════════════════════════════════
        //  OJOS con iris, pupila, brillo y cejas
        // ════════════════════════════════════════════════════════
        const eyeY = y + h*0.148;
        const enCombate = aiEstado && aiEstado !== 'patrol';
        // Blanco del ojo
        R(0.328, 0.148, 0.115, 0.046,  228,228,228);
        R(0.550, 0.148, 0.115, 0.046,  228,228,228);
        // Iris
        ctx.fillStyle = enCombate ? B(205,16,16) : B(42,80,185);
        ctx.fillRect(x+w*0.342, eyeY+h*0.005, w*0.075, h*0.033);
        ctx.fillRect(x+w*0.565, eyeY+h*0.005, w*0.075, h*0.033);
        // Pupila
        ctx.fillStyle = B(12,8,8);
        ctx.fillRect(x+w*0.365, eyeY+h*0.010, w*0.028, h*0.022);
        ctx.fillRect(x+w*0.588, eyeY+h*0.010, w*0.028, h*0.022);
        // Brillo
        ctx.fillStyle = B(255,255,255);
        ctx.fillRect(x+w*0.345, eyeY+h*0.008, w*0.016, h*0.014);
        ctx.fillRect(x+w*0.568, eyeY+h*0.008, w*0.016, h*0.014);
        // Cejas
        const cOff = enCombate ? -h*0.011 : 0;
        R(0.328, 0.125+cOff/h, 0.112, 0.015,  72,48,25);
        R(0.553, 0.125-cOff/h, 0.112, 0.015,  72,48,25);
    }
};
        // Flash sincronizado: activo 180ms tras bala_creada real
        const msSinceFlash = Date.now() - flashTs;
        const flashActivo  = flashTs > 0 && msSinceFlash < 180;

        // ── SOMBRA ────────────────────────────────────────────────────────
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.beginPath();
        ctx.ellipse(x+w/2, y+h*1.0, w*0.34, h*0.032, 0, 0, Math.PI*2);
        ctx.fill();

        // ── ESCUDO (izquierda, detrás del cuerpo) ────────────────────────
        // Aro exterior metálico
        ctx.fillStyle = B(108,112,122);
        ctx.beginPath();
        ctx.arc(x+w*0.09, y+h*0.50, w*0.155, 0, Math.PI*2); ctx.fill();
        // Madera dorada interior
        ctx.fillStyle = B(158,125,48);
        ctx.beginPath();
        ctx.arc(x+w*0.09, y+h*0.50, w*0.128, 0, Math.PI*2); ctx.fill();
        // Anillo interior dorado oscuro
        ctx.fillStyle = B(120,95,30);
        ctx.beginPath();
        ctx.arc(x+w*0.09, y+h*0.50, w*0.065, 0, Math.PI*2); ctx.fill();
        // Cruz roja del escudo — barra H
        R(-0.075, 0.468, 0.130, 0.062,  185,18,18);
        // Cruz roja del escudo — barra V
        R(-0.023, 0.375, 0.062, 0.250,  185,18,18);
        // Tachuela central del escudo
        R(-0.015, 0.468, 0.046, 0.062,  200,160,40);
        // Brillo del escudo (diagonal superior izquierda)
        ctx.fillStyle = `rgba(255,255,255,${br*0.28})`;
        ctx.beginPath();
        ctx.arc(x+w*0.055, y+h*0.455, w*0.055, 0, Math.PI*2); ctx.fill();

        // ── PIERNAS con articulaciones visibles ───────────────────────────
        // Muslos (plateado medio)
        R(0.22, 0.62, 0.25, 0.19+walk*0.08,  138,143,153);
        R(0.53, 0.62, 0.25, 0.19-walk*0.08,  138,143,153);
        // Línea de articulación muslo
        R(0.22, 0.625, 0.25, 0.015,  95,100,110);
        R(0.53, 0.625, 0.25, 0.015,  95,100,110);
        // Rodillera — pieza separada más oscura con remache
        R(0.21, 0.795+walk*0.04, 0.27, 0.07,  105,110,120);
        R(0.52, 0.795-walk*0.04, 0.27, 0.07,  105,110,120);
        R(0.31, 0.810+walk*0.04, 0.07, 0.04,  158,163,173); // reflejo rodillera
        R(0.62, 0.810-walk*0.04, 0.07, 0.04,  158,163,173);
        // Espinillas
        R(0.23, 0.855+walk*0.06, 0.24, 0.095,  138,143,153);
        R(0.54, 0.855-walk*0.06, 0.24, 0.095,  138,143,153);
        // Brillo espinilla
        R(0.24, 0.860+walk*0.06, 0.07, 0.075,  170,175,185);
        R(0.55, 0.860-walk*0.06, 0.07, 0.075,  170,175,185);
        // Botas de cuero marrón oscuro (3 capas de profundidad)
        R(0.19, 0.935+walk*0.07, 0.29, 0.038,  80,55,28);   // bota superior
        R(0.19, 0.965+walk*0.07, 0.29, 0.022,  60,40,18);   // bota media
        R(0.18, 0.977+walk*0.07, 0.31, 0.018,  38,24,10);   // suela
        R(0.52, 0.935-walk*0.07, 0.29, 0.038,  80,55,28);
        R(0.52, 0.965-walk*0.07, 0.29, 0.022,  60,40,18);
        R(0.51, 0.977-walk*0.07, 0.31, 0.018,  38,24,10);
        // Costura de la bota
        R(0.22, 0.940+walk*0.07, 0.005, 0.030,  100,70,35);
        R(0.55, 0.940-walk*0.07, 0.005, 0.030,  100,70,35);

        // ── CINTURÓN / FALDÓN DE CUERO ────────────────────────────────────
        R(0.22, 0.610, 0.56, 0.038,  68,45,22);    // cinturón oscuro
        R(0.44, 0.610, 0.12, 0.038,  145,110,35);  // hebilla dorada
        R(0.47, 0.613, 0.06, 0.032,  185,145,40);  // brillo hebilla
        // Tiras del faldón (3 tiras visibles)
        R(0.25, 0.640, 0.10, 0.058,  78,52,25);
        R(0.39, 0.640, 0.10, 0.052,  68,45,20);
        R(0.53, 0.640, 0.10, 0.058,  78,52,25);

        // ── TORSO — peto de armadura con detalle máximo ───────────────────
        // Base del peto (color principal plateado)
        R(0.24, 0.295, 0.52, 0.320,  148,153,163);
        // Rebaje central (línea que divide pecho izq/der)
        R(0.470, 0.300, 0.060, 0.310,  95,100,110);
        // Acanalado horizontal superior
        R(0.240, 0.380, 0.520, 0.018,  108,113,123);
        // Acanalado horizontal medio
        R(0.240, 0.470, 0.520, 0.018,  108,113,123);
        // Acanalado horizontal inferior
        R(0.240, 0.555, 0.520, 0.018,  108,113,123);
        // Brillo izquierdo del peto (luz desde arriba-izquierda)
        R(0.245, 0.300, 0.085, 0.305,  188,193,203);
        R(0.250, 0.300, 0.040, 0.300,  205,210,220);
        // Sombra derecha del peto
        R(0.700, 0.300, 0.058, 0.310,  108,112,122);

        // ── CRUZ ROJA EN EL PETO (bien definida, como en imagen) ─────────
        // Barra horizontal — con borde oscuro para profundidad
        R(0.290, 0.344, 0.422, 0.004,  140,12,12);   // borde sup
        R(0.290, 0.348, 0.422, 0.100,  195,18,18);   // relleno
        R(0.290, 0.444, 0.422, 0.004,  140,12,12);   // borde inf
        // Barra vertical — con borde
        R(0.426, 0.300, 0.004, 0.310,  140,12,12);   // borde izq
        R(0.430, 0.300, 0.140, 0.310,  195,18,18);   // relleno
        R(0.566, 0.300, 0.004, 0.310,  140,12,12);   // borde der
        // Centro de la cruz más brillante
        R(0.430, 0.348, 0.140, 0.100,  210,22,22);

        // ── HOMBRERAS (pauldrons) con escamas ────────────────────────────
        // Hombrera izquierda — 3 capas de láminas
        R(0.065, 0.258, 0.195, 0.110,  148,153,163);
        R(0.060, 0.290, 0.185, 0.090,  135,140,150);
        R(0.058, 0.320, 0.175, 0.070,  120,125,135);
        // Ribete inferior hombrera izq
        R(0.058, 0.383, 0.178, 0.015,  90,95,105);
        // Brillo hombrera izq
        R(0.070, 0.262, 0.065, 0.085,  185,190,200);
        // Remaches hombrera izq
        R(0.082, 0.268, 0.028, 0.022,  175,180,190);
        R(0.148, 0.268, 0.028, 0.022,  175,180,190);

        // Hombrera derecha — espejada
        R(0.740, 0.258, 0.195, 0.110,  148,153,163);
        R(0.755, 0.290, 0.185, 0.090,  135,140,150);
        R(0.767, 0.320, 0.175, 0.070,  120,125,135);
        R(0.764, 0.383, 0.178, 0.015,  90,95,105);
        R(0.865, 0.262, 0.065, 0.085,  185,190,200);
        R(0.790, 0.268, 0.028, 0.022,  175,180,190);
        R(0.856, 0.268, 0.028, 0.022,  175,180,190);

        // ── BRAZOS con codos articulados ──────────────────────────────────
        // Brazo izquierdo (lleva escudo)
        R(0.058, 0.358, 0.148, 0.135,  138,143,153);
        R(0.060, 0.360, 0.045, 0.130,  168,173,183); // brillo
        // Codo izquierdo
        R(0.048, 0.468, 0.162, 0.048,  105,110,120);
        R(0.058, 0.472, 0.085, 0.038,  158,163,173); // reflejo codo
        // Antebrazo izquierdo
        R(0.062, 0.508, 0.138, 0.108,  135,140,150);

        // Brazo derecho (lleva pistola) — extendido hacia adelante
        R(0.794, 0.358, 0.148, 0.135,  138,143,153);
        R(0.855, 0.360, 0.045, 0.130,  168,173,183); // brillo
        // Codo derecho
        R(0.790, 0.468, 0.162, 0.048,  105,110,120);
        R(0.855, 0.472, 0.085, 0.038,  158,163,173);
        // Antebrazo derecho
        R(0.800, 0.508, 0.138, 0.108,  135,140,150);

        // Guantelete derecho
        R(0.800, 0.605, 0.142, 0.065,  95,100,110);
        R(0.805, 0.608, 0.095, 0.048,  115,120,130); // brillo guante
        // Nudillos del guantelete
        R(0.803, 0.608, 0.022, 0.045,  125,130,140);
        R(0.826, 0.608, 0.022, 0.045,  125,130,140);
        R(0.849, 0.608, 0.022, 0.045,  125,130,140);

        // ── PISTOLA / ARCABUZ (horizontal, apunta a la izquierda) ─────────
        // Culata de madera (parte trasera)
        R(0.808, 0.568, 0.092, 0.148,  88,52,22);
        R(0.812, 0.572, 0.052, 0.095,  108,65,28); // brillo madera
        R(0.820, 0.580, 0.025, 0.062,  128,78,32); // reflejo
        // Mecanismo de llave (caja del gatillo, lateral)
        R(0.668, 0.565, 0.148, 0.058,  72,72,78);
        R(0.672, 0.568, 0.105, 0.035,  92,92,98);  // brillo mecanismo
        R(0.725, 0.565, 0.025, 0.018,  145,120,38); // pirita/chispa
        // Gatillo
        R(0.782, 0.620, 0.032, 0.062,  65,65,72);
        R(0.786, 0.622, 0.018, 0.042,  82,82,88);
        // Guardamonte (aro protector del gatillo)
        R(0.762, 0.632, 0.072, 0.015,  55,55,62);
        R(0.762, 0.672, 0.072, 0.015,  55,55,62);
        R(0.762, 0.632, 0.012, 0.055,  55,55,62);
        R(0.822, 0.632, 0.012, 0.055,  55,55,62);
        // Cañón principal (tubo largo, horizontal)
        R(0.022, 0.572, 0.650, 0.068,  52,52,58);
        R(0.025, 0.576, 0.640, 0.038,  72,72,78);  // brillo cañón superior
        R(0.025, 0.578, 0.580, 0.018,  88,88,94);  // línea de brillo
        // Boca del cañón (más ancha y oscura)
        R(-0.068, 0.565, 0.095, 0.082,  42,42,48);
        R(-0.055, 0.570, 0.068, 0.068,  28,28,34);
        R(-0.048, 0.575, 0.048, 0.055,  18,18,22); // interior tubo
        // Embocadura / bocacha
        R(-0.075, 0.562, 0.022, 0.088,  38,38,44);

        // ── GORGUERA (cuello articulado con láminas) ──────────────────────
        R(0.320, 0.245, 0.360, 0.022,  130,135,145); // lámina 1
        R(0.328, 0.264, 0.344, 0.020,  118,123,133); // lámina 2
        R(0.335, 0.281, 0.330, 0.020,  105,110,120); // lámina 3
        R(0.340, 0.296, 0.320, 0.012,  95,100,110);  // base cuello

        // ── CABEZA — piel con detalle facial ──────────────────────────────
        // Cara principal
        R(0.295, 0.130, 0.410, 0.145,  212,172,140);
        // Mejillas (un poco más rosadas)
        R(0.300, 0.155, 0.080, 0.062,  228,185,155);
        R(0.570, 0.155, 0.080, 0.062,  228,185,155);
        // Nariz (tono más oscuro, con sombra lateral)
        R(0.450, 0.162, 0.065, 0.052,  190,152,120);
        R(0.458, 0.165, 0.048, 0.038,  205,165,132);
        // Barba — 3 capas de tono para dar volumen
        R(0.310, 0.220, 0.380, 0.052,  88,60,35);   // barba oscura
        R(0.320, 0.218, 0.280, 0.028,  105,72,42);  // barba media
        R(0.345, 0.215, 0.175, 0.018,  122,85,50);  // pelo más claro
        // Bigote
        R(0.348, 0.192, 0.145, 0.028,  88,60,35);
        R(0.360, 0.194, 0.105, 0.018,  108,75,45);
        // Labios
        R(0.395, 0.210, 0.075, 0.018,  178,125,105);

        // ── MORIÓN ESPAÑOL — máxima definición ───────────────────────────
        // Copa del casco (redondeada, 4 niveles de píxeles)
        R(0.355, -0.038, 0.290, 0.042,  148,153,163); // punta
        R(0.310, 0.002,  0.380, 0.048,  155,160,170); // nivel 2
        R(0.272, 0.045,  0.456, 0.048,  152,157,167); // nivel 3
        R(0.248, 0.088,  0.504, 0.042,  148,153,163); // base copa
        // Cimera central (cresta que sube por el medio)
        R(0.462, -0.058, 0.076, 0.100,  118,123,133); // cimera oscura
        R(0.472, -0.055, 0.056, 0.092,  142,147,157); // cimera media
        R(0.480, -0.052, 0.040, 0.082,  162,167,177); // cimera clara
        R(0.486, -0.048, 0.028, 0.062,  182,187,197); // brillo cimera
        // Ala izquierda del morión (característica forma de barco)
        R(0.128, 0.092, 0.128, 0.038,  142,147,157);
        R(0.118, 0.098, 0.142, 0.028,  130,135,145);
        R(0.112, 0.104, 0.148, 0.018,  118,123,133); // punta del ala
        // Ala derecha
        R(0.744, 0.092, 0.128, 0.038,  142,147,157);
        R(0.740, 0.098, 0.142, 0.028,  130,135,145);
        R(0.740, 0.104, 0.148, 0.018,  118,123,133);
        // Frente del casco — visera / guardacaras que baja
        R(0.268, 0.125, 0.464, 0.038,  135,140,150);
        R(0.278, 0.155, 0.184, 0.025,  122,127,137); // parte izq visera
        R(0.538, 0.155, 0.158, 0.025,  122,127,137); // parte der visera
        R(0.358, 0.155, 0.188, 0.025,  108,113,123); // nasal / guardanariz
        // Reborde inferior del casco
        R(0.242, 0.126, 0.516, 0.016,  98,103,113);
        // Brillos del casco (3 zonas)
        R(0.278, 0.005,  0.110, 0.108,  192,197,207); // brillo izq grande
        R(0.285, 0.008,  0.058, 0.095,  208,213,223); // brillo izq intenso
        R(0.372, -0.030, 0.048, 0.058,  195,200,210); // brillo copa
        // Sombra lateral derecha casco
        R(0.668, 0.048,  0.072, 0.085,  108,112,122);
        // Remaches decorativos
        R(0.282, 0.095, 0.022, 0.018,  172,177,187);
        R(0.695, 0.095, 0.022, 0.018,  172,177,187);
        R(0.455, 0.095, 0.022, 0.018,  172,177,187);
        R(0.523, 0.095, 0.022, 0.018,  172,177,187);

        // ── PLUMAS DEL MORIÓN (roja + amarilla, con segmentos) ────────────
        const plumaSeg = 7;
        for (let i = 0; i < plumaSeg; i++) {
            const pf  = i / plumaSeg;
            const sw  = Math.sin(t*3.2 + i*0.55) * w * 0.018; // balanceo
            // Pluma roja — side izquierda
            const rpx = x + w*(0.330 + pf*0.055) + sw;
            const rpy = y + h*(-0.032 - pf*0.062);
            const rw  = w*(0.055 - pf*0.004);
            const rh  = h*(0.065 + pf*0.005);
            ctx.fillStyle = B(188-i*6, 16+i*4, 16);
            ctx.fillRect(rpx, rpy, rw, rh);
            // Nervio central de la pluma roja
            ctx.fillStyle = B(145-i*4, 10, 10);
            ctx.fillRect(rpx + rw*0.42, rpy, rw*0.16, rh);
        }
        for (let i = 0; i < plumaSeg-1; i++) {
            const pf  = i / plumaSeg;
            const sw  = Math.sin(t*3.8 + i*0.65 + 1.4) * w * 0.016;
            // Pluma amarilla — side derecha
            const ypx = x + w*(0.528 + pf*0.048) + sw;
            const ypy = y + h*(-0.022 - pf*0.052);
            const yw2 = w*(0.052 - pf*0.003);
            const yh2 = h*(0.060 + pf*0.004);
            ctx.fillStyle = B(215+i*4, 168+i*8, 18+i*3);
            ctx.fillRect(ypx, ypy, yw2, yh2);
            // Nervio central pluma amarilla
            ctx.fillStyle = B(165+i*3, 125+i*5, 12);
            ctx.fillRect(ypx + yw2*0.42, ypy, yw2*0.16, yh2);
        }

        // ── OJOS con iris, pupila y brillo ────────────────────────────────
        const eyeY = y + h*0.148;
        const enCombate = aiEstado && aiEstado !== 'patrol';
        // Fondo del ojo (blanco)
        ctx.fillStyle = B(230,230,230);
        ctx.fillRect(x+w*0.330, eyeY, w*0.118, h*0.048);
        ctx.fillRect(x+w*0.552, eyeY, w*0.118, h*0.048);
        // Iris
        ctx.fillStyle = enCombate ? B(205,18,18) : B(45,82,188);
        ctx.fillRect(x+w*0.345, eyeY+h*0.005, w*0.078, h*0.035);
        ctx.fillRect(x+w*0.568, eyeY+h*0.005, w*0.078, h*0.035);
        // Pupila
        ctx.fillStyle = B(15,10,10);
        ctx.fillRect(x+w*0.368, eyeY+h*0.010, w*0.030, h*0.024);
        ctx.fillRect(x+w*0.592, eyeY+h*0.010, w*0.030, h*0.024);
        // Brillo del ojo
        ctx.fillStyle = B(255,255,255);
        ctx.fillRect(x+w*0.348, eyeY+h*0.008, w*0.018, h*0.015);
        ctx.fillRect(x+w*0.570, eyeY+h*0.008, w*0.018, h*0.015);
        // Cejas (oscuras, fruncidas en combate)
        ctx.fillStyle = enCombate ? B(55,30,15) : B(75,50,28);
        const cejaAngle = enCombate ? -h*0.012 : 0;
        ctx.fillRect(x+w*0.330, eyeY - h*0.022 + cejaAngle, w*0.115, h*0.016);
        ctx.fillRect(x+w*0.555, eyeY - h*0.022 - cejaAngle, w*0.115, h*0.016);
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