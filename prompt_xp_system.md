# Prompt para Claude Code — Sistema de XP y Logros (Lyfters Badge App)

## Contexto del proyecto

Estás trabajando en **Lyfters Badge App**, una app de gamificación para eventos presenciales de un día. Los participantes asisten al evento y escanean QRs para coleccionar badges. El stack es:

- **Backend**: Python (Flask) + MongoDB, deployado en Render
- **Frontend**: HTML + CSS + JS puro (sin frameworks), deployado en Vercel
- **Auth**: JWT con `flask-jwt-extended`
- **Seguridad existente**: geolocalización (radio 1km por evento), IP guard (una cuenta por IP), rate limiting por endpoint

El repo tiene esta estructura relevante:
```
backend/
  app.py               — registra blueprints
  db.py                — conexión MongoDB (singleton), expone users(), events(), badges(), scans()
  routes/
    auth.py            — /auth/*
    admin.py           — /admin/*
    events.py          — /events/*, /leaderboard
    redeem.py          — /redeem/<event_id>/<token>  ← punto de entrada principal del flujo
  utils.py             — helpers: valid_oid, sanitize, require_admin, fmt_*
  security/
    limiter.py         — decoradores de rate limiting
    ip_guard.py        — un registro por IP
js/
  api.js               — capa de datos: modo mock (localStorage) + modo real (fetch al backend)
  app.js               — router SPA + vistas + interactividad
```

---

## Qué construir

Implementar un **sistema de XP y logros** que recompense a los usuarios por su participación, tanto dentro de un evento como a lo largo de múltiples eventos en el tiempo.

---

## Modelo conceptual — leer antes de escribir código

### Cómo se gana XP

XP se otorga **exclusivamente en el backend**, nunca el cliente propone ni calcula valores. Los eventos que generan XP son:

1. **Escanear un badge** → XP configurable por badge (`xp_value` en el documento del badge, default 10)
2. **Primer badge del evento** (primer scan de este usuario en este evento) → bonus configurable en el evento (`xp_first_scan`, default 5)
3. **Badge raro** (campo `is_rare: true` en el badge) → bonus configurable en el evento (`xp_rare_bonus`, default 15)
4. **Completar el evento** (este scan lleva al usuario a tener todos los badges del evento) → bonus configurable en el evento (`xp_completion_bonus`, default 50)
5. **Desbloquear un logro** → XP fijo según rareza del logro (común: 15, raro: 30, épico: 75, legendario: 100)

Los bonuses 2, 3 y 4 se detectan automáticamente en el momento del scan comparando contra la base de datos. El cliente no informa nada de esto.

Un scan duplicado (el usuario ya tiene ese badge) **no otorga XP**. Ya existe la validación de duplicado en `redeem.py` — respetarla.

### Niveles

El nivel es una función pura del XP total acumulado:

| Nivel | Nombre         | XP requerido |
|-------|----------------|--------------|
| 1     | Explorador     | 0            |
| 2     | Coleccionista  | 100          |
| 3     | Maestro badge  | 300          |
| 4     | Leyenda Lyfter | 600          |

El nivel se recalcula cada vez que cambia el XP. No se almacena en la base de datos, se computa en runtime.

### Logros

Los logros son hitos discretos e irrepetibles. Una vez desbloqueados son permanentes. Se evalúan después de cada scan exitoso (no duplicado).

Logros iniciales a implementar:

```
slug                  | nombre               | condición                                      | rareza
----------------------|----------------------|------------------------------------------------|----------
first_scan            | Primer paso          | primer badge escaneado en cualquier evento     | común
first_event_complete  | Completista          | completar todos los badges de cualquier evento | raro
five_badges           | Coleccionista        | 5 badges totales acumulados                    | común
twenty_five_badges    | Adictx               | 25 badges totales acumulados                   | raro
three_events          | Viajero              | participar en 3 eventos distintos              | raro
five_events           | Veterano             | participar en 5 eventos distintos              | épico
three_completions     | Perfeccionista       | completar 3 eventos distintos                  | épico
rare_badge            | Ojo de halcón        | escanear cualquier badge marcado is_rare: true | raro
legend                | Leyenda              | alcanzar nivel 4                               | legendario
```

Las condiciones se evalúan consultando la base de datos, no con lógica del cliente.

---

## Cambios en la base de datos

### Colección `users` — agregar campos

```js
xp_total: { type: int, default: 0 }
```

No almacenar el nivel — se computa. No almacenar logros aquí — van en colección separada.

### Colección `badges` — agregar campos

```js
xp_value:  { type: int, default: 10 }   // XP base por escanear este badge
is_rare:   { type: bool, default: false } // si true, aplica xp_rare_bonus del evento
```

### Colección `events` — agregar campos

