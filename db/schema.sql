-- =============================================
-- AZTEC WAR - Schema PostgreSQL
-- =============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- JUGADORES
CREATE TABLE IF NOT EXISTS jugadores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(30) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    contrasena VARCHAR(255) NOT NULL,
    nivel INTEGER DEFAULT 1,
    experiencia INTEGER DEFAULT 0,
    monedas INTEGER DEFAULT 0,
    kills_total INTEGER DEFAULT 0,
    muertes_total INTEGER DEFAULT 0,
    partidas_jugadas INTEGER DEFAULT 0,
    partidas_ganadas INTEGER DEFAULT 0,
    skin_activa VARCHAR(50) DEFAULT 'guerrero_base',
    creado_en TIMESTAMP DEFAULT NOW()
);

-- SKINS
CREATE TABLE IF NOT EXISTS skins (
    id SERIAL PRIMARY KEY,
    clave VARCHAR(50) NOT NULL UNIQUE,
    nombre VARCHAR(80) NOT NULL,
    descripcion TEXT,
    costo_monedas INTEGER DEFAULT 0,
    nivel_requerido INTEGER DEFAULT 1,
    color_r INTEGER DEFAULT 180,
    color_g INTEGER DEFAULT 120,
    color_b INTEGER DEFAULT 60,
    color_armadura_r INTEGER DEFAULT 100,
    color_armadura_g INTEGER DEFAULT 80,
    color_armadura_b INTEGER DEFAULT 40
);

-- SKINS DESBLOQUEADAS POR JUGADOR
CREATE TABLE IF NOT EXISTS jugador_skins (
    jugador_id UUID REFERENCES jugadores(id) ON DELETE CASCADE,
    skin_clave VARCHAR(50) REFERENCES skins(clave),
    desbloqueada_en TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (jugador_id, skin_clave)
);

-- PARTIDAS
CREATE TABLE IF NOT EXISTS partidas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mapa VARCHAR(30) DEFAULT 'templo_1',
    estado VARCHAR(20) DEFAULT 'esperando', -- esperando, en_juego, terminada
    max_jugadores INTEGER DEFAULT 8,
    duracion_segundos INTEGER DEFAULT 0,
    ganador_id UUID REFERENCES jugadores(id),
    creada_en TIMESTAMP DEFAULT NOW(),
    terminada_en TIMESTAMP
);

-- ESTADÍSTICAS POR PARTIDA
CREATE TABLE IF NOT EXISTS partida_jugadores (
    id SERIAL PRIMARY KEY,
    partida_id UUID REFERENCES partidas(id) ON DELETE CASCADE,
    jugador_id UUID REFERENCES jugadores(id) ON DELETE CASCADE,
    kills INTEGER DEFAULT 0,
    muertes INTEGER DEFAULT 0,
    monedas_ganadas INTEGER DEFAULT 0,
    experiencia_ganada INTEGER DEFAULT 0,
    posicion_final INTEGER DEFAULT 0,
    tiempo_vivo_segundos INTEGER DEFAULT 0
);

-- RANKINGS GLOBALES (cache calculado)
CREATE TABLE IF NOT EXISTS ranking (
    jugador_id UUID PRIMARY KEY REFERENCES jugadores(id) ON DELETE CASCADE,
    puntos INTEGER DEFAULT 0,
    posicion INTEGER DEFAULT 0,
    actualizado_en TIMESTAMP DEFAULT NOW()
);

-- SKINS BASE
INSERT INTO skins (clave, nombre, descripcion, costo_monedas, nivel_requerido, color_r, color_g, color_b, color_armadura_r, color_armadura_g, color_armadura_b) VALUES
('guerrero_base',   'Guerrero Azteca',    'El guerrero clásico del pueblo del sol',        0,    1,  180, 130,  70,  80,  60,  30),
('jaguar',          'Caballero Jaguar',   'El guerrero más temido en batalla',           2500,    5,  140,  90,  50, 160, 120,  40),
('aguila',          'Caballero Águila',   'Veloz como el viento del cielo',              2500,    5,  200, 170, 120, 220, 200, 160),
('sacerdote',       'Sacerdote Guerrero', 'Portador de la magia del Quinto Sol',         5000,    8,  100,  60, 140,  60,  40,  80),
('tlaloc',          'Guerrero de Tláloc', 'Bendecido por el dios de la lluvia',          8000,   12,   60, 100, 180,  40,  80, 140),
('quetzalcoatl',    'Serpiente Emplumada','El avatar del dios creador',                 12000,   15,  220, 200,  40, 180, 160,  20),
('mictlantecuhtli', 'Señor del Inframundo','Regresa de Mictlán para sembrar el caos',  18000,   20,   60,  20,  20, 100,  20,  20),
('tonatiuh',        'Hijo del Sol',       'El guerrero del Quinto Sol en persona',      28000,   25,  240, 160,  20, 200, 100,   0)
ON CONFLICT (clave) DO NOTHING;