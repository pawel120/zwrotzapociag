const { neon } = require("@neondatabase/serverless");

const ZAKRES_VALUES = ["diy", "pelna_obsluga"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function ensureTable(sql) {
  await sql`
    CREATE TABLE IF NOT EXISTS leads (
      id SERIAL PRIMARY KEY,
      przewoznik TEXT,
      pociag TEXT NOT NULL,
      podroz_data DATE NOT NULL,
      cena NUMERIC,
      email TEXT NOT NULL,
      zakres TEXT NOT NULL,
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
  body = body || {};

  const przewoznik = typeof body.przewoznik === "string" ? body.przewoznik.slice(0, 200) : "";
  const pociag = typeof body.pociag === "string" ? body.pociag.trim().slice(0, 200) : "";
  const data = typeof body.data === "string" ? body.data.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().slice(0, 200) : "";
  const zakres = typeof body.zakres === "string" ? body.zakres.trim() : "";
  const cenaRaw = body.cena;
  const cena = cenaRaw === null || cenaRaw === undefined || cenaRaw === "" ? null : Number(cenaRaw);

  if (!pociag) { res.status(400).json({ error: "missing_pociag" }); return; }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) { res.status(400).json({ error: "invalid_data" }); return; }
  if (!EMAIL_RE.test(email)) { res.status(400).json({ error: "invalid_email" }); return; }
  if (!ZAKRES_VALUES.includes(zakres)) { res.status(400).json({ error: "invalid_zakres" }); return; }
  if (cena !== null && (isNaN(cena) || cena < 0)) { res.status(400).json({ error: "invalid_cena" }); return; }

  if (!process.env.DATABASE_URL) {
    res.status(500).json({ error: "database_not_configured" });
    return;
  }

  try {
    const sql = neon(process.env.DATABASE_URL);
    await ensureTable(sql);
    await sql`
      INSERT INTO leads (przewoznik, pociag, podroz_data, cena, email, zakres)
      VALUES (${przewoznik}, ${pociag}, ${data}, ${cena}, ${email}, ${zakres})
    `;
    res.status(200).json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "server_error" });
  }
};
