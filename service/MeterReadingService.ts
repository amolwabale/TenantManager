import supabase from './SupabaseClient';

export type MeterReadingInsert = {
  roomId: number;
  tenantId: number;
  unit: number;
};

export type MeterReadingRow = {
  id: number;
};

/**
 * Inserts a meter reading row for a room + tenant.
 *
 * NOTE: In some schemas `meter_reading.user_id` is incorrectly defined as `numeric`.
 * Supabase auth user id is a UUID string, so this function:
 * - Tries inserting with user_id
 * - If Postgres rejects due to numeric/UUID mismatch, retries without user_id
 */
export async function createMeterReading(payload: MeterReadingInsert): Promise<MeterReadingRow> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;

  const insertWithUser = await supabase
    .from('meter_reading')
    .insert({
      room_id: payload.roomId,
      unit: payload.unit,
      tenant_id: payload.tenantId,
      user_id: (userData.user?.id as any) ?? null,
    })
    .select('id')
    .maybeSingle();

  if (insertWithUser.error) {
    const msg = insertWithUser.error.message || '';
    const shouldRetryWithoutUser =
      msg.includes('type numeric') || msg.includes('invalid input syntax');

    if (!shouldRetryWithoutUser) {
      throw insertWithUser.error;
    }

    const insertWithoutUser = await supabase
      .from('meter_reading')
      .insert({
        room_id: payload.roomId,
        unit: payload.unit,
        tenant_id: payload.tenantId,
      })
      .select('id')
      .maybeSingle();

    if (insertWithoutUser.error) throw insertWithoutUser.error;
    if (!insertWithoutUser.data?.id) throw new Error('Meter reading save failed');
    return insertWithoutUser.data as any;
  }

  if (!insertWithUser.data?.id) throw new Error('Meter reading save failed');
  return insertWithUser.data as any;
}

export async function deleteMeterReading(id: number) {
  const { error } = await supabase.from('meter_reading').delete().eq('id', id);
  if (error) throw error;
}
