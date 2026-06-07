"use client";

import { createContext, useContext } from "react";

interface OpsContextValue {
  gate: string;
  email: string;
  name: string;
}

const OpsContext = createContext<OpsContextValue | null>(null);

export function OpsProvider({
  gate,
  email,
  name,
  children,
}: OpsContextValue & { children: React.ReactNode }) {
  return <OpsContext.Provider value={{ gate, email, name }}>{children}</OpsContext.Provider>;
}

export function useOps() {
  const ctx = useContext(OpsContext);
  if (!ctx) throw new Error("useOps must be used within OpsProvider");
  return ctx;
}

export function opsPath(gate: string, segment = "") {
  const base = `/ctl/ops/${gate}`;
  return segment ? `${base}/${segment}` : base;
}
