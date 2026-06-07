import { NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/admin/verify-request";
import { fetchVillageLaporan, wilayahKey } from "@/lib/laporan-aggregate";

export const runtime = "nodejs";

const STATUS_LABEL: Record<string, string> = {
  submitted: "Belum diproses",
  dibaca: "Dibaca admin",
  diproses: "Sedang diproses",
  selesai: "Selesai",
  ditolak: "Ditolak",
};

function escapeCsv(val: string) {
  return `"${val.replace(/"/g, '""')}"`;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const villageId = searchParams.get("villageId");
    const format = searchParams.get("format") || "csv";
    const { data, decoded } = await verifyAdminRequest(req, villageId);

    const uid = villageId || decoded.uid;
    const laporan = await fetchVillageLaporan(uid);
    const villageName = String(data.villageName || "Desa");
    const dateStr = new Date().toLocaleDateString("id-ID");

    if (format === "csv" || format === "excel") {
      const header = [
        "Ticket ID",
        "Kategori",
        "Deskripsi",
        "Status",
        "Urgensi",
        "Wilayah",
        "Alamat",
        "Tanggal",
      ];
      const rows = laporan.map((l) =>
        [
          l.ticketId,
          l.kategori,
          l.deskripsi.replace(/\n/g, " "),
          STATUS_LABEL[l.status] || l.status,
          l.tingkatUrgensi,
          wilayahKey(l.rt, l.rw),
          l.issueAddress || "",
          l.createdAt ? new Date(l.createdAt).toLocaleString("id-ID") : "",
        ]
          .map((c) => escapeCsv(c))
          .join(",")
      );

      const csv = [header.join(","), ...rows].join("\n");
      const filename = `laporan-${villageName.replace(/\s+/g, "-")}-${dateStr}.csv`;

      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    const rows = laporan
      .map(
        (l) => `
      <tr>
        <td>${l.ticketId}</td>
        <td>${l.kategori}</td>
        <td>${l.deskripsi.slice(0, 200)}</td>
        <td>${STATUS_LABEL[l.status] || l.status}</td>
        <td>${l.tingkatUrgensi}</td>
        <td>${wilayahKey(l.rt, l.rw)}</td>
        <td>${l.createdAt ? new Date(l.createdAt).toLocaleString("id-ID") : ""}</td>
      </tr>`
      )
      .join("");

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Rekap Laporan ${villageName}</title>
<style>
body{font-family:system-ui,sans-serif;padding:24px;color:#111}
h1{font-size:20px} table{width:100%;border-collapse:collapse;margin-top:16px;font-size:12px}
th,td{border:1px solid #ccc;padding:8px;text-align:left} th{background:#f5f5f5}
@media print{button{display:none}}
</style></head><body>
<h1>Rekap Laporan — ${villageName}</h1>
<p>Dicetak: ${dateStr} · Total: ${laporan.length} laporan</p>
<button onclick="window.print()">Cetak / Simpan PDF</button>
<table>
<thead><tr><th>Ticket</th><th>Kategori</th><th>Deskripsi</th><th>Status</th><th>Urgensi</th><th>Wilayah</th><th>Tanggal</th></tr></thead>
<tbody>${rows || "<tr><td colspan='7'>Belum ada laporan</td></tr>"}</tbody>
</table></body></html>`;

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `inline; filename="rekap-${villageName.replace(/\s+/g, "-")}.html"`,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Gagal mengekspor";
    const status = msg === "Unauthorized" ? 401 : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}
