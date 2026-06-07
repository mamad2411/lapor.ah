"use client";

import { useState } from "react";
import { mockLaporan } from "./mock-data";
import {
  defaultFilters,
  filterLaporan,
  LaporanFilters,
  type LaporanFilterState,
} from "./laporan-filters";
import { LaporanTable } from "./laporan-table";
import { SectionHeading } from "./section-heading";
import { AdminLayout } from "./admin-layout";

export function LaporanPage() {
  const [filters, setFilters] = useState<LaporanFilterState>(defaultFilters);
  const filtered = filterLaporan(mockLaporan, filters);

  return (
    <AdminLayout
      showSearch
      searchQuery={filters.search}
      onSearchChange={(v) => setFilters({ ...filters, search: v })}
    >
      <div className="space-y-6">
        <SectionHeading
          label="Pengaduan"
          title="Semua laporan masyarakat"
          description="Terima, tinjau, tugaskan, dan tindaklanjuti pengaduan warga desa."
        />
        <LaporanFilters filters={filters} onChange={setFilters} />
        <LaporanTable laporan={filtered} />
      </div>
    </AdminLayout>
  );
}