```js
xp_first_scan:      { type: int, default: 5 }   // bonus por primer badge del evento
xp_rare_bonus:      { type: int, default: 15 }  // bonus adicional si el badge es raro
xp_completion_bonus:{ type: int, default: 50 }  // bonus por completar todos los badges
```

### Nueva colección `achievements`

Documentos de definición de logros (seed fijo, no lo crea el admin):

```js
{
  _id:         ObjectId,
  slug:        string (único),
  name:        string,
  description: string,
  icon:        string (emoji),
  xp_reward:   int,
  rarity:      enum ["common", "rare", "epic", "legendary"]
}
```

### Nueva colección `user_achievements`

```js
{
  user_id:        ObjectId,  // FK → users
  achievement_id: ObjectId,  // FK → achievements
  unlocked_at:    date
}
```

Índice único en `(user_id, achievement_id)`.

### Nueva colección `xp_log`

Auditoría de cada XP otorgado. Nunca se modifica, solo se inserta:

```js
{
  user_id:    ObjectId,
  amount:     int,
  reason:     string,  // "scan", "first_scan_bonus", "rare_bonus", "completion_bonus", "achievement"
  ref_id:     ObjectId,  // badge_id o achievement_id según reason
  event_id:   ObjectId,
  created_at: date
}
```

Este log es la fuente de verdad para auditoría. Si `xp_total` en users está mal, se puede recalcular sumando este log.

---

## Archivos nuevos a crear

### `backend/services/xp.py`

Módulo con función principal:

```python
def award_xp(user_oid, badge_doc, event_doc, is_first_scan, is_completion) -> dict:
    """
    Calcula y otorga el XP correspondiente a un scan.
    Actualiza users.xp_total y escribe en xp_log.
    Retorna dict con: { xp_gained: int, xp_total: int, level: int, level_up: bool }
    """
```

Reglas:
- Nunca otorgar XP en scan duplicado — el llamador debe garantizar que el scan es nuevo
- Usar `$inc` atómico en MongoDB para actualizar `xp_total`, nunca read-modify-write
- Insertar una entrada en `xp_log` por cada tipo de XP otorgado (scan base, bonuses separados)
- Calcular nivel antes y después — si cambia, `level_up: true`

Función auxiliar:

```python
def compute_level(xp_total: int) -> int:
    """Retorna el nivel 1-4 según umbrales. Pura, sin side effects."""
```

### `backend/services/achievements.py`

```python
def check_and_unlock(user_oid, event_oid) -> list:
    """
    Evalúa todos los logros que el usuario no tiene todavía.
    Desbloquea los que cumplen condición. Otorga XP por cada uno.
    Retorna lista de slugs desbloqueados en esta llamada.
    """
```

Reglas:
- Cargar logros pendientes (achievements que no están en user_achievements del usuario)
- Evaluar cada condición con una query a la base de datos
- Usar `insert_one` con manejo de `DuplicateKeyError` para evitar race conditions
- Si se desbloquea un logro, llamar a `xp.award_xp` para el XP del logro
- Nunca lanzar excepción si falla un logro individual — loggear y continuar

### `backend/routes/xp.py`

Blueprint `xp_bp` con prefix `/profile`:

```
GET /profile/xp
  → { xp_total, level, level_name, xp_next_level, xp_for_next, progress_pct }
  → Requiere JWT

GET /profile/achievements
  → { unlocked: [...], locked: [...] }
  → Cada unlocked: { slug, name, description, icon, rarity, xp_reward, unlocked_at }
  → Cada locked: { slug, name, icon, rarity, hint: "descripción genérica sin spoilear la condición exacta" }
  → Requiere JWT
```

---

## Modificar `backend/routes/redeem.py`

Después de que el scan se inserta exitosamente (no en duplicado), agregar:

```python
# 1. Detectar contexto del scan
is_first_scan = (user_scns == 1)  # recién insertado, así que si ahora tiene 1 es el primero
is_completion = completado

# 2. Otorgar XP
from services.xp import award_xp
xp_result = award_xp(user_oid, badge, event, is_first_scan, is_completion)

# 3. Evaluar logros
from services.achievements import check_and_unlock
new_achievements = check_and_unlock(user_oid, oid_event)

# 4. Incluir en la respuesta
```

La respuesta del endpoint debe extenderse con:

```json
{
  "xp_gained": 25,
  "xp_total": 125,
  "level": 2,
  "level_up": false,
  "achievements_unlocked": ["first_scan", "five_badges"]
}
```

En caso de scan duplicado, estos campos van con valores neutros:
```json
{ "xp_gained": 0, "xp_total": <actual>, "level": <actual>, "level_up": false, "achievements_unlocked": [] }
```

---

## Modificar `backend/routes/admin.py`

