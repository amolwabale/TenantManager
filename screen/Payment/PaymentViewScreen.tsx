import { useFocusEffect, useRoute } from '@react-navigation/native';
import React from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Avatar, Icon, Surface, Text, useTheme } from 'react-native-paper';
import { fetchBillById, fetchLatestSetting, type BillRecord } from '../../service/BillService';
import { fetchRooms } from '../../service/RoomService';
import { fetchTenants } from '../../service/tenantService';

const formatMoney = (n?: number | null) => `₹${Math.round(Number(n || 0))}`;
const formatDate = (d?: string | null) =>
  d
    ? new Date(d).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : '-';

function twoDp(n: number) {
  return Math.round(n * 100) / 100;
}

export default function PaymentViewScreen() {
  const theme = useTheme();
  const route = useRoute<any>();
  const billId: number | undefined = route.params?.billId;

  const [loading, setLoading] = React.useState(true);
  const [bill, setBill] = React.useState<BillRecord | null>(null);
  const [tenantName, setTenantName] = React.useState('-');
  const [roomName, setRoomName] = React.useState('-');
  const [settings, setSettings] = React.useState<{ electricity_unit: number }>({ electricity_unit: 0 });

  const load = React.useCallback(async () => {
    if (!billId) {
      setBill(null);
      return;
    }

    try {
      setLoading(true);

      const [b, rooms, tenants, s] = await Promise.all([
        fetchBillById(billId),
        fetchRooms(),
        fetchTenants(),
        fetchLatestSetting(),
      ]);

      setBill(b);
      setSettings({ electricity_unit: s.electricity_unit || 0 });

      const roomMap: Record<number, string> = {};
      (rooms || []).forEach((r: any) => {
        if (r?.id != null) roomMap[r.id] = r.name || '-';
      });
      const tenantMap: Record<number, string> = {};
      (tenants || []).forEach((t: any) => {
        if (t?.id != null) tenantMap[t.id] = t.name || '-';
      });

      const rn = b?.room_id != null ? roomMap[b.room_id] : '-';
      const tn = b?.tenant_id != null ? tenantMap[b.tenant_id] : '-';

      setRoomName(rn || '-');
      setTenantName(tn || '-');
    } catch (e: any) {
      Alert.alert('Load Failed', e.message || 'Could not load bill');
    } finally {
      setLoading(false);
    }
  }, [billId]);

  useFocusEffect(
    React.useCallback(() => {
      load();
    }, [load]),
  );

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!bill) {
    return (
      <View style={styles.emptyWrap}>
        <Avatar.Icon
          size={56}
          icon="file-document-outline"
          style={{ backgroundColor: theme.colors.primaryContainer }}
          color={theme.colors.primary}
        />
        <Text variant="titleMedium" style={{ fontWeight: '800', marginTop: 12 }}>
          Bill not found
        </Text>
        <Text style={{ color: '#666', marginTop: 4 }}>
          This bill may have been deleted or you don’t have access.
        </Text>
      </View>
    );
  }

  const rent = Number(bill.rent || 0);
  const water = Number(bill.water || 0);
  const electricity = Number(bill.electricity || 0);
  const adHoc = Number(bill.ad_hoc_amount || 0);
  const total = Number(bill.total_amount || 0);
  const paid = Number(bill.paid_amount || 0);
  const status = (bill.status || '-').toUpperCase();

  const prev = Number(bill.previous_month_meter_reading || 0);
  const curr = Number(bill.current_month_meter_reading || 0);
  const units = Math.max(0, curr - prev);
  const rate = units > 0 ? twoDp(electricity / units) : settings.electricity_unit || 0;

  return (
    <View style={styles.container}>
      {/* HERO */}
      <Surface style={styles.hero} elevation={2}>
        <Avatar.Icon
          size={52}
          icon="file-document-outline"
          style={{ backgroundColor: theme.colors.primaryContainer }}
          color={theme.colors.primary}
        />
        <View style={{ flex: 1, marginLeft: 14 }}>
          <Text style={styles.heroKicker} numberOfLines={1}>
            BILL SUMMARY
          </Text>

          <Text variant="headlineSmall" style={styles.heroTenant} numberOfLines={1}>
            {tenantName}
          </Text>

          <View style={styles.heroRoomRow}>
            <Icon source="home-city-outline" size={18} color={theme.colors.primary} />
            <Text variant="titleMedium" style={styles.heroRoom} numberOfLines={1}>
              {roomName}
            </Text>
          </View>

          <View style={styles.heroMetaRow}>
            <Icon source="calendar" size={16} color="#6B7280" />
            <Text style={styles.heroMetaText} numberOfLines={1}>
              {formatDate(bill.created_at)}
            </Text>
          </View>
        </View>
      </Surface>

      {/* BILL PREVIEW (no-scroll layout) */}
      <Surface style={styles.billCard} elevation={2}>
        <View style={styles.billCardClip}>
          <Surface
            style={[styles.billTop, { backgroundColor: theme.colors.primaryContainer }]}
            elevation={0}
          >
            <View style={styles.billTopRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.billTopLabel}>Total payable</Text>
                <Text style={styles.billTopValue}>{formatMoney(total)}</Text>
                <Text style={styles.billTopSub}>
                  {units} units • rate {rate}/unit
                </Text>
              </View>

              <View style={styles.statusPill}>
                <Text style={styles.statusPillText}>{status}</Text>
              </View>
            </View>
          </Surface>

          <View style={styles.tileGrid}>
            <BreakdownTile icon="home-city-outline" label="Rent" value={formatMoney(rent)} />
            <BreakdownTile icon="water-outline" label="Water" value={formatMoney(water)} />
            <BreakdownTile
              icon="flash-outline"
              label="Electricity"
              value={formatMoney(electricity)}
              sub={`${units} × ${rate}`}
            />
            <BreakdownTile
              icon="cash-plus"
              label="Ad-hoc"
              value={formatMoney(adHoc)}
              sub={bill.ad_hoc_comment?.trim() ? bill.ad_hoc_comment.trim() : undefined}
            />
          </View>

          <View style={styles.metaRow}>
            <MetaPill icon="counter" label={`Prev ${prev}`} />
            <MetaPill icon="counter" label={`Curr ${curr}`} />
            <MetaPill icon="cash" label={`Paid ${formatMoney(paid)}`} />
          </View>
        </View>
      </Surface>
    </View>
  );
}

