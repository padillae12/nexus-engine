# Nexus-Flow — Documentación Maestra del Sistema

> Versión: 2.2 · Última actualización: Julio 2026  
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
12. [Formularios de Onboarding (Básico y Pro)](#12-formularios-de-onboarding-básico-y-pro)
    - [Formulario Plan Básico / Express](#121-formulario-plan-básico--express)
    - [Formulario Plan Pro / Clínico](#122-formulario-plan-pro--clínico)

---

## 1. Visión General

**Nexus-Flow** es una plataforma B2B de automatización de citas y gestión de recepción para negocios locales (clínicas dentales, estéticas, barberías, consultorios, spas y talleres de detailing).

A diferencia de los bots comunes basados en IA generativa o en formularios web estáticos, Nexus-Flow integra un **motor conversacional directo en WhatsApp** conectado en tiempo real a una base de datos MariaDB y a una **App móvil/web ejecutiva de recepción**.

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
│                 └─────────────┬─────────────┘                    │
└──────────────────────────────────────────────────────────────────┘
```

---

## 3. Componente A — Nexus-Engine (Bot de WhatsApp)

### 3.1 Flujo Conversacional (FSM & Estados)

El bot implementa una **Máquina de Estados Finitos (FSM)** que rastrea paso a paso a cada cliente. La sesión inactiva se resetea a los **30 minutos**.

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

## 12. Formularios de Onboarding (Básico y Pro)

Estos son los cuestionarios oficiales listos para enviar por WhatsApp o correo al cliente antes de configurar su cuenta en Nexus-Engine.

---

### 12.1 Formulario Plan Básico / Express
*(Para Barberías, Salones de Belleza, Spas de Uñas, Lavado de Autos y Detailing)*

```text
📋 FORMULARIO DE CONFIGURACIÓN — PLAN BÁSICO / EXPRESS

¡Bienvenido a Nexus-Engine! Por favor completa este breve formulario para activar tu asistente inteligente de WhatsApp y tu App de Recepción:

1️⃣ DATOS DEL NEGOCIO:
• Nombre Comercial del Negocio:
• Número de WhatsApp donde atenderá el Bot:
• Ciudad / Sucursal:
• Dirección Física (opcional para dar a los clientes):

2️⃣ HORARIOS DE ATENCIÓN:
• Días laborables (Ej. Lunes a Sábado):
• Horario de Apertura y Cierre (Ej. 9:00 AM - 7:00 PM):
• ¿Tienen horario de comida o descanso?:

3️⃣ CATÁLOGO DE SERVICIOS:
Favor de listar los servicios que el bot ofrecerá en WhatsApp:
(Formato: Nombre del servicio | Duración aprox | Precio)
Ejemplos:
- Corte de Cabello | 30 min | $200 MXN
- Barba Express | 20 min | $150 MXN
- Combo Corte + Barba | 45 min | $300 MXN

4️⃣ PERSONAL / ATENDIENTES:
• Nombres del personal que atiende en el local (para asignar turnos):
  - Empleado 1:
  - Empleado 2:

5️⃣ SEGURIDAD DE LA APP:
• PIN secreto de 4 dígitos para acceder al modo Admin en tu App: [ ____ ]

¡Listo! Con esta información configuraremos tu bot en menos de 24 horas. 🚀
```

---

### 12.2 Formulario Plan Pro / Clínico
*(Para Clínicas Dentales, Consultorios Médicos, Dermatología y Medicina Estética)*

```text
📋 FORMULARIO DE CONFIGURACIÓN — PLAN PRO / CLÍNICO

¡Bienvenido a Nexus-Engine Pro! Por favor completa esta ficha técnica para configurar tu asistente clínico de WhatsApp, matriz de especialidades y alertas médicas:

1️⃣ DATOS DE LA CLÍNICA:
• Nombre Oficial de la Clínica / Consultorio:
• Nombre del Bot (Ej. Asistente Dental / Recepción Médica):
• Número de WhatsApp donde atenderá el Bot:
• Dirección Física completa y referencias:

2️⃣ HORARIOS DE ATENCIÓN Y CITAS:
• Días laborables de la clínica:
• Horario de Atención (Ej. Lunes a Viernes 8:00 AM - 8:00 PM, Sábados 9:00 AM - 2:00 PM):
• Horario de comida/descanso general:
• Mínimo de anticipación para agendar (Ej. 2 horas antes):

3️⃣ CATÁLOGO DE SERVICIOS Y TRATAMIENTOS:
Favor de detallar los tratamientos que se pueden agendar por WhatsApp:
(Formato: Tratamiento | Duración estimada | Precio base)
Ejemplos:
- Valoración Inicial / Diagnóstico | 30 min | $300 MXN
- Limpieza / Profilaxis | 45 min | $600 MXN
- Ajuste Mensual de Ortodoncia | 30 min | $500 MXN
- Resina / Obturación | 45 min | $800 MXN
- Extracción Simple | 60 min | $1,200 MXN

4️⃣ DOCTORES Y ESPECIALISTAS (Notificaciones por WhatsApp):
Favor de listar a los doctores, su WhatsApp personal y sus especialidades para activar la asignación automática de Médico de Cabecera:

• Doctor 1:
  - Nombre completo: Dr(a). 
  - WhatsApp personal: +52 
  - Especialidades/Servicios que realiza: 

• Doctor 2:
  - Nombre completo: Dr(a). 
  - WhatsApp personal: +52 
  - Especialidades/Servicios que realiza: 

5️⃣ SEGURIDAD DE LA APP DE RECEPCIÓN:
• PIN secreto de 4 a 6 dígitos para acceder al panel de administración del dueño/director: [ ______ ]

¡Muchas gracias! Con esta información daremos de alta la matriz médica y las alertas automáticas de tu clínica. 🩺🚀
```
