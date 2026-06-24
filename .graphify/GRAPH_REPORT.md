# Graph Report - .  (2026-06-23)

## Corpus Check
- 100 files · ~103,334 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 664 nodes · 1085 edges · 49 communities detected
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 50 edges (avg confidence: 0.73)
- Token cost: 0 input · 0 output
- Edge kinds: contains: 522 · calls: 417 · references: 48 · rationale_for: 40 · conceptually_related_to: 30 · imports_from: 18 · semantically_similar_to: 8 · implements: 1 · shares_data_with: 1

## God Nodes (most connected - your core abstractions)
1. `js/api.js` - 79 edges
2. `apiRequest()` - 44 edges
3. `js/utils.js` - 34 edges
4. `persist()` - 26 edges
5. `getSession()` - 18 edges
6. `mockEvent()` - 16 edges
7. `t()` - 15 edges
8. `createNS()` - 15 edges
9. `get_db()` - 13 edges
10. `n()` - 13 edges

## Surprising Connections (you probably didn't know these)
- `Calendar Icon` --semantically_similar_to--> `Search Magnifier Icon`  [INFERRED] [semantically similar]
  calendario.png → assets/icons/ui/lupa.png
- `Search Magnifier Icon` --semantically_similar_to--> `Upload File Icon`  [INFERRED] [semantically similar]
  assets/icons/ui/lupa.png → subir-archivo.png
- `Scan QR` --semantically_similar_to--> `Redeem Badge`  [INFERRED] [semantically similar]
  scan.html → redeem.html
- `User Ranking` --semantically_similar_to--> `Leaderboard (Ranking)`  [INFERRED] [semantically similar]
  user-ranking.html → leaderboard.html
- `Workspace Admin Panel` --semantically_similar_to--> `Workspace Select Page`  [INFERRED] [semantically similar]
  workspace.html → login.html

## Communities

### Community 1 - "Frontend API & Admin Logic"
Cohesion: 0.09
Nodes (65): js/api.js, addBadge(), apiRequest(), changePassword(), changeUserRole(), clearSession(), computeLevel(), computeMockStatus() (+57 more)

### Community 2 - "Authentication Backend"
Cohesion: 0.06
Nodes (23): check_rate_limit(), clear_attempts(), google_login(), login(), Construye los additional_claims JWT con info de workspace., Recibe un idToken de Firebase/Google desde el frontend.     Verifica el token c, record_failed_attempt(), register() (+15 more)

### Community 3 - "Frontend UI Utilities"
Cohesion: 0.10
Nodes (23): js/utils.js, achievementsGridHtml(), adminShell(), closeModal(), downloadQr(), ensureActive(), errorHtml(), esc() (+15 more)

### Community 4 - "Backend App & Events Routes"
Cohesion: 0.08
Nodes (13): _get_ws_id_optional(), list_events(), Devuelve workspace_id del JWT como ObjectId si hay sesión activa, sino None., award_xp(), compute_level(), grant_xp(), level_name(), level_progress() (+5 more)

### Community 5 - "Lottie Math & Prototypes"
Cohesion: 0.15
Nodes (30): a(), addPropertyDecorator(), bezFunction(), c(), d(), e(), extendPrototype(), f() (+22 more)

### Community 6 - "Admin API Routes"
Cohesion: 0.11
Nodes (21): admin_dashboard(), admin_list_badges(), admin_list_events(), admin_list_users(), create_badge(), create_event(), delete_badge(), delete_event() (+13 more)

### Community 7 - "App HTML Pages"
Cohesion: 0.09
Nodes (20): admin-event.html, index.html (Entry/Login), js/config.js, Landing Page, Leaderboard (Ranking), Login Page, js/particles.js, Profile Page (+12 more)

### Community 8 - "Workspace Management Backend"
Cohesion: 0.10
Nodes (11): create_workspace(), get_my_workspace(), get_my_workspaces_all(), get_workspace(), invite_member(), list_members(), list_workspaces(), _member_to_dict() (+3 more)

