/**
 * SERVICIO DE INTELIGENCIA ARTIFICIAL REAL - CAMPUSLANDS
 * Triaje Inteligente de Incidencias: Clasificación, Prioridad, Área y Ruta de Atención.
 * Con soporte para Gemini API y OpenAI API vía variables de entorno o clave en tiempo de ejecución.
 * Manejo estricto de timeouts, validación de schema y modo fallback manual transparente.
 */

const SYSTEM_PROMPT = `
Eres el Agente Especialista en Triaje Operativo de Campuslands (un campus de formación tecnológica intensiva en programación y computación).
Tu rol es analizar incidencias reportadas por campers, trainers o personal administrativo y clasificar técnica y operativamente el caso.

Categorías válidas:
- "INFRAESTRUCTURA"
- "EQUIPOS"
- "CONECTIVIDAD"
- "CLIMATIZACION"
- "ELECTRICA"
- "OTRO"

Prioridades válidas (considera el impacto sobre las clases y proyectos en vivo):
- "BAJA": No afecta el desarrollo de actividades académicas inmediatamente.
- "MEDIA": Incomodidad menor o falla de equipo no crítico con reemplazo inmediato.
- "ALTA": Afecta a un aula o grupo completo (ej. calor excesivo, proyector averiado en clase).
- "CRITICA": Riesgo físico (chispas, corto circuito) o parálisis total de conectividad en campus.

Áreas responsables válidas:
- "SOPORTE_TI": Redes, laptops, servidores, proyectores, pantallas, periféricos, software.
- "MANTENIMIENTO_FISICO": Climatización AC, electricidad, mobiliario, plomería, cielo raso.
- "SERVICIOS_GENERALES": Aseo, insumos, cafetería, residuos.
- "COORDINACION_ACADEMICA": Conducta, permisos, reprogramaciones.

Debes responder ÚNICAMENTE un objeto JSON válido con la siguiente estructura exacta:
{
  "suggested_category": string,
  "suggested_priority": string,
  "suggested_area": string,
  "suggested_solution": string,
  "action_plan_steps": [string],
  "explanation": string,
  "confidence": number (entre 0 y 1)
}
No agregues formato markdown ni bloques \`\`\`json. Solo el texto JSON puro.
`;

export async function analyzeIncidentWithAI(incidentData, runtimeApiKey = null) {
  const geminiKey = runtimeApiKey || process.env.GEMINI_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  if (!geminiKey && !openaiKey) {
    return {
      success: false,
      isAvailable: false,
      error: 'API Key no configurada. Configure GEMINI_API_KEY u OPENAI_API_KEY en .env o ingrese una clave en la interfaz para activar el modelo en vivo.',
      fallbackMode: true,
      recommendation: null
    };
  }

  const promptText = `
Analiza la siguiente incidencia de Campuslands:
- ID: ${incidentData.id || 'NUEVA'}
- Título: ${incidentData.title}
- Descripción: ${incidentData.description}
- Ubicación / Espacio: ${incidentData.location_or_space_id || 'No especificado'}
- Reportado por: ${incidentData.reported_by || 'Usuario'}
- Categoría actual preliminar: ${incidentData.category || 'INFRAESTRUCTURA'}
- Prioridad actual preliminar: ${incidentData.priority || 'MEDIA'}
`;

  try {
    if (geminiKey) {
      return await callGemini(geminiKey, promptText);
    } else {
      return await callOpenAI(openaiKey, promptText);
    }
  } catch (err) {
    console.error('Error durante la llamada al servicio de IA:', err);
    return {
      success: false,
      isAvailable: false,
      error: `Error al consultar el modelo de IA: ${err.message}`,
      fallbackMode: true,
      recommendation: null
    };
  }
}

async function callGemini(apiKey, promptText) {
  // Try gemini-1.5-flash or gemini-2.0-flash with 12s timeout
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  const body = {
    contents: [
      {
        parts: [
          { text: SYSTEM_PROMPT + '\n\n' + promptText }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.2,
      responseMimeType: 'application/json'
    }
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(12000)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `HTTP ${response.status} en API Gemini`);
  }

  const data = await response.json();
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!rawText) {
    throw new Error('La respuesta de Gemini no contuvo texto estructurado.');
  }

  const parsed = parseAndValidateAiJson(rawText, 'Gemini 1.5 Flash');
  return {
    success: true,
    isAvailable: true,
    provider: 'Google Gemini',
    model: 'gemini-1.5-flash',
    recommendation: parsed
  };
}

async function callOpenAI(apiKey, promptText) {
  const endpoint = 'https://api.openai.com/v1/chat/completions';

  const body = {
    model: 'gpt-4o-mini',
    temperature: 0.2,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: promptText }
    ],
    response_format: { type: 'json_object' }
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(12000)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `HTTP ${response.status} en API OpenAI`);
  }

  const data = await response.json();
  const rawText = data.choices?.[0]?.message?.content;

  if (!rawText) {
    throw new Error('La respuesta de OpenAI no contuvo contenido.');
  }

  const parsed = parseAndValidateAiJson(rawText, 'GPT-4o-mini');
  return {
    success: true,
    isAvailable: true,
    provider: 'OpenAI',
    model: 'gpt-4o-mini',
    recommendation: parsed
  };
}

function parseAndValidateAiJson(rawText, modelName) {
  let cleaned = rawText.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json/, '').replace(/```$/, '').trim();
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```/, '').replace(/```$/, '').trim();
  }

  let obj;
  try {
    obj = JSON.parse(cleaned);
  } catch (e) {
    throw new Error(`La IA retornó una respuesta que no es JSON válido: ${e.message}`);
  }

  const validCategories = ['INFRAESTRUCTURA', 'EQUIPOS', 'CONECTIVIDAD', 'CLIMATIZACION', 'ELECTRICA', 'OTRO'];
  const validPriorities = ['BAJA', 'MEDIA', 'ALTA', 'CRITICA'];
  const validAreas = ['SOPORTE_TI', 'MANTENIMIENTO_FISICO', 'SERVICIOS_GENERALES', 'COORDINACION_ACADEMICA'];

  const category = validCategories.includes(obj.suggested_category) ? obj.suggested_category : 'INFRAESTRUCTURA';
  const priority = validPriorities.includes(obj.suggested_priority) ? obj.suggested_priority : 'MEDIA';
  const area = validAreas.includes(obj.suggested_area) ? obj.suggested_area : 'SOPORTE_TI';

  return {
    suggested_category: category,
    suggested_priority: priority,
    suggested_area: area,
    suggested_solution: obj.suggested_solution || 'Revisión técnica requerida en el punto del incidente.',
    action_plan_steps: Array.isArray(obj.action_plan_steps) ? obj.action_plan_steps : [obj.suggested_solution || 'Inspección técnica'],
    explanation: obj.explanation || 'Clasificación automática basada en severidad e impacto operativo.',
    confidence: typeof obj.confidence === 'number' ? Math.min(Math.max(obj.confidence, 0.5), 0.99) : 0.9,
    model_used: modelName,
    analyzed_at: new Date().toISOString()
  };
}
