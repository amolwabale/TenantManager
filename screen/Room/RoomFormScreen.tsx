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
  
    if (!rent.trim()) {
      e.rent = 'Required';
    } else if (!/^\d+$/.test(rent)) {
      e.rent = 'Numbers only';
    }
  
    if (!deposit.trim()) {
      e.deposit = 'Required';
    } else if (!/^\d+$/.test(deposit)) {
      e.deposit = 'Numbers only';
    }
  
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
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.container}>
          <Surface style={styles.section} elevation={2}>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Room Details
            </Text>

            <Input label="Room Name *" value={name} onChange={setName} error={errors.name} />
            <Input label="Type *" value={type} onChange={setType} error={errors.type} />
            <Input label="Area (sq ft)" value={area} onChange={setArea} />
            <Input
              label="Rent *"
              value={rent}
              onChange={setRent}
              keyboard="number-pad"
              error={errors.rent}
            />
            <Input
              label="Deposit *"
              value={deposit}
              onChange={setDeposit}
              keyboard="number-pad"
              error={errors.deposit}
            />
            <Input label="Comment" value={comment} onChange={setComment} multiline />
          </Surface>
        </ScrollView>
      </KeyboardAvoidingView>

      <FAB icon="content-save" style={styles.fab} loading={saving} onPress={save} />
    </>
  );
}

/* ---------------- HELPERS ---------------- */

const Input = ({ label, value, onChange, error, keyboard, multiline }: any) => (
  <>
    <TextInput
      label={label}
      value={value}
      onChangeText={onChange}
      mode="outlined"
      keyboardType={keyboard}
      multiline={multiline}
      style={{ marginBottom: 4 }}
      error={!!error}
    />
    <HelperText type="error" visible={!!error}>
      {error || ' '}
    </HelperText>
  </>
);

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 120, backgroundColor: '#F4F6FA' },
  section: { borderRadius: 16, padding: 16 },
  sectionTitle: { fontWeight: '600', marginBottom: 12 },
  fab: { position: 'absolute', right: 16, bottom: 24 },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
