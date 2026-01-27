import { useFocusEffect, useNavigation } from '@react-navigation/native';
import React from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  ActivityIndicator,
  Avatar,
  Button,
  FAB,
  HelperText,
  Icon,
  IconButton,
  Surface,
  Text,
  TextInput,
  useTheme,
} from 'react-native-paper';
import { createBill, fetchLatestSetting } from '../../service/BillService';
import { createMeterReading, fetchLatestMeterReadingForRoom } from '../../service/MeterReadingService';
import { fetchRooms, RoomRecord } from '../../service/RoomService';
import { TenantRecord } from '../../service/tenantService';
import { fetchActiveTenantsForRooms } from '../../service/TenantRoomService';

const formatMoney = (n: number) => `₹${Math.round(n)}`;

export default function PaymentFormScreen() {
  const theme = useTheme();
  const navigation = useNavigation<any>();

  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  const [rooms, setRooms] = React.useState<RoomRecord[]>([]);
  const [assignments, setAssignments] = React.useState<
    Array<{ room: RoomRecord; tenant: TenantRecord }>
  >([]);
  const [settings, setSettings] = React.useState<{ water: number; electricity_unit: number }>({
    water: 0,
    electricity_unit: 0,
  });

  const [pairQuery, setPairQuery] = React.useState('');
  const [selectedRoom, setSelectedRoom] = React.useState<RoomRecord | null>(null);
  const [selectedTenant, setSelectedTenant] = React.useState<TenantRecord | null>(null);

  const [previousMeter, setPreviousMeter] = React.useState<number>(0);
  const [currentMeter, setCurrentMeter] = React.useState('');
  const [adHocAmount, setAdHocAmount] = React.useState('');
  const [adHocComment, setAdHocComment] = React.useState('');

  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const load = React.useCallback(async () => {
    try {
      setLoading(true);
      const [r, s] = await Promise.all([fetchRooms(), fetchLatestSetting()]);
      setRooms(r || []);
      setSettings(s);

      const roomIdList = (r || []).map((x) => x.id);
      const activeByRoom = await fetchActiveTenantsForRooms(roomIdList);
      const pairs: Array<{ room: RoomRecord; tenant: TenantRecord }> = [];

      (r || []).forEach((room) => {
        const active = activeByRoom?.[room.id];
        if (active?.tenant) {
          pairs.push({ room, tenant: active.tenant });
        }
      });

      setAssignments(pairs);
    } catch (e: any) {
      Alert.alert('Load Failed', e.message || 'Could not load payment form');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      load();
    }, [load]),
  );

  const filteredPairs =
    pairQuery.trim().length > 0
      ? assignments.filter(({ room, tenant }) => {
          const label = `${room.name || ''}-${tenant.name || ''}`.toLowerCase();
          return label.includes(pairQuery.toLowerCase());
        })
      : [];

  const rent = selectedRoom?.rent ? Number(selectedRoom.rent) : 0;
  const water = settings.water || 0;
  const currentMeterNum = currentMeter ? Number(currentMeter) : 0;
  const diffUnits = Math.max(0, currentMeterNum - previousMeter);
  const electricity = diffUnits * (settings.electricity_unit || 0);
  const adHoc = adHocAmount ? Number(adHocAmount) : 0;
  const total = rent + water + electricity + adHoc;

  const validate = () => {
    const e: Record<string, string> = {};
    if (!selectedRoom || !selectedTenant) e.pair = 'Room-Tenant is required';
    if (!/^\d+$/.test(currentMeter)) e.currentMeter = 'Numbers only';
    if (adHocAmount && !/^\d+$/.test(adHocAmount)) e.adHocAmount = 'Numbers only';

    if (selectedRoom && currentMeter && Number(currentMeter) < previousMeter) {
      e.currentMeter = `Must be ≥ previous (${previousMeter})`;
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const selectPair = async (pair: { room: RoomRecord; tenant: TenantRecord }) => {
    setSelectedRoom(pair.room);
    setSelectedTenant(pair.tenant);
    setPairQuery('');
    setErrors((p) => ({ ...p, pair: '' }));

    try {
      const latest = await fetchLatestMeterReadingForRoom({ roomId: pair.room.id });
      setPreviousMeter(latest?.unit != null ? Number(latest.unit) : 0);
    } catch {
      setPreviousMeter(0);
    }
  };

  const save = async () => {
    if (!validate()) return;
    if (!selectedRoom || !selectedTenant) return;

    try {
      setSaving(true);

      const prev = previousMeter;
      const curr = Number(currentMeter);

      // 1) Create bill
      await createBill({
        tenantId: selectedTenant.id,
        roomId: selectedRoom.id,
        rent,
        water,
        previousMeter: prev,
        currentMeter: curr,
        electricity,
        totalAmount: total,
        adHocAmount: adHoc,
        adHocComment,
      });

      // 2) Store current month meter reading
      await createMeterReading({
        roomId: selectedRoom.id,
        tenantId: selectedTenant.id,
        unit: curr,
      });

      Alert.alert('Saved', 'Payment captured successfully', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e: any) {
      Alert.alert('Save Failed', e.message || 'Could not save payment');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          scrollEnabled={!saving}
        >
          <View pointerEvents={saving ? 'none' : 'auto'}>
            {/* HERO */}
            <Surface style={styles.hero} elevation={2}>
              <Avatar.Icon
                size={52}
                icon="receipt-text-outline"
                style={{ backgroundColor: theme.colors.primaryContainer }}
                color={theme.colors.primary}
              />
              <View style={{ marginLeft: 14 }}>
                <Text variant="titleLarge" style={{ fontWeight: '800' }}>
                  Add Payment
                </Text>
                <Text style={{ color: '#666', marginTop: 2 }}>
                  Capture rent & utilities
                </Text>
              </View>
            </Surface>

            {/* SELECTION */}
            <Surface style={styles.section} elevation={2}>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                Select Tenant & Room
              </Text>

            {!selectedRoom || !selectedTenant ? (
              <>
                <Surface style={styles.occupancyHint} elevation={0}>
                  <Avatar.Icon
                    size={40}
                    icon="swap-horizontal"
                    style={{ backgroundColor: theme.colors.primaryContainer }}
                    color={theme.colors.primary}
                  />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={{ fontWeight: '700' }}>Select an occupied room</Text>
                    <Text style={{ color: '#666', marginTop: 2 }}>
                      Search by room or tenant name (Room - Tenant).
                    </Text>
                  </View>
                </Surface>

                <TextInput
                  label="Search Room - Tenant *"
                  mode="outlined"
                  value={pairQuery}
                  onChangeText={(t) => {
                    setPairQuery(t);
                    setErrors((p) => ({ ...p, pair: '' }));
                  }}
                  left={<TextInput.Icon icon="magnify" />}
                  error={!!errors.pair}
                  editable={!saving}
                />
                <HelperText type="error" visible={!!errors.pair}>
                  {errors.pair || ' '}
                </HelperText>

                {filteredPairs.length > 0 && (
                  <Surface style={styles.dropdown} elevation={2}>
                    {filteredPairs.slice(0, 8).map(({ room, tenant }) => (
                      <TouchableOpacity
                        key={`${room.id}-${tenant.id}`}
                        style={styles.dropdownItem}
                        onPress={() => selectPair({ room, tenant })}
                        disabled={saving}
                      >
                        <Text style={{ fontWeight: '800' }}>
                          {(room.name || '-') + ' - ' + (tenant.name || '-')}
                        </Text>
                        <Text style={{ color: '#666', fontSize: 12, marginTop: 2 }}>
                          Rent: {room.rent ? formatMoney(Number(room.rent)) : '-'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </Surface>
                )}

                {pairQuery.trim().length > 0 && filteredPairs.length === 0 && (
                  <Text style={{ color: '#777', marginTop: 8 }}>
                    No occupied rooms found.
                  </Text>
                )}
              </>
            ) : (
              <Surface style={styles.selectedTile} elevation={1}>
                <Avatar.Icon size={36} icon="home-city-outline" />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={{ fontWeight: '800' }}>
                    {(selectedRoom.name || '-') + ' - ' + (selectedTenant.name || '-')}
                  </Text>
                  <Text style={{ color: '#666', marginTop: 2 }}>
                    Rent {selectedRoom.rent ? formatMoney(Number(selectedRoom.rent)) : '-'}
                  </Text>
                </View>
                <IconButton
                  icon="close"
                  disabled={saving}
                  onPress={() => {
                    setSelectedRoom(null);
                    setSelectedTenant(null);
                    setPairQuery('');
                    setPreviousMeter(0);
                    setCurrentMeter('');
                  }}
                />
              </Surface>
            )}
          </Surface>

          {/* METER + ADHOC */}
          <Surface style={styles.section} elevation={2}>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Meter & Charges
            </Text>

            <Surface style={styles.readingRow} elevation={0}>
              <Icon source="counter" size={20} color={theme.colors.primary} />
              <View style={{ marginLeft: 10 }}>
                <Text style={{ fontWeight: '700' }}>Previous reading</Text>
                <Text style={{ color: '#666', marginTop: 2 }}>{previousMeter}</Text>
              </View>
            </Surface>

            <TextInput
              label="Current Meter Reading *"
              value={currentMeter}
              onChangeText={(t) => {
                const next = t.replace(/[^\d]/g, '');
                setCurrentMeter(next);
                setErrors((p) => ({ ...p, currentMeter: '' }));
              }}
              mode="outlined"
              keyboardType="number-pad"
              left={<TextInput.Icon icon="counter" />}
              error={!!errors.currentMeter}
              editable={!saving}
            />
            <HelperText type="error" visible={!!errors.currentMeter}>
              {errors.currentMeter || ' '}
            </HelperText>

            <TextInput
              label="Ad-hoc Amount"
              value={adHocAmount}
              onChangeText={(t) => {
                const next = t.replace(/[^\d]/g, '');
                setAdHocAmount(next);
                setErrors((p) => ({ ...p, adHocAmount: '' }));
              }}
              mode="outlined"
              keyboardType="number-pad"
              left={<TextInput.Icon icon="cash-plus" />}
              error={!!errors.adHocAmount}
              editable={!saving}
            />
            <HelperText type="error" visible={!!errors.adHocAmount}>
              {errors.adHocAmount || ' '}
            </HelperText>

            <TextInput
              label="Ad-hoc Comment"
              value={adHocComment}
              onChangeText={setAdHocComment}
              mode="outlined"
              multiline
              left={<TextInput.Icon icon="comment-text-outline" />}
              editable={!saving}
            />
          </Surface>

          {/* SUMMARY */}
          <Surface style={styles.section} elevation={2}>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Summary
            </Text>

            <SummaryRow label="Rent" value={formatMoney(rent)} />
            <SummaryRow label="Water" value={formatMoney(water)} />
            <SummaryRow
              label={`Electricity (${diffUnits} units × ${settings.electricity_unit})`}
              value={formatMoney(electricity)}
            />
            <SummaryRow label="Ad-hoc" value={formatMoney(adHoc)} />

            <View style={styles.summaryDivider} />
            <SummaryRow label="Total" value={formatMoney(total)} bold />
          </Surface>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <FAB
        icon="content-save"
        style={styles.fab}
        loading={saving}
        disabled={saving}
        onPress={save}
      />
    </>
  );
}

const SummaryRow = ({ label, value, bold }: { label: string; value: string; bold?: boolean }) => (
  <View style={styles.summaryRow}>
    <Text style={[styles.summaryLabel, bold && { fontWeight: '800' }]}>{label}</Text>
    <Text style={[styles.summaryValue, bold && { fontWeight: '800' }]}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 120, backgroundColor: '#F4F6FA' },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  hero: {
    borderRadius: 18,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },

  section: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontWeight: '600',
    marginBottom: 12,
  },

  dropdown: {
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFF',
  },

  selectedTile: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    backgroundColor: '#EEF2FF',
  },

  occupancyHint: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 12,
    backgroundColor: '#F6F8FF',
    marginBottom: 12,
  },

  readingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 12,
    backgroundColor: '#F6F8FF',
    marginBottom: 12,
  },

  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  summaryLabel: { color: '#555', flex: 1, marginRight: 12 },
  summaryValue: { fontWeight: '700' },
  summaryDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#E5E7EB',
    marginVertical: 10,
  },

  fab: { position: 'absolute', right: 16, bottom: 24 },
});

