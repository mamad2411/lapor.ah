import { NextResponse } from "next/server";

// Suppress sw.js 404 noise dari browser extensions (Metamask, dll)
export function GET() {
  return new NextResponse("", {
    status: 200,
    headers: { "Content-Type": "application/javascript" },
  });
}
