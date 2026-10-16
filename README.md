# 🚀 Sistema Central de Gestión Operativa del Campuslands
### *Hackatón Campuslands: El Campus Bajo Presión — MVP Funcional en 5 Horas*

Sistema web integral de alta fidelidad diseñado para centralizar la gestión de aulas, recursos tecnológicos e incidencias de Campuslands. Integra **Inteligencia Artificial real para triaje operativo**, persistencia transaccional con **SQLite**, importación de **datos oficiales (JSON/CSV)** y validación determinista de las **6 reglas de negocio obligatorias**.

---

## 🏛️ Arquitectura del Sistema

```
hackaton/
├── package.json                 # Orquestador con script 'npm run dev' (concurrently)
├── README.md                    # Documentación técnica completa
├── SUSTENTACION_JURADOS.md      # Guía y guión de 3 minutos para los jurados
├── server/                      # Backend REST API (Node.js + Express + Better-SQLite3)
│   ├── .env.example             # Plantilla de variables de entorno sin secretos
│   ├── .env                     # Configuración local (puerto 3001, claves de IA)
│   ├── data/
│   │   ├── campuslands.db       # Base de datos persistente SQLite (WAL Mode)
│   │   ├── default_campuslands_data.json # Dataset oficial de referencia
│   │   ├── sample_spaces.csv    # Muestra CSV de aulas y laboratorios
│   │   ├── sample_assets.csv    # Muestra CSV de equipos e inventario TI
│   │   ├── sample_incidents.csv # Muestra CSV de incidencias operativas
│   │   └── backups/             # Copias de seguridad automáticas previas a importaciones
│   └── src/
│       ├── index.js             # Servidor Express, CORS y middleware centralizado de errores
│       ├── db/
│       │   ├── database.js      # Conexión, esquema DDL, índices y transacciones
│       │   └── seed.js          # Poblado de datos oficiales
│       ├── rules/
│       │   ├── businessRules.js # Motor centralizado de las 6 Reglas de Negocio
│       │   └── testRules.js     # Suite de pruebas unitarias ejecutables
│       ├── services/
│       │   ├── spaceService.js  # Lógica de aulas, capacidad y reservas
│       │   ├── assetService.js  # Lógica de inventario, préstamos y retornos
│       │   ├── incidentService.js # Ciclo de vida de incidencias y triaje
│       │   ├── aiService.js     # Integración real con Google Gemini & OpenAI + Fallback
│       │   ├── importService.js # Motor de ingesta y validación de JSON y CSV
│       │   └── auditService.js  # Registro inmutable de trazabilidad
│       └── routes/
│           └── api.js           # Endpoints unificados bajo /api
└── client/                      # Frontend SPA (React 18 + Vite 5 + Lucide Icons)
    ├── index.html               # Tipografía Outfit & Plus Jakarta Sans
    ├── vite.config.js           # Proxy hacia backend (http://localhost:3001)
    └── src/
        ├── index.css            # Sistema de diseño moderno (Modo oscuro, Glassmorphism)
        ├── App.jsx              # Enrutador principal y gestor global de estado
        ├── components/
        │   ├── Sidebar.jsx      # Navegación lateral con contadores en tiempo real
        │   ├── Topbar.jsx       # Indicador de estado de IA y selector de tema
        │   ├── Badge.jsx        # Etiquetas semánticas de estado y prioridad
        │   ├── Modal.jsx        # Ventanas modales accesibles con backdrop blur
        │   ├── Toast.jsx        # Notificaciones emergentes con códigos de regla
        │   └── ApiKeyModal.jsx  # Modal para probar y configurar API Keys en vivo
        ├── pages/
        │   ├── DashboardView.jsx # KPIs, métricas críticas y actividad reciente
        │   ├── SpacesView.jsx    # Módulo 1: Aulas, cubículos y reservas sin cruces
        │   ├── AssetsView.jsx    # Módulo 2: Inventario, préstamos y devoluciones
        │   ├── IncidentsView.jsx # Módulo 3: Incidencias y triaje con IA (human-in-the-loop)
        │   ├── RulesTesterView.jsx # Módulo de sustentación: Probador de las 6 reglas
        │   ├── DataManagerView.jsx # Ingesta de datos oficiales (JSON/CSV) y backups
        │   └── AuditView.jsx     # Historial de trazabilidad y auditoría
        └── services/
            └── api.js           # Cliente fetch con interceptor de códigos de error
```

