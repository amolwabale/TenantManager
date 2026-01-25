import supabase from './SupabaseClient';

export type TenantRecord = {
  id: number;
  user_id: string;
  name: string | null;
  mobile: string | null;
  alternate_mobile: string | null;
  total_family_members: string | null;
  address: string | null;
  company_name: string | null;
  adhar_card_url: string | null;
  pan_card_url: string | null;
  agreement_url: string | null;
  profile_photo_url?: string | null;
  created_at?: string;
  modified_at?: string | null;
};

export type FileInput = {
  uri: string;
  name: string;
  type?: string;
};

type FileState = {
  file?: FileInput | null;
  url?: string | null;
};

const BUCKET = 'tenant-manager';

const getCurrentUserId = async () => {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  const userId = data.user?.id;
  if (!userId) {
    throw new Error('User not found. Please login again.');
  }
  return userId;
};

const fetchTenants = async () => {
  const userId = await getCurrentUserId();
  const { data, error } = await supabase
    .from('tenant')
    .select('*')
    .eq('user_id', userId)
    .order('modified_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as TenantRecord[];
};

const fetchTenantById = async (tenantId: number) => {
  const userId = await getCurrentUserId();
  const { data, error } = await supabase
    .from('tenant')
    .select('*')
    .eq('user_id', userId)
    .eq('id', tenantId)
    .maybeSingle();
  if (error) throw error;
  return data as TenantRecord | null;
};

const getExt = (name: string, fallback = 'bin') => {
  const parts = name.split('.');
  if (parts.length > 1) {
    return parts.pop() || fallback;
  }
  return fallback;
};

const getPathFromPublicUrl = (url: string | null | undefined) => {
  if (!url) return null;
  const idx = url.indexOf(`${BUCKET}/`);
  if (idx === -1) return null;
  return url.substring(idx + BUCKET.length + 1);
};

const uploadFile = async (
  userId: string,
  key: 'profile_photo' | 'pan_card' | 'adhar_card' | 'agreement',
  file: FileInput,
) => {
  const ext = getExt(file.name);
  const path = `${userId}/${key}.${ext}`;
  const uri = file.uri.startsWith('file://') ? file.uri : `file://${file.uri}`;
  const response = await fetch(uri);
  const buffer = await response.arrayBuffer();
  if (!buffer || buffer.byteLength === 0) {
    throw new Error('Selected file is empty or unreadable');
  }
  const { error } = await supabase.storage.from(BUCKET).upload(path, buffer, {
    upsert: true,
    contentType: file.type || 'application/octet-stream',
  });
  if (error) throw error;
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { path, publicUrl: data.publicUrl };
};

const deleteFileByUrl = async (url: string | null | undefined) => {
  const path = getPathFromPublicUrl(url);
  if (!path) return;
  await supabase.storage.from(BUCKET).remove([path]);
};

type SavePayload = {
  id?: number;
  name: string;
  mobile: string;
  alternate_mobile?: string;
  total_family_members?: string;
  address?: string;
  company_name?: string;
  files: {
    profile?: FileState;
    pan?: FileState;
    adhar?: FileState;
    agreement?: FileState;
  };
};

const saveTenant = async (payload: SavePayload) => {
  const userId = await getCurrentUserId();

  let profileUrl = payload.files.profile?.url ?? null;
  let panUrl = payload.files.pan?.url ?? null;
  let adharUrl = payload.files.adhar?.url ?? null;
  let agreementUrl = payload.files.agreement?.url ?? null;

  if (payload.files.profile?.file) {
    const uploaded = await uploadFile(userId, 'profile_photo', payload.files.profile.file);
    profileUrl = uploaded.publicUrl;
  }
  if (payload.files.pan?.file) {
    const uploaded = await uploadFile(userId, 'pan_card', payload.files.pan.file);
    panUrl = uploaded.publicUrl;
  }
  if (payload.files.adhar?.file) {
    const uploaded = await uploadFile(userId, 'adhar_card', payload.files.adhar.file);
    adharUrl = uploaded.publicUrl;
  }
  if (payload.files.agreement?.file) {
    const uploaded = await uploadFile(userId, 'agreement', payload.files.agreement.file);
    agreementUrl = uploaded.publicUrl;
  }

  if (payload.id) {
    const { data, error } = await supabase
      .from('tenant')
      .update({
        name: payload.name.trim(),
        mobile: payload.mobile.trim(),
        alternate_mobile: payload.alternate_mobile?.trim() || null,
        total_family_members: payload.total_family_members?.trim() || null,
        address: payload.address?.trim() || null,
        company_name: payload.company_name?.trim() || null,
        adhar_card_url: adharUrl,
        pan_card_url: panUrl,
        agreement_url: agreementUrl,
        profile_photo_url: profileUrl,
        modified_at: new Date().toISOString(),
      })
      .eq('id', payload.id)
      .eq('user_id', userId)
      .select()
      .maybeSingle();
    if (error) throw error;
    return data as TenantRecord;
  }
  else{
    const { data, error } = await supabase
      .from('tenant')
      .insert({
        name: payload.name.trim(),
        mobile: payload.mobile.trim(),
        alternate_mobile: payload.alternate_mobile?.trim() || null,
        total_family_members: payload.total_family_members?.trim() || null,
        address: payload.address?.trim() || null,
        company_name: payload.company_name?.trim() || null,
        adhar_card_url: adharUrl,
        pan_card_url: panUrl,
        agreement_url: agreementUrl,
        profile_photo_url: profileUrl,
        user_id: userId,
      })
      .select()
      .maybeSingle();
    if (error) throw error;
    return data as TenantRecord;
  }
};

const deleteTenant = async (tenantId: number) => {
  const userId = await getCurrentUserId();
  const existing = await fetchTenantById(tenantId);
  const { error } = await supabase.from('tenant').delete().eq('id', tenantId).eq('user_id', userId);
  if (error) throw error;
  if (existing) {
    await Promise.all([
      deleteFileByUrl(existing.profile_photo_url),
      deleteFileByUrl(existing.pan_card_url),
      deleteFileByUrl(existing.adhar_card_url),
      deleteFileByUrl(existing.agreement_url),
    ]);
  }
};

export {
  getCurrentUserId,
  fetchTenants,
  fetchTenantById,
  saveTenant,
  deleteTenant,
  uploadFile,
  deleteFileByUrl,
};
