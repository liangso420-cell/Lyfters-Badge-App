/**
 * MODELO DE DATOS — Lyfter Badge App
 *
 * Colecciones: users, events, badges, scans
 *
 * Relaciones:
 * - users → events     (1:N, referencia) un admin crea muchos eventos
 * - events → badges    (1:N, referencia) un evento tiene muchos badges
 * - users ↔ badges     (N:M, doc. intermedio: scans)
 *
 * Decisiones de diseño:
 * - scans es colección separada porque puede crecer indefinidamente,
 *   tiene datos propios (scanned_at) y se consulta desde ambos lados.
 * - badges es colección separada porque cada badge se busca por su
 *   token único en el flujo de redención GET /redeem/<event_id>/<token>
 */

// 1. Seleccionar base de datos
use('lyfter_db');

// 2. Limpiar colecciones si ya existen (para poder re-ejecutar el seed)
db.users.drop();
db.events.drop();
db.badges.drop();
db.scans.drop();

// 3. Crear colecciones con validación de esquema
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

// 4. Crear índices
db.users.createIndex({ email: 1 }, { unique: true });
db.badges.createIndex({ token: 1 }, { unique: true });
db.badges.createIndex({ event_id: 1 });
db.scans.createIndex({ user_id: 1, badge_id: 1 }, { unique: true }); // previene duplicados
db.scans.createIndex({ event_id: 1 });
db.events.createIndex({ active: 1 });

// 5. Insertar datos de prueba con IDs pre-definidos para mantener referencias

const adminId  = new ObjectId();
const anaId    = new ObjectId();
const carlosId = new ObjectId();
const eventId  = new ObjectId();
const badge1Id = new ObjectId();
const badge2Id = new ObjectId();
const badge3Id = new ObjectId();

// Usuarios
db.users.insertMany([
  {
    _id:           adminId,
    name:          "Admin Lyfter",
    email:         "admin@lyfter.app",
    password_hash: "$2b$12$placeholder_admin_hash",
    role:          "admin",
    created_at:    new Date()
  },
  {
    _id:           anaId,
    name:          "Ana Torres",
    email:         "ana@lyfter.app",
    password_hash: "$2b$12$placeholder_user_hash",
    role:          "participant",
    created_at:    new Date()
  },
  {
    _id:           carlosId,
    name:          "Carlos Méndez",
    email:         "carlos@lyfter.app",
    password_hash: "$2b$12$placeholder_user_hash",
    role:          "participant",
    created_at:    new Date()
  }
]);

// Evento
db.events.insertOne({
  _id:         eventId,
  title:       "JavaScript Workshop",
  description: "Taller intensivo de JS moderno para desarrolladores",
  start_date:  new Date(),
  end_date:    new Date(Date.now() + 86400000),
  prize:       "Kit developer Lyfter: hoodie + stickers + acceso premium 3 meses",
  active:      true,
  created_by:  adminId,
  created_at:  new Date()
});

// Badges
db.badges.insertMany([
  {
    _id:         badge1Id,
    event_id:    eventId,
    name:        "Bienvenido",
    description: "Completaste el registro y llegaste al evento",
    icon:        "👋",
    token:       "token-bienvenido-" + badge1Id.toString(),
    qr_base64:   "placeholder_qr_generado_por_python",
    created_at:  new Date()
  },
  {
    _id:         badge2Id,
    event_id:    eventId,
    name:        "Primer Commit",
    description: "Hiciste tu primer commit del workshop",
    icon:        "💻",
    token:       "token-primer-commit-" + badge2Id.toString(),
    qr_base64:   "placeholder_qr_generado_por_python",
    created_at:  new Date()
  },
  {
    _id:         badge3Id,
    event_id:    eventId,
    name:        "Bug Hunter",
    description: "Encontraste y corregiste un bug en el código",
    icon:        "🐛",
    token:       "token-bug-hunter-" + badge3Id.toString(),
    qr_base64:   "placeholder_qr_generado_por_python",
    created_at:  new Date()
  }
]);

// Scans de prueba (Ana tiene 2 badges, Carlos tiene 1)
db.scans.insertMany([
  {
    user_id:    anaId,
    badge_id:   badge1Id,
    event_id:   eventId,
    scanned_at: new Date()
  },
  {
    user_id:    anaId,
    badge_id:   badge2Id,
    event_id:   eventId,
    scanned_at: new Date()
  },
  {
    user_id:    carlosId,
    badge_id:   badge1Id,
    event_id:   eventId,
    scanned_at: new Date()
  }
]);

// 6. Verificaciones automáticas al final
print("\n✅ BASE DE DATOS CREADA\n");
print("👥 Usuarios insertados:  " + db.users.countDocuments());
print("🎪 Eventos insertados:   " + db.events.countDocuments());
print("🏅 Badges insertados:    " + db.badges.countDocuments());
print("📱 Scans insertados:     " + db.scans.countDocuments());

const totalBadges = db.badges.countDocuments({ event_id: eventId });
const anaScans    = db.scans.countDocuments({ user_id: anaId, event_id: eventId });
print("\n🔍 Ana tiene " + anaScans + " de " + totalBadges + " badges del evento");
print("🔍 Índice anti-duplicado en scans: OK (unique: user_id + badge_id)");
print("\n🚀 Listo para conectar con Flask. Ejecuta: python backend/app.py\n");
