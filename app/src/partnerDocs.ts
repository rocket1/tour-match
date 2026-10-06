// Copy shown in the tour-company toolkit. The request/response examples themselves are
// fetched live from GET /partners/spec so they never drift from the server.

export const NODE_SAMPLE = `import crypto from "node:crypto";
import express from "express";

const SECRET = process.env.TOURMATCH_SECRET;
const app = express();

// Keep the raw body: the signature covers the exact bytes we sent.
app.post("/tourmatch/search", express.text({ type: "application/json" }), (req, res) => {
  const ts = req.get("X-TourMatch-Timestamp") ?? "";
  const sig = req.get("X-TourMatch-Signature") ?? "";
  const expected = "sha256=" +
    crypto.createHmac("sha256", SECRET).update(\`\${ts}.\${req.body}\`).digest("hex");

  const fresh = Math.abs(Date.now() / 1000 - Number(ts)) < 300;
  const valid = sig.length === expected.length &&
    crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  if (!fresh || !valid) return res.sendStatus(401);

  const { intent, limit } = JSON.parse(req.body);
  const tours = findTours(intent).slice(0, limit); // <- your inventory / booking API

  res.json({
    tours: tours.map((t) => ({
      id: t.sku,
      title: t.name,
      description: t.summary,
      bookingUrl: \`https://yourdomain.com/book/\${t.sku}?utm_source=tourmatch\`,
      priceFrom: t.price,
      currency: t.currency,
      durationMinutes: t.minutes,
      isPrivate: t.private,
      city: t.city,
      licensedGuide: t.guideLicensed,
      languages: t.languages,
    })),
  });
});

app.listen(8790);`;

export const PYTHON_SAMPLE = `import hashlib, hmac, json, os, time
from flask import Flask, abort, jsonify, request

SECRET = os.environ["TOURMATCH_SECRET"].encode()
app = Flask(__name__)

@app.post("/tourmatch/search")
def search():
    ts = request.headers.get("X-TourMatch-Timestamp", "")
    sig = request.headers.get("X-TourMatch-Signature", "")
    body = request.get_data()  # raw bytes, before JSON parsing
    expected = "sha256=" + hmac.new(SECRET, ts.encode() + b"." + body, hashlib.sha256).hexdigest()

    if not ts.isdigit() or abs(time.time() - int(ts)) > 300:
        abort(401)
    if not hmac.compare_digest(expected, sig):
        abort(401)

    req = json.loads(body)
    tours = find_tours(req["intent"])[: req["limit"]]  # <- your inventory / booking API
    return jsonify({"tours": [
        {
            "id": t.sku,
            "title": t.name,
            "description": t.summary,
            "bookingUrl": f"https://yourdomain.com/book/{t.sku}?utm_source=tourmatch",
            "priceFrom": t.price,
            "currency": t.currency,
            "durationMinutes": t.minutes,
            "isPrivate": t.private,
            "city": t.city,
            "licensedGuide": t.guide_licensed,
            "languages": t.languages,
        }
        for t in tours
    ]})`;

export const CURL_SAMPLE = `# Reproduce a signed request against your own endpoint
SECRET=tmsk_your_secret
BODY='{"version":"2026-09-01","requestId":"req_test","intent":{"destination":"Rome"},"limit":5}'
TS=$(date +%s)
SIG="sha256=$(printf '%s.%s' "$TS" "$BODY" | openssl dgst -sha256 -hmac "$SECRET" -hex | sed 's/^.* //')

curl -X POST https://yourdomain.com/tourmatch/search \\
  -H "Content-Type: application/json" \\
  -H "X-TourMatch-Timestamp: $TS" \\
  -H "X-TourMatch-Signature: $SIG" \\
  -d "$BODY"`;
