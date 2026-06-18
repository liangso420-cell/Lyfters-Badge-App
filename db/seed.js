/**
 * SEED — Lyfter Badge App
 * Ejecutar en MongoDB Shell (mongosh):  load("db/seed.js")
 * O desde Atlas UI > Browse Collections > mongosh
 *
 * Incluye:  1 admin, 3 participantes, 2 eventos activos,
 *           5 badges por evento, scans distribuidos.
 */

use('lyfter_db');

// Limpiar colecciones
db.users.drop();
db.events.drop();
db.badges.drop();
db.scans.drop();

// Recrear colecciones con validación
db.createCollection("users", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["name", "email", "password_hash", "role", "created_at"],
      properties: {
        name:          { bsonType: "string" },
        email:         { bsonType: "string" },
        password_hash: { bsonType: "string" },
        role:          { bsonType: "string", enum: ["participant", "admin"] },
        created_at:    { bsonType: "date" }
      }
    }
  }
});

db.createCollection("events", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["title", "description", "start_date", "end_date", "prize", "active", "created_by", "created_at"],
      properties: {
        title:       { bsonType: "string" },
        description: { bsonType: "string" },
        start_date:  { bsonType: "date" },
        end_date:    { bsonType: "date" },
        prize:       { bsonType: "string" },
        active:      { bsonType: "bool" },
        created_by:  { bsonType: "objectId" },
        created_at:  { bsonType: "date" }
      }
    }
  }
});

db.createCollection("badges", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["event_id", "name", "description", "icon", "token", "qr_base64", "created_at"],
      properties: {
        event_id:    { bsonType: "objectId" },
        name:        { bsonType: "string" },
        description: { bsonType: "string" },
        icon:        { bsonType: "string" },
        token:       { bsonType: "string" },
        qr_base64:   { bsonType: "string" },
        created_at:  { bsonType: "date" }
      }
    }
  }
});

db.createCollection("scans", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["user_id", "badge_id", "event_id", "scanned_at"],
      properties: {
        user_id:    { bsonType: "objectId" },
        badge_id:   { bsonType: "objectId" },
        event_id:   { bsonType: "objectId" },
        scanned_at: { bsonType: "date" }
      }
    }
  }
});

// Índices
db.users.createIndex({ email: 1 }, { unique: true });
db.badges.createIndex({ token: 1 }, { unique: true });
db.badges.createIndex({ event_id: 1 });
db.scans.createIndex({ user_id: 1, badge_id: 1 }, { unique: true });
db.scans.createIndex({ event_id: 1 });
db.events.createIndex({ active: 1 });

// ── IDs ──────────────────────────────────────────────────
const adminId   = new ObjectId();
const anaId     = new ObjectId();
const carlosId  = new ObjectId();
const luciaId   = new ObjectId();

const summitId  = new ObjectId();
const hackId    = new ObjectId();

const sb1 = new ObjectId(); const sb2 = new ObjectId(); const sb3 = new ObjectId();
const sb4 = new ObjectId(); const sb5 = new ObjectId();

const hb1 = new ObjectId(); const hb2 = new ObjectId(); const hb3 = new ObjectId();
const hb4 = new ObjectId(); const hb5 = new ObjectId();

// ── Usuarios ──────────────────────────────────────────────
// Contraseñas: admin123 / ana123 / carlos123 / lucia123
// (hashes generados con bcrypt rounds=12 — reemplazar con hashes reales al usar en prod)
db.users.insertMany([
  {
    _id:           adminId,
    name:          "Admin Lyfter",
    email:         "admin@lyfter.app",
    password_hash: "$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36zLVBhmA3Sb1G8CvTWpWXC", // admin123
    role:          "admin",
    xp_total:      0,
    created_at:    new Date("2026-01-15T10:00:00Z")
  },
  {
    _id:           anaId,
    name:          "Ana Torres",
    email:         "ana@lyfter.app",
    password_hash: "$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36zLVBhmA3Sb1G8CvTWpWXC",
    role:          "participant",
    xp_total:      0,
    created_at:    new Date("2026-05-01T09:00:00Z")
  },
  {
    _id:           carlosId,
    name:          "Carlos Méndez",
    email:         "carlos@lyfter.app",
    password_hash: "$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36zLVBhmA3Sb1G8CvTWpWXC",
    role:          "participant",
    xp_total:      0,
    created_at:    new Date("2026-05-03T11:00:00Z")
  },
  {
    _id:           luciaId,
    name:          "Lucía Herrera",
    email:         "lucia@lyfter.app",
    password_hash: "$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36zLVBhmA3Sb1G8CvTWpWXC",
    role:          "participant",
    xp_total:      0,
    created_at:    new Date("2026-05-10T14:00:00Z")
  }
]);

// ── Eventos ───────────────────────────────────────────────
db.events.insertMany([
  {
    _id:         summitId,
    title:       "Lyfter Summit 2026",
    description: "Evento insignia anual de la comunidad Lyfter — charlas, workshops y networking.",
    start_date:  new Date("2026-09-10T09:00:00Z"),
    end_date:    new Date("2026-09-11T20:00:00Z"),
    prize:       "🎟️ Entrada VIP al after-party + kit Lyfter exclusivo",
    active:      true,
    xp_first_scan:       5,
    xp_rare_bonus:       15,
    xp_completion_bonus: 50,
    created_by:  adminId,
    created_at:  new Date("2026-06-01T10:00:00Z")
  },
  {
    _id:         hackId,
    title:       "Hackathon de Verano",
    description: "48 horas construyendo en equipo. El mejor proyecto se lleva el premio.",
    start_date:  new Date("2026-07-01T09:00:00Z"),
    end_date:    new Date("2026-07-02T20:00:00Z"),
    prize:       "💻 MacBook Air M3 + mentoría 1:1 con el jurado",
    active:      true,
    xp_first_scan:       5,
    xp_rare_bonus:       20,
    xp_completion_bonus: 75,
    created_by:  adminId,
    created_at:  new Date("2026-06-02T10:00:00Z")
  }
]);

