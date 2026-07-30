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

## 8. Instalación, Despliegue y Puesta en Marcha para un Nuevo Cliente (Guía Paso a Paso)

Esta sección te explica **exactamente cómo instalar y dar de alta a un nuevo cliente en tu VPS** en menos de 10 minutos.

---

### 8.1 Pasos de Despliegue Desde Cero (Paso a Paso):

#### 1️⃣ **Crear la Base de Datos para el Cliente:**
Ingresa a MariaDB/MySQL en tu VPS:
```bash
mysql -u root -p
```
Ejecuta la creación e importa el esquema maestro:
```sql
CREATE DATABASE nexus_cliente1 CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
GRANT ALL PRIVILEGES ON nexus_cliente1.* TO 'nexus_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```
Importa las tablas ejecutando:
```bash
mysql -u nexus_user -pPadAlex01 nexus_cliente1 < ~/nexus-engine/src/db/schema.sql
```

---

#### 2️⃣ **Configurar el archivo de Variables de Entorno (`.env`):**
En la carpeta del proyecto `~/nexus-engine/.env`, configura los datos del nuevo cliente:
```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=nexus_user
DB_PASSWORD=PadAlex01
DB_NAME=nexus_cliente1

BUSINESS_NAME="Clínica Dental Sonrisas"
BOT_NAME="Nexus Dental"
BOT_PHONE="+526861234567"
API_PORT=3001
```

---

#### 3️⃣ **Cargar el Catálogo de Servicios y Empleados (Onboarding):**
Puedes insertar los servicios y doctores directamente en MariaDB o desde la **Nexus-App**:
```sql
-- Insertar servicios del cliente
INSERT INTO servicios (nombre, duracion_min, precio, descripcion) VALUES
('Valoración / Diagnóstico', 30, 300.00, 'Incluye evaluación y radiografía inicial'),
('Limpieza Profilaxis', 45, 600.00, 'Ultrasonido y pulido dental'),
('Resina Dental', 45, 800.00, 'Obturación por pieza');

-- Insertar empleado/doctor con su WhatsApp
INSERT INTO empleados (nombre, telefono, activo) VALUES
('Dr. Alejandro Padilla', '+526861234567', 1);
```

---

#### 4️⃣ **Desplegar el Servidor y Vincular WhatsApp (Escaneo de QR):**

1. Arranca el servicio en PM2:
   ```bash
   pm2 start src/bot/index.js --name "nexus-engine"
   pm2 save
   ```

2. Abre los logs para ver el código QR dibujado en pantalla:
   ```bash
   pm2 logs nexus-engine
   ```

3. **Escanear el QR:**
   - Toma el teléfono o el WhatsApp del cliente.
   - Ve a **Ajustes ➔ Dispositivos vinculados ➔ Vincular un dispositivo**.
   - Escanea el código QR que aparece en la terminal de la VPS.
   - En cuanto aparezca `✅ WhatsApp conectado y bot escuchando`, presiona `Ctrl` + `C` para cerrar los logs.

---

#### 5️⃣ **Configurar la Respuesta Automática en Facebook e Instagram (Opcional - Meta Business Suite):**