### Al crear un badge (`POST /admin/events/<id>/badges`)
Aceptar campos opcionales `xp_value` (int, min 1, max 500) e `is_rare` (bool). Defaults si no se envían: `xp_value=10`, `is_rare=false`.

### Al crear un evento (`POST /admin/events`)
Aceptar campos opcionales `xp_first_scan`, `xp_rare_bonus`, `xp_completion_bonus`. Validar que sean int positivos. Defaults: 5, 15, 50.

### Al editar un badge o evento (si existe PATCH/PUT)
Permitir modificar estos campos. Los cambios solo afectan scans futuros — el XP ya otorgado no se recalcula.

---

## Modificar `backend/db.py`

Agregar funciones de acceso:

```python
def achievements():     return get_db()["achievements"]
def user_achievements(): return get_db()["user_achievements"]
def xp_log():           return get_db()["xp_log"]
```

En `init_indexes()` agregar:
```python
achievements().create_index("slug", unique=True)
user_achievements().create_index(
    [("user_id", ASCENDING), ("achievement_id", ASCENDING)],
    unique=True
)
xp_log().create_index([("user_id", ASCENDING), ("created_at", ASCENDING)])
```

---

## Seed de logros

Crear `backend/seed_achievements.py`, script standalone que inserta los 9 logros definidos arriba en la colección `achievements`. Usar `update_one` con `upsert=True` y filtro por `slug` para que sea idempotente (se puede correr múltiples veces sin duplicar).

---

## Modificar `backend/db/seed.js`

Agregar a los documentos de badges los campos `xp_value` e `is_rare`. Agregar a los documentos de eventos los campos `xp_first_scan`, `xp_rare_bonus`, `xp_completion_bonus`.

---

## Modificar `backend/routes/events.py` — leaderboard

El leaderboard existente muestra ranking por badges escaneados dentro de un evento. Hay que extenderlo y agregar un ranking global. Ambos deben mostrar XP, nivel y badges.

### Ranking por evento — `GET /leaderboard/<event_id>`

Reemplazar o extender el endpoint existente. La respuesta de cada entrada debe incluir:

```json
{
  "position": 1,
  "user_id": "...",
  "name": "Ana",
  "badges_in_event": 5,
  "badges_total": 5,
  "completed": true,
  "xp_total": 185,
  "level": 2,
  "level_name": "Coleccionista"
}
```

Ordenar por `badges_in_event` descendente como criterio principal. En caso de empate (dos usuarios con los mismos badges en el evento), desempatar por `xp_total` descendente — quien tiene más XP global va primero. Esto premia la trayectoria histórica sin distorsionar el ranking del evento.

Implementar con un pipeline de agregación MongoDB:
1. Agrupar `scans` por `user_id` filtrando por `event_id` → obtener `badges_in_event`
2. Lookup a `users` para traer `name` y `xp_total`
3. Computar `level` y `level_name` en Python desde `xp_total` usando `compute_level()`
4. Computar `completed` comparando `badges_in_event` con el total de badges del evento
5. Ordenar: `badges_in_event` DESC, `xp_total` DESC

No requiere autenticación — el leaderboard es público dentro del contexto del evento.

### Ranking global — `GET /leaderboard/global`

Nuevo endpoint. Muestra los top 50 usuarios de toda la app ordenados por XP total.

Cada entrada:

```json
{
  "position": 1,
  "user_id": "...",
  "name": "Ana",
  "xp_total": 420,
  "level": 3,
  "level_name": "Maestro badge",
  "badges_total": 32,
  "events_participated": 4,
  "achievements_count": 6
}
```

Implementar con pipeline de agregación:
1. Lookup de `scans` agrupados por `user_id` → `badges_total` y `events_participated` (distinct event_ids)
2. Lookup de `user_achievements` agrupados por `user_id` → `achievements_count`
3. Ordenar por `xp_total` DESC
4. Limitar a 50 resultados
5. Computar `level` y `level_name` en Python

No requiere autenticación. No exponer email ni datos sensibles — solo `name` y estadísticas públicas.

### Campo `my_position` en ambos rankings

Si el request incluye JWT válido (opcional, no requerido), agregar al objeto raíz de la respuesta:

```json
{
  "ranking": [...],
  "my_position": {
    "position": 12,
    "xp_total": 95,
    "level": 1,
    "badges_in_event": 3
  }
}
```

Si no hay JWT o el usuario no aparece en el ranking, `my_position: null`.

---

## Cambios en el frontend (`js/api.js` y `js/app.js`)

### En `api.js`

Agregar funciones:

```js
async function getXpProfile()               // GET /profile/xp
async function getAchievements()            // GET /profile/achievements
async function getEventLeaderboard(eventId) // GET /leaderboard/<event_id>
async function getGlobalLeaderboard()       // GET /leaderboard/global
```

