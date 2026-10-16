# 🏆 GUÍA DE SUSTENTACIÓN ANTE EL JURADO (3 a 5 MINUTOS)
### *Sistema Central de Gestión Operativa de Campuslands*

Esta guía está diseñada para que cualquier integrante del equipo pueda exponer el proyecto con máxima seguridad, fluidez y contundencia técnica.

---

## ⏱️ Minuto 0:00 - 0:45 | El Gancho y la Visión del Problema

> *"Buenas tardes, miembros del jurado. Durante una jornada académica de alta presión en Campuslands, la peor pesadilla operativa es un cruce de horarios en el Aula Artemis, un portátil dañado entregado a un camper en plena hackatón, o una falla crítica de climatización sin atender.*
>
> *Para resolver esto construimos el **Sistema Central de Gestión Operativa de Campuslands**: una plataforma full-stack que une persistencia relacional transaccional, Inteligencia Artificial real para triaje de emergencias y un motor determinista de 6 reglas de negocio inquebrantables."*

---

## ⏱️ Minuto 0:45 - 1:30 | Panel de Control y Módulo 1 (Espacios & Aforos)

1. **Mostrar el Dashboard:**
   - Señalar los 4 indicadores KPI en tiempo real: Espacios Disponibles, Equipos Listos, Incidencias Críticas y Reservas Confirmadas.
2. **Navegar a Módulo 1 (Espacios & Reservas):**
   - *"Aquí tenemos el inventario de Aulas y Cubículos oficiales de Campuslands: Artemis, Sputnik, Apollo, Review..."*
   - Demostrar la **Regla 1 (Aforo):**
     - Hacer clic en "Reservar" en Aula Artemis (capacidad 40).
     - Colocar 55 asistentes. Mostrar cómo la interfaz advierte el exceso y al confirmar, el backend responde con `RULE_1_CAPACITY_EXCEEDED`.
   - Demostrar la **Regla 2 (Cruces de Horario):**
     - Intentar reservar en el mismo horario de 08:00 a 12:00. El backend rechaza con `RULE_2_SCHEDULE_CONFLICT` indicando la reserva conflictiva.
   - Demostrar la **Regla 3 (Espacio en Mantenimiento):**
     - Mostrar que el Aula Review o el Cubículo 103 tienen bloqueado el botón de reserva porque están en mantenimiento o inhabilitados.

---

## ⏱️ Minuto 1:30 - 2:30 | Módulo 2 (Recursos TI) y Módulo 3 (Incidencias con IA)

1. **Módulo 2 (Recursos Tecnológicos):**
   - Demostrar la **Regla 4 (Disponibilidad):**
     - Intentar prestar la *Laptop Dell Vostro (EQ-104)*: el botón está bloqueado porque está en estado **DAÑADO**. Si se fuerza por API, el backend responde `RULE_4_ASSET_NOT_AVAILABLE`.
     - Prestar un equipo disponible a un Camper; pasa automáticamente a estado `PRESTADO` y crea el registro de préstamo en SQLite de forma atómica.
   - Demostrar la **Regla 5 (Integridad):**
     - Registrar la devolución del equipo. Si se intenta devolver nuevamente el mismo préstamo cerrado, el backend bloquea con `RULE_5_OPERATION_INTEGRITY_VIOLATION`.

2. **Módulo 3 (Incidencias con Inteligencia Artificial Real):**
   - Mostrar la lista de incidencias operativas.
   - Presionar **"Triaje con IA"**:
     - *"El sistema envía la descripción al modelo de Inteligencia Artificial (Gemini / OpenAI) con un esquema de respuesta JSON estricto."*
     - Mostrar el resultado: Categoría clasificada, Prioridad sugerida, Área responsable (Soporte TI vs Mantenimiento Físico) y Ruta de Atención técnica paso a paso.
     - Destacar el enfoque **Human-in-the-Loop**: el operador humano puede validar o modificar los datos antes de aplicarlos.
     - Mostrar el **Modo de Contingencia / Fallback Manual**: si no hay internet o clave de API, el sistema permite clasificar manualmente sin detener la operación.
   - Demostrar la **Regla 6 (Integridad de Incidencias):**
     - Intentar resolver o cerrar una incidencia sin ingresar notas de solución: el backend rechaza con `RULE_6_INCIDENT_MISSING_SOLUTION`.

---

## ⏱️ Minuto 2:30 - 3:30 | La Joya de la Sustentación: Probador de Reglas y Centro de Datos

1. **Ir a la vista "Reglas de Negocio en Vivo":**
   - Presionar el botón **"Ejecutar Todas las Reglas en Vivo"**.
   - Mostrar a los jurados cómo en segundos el sistema evalúa los casos válidos (verde) y los casos inválidos (rojo) para las 6 reglas obligatorias.
   - *"Jurados, si desean probar cualquier caso al azar, podemos ejecutarlo en vivo ahora mismo."*

2. **Ir al "Centro de Datos Oficiales":**
   - Mostrar que la aplicación carga directamente los archivos entregados por Campuslands.
   - Subir o pegar un CSV / JSON con registros de prueba (o usar los archivos de muestra `sample_spaces.csv`).
   - Mostrar el **Reporte de Validación**: filas válidas, filas insertadas, registros duplicados detectados y reporte de errores fila por fila.
   - Destacar que antes de cualquier importación destructiva, el sistema genera automáticamente una **copia de seguridad JSON** en `server/data/backups/`.

---

## 🎯 Preguntas Frecuentes del Jurado y Cómo Responder

| Pregunta Típica | Respuesta Ganadora |
|---|---|
| *¿Qué pasa si la IA se cae o se acaba la cuota de la API?* | *"Diseñamos un fallback transparente. La arquitectura separa las reglas deterministas de las recomendaciones de IA. Si la API falla, se activa el modo de triaje manual sin bloquear la aplicación y las 6 reglas de negocio siguen funcionando al 100%."* |
| *¿Dónde se ejecutan las validaciones, en cliente o servidor?* | *"Todas las validaciones están centralizadas en el backend (`server/src/rules/businessRules.js`). Aunque la interfaz ofrece feedback visual inmediato, el backend es el único guardián de la integridad."* |
| *¿Cómo garantizan que no haya corrupción si se reinicia el servidor?* | *"Utilizamos Better-SQLite3 configurado en modo WAL (Write-Ahead Logging) y con restricciones de claves foráneas activadas (`PRAGMA foreign_keys = ON`). Cada operación de préstamo o devolución se ejecuta dentro de transacciones atómicas."* |
| *¿Cómo integran los datos oficiales de la competencia?* | *"Tenemos un módulo de ingesta que valida esquema, unicidad de IDs y estados permitidos, generando backups automáticos antes de aplicar cambios y emitiendo un reporte de inconsistencias."* |
