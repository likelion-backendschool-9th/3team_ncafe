export function safeNext(value: unknown): string | null {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) return null;
  if (/[\\\r\n\u0000-\u001f\u007f]/.test(value)) return null;
  try {
    const decoded = decodeURIComponent(value);
    if (decoded.startsWith("//") || /[\\\r\n\u0000-\u001f\u007f]/.test(decoded)) return null;
    return new URL(value, "http://ncafe.local").origin === "http://ncafe.local" ? value : null;
  } catch {
    return null;
  }
}
