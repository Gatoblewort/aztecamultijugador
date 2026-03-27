# ☀️ AZTEC WAR

**Juego FPS multijugador de pixelart con raíces aztecas**

Motor raycaster estilo Doom/Wolfenstein corriendo en el navegador.
2 a 8 jugadores por partida. PWA — funciona en Windows y móvil.

---

## 🚀 Deploy en Railway

### 1. Crear proyecto en Railway
1. Ir a [railway.app](https://railway.app)
2. New Project → Deploy from GitHub repo
3. Agregar PostgreSQL: Add Service → Database → PostgreSQL

### 2. Variables de entorno
En Railway → Variables, agregar:
```
DATABASE_URL  = (Railway lo pone automático con el plugin de PostgreSQL)
JWT_SECRET    = una_cadena_secreta_larga_y_segura
NODE_ENV      = production
```

### 3. Deploy
Railway detecta el `nixpacks.toml` y hace deploy automático.

---

## 🎮 Controles

| Acción | Teclado | Móvil |
|--------|---------|-------|
| Moverse | WASD | Joystick izquierdo |
| Girar | ← → / Mouse | Deslizar pantalla derecha |
| Disparar | Click / Espacio / F / Ctrl | Botón 🔥 |
| Cambiar arma | Q | Botón 🗡️ |
| Chat | T | — |

---

## 🏛️ Estructura del proyecto

```
/
├── server.js              ← Servidor principal + WebSockets + Matchmaking
├── routes/
│   ├── auth.js            ← Login, registro, perfil, skins
│   ├── game.js            ← Historial de partidas, skins disponibles
│   └── ranking.js         ← Rankings globales
├── db/
│   └── schema.sql         ← Tablas PostgreSQL
├── public/
│   ├── index.html         ← PWA Lobby
│   ├── game.html          ← Juego raycaster
│   ├── css/lobby.css      ← Estilos
│   └── js/
│       ├── lobby.js       ← Lógica del lobby
│       └── game.js        ← Motor raycaster + multijugador
├── package.json
└── nixpacks.toml          ← Config Railway
```

---

## 🗡️ Armas

| Arma | Daño | Cadencia |
|------|------|----------|
| Macuahuitl | 15 | Muy rápida |
| Atlatl | 25 | Media |
| Arco | 40 | Lenta |

---

## 🎭 Skins / Guerreros

8 guerreros desbloqueables con monedas ganadas en batalla:
- Guerrero Base (gratis)
- Caballero Jaguar (nivel 3)
- Caballero Águila (nivel 3)
- Sacerdote Guerrero (nivel 5)
- Guerrero de Tláloc (nivel 7)
- Serpiente Emplumada (nivel 10)
- Señor del Inframundo (nivel 15)
- Hijo del Sol (nivel 20)

---

## 🏆 Sistema de puntuación

- Kill = +50 monedas, +25 XP
- Victoria = +100 XP extra
- Monedas en mapa = +10 a +50
- Subida de nivel = √(XP/100) + 1
