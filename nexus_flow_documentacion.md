# Nexus-Flow — Documentación Maestra del Sistema

> Versión: 2.3 · Última actualización: Julio 2026  
> Repositorio: `nexus-engine` · Motor: Node.js + MariaDB + WhatsApp + React Native / Expo

---

## Tabla de Contenidos

1. [Visión General](#1-visión-general)
2. [Arquitectura del Sistema](#2-arquitectura-del-sistema)
3. [Componente A — Nexus-Engine (Bot de WhatsApp)](#3-componente-a--nexus-engine-bot-de-whatsapp)
   - [Flujo Conversacional (FSM & Estados)](#31-flujo-conversacional-fsm--estados)
   - [Opción 4: Información y Horarios](#32-opción-4-información-y-horarios)
   - [Sistema de Recordatorios Personalizados por el Cliente](#33-sistema-de-recordatorios-personalizados-por-el-cliente)
   - [Motor de Notificaciones a Empleados y Seguridad de Datos](#34-motor-de-notificaciones-a-empleados-y-seguridad-de-datos)
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
8. [Instalación, Despliegue y Escaneo de QR con PM2](#8-instalación-despliegue-y-escaneo-de-qr-con-pm2)
9. [Sistema de Niveles de Suscripción (Plan Básico vs Plan Pro)](#9-sistema-de-niveles-de-suscripción-plan-básico-vs-plan-pro)
   - [Diferencias entre Planes](#91-diferencias-entre-planes)
   - [Comandos para Cambiar de Plan en la VPS](#92-comandos-para-cambiar-de-plan-en-la-vps)
10. [Solución de Problemas Comunes](#10-solución-de-problemas-comunes)
11. [Estrategia de Negocio y Competencia](#11-estrategia-de-negocio-y-competencia)
12. [Formularios de Onboarding (Básico y Pro)](#12-formularios-de-onboarding-básico-y-pro)
    - [Formulario Plan Básico / Express](#121-formulario-plan-básico--express)
    - [Formulario Plan Pro / Clínico](#122-formulario-plan-pro--clínico)

---

## 1. Visión General

**Nexus-Flow** es una plataforma B2B de automatización de citas y gestión de recepción para negocios locales (clínicas dentales, estéticas, barberías, consultorios, spas y talleres de detailing).

A diferencia de los bots comunes basados en IA generativa o en formularios web estáticos, Nexus-Flow integra un **motor conversacional directo en WhatsApp** conectado en tiempo real a una base de datos MariaDB y a una **App móvil/web ejecutiva de recepción**.

> **Propuesta de valor:** *"Atención automática las 24 horas del día, los 7 días de la semana, directo en WhatsApp sin costos por mensaje de Meta API, combinada con una App móvil/web de recepción para controlar tus citas, tus empleados y tus ingresos en tiempo real."*

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
       ├─ Notificación instantánea por WhatsApp al Empleado (Sin teléfono del cliente)
       └─ Regreso a MAIN_MENU
```

### 3.2 Opción 4: Información y Horarios

El menú principal incluye la **Opción 4 (Información y Horarios)**. Además, mediante RegEx en `src/utils/regex.js`, el bot detecta automáticamente cuando un cliente pregunta por *"horarios"*, *"ubicación"*, *"dónde están"* o *"info"*.

### 3.3 Sistema de Recordatorios Personalizados por el Cliente

Antes de finalizar la reserva (en Plan Pro), el bot le ofrece al cliente elegir con cuánto tiempo de anticipación desea su recordatorio por WhatsApp (`1h`, `2h`, `24h` o `Sin recordatorio`). En **Plan Básico**, se asigna automáticamente 2 horas antes de forma silenciosa.

Un **motor en segundo plano (`src/bot/reminders.js`)** ejecuta un worker cada 60 segundos buscando citas confirmadas en MariaDB cuya fecha y hora de recordatorio ha llegado.

### 3.4 Motor de Notificaciones a Empleados y Seguridad de Datos

Cuando se confirma una cita:
- El sistema consulta si la cita tiene un empleado/doctor asignado.
- Si tiene configurado un WhatsApp personal, el bot le envía una alerta instantánea a su teléfono.
- 🔒 **Protección de Datos / Privacidad del Negocio:** Por motivos de seguridad, la notificación que recibe el empleado **omite el número telefónico del cliente**, mostrando únicamente su Nombre, Servicio, Fecha y Hora para evitar el robo o contacto directo fuera del negocio.

---

## 4. Componente B+C — Nexus-App (App Móvil & Web Ejecutiva)

### 4.1 Diseño Visual "Obsidian Dark" & Vector Icons

- **Tema de Diseño:** Fondo negro obsidiana (`#0B0F17`), tarjetas en pizarra oscura (`#111827`), bordes afilados (`#1F2937`) y acentos en índigo ejecutivo (`#6366F1`).
- **Zero Emojis:** Íconos vectoriales nítidos de `@expo/vector-icons` (`Ionicons`).

### 4.2 Agendamiento Manual con Calendario Nativo

- Botón **`+ Agendar`** disponible tanto en la Agenda de Recepción como en el panel de Administración.
- Modal **`NuevaCitaModal.jsx`** con **Calendario Nativo Interactivo (`@react-native-community/datetimepicker`)** que despliega el pop-up nativo de Android/iOS/Web para seleccionar cualquier fecha del año.

### 4.3 Directorio y Gestión Completa de Empleados

En la pantalla **`Configuración → Modo Admin`**:
- Registro y edición completa de personal: Nombre, WhatsApp, Correo, Rol (`Empleado`, `Encargado`, `Admin`).
- Matriz interactiva de checkboxes para asignar qué servicios/especialidades realiza cada doctor (Plan Pro).

---

## 5. Base de Datos — Nexus-Flow

**Motor:** MariaDB / MySQL · **Nombre BD:** `nexus_flow`

### 5.1 Esquema de Tablas

- `usuarios`: Administradores y empleados (incluye `telefono`).
- `clientes`: Clientes registrados por el bot.
- `servicios`: Catálogo de servicios con precio y duración.
- `citas`: Citas agendadas (incluye `recordatorio_mins`, `recordatorio_enviado`, `notificacion_empleado_enviada`).
- `horarios_trabajo`: Rangos de atención por día de la semana.
- `bloqueos`: Tiempos de comida y festivos.
- `empleado_servicios`: Matriz de especialidades M:N.
- `config_negocio`: Parámetros globales (incluye `PLAN_TYPE` = `'basico'` / `'pro'`, `BUSINESS_NAME`, `ADMIN_PIN`).

---

## 6. API REST (Endpoints Completos)

| Método | Endpoint | Descripción |
|---|---|---|
| `GET` | `/api/health` | Healthcheck básico de la API |
| `POST` | `/api/auth/verify-pin` | Valida PIN de Admin/Recepción |
| `GET` | `/api/citas` | Retorna citas filtradas por fecha, estado o empleado |
| `GET` | `/api/citas/hoy` | Citas del día actual |
| `GET` | `/api/citas/manana` | Citas del día de mañana |
| `POST` | `/api/citas` | Agendamiento manual desde la App |
| `PATCH` | `/api/citas/:id/estado` | Cambia estado de cita |
| `GET` | `/api/servicios` | Catálogo de servicios activos |
| `GET` | `/api/empleados` | Lista de empleados y sus teléfonos |
| `POST` | `/api/empleados` | Crea o actualiza un empleado con sus especialidades |
| `GET` | `/api/empleados/:id/servicios` | Obtiene servicios autorizados de un empleado |
| `GET` | `/api/config` | Obtiene parámetros de configuración del sistema |

---

## 7. Stack Tecnológico

| Componente | Tecnología | Uso |
|---|---|---|
| **Bot WhatsApp** | `whatsapp-web.js` + `qrcode-terminal` | Integración conversacional sin costo por mensaje |
| **Backend API** | Node.js + Express | Servidor REST en puerto 3001 |
| **Base de Datos** | MariaDB / MySQL (`mysql2`) | Almacenamiento persistente |
| **App Móvil/Web** | React Native + Expo Router + Expo Web | App multiplataforma (Android, iOS, Web) |

---

## 8. Instalación, Despliegue y Escaneo de QR con PM2

### 8.1 Actualización rápida en la VPS:

```bash
cd ~/nexus-engine
git pull
pm2 restart all
```

### 8.2 Ver y Escanear el Código QR con PM2:

1. Ejecuta el comando en tu terminal SSH:
   ```bash
   pm2 logs nexus-engine
   ```
2. Al ver el código QR dibujado en la terminal, presiona `Ctrl` + `-` si se ve chueco para hacer la letra más pequeña hasta que el cuadrado se alinee bien.
3. Abre WhatsApp en el celular → **Dispositivos vinculados → Vincular un dispositivo** y escanea el QR.
4. En cuanto diga `✅ WhatsApp conectado`, presiona `Ctrl` + `C` para cerrar los logs sin apagar el bot.

---

## 9. Sistema de Niveles de Suscripción (Plan Básico vs Plan Pro)

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

#### 🟢 Cambiar a Plan Básico / Express (Barberías / Spas):
```bash
mysql -u nexus_user -pPadAlex01 -e "USE nexus_flow; UPDATE config_negocio SET valor = 'basico' WHERE clave = 'PLAN_TYPE';"
```

#### 👑 Cambiar a Plan Pro / Clínico (Clínicas Dentales):
```bash
mysql -u nexus_user -pPadAlex01 -e "USE nexus_flow; UPDATE config_negocio SET valor = 'pro' WHERE clave = 'PLAN_TYPE';"
```

---

## 10. Solución de Problemas Comunes

* **El QR sale cortado en la terminal:** Reducir tamaño de fuente en SSH (`Ctrl` + `-`).
* **Proceso "Browser is already running":** Ejecutar `pm2 stop all && pkill -f chrome` y reiniciar.
* **Error "No LID for user":** Resuelto con `getWhatsAppJid` automático usando `client.getNumberId(...)`.

---

## 11. Estrategia de Negocio y Competencia

* **Plan Básico / Express:** **$1,500 MXN / mes** + $1,000 Setup.
* **Plan Pro / Clínico:** **$3,500 MXN / mes** + $1,500 Setup.
* **Ventaja competitiva:** Cero cobros por mensaje de WhatsApp Meta API (ahorro masivo para el cliente) + App Móvil/Web incluida.

---

## 12. Formularios de Onboarding (Básico y Pro)

### 12.1 Formulario Plan Básico / Express
*(Para Barberías, Salones de Belleza, Spas de Uñas, Lavado de Autos y Detailing)*

```text
📋 FORMULARIO DE CONFIGURACIÓN — PLAN BÁSICO / EXPRESS

1️⃣ DATOS DEL NEGOCIO:
• Nombre Comercial del Negocio:
• Número de WhatsApp donde atenderá el Bot:
• Ciudad / Sucursal:
• Dirección Física:

2️⃣ HORARIOS DE ATENCIÓN:
• Días laborables:
• Horario de Apertura y Cierre:

3️⃣ CATÁLOGO DE SERVICIOS:
(Nombre del servicio | Duración aprox | Precio)

4️⃣ PERSONAL / ATENDIENTES:
• Nombres del personal que atiende en el local:

5️⃣ SEGURIDAD DE LA APP:
• PIN secreto de 4 dígitos para acceder al modo Admin: [ ____ ]
```

---

### 12.2 Formulario Plan Pro / Clínico
*(Para Clínicas Dentales, Consultorios Médicos, Dermatología y Medicina Estética)*

```text
📋 FORMULARIO DE CONFIGURACIÓN — PLAN PRO / CLÍNICO

1️⃣ DATOS DE LA CLÍNICA:
• Nombre Oficial de la Clínica:
• Nombre del Bot:
• Número de WhatsApp del Bot:
• Dirección Física completa:

2️⃣ HORARIOS DE ATENCIÓN Y CITAS:
• Días laborables:
• Horario de Atención:
• Horario de comida:
• Mínimo de anticipación para agendar:

3️⃣ CATÁLOGO DE SERVICIOS Y TRATAMIENTOS:
(Tratamiento | Duración estimada | Precio base)

4️⃣ DOCTORES Y ESPECIALISTAS (Notificaciones por WhatsApp):
• Doctor(a):
  - Nombre completo:
  - WhatsApp personal:
  - Especialidades/Servicios que realiza:

5️⃣ SEGURIDAD DE LA APP DE RECEPCIÓN:
• PIN secreto para la App de administración: [ ______ ]
```
