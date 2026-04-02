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
        const br  = bright;
        const B   = (r,g,b) => C(r,g,b,br);
        const walk = Math.sin(t * 8) * h * 0.05;
        const R  = (fx,fy,fw,fh,r,g,b) => {
            ctx.fillStyle = B(r,g,b);
            ctx.fillRect(x+fx*w, y+fy*h, fw*w, fh*h);
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