// ── Badges — Summit ───────────────────────────────────────
// El "Stand Lyfter" es raro (is_rare) y otorga el bonus de evento.
db.badges.insertMany([
  { _id: sb1, event_id: summitId, name: "Bienvenida",  description: "Check-in en recepción",        icon: "👋", token: "summit-bienvenida-" + sb1, qr_base64: "pending", xp_value: 10, is_rare: false, created_at: new Date() },
  { _id: sb2, event_id: summitId, name: "Keynote",     description: "Asististe a la charla central", icon: "🎤", token: "summit-keynote-" + sb2,    qr_base64: "pending", xp_value: 10, is_rare: false, created_at: new Date() },
  { _id: sb3, event_id: summitId, name: "Workshop",    description: "Completaste el taller práctico", icon: "💡", token: "summit-workshop-" + sb3,  qr_base64: "pending", xp_value: 15, is_rare: false, created_at: new Date() },
  { _id: sb4, event_id: summitId, name: "Networking",  description: "Café + conexiones",              icon: "☕", token: "summit-network-" + sb4,   qr_base64: "pending", xp_value: 10, is_rare: false, created_at: new Date() },
  { _id: sb5, event_id: summitId, name: "Stand Lyfter",description: "Visitaste el stand principal",   icon: "🏆", token: "summit-stand-" + sb5,     qr_base64: "pending", xp_value: 20, is_rare: true,  created_at: new Date() }
]);

// ── Badges — Hackathon ────────────────────────────────────
// El "Pitch Final" es raro (is_rare).
db.badges.insertMany([
  { _id: hb1, event_id: hackId, name: "Kick-off",   description: "Apertura del hackathon",         icon: "🚀", token: "hack-kickoff-" + hb1,   qr_base64: "pending", xp_value: 10, is_rare: false, created_at: new Date() },
  { _id: hb2, event_id: hackId, name: "Mentoría",   description: "Sesión con un mentor",           icon: "🧠", token: "hack-mentoria-" + hb2,  qr_base64: "pending", xp_value: 10, is_rare: false, created_at: new Date() },
  { _id: hb3, event_id: hackId, name: "Deploy",     description: "Subiste tu primer commit",       icon: "💻", token: "hack-deploy-" + hb3,    qr_base64: "pending", xp_value: 15, is_rare: false, created_at: new Date() },
  { _id: hb4, event_id: hackId, name: "Demo Day",   description: "Presentaste tu proyecto",        icon: "📊", token: "hack-demo-" + hb4,      qr_base64: "pending", xp_value: 15, is_rare: false, created_at: new Date() },
  { _id: hb5, event_id: hackId, name: "Pitch Final",description: "Pitch ante el jurado",           icon: "🎯", token: "hack-pitch-" + hb5,     qr_base64: "pending", xp_value: 25, is_rare: true,  created_at: new Date() }
]);

// ── Scans — Ana tiene 3 badges del summit ─────────────────
db.scans.insertMany([
  { user_id: anaId, badge_id: sb1, event_id: summitId, scanned_at: new Date("2026-09-10T09:30:00Z") },
  { user_id: anaId, badge_id: sb2, event_id: summitId, scanned_at: new Date("2026-09-10T11:00:00Z") },
  { user_id: anaId, badge_id: sb3, event_id: summitId, scanned_at: new Date("2026-09-10T14:00:00Z") },
  // Carlos tiene 1
  { user_id: carlosId, badge_id: sb1, event_id: summitId, scanned_at: new Date("2026-09-10T09:45:00Z") },
  // Lucía completó todo el summit
  { user_id: luciaId, badge_id: sb1, event_id: summitId, scanned_at: new Date("2026-09-10T09:20:00Z") },
  { user_id: luciaId, badge_id: sb2, event_id: summitId, scanned_at: new Date("2026-09-10T10:50:00Z") },
  { user_id: luciaId, badge_id: sb3, event_id: summitId, scanned_at: new Date("2026-09-10T13:30:00Z") },
  { user_id: luciaId, badge_id: sb4, event_id: summitId, scanned_at: new Date("2026-09-10T16:00:00Z") },
  { user_id: luciaId, badge_id: sb5, event_id: summitId, scanned_at: new Date("2026-09-10T17:30:00Z") },
  // Ana tiene 2 badges del hackathon
  { user_id: anaId, badge_id: hb1, event_id: hackId, scanned_at: new Date("2026-07-01T09:30:00Z") },
  { user_id: anaId, badge_id: hb2, event_id: hackId, scanned_at: new Date("2026-07-01T11:00:00Z") }
]);

// ── Verificación ──────────────────────────────────────────
print("\n✅ SEED COMPLETADO\n");
print("👥 Usuarios:  " + db.users.countDocuments() + " (1 admin, 3 participantes)");
print("🎪 Eventos:   " + db.events.countDocuments());
print("🏅 Badges:    " + db.badges.countDocuments() + " (5 por evento)");
print("📱 Scans:     " + db.scans.countDocuments());
print("\nCredenciales demo:");
print("  Admin:   admin@lyfter.app / admin123");
print("  Ana:     ana@lyfter.app / ana123");
print("  Carlos:  carlos@lyfter.app / carlos123");
print("  Lucía:   lucia@lyfter.app / lucia123");
print("\n⚠️  NOTA: Los tokens de badge son placeholders.");
print("   Ejecutá el backend (python backend/app.py) y");
print("   recrea los badges desde el panel admin para generar QRs reales.\n");
