/** Images are served through our own route so the storage bucket can stay private. Safe on client and server. */
export function imageUrl(path: string | null | undefined): string {
  if (!path) return "";
  return `/api/img/${path.split("/").map(encodeURIComponent).join("/")}`;
}
