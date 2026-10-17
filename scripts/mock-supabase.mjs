#!/usr/bin/env node
/**
 * Tiny in-memory stand-in for the parts of Supabase this app uses (PostgREST + Storage),
 * so the app can be tried locally without a real project:
 *
 *   node scripts/mock-supabase.mjs            # listens on :54321
 *   SUPABASE_URL=http://localhost:54321 SUPABASE_SERVICE_ROLE_KEY=mock npm run dev
 *
 * Data lives in memory and is lost on restart. Not a real database — only for poking around.
 */
import http from "node:http";
import { randomUUID } from "node:crypto";

const PORT = Number(process.env.MOCK_PORT || 54321);
const tables = {
  items: [],
  outfits: [],
  wears: [],
  tryon_profile: [],
  item_placements: [],
  insights: [],
  trips: [],
};
const defaults = {
  items: () => ({ id: randomUUID(), created_at: new Date().toISOString(), colors: [], seasons: [], style_tags: [], archived: false, subcategory: null, pattern: null, material: null, brand: null, notes: null, original_path: null, width: null, height: null, warmth: 3, formality: 3 }),
  outfits: () => ({ id: randomUUID(), created_at: new Date().toISOString(), name: null, kind: "collage", item_ids: [], layout: {}, occasion: null }),
  wears: () => ({ id: randomUUID(), worn_on: new Date().toISOString().slice(0, 10), outfit_id: null, item_ids: [] }),
  tryon_profile: () => ({ id: 1, photo_path: null, zones: null, updated_at: new Date().toISOString() }),
  item_placements: () => ({ dx: 0, dy: 0, scale: 1, rotation: 0 }),
  insights: () => ({ id: randomUUID(), created_at: new Date().toISOString() }),
  trips: () => ({ id: randomUUID(), created_at: new Date().toISOString(), country: null, activities: [], weather: null, plan: null, packed: [], purpose: "mixed" }),
};
const files = new Map(); // path -> { type, buf }

function multipartFile(buf, ctype) {
  const boundary = "--" + ctype.split("boundary=")[1].split(";")[0].trim();
  const bb = Buffer.from(boundary);
  let pos = buf.indexOf(bb);
  while (pos !== -1) {
    const next = buf.indexOf(bb, pos + bb.length);
    if (next === -1) break;
    const part = buf.subarray(pos + bb.length + 2, next - 2); // skip CRLF after boundary, CRLF before next
    const headerEnd = part.indexOf("\r\n\r\n");
    const headers = part.subarray(0, headerEnd).toString();
    if (/filename=|name=""/.test(headers)) {
      const typeMatch = headers.match(/Content-Type:\s*([^\r\n]+)/i);
      return { type: typeMatch ? typeMatch[1].trim() : "application/octet-stream", buf: Buffer.from(part.subarray(headerEnd + 4)) };
    }
    pos = next;
  }
  return { type: "application/octet-stream", buf };
}

function json(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks)));
  });
}

function applyFilters(rows, params) {
  let out = rows;
  for (const [key, raw] of params) {
    if (["select", "order", "limit", "offset", "on_conflict"].includes(key)) continue;
    const dot = raw.indexOf(".");
    const op = raw.slice(0, dot);
    const val = raw.slice(dot + 1);
    out = out.filter((r) => {
      const v = r[key];
      switch (op) {
        case "eq":
          return String(v) === val;
        case "neq":
          return String(v) !== val;
        case "gte":
          return String(v) >= val;
        case "lte":
          return String(v) <= val;
        case "gt":
          return String(v) > val;
        case "lt":
          return String(v) < val;
        case "is":
          return val === "null" ? v === null || v === undefined : String(v) === val;
        case "in":
          return val.replace(/^\(|\)$/g, "").split(",").map((s) => s.replace(/^"|"$/g, "")).includes(String(v));
        default:
          return true;
      }
    });
  }
  const order = params.get("order");
  if (order) {
    const [col, dir] = order.split(".");
    out = [...out].sort((a, b) => (a[col] < b[col] ? -1 : a[col] > b[col] ? 1 : 0) * (dir === "desc" ? -1 : 1));
  }
  const limit = params.get("limit");
  if (limit) out = out.slice(0, Number(limit));
  return out;
}