### Community 9 - "Database Layer"
Cohesion: 0.16
Nodes (22): achievements(), badges(), event_joins(), events(), get_db(), init_indexes(), invitations(), Retorna la instancia de la base de datos lyfter_db.     Reutiliza la conexión s (+14 more)

### Community 10 - "Lottie Geometry Math"
Cohesion: 0.12
Nodes (19): crossProduct(), floatEqual(), floatZero(), getIntersection(), joinLines(), lerp(), lerpPoint(), linearOffset() (+11 more)

### Community 11 - "Database Seed Data"
Cohesion: 0.12
Nodes (16): adminId, anaId, carlosId, hackId, hb1, hb2, hb3, hb4 (+8 more)

### Community 12 - "Database Layer (dup)"
Cohesion: 0.32
Nodes (14): achievements(), badges(), event_joins(), events(), get_db(), init_indexes(), invitations(), Retorna la instancia de la base de datos lyfter_db.     Reutiliza la conexión s (+6 more)

### Community 13 - "Lottie Vector Math"
Cohesion: 0.21
Nodes (15): $bm_isInstanceOfArray(), $bm_neg(), div(), getPerpendicularVector(), getProjectingAngle(), isNumerable(), length(), mul() (+7 more)

### Community 14 - "IP Guard Security"
Cohesion: 0.19
Nodes (13): bind_ip_to_user(), check_login_ip(), check_register_ip(), get_client_ip(), ip_guard_login(), ip_guard_register(), _is_dev(), Ancla la IP actual a la cuenta indicada (llamar tras crear el usuario). (+5 more)

### Community 15 - "Lottie SVG Renderer"
Cohesion: 0.15
Nodes (13): createNS(), HShapeElement(), MaskElement(), ShapeGroupData(), SVGDropShadowEffect(), SVGFillFilter(), SVGGaussianBlurEffect(), SVGMatte3Effect() (+5 more)

### Community 16 - "Workspace Utilities"
Cohesion: 0.17
Nodes (11): generate_invite_code(), get_user_workspace(), Utilidades para el sistema de workspaces., Devuelve (workspace_id, role) del usuario en su workspace., Decorator: requiere que el usuario tenga uno de los roles en su workspace., Genera un código de invitación alfanumérico., Convierte un nombre a slug URL-safe., Construye un filtro MongoDB con workspace_id. (+3 more)

### Community 17 - "Backend Utilities & QR"
Cohesion: 0.20
Nodes (2): compute_event_status(), fmt_event()

### Community 18 - "Lottie Shape Elements"
Cohesion: 0.18
Nodes (11): createSizedArray(), CVCompElement(), CVMaskElement(), DashProperty(), HCompElement(), ShapeCollection(), ShapePath(), SVGCompElement() (+3 more)

### Community 19 - "Achievement Badge Icons"
Cohesion: 0.25
Nodes (9): Coleccionista, Completista, Leyenda, Ojo de Halcon, Perfeccionista, Primer Paso, Vertigo, Veterano (+1 more)

### Community 20 - "Stars Background Animation"
Cohesion: 0.38
Nodes (4): draw(), mkStar(), seed(), spawnShoot()

### Community 21 - "Tech Skill Badge Icons"
Cohesion: 0.40
Nodes (6): API, Codificacion, Computacion en la Nube, Error, JavaScript, Proteccion de Archivos

### Community 22 - "Particles Background Animation"
Cohesion: 0.40
Nodes (2): mkOrb(), seedOrbs()

### Community 23 - "Project Documentation"
Cohesion: 0.40
Nodes (5): Product Requirements (PRD), Technical Design, Tasks, Implementation Summary, Lyfters Badge App

### Community 24 - "Brand & Misc UI Icons"
Cohesion: 0.50
Nodes (5): Calendar Icon, Trash / Delete Icon, Lyfter Brand Logo, Search Magnifier Icon, Upload File Icon

