# HelpDock AI

## Qué es

HelpDock AI es un **widget de soporte con inteligencia artificial para webs y productos SaaS**.

Se instala en una página web como un pequeño plugin embebible y aparece como un chat flotante para que los usuarios puedan hacer preguntas sobre el producto, servicio o documentación de una empresa.

Ejemplo de instalación self-hosted:

```html
<script
  src="${PUBLIC_APP_URL}/widget.js"
  data-helpdock-api="${PUBLIC_APP_URL}/api"
  data-helpdock-widget-id="public_widget_id"
></script>
```

El widget se sirve por defecto desde la instalación controlada por la empresa mediante su `PUBLIC_APP_URL`. Un modo CDN hospedado por HelpDock, si se agrega en el futuro, debe ser explícito, opcional y documentado como una dependencia externa.

---

## Problema que resuelve

Muchas empresas tienen documentación, FAQs, políticas y guías internas, pero los usuarios no siempre saben dónde buscar.

HelpDock AI permite que cualquier usuario pregunte directamente desde la web y reciba una respuesta contextual basada en los documentos reales del negocio, manteniendo documentos, conversaciones, embeddings, tickets y auditoría dentro de la instalación controlada por la empresa.

---

## Qué hace

HelpDock AI permite:

- Insertar un chat de soporte en cualquier web.
- Responder preguntas usando documentación del negocio.
- Buscar información mediante RAG.
- Crear tickets cuando la IA no puede resolver el caso.
- Escalar a soporte humano.
- Medir costo, latencia y calidad de cada respuesta.
- Registrar conversaciones para análisis posterior.

---

## Qué NO es

HelpDock AI no es simplemente un wrapper de ChatGPT.

El objetivo no es mostrar una caja de chat conectada a un modelo, sino demostrar un sistema AI más completo:

- recuperación de contexto,
- uso de tools,
- reglas de escalamiento,
- evals,
- observabilidad,
- control de calidad,
- trazabilidad de respuestas.

HelpDock AI tampoco es una plataforma centralizada de datos de clientes. Si una empresa configura un procesador externo —por ejemplo proveedores de IA, embeddings externos, email, storage, tracing o vector databases hospedadas— debe aceptar explícitamente qué categorías de datos pueden enviarse a ese proveedor según su configuración.

El lifecycle de procesadores externos debe estar definido: enable, revoke, rotate credentials, cambiar categorías de datos permitidas y manejo de datos históricos. Si un procesador o categoría se revoca, nuevos jobs no pueden enviarle datos y el sistema debe pasar a modo degradado o requerir nueva configuración. La UI debe explicar que datos ya enviados quedan sujetos a las políticas del proveedor externo.

Cuando se revoca un procesador externo o una categoría de datos, los jobs pendientes o encolados deben revalidar consentimiento antes de ejecutarse. Si ya no cumplen la política vigente, deben cancelarse, fallar de forma segura o esperar nueva configuración. Los jobs en curso deben registrar qué consentimiento estaba vigente al momento de ejecución.

Para jobs en curso durante una revocación, el sistema debe intentar cancelación best-effort y bloquear cualquier envío externo adicional que todavía no haya ocurrido. Si parte de los datos ya fue transmitida antes de la revocación, la UI y los runbooks deben explicar que esos datos quedan sujetos a las políticas del proveedor externo. Los jobs largos o multi-step deben revalidar consentimiento antes de cada nuevo envío externo.

Si un proveedor externo devuelve resultados tardíos después de una revocación, el sistema debe aplicar una política explícita: aceptar solo si el envío ocurrió bajo consentimiento válido y el resultado sigue permitido por la política actual, poner en cuarentena para revisión, o descartar. El resultado debe registrar el consentimiento vigente al momento del envío y el estado de política al momento de recepción.

Los resultados en cuarentena deben tener TTL, access control estricto, política de borrado y estado explícito de no-uso antes de revisión. Ningún resultado en cuarentena puede alimentar respuestas, embeddings, evals, métricas o sugerencias hasta ser aprobado por un usuario autorizado.

Para procesadores externos, el sistema debe registrar capacidades de borrado o anonimización cuando existan. Esto incluye proveedor, categorías de datos enviadas, política de retención conocida, soporte de deletion/anonymization API o proceso manual, estado de solicitudes enviadas, evidencia de respuesta del proveedor y excepciones cuando el proveedor no soporte borrado verificable.