En modo mock, simular respuestas con datos hardcodeados coherentes. El leaderboard mock debe tener al menos 5 entradas con niveles y XP variados para que la vista sea testeable.

### En `app.js`

**En la vista de perfil** (`renderProfile` o equivalente):
- Mostrar barra de XP: nivel actual, nombre del nivel, barra de progreso al siguiente nivel con porcentaje
- Mostrar grilla de logros: desbloqueados en color con fecha, bloqueados en gris con ícono en opacidad reducida

**Al procesar la respuesta de un scan exitoso**:
- Si `xp_gained > 0`: mostrar toast animado "+N XP" que aparece sobre el badge y se desvanece en 2 segundos
- Si `level_up: true`: mostrar banner "¡Subiste al nivel N!" antes del toast de XP
- Si `achievements_unlocked` tiene elementos: mostrar un modal por cada logro desbloqueado con su ícono, nombre y XP ganada. El modal debe cerrarse con tap o después de 3 segundos

**En el modo mock**: simular que el primer scan de la sesión siempre desbloquea `first_scan` y otorga 15 XP, para que el flujo sea testeable sin backend.

**En la vista de leaderboard de evento** (ya existe, extenderla):
- Cada fila debe mostrar: posición, nombre, badges del evento (con indicador de completado si aplica), XP total y chip de nivel (número + nombre)
- Resaltar la fila del usuario autenticado con fondo diferente
- Si `my_position` viene en la respuesta y el usuario no está en el top visible, mostrar su posición fija al fondo de la lista separada por un divisor

**Nueva vista de leaderboard global** (ruta `/leaderboard/global` en el router SPA):
- Tabla o lista con: posición, nombre, nivel (chip), XP total, badges totales, eventos participados, logros desbloqueados
- Mismo tratamiento de resaltado para el usuario propio
- Botón o tab para alternar entre ranking global y ranking del último evento del usuario
- En modo mock, usar los datos hardcodeados de `getGlobalLeaderboard()`

---

## Restricciones de seguridad — obligatorias

1. **Todo el cálculo de XP ocurre en el servidor.** Ningún endpoint acepta un parámetro `xp` o `bonus` del cliente.

2. **`$inc` atómico para xp_total.** Nunca leer el xp_total, sumarle en Python y escribir de vuelta. Usar siempre `users().update_one({"_id": uid}, {"$inc": {"xp_total": amount}})`.

3. **El índice único en `(user_id, achievement_id)` es la barrera contra duplicados de logros**, no la lógica Python. Capturar `DuplicateKeyError` silenciosamente — significa que el logro ya fue otorgado por otra request concurrente.

4. **El índice único en `(user_id, badge_id)` de `scans` ya existe** — no duplicar badges.

5. **Validar rangos en admin.** `xp_value` entre 1 y 500. `xp_completion_bonus` entre 0 y 1000. Rechazar con 400 si están fuera de rango.

6. **El `xp_log` es append-only.** Ningún endpoint permite modificar o eliminar entradas del log. Si en el futuro se detecta XP incorrecto, la corrección se hace con una entrada nueva de tipo "correction", nunca editando entradas existentes.

7. **Los endpoints `/profile/*` requieren JWT.** Un usuario solo puede consultar su propio XP — nunca el de otro.

---

## Qué NO hacer

- No recalcular el XP histórico de scans anteriores al activar el sistema — el XP empieza desde cero para todos cuando se despliega
- No almacenar el nivel en la base de datos — siempre computarlo desde xp_total
- No exponer el `xp_log` completo al cliente — es solo para auditoría interna
- No modificar la lógica de geolocalización ni IP guard — ya funciona y no es parte de este feature
- No cambiar el schema de `scans` — el índice único existente es correcto

---

## Orden de implementación

1. `db.py` — agregar funciones de acceso a las 3 colecciones nuevas + índices
2. `seed_achievements.py` — seed idempotente de los 9 logros
3. `services/xp.py` — lógica de XP con `compute_level` y `award_xp`
4. `services/achievements.py` — evaluación y desbloqueo de logros
5. `routes/xp.py` — endpoints `/profile/xp` y `/profile/achievements`
6. `routes/events.py` — extender leaderboard de evento + nuevo leaderboard global
7. `app.py` — registrar el nuevo blueprint de xp
8. `routes/redeem.py` — integrar las llamadas a los dos servicios, extender respuesta
9. `routes/admin.py` — aceptar y validar los nuevos campos XP en badges y eventos
10. `seed.js` — actualizar con los nuevos campos
11. `js/api.js` — agregar las 4 funciones nuevas con mock
12. `js/app.js` — UI de perfil, toast de XP, modal de logro, leaderboard extendido, vista global
