"use client";

import { api, jsonInit } from "./hooks";

export interface UploadTarget {
  id: string;
  image: { path: string; signedUrl: string };
  original: { path: string; signedUrl: string } | null;
}

/** Ask the server for signed Storage URLs for one new item. */
export function requestUploadTarget(withOriginal: boolean): Promise<UploadTarget> {
  return api<UploadTarget>("/api/upload-url", jsonInit("POST", { original: withOriginal }));
}

/** PUT a file straight into Storage using a signed upload URL (no size limit of our own API). */
export async function putToSignedUrl(signedUrl: string, blob: Blob, contentType: string): Promise<void> {
  const res = await fetch(signedUrl, {
    method: "PUT",
    headers: { "content-type": contentType, "x-upsert": "true", "cache-control": "max-age=3600" },
    body: blob,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Файл не загрузился (${res.status})${text ? ": " + text.slice(0, 120) : ""}`);
  }
}
