import supabase from './SupabaseClient';
import { TenantRecord } from './tenantService';

/* ===================== TYPES ===================== */

export type TenantRoomRecord = {
  id: number;
  tenant_id: number;
  room_id: number;
  joining_date: string;
  leaving_date: string | null;
  tenant: TenantRecord;
};

export type TenantHistoryRecord = {
  tenant_name: string;
  joining_date: string;
  leaving_date: string | null;
  last_rent_paid: number | null;
};

/* ===================== AUTH ===================== */

const getCurrentUserId = async () => {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!data.user?.id) throw new Error('User not found');
  return data.user.id;
};

/* ===================== HELPERS ===================== */

const fetchTenantsMap = async (): Promise<Record<number, TenantRecord>> => {
  const userId = await getCurrentUserId();

  const { data, error } = await supabase
    .from('tenant')
    .select('*')
    .eq('user_id', userId);

  if (error) throw error;

  const map: Record<number, TenantRecord> = {};
  data.forEach(t => (map[t.id] = t));
  return map;
};

/* ===================== ACTIVE TENANT ===================== */

const fetchActiveTenantForRoom = async (roomId: number) => {
  const userId = await getCurrentUserId();
  const tenantMap = await fetchTenantsMap();

  const { data, error } = await supabase
    .from('tenant_room_mapping')
    .select('*')
    .eq('room_id', roomId)
    .eq('user_id', userId)
    .is('leaving_date', null)
    .maybeSingle();

  if (error || !data) return null;

  return {
    ...data,
    tenant: tenantMap[data.tenant_id],
  } as TenantRoomRecord;
};

/* ===================== TENANT HISTORY ===================== */

const fetchTenantHistoryForRoom = async (roomId: number) => {
  const userId = await getCurrentUserId();
  const tenantMap = await fetchTenantsMap();

  const { data, error } = await supabase
    .from('tenant_room_mapping')
    .select('*')
    .eq('room_id', roomId)
    .eq('user_id', userId)
    .not('leaving_date', 'is', null)
    .order('joining_date', { ascending: false });

  if (error) throw error;

  return (data || []).map(r => ({
    tenant_name: tenantMap[r.tenant_id]?.name ?? '-',
    joining_date: r.joining_date,
    leaving_date: r.leaving_date,
    last_rent_paid: null, // from bill later
  })) as TenantHistoryRecord[];
};

/* ===================== ADD TENANT ===================== */

const addTenantToRoom = async ({
  tenant_id,
  room_id,
  joining_date,
}: {
  tenant_id: number;
  room_id: number;
  joining_date: string;
}) => {
  const userId = await getCurrentUserId();

  // safety: ensure no active tenant
  const existing = await fetchActiveTenantForRoom(room_id);
  if (existing) throw new Error('Room already occupied');

  const { error } = await supabase.from('tenant_room_mapping').insert({
    tenant_id,
    room_id,
    joining_date,
    user_id: userId,
  });

  if (error) throw error;
};

/* ===================== VACATE ===================== */

const vacateRoom = async (mappingId: number) => {
  const userId = await getCurrentUserId();

  const { error } = await supabase
    .from('tenant_room_mapping')
    .update({
      leaving_date: new Date().toISOString(),
    })
    .eq('id', mappingId)
    .eq('user_id', userId);

  if (error) throw error;
};

/* ===================== EXPORTS ===================== */

export {
  fetchActiveTenantForRoom,
  fetchTenantHistoryForRoom,
  addTenantToRoom,
  vacateRoom,
};