### Community 25 - "Navigation UI Icons"
Cohesion: 0.40
Nodes (5): Calendar Icon (White), Event Icon, Participants Icon, Profile Icon, Users Icon

### Community 26 - "Lottie Color Conversion"
Cohesion: 0.60
Nodes (5): addBrightnessToRGB(), addHueToRGB(), addSaturationToRGB(), HSVtoRGB(), RGBtoHSV()

### Community 27 - "Lottie Canvas & Expressions"
Cohesion: 0.40
Nodes (5): CanvasContext(), CanvasRenderer(), CVContextData(), initiateExpression(), random()

### Community 28 - "Lottie Interpolation"
Cohesion: 0.40
Nodes (5): createQuaternion(), getValueAtCurrentTime(), interpolateValue(), quaternionToEuler(), slerp()

### Community 29 - "Web/Design Badge Icons"
Cohesion: 0.67
Nodes (4): Diseno, Mundial, Sitio Web, Vinculo de Retroceso

### Community 30 - "Action UI Icons"
Cohesion: 0.50
Nodes (4): Add Image Icon, Trash Icon (White), Download Icon, Edit Icon

### Community 31 - "Lottie Intersection Geometry"
Cohesion: 0.50
Nodes (4): boxIntersect(), intersectData(), intersectsImpl(), splitData()

### Community 32 - "Security Init Layer"
Cohesion: 0.50
Nodes (2): init_security(), Activa la capa de seguridad sobre la app Flask:         1. ProxyFix (x_for=1) p

### Community 33 - "Achievement Seeding Script"
Cohesion: 0.67
Nodes (1): seed_achievements.py — siembra (idempotente) las definiciones de logros.  Ejec

### Community 34 - "Badge Status Icons"
Cohesion: 0.67
Nodes (3): Created Badges Icon, Lock Icon, Claimed Icon

### Community 35 - "Lottie Effects Init"
Cohesion: 0.67
Nodes (3): addDecorator(), addEffect(), initialize()

### Community 36 - "Proxy Middleware"
Cohesion: 0.67
Nodes (2): apply_proxy_fix(), Hace que Flask confíe en UN solo proxy reverso (x_for=1).      En producción l

### Community 37 - "Membership Cleanup Script"
Cohesion: 1.00
Nodes (1): One-time script: remove prueba@gmail.com from the Lyfter workspace. Run with: p

### Community 38 - "Workspace Migration Script"
Cohesion: 1.00
Nodes (1): Migración: crea el workspace de Lyfter y asigna todos los datos existentes a él.

### Community 39 - "About & Translation Icons"
Cohesion: 1.00
Nodes (2): About Icon, Translation Icon

### Community 40 - "Lottie Animation Loader"
Cohesion: 1.00
Nodes (2): checkReady(), searchAnimations()

### Community 41 - "Lottie DOM Helpers"
Cohesion: 1.00
Nodes (2): createCanvas(), createTag()

### Community 42 - "Lottie Canvas Shapes"
Cohesion: 1.00
Nodes (2): CVShapeElement(), ShapeTransformManager()

### Community 43 - "Lottie Effects Manager"
Cohesion: 1.00
Nodes (2): EffectsManager(), GroupEffect()

### Community 44 - "Lottie Polynomial Math"
Cohesion: 1.00
Nodes (2): extrema(), quadRoots()

### Community 45 - "Lottie HSL Color"
Cohesion: 1.00
Nodes (2): hslToRgb(), hue2rgb()

### Community 46 - "Lottie Quality Settings"
Cohesion: 1.00
Nodes (2): roundValues(), setQuality()

### Community 47 - "Lottie Slot Manager"
Cohesion: 1.00
Nodes (2): slotFactory(), SlotManager()