La evidencia de deletion/anonymization de procesadores externos debe usar un schema consistente con campos mínimos: request_id, provider, data_categories, capability_version, requested_at, provider_response_at, provider_response_status, evidence_link_or_payload_hash, operator, exception_reason si aplica y next_review_at si el borrado verificable no está soportado.

Los records de deletion/anonymization externa, evidencia y excepciones deben formar parte del deletion ledger o del restore replay bundle independiente del backup. Una restauración no se considera verificada si pierde el estado local de solicitudes enviadas a proveedores externos o sus excepciones.

---

## Usuarios objetivo

HelpDock AI está pensado para:

- SaaS B2B.
- Startups con documentación pública.
- E-commerce.
- Portales de clientes.
- Productos con soporte técnico frecuente.
- Equipos que quieren reducir tickets repetitivos.

---

## Componentes principales

### 1. Widget embebible

Chat flotante que se puede insertar en cualquier sitio web.

Debe incluir:

- botón flotante,
- ventana de chat,
- historial de conversación,
- estados de carga,
- feedback útil/no útil,
- opción de escalar a humano.

El widget público debe incluir controles de abuso, límites de uso, vínculo a un `public_widget_id`, allowed-origin/domain binding obligatorio donde el navegador lo permita y protección contra acciones de cambio de estado sin autorización. El `public_widget_id` es público y no debe tratarse como secreto.

`Origin` y `Referer` son señales de defensa en profundidad, no autenticación. Si faltan o no son confiables, el sistema debe seguir aplicando widget/site binding, action tokens para mutaciones, rate limits, cost caps y monitoreo de abuso.

Para mutaciones públicas con origen no verificable, el backend debe exigir una prueba alternativa de contexto, como sesión/token emitido por el widget para ese `public_widget_id`, action token de un solo uso o vínculo de ticket scopeado. Si el contexto no puede verificarse, la mutación debe rechazarse o pasar a modo degradado seguro.

Los tokens fallback del widget deben tener TTL corto, estar scopeados por widget/site/action/ticket según corresponda, proteger contra replay, ser revocables y rotables. Si se persisten, deben guardarse como hash del lado servidor. Por defecto, las mutaciones sensibles deben usar tokens de un solo uso. Esto incluye responder tickets, actualizar email/contacto, aceptar políticas, solicitar escalamiento, crear tickets y mutaciones de feedback si son sensibles a abuso. Cualquier excepción debe estar documentada.

Las excepciones a tokens one-time deben registrarse en un exception registry con acción afectada, razón, riesgo, control compensatorio, owner, fecha de revisión y criterio de expiración o renovación.

El exception registry debe estar protegido por RBAC, auditado y revisado periódicamente. Las excepciones expiradas, sin owner o sin revisión vigente deben bloquear release hasta renovarse formalmente o eliminarse. El bloqueo de release debe automatizarse en CI/release policy por defecto y no depender solo de revisión manual. Si automatizar no es viable, debe existir una excepción documentada con razón, control compensatorio, owner, expiración y release gate manual explícito.

### 2. Backend de conversación

API encargada de recibir preguntas, recuperar contexto, llamar al modelo y devolver respuestas.

Debe incluir:

- endpoint de chat,
- manejo de sesiones,
- integración con LLM,
- validación de inputs,
- rate limiting,
- logging.

Los endpoints públicos deben aplicar rate limits por IP/sesión/sitio, circuit breakers de costo/modelo y comportamiento fail-closed para llamadas costosas cuando los contadores no estén disponibles.

Los rate limits y cost caps deben seguir aplicando incluso si el origen falta, es poco confiable o no puede validarse.

### 3. RAG sobre documentación

Sistema para cargar documentos y responder usando información real del negocio.

Debe incluir:

- carga de documentos,
- chunking,
- embeddings,
- vector search,
- trazabilidad interna del contenido usado.

La búsqueda vectorial debe estar aislada por scope. Cada documento, versión, chunk, embedding, conversación, ticket, gap, eval, export y traza debe estar asociado al effective scope tuple requerido por la superficie actual, por ejemplo `installation_id`, `workspace_id`, `site_id` y/o `public_widget_id` según corresponda. El sistema nunca debe hacer retrieval global para filtrar después; el filtro de scope debe formar parte de la consulta antes de devolver candidatos.

