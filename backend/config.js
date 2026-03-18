/**
 * GHOST CODE v3.0 — Configuración
 * Cambia adminUser y adminPassword antes de produccion
 */
module.exports = {
  port: process.env.PORT || 3000,
  env:  process.env.NODE_ENV || "development",
  adminUser:     process.env.ADMIN_USER     || "admin",
  adminPassword: process.env.ADMIN_PASSWORD || "Admin@GhostCode2024",
  session: { expiresIn: 3600000, cookieName: "ghost_session" },
  rateLimit: { maxRequests: 200, windowMs: 60000 },
  company: { name: "Ghost Code", email: "contacto@ghostcode.dev", phone: "+1 (555) 000-0000", location: "Remote · Worldwide" }
};
