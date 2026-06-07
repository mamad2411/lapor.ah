export interface ReportHistory {
  ticketId: string;
  trackingPin: string;
  createdAt: number;
  villageName?: string;
  kategori?: string;
}

const STORAGE_KEY = "laporah_user_history";

export function getReportHistory(): ReportHistory[] {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

export function saveToHistory(report: ReportHistory) {
  if (typeof window === "undefined") return;
  const history = getReportHistory();
  // Avoid duplicates
  if (history.find((h) => h.ticketId === report.ticketId)) return;
  
  const newHistory = [report, ...history];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory));
}

export function hasReportedBefore(): boolean {
  return getReportHistory().length > 0;
}
