import { useFocusEffect, useNavigation } from '@react-navigation/native';
import React from 'react';
import {
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  ActivityIndicator,
  Avatar,
  FAB,
  Icon,
  Surface,
  Text,
  TouchableRipple,
  useTheme,
} from 'react-native-paper';
import { fetchBills, BillRecord } from '../../service/BillService';
import { fetchRooms } from '../../service/RoomService';
import { fetchTenants, TenantRecord } from '../../service/tenantService';
import { supabase } from '../../service/SupabaseClient';

const formatMoney = (n?: number | null) => `₹${Math.round(n || 0)}`;
const formatMoneyCompact = (n?: number | null) => {
  const v = Math.round(Number(n || 0));
  const trim = (s: string) => s.replace(/\.0$/, '');
  if (v >= 1e7) return `₹${trim((v / 1e7).toFixed(1))}Cr`;
  if (v >= 1e5) return `₹${trim((v / 1e5).toFixed(1))}L`;
  if (v >= 1e3) return `₹${trim((v / 1e3).toFixed(1))}k`;
  return `₹${v}`;
};
const formatDate = (d?: string | null) =>
  d
    ? new Date(d).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : '-';

const AVATAR_SIZE = 48;

export default function PaymentScreen() {
  const navigation = useNavigation<any>();
  const theme = useTheme();

  const [initialLoading, setInitialLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [bills, setBills] = React.useState<BillRecord[]>([]);
  const [tenantNameById, setTenantNameById] = React.useState<Record<number, string>>({});
  const [roomNameById, setRoomNameById] = React.useState<Record<number, string>>({});
  const [tenantPhotoById, setTenantPhotoById] = React.useState<Record<number, string>>({});

  // same approach as Tenant list screen (signed URLs for private bucket)
  const createSignedUrl = async (fullUrl?: string | null) => {
    if (!fullUrl) return undefined;
    const marker = '/tenant-manager/';
    const index = fullUrl.indexOf(marker);
    if (index === -1) return undefined;
    const filePath = fullUrl.substring(index + marker.length);

    const { data, error } = await supabase.storage
      .from('tenant-manager')
      .createSignedUrl(filePath, 60 * 60);

    if (error) return undefined;
    return data.signedUrl;
  };

  const generateSignedUrls = async (tenants: TenantRecord[], billRows: BillRecord[]) => {
    const usedTenantIds = new Set<number>();
    (billRows || []).forEach((b) => {
      if (b.tenant_id != null) usedTenantIds.add(b.tenant_id);
    });

    const map: Record<number, string> = {};
    await Promise.all(
      (tenants || [])
        .filter((t) => usedTenantIds.has(t.id))
        .map(async (t) => {
          const signed = await createSignedUrl((t as any).profile_photo_url);
          if (signed) map[t.id] = signed;
        }),
    );
    setTenantPhotoById(map);
  };

  const load = React.useCallback(async (isRefresh = false) => {
    try {
      isRefresh ? setRefreshing(true) : setInitialLoading(true);

      const [billRows, rooms, tenants] = await Promise.all([
        fetchBills(),
        fetchRooms(),
        fetchTenants(),
      ]);

      const roomMap: Record<number, string> = {};
      (rooms || []).forEach((r: any) => {
        if (r?.id != null) roomMap[r.id] = r.name || '-';
      });
      const tenantMap: Record<number, string> = {};
      (tenants || []).forEach((t: any) => {
        if (t?.id != null) tenantMap[t.id] = t.name || '-';
      });

      setRoomNameById(roomMap);
      setTenantNameById(tenantMap);
      setBills(billRows || []);
      generateSignedUrls((tenants || []) as any, (billRows || []) as any);
    } catch (e: any) {
      Alert.alert('Load Failed', e.message || 'Could not load payments');
    } finally {
      isRefresh ? setRefreshing(false) : setInitialLoading(false);
    }
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      load(false);
    }, [load]),
  );

  const renderItem = ({ item }: { item: BillRecord }) => (
    <PaymentCard
      item={item}
      roomName={item.room_id != null ? roomNameById[item.room_id] : '-'}
      tenantName={item.tenant_id != null ? tenantNameById[item.tenant_id] : '-'}
      photoUrl={item.tenant_id != null ? tenantPhotoById[item.tenant_id] : undefined}
      onRecord={() => navigation.navigate('PaymentView', { billId: item.id, openRecordPayment: true })}
      onPress={() => navigation.navigate('PaymentView', { billId: item.id })}
      theme={theme}
    />
  );

  return (
    <View style={styles.container}>
      {initialLoading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" />
        </View>
      ) : (
        <FlatList
          data={bills}
          renderItem={renderItem}
          keyExtractor={(i) => i.id.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />
          }
        />
      )}

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => navigation.navigate('PaymentForm')}
      />
    </View>
  );
}

