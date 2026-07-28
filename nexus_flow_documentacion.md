# Nexus-Flow — Documentación Maestra del Sistema

> Versión: 2.1 · Última actualización: Julio 2026  
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
9. [Sistema de Niveles de Suscripción (Plan Básico vs Plan Pro)](#9-sistema-de-niveles-de-suscripción-plan-básico-vs-plan-pro)
   - [Diferencias entre Planes](#91-diferencias-entre-planes)
   - [Comandos para Cambiar de Plan en la VPS](#92-comandos-para-cambiar-de-plan-en-la-vps)
10. [Solución de Problemas Comunes](#10-solución-de-problemas-comunes)
11. [Estrategia de Negocio y Competencia](#11-estrategia-de-negocio-y-competencia)
12. [Formulario de Onboarding — Cliente](#12-formulario-de-onboarding--cliente)

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
    REMINDER_SELECT (Solo en Plan Pro)
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

Antes de finalizar la reserva (en Plan Pro), el bot le ofrece al cliente elegir con cuánto tiempo de anticipación desea su recordatorio por WhatsApp:

1. **1 hora antes** (`60` minutos).
2. **2 horas antes** (`120` minutos - por defecto).
3. **1 día antes (24 hrs)** (`1440` minutos).
4. **Sin recordatorio** (`0` minutos).

En **Plan Básico**, se asigna automáticamente 2 horas antes de forma silenciosa para acelerar la reserva.

Un **motor en segundo plano (`src/bot/reminders.js`)** ejecuta un worker cada 60 segundos buscando citas confirmadas en MariaDB cuya fecha y hora de recordatorio ha llegado, enviando el mensaje por WhatsApp automáticamente.

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

---

## 5. Base de Datos — Nexus-Flow

**Motor:** MariaDB / MySQL · **Nombre BD:** `nexus_flow`

### 5.1 Esquema de Tablas Actualizado

#### `config_negocio`
Parámetros globales del negocio y suscripción.

| Clave | Valor Típico | Descripción |
|---|---|---|
| `PLAN_TYPE` | `'pro'` o `'basico'` | **[NUEVO]** Nivel de suscripción activo |
| `MIN_BOOKING_HOURS` | `'2'` | Horas mínimas de anticipación |
| `MAX_BOOKING_DAYS` | `'30'` | Días máximos a futuro |
| `BOT_NAME` | `'Asistente'` | Nombre comercial del bot |

#### `empleado_servicios`
Matriz de especialidades (relación M:N).

| Campo | Tipo | Notas |
|---|---|---|
| `empleado_id` | INT UNSIGNED PK | ID del empleado |
| `servicio_id` | INT UNSIGNED PK | ID del servicio autorizado |

---

## 6. API REST (Endpoints Completos)

| Método | Endpoint | Descripción |
|---|---|---|
| `GET` | `/api/health` | Healthcheck básico de la API |
| `GET` | `/api/auth/verify-pin` | Valida PIN de Admin/Recepción |
| `GET` | `/api/citas/hoy` | Citas del día actual |
| `GET` | `/api/citas/manana` | Citas del día de mañana |
| `POST` | `/api/citas` | Agendamiento manual desde la App |
| `PATCH` | `/api/citas/:id/estado` | Cambia estado de cita |
| `GET` | `/api/servicios` | Catálogo de servicios activos |
| `GET` | `/api/empleados` | Lista de empleados y sus teléfonos |
| `POST` | `/api/empleados` | Crea o actualiza un empleado con sus especialidades |
| `GET` | `/api/empleados/:id/servicios` | Obtiene servicios autorizados de un empleado |
| `GET` | `/api/config` | Obtiene parámetros de configuración del sistema (incluye `PLAN_TYPE`) |

---

## 7. Stack Tecnológico

| Componente | Tecnología | Uso |
|---|---|---|
| **Bot WhatsApp** | `whatsapp-web.js` + `qrcode-terminal` | Integración conversacional sin costo por mensaje |
| **Backend API** | Node.js + Express | Servidor REST en puerto 3001 |
| **Base de Datos** | MariaDB / MySQL (`mysql2`) | Almacenamiento persistente |
| **App Móvil/Web** | React Native + Expo Router + Expo Web | App multiplataforma (Android, iOS, Web) |

---

## 8. Instalación y Despliegue en VPS

```bash
cd ~/nexus-engine
git pull
pm2 restart all
```

---

## 9. Sistema de Niveles de Suscripción (Plan Básico vs Plan Pro)

Nexus-Engine cuenta con un motor de suscripción de 2 niveles controlado por la clave `PLAN_TYPE` en MariaDB:

### 9.1 Diferencias entre Planes

| Funcionalidad | Plan Básico / Express ($1,500/mes) | Plan Pro / Clínico ($3,500/mes) |
|---|:---:|:---:|
| **Público Objetivo** | Barberías, Spas, Estéticas | Clínicas Dentales, Consultorios |
| **Flujo del Bot** | 4 pasos ultrarrápidos | Flujo completo personalizable |
| **Asignación Médica** | Directa (Cualquiera libre) | **Médico de Cabecera Automático** |
| **Matriz de Especialidades** | Oculta (interfaz limpia) | **Checkboxes por Doctor en App** |
| **Selector de Recordatorio** | Asignación silenciosa 2h | **1h, 2h, 24h, Desactivado** |
| **Notif. WhatsApp a Doctor** | No activa | **Alerta inmediata al celular del médico** |

### 9.2 Comandos para Cambiar de Plan en la VPS

Para consultar o cambiar el plan activo en la VPS desde la terminal SSH:

#### 🔍 Consultar plan actual:
```bash
mysql -u nexus_user -pPadAlex01 -e "USE nexus_flow; SELECT * FROM config_negocio WHERE clave = 'PLAN_TYPE';"
```

#### 🟢 Cambiar a Plan Básico / Express (Barberías / Spas):
```bash
mysql -u nexus_user -pPadAlex01 -e "USE nexus_flow; UPDATE config_negocio SET valor = 'basico' WHERE clave = 'PLAN_TYPE';"
```

#### 👑 Cambiar a Plan Pro / Clínico (Clínicas Dentales):
```bash
mysql -u nexus_user -pPadAlex01 -e "USE nexus_flow; UPDATE config_negocio SET valor = 'pro' WHERE clave = 'PLAN_TYPE';"
```

> **Nota:** Después de ejecutar el cambio en MariaDB, no requiere reiniciar PM2. El sistema consulta el plan en tiempo real.

---

## 10. Solución de Problemas Comunes

* **El QR sale cortado en la terminal:** Reducir tamaño de fuente en SSH (`Ctrl` + `-`) o ejecutar `node src/bot/index.js` en pantalla completa.
* **Proceso "Browser is already running":** Ejecutar `pm2 stop all && pkill -f chrome` y reiniciar.
* **Desconexión de WhatsApp:** Eliminar credenciales con `rm -rf .wwebjs_auth .wwebjs_cache` y volver a escanear el QR.

---

## 11. Estrategia de Negocio y Competencia

* **Plan Básico / Express:** **$1,500 MXN / mes** + $1,000 Setup.
* **Plan Pro / Clínico:** **$3,500 MXN / mes** + $1,500 Setup.
* **Ventaja competitiva:** Cero cobros por mensaje de WhatsApp Meta API (ahorro masivo para el cliente) + App Móvil/Web incluida.

---

## 12. Formulario de Onboarding — Cliente

1. **Información del Negocio:** Nombre, ciudad, WhatsApp oficial.
2. **Tipo de Plan:** Básico / Express o Pro / Clínico.
3. **Servicios:** Lista de servicios, precios y duraciones.
4. **Horarios de Atención:** Días hábiles y rangos de atención.
5. **Empleados / Doctores:** Nombres, especialidades y teléfonos de WhatsApp para alertas.