const BreakdownTile = ({
  icon,
  label,
  value,
  sub,
}: {
  icon: string;
  label: string;
  value: string;
  sub?: string;
}) => (
  <Surface style={styles.tile} elevation={0}>
    <View style={styles.tileTop}>
      <Icon source={icon} size={20} color="#1A73E8" />
      <Text style={styles.tileLabel} numberOfLines={1}>
        {label}
      </Text>
    </View>
    <Text style={styles.tileValue} numberOfLines={1}>
      {value}
    </Text>
    {!!sub && (
      <Text style={styles.tileSub} numberOfLines={1}>
        {sub}
      </Text>
    )}
  </Surface>
);

const MetaPill = ({ icon, label }: { icon: string; label: string }) => (
  <Surface style={styles.metaPill} elevation={0}>
    <Icon source={icon} size={16} color="#1A73E8" />
    <Text style={styles.metaPillText} numberOfLines={1}>
      {label}
    </Text>
  </Surface>
);

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#F4F6FA' },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyWrap: {
    flex: 1,
    backgroundColor: '#F4F6FA',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },

  hero: {
    borderRadius: 18,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  heroKicker: {
    color: '#6B7280',
    fontWeight: '900',
    letterSpacing: 1.2,
    fontSize: 11,
  },
  heroTenant: {
    fontWeight: '900',
    marginTop: 6,
    color: '#111827',
  },
  heroRoomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  heroRoom: {
    fontWeight: '800',
    color: '#1F2937',
    flex: 1,
  },
  heroMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  heroMetaText: {
    color: '#6B7280',
    fontWeight: '700',
    fontSize: 12,
    flex: 1,
  },

  billCard: {
    borderRadius: 18,
    padding: 0,
  },
  billCardClip: {
    borderRadius: 18,
    overflow: 'hidden',
  },
  billTop: {
    padding: 14,
  },
  billTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  billTopLabel: {
    color: '#444',
    fontWeight: '800',
  },
  billTopValue: {
    marginTop: 6,
    fontSize: 30,
    fontWeight: '900',
    color: '#111827',
  },
  billTopSub: {
    marginTop: 6,
    color: '#666',
    fontSize: 12,
    fontWeight: '700',
  },

  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#FFF5F5',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#F3B5B5',
  },
  statusPillText: {
    color: '#D32F2F',
    fontWeight: '900',
    fontSize: 12,
  },

  tileGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    padding: 14,
    paddingTop: 12,
  },
  tile: {
    width: '48%',
    borderRadius: 14,
    padding: 12,
    backgroundColor: '#FFF',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
  },
  tileTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tileLabel: { color: '#666', fontWeight: '800', flex: 1 },
  tileValue: {
    marginTop: 10,
    fontWeight: '900',
    fontSize: 16,
    color: '#111827',
  },
  tileSub: {
    marginTop: 4,
    color: '#777',
    fontSize: 11,
    fontWeight: '700',
  },

  metaRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#EEF2FF',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#D6DEFF',
    flex: 1,
  },
  metaPillText: { fontWeight: '800', color: '#1A73E8', fontSize: 12, flex: 1 },
});

