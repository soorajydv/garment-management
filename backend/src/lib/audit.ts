import { AuditLog } from '../models/AuditLog';
import type { AuthUser } from '../middleware/auth';

/** Records a critical action. Failures are logged but never break the request. */
export async function audit(user: AuthUser | null, action: string, entity: string, entityId: string, summary: string) {
  try {
    await AuditLog.create({
      actor: user?.id ?? null,
      actorName: user?.name ?? 'system',
      actorRole: user?.role ?? '',
      action,
      entity,
      entityId,
      summary,
    });
  } catch (err) {
    console.error('Failed to write audit log', err);
  }
}