### Community 48 - "Legal Pages"
Cohesion: 1.00
Nodes (2): Privacy Policy, Terms and Conditions

### Community 49 - "Add Image Asset"
Cohesion: 1.00
Nodes (1): Anadir Imagen

## Knowledge Gaps
- **81 isolated node(s):** `One-time script: remove prueba@gmail.com from the Lyfter workspace. Run with: p`, `Retorna la instancia de la base de datos lyfter_db.     Reutiliza la conexión s`, `Migración: crea el workspace de Lyfter y asigna todos los datos existentes a él.`, `Devuelve el workspace_id del JWT como ObjectId, o None si no hay workspace selec`, `Verifica que el evento pertenece al workspace del admin actual.` (+76 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Backend Utilities & QR`** (2 nodes): `compute_event_status()`, `fmt_event()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Particles Background Animation`** (2 nodes): `mkOrb()`, `seedOrbs()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Security Init Layer`** (2 nodes): `init_security()`, `Activa la capa de seguridad sobre la app Flask:         1. ProxyFix (x_for=1) p`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Achievement Seeding Script`** (1 nodes): `seed_achievements.py — siembra (idempotente) las definiciones de logros.  Ejec`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Proxy Middleware`** (2 nodes): `apply_proxy_fix()`, `Hace que Flask confíe en UN solo proxy reverso (x_for=1).      En producción l`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Membership Cleanup Script`** (1 nodes): `One-time script: remove prueba@gmail.com from the Lyfter workspace. Run with: p`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Workspace Migration Script`** (1 nodes): `Migración: crea el workspace de Lyfter y asigna todos los datos existentes a él.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `About & Translation Icons`** (2 nodes): `About Icon`, `Translation Icon`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Lottie Animation Loader`** (2 nodes): `checkReady()`, `searchAnimations()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Lottie DOM Helpers`** (2 nodes): `createCanvas()`, `createTag()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Lottie Canvas Shapes`** (2 nodes): `CVShapeElement()`, `ShapeTransformManager()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Lottie Effects Manager`** (2 nodes): `EffectsManager()`, `GroupEffect()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Lottie Polynomial Math`** (2 nodes): `extrema()`, `quadRoots()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Lottie HSL Color`** (2 nodes): `hslToRgb()`, `hue2rgb()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Lottie Quality Settings`** (2 nodes): `roundValues()`, `setQuality()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Lottie Slot Manager`** (2 nodes): `slotFactory()`, `SlotManager()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Legal Pages`** (2 nodes): `Privacy Policy`, `Terms and Conditions`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Add Image Asset`** (1 nodes): `Anadir Imagen`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Login Page` connect `App HTML Pages` to `Frontend API & Admin Logic`, `Frontend UI Utilities`?**
  _High betweenness centrality (0.062) - this node is a cross-community bridge._
- **Why does `js/api.js` connect `Frontend API & Admin Logic` to `App HTML Pages`?**
  _High betweenness centrality (0.052) - this node is a cross-community bridge._
- **What connects `One-time script: remove prueba@gmail.com from the Lyfter workspace. Run with: p`, `Retorna la instancia de la base de datos lyfter_db.     Reutiliza la conexión s`, `Migración: crea el workspace de Lyfter y asigna todos los datos existentes a él.` to the rest of the system?**
  _81 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Lottie Animation Engine` be split into smaller, more focused modules?**
  _Cohesion score 0.017857142857142856 - nodes in this community are weakly interconnected._
- **Should `Frontend API & Admin Logic` be split into smaller, more focused modules?**
  _Cohesion score 0.08867427568042142 - nodes in this community are weakly interconnected._
- **Should `Authentication Backend` be split into smaller, more focused modules?**
  _Cohesion score 0.06258890469416785 - nodes in this community are weakly interconnected._
- **Should `Frontend UI Utilities` be split into smaller, more focused modules?**
  _Cohesion score 0.10227272727272728 - nodes in this community are weakly interconnected._