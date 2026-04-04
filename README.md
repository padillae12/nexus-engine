# Nexus-Engine 🤖

> **Componente A** del sistema Nexus-Flow — Bot de WhatsApp basado en reglas para gestión de citas. Sin APIs de IA. Sin costos de terceros.

---

## Stack

- **Node.js** >= 18
- **whatsapp-web.js** — Integración con WhatsApp
- **mysql2** — Base de datos MySQL en VPS propio
- **dotenv** — Variables de entorno

---

## Estructura

```
nexus-engine/
├── src/
│   ├── bot/
│   │   ├── index.js          ← Punto de entrada (arranque del bot)
│   │   ├── fsm.js            ← Máquina de Estados Finitos (cerebro)
│   │   └── handlers/
│   │       ├── welcome.js    ← Saludo y captura de nombre
│   │       ├── service.js    ← Selección de servicio
│   │       ├── date.js       ← Selección de fecha
│   │       ├── time.js       ← Selección de hora
│   │       └── confirm.js    ← Confirmación y cancelación
│   ├── db/
│   │   ├── pool.js           ← Pool de conexiones MySQL
│   │   └── queries.js        ← Todas las queries SQL
│   └── utils/
│       ├── regex.js          ← Detección de intenciones
│       └── slots.js          ← Generador de horarios disponibles
├── migrations/
│   └── 001_initial_schema.sql
├── .env.example
└── package.json
```

---

## Instalación

### 1. Clonar e instalar dependencias

```bash
git clone https://github.com/tu-usuario/nexus-engine.git
cd nexus-engine
npm install
```

### 2. Configurar variables de entorno

```bash
# Copia el template
cp .env.example .env

# Edita .env con tus datos de MySQL
notepad .env   # Windows
nano .env      # Linux/VPS
```

Llena los valores en `.env`:
```
DB_HOST=tu_vps_ip_o_localhost
DB_PORT=3306
DB_USER=nexus_user
DB_PASSWORD=tu_password
DB_NAME=nexus_flow
BUSINESS_NAME=Mi Negocio
```

### 3. Crear la base de datos

Conéctate a tu MySQL y ejecuta:
```bash
mysql -u root -p < migrations/001_initial_schema.sql
```

O copia y pega el contenido de `migrations/001_initial_schema.sql` en tu cliente de MySQL.

### 4. Personalizar los datos

En el archivo `migrations/001_initial_schema.sql`, al final encontrarás los datos de ejemplo. **Ajusta los servicios y horarios** a tu negocio real.

---

## Arrancar el bot

### Modo desarrollo (local)
```bash
npm run dev
```

### Modo producción (VPS con PM2)
```bash
# Instalar PM2 globalmente (solo la primera vez)
npm install -g pm2

# Arrancar el bot con PM2
pm2 start src/bot/index.js --name nexus-engine

# Guardar para que arranque al reiniciar el servidor
pm2 save
pm2 startup
```

Al arrancar por **primera vez** verás un **código QR en la terminal**. Escanéalo con WhatsApp desde tu teléfono (el número del negocio). Después de eso, la sesión se guarda en disco y no tendrás que hacerlo de nuevo.

---

## Flujo del Bot

```
Cliente escribe cualquier cosa
         ↓
   Saludo + pide nombre (si es nuevo)
         ↓
     Menú principal
    1. Agendar cita
    2. Ver mis citas
    3. Cancelar cita
         ↓ (elige 1)
   Lista de servicios
         ↓
   ¿Para qué día? (acepta: "mañana", "el lunes", "14 de abril", "15/04")
         ↓
   Horarios disponibles ese día
         ↓
   Resumen + confirmación (sí / no)
         ↓
   ✅ Cita registrada en MySQL
```

---

## Próximo paso: Componente B (Dashboard)

El **Nexus-Cockpit** será el dashboard web donde el dueño del negocio podrá:
- Ver el calendario de citas
- Gestionar horarios y bloqueos
- Agregar encargados y empleados
- Pausar el bot y atender manualmente
