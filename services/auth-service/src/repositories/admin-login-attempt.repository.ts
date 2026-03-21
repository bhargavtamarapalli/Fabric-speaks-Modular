import { BaseRepository } from '@fs/shared';

export class AdminLoginAttemptRepository extends BaseRepository {
  async recordAttempt(params: { mobileHash: string | null; ipAddress: string | null; success: boolean; reason?: string | null }) {
    const query = `
      INSERT INTO admin_login_attempts (mobile_hash, ip_address, success, reason)
      VALUES ($1, $2, $3, $4)
    `;
    await this.query(query, [params.mobileHash, params.ipAddress, params.success, params.reason ?? null]);
  }

  async countRecentFailures(mobileHash: string, minutes: number): Promise<number> {
    // Validate minutes parameter to prevent SQL problems
    if (!Number.isInteger(minutes) || minutes <= 0 || minutes > 1440) {
      throw new Error(`Invalid minutes parameter: must be a positive integer between 1 and 1440 (24 hours). Received: ${minutes}`);
    }

    const query = `
      SELECT COUNT(*) as count
      FROM admin_login_attempts
      WHERE mobile_hash = $1
        AND success = false
        AND attempted_at >= now() - interval '1 minute' * $2
    `;
    const { rows } = await this.query(query, [mobileHash, minutes]);
    return parseInt(rows[0]?.count ?? '0', 10);
  }
}