const PaymentCard = ({
  item,
  roomName,
  tenantName,
  photoUrl,
  onRecord,
  onPress,
  theme,
}: {
  item: BillRecord;
  roomName: string;
  tenantName: string;
  photoUrl?: string;
  onRecord: () => void;
  onPress: () => void;
  theme: any;
}) => (
  <Surface style={styles.card} elevation={2}>
    <View style={styles.cardClip}>
      <TouchableOpacity style={styles.cardContent} activeOpacity={0.85} onPress={onPress}>
        <AvatarDisplay uri={photoUrl} size={AVATAR_SIZE} />

        <View style={styles.verticalDivider} />

        <View style={styles.cardBody}>
          {(() => {
            const total = Number(item.total_amount || 0);
            const paid = Number(item.paid_amount || 0);
            const pending = Math.max(0, total - paid);
            const status = (item.status || '-').toUpperCase();
            const statusTone =
              status === 'PAID'
                ? { bg: '#ECFDF3', border: '#86EFAC', text: '#16A34A' }
                : status === 'PARTIAL'
                  ? { bg: '#FFF7ED', border: '#FDBA74', text: '#F97316' }
                  : { bg: '#FFF5F5', border: '#FECACA', text: '#EF4444' };

            return (
              <>
                <View style={styles.titleRow}>
                  <Text variant="titleMedium" style={styles.cardTitle} numberOfLines={1}>
                    {tenantName}
                  </Text>
                  <Text
                    style={[styles.totalTopRight, { color: theme.colors.primary }]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.7}
                  >
                    {formatMoney(total)}
                  </Text>
                </View>

                <View style={styles.metaRow}>
                  <View style={styles.roomRow}>
                    <Icon source="home-city-outline" size={16} color={theme.colors.primary} />
                    <Text style={styles.roomText} numberOfLines={1}>
                      {roomName}
                    </Text>
                  </View>
                  <Text style={styles.dateText} numberOfLines={1}>
                    {formatDate(item.created_at)}
                  </Text>
                </View>

                <View style={styles.bottomRow}>
                  <View style={[styles.statusPill, { backgroundColor: statusTone.bg, borderColor: statusTone.border }]}>
                    <Text style={[styles.statusPillText, { color: statusTone.text }]} numberOfLines={1}>
                      {status}
                    </Text>
                  </View>

                  {status === 'PARTIAL' ? (
                    <View style={[styles.pendingPill, { backgroundColor: '#FFF7ED', borderColor: '#FDBA74' }]}>
                      <Icon source="clock-outline" size={14} color="#F97316" />
                      <Text style={[styles.pendingPillText, { color: '#F97316' }]} numberOfLines={1}>
                        {formatMoneyCompact(pending)}
                      </Text>
                    </View>
                  ) : null}

                  <TouchableRipple
                    onPress={onRecord}
                    borderless
                    disabled={pending <= 0}
                    style={[
                      styles.recordChip,
                      {
                        borderColor: pending > 0 ? theme.colors.primary : theme.colors.outline,
                        opacity: pending > 0 ? 1 : 0.5,
                        backgroundColor: theme.colors.surface,
                      },
                    ]}
                  >
                    <View style={styles.recordChipInner}>
                      <Icon source="cash-plus" size={14} color={theme.colors.primary} />
                      <Text style={[styles.recordChipText, { color: theme.colors.primary }]} numberOfLines={1}>
                        Record
                      </Text>
                    </View>
                  </TouchableRipple>
                </View>
              </>
            );
          })()}
        </View>
      </TouchableOpacity>
    </View>
  </Surface>
);

const AvatarDisplay = ({ uri, size }: { uri?: string; size: number }) =>
  uri ? <Avatar.Image size={size} source={{ uri }} /> : <Avatar.Icon size={size} icon="account" />;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F6FA' },
  listContent: { padding: 16, paddingBottom: 120 },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  card: {
    borderRadius: 16,
    marginBottom: 12,
  },
  cardClip: {
    flexDirection: 'row',
    borderRadius: 16,
    overflow: 'hidden',
  },
  cardContent: {
    flex: 1,
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    alignItems: 'flex-start',
  },
  verticalDivider: {
    width: 1.5,
    height: 65,
    backgroundColor: '#cccccc',
    borderRadius: 1,
    marginHorizontal: 12,
  },
  cardBody: { flex: 1, paddingTop: 2 },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  cardTitle: { fontWeight: '700', flex: 1 },
  metaRow: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  roomRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  roomText: { color: '#555', fontWeight: '700', flex: 1 },
  dateText: { color: '#777', fontSize: 12, fontWeight: '700' },
  bottomRow: { marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  statusPillText: { fontWeight: '900', fontSize: 12 },
  pendingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    maxWidth: 120,
  },
  pendingPillText: { fontWeight: '900', fontSize: 12, fontVariant: ['tabular-nums'] },
  recordChip: {
    marginLeft: 'auto',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  recordChipInner: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  recordChipText: { fontWeight: '900', fontSize: 12, letterSpacing: 0.2 },
  totalTopRight: {
    fontWeight: '900',
    fontSize: 13,
    fontVariant: ['tabular-nums'],
    maxWidth: 120,
    textAlign: 'right',
  },

  fab: { position: 'absolute', right: 16, bottom: 24 },
});