Además del scope, la búsqueda debe respetar visibilidad documental. No todos los documentos activos son aptos para el widget público.

Visibilidades mínimas:

- `public_widget`: usable por el widget público.
- `authenticated_customer`: usable solo por experiencias de cliente autenticadas si existen.
- `support_only`: visible para agentes/soporte, no para respuestas públicas automáticas.
- `admin_only`: visible solo para administración y configuración interna.

El widget público solo puede recuperar documentos y chunks marcados como `public_widget`. La consulta vectorial debe filtrar por scope y visibilidad antes de devolver candidatos.

Ejemplo conceptual:

```sql
WHERE installation_id = current_installation_id
AND workspace_id = current_workspace_id
AND site_id = current_site_id
AND public_widget_id = current_public_widget_id
AND document_status = 'active'
AND document_type = 'knowledge'
AND document_visibility = 'public_widget'
```

El ejemplo debe adaptarse al contexto efectivo de la consulta, pero siempre debe incluir los identificadores de scope necesarios antes de devolver candidatos.

Las trazas, evals, exports, sugerencias de IA y gaps también deben respetar scope y visibilidad. Los tests de release deben probar que el widget público no puede recuperar documentos `authenticated_customer`, `support_only` ni `admin_only`, aunque pertenezcan al mismo sitio.

Si un documento cambia de `public_widget` a una visibilidad más restringida, debe dejar de ser recuperable inmediatamente. La implementación debe actualizar o invalidar metadata de chunks, embeddings, índices vectoriales y cachés, o aplicar joins/filtros contra la visibilidad actual del documento en tiempo de consulta.

Matriz mínima de acceso por superficie:

| Superficie | public_widget | authenticated_customer | support_only | admin_only |
| --- | --- | --- | --- | --- |
| Widget público | Sí | No | No | No |
| Portal de cliente autenticado futuro | Configurable | Sí | No | No |
| Dashboard agente/soporte | Según permisos | Según permisos | Sí | No por defecto |
| Dashboard manager/admin | Sí | Sí | Sí | Sí |
| Evals | Según scope y objetivo del eval | Según scope y objetivo del eval | Según permisos | Según permisos |
| Exports | Según permisos y redacción | Según permisos y redacción | Según permisos y redacción | Solo permisos privilegiados |
| Answer traces | Resumen redactado | Resumen redactado | Según permisos | Diagnóstico privilegiado |

Las relaciones de datos deben reforzar este aislamiento con constraints de base de datos cuando aplique: composite foreign keys, bindings inmutables de sitio/widget, query builders scopeados, contexto de tenant deny-by-default y checks de migración que detecten filas sin scope o scopes inconsistentes.

### 4. Ticketing y escalamiento

Cuando la IA no tiene suficiente confianza, debe poder escalar.

Debe incluir:

- creación de ticket,
- captura de email o contacto,
- resumen automático del problema,
- historial de conversación adjunto.

Los tickets del usuario final deben accederse mediante tokens seguros scopeados, hash en base de datos, expiración, revocación y rotación. Las acciones de cambio de estado desde el widget, como crear o responder tickets, requieren protección CSRF/origin/action-token según el modo de sesión.

### 5. Dashboard admin

Panel para que el equipo vea qué está pasando.

Debe mostrar:

- conversaciones,
- preguntas frecuentes,
- costo por conversación,
- latencia,
- respuestas mal calificadas,
- tickets creados,
- métricas de calidad.

El dashboard requiere autenticación desde el inicio, RBAC aplicado en backend, setup inicial protegido por `SETUP_TOKEN` en producción y audit log append-only a nivel de aplicación. El `SETUP_TOKEN` debe ser single-use o quedar deshabilitado después de crear el primer manager/admin. Debe tratarse como secreto: no debe loguearse, debe redactarse en errores/config dumps, debe validarse con rate limiting para intentos fallidos y debe auditar intentos de setup fallidos sin guardar el token en claro. Si se persiste, debe almacenarse como hash o mecanismo equivalente seguro.

### 6. Evals y observabilidad

Sistema para medir si HelpDock AI responde bien.

Debe incluir:

- dataset de preguntas esperadas,
- checks de groundedness,
- hallucination checks,
- retrieval quality,
- latency tracking,
- cost tracking,
- regression tests.

