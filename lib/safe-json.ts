export async function parseJsonResponse<T = Record<string, unknown>>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text) {
    throw new Error(
      res.status === 503
        ? "Server sibuk (503). Cek konfigurasi Netlify & environment Firebase."
        : `Respons kosong dari server (${res.status})`
    );
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Respons server tidak valid (${res.status})`);
  }
}