Para redirigir clientes de redes sociales al WhatsApp del bot:
1. Entra a [business.facebook.com](https://business.facebook.com) ➔ **Automatizaciones ➔ Respuesta Instantánea**.
2. Pega el siguiente mensaje predeterminado:
   ```text
   ¡Hola! 👋 Gracias por comunicarte con [Nombre del Negocio].

   Para agendar tu cita las 24/7 en tiempo real con confirmación inmediata, habla con nuestro recepcionista virtual en WhatsApp aquí:

   📲 https://wa.me/52686XXXXXXX?text=Hola%20quiero%20agendar%20una%20cita
   ```

---

### 8.2 Comandos Útiles de Mantenimiento Diario:

- **Reiniciar el bot y la API:** `pm2 restart all`
- **Ver logs en tiempo real:** `pm2 logs nexus-engine`
- **Ver estado del servidor:** `pm2 status`
- **Actualizar código desde GitHub:** `cd ~/nexus-engine && git pull && pm2 restart all`

---

## 9. Estrategia de Comercialización & Modelo de Suscripción (3 Planes Oficiales)

### 9.1 Tabla Comparativa de Planes Comerciales

| Funcionalidad / Característica | Plan Básico / Express ($999 MXN/mes) | Plan Pro / Clínico Omnicanal ⭐ ($1,999 MXN/mes) | Plan Enterprise Multi-Sucursal ($3,999 MXN/mes) |
|---|:---:|:---:|:---:|
| **Público Objetivo** | Barberías, Terapeutas, Estéticas | Clínicas Dentales, Consultorios, Spas | Cadenas, Franquicias, Múltiples Locales |
| **Canales Incluidos** | 1 Canal (WhatsApp) | **3 Canales (WhatsApp + Facebook + Instagram)** | **Canales Ilimitados + Multi-Sucursal** |
| **Bot Bilingüe (US/MX)** | Básico (Español) | **Auto-detección (+1 EE.UU. / Inglés)** | **Auto-detección (+1 EE.UU. / Inglés)** |
| **Horario Comida Empleado** | No incluido | **Individual por Doctor en App** | **Individual por Doctor en App** |
| **CRM Historial Cliente** | Lista simple | **Ficha Completa + Historial Visitas** | **Ficha Completa + Historial Visitas** |
| **Reportes Contables** | No incluido | **PDF Membretado (Logo) + Excel (.CSV)** | **PDF Membretado (Logo) + Excel (.CSV)** |
| **Reenvío Confirmación WA** | No incluido | **Botón de 1 toque en App** | **Botón de 1 toque en App** |
| **Costo Setup / Instalación** | $1,499 MXN (Pago único) | $2,999 MXN (Pago único) | $4,999 MXN (Pago único) |

### 9.2 Comandos para Cambiar de Plan en la VPS

#### 🟢 Cambiar a Plan Básico / Express:
```bash
mysql -u nexus_user -pPadAlex01 -e "USE nexus_flow; UPDATE config_negocio SET valor = 'basico' WHERE clave = 'PLAN_TYPE';"
```

#### 👑 Cambiar a Plan Pro / Clínico:
```bash
mysql -u nexus_user -pPadAlex01 -e "USE nexus_flow; UPDATE config_negocio SET valor = 'pro' WHERE clave = 'PLAN_TYPE';"
```

---

## 10. Solución de Problemas Comunes

* **El QR sale cortado en la terminal:** Reducir tamaño de fuente en SSH (`Ctrl` + `-`).
* **Proceso "Browser is already running":** Ejecutar `pm2 stop all && pkill -f chrome` y reiniciar.
* **Error "No LID for user":** Resuelto con `getWhatsAppJid` automático usando `client.getNumberId(...)`.

---

## 11. Estrategia de Venta & Posicionamiento (Mexicali / Mercado Fronterizo)

* **Plan 1: BÁSICO / EXPRESS:** **$999 MXN / mes** + $1,499 Setup.
* **Plan 2: PRO / CLÍNICO OMNICANAL:** **$1,999 a $2,499 MXN / mes** + $2,999 Setup.
* **Plan 3: ENTERPRISE MULTI-SUCURSAL:** **$3,999 MXN / mes** + $4,999 Setup.
* **Margen de Ganancia Neto:** **> 85%** (Costo de servidor ~$200 MXN/mes por cliente).
* **Pitch de Venta Estrella en Mexicali:**
  > *"Atiende a tus pacientes locales y de EE.UU. 24/7 en español e inglés por WhatsApp, Facebook e Instagram, bloquea tus horarios de comida automáticamente y genera tus reportes para el contador en PDF y Excel por $1,999 pesos al mes."*

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
• Dirección Física y Referencias:

2️⃣ HORARIOS DE ATENCIÓN:
• Días laborables (Ej. Lunes a Sábado):
• Horario de Apertura y Cierre (Ej. 9:00 AM - 7:00 PM):
• (Nota: Los tiempos de comida/descanso se asignan individualmente por empleado desde el panel Admin de la App)

3️⃣ CATÁLOGO DE SERVICIOS:
Favor de listar los servicios que el bot ofrecerá en WhatsApp:
(Formato: Nombre del servicio | Duración aprox | Precio | Descripción/Info corta)
Ejemplos:
- Corte de Cabello | 30 min | $200 MXN | Incluye lavado y peinado
- Barba Express | 20 min | $150 MXN | Toalla caliente y perfilado
- Combo Corte + Barba | 45 min | $300 MXN | Servicio completo VIP

4️⃣ PERSONAL / ATENDIENTES:
• Nombres del personal que atiende en el local (para asignar turnos):
  - Empleado 1:
  - Empleado 2:

5️⃣ INFORMACIÓN EXTRA DEL LOCAL (Para cuando el cliente pida "Información u Horarios"):
• Breve descripción de bienvenida del negocio:
• Indicaciones de estacionamiento o referencias de llegada:
• Políticas de servicio (Ej. "Llegar 5 min antes", "Se aceptan tarjetas de crédito"):
• Redes sociales / Sitio Web (opcional):

6️⃣ SEGURIDAD DE LA APP:
• PIN secreto de 4 dígitos para acceder al modo Admin en tu App: [ ____ ]
```

---

### 12.2 Formulario Plan Pro / Clínico
*(Para Clínicas Dentales, Consultorios Médicos, Dermatología y Medicina Estética)*

```text
📋 FORMULARIO DE CONFIGURACIÓN — PLAN PRO / CLÍNICO

1️⃣ DATOS DEL NEGOCIO:
• Nombre Oficial del Negocio:
• Nombre del Bot (Ej. Recepción / Asistente Virtual):
• Número de WhatsApp del Bot:
• Dirección Física completa:
• URL/Imagen del Logo Oficial (para membrete de reportes contables PDF): [ Adjuntar / Enlace ]

2️⃣ HORARIOS DE ATENCIÓN Y CITAS:
• Días laborables de la clínica:
• Horario de Atención (Ej. Lunes a Viernes 8:00 AM - 8:00 PM, Sábados 9:00 AM - 2:00 PM):
• (Nota: Los tiempos de comida/descanso se asignan individualmente por empleado en la App)
• Mínimo de anticipación para agendar (Ej. 2 horas antes):

3️⃣ CATÁLOGO DE SERVICIOS Y TRATAMIENTOS:
Favor de detallar los tratamientos que se pueden agendar por WhatsApp:
(Formato: Tratamiento | Duración estimada | Precio base | Información/Requisitos previos)
Ejemplos:
- Valoración Inicial / Diagnóstico | 30 min | $300 MXN | Incluye radiografía inicial
- Limpieza / Profilaxis | 45 min | $600 MXN | Ultrasonido y pulido
- Ajuste Mensual de Ortodoncia | 30 min | $500 MXN | Solo pacientes en tratamiento
- Resina / Obturación | 45 min | $800 MXN | Por pieza dental
- Extracción Simple | 60 min | $1,200 MXN | Requiere valoración previa

4️⃣ DOCTORES Y ESPECIALISTAS (Notificaciones por WhatsApp):
Favor de listar a los doctores, su WhatsApp personal y sus especialidades:
• Doctor 1:
  - Nombre completo: Dr(a). 
  - WhatsApp personal: +52 
  - Especialidades/Servicios que realiza: 

• Doctor 2:
  - Nombre completo: Dr(a). 
  - WhatsApp personal: +52 
  - Especialidades/Servicios que realiza: 

5️⃣ INFORMACIÓN EXTRA Y POLÍTICAS CLÍNICAS (Para la Opción 4 del Bot "Información"):
• Mensaje de bienvenida de la clínica:
• Indicaciones de llegada / estacionamiento / piso / consultorio:
• Requisitos de primera cita (Ej. Traer identificación, llegar 10 min antes):
• Métodos de pago aceptados (Efectivo, Tarjeta, Transferencia, Aseguradoras):
• Teléfono de emergencias médicas (opcional):
```

---

## 13. Estrategia de Integración con Facebook e Instagram (Redirección Directa a WhatsApp)

Para garantizar **0% de fricción burocrática con revisiones de Meta** y mantener el 100% de la base de datos de clientes unificada en un solo lugar, la estrategia oficial consiste en utilizar las **Respuestas Instantáneas de Bienvenida de Facebook e Instagram (Meta Business Suite)**.

### 13.1 Configuración de la Respuesta Instantánea en Meta Business Suite:

1. Ingresa a [business.facebook.com](https://business.facebook.com) ➔ **Automatizaciones** ➔ **Respuesta Instantánea**.
2. Activa la respuesta automática para los canales de **Facebook Messenger** e **Instagram Direct**.
3. Configura el siguiente texto de bienvenida automatizado:

```text
¡Hola! 👋 Gracias por comunicarte con [Nombre del Negocio].

Para consultar nuestros tratamientos, precios y AGENDAR TU CITA EN TIEMPO REAL las 24 horas con confirmación inmediata, habla con nuestro recepcionista virtual en WhatsApp haciendo clic aquí:

📲 https://wa.me/52686XXXXXXX?text=Hola%20quiero%20agendar%20una%20cita
```

### 13.2 Ventajas Competitivas de esta Estrategia:
- **Cero revisiones ni solicitudes de documentos:** No requiere pedirle identificaciones oficiales, escrituras ni información confidencial al cliente.
- **Canalización 100% Directa:** Todo prospecto de anuncios o redes sociales ingresa inmediatamente a tu WhatsApp Bot de agendamiento.
- **Base de Datos Unificada:** El negocio gestiona toda su agenda desde un solo panel en la **Nexus-App**.