Los evals y jobs costosos deben ejecutarse en colas con límites de concurrencia, costo, timeouts, reintentos controlados y estados fallidos visibles.

---

## MVP inicial

La primera versión debe tener:

- Widget embebible.
- Chat funcional.
- Carga de documentación.
- RAG básico.
- Respuestas basadas en evidencia interna, sin mostrar fuentes al usuario final por defecto.
- Creación de tickets.
- Feedback útil/no útil.
- Logs de costo y latencia.
- Eval suite con preguntas de prueba.
- README tipo case study.

---

## Por qué sirve para portfolio

HelpDock AI demuestra habilidades relevantes para roles de AI Engineer:

- integración de IA en productos web,
- diseño de experiencias AI reales,
- RAG pipelines,
- uso de LLM APIs,
- backend y frontend,
- evals,
- observabilidad,
- tradeoffs de costo y latencia,
- producto SaaS,
- escalamiento humano.

---

## Pitch corto

HelpDock AI es un widget de soporte con IA para webs y SaaS que responde preguntas usando documentación real del negocio, escala a humanos cuando no sabe y mide calidad, costo y latencia de cada interacción.

---

## Principio de diseño

HelpDock AI debe ser confiable antes que espectacular.

La IA no debe inventar respuestas. Si no tiene evidencia suficiente, debe reconocerlo y escalar el caso.

---

## Límites de seguridad y privacidad

- El widget nunca debe contener secretos.
- La IA solo puede responder con evidencia suficiente de documentos activos, scopeados y elegibles por visibilidad.
- Los documentos de política/guardrails controlan comportamiento, pero no son fuente factual para respuestas al usuario final.
- Los procesadores externos requieren consentimiento explícito del manager y registro de qué categorías de datos pueden enviarse.
- Los archivos subidos son temporales; se conserva solo texto extraído, chunks, embeddings y metadata.
- Los parsers de documentos deben ejecutarse aislados, sin egress de red durante parsing, con límites de CPU/memoria/tiempo, filesystem temporal limitado y limpieza segura de archivos temporales.
- Los tests y runbooks de parser deben cubrir decompression bombs, archivos demasiado grandes, PDFs/DOCX malformados, HTML con recursos externos, timeouts y limpieza de temporales después de fallos.
- La suite de CI/release debe incluir fixtures maliciosos o sintéticos para esos casos de parser abuse. La implementación no se considera lista si esos tests no fallan primero y luego pasan con el aislamiento activo.
- Los documentos archivados o eliminados dejan de ser recuperables inmediatamente.
- Las trazas de respuesta son internas y deben redactarse por rol; nunca se exponen prompts del sistema, guardrails ocultos, secretos o contenido privado al usuario final.
- Las exportaciones deben ser autorizadas, filtradas, limitadas, escapadas contra CSV formula injection y auditadas.
- Los audit logs deben ser privacy-safe: no deben conservar PII cruda, mensajes completos ni prompts completos. Deben usar IDs internos, HMAC/keyed hashes, hashes con sal adecuada, referencias minimizadas, redacción segura o mecanismos equivalentes que preserven utilidad de auditoría sin convertir el audit log en un almacén permanente de datos personales. No deben usarse hashes simples y reversibles por diccionario para emails, nombres, teléfonos u otros identificadores previsibles.
- HelpDock AI debe construirse con TDD estricto para invariantes centrales. Las reglas de scope, visibilidad, RAG, ticket access, borrado/restauración, exports y permisos requieren un test fallido primero antes de implementar la lógica productiva. Ninguna suite central se considera lista hasta demostrar el ciclo fail-first then pass para sus invariantes de seguridad y privacidad.
- La evidencia TDD de invariantes centrales debe quedar registrada preferentemente con links o artifacts de CI, indicando el test que falló primero, el cambio que lo hizo pasar y la suite afectada. Las notas de PR o checklists de revisión solo pueden complementar esa evidencia o justificar excepciones cuando la automatización no sea viable.

---

## Restauración de backups y borrado de privacidad

Las solicitudes de borrado o anonimización deben sobrevivir restauraciones de backups antiguos.

El sistema debe mantener un deletion ledger o tombstones disponibles de forma independiente al backup restaurado. Puede ser un ledger durable externo, un restore bundle más nuevo que el backup, un archivo seguro de tombstones o un replay file generado por el operador.

