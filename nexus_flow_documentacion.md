# Nexus-Flow — Documentación Maestra del Sistema

> Versión: 1.4 · Última actualización: Julio 2026  
> Repositorio: `nexus-engine` · Motor: Node.js + MariaDB + WhatsApp

---

## Tabla de Contenidos

1. [Visión General](#1-visión-general)
2. [Arquitectura del Sistema](#2-arquitectura-del-sistema)
3. [Componente A — Nexus-Engine (Bot)](#3-componente-a--nexus-engine-bot)
   - [Flujo Conversacional (FSM)](#31-flujo-conversacional-fsm)
   - [Handlers y Responsabilidades](#32-handlers-y-responsabilidades)
   - [Algoritmo de Disponibilidad](#33-algoritmo-de-disponibilidad)
4. [Componente B+C — Nexus-App (App Móvil)](#4-componente-bc--nexus-app-app-móvil)
   - [Sistema de Roles y Acceso por PIN](#41-sistema-de-roles-y-acceso-por-pin)
   - [Pantallas por Modo](#42-pantallas-por-modo)
   - [Flujo de Autenticación](#43-flujo-de-autenticación)
5. [Base de Datos — Nexus-Flow](#5-base-de-datos--nexus-flow)
   - [Esquema de Tablas](#51-esquema-de-tablas)
   - [Relaciones](#52-relaciones)
   - [Datos de Ejemplo](#53-datos-de-ejemplo)
6. [API REST](#6-api-rest)
7. [Stack Tecnológico](#7-stack-tecnológico)
8. [Instalación y Despliegue](#8-instalación-y-despliegue)
9. [Variables de Entorno](#9-variables-de-entorno)
10. [Estrategia de Negocio](#10-estrategia-de-negocio)
11. [Formulario de Onboarding — Cliente](#11-formulario-de-onboarding--cliente)

---

## 1. Visión General

**Nexus-Flow** es una plataforma B2B de marca propia que automatiza el proceso de reservación y atención al cliente vía WhatsApp.

A diferencia de los bots comunes basados en IA generativa, Nexus-Flow integra un **motor de disponibilidad en tiempo real** que consulta una base de datos propia para:

- Ofrecer horarios libres exactos.
- Confirmar y cancelar citas.
- Gestionar recordatorios.

Todo sin costos de APIs externas de inteligencia artificial.

> **Propuesta de valor:** *"Un asistente que conoce tu agenda mejor que tú. No adivina (como la IA), ejecuta tus reglas de negocio con precisión quirúrgica."*

---

## 2. Arquitectura del Sistema

El sistema tiene **2 componentes activos** (B y C fueron fusionados en una sola app):

```
┌──────────────────────────────────────────────────────────────────┐
│                        NEXUS-FLOW                                │
│                                                                  │
│  ┌─────────────────────────┐   ┌──────────────────────────────┐  │
│  │    Componente A         │   │    Componente B+C            │  │
│  │    NEXUS-ENGINE         │   │    NEXUS-APP                 │  │
│  │    (Bot WhatsApp)       │   │    (App Móvil Unificada)     │  │
│  │                         │   │                              │  │
│  │    Node.js              │   │    React Native + Expo       │  │
│  │    whatsapp-web.js      │   │    Modo Recepcionista (def.) │  │
│  │    Puppeteer (headless) │   │    Modo Admin (PIN secreto)  │  │
│  │    FSM de estados       │   │                              │  │
│  └────────────┬────────────┘   └──────────────┬───────────────┘  │
│               │                               │                  │
│               └──────────────┬────────────────┘                  │
│                              ↓                                   │
│                 ┌─────────────────────────┐                      │
│                 │   API Express :3001      │ ← Sin dominio,       │
│                 │   (VPS propio)           │   acceso por IP      │
│                 └────────────┬────────────┘                      │
│                              ↓                                   │
│                 ┌─────────────────────────┐                      │
│                 │    MariaDB / MySQL       │ ← DB central         │
│                 │    DB: nexus_flow        │                      │
│                 └─────────────────────────┘                      │
│                                                                  │
│  📧 Notificaciones por correo → empleados (Resend)               │
└──────────────────────────────────────────────────────────────────┘
```

> **¿Por qué se fusionaron B y C?**  
> El Cockpit web requería dominio + hosting frontend. La App Expo conecta directo
> a `http://IP_VPS:3001/api` — sin dominio, sin costos extra. El dueño y los
> empleados usan la misma app con vistas diferentes según su rol.

---

## 3. Componente A — Nexus-Engine (Bot)

### Estructura de Archivos

```
src/
├── bot/
│   ├── index.js          ← Punto de entrada y arranque del bot
│   ├── fsm.js            ← Máquina de Estados Finitos (cerebro)
│   └── handlers/
│       ├── welcome.js    ← Saludo y captura de nombre
│       ├── service.js    ← Selección de servicio
│       ├── date.js       ← Selección de fecha
│       ├── time.js       ← Selección de hora
│       └── confirm.js    ← Confirmación y cancelación
├── db/
│   ├── pool.js           ← Pool de conexiones MySQL
│   └── queries.js        ← Todas las queries SQL
├── utils/
│   ├── regex.js          ← Detección de intenciones (RegEx)
│   └── slots.js          ← Generador de horarios disponibles
└── config.js             ← Variables de entorno centralizadas
```

### 3.1 Flujo Conversacional (FSM)

El bot implementa una **Máquina de Estados Finitos (FSM)** que rastrea en qué paso se encuentra cada cliente. La sesión expira tras **30 minutos de inactividad**.

```
[Cliente escribe cualquier mensaje]
           ↓
    IDLE → WELCOME
    ┌──────────────────────────┐
    │  ¿Es cliente nuevo?      │
    │  Sí → pide nombre        │ → WAITING_NAME
    │  No → menú directo       │ → MAIN_MENU
    └──────────────────────────┘
           ↓
       MAIN_MENU
    ┌─────────────────────────────┐
    │  1 → Agendar cita           │
    │  2 → Ver mis citas          │
    │  3 → Cancelar cita          │
    └─────────────────────────────┘
           ↓ (elige 1)
    SERVICE_SELECT
    Lista de servicios disponibles
           ↓
    DATE_SELECT
    ¿Para qué día? (entiende: "mañana", "el lunes", "14 de abril", "15/04")
           ↓
    TIME_SELECT
    Horarios disponibles ese día (sin conflictos)
           ↓
    CONFIRMATION
    Resumen completo + ¿Confirmas? (Sí / No)
           ↓ (Sí)
    ✅ Cita registrada en MySQL → MAIN_MENU
           ↓ (No)
    EDIT_MENU → regresa a editar servicio/fecha/hora
```

**Comando especial:** Escribir `reiniciar`, `menú`, `inicio` o `restart` en cualquier estado devuelve al usuario al menú principal.

### 3.2 Handlers y Responsabilidades

| Handler | Estado(s) que maneja | Responsabilidad |
|---|---|---|
| `welcome.js` | `IDLE`, `WELCOME`, `WAITING_NAME` | Registro de cliente nuevo, captura de nombre, construcción del menú principal |
| `service.js` | `SERVICE_SELECT` | Mostrar catálogo de servicios y capturar selección |
| `date.js` | `DATE_SELECT` | Parsear fechas en lenguaje natural y validar que sea un día hábil |
| `time.js` | `TIME_SELECT` | Mostrar slots disponibles y capturar selección de hora |
| `confirm.js` | `CONFIRMATION`, `EDIT_MENU`, `CANCEL_FLOW`, `CANCEL_SELECT` | Confirmar cita, permitir edición, gestionar cancelaciones |

### 3.3 Algoritmo de Disponibilidad

El módulo `utils/slots.js` implementa la lógica de disponibilidad:

1. **Consulta horarios de trabajo** del día solicitado (`horarios_trabajo`).
2. **Carga citas existentes** para ese día y empleado.
3. **Carga bloqueos activos** (comidas, festivos, vacaciones).
4. **Genera slots** cada `duracion_min` minutos dentro del horario activo.
5. **Filtra** los slots que colisionan con citas o bloqueos existentes.
6. **Devuelve** lista de horarios libres formateada para WhatsApp.

> Si el horario solicitado está ocupado, el motor ofrece automáticamente el siguiente espacio disponible (+`duracion_min` minutos).

**Prevención de conflictos:** La tabla `citas` tiene una restricción `UNIQUE KEY (empleado_id, fecha_inicio)` que impide a nivel de base de datos que dos citas ocupen el mismo slot simultáneamente.

---

## 4. Componente B+C — Nexus-App (App Móvil)

Aplicación móvil única que reemplaza al Cockpit web (B) y al Mobile planificado (C).  
Funciona en **celular o tablet** — tanto en el local del negocio como en el teléfono del dueño.

> **Sin dominio, sin hosting web.** La app conecta directo a `http://IP_VPS:3001/api`.

### 4.1 Sistema de Roles y Acceso por PIN

La app tiene **dos modos** que comparten la misma instalación:

| Modo | Quién lo usa | Cómo se activa |
|---|---|---|
| **Recepcionista** | Personal del local, recepcionista | Estado por defecto — siempre visible, sin login |
| **Admin** | Dueño del negocio | Ingresando un PIN secreto configurado en `config_negocio` |

- El PIN se guarda en `config_negocio` → clave `ADMIN_PIN` (hash bcrypt).
- La app valida el PIN contra `POST /api/auth/verify-pin`.
- **No hay JWT ni sesión en servidor** — el estado `isAdmin` vive en memoria de la app.
- Tras **5 minutos de inactividad**, la app regresa automáticamente al modo Recepcionista.

### 4.2 Pantallas por Modo

**Modo Recepcionista** *(siempre visible, sin autenticación)*

| Pantalla | Descripción |
|---|---|
| 🗓️ **Agenda del Día** | Citas del día ordenadas por hora, actualizadas en tiempo real |
| ⏱️ **Próxima Cita** | Cuenta regresiva al siguiente turno |
| 📋 **Detalle de Cita** | Nombre del cliente, servicio, hora, empleado asignado |
| ✅ **Cambio de Estado** | Marcar como completada / ausente / reagendar |
| 🚫 **Bloqueo Rápido** | Agregar un bloqueo urgente (emergencia, salida) |
| 🔔 **Notificaciones Push** | Alerta cuando llega una cita nueva o se cancela |

**Modo Admin** *(requiere PIN secreto del dueño)*

| Pantalla | Descripción |
|---|---|
| 📊 **Dashboard** | Citas hoy, clientes nuevos, tasa de asistencia, ingresos estimados |
| 👥 **Clientes** | Lista de clientes registrados por el bot, historial de citas |
| 📅 **Citas** | Vista calendario + historial completo |
| ⚙️ **Configuración** | Servicios, horarios de trabajo, bloqueos recurrentes |
| 🤖 **Control del Bot** | Pausar / reanudar el bot para atención manual |

### 4.3 Flujo de Autenticación

```
App abre
    ↓
┌──────────────────────────────┐
│   MODO RECEPCIONISTA         │  ← Estado por defecto, sin PIN
│   (agenda del día visible)   │
└──────────────────────────────┘
         │
         │  Dueño toca el logo × 5  (gesto discreto)
         ↓
┌──────────────────────────────┐
│   Modal: Ingresa PIN         │
│   ● ● ● ● ● ●                │
└──────────────────────────────┘
         │
    ┌────┴────┐
  ✅ OK     ❌ Incorrecto
    ↓              ↓
MODO ADMIN    sigue en Recepcionista
    ↓
(5 min sin actividad → regresa solo a Recepcionista)
```

```
App                        API (Express)
 │                              │
 │── POST /api/auth/verify-pin ─→│
 │   { pin: "123456" }           │  bcrypt.compare(pin, hash)
 │←── { ok: true } ─────────────│
 │                              │
 │  isAdmin = true (en memoria) │
 │  Timer 5 min → isAdmin=false │
```

### Notificaciones por Correo a Empleados

El sistema enviará **correos automáticos** vía **Resend** a los empleados asignados:

| Evento | Cuándo | Contenido |
|---|---|---|
| **Cita nueva** | Al confirmar la cita el bot | Nombre cliente, servicio, fecha y hora |
| **Recordatorio** | X horas antes (configurable) | Resumen de la cita próxima |
| **Cancelación** | Cuando el cliente cancela | Notificación de slot liberado |

### Stack Tecnológico

| Tecnología | Uso |
|---|---|
| **React Native + Expo** | Framework (iOS y Android desde un solo código) |
| **Expo Router** | Navegación entre pantallas |
| **Expo Notifications** | Push notifications en el dispositivo |
| **API REST existente** | Misma API Express del backend |
| **Resend** | Correos de notificación a empleados |
| **bcrypt** | Hash del PIN de admin |

### Estado Actual

🔴 **Planificado** — No iniciado. Es el siguiente componente a construir.

### Flujo de Datos

```
[Cliente agenda cita vía WhatsApp]
         ↓
  Nexus-Engine guarda en DB
         ↓
    ┌────┴────┐
    ↓         ↓
📱 Nexus-App     📧 Correo al empleado
(cita aparece    ("Tienes cita el Lunes
 en la agenda)    a las 10am - Carlos R.")
```

---

## 5. Base de Datos — Nexus-Flow

**Motor:** MariaDB / MySQL  
**Nombre de BD:** `nexus_flow`  
**Usuario:** `nexus_user`  
**Charset:** `utf8mb4` / `utf8mb4_unicode_ci`

### 5.1 Esquema de Tablas

#### `usuarios`
Almacena al dueño (admin), encargados y empleados.

| Campo | Tipo | Notas |
|---|---|---|
| `id` | INT UNSIGNED PK AUTO_INCREMENT | |
| `nombre` | VARCHAR(100) NOT NULL | |
| `email` | VARCHAR(150) NOT NULL UNIQUE | |
| `password` | VARCHAR(255) NOT NULL | Hash bcrypt |
| `rol` | ENUM | `admin` · `encargado` · `empleado` |
| `activo` | TINYINT(1) | Default: `1` |
| `creado_en` | TIMESTAMP | Default: `CURRENT_TIMESTAMP` |

---

#### `clientes`
Registro automático de cada número de WhatsApp que contacta al bot.

| Campo | Tipo | Notas |
|---|---|---|
| `id` | INT UNSIGNED PK AUTO_INCREMENT | |
| `telefono` | VARCHAR(20) NOT NULL UNIQUE | Ej: `+526789012345` |
| `nombre` | VARCHAR(100) NULL | Capturado en el flujo de bienvenida |
| `creado_en` | TIMESTAMP | Default: `CURRENT_TIMESTAMP` |

---

#### `servicios`
Catálogo de servicios que ofrece el negocio.

| Campo | Tipo | Notas |
|---|---|---|
| `id` | INT UNSIGNED PK AUTO_INCREMENT | |
| `nombre` | VARCHAR(100) NOT NULL | |
| `descripcion` | TEXT NULL | |
| `precio` | DECIMAL(10,2) NULL | `NULL` = precio variable o no aplica |
| `mostrar_precio` | TINYINT(1) | `1` = el bot menciona el precio |
| `duracion_min` | SMALLINT | Default: `60` minutos |
| `activo` | TINYINT(1) | Default: `1` (visible en el bot) |

---

#### `horarios_trabajo`
Define los días y horas en que opera el negocio o un empleado específico.

| Campo | Tipo | Notas |
|---|---|---|
| `id` | INT UNSIGNED PK AUTO_INCREMENT | |
| `empleado_id` | INT UNSIGNED NULL FK→usuarios | `NULL` = horario global del negocio |
| `dia_semana` | TINYINT | `0`=Dom · `1`=Lun · ... · `6`=Sáb |
| `hora_inicio` | TIME | Ej: `09:00:00` |
| `hora_fin` | TIME | Ej: `18:00:00` |

---

#### `bloqueos`
Días festivos, comidas, vacaciones. Soporta bloqueos **puntuales** y **recurrentes**.

| Campo | Tipo | Notas |
|---|---|---|
| `id` | INT UNSIGNED PK AUTO_INCREMENT | |
| `empleado_id` | INT UNSIGNED NULL FK→usuarios | `NULL` = bloqueo global |
| `motivo` | VARCHAR(100) NOT NULL | Ej: `"Comida"`, `"Festivo"` |
| `fecha_inicio` | DATETIME NOT NULL | Inicio del rango (o validez si recurrente) |
| `fecha_fin` | DATETIME NOT NULL | Fin del rango (o validez si recurrente) |
| `recurrente` | TINYINT(1) | `0` = puntual · `1` = repite cada semana |
| `hora_inicio_hora` | TIME NULL | Solo si recurrente: hora diaria de inicio |
| `hora_fin_hora` | TIME NULL | Solo si recurrente: hora diaria de fin |
| `dias_semana` | VARCHAR(20) NULL | Solo si recurrente: CSV de días (ej: `"1,2,3,4,5"`) |

---

#### `citas`
Registro central de todas las citas agendadas por el bot.

| Campo | Tipo | Notas |
|---|---|---|
| `id` | INT UNSIGNED PK AUTO_INCREMENT | |
| `cliente_id` | INT UNSIGNED NOT NULL FK→clientes | |
| `servicio_id` | INT UNSIGNED NOT NULL FK→servicios | |
| `empleado_id` | INT UNSIGNED NULL FK→usuarios | Quién atenderá |
| `fecha_inicio` | DATETIME NOT NULL | Fecha y hora exacta |
| `fecha_fin` | DATETIME NOT NULL | `fecha_inicio` + `duracion_min` |
| `estado` | ENUM | `pendiente` · `confirmada` · `cancelada` · `completada` |
| `notas` | TEXT NULL | |
| `creado_en` | TIMESTAMP | Default: `CURRENT_TIMESTAMP` |

> **Restricción anti-colisión:** `UNIQUE KEY (empleado_id, fecha_inicio)` — impide doble reserva en el mismo slot.

#### `config_negocio`
Parámetros configurables del bot y la app por cliente.

| Campo | Tipo | Notas |
|---|---|---|
| `clave` | VARCHAR(60) PK | Ej: `MIN_BOOKING_HOURS`, `ADMIN_PIN` |
| `valor` | VARCHAR(255) NOT NULL | Valor como cadena |
| `descripcion` | VARCHAR(255) NULL | Descripción legible |

Claves importantes:

| Clave | Descripción |
|---|---|
| `ADMIN_PIN` | PIN del dueño (hash bcrypt) para acceso al modo Admin en la app |
| `MIN_BOOKING_HOURS` | Anticipación mínima para agendar |
| `MAX_BOOKING_DAYS` | Días máximos a futuro para agendar |
| `CANCEL_HOURS_LIMIT` | Anticipación mínima para cancelar |
| `OFFER_RESCHEDULE` | ¿El bot ofrece reagendar al cancelar? |
| `EMPLOYEE_SELECTION` | ¿El cliente puede elegir empleado? |
| `BOT_NAME` | Nombre del asistente virtual |
| `BOT_WELCOME_MSG` | Frase de bienvenida personalizada |

---

### 5.2 Relaciones

```
usuarios ←──────────────── horarios_trabajo (empleado_id)
usuarios ←──────────────── bloqueos (empleado_id)
usuarios ←──────────────── citas (empleado_id)
clientes ←──────────────── citas (cliente_id)
servicios ←─────────────── citas (servicio_id)
```

### 5.3 Datos de Ejemplo

El archivo `migrations/001_initial_schema.sql` incluye datos de ejemplo para un **consultorio dental**:

- **Servicios:** Consulta general (30 min), Limpieza dental (60 min), Extracción simple (45 min), Ortodoncia (20 min).
- **Horario global:** Lunes a Viernes, 9:00am – 6:00pm.
- **Bloqueo de ejemplo:** Comida 2:00pm–3:00pm.
- **Usuario admin:** `admin@minegocio.com` (cambiar password en producción).

La migración `002_add_missing_fields.sql` agrega: campo `precio` en servicios, soporte de bloqueos recurrentes en `bloqueos`, y la tabla `config_negocio` con valores por defecto.

---

## 6. API REST

La API Express corre en el puerto `3001` (configurable con `API_PORT`). La Nexus-App y el bot la consumen directamente por IP sin necesidad de dominio.

| Método | Endpoint | Descripción |
|---|---|---|
| `GET` | `/api/health` | Healthcheck de la API. Retorna `{ status: 'ok', timestamp }` |
| `GET` | `/api/db-health` | Healthcheck de la base de datos. Verifica conexión real a MariaDB |
| `POST` | `/api/auth/verify-pin` | Verifica el PIN del dueño para acceso al modo Admin en la app |

### `POST /api/auth/verify-pin`
```json
// Request
{ "pin": "123456" }

// Response — éxito
{ "ok": true }

// Response — PIN incorrecto
{ "ok": false }
```

> El PIN se compara contra el hash bcrypt almacenado en `config_negocio` clave `ADMIN_PIN`.
> No se emite ningún token — el estado de admin vive solo en la memoria de la app.

---

## 7. Stack Tecnológico

### Backend (Nexus-Engine + API)

| Tecnología | Versión | Uso |
|---|---|---|
| **Node.js** | ≥18.0.0 | Runtime |
| **whatsapp-web.js** | ^1.23.0 | Cliente WhatsApp vía Puppeteer (sesión QR) |
| **qrcode-terminal** | ^0.12.0 | Generación del QR en consola para vincular sesión |
| **mysql2** | ^3.9.7 | Cliente MySQL/MariaDB con promesas |
| **express** | ^4.22.1 | Servidor API REST |
| **cors** | ^2.8.6 | Política de orígenes cruzados |
| **dotenv** | ^16.4.5 | Variables de entorno |
| **bcrypt** | ^5.x | Hash del PIN de admin |
| **nodemon** | ^3.1.14 | Hot-reload en desarrollo |

### Nexus-App (Móvil — Componente B+C)

| Tecnología | Versión | Uso |
|---|---|---|
| **React Native** | 0.74+ | Framework móvil |
| **Expo** | SDK 51+ | Toolchain y distribución |
| **Expo Router** | v3 | Navegación entre pantallas |
| **Expo Notifications** | — | Push notifications |
| **Resend** | — | Correos de notificación a empleados |

### Infraestructura

| Componente | Tecnología |
|---|---|
| **Servidor** | VPS propio (Mexicali) |
| **Base de datos** | MariaDB |
| **Proceso manager** | PM2 |
| **Transporte WhatsApp** | whatsapp-web.js + Puppeteer (sesión QR por chip) |
| **Sesión persistente** | LocalAuth — guardada en `.wwebjs_auth/` |

---

## 8. Instalación y Despliegue

### Paso 0 — Vincular el número de WhatsApp (POR CLIENTE)

> La sesión se crea escaneando el QR con el número del negocio.
> La librería `whatsapp-web.js` guarda la sesión en `.wwebjs_auth/` para no pedir el QR en cada reinicio.

1. **Instalar las dependencias** del proyecto (`npm install`).
2. **Arrancar el bot** por primera vez (`npm run dev:bot`).
3. **Escanear el código QR** que aparece en la terminal con el WhatsApp del negocio.
4. El bot quedará conectado — la sesión se guarda automáticamente.

> **Tiempo estimado:** 5 minutos la primera vez. Reinicios posteriores son automáticos vía PM2.

---

### Instalación Local

```bash
# 1. Clonar el repositorio
git clone https://github.com/tu-usuario/nexus-engine.git
cd nexus-engine

# 2. Instalar dependencias del backend
npm install

# 3. Configurar variables de entorno
cp .env.example .env
# Editar .env con datos del VPS Y las credenciales de Meta del cliente
```

### Inicializar la Base de Datos

```bash
mysql -u root -p < migrations/001_initial_schema.sql
```

Luego editar los servicios y horarios en el SQL según el negocio real.

### Arrancar en Desarrollo

```bash
# Bot (whatsapp-web.js — escanear QR la primera vez)
npm start          # producción
npm run dev:bot    # desarrollo con hot-reload

# API del backend
npm run dev:api    # hot-reload
npm run start:api  # producción

# Nexus-App (cuando esté desarrollada)
# cd nexus-app && npx expo start
```

### Despliegue en Producción (VPS + PM2)

```bash
# Instalar PM2 (solo la primera vez)
npm install -g pm2

# Arrancar el bot (escanear QR la primera vez en consola)
pm2 start src/bot/index.js --name nexus-engine

# Arrancar la API
pm2 start src/api/server.js --name nexus-api

# Guardar y configurar arranque automático
pm2 save
pm2 startup
```

> **Nota:** Si la sesión expira, PM2 reiniciará el proceso y pedirá el QR de nuevo.
> Revisar logs con: `pm2 logs nexus-engine`

### Scripts Disponibles

| Script | Comando | Descripción |
|---|---|---|
| `start` | `node src/bot/index.js` | Arrancar bot en producción |
| `start:bot` | `node src/bot/index.js` | Alias de start |
| `start:api` | `node src/api/server.js` | Arrancar API en producción |
| `dev:bot` | `node --watch src/bot/index.js` | Bot con hot-reload |
| `dev:api` | `node --watch src/api/server.js` | API con hot-reload |

---

## 9. Variables de Entorno

Crear el archivo `.env` en la raíz del proyecto copiando `.env.example`:

**Base de datos**

| Variable | Ejemplo | Descripción |
|---|---|---|
| `DB_HOST` | `localhost` | IP del servidor MySQL |
| `DB_PORT` | `3306` | Puerto MySQL/MariaDB |
| `DB_USER` | `nexus_user` | Usuario de la DB |
| `DB_PASSWORD` | `tu_password` | Contraseña del usuario DB |
| `DB_NAME` | `nexus_flow` | Nombre de la base de datos |
| `USE_MOCK_DB` | `true` | `true` = modo sin VPS (desarrollo) |

**Información del negocio**

| Variable | Ejemplo | Descripción |
|---|---|---|
| `BUSINESS_NAME` | `Clínica García` | Nombre en mensajes del bot |
| `BUSINESS_SOCIAL` | `instagram.com/x` | Redes sociales (opcional) |

**Personalidad del bot**

| Variable | Ejemplo | Descripción |
|---|---|---|
| `BOT_NAME` | `Sofía` | Nombre del asistente virtual |
| `BOT_WELCOME_MSG` | `¡Hola!...` | Frase de bienvenida personalizada |
| `BOT_TONE` | `semiformal` | `formal` · `semiformal` · `casual` |

**Reglas de agendamiento**

| Variable | Ejemplo | Descripción |
|---|---|---|
| `MIN_BOOKING_HOURS` | `2` | Horas mínimas de anticipación |
| `MAX_BOOKING_DAYS` | `30` | Días máximos a futuro |
| `CANCEL_HOURS_LIMIT` | `24` | Horas mínimas para cancelar |
| `OFFER_RESCHEDULE` | `true` | ¿Ofrecer reagendar al cancelar? |
| `EMPLOYEE_SELECTION` | `false` | ¿Cliente puede elegir empleado? |

**Infraestructura**

| Variable | Ejemplo | Descripción |
|---|---|---|
| `API_PORT` | `3001` | Puerto de la API Express |
| `WEBHOOK_PORT` | `3002` | Puerto del webhook del bot |

> **Nota:** El PIN del modo Admin (`ADMIN_PIN`) se configura directamente en la tabla `config_negocio` de la DB, no en `.env`, ya que debe estar hasheado con bcrypt.

---

## 10. Estrategia de Negocio

### Mercado Objetivo

**Nicho principal:** Mexicali, B.C., México  
**Sectores:** Consultorios médicos, dentistas, técnicos de refrigeración, salones de belleza.

### Modelo de Ingresos

| Concepto | Monto |
|---|---|
| **Inscripción** (configuración inicial de BD y horarios) | $3,500 MXN |
| **Mensualidad** (soporte, hosting y acceso al Dashboard) | $2,500 MXN/mes |

### Ventaja Competitiva

- **$0 MXN en IA.** El único gasto operativo es el mantenimiento del VPS propio.
- El sistema no "adivina" — ejecuta reglas de negocio exactas definidas por el cliente.
- Alta rentabilidad por cliente: costo operativo marginal casi nulo.

### Prompt de Referencia (para desarrollo)

> *"Tengo un proyecto en Node.js llamado Nexus-Flow. Es un bot de WhatsApp basado en reglas que gestiona citas. Necesito ayuda para [crear el Query SQL que busque horarios disponibles / definir el sistema de estados en Node / crear la vista del calendario en el Dashboard] siguiendo esta estructura de lógica propia sin APIs de IA."*

---

## 11. Formulario de Onboarding — Cliente

> Entregar este formulario al dueño del negocio antes de iniciar la configuración.  
> **Tiempo estimado de llenado: 15–20 minutos.**

---

### SECCIÓN 1 — Información del Negocio

**1.1** ¿Cuál es el nombre oficial de tu negocio?
```
R:
```

**1.2** ¿A qué se dedica tu negocio? (Descripción breve en 1-2 oraciones)
```
R:
```

**1.3** ¿En qué ciudad/colonia están ubicados?
```
R:
```

**1.4** ¿Cuál es el número de WhatsApp que usará el bot? (con código de país, ej: +526861234567)
```
R:
```

**1.5** ¿Tienes redes sociales o página web que el bot pueda mencionar?
```
R:
```

---

### SECCIÓN 2 — Servicios

**2.1** Lista todos los servicios que ofreces:

| # | Nombre del servicio | Descripción breve | Duración (min) | ¿Activo? |
|---|---|---|---|---|
| 1 | | | | Sí / No |
| 2 | | | | Sí / No |
| 3 | | | | Sí / No |
| 4 | | | | Sí / No |
| 5 | | | | Sí / No |
| 6 | | | | Sí / No |

**2.2** ¿Los servicios tienen precio fijo? ¿Quieres que el bot lo mencione?
```
R:
```

**2.3** ¿Hay servicios que requieren datos adicionales al agendar?
```
R: (ej: "para Ortodoncia necesito saber si es primera visita")
```

---

### SECCIÓN 3 — Horarios de Trabajo

**3.1** ¿Qué días de la semana atienden?
- [ ] Lunes · [ ] Martes · [ ] Miércoles · [ ] Jueves · [ ] Viernes · [ ] Sábado · [ ] Domingo

**3.2** ¿Cuál es el horario de atención?
```
Horario general:  de ______ a ______
Sábado (si aplica): de ______ a ______
Excepciones:
```

**3.3** ¿Tienen hora de comida o descanso que el bot NO debe ofrecer?
```
R: (ej: de 2:00pm a 3:00pm todos los días)
```

**3.4** ¿Con cuánto tiempo de anticipación mínimo se puede agendar una cita?
```
R: (ej: mínimo 2 horas antes / mínimo 1 día antes)
```

**3.5** ¿Hasta cuántos días en el futuro se puede agendar?
```
R: (ej: máximo 30 días / máximo 2 semanas)
```

---

### SECCIÓN 4 — Personal / Empleados

**4.1** ¿Cuántas personas atienden citas en tu negocio?
```
R:
```

**4.2** ¿Los clientes pueden elegir con quién quieren su cita?
- [ ] Se asigna automáticamente (el bot elige al disponible)
- [ ] El cliente puede elegir al empleado
- [ ] Solo hay una persona que atiende

**4.3** Si hay varios empleados:

| # | Nombre | Servicios que realiza | Horario diferente al general |
|---|---|---|---|
| 1 | | | |
| 2 | | | |
| 3 | | | |

---

### SECCIÓN 5 — Tono y Personalidad del Bot

**5.1** ¿Cómo quieres que hable el bot con tus clientes?
- [ ] Formal (usted, profesional)
- [ ] Semi-formal (tú, amigable pero profesional)
- [ ] Casual (relajado, con emojis)

**5.2** ¿Cómo se va a llamar el asistente virtual?
```
R: (ej: "Sofía", "Asistente Dental Dr. García", "El bot de BeautyStudio")
```

**5.3** ¿Hay alguna frase de bienvenida específica que quieras usar?
```
R: (ej: "¡Hola! Gracias por contactar a Clínica García, tu salud es nuestra prioridad.")
```

**5.4** ¿En qué idioma deben ser los mensajes?
- [ ] Solo español
- [ ] Solo inglés
- [ ] Español e inglés (el bot detecta el idioma del cliente)

---

### SECCIÓN 6 — Reglas de Negocio

**6.1** ¿Con cuánto tiempo de anticipación se puede cancelar una cita?
```
R: (ej: hasta 24 horas antes / en cualquier momento)
```

**6.2** ¿Quieres que el bot envíe un recordatorio antes de la cita?
- [ ] Sí — ¿con cuánto tiempo de anticipación? __________
- [ ] No

**6.3** ¿Qué pasa si un cliente cancela? ¿El bot le ofrece reagendar?
- [ ] Sí, ofrecer reagendar automáticamente
- [ ] No, solo confirmar la cancelación

**6.4** ¿Hay días festivos o fechas especiales sin servicio?
```
R:
```

**6.5** ¿Cuántas citas simultáneas puede manejar tu negocio?
```
R: (ej: 1 cita a la vez / hasta 3 simultáneas con diferentes empleados)
```

---

### SECCIÓN 7 — Flujo de la Conversación

**7.1** Cuando alguien escribe por primera vez, ¿quieres pedirle su nombre?
- [ ] Sí, siempre
- [ ] No, ir directo al menú

**7.2** ¿Quieres que el bot pida algún dato extra al registrar la cita?
```
R: (ej: email, motivo de visita, si es primera vez)
```

**7.3** ¿Qué debe hacer el bot cuando no entiende un mensaje?
- [ ] Pedir que repita la pregunta
- [ ] Mostrar el menú principal
- [ ] Dar un número de teléfono para hablar con una persona

**7.4** ¿Quieres opción de transferir a un humano (pausar el bot)?
- [ ] Sí
- [ ] No

**7.5** Si un cliente escribe fuera del horario de atención, ¿qué debe responder el bot?
```
R: (ej: "Estamos fuera de horario, atendemos de L-V 9am-6pm. ¡Puedes agendar tu cita aquí mismo!")
```

---

### SECCIÓN 8 — Información Extra

**8.1** ¿Hay algo especial sobre tu negocio que el bot debería saber o mencionar?
```
R:
```

**8.2** ¿Tienes alguna política de pago, depósito o confirmación que el cliente debe saber?
```
R:
```

**8.3** ¿Alguna pregunta frecuente de tus clientes que el bot deba responder?

| Pregunta del cliente | Respuesta que debe dar el bot |
|---|---|
| | |
| | |
| | |

---

### ✅ Checklist de Configuración (uso interno Nexus-Flow)

**PASO 0 — Vinculación de WhatsApp (por cliente)**
- [ ] Número de WhatsApp del negocio disponible (chip físico)
- [ ] `npm install` ejecutado en el VPS
- [ ] Bot arrancado (`npm run dev:bot` o `pm2 start`)
- [ ] Código QR escaneado desde el WhatsApp del negocio
- [ ] Sesión guardada correctamente en `.wwebjs_auth/`

**PASO 1 — Configuración del negocio**
- [ ] Información del negocio capturada en `.env` (`BUSINESS_NAME`)
- [ ] Servicios cargados en la base de datos (`tabla: servicios`)
- [ ] Horarios configurados (`tabla: horarios_trabajo`)
- [ ] Bloqueos registrados (`tabla: bloqueos`)
- [ ] Empleados registrados si aplica (`tabla: usuarios`)
- [ ] Tono y mensajes personalizados en los handlers

**PASO 2 — Pruebas y entrega**
- [ ] Prueba de flujo completo realizada (agendar → confirmar → cancelar)
- [ ] Webhook verificado: `GET /webhook` responde 200 con el challenge
- [ ] Mensaje de prueba enviado al número desde WhatsApp y respuesta recibida
- [ ] Bot desplegado en PM2 en el VPS con `pm2 start`
- [ ] Bot entregado y dueño capacitado

---

*Generado a partir de: `README.md`, `nexus.rtf`, `nexus_flow_schema.txt`, `migrations/001_initial_schema.sql`, `migrations/002_add_missing_fields.sql`, `.env.example`, `src/bot/fsm.js`, `src/bot/whatsapp.js`, `src/api/routes.js`, `src/db/queries.js`, `src/db/queries.mock.js`, `package.json`*
