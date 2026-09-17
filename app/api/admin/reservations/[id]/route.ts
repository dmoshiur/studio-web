import { z } from "zod";
import { requireAdmin } from "@/lib/server/auth";
import { deleteReservation, setReservationStatus } from "@/lib/firestore/reservations";
import { apiError, handleApiError, ok, parseBody } from "@/lib/server/api-helpers";
import { auditLog } from "@/lib/server/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const patchSchema = z.object({
  status: z.enum(["requested", "confirmed", "cancelled"]),
});

/** Confirm / cancel a reservation. */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const actor = await requireAdmin();
    const { status } = await parseBody(req, patchSchema);
    const updated = await setReservationStatus(params.id, status);
    if (!updated) return apiError("Reservation not found", 404, "not_found");
    await auditLog({ actor, action: `reservations.${status}`, resource: params.id, result: "success" });
    return ok({ reservation: updated });
  } catch (err) {
    return handleApiError(err);
  }
}

/** Remove a reservation record entirely. */
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const actor = await requireAdmin();
    const removed = await deleteReservation(params.id);
    if (!removed) return apiError("Reservation not found", 404, "not_found");
    await auditLog({ actor, action: "reservations.delete", resource: params.id, result: "success" });
    return ok({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
