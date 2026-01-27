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
  Surface,
  Text,
} from 'react-native-paper';
import { fetchBills, BillRecord } from '../../service/BillService';
import { fetchRooms } from '../../service/RoomService';
import { fetchTenants, TenantRecord } from '../../service/tenantService';
import { supabase } from '../../service/SupabaseClient';

const formatMoney = (n?: number | null) => `₹${Math.round(n || 0)}`;
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
      onPress={() => navigation.navigate('PaymentView', { billId: item.id })}
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
  onPress,
}: {
  item: BillRecord;
  roomName: string;
  tenantName: string;
  photoUrl?: string;
  onPress: () => void;
}) => (
  <Surface style={styles.card} elevation={2}>
    <View style={styles.cardClip}>
      <TouchableOpacity style={styles.cardContent} activeOpacity={0.85} onPress={onPress}>
        <AvatarDisplay uri={photoUrl} size={AVATAR_SIZE} />

        <View style={styles.verticalDivider} />

        <View style={styles.cardBody}>
          <View style={styles.titleRow}>
            <Text variant="titleMedium" style={styles.cardTitle} numberOfLines={1}>
              {tenantName}
            </Text>
            <Text style={styles.amountPill}>{formatMoney(item.total_amount)}</Text>
          </View>

          <Text style={styles.cardSubtitle} numberOfLines={1}>
            Room: {roomName}
          </Text>
          <Text style={styles.cardCaption} numberOfLines={1}>
            {formatDate(item.created_at)} • Status: {(item.status || '-').toUpperCase()}
          </Text>
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
  cardSubtitle: { color: '#555', marginTop: 4, fontWeight: '600' },
  cardCaption: { color: '#777', fontSize: 12, marginTop: 4, lineHeight: 16 },
  amountPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#EEF2FF',
    color: '#1A73E8',
    fontWeight: '800',
    fontSize: 12,
  },

  fab: { position: 'absolute', right: 16, bottom: 24 },
});