Después de restaurar un backup, el servicio no puede volver a tráfico normal hasta:

1. Determinar el timestamp del backup restaurado.
2. Cargar deletion ledger/tombstones posteriores a ese backup.
3. Reaplicar borrados o anonimizaciones.
4. Verificar que no reaparezcan datos borrados en conversaciones, tickets, mensajes, documentos fuente, uploads temporales, parser artifacts, job payloads, embeddings, answer traces, evals, exports, gaps, notifications, audit references, access tokens, quarantine stores/results ni otros storage backends configurados. Aunque por defecto los raw uploads no se retienen, la verificación debe cubrir cualquier almacenamiento opcional que se habilite en el futuro, incluyendo source uploads o artifacts retenidos por configuración.
5. Generar un restore verification report.

Si la verificación falla, el sistema debe permanecer en maintenance mode y el widget debe quedar deshabilitado salvo mensaje seguro de mantenimiento.

El deletion ledger debe minimizar datos sensibles: no debe guardar texto completo de mensajes, prompts, PII innecesaria ni contenido completo de tickets/conversaciones.

El deletion ledger debe tener garantías de integridad y control de acceso. Debe ser append-only o equivalente, estar firmado o protegido con checksums verificables, registrar procedencia de replay files generados por operadores y quedar vinculado al restore verification report. Si la integridad del ledger o replay file no puede verificarse, el restore debe fallar cerrado y mantenerse en maintenance mode.

---

## Checklist de invariantes centrales

La evidencia TDD para invariantes centrales debe preferir links o artifacts de CI. Las notas de PR o checklists de revisión pueden complementar esa evidencia o justificar excepciones, pero no deben reemplazar CI cuando la automatización sea viable.

Suites mínimas de invariantes centrales:

- scope isolation: ninguna entidad o query cruza installation/workspace/site/widget sin autorización explícita.
- visibility gates: el widget público solo recupera `public_widget`; `authenticated_customer`, `support_only` y `admin_only` quedan excluidos.
- RAG evidence/refusal: la IA responde solo con evidencia suficiente y rechaza cuando no la hay.
- ticket access: clientes solo ven/responden tickets scopeados a su token/sesión/verificación.
- deletion replay/restore: restaurar backups antiguos no resucita datos borrados o anonimizados.
- exports/redaction: exports son permissioned, bounded, escaped y redacted según rol.
- permissions/RBAC: backend niega acciones sin permisos, aunque el frontend las muestre por error.
- parser isolation: archivos maliciosos, grandes o malformados no rompen aislamiento ni dejan temporales inseguros.

---

## Runbooks operativos obligatorios

La instalación self-hosted debe incluir runbooks para:

- rate-limit store degradado o no disponible,
- jobs trabados o dead-letter queue,
- restauración de backups con replay de deletion ledger,
- verificación de audit hash chain si el modo tamper-evident está activo,
- fallo de proveedor/modelo,
- fallo del parser worker,
- rotación de secretos y credenciales externas.

Los runbooks deben explicar síntomas, impacto, comportamiento fail-open/fail-closed, pasos de recuperación y verificación posterior.

Cada runbook debe tener owner responsable, fecha de última revisión y cadencia de drill o revisión. Como mínimo, restore con deletion replay, rate-limit store degradado, DLQ/stuck jobs, provider outage y parser failure deben practicarse o revisarse antes de release y de forma periódica según criticidad.

Cada drill debe dejar evidencia auditable: owner, fecha, escenario probado, resultado, problemas encontrados, follow-up actions y estado de cierre de esos follow-ups.

La evidencia de drills debe almacenarse en registros operativos durables y con access control. Cada follow-up debe tener responsable y verificador de cierre.

Los runbooks deben usar un template/schema común de evidencia con campos mínimos: runbook_id, owner, reviewer, fecha, entorno, escenario, pasos ejecutados, resultado, evidencia/link, problemas encontrados, follow-ups, responsable de cada follow-up, verificador y fecha de cierre.

Durante implementación debe definirse el storage canónico de esa evidencia, su política de retención y el versionado del schema de evidencia. La evidencia debe ser durable, consultable por personal autorizado y exportable para auditoría interna.

El storage canónico de evidencia de runbooks debe definirse como criterio de aceptación de implementación, incluyendo nombre del store, retention class, schema version, export path, RBAC y procedimiento de migración de schema.
