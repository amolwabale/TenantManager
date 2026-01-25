import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import {
  ActivityIndicator,
  Avatar,
  FAB,
  HelperText,
  Surface,
  Text,
  TextInput,
} from 'react-native-paper';
import { RoomStackParamList } from '../../navigation/StackParam';
import { fetchRoomById, saveRoom } from '../../service/RoomService';

type Props = NativeStackScreenProps<RoomStackParamList, 'RoomForm'>;

export default function RoomFormScreen() {
  const navigation = useNavigation();
  const route = useRoute<Props['route']>();

  const params = route.params;
  const mode = params?.mode ?? 'add';
  const roomId = mode === 'edit' ? params?.roomId : undefined;

  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  const [name, setName] = React.useState('');
  const [type, setType] = React.useState('');
  const [area, setArea] = React.useState('');
  const [rent, setRent] = React.useState('');
  const [deposit, setDeposit] = React.useState('');
  const [comment, setComment] = React.useState('');

  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const load = React.useCallback(async () => {
    if (mode !== 'edit' || !roomId) return;
    try {
      setLoading(true);
      const r = await fetchRoomById(roomId);
      if (!r) return;
      setName(r.name || '');
      setType(r.type || '');
      setArea(r.area || '');
      setRent(r.rent || '');
      setDeposit(r.deposit || '');
      setComment(r.comment || '');
    } finally {
      setLoading(false);
    }
  }, [mode, roomId]);

  useFocusEffect(
    React.useCallback(() => {
      load();
    }, [load]),
  );

  const validate = () => {
    const e: Record<string, string> = {};

    if (!name.trim()) e.name = 'Required';
    if (!type.trim()) e.type = 'Required';

    if (!rent.trim()) e.rent = 'Required';
    else if (!/^\d+$/.test(rent)) e.rent = 'Numbers only';

    if (!deposit.trim()) e.deposit = 'Required';
    else if (!/^\d+$/.test(deposit)) e.deposit = 'Numbers only';

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const save = async () => {
    if (!validate()) return;
    try {
      setSaving(true);
      await saveRoom({
        id: mode === 'edit' ? roomId : undefined,
        name,
        type,
        area,
        rent,
        deposit,
        comment,
      });
      Alert.alert('Saved', 'Room saved successfully', [
        { text: 'OK', onPress: navigation.goBack },
      ]);
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
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
        >
          {/* ---------- HERO ---------- */}
          <Surface style={styles.hero} elevation={3}>
            <Avatar.Icon size={56} icon="home-city-outline" />
            <View style={{ marginLeft: 16 }}>
              <Text variant="titleLarge" style={styles.heroTitle}>
                {mode === 'edit' ? 'Edit Room' : 'Add Room'}
              </Text>
              <Text style={styles.heroSubtitle}>
                Basic details & financials
              </Text>
            </View>
          </Surface>

          {/* ---------- PRIMARY DETAILS ---------- */}
          <Surface style={styles.section} elevation={2}>
            <SectionTitle title="Room Information" />

            <Input label="Room Name *" value={name} onChange={setName} error={errors.name} />
            <Input label="Type *" value={type} onChange={setType} error={errors.type} />
            <Input label="Area (sq ft)" value={area} onChange={setArea} />
          </Surface>

          {/* ---------- FINANCIAL ---------- */}
          <Surface style={styles.section} elevation={2}>
            <SectionTitle title="Financial Details" />

            <Input
              label="Rent (₹) *"
              value={rent}
              onChange={setRent}
              keyboard="number-pad"
              error={errors.rent}
            />
            <Input
              label="Deposit (₹) *"
              value={deposit}
              onChange={setDeposit}
              keyboard="number-pad"
              error={errors.deposit}
            />
          </Surface>

          {/* ---------- NOTES ---------- */}
          <Surface style={styles.section} elevation={2}>
            <SectionTitle title="Additional Notes" />
            <Input label="Comment" value={comment} onChange={setComment} multiline />
          </Surface>
        </ScrollView>
      </KeyboardAvoidingView>

      <FAB
        icon="content-save"
        style={styles.fab}
        loading={saving}
        onPress={save}
      />
    </>
  );
}

/* ---------------- HELPERS ---------------- */

const SectionTitle = ({ title }: { title: string }) => (
  <Text variant="titleMedium" style={styles.sectionTitle}>
    {title}
  </Text>
);

const Input = ({ label, value, onChange, error, keyboard, multiline }: any) => (
  <>
    <TextInput
      label={label}
      value={value}
      onChangeText={onChange}
      mode="outlined"
      keyboardType={keyboard}
      multiline={multiline}
      style={{ marginBottom: 6 }}
      error={!!error}
    />
    <HelperText type="error" visible={!!error}>
      {error || ' '}
    </HelperText>
  </>
);

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: '#F4F6FA',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 16,
    paddingBottom: 120,
  },

  hero: {
    borderRadius: 18,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  heroTitle: {
    fontWeight: '700',
  },
  heroSubtitle: {
    color: '#666',
    marginTop: 4,
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

  fab: {
    position: 'absolute',
    right: 16,
    bottom: 24,
  },

  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
