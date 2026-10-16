/**
 * Pembatas laju sederhana di memori (cukup untuk satu instance SQLite).
 * hit() mencatat satu percobaan dan mengembalikan false bila batas terlampaui.
 */
const buckets = new Map();

export function hit(bucket, key, max, windowMs) {
  const id = `${bucket}:${key}`;
  const now = Date.now();
  const entry = buckets.get(id);
  if (!entry || now > entry.resetAt) {
    buckets.set(id, { count: 1, resetAt: now + windowMs });
    return true;
  }
  entry.count += 1;
  return entry.count <= max;
}

export function reset(bucket, key) {
  buckets.delete(`${bucket}:${key}`);
}

// Bersihkan entri kadaluarsa agar memori tidak membengkak
setInterval(() => {
  const now = Date.now();
  for (const [id, entry] of buckets) if (now > entry.resetAt) buckets.delete(id);
}, 10 * 60 * 1000).unref();
