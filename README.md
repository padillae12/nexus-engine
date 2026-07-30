# Nexus-Engine 🤖

> **Componente Central** del sistema Nexus-Flow — Bot de WhatsApp bilingüe (Español / Inglés) basado en reglas y App móvil ejecutiva para gestión de citas, personal, horarios de comida y catálogo de servicios. Sin APIs de IA costosas. Sin comisiones por cita.

---

## 🚀 Características Principales

- **🌐 Bot Bilingüe (Español 🇲🇽 / Inglés 🇺🇸):** Auto-detección de números de EE.UU./Canadá (+1), selector de idioma (Opción 5) y comandos en inglés (`book`, `cancel`, `info`, `back`, `tomorrow`, etc.).
- **📱 Normalización Internacional de Teléfonos:** Formato limpio y unificado para números de México (+52) y EE.UU. (+1 442 367-0431).
- **🍽️ Horarios de Comida por Empleado:** Asignación individual de horarios de almuerzo/descanso desde el panel Admin, bloqueando automáticamente los slots en el bot y la app.
- **🏷️ Gestión de Catálogo de Servicios (CRUD):** Creación, edición, precios, duraciones y descripción de servicios directamente desde la App.
- **🔔 Notificaciones y Recordatorios en Tiempo Real:** Notificación inmediata por WhatsApp al cliente y especialista cuando se agenda una cita (manual o por bot).
- **⚡ Auto-Migraciones MySQL:** Actualización automática del esquema de la base de datos al reiniciar con `pm2`.

---

## Stack

- **Node.js** >= 18
- **whatsapp-web.js** — Integración nativa con WhatsApp Web
- **Express.js** — API REST para Nexus-App
- **MariaDB / MySQL** — Persistencia de datos en VPS
- **React Native / Expo** — Aplicación móvil ejecutiva (iOS y Android)

---

## Estructura

```
nexus-engine/
├── src/
│   ├── api/
│   │   └── routes.js         ← API REST para la App móvil
│   ├── bot/
│   │   ├── index.js          ← Arranque del bot de WhatsApp
│   │   ├── fsm.js            ← Máquina de Estados Finitos (bilingüe)
│   │   ├── reminders.js      ← Motor de recordatorios y notificaciones
│   │   └── handlers/
│   │       ├── welcome.js    ← Saludo, captura de nombre y selector de idioma
│   │       ├── service.js    ← Selección e info de servicios
│   │       ├── date.js       ← Selección de fecha (ES/EN)
│   │       ├── time.js       ← Selección de hora y anticipación de recordatorio
│   │       └── confirm.js    ← Resumen, confirmación y cancelación
│   ├── db/
│   │   ├── pool.js           ← Pool de conexiones MySQL
│   │   └── queries.js        ← Queries SQL y auto-migraciones de esquema
│   └── utils/
│       ├── phone.js          ← Normalización de teléfonos MX (+52) y US (+1)
│       ├── regex.js          ← Detección de intenciones y fechas en ES/EN
│       └── slots.js          ← Generador de horarios disponibles en tiempo real
├── nexus-app/                ← Aplicación móvil React Native (Expo)
├── migrations/               ← Migraciones SQL de base de datos
├── .env.example
└── package.json
```

---

## Instalación y Arranque

### 1. Clonar e instalar dependencias

```bash
git clone https://github.com/padillae12/nexus-engine.git
cd nexus-engine
npm install
```

### 2. Configurar variables de entorno

Copia `.env.example` a `.env` y configura tus credenciales de MySQL.

### 3. Arrancar en Producción (VPS con PM2)

```bash
pm2 start src/bot/index.js --name nexus-engine
```

---

## Flujo del Bot Bilingüe

```
Cliente escribe cualquier mensaje
         ↓
   Detección de País / Idioma
   (US +1 → English | MX +52 → Español)
         ↓
     Menú principal (1-5)
     1️⃣ Agendar cita / Book appointment
     2️⃣ Ver mis citas / View my appointments
     3️⃣ Cancelar cita / Cancel appointment
     4️⃣ Info y Horarios / Info & Hours
     5️⃣ 🌐 English / Español
```
