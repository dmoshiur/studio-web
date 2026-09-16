import { NextResponse } from "next/server";
import { getMaintenanceState } from "@/lib/firestore/settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Safe public maintenance flag (consumed by middleware). No secrets. */
export async function GET() {
  const state = await getMaintenanceState();
  const res = NextResponse.json({
    enabled: state.enabled,
    emergencyLock: state.emergencyLock,
  });
  res.headers.set("Cache-Control", "public, s-maxage=20, stale-while-revalidate=40");
  return res;
}
