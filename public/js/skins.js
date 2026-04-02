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

    draw(ctx, x, y, w, h, t, bright, aiEstado) {
        const br = bright;
        const isShooting = aiEstado === 'shoot' || aiEstado === 'strafe' || aiEstado === 'retreat' || aiEstado === 'boss';
        const walk = Math.sin(t * 8) * h * 0.05;

        // ── Sombra ────────────────────────────────────────────────────────
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.beginPath();
        ctx.ellipse(x+w/2, y+h*0.99, w*0.32, h*0.035, 0, 0, Math.PI*2);
        ctx.fill();

        // ── ESCUDO (izquierda, detrás del brazo) ──────────────────────────
        // Base del escudo — madera dorada
        ctx.fillStyle = C(160,128,55, br);
        const shR = w*0.16;
        const shCX = x+w*0.10, shCY = y+h*0.50;
        ctx.beginPath();
        ctx.arc(shCX, shCY, shR, 0, Math.PI*2);
        ctx.fill();
        // Borde metálico del escudo
        ctx.strokeStyle = C(130,135,145, br);
        ctx.lineWidth = Math.max(1, w*0.025);
        ctx.beginPath();
        ctx.arc(shCX, shCY, shR, 0, Math.PI*2);
        ctx.stroke();
        // Cruz roja en el escudo
        ctx.fillStyle = C(190,18,18, br);
        ctx.fillRect(shCX-shR*0.55, shCY-shR*0.18, shR*1.1, shR*0.36);
        ctx.fillRect(shCX-shR*0.18, shCY-shR*0.55, shR*0.36, shR*1.1);
        // Brillo del escudo
        ctx.fillStyle = C(200,205,215, br*0.4);
        ctx.fillRect(shCX-shR*0.3, shCY-shR*0.7, shR*0.15, shR*0.4);

        // ── PIERNAS con armadura articulada ───────────────────────────────
        // Muslos
        ctx.fillStyle = C(148,153,163, br);
        ctx.fillRect(x+w*0.22, y+h*0.63, w*0.24, h*0.18+walk);
        ctx.fillRect(x+w*0.54, y+h*0.63, w*0.24, h*0.18-walk);
        // Rodilleras — más oscuras
        ctx.fillStyle = C(110,115,125, br);
        ctx.fillRect(x+w*0.22, y+h*0.79+walk*0.5, w*0.24, h*0.06);
        ctx.fillRect(x+w*0.54, y+h*0.79-walk*0.5, w*0.24, h*0.06);
        // Espinillas
        ctx.fillStyle = C(148,153,163, br);
        ctx.fillRect(x+w*0.23, y+h*0.84+walk, w*0.22, h*0.10);
        ctx.fillRect(x+w*0.55, y+h*0.84-walk, w*0.22, h*0.10);
        // Botas de cuero oscuro
        ctx.fillStyle = C(68,48,32, br);
        ctx.fillRect(x+w*0.20, y+h*0.92+walk, w*0.26, h*0.07);
        ctx.fillRect(x+w*0.54, y+h*0.92-walk, w*0.26, h*0.07);
        // Suela de bota
        ctx.fillStyle = C(40,28,18, br);
        ctx.fillRect(x+w*0.19, y+h*0.97+walk, w*0.28, h*0.025);
        ctx.fillRect(x+w*0.53, y+h*0.97-walk, w*0.28, h*0.025);

        // ── TORSO principal — peto plateado ──────────────────────────────
        // Base del peto
        ctx.fillStyle = C(155,160,170, br);
        ctx.fillRect(x+w*0.24, y+h*0.30, w*0.52, h*0.34);
        // Línea central del peto (rebaje)
        ctx.fillStyle = C(105,110,120, br);
        ctx.fillRect(x+w*0.47, y+h*0.31, w*0.06, h*0.32);
        // Fajas horizontales del peto
        ctx.fillStyle = C(120,125,135, br);
        ctx.fillRect(x+w*0.24, y+h*0.44, w*0.52, h*0.025);
        ctx.fillRect(x+w*0.24, y+h*0.55, w*0.52, h*0.025);
        // Brillo del peto (lado izquierdo)
        ctx.fillStyle = C(195,200,210, br*0.6);
        ctx.fillRect(x+w*0.25, y+h*0.31, w*0.08, h*0.30);

        // ── CRUZ ROJA en el peto ──────────────────────────────────────────
        ctx.fillStyle = C(190,18,18, br);
        // Barra horizontal de la cruz
        ctx.fillRect(x+w*0.30, y+h*0.36, w*0.40, h*0.10);
        // Barra vertical de la cruz
        ctx.fillRect(x+w*0.44, y+h*0.31, w*0.12, h*0.26);

        // ── HOMBROS (pauldrons) ───────────────────────────────────────────
        // Hombro izquierdo (con escudo)
        ctx.fillStyle = C(148,153,163, br);
        ctx.fillRect(x+w*0.08, y+h*0.27, w*0.19, h*0.11);
        ctx.fillRect(x+w*0.09, y+h*0.36, w*0.16, h*0.08);
        // Hombro derecho (con pistola)
        ctx.fillRect(x+w*0.73, y+h*0.27, w*0.19, h*0.11);
        ctx.fillRect(x+w*0.75, y+h*0.36, w*0.16, h*0.08);
        // Remaches de los hombros
        ctx.fillStyle = C(180,185,195, br);
        ctx.fillRect(x+w*0.12, y+h*0.29, w*0.04, h*0.03);
        ctx.fillRect(x+w*0.80, y+h*0.29, w*0.04, h*0.03);

        // ── BRAZO IZQUIERDO (sostiene escudo) ────────────────────────────
        ctx.fillStyle = C(148,153,163, br);
        ctx.fillRect(x+w*0.06, y+h*0.36, w*0.14, h*0.26);
        // Coderas
        ctx.fillStyle = C(110,115,125, br);
        ctx.fillRect(x+w*0.05, y+h*0.47, w*0.16, h*0.05);

        // ── BRAZO DERECHO (sostiene pistola) ─────────────────────────────
        ctx.fillStyle = C(148,153,163, br);
        // Brazo extendido hacia adelante (izquierda en pantalla = hacia el enemigo)
        ctx.fillRect(x+w*0.80, y+h*0.36, w*0.14, h*0.26);
        // Codera derecha
        ctx.fillStyle = C(110,115,125, br);
        ctx.fillRect(x+w*0.79, y+h*0.47, w*0.16, h*0.05);
        // Mano/guantelete
        ctx.fillStyle = C(100,105,115, br);
        ctx.fillRect(x+w*0.80, y+h*0.60, w*0.14, h*0.07);

        // ── PISTOLA / ARCABUZ ─────────────────────────────────────────────
        // Mango de madera
        ctx.fillStyle = C(90,55,25, br);
        ctx.fillRect(x+w*0.82, y+h*0.58, w*0.08, h*0.14);
        // Cuerpo del arma (horizontal, apunta a la izquierda)
        ctx.fillStyle = C(55,55,60, br);
        ctx.fillRect(x-w*0.04, y+h*0.58, w*0.88, h*0.07);
        // Cañón (tubo más oscuro)
        ctx.fillStyle = C(35,35,40, br);
        ctx.fillRect(x-w*0.08, y+h*0.595, w*0.40, h*0.04);
        // Boca del cañón (extremo)
        ctx.fillStyle = C(20,20,25, br);
        ctx.fillRect(x-w*0.10, y+h*0.585, w*0.07, h*0.06);
        // Gatillo
        ctx.fillStyle = C(80,80,85, br);
        ctx.fillRect(x+w*0.78, y+h*0.65, w*0.04, h*0.06);
        // Mecanismo de llave
        ctx.fillStyle = C(160,130,50, br);
        ctx.fillRect(x+w*0.68, y+h*0.58, w*0.10, h*0.05);

        // ── FLASH DE DISPARO animado ──────────────────────────────────────
        if (isShooting) {
            const flashT = (t * 12) % 1; // ciclo rápido
            const flashAlpha = flashT < 0.5 ? flashT * 2 : (1 - flashT) * 2;
            if (flashAlpha > 0.1) {
                const fx = x - w*0.10; // boca del cañón
                const fy = y + h*0.605;
                ctx.save();
                // Destello central blanco-amarillo
                ctx.globalAlpha = flashAlpha * br;
                ctx.fillStyle = `rgb(255,240,180)`;
                ctx.beginPath();
                ctx.arc(fx, fy, w*0.08, 0, Math.PI*2);
                ctx.fill();
                // Rayos del destello — 8 puntas irregulares
                const rayos = [
                    [-0.28, -0.02, 0.10, 0.03],  // izquierda largo
                    [-0.20, -0.08, 0.07, 0.025],  // izq-arriba
                    [-0.18,  0.06, 0.07, 0.025],  // izq-abajo
                    [-0.14, -0.13, 0.05, 0.02],   // arriba-izq
                    [-0.14,  0.11, 0.05, 0.02],   // abajo-izq
                    [ 0.00, -0.14, 0.04, 0.02],   // arriba
                    [ 0.00,  0.14, 0.04, 0.02],   // abajo
                    [ 0.06, -0.05, 0.03, 0.015],  // derecha corto
                ];
                rayos.forEach(([dx, dy, len, ww]) => {
                    const angle = Math.atan2(dy, dx);
                    const dist  = Math.sqrt(dx*dx+dy*dy)*w;
                    ctx.save();
                    ctx.translate(fx + dx*w, fy + dy*w);
                    ctx.rotate(angle);
                    // Naranja exterior
                    ctx.fillStyle = `rgb(${Math.floor(255*flashAlpha)},${Math.floor(110*flashAlpha)},0)`;
                    ctx.fillRect(0, -ww*w, len*w*1.4, ww*w*2);
                    // Amarillo interior
                    ctx.fillStyle = `rgb(255,${Math.floor(220*flashAlpha)},80)`;
                    ctx.fillRect(0, -ww*w*0.5, len*w, ww*w);
                    ctx.restore();
                });
                // Núcleo blanco brillante
                ctx.fillStyle = `rgb(255,255,220)`;
                ctx.beginPath();
                ctx.arc(fx, fy, w*0.045, 0, Math.PI*2);
                ctx.fill();
                ctx.restore();
            }
        }

        // ── GORGUERA (cuello con láminas) ─────────────────────────────────
        ctx.fillStyle = C(140,145,155, br);
        ctx.fillRect(x+w*0.33, y+h*0.25, w*0.34, h*0.07);
        ctx.fillStyle = C(118,123,133, br);
        ctx.fillRect(x+w*0.35, y+h*0.29, w*0.30, h*0.03);

        // ── CABEZA — piel y barba ─────────────────────────────────────────
        // Cara visible bajo el visor
        ctx.fillStyle = C(215,178,148, br);
        ctx.fillRect(x+w*0.30, y+h*0.14, w*0.40, h*0.13);
        // Barba marrón
        ctx.fillStyle = C(90,62,38, br);
        ctx.fillRect(x+w*0.32, y+h*0.22, w*0.36, h*0.05);
        // Bigote
        ctx.fillRect(x+w*0.36, y+h*0.19, w*0.28, h*0.03);

        // ── MORIÓN (casco español característico) ────────────────────────
        // Base del casco — plateado
        ctx.fillStyle = C(155,160,170, br);
        ctx.fillRect(x+w*0.24, y+h*0.07, w*0.52, h*0.09);
        // Parte superior redondeada del morión
        ctx.fillRect(x+w*0.30, y+h*0.01, w*0.40, h*0.07);
        ctx.fillRect(x+w*0.36, y-h*0.03, w*0.28, h*0.05);
        // Cresta central del morión (cimera)
        ctx.fillStyle = C(140,145,155, br);
        ctx.fillRect(x+w*0.46, y-h*0.06, w*0.08, h*0.10);
        // Ala del morión (guardacaras)
        ctx.fillStyle = C(148,153,163, br);
        ctx.fillRect(x+w*0.18, y+h*0.09, w*0.10, h*0.04);
        ctx.fillRect(x+w*0.72, y+h*0.09, w*0.10, h*0.04);
        // Visera / guarda nariz
        ctx.fillStyle = C(110,115,125, br);
        ctx.fillRect(x+w*0.37, y+h*0.12, w*0.26, h*0.03);
        // Brillo del casco
        ctx.fillStyle = C(200,205,215, br*0.5);
        ctx.fillRect(x+w*0.32, y+h*0.02, w*0.10, h*0.10);

        // ── PLUMA DEL CASCO (bicolor: roja + amarilla) ────────────────────
        // Pluma roja (izquierda/atrás)
        for (let i = 0; i < 5; i++) {
            const swing = Math.sin(t*3 + i*0.5) * w * 0.015;
            const px = x + w*(0.34 + i*0.04) + swing;
            const py = y - h*(0.06 + i*0.015);
            ctx.fillStyle = C(190, 18+i*8, 18, br);
            ctx.fillRect(px, py, w*0.055, h*(0.09 + i*0.01));
        }
        // Pluma amarilla (derecha/frente)
        for (let i = 0; i < 4; i++) {
            const swing = Math.sin(t*3.5 + i*0.7 + 1.2) * w * 0.015;
            const px = x + w*(0.52 + i*0.035) + swing;
            const py = y - h*(0.04 + i*0.01);
            ctx.fillStyle = C(220, 175+i*10, 20, br);
            ctx.fillRect(px, py, w*0.05, h*(0.08 + i*0.008));
        }

        // ── OJOS (rojos en combate, normales en patrulla) ─────────────────
        const eyeY = y + h*0.155;
        const combate = aiEstado && aiEstado !== 'patrol';
        ctx.fillStyle = combate ? C(220,20,20,br) : C(55,90,200,br);
        ctx.fillRect(x+w*0.34, eyeY, w*0.11, h*0.045);
        ctx.fillRect(x+w*0.55, eyeY, w*0.11, h*0.045);
        // Brillo en los ojos
        ctx.fillStyle = C(255,255,255, br*0.7);
        ctx.fillRect(x+w*0.36, eyeY+h*0.005, w*0.03, h*0.02);
        ctx.fillRect(x+w*0.57, eyeY+h*0.005, w*0.03, h*0.02);
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
    skin.draw(ctx, x, y, w, h, t, bright, extra.aiEstado);
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