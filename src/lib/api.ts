import { NextResponse } from "next/server";

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function fail(error: unknown, status = 500) {
  const message = error instanceof Error ? error.message : String(error);
  console.error("[api]", message);
  return NextResponse.json({ error: message }, { status });
}

export function newId(): string {
  return crypto.randomUUID();
}
