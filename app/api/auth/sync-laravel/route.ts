import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Placeholder endpoint untuk sinkronisasi sesi dengan backend Laravel.
 * Saat ini hanya mengembalikan status sukses untuk mencegah error 404 pada login.
 */
export async function POST(req: Request) {
  try {
    const { idToken } = await req.json();
    
    // Log token untuk debugging (opsional, jangan di-log di production yang sebenarnya)
    // console.log("[sync-laravel] Syncing token:", idToken?.slice(0, 10) + "...");

    return NextResponse.json({ 
      ok: true, 
      message: "Sync placeholder successful",
      syncedAt: new Date().toISOString() 
    });
  } catch (err) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
