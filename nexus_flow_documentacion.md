# Nexus-Flow — Documentación Maestra del Sistema

> Versión: 2.0 · Última actualización: Julio 2026  
> Repositorio: `nexus-engine` · Motor: Node.js + MariaDB + WhatsApp + React Native / Expo

---

## Tabla de Contenidos

1. [Visión General](#1-visión-general)
2. [Arquitectura del Sistema](#2-arquitectura-del-sistema)
3. [Componente A — Nexus-Engine (Bot de WhatsApp)](#3-componente-a--nexus-engine-bot-de-whatsapp)
   - [Flujo Conversacional (FSM & Estados)](#31-flujo-conversacional-fsm--estados)
   - [Opción 4: Información y Horarios](#32-opción-4-información-y-horarios)
   - [Sistema de Recordatorios Personalizados por el Cliente](#33-sistema-de-recordatorios-personalizados-por-el-cliente)
   - [Motor de Notificaciones a Empleados en Tiempo Real](#34-motor-de-notificaciones-a-empleados-en-tiempo-real)
   - [Algoritmo de Disponibilidad y Zonas Horarias](#35-algoritmo-de-disponibilidad-y-zonas-horarias)
4. [Componente B+C — Nexus-App (App Móvil & Web Ejecutiva)](#4-componente-bc--nexus-app-app-móvil--web-ejecutiva)
   - [Diseño Visual "Obsidian Dark" & Vector Icons](#41-diseño-visual-obsidian-dark--vector-icons)
   - [Agendamiento Manual con Calendario Nativo](#42-agendamiento-manual-con-calendario-nativo)
   - [Navegación Segmentada (Hoy / Mañana) & Registros](#43-navegación-segmentada-hoy--mañana--registros)
   - [Directorio y Gestión de Empleados con WhatsApp](#44-directorio-y-gestión-de-empleados-con-whatsapp)
   - [Dashboard de Ingresos Confirmados (60 días)](#45-dashboard-de-ingresos-confirmados-60-días)
   - [Acceso Multiplataforma (Android, iOS y Web)](#46-acceso-multiplataforma-android-ios-y-web)
5. [Base de Datos — Nexus-Flow](#5-base-de-datos--nexus-flow)
   - [Esquema de Tablas Actualizado](#51-esquema-de-tablas-actualizado)
   - [Migraciones y Auto-Schema](#52-migraciones-y-auto-schema)
6. [API REST (Endpoints Completos)](#6-api-rest-endpoints-completos)
7. [Stack Tecnológico](#7-stack-tecnológico)
8. [Instalación y Despliegue en VPS](#8-instalación-y-despliegue-en-vps)
9. [Solución de Problemas Comunes](#9-solución-de-problemas-comunes)
10. [Estrategia de Negocio y Competencia](#10-estrategia-de-negocio-y-competencia)
11. [Formulario de Onboarding — Cliente](#11-formulario-de-onboarding--cliente)

---

## 1. Visión General

**Nexus-Flow** es una plataforma B2B de automatización de citas y gestión de recepción para negocios locales (clínicas dentales, estéticas, barberías, consultorios, spas y talleres de detailing).

A diferencia de los bots comunes basados en IA generativa o en formularios web estáticos, Nexus-Flow integra un **motor conversacional directo en WhatsApp** conectado en tiempo real a una base de datos MariaDB y a una **App móvil/web ejecutiva de recepción**.

> **Propuesta de valor:** *"Atención automática las 24 horas del día, los 7 días de la semana, directo en WhatsApp sin costos por mensaje, combinada con una App móvil de recepción para controlar tus citas, tus empleados y tus ingresos en tiempo real."*

---

## 2. Arquitectura del Sistema

El sistema consta de **2 componentes principales** totalmente integrados:

```
┌──────────────────────────────────────────────────────────────────┐
│                        NEXUS-ENGINE                              │
│                                                                  │
│  ┌─────────────────────────┐   ┌──────────────────────────────┐  │
│  │  Componente A           │   │  Componente B+C              │  │
│  │  BOT DE WHATSAPP        │   │  NEXUS-APP (Móvil & Web)     │  │
│  │  · WhatsApp-Web.js      │   │  · React Native + Expo Web   │  │
│  │  · Máquina de Estados   │   │  · Diseño Obsidian Dark      │  │
│  │  · Motor Recordatorios  │   │  · Calendario Nativo         │  │
│  │  · Notif. a Empleados   │   │  · Directorio Empleados      │  │
│  └────────────┬────────────┘   └──────────────┬───────────────┘  │
│               │                               │                  │
│               └───────────────┬───────────────┘                  │
│                               ▼                                  │
│                 ┌───────────────────────────┐                    │
│                 │   API REST Express (3001) │                    │
│                 └─────────────┬─────────────┘                    │
│                               ▼                                  │
│                 ┌───────────────────────────┐                    │
│                 │   Base de Datos MariaDB   │                    │
│                 └───────────────────────────┘                    │
└──────────────────────────────────────────────────────────────────┘
```

---

## 3. Componente A — Nexus-Engine (Bot de WhatsApp)

### 3.1 Flujo Conversacional (FSM & Estados)

El bot implementa una **Máquina de Estados Finitos (FSM)** que rastrea paso a paso a cada cliente. La sesión inactiva se resetea a los **30 minutos**.

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
       MAIN_MENU (4 Opciones)
    ┌─────────────────────────────────────────┐
    │ 1️⃣ 📅 Agendar una cita                  │
    │ 2️⃣ 📋 Ver mis citas                     │
    │ 3️⃣ ❌ Cancelar una cita                 │
    │ 4️⃣ ℹ️ Información y Horarios            │
    └─────────────────────────────────────────┘
           ↓ (Elige 1)
    SERVICE_SELECT
    Muestra catálogo de servicios con precio y duración
           ↓
    DATE_SELECT
    Selección de fecha ("hoy", "mañana", "el lunes", "14/04")
           ↓
    TIME_SELECT
    Muestra horarios libres calculados sin colisiones
           ↓
    REMINDER_SELECT (Nuevo)
    🔔 ¿Cuándo recibir recordatorio? (1h / 2h / 24h / Ninguno)
           ↓
    CONFIRMATION
    Resumen completo + ¿Confirmas? (Sí / No)
           ↓ (Sí)
    ✅ Cita registrada en MariaDB
       ├─ Notificación instantánea por WhatsApp al Empleado
       └─ Regreso a MAIN_MENU
```

### 3.2 Opción 4: Información y Horarios

El menú principal incluye la **Opción 4 (Información y Horarios)**. Además, mediante RegEx en `src/utils/regex.js`, el bot detecta automáticamente cuando un cliente pregunta por *"horarios"*, *"ubicación"*, *"dónde están"* o *"info"*:

```text
ℹ️ INFORMACIÓN Y HORARIOS DE ATENCIÓN

⏰ Horarios de Atención:
• Lunes a Viernes: 09:00 AM - 07:00 PM
• Sábados: 09:00 AM - 02:00 PM
• Domingos: Cerrado

📍 Ubicación:
Visítanos en nuestra sucursal principal.

_¿Necesitas algo más? Escribe el número de la opción (1, 2, 3) o "menú" para volver al inicio._
```

### 3.3 Sistema de Recordatorios Personalizados por el Cliente

Antes de finalizar la reserva (estado `REMINDER_SELECT`), el bot le ofrece al cliente elegir con cuánto tiempo de anticipación desea su recordatorio por WhatsApp:

1. **1 hora antes** (`60` minutos).
2. **2 horas antes** (`120` minutos - por defecto).
3. **1 día antes (24 hrs)** (`1440` minutos).
4. **Sin recordatorio** (`0` minutos).

Un **motor en segundo plano (`src/bot/reminders.js`)** ejecuta un worker cada 60 segundos buscando citas confirmadas en MariaDB cuya fecha y hora de recordatorio ha llegado, enviando el mensaje por WhatsApp automáticamente sin intervención humana.

### 3.4 Motor de Notificaciones a Empleados en Tiempo Real

Cuando se confirma una cita (vía WhatsApp o manualmente desde la App):
- El sistema consulta si la cita tiene un empleado asignado (o el admin por defecto).
- Si el empleado tiene configurado un número de **WhatsApp** en la base de datos, el bot le envía inmediatamente una alerta a su teléfono personal:

```text
🔔 NUEVA CITA ASIGNADA

Hola Juan Pérez, se agendó una nueva cita:

👤 Cliente: María López
📱 Teléfono: +526621234567
🛎️ Servicio: Ortodoncia
📅 Fecha: Viernes 24 de Julio
⏰ Hora: 10:00am
```

### 3.5 Algoritmo de Disponibilidad y Zonas Horarias

- Usa `CURDATE()` y `DATE_ADD(CURDATE(), INTERVAL 1 DAY)` en consultas MariaDB para evitar errores de zona horaria (discrepancia UTC vs UTC-7).
- Cruza en tiempo real: horario de trabajo del día + citas agendadas + bloqueos de comida/emergencia.

---

## 4. Componente B+C — Nexus-App (App Móvil & Web Ejecutiva)

### 4.1 Diseño Visual "Obsidian Dark" & Vector Icons

- **Tema de Diseño:** Fondo negro obsidiana (`#0B0F17`), tarjetas en pizarra oscura (`#111827`), bordes afilados (`#1F2937`) y acentos en índigo ejecutivo (`#6366F1`).
- **Zero Emojis:** Removidos todos los emojis informales del sistema y reemplazados por íconos vectoriales nítidos de `@expo/vector-icons` (`Ionicons`).

### 4.2 Agendamiento Manual con Calendario Nativo

- Botón **`+ Agendar`** disponible tanto en la Agenda de Recepción como en el panel de Administración de Citas.
- Abre el modal ejecutivo **`NuevaCitaModal.jsx`**:
  - Selector de cliente y teléfono.
  - Catálogo de servicios interactivo con precios actualizados en tiempo real.
  - **Calendario Nativo Interactivo (`@react-native-community/datetimepicker`)** que despliega el pop-up nativo de Android/iOS/Web para seleccionar cualquier fecha del año.
  - Chips rápidos de horarios (`09:00`, `10:00`, `11:00`, etc.) o entrada manual.

### 4.3 Navegación Segmentada (Hoy / Mañana) & Registros

- Pestaña segmentada en recepción para alternar al instante entre las citas de **`HOY`** y las citas de **`MAÑANA`**.
- La pantalla de detalle de cita (`app/cita/[id].jsx`) muestra de forma transparente:
  - **FECHA PROGRAMADA:** Día y hora en que se atenderá al cliente.
  - **FECHA DE REGISTRO / AGENDADA EL:** Timestamp exacto (`creado_en`) en que la cita ingresó al sistema.

### 4.4 Directorio y Gestión de Empleados con WhatsApp

En la pantalla de **Configuración Admin (`app/admin/configuracion.jsx`)**:
- Sección **`EMPLEADOS Y NOTIFICACIONES DE WHATSAPP`**.
- Permite listar, agregar y actualizar empleados con su Nombre, Correo y **Número de WhatsApp de contacto**.

### 4.5 Dashboard de Ingresos Confirmados (60 días)

- Reemplazado el antiguo estimado de ingresos por la **suma estricta de precios de citas en estado `completada`**.
- Tarjeta de **Ingresos de Hoy** + Banner acumulado de **Ingresos del Mes**.
- Tabla de **Historial de Ingresos Diarios (Últimos 60 días)** indicando fecha, cantidad de citas completadas y total cobrado.

### 4.6 Acceso Multiplataforma (Android, iOS y Web)

- Soporte nativo para **Expo Web / React Native Web**.
- La app se puede usar en celulares Android/iOS o abrir directamente en el navegador Chrome/Edge de cualquier computadora ingresando a la URL del servidor (`http://IP_VPS:3001`).

---

## 5. Base de Datos — Nexus-Flow

**Motor:** MariaDB / MySQL · **Nombre BD:** `nexus_flow`

### 5.1 Esquema de Tablas Actualizado

#### `usuarios`
Almacena administradores y empleados del negocio.

| Campo | Tipo | Notas |
|---|---|---|
| `id` | INT UNSIGNED PK | Auto increment |
| `nombre` | VARCHAR(100) NOT NULL | Nombre del empleado/admin |
| `email` | VARCHAR(150) NOT NULL UNIQUE | Correo de acceso |
| `password` | VARCHAR(255) NOT NULL | Hash bcrypt |
| `telefono` | VARCHAR(20) NULL | **[NUEVO]** WhatsApp del empleado |
| `rol` | ENUM('admin', 'encargado', 'empleado') | Rol de permisos |
| `activo` | TINYINT(1) DEFAULT 1 | Estado del empleado |

#### `citas`
Registro central de citas agendadas.

| Campo | Tipo | Notas |
|---|---|---|
| `id` | INT UNSIGNED PK | Folio de la cita |
| `cliente_id` | INT UNSIGNED FK | Cliente |
| `servicio_id` | INT UNSIGNED FK | Servicio reservado |
| `empleado_id` | INT UNSIGNED FK NULL | Empleado asignado |
| `fecha_inicio` | DATETIME NOT NULL | Inicio de la cita |
| `fecha_fin` | DATETIME NOT NULL | Fin de la cita |
| `estado` | ENUM('pendiente', 'confirmada', 'cancelada', 'completada') | Estado actual |
| `recordatorio_mins` | INT UNSIGNED DEFAULT 120 | **[NUEVO]** Minutos anticipación (60, 120, 1440, 0) |
| `recordatorio_enviado` | TINYINT(1) DEFAULT 0 | **[NUEVO]** 1 si ya se envió recordatorio WhatsApp |
| `notificacion_empleado_enviada` | TINYINT(1) DEFAULT 0 | **[NUEVO]** 1 si se notificó al empleado |
| `creado_en` | TIMESTAMP | Timestamp de creación |

### 5.2 Migraciones y Auto-Schema

El sistema incluye una función de **Auto-Schema Silenciosa (`ensureRemindersSchema`)** en `src/db/queries.js` que verifica e inserta automáticamente las columnas nuevas en MariaDB al arrancar la API sin requerir scripts manuales.

---

## 6. API REST (Endpoints Completos)

| Método | Endpoint | Descripción |
|---|---|---|
| `GET` | `/api/health` | Healthcheck básico de la API |
| `GET` | `/api/db-health` | Verifica conexión a MariaDB |
| `POST` | `/api/auth/verify-pin` | Valida PIN de Admin/Recepción |
| `GET` | `/api/citas/hoy` | Citas del día actual |
| `GET` | `/api/citas/manana` | **[NUEVO]** Citas del día de mañana |
| `POST` | `/api/citas` | **[NUEVO]** Agendamiento manual desde la App |
| `PATCH` | `/api/citas/:id/estado` | Cambia estado (completada, cancelada, etc.) |
| `GET` | `/api/servicios` | **[NUEVO]** Catálogo de servicios activos |
| `GET` | `/api/clientes` | Lista de clientes registrados por el bot |
| `GET` | `/api/empleados` | **[NUEVO]** Lista de empleados y sus teléfonos |
| `POST` | `/api/empleados` | **[NUEVO]** Crea o actualiza un empleado con su WhatsApp |
| `GET` | `/api/dashboard/stats` | Estadísticas del dashboard admin |
| `GET` | `/api/ingresos/diario` | **[NUEVO]** Historial de ingresos confirmados (60 días) |
| `POST` | `/api/bloqueos` | Registra un bloqueo de horario urgente |
| `GET` | `/api/config` | Obtiene parámetros de configuración del sistema |

---

## 7. Stack Tecnológico

| Componente | Tecnología | Uso |
|---|---|---|
| **Bot WhatsApp** | `whatsapp-web.js` + `qrcode-terminal` | Integración conversacional sin costo por mensaje |
| **Backend API** | Node.js + Express | Servidor REST en puerto 3001 |
| **Base de Datos** | MariaDB / MySQL (`mysql2`) | Almacenamiento persistente con pool de conexiones |
| **App Móvil/Web** | React Native + Expo Router + Expo Web | App multiplataforma (Android, iOS, Web) |
| **UI/UX Icons** | `@expo/vector-icons` (Ionicons) | Íconos vectoriales ejecutivos |
| **Date Picker** | `@react-native-community/datetimepicker` | Desplegable de calendario nativo |
| **Seguridad** | `bcrypt` | Hash de PINs y contraseñas |

---

## 8. Instalación y Despliegue en VPS

### Actualización rápida en la VPS:

```bash
cd ~/nexus-engine
git pull
pm2 restart all
```

### Verificación de servicios con PM2:

```bash
pm2 status
```

* `nexus-api` (id 1): API REST activa en puerto 3001.
* `nexus-engine` (id 0): Bot de WhatsApp y motor de recordatorios.

---

## 9. Solución de Problemas Comunes

* **El QR sale cortado en la terminal:** Reducir tamaño de fuente en SSH (`Ctrl` + `-`) o ejecutar `node src/bot/index.js` directamente en pantalla completa.
* **Proceso "Browser is already running":** Ejecutar `pm2 stop all && pkill -f chrome` y reiniciar.
* **Desconexión de WhatsApp:** Si en la terminal se lee `WhatsApp desconectado. Razón: LOGOUT`, eliminar credenciales con `rm -rf .wwebjs_auth .wwebjs_cache` y volver a escanear el QR.

---

## 10. Estrategia de Negocio y Competencia

* **Precio Recomendado:** **$3,000 MXN / mes** (Suscripción Todo Incluido).
* **Setup Inicial:** $1,500 MXN (Pago único de configuración).
* **Ventaja vs. AgendaPro / Booksy:** Nexus-Engine atiende directamente en el WhatsApp habitual del cliente las 24/7 sin obligarlo a entrar a páginas web ni descargar apps.
* **Ventaja vs. WATI / ManyChat:** Sin cargos extra por mensaje de Meta WhatsApp (ahorro de $2,000 a $4,000 MXN al mes) + incluye App Móvil/Web de Recepción para el local.

---

## 11. Formulario de Onboarding — Cliente

Formulario de 15 minutos para entregar al dueño del negocio antes de dar de alta su cuenta:

1. **Información del Negocio:** Nombre, descripción, ciudad, WhatsApp oficial.
2. **Servicios:** Lista de servicios, duraciones en minutos, precios y si deben mostrarse en el bot.
3. **Horarios de Atención:** Días hábiles, horas de apertura/cierre y descansos.
4. **Empleados:** Nombres y números de WhatsApp de los empleados para recibir alertas.
5. **Seguridad:** PIN deseado para acceso Admin (4 a 6 dígitos).
