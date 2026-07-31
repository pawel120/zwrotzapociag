const { neon } = require("@neondatabase/serverless");

async function ensureTable(sql) {
  await sql`
    CREATE TABLE IF NOT EXISTS events (
      id SERIAL PRIMARY KEY,
      event TEXT NOT NULL,
      path TEXT,
      client_time BIGINT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  if (Buffer.isBuffer(body)) {
    try { body = JSON.parse(body.toString("utf8")); } catch { body = {}; }
  }
  body = body || {};

  const event = typeof body.event === "string" ? body.event.trim().slice(0, 100) : "";
  const path = typeof body.path === "string" ? body.path.slice(0, 300) : null;
  const clientTime = Number.isFinite(body.t) ? body.t : null;

  if (!event) { res.status(400).json({ error: "missing_event" }); return; }

  if (!process.env.DATABASE_URL) {
    res.status(500).json({ error: "database_not_configured" });
    return;
  }

  try {
    const sql = neon(process.env.DATABASE_URL);
    await ensureTable(sql);
    await sql`
      INSERT INTO events (event, path, client_time)
      VALUES (${event}, ${path}, ${clientTime})
    `;
    res.status(200).json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "server_error" });
  }
};