function respondRows(req, res, rows, status = 200) {
  const wantsObject = (req.headers.accept || "").includes("vnd.pgrst.object");
  if (wantsObject) {
    if (rows.length !== 1) return json(res, 406, { code: "PGRST116", message: "JSON object requested, multiple (or no) rows returned", details: `${rows.length} rows`, hint: null });
    return json(res, status, rows[0]);
  }
  return json(res, status, rows);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  if (req.method === "OPTIONS") return json(res, 200, {});

  // ---------- storage ----------
  if (url.pathname.startsWith("/storage/v1/object/")) {
    const rest = url.pathname.slice("/storage/v1/object/".length);
    const [bucket, ...pathParts] = rest.split("/");
    const path = decodeURIComponent(pathParts.join("/"));
    if (req.method === "POST" || req.method === "PUT") {
      const buf = await readBody(req);
      const ctype = String(req.headers["content-type"] || "application/octet-stream");
      // supabase-js wraps Blob bodies in multipart/form-data; unwrap the file part.
      const file = ctype.startsWith("multipart/form-data") ? multipartFile(buf, ctype) : { type: ctype, buf };
      files.set(path, file);
      return json(res, 200, { Key: `${bucket}/${path}`, Id: randomUUID() });
    }
    if (req.method === "GET") {
      const f = files.get(path);
      if (!f) return json(res, 404, { statusCode: "404", error: "not_found", message: "Object not found" });
      res.writeHead(200, { "Content-Type": f.type, "Content-Length": f.buf.length });
      return res.end(f.buf);
    }
    if (req.method === "DELETE") {
      const body = JSON.parse((await readBody(req)).toString() || "{}");
      const removed = [];
      for (const p of body.prefixes || []) if (files.delete(p)) removed.push({ name: p });
      return json(res, 200, removed);
    }
  }

  // ---------- rest ----------
  if (url.pathname.startsWith("/rest/v1/")) {
    const table = url.pathname.slice("/rest/v1/".length);
    const rows = tables[table];
    if (!rows) return json(res, 404, { code: "42P01", message: `relation "${table}" does not exist` });
    const prefer = String(req.headers.prefer || "");

    if (req.method === "GET") return respondRows(req, res, applyFilters(rows, url.searchParams));

    if (req.method === "POST") {
      const body = JSON.parse((await readBody(req)).toString() || "{}");
      const list = Array.isArray(body) ? body : [body];
      const conflictCol = url.searchParams.get("on_conflict") || "id";
      const out = [];
      for (const input of list) {
        if (prefer.includes("merge-duplicates") && input[conflictCol] !== undefined) {
          const idx = rows.findIndex((r) => String(r[conflictCol]) === String(input[conflictCol]));
          if (idx >= 0) {
            rows[idx] = { ...rows[idx], ...input };
            out.push(rows[idx]);
            continue;
          }
        }
        const row = { ...defaults[table](), ...input };
        rows.push(row);
        out.push(row);
      }
      return respondRows(req, res, out, 201);
    }

    if (req.method === "PATCH") {
      const body = JSON.parse((await readBody(req)).toString() || "{}");
      const targets = applyFilters(rows, url.searchParams);
      for (const t of targets) Object.assign(t, body);
      return respondRows(req, res, targets);
    }

    if (req.method === "DELETE") {
      const targets = applyFilters(rows, url.searchParams);
      for (const t of targets) rows.splice(rows.indexOf(t), 1);
      return respondRows(req, res, targets);
    }
  }

  json(res, 404, { message: `No route for ${req.method} ${url.pathname}` });
});

server.listen(PORT, () => console.log(`mock supabase on http://localhost:${PORT}`));