---

## ⚡ Ejecución Rápida

### 1. Iniciar todo el sistema (Backend + Frontend)
```bash
npm run dev
```
* **Frontend:** [http://localhost:5173](http://localhost:5173)
* **Backend API:** [http://localhost:3001/api](http://localhost:3001/api)
* **Health Check:** [http://localhost:3001/health](http://localhost:3001/health)

### 2. Ejecutar la Suite de Pruebas de Reglas de Negocio
```bash
npm run test:rules
```
*Demuestra ante los jurados que el 100% de los casos válidos e inválidos de las 6 reglas están cubiertos por código.*

---

## 🛡️ Matriz de las 6 Reglas de Negocio Obligatorias

| # | Regla | Lógica Determinista | Código de Error | Comportamiento en Caso Inválido |
|---|---|---|---|---|
| **1** | **Aforo Máximo** | `asistentes <= capacidad_espacio` | `RULE_1_CAPACITY_EXCEEDED` | Bloquea la reserva y muestra aforo máximo vs solicitado. |
| **2** | **Conflictos de Horario** | `startA < endB && endA > startB` en misma fecha | `RULE_2_SCHEDULE_CONFLICT` | Rechaza traslapes (HTTP 409) con detalle de la reserva en conflicto. |
| **3** | **Estado del Espacio** | Bloqueo si `status in ('EN_MANTENIMIENTO', 'INHABILITADO')` | `RULE_3_SPACE_NOT_AVAILABLE` | Impide reservar aulas inoperables hasta su habilitación. |
| **4** | **Disponibilidad de Equipos** | Bloqueo si `status !== 'DISPONIBLE'` o préstamo activo | `RULE_4_ASSET_NOT_AVAILABLE` | No permite prestar equipos dañados, en taller o ya prestados. |
| **5** | **Integridad de Operaciones** | Transacciones atómicas SQLite + Bloqueo de duplicados | `RULE_5_OPERATION_INTEGRITY_VIOLATION` | Impide registrar devoluciones repetidas de préstamos ya cerrados. |
| **6** | **Integridad de Incidencias** | Transiciones permitidas + solución obligatoria | `RULE_6_INCIDENT_MISSING_SOLUTION` | Impide resolver o cerrar sin notas técnicas (mín. 5 chars) o modificar cerradas. |

---

## 🤖 Integración de Inteligencia Artificial Real

* **Modelo:** Google Gemini (`gemini-1.5-flash`) o OpenAI (`gpt-4o-mini`).
* **Variables de entorno:** `GEMINI_API_KEY` o `OPENAI_API_KEY` en `server/.env`.
* **Configuración en Vivo:** Permite a los jurados o al equipo ingresar una API Key directamente desde el botón **"IA: ..."** en la barra superior.
* **Human-in-the-loop:** La IA genera categoría, prioridad, área responsable, ruta técnica y pasos sugeridos con porcentaje de confianza. El operador humano revisa, modifica si lo requiere y confirma la aplicación.
* **Fallback Transparente:** Si no hay API key o hay falla de red, el sistema activa el **Triaje Manual Transparente** sin bloquear ninguna función operativa.

---

## 📂 Ingesta de Datos Oficiales (JSON y CSV)

1. Soporta subida de archivos `.json` (bundle completo o arrays) y `.csv` con cabeceras estándar.
2. Detección automática de:
   * Identificadores faltantes (`id` obligatorio).
   * Registros duplicados en el archivo o contra la base de datos.
   * Valores de capacidad inválidos (`capacity <= 0`).
   * Estados desconocidos no normalizados.
3. **Generación automática de Backup** en `server/data/backups/` antes de procesar cambios.
4. Genera un reporte detallado con conteo de procesados, válidos, insertados, actualizados y errores desglosados fila por fila.
5. Botón de **Restaurar Datos Oficiales Base** con un solo clic.

---

## 💻 Tecnologías Utilizadas

* **Frontend:** React 18, Vite 5, Lucide React, CSS Moderno con Tokens HSL y Dark Mode.
* **Backend:** Node.js v20+, Express 4, Better-SQLite3, Multer, CSV-Parse.
* **Persistencia:** SQLite relacional en modo WAL con claves foráneas activas.
* **IA:** REST API nativa Gemini / OpenAI con validación JSON estructurada y timeouts de 12s.
   

   