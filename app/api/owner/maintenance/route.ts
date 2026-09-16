import { requireOwner } from "@/lib/server/auth";
import { getMaintenanceState, saveMaintenanceState } from "@/lib/firestore/settings";
import { maintenanceSchema } from "@/lib/validation/schemas";
import { handleApiError, ok, parseBody } from "@/lib/server/api-helpers";
import { auditLog } from "@/lib/server/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireOwner();
    return ok(await getMaintenanceState());
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PUT(req: Request) {
  try {
    const user = await requireOwner();
    const body = await parseBody(req, maintenanceSchema);
    const prev = await getMaintenanceState();
    const saved = await saveMaintenanceState(
      {
        enabled: body.enabled,
        emergencyLock: body.emergencyLock ?? prev.emergencyLock,
        title: body.title,
        message: body.message,
        expectedReturn: body.expectedReturn ?? "",
        imageUrl: body.imageUrl ?? "",
      },
      user.uid
    );
    await auditLog({
      actor: user,
      action: body.emergencyLock ?? prev.emergencyLock ? "maintenance.emergency_lock" : "maintenance.update",
      result: "success",
      metadata: { enabled: saved.enabled, emergencyLock: saved.emergencyLock, prevEnabled: prev.enabled },
    });
    return ok(saved);
  } catch (err) {
    return handleApiError(err);
  }
}
