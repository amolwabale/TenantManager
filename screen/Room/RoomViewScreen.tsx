import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import {
  ActivityIndicator,
  FAB,
  IconButton,
  Surface,
  Text,
} from 'react-native-paper';
import { RoomStackParamList } from '../../navigation/StackParam';
import { fetchRoomById, RoomRecord } from '../../service/RoomService';

type Props = NativeStackScreenProps<RoomStackParamList, 'RoomView'>;

export default function RoomViewScreen() {
  const route = useRoute<Props['route']>();
  const navigation = useNavigation<Props['navigation']>();
  const { roomId } = route.params;

  const [room, setRoom] = React.useState<RoomRecord | null>(null);
  const [loading, setLoading] = React.useState(false);

  const load = React.useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchRoomById(roomId);
      if (!data) {
        Alert.alert('Not found', 'Room not found', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
        return;
      }
      setRoom(data);
    } finally {
      setLoading(false);
    }
  }, [roomId, navigation]);

  useFocusEffect(
    React.useCallback(() => {
      load();
    }, [load]),
  );

  if (loading || !room) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <>
      <ScrollView contentContainerStyle={styles.container}>
        <Surface style={styles.section} elevation={2}>
          <InfoRow icon="home" label="Room Name" value={room.name} />
          <InfoRow icon="format-list-bulleted" label="Type" value={room.type} />
          <InfoRow icon="ruler-square" label="Area (sq ft)" value={room.area} />
          <InfoRow icon="currency-inr" label="Rent (₹)" value={room.rent} />
          <InfoRow icon="bank" label="Deposit (₹)" value={room.deposit} />
          <InfoRow icon="comment-text" label="Comment" value={room.comment} />
        </Surface>
      </ScrollView>

      <FAB
        icon="pencil"
        style={styles.fab}
        onPress={() =>
          navigation.navigate('RoomForm', { mode: 'edit', roomId })
        }
      />
    </>
  );
}

const InfoRow = ({ icon, label, value }: any) => (
  <View style={styles.infoRow}>
    <IconButton icon={icon} size={18} />
    <View>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value ?? '-'}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 120, backgroundColor: '#F4F6FA' },
  section: { borderRadius: 16, padding: 16 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  infoLabel: { fontSize: 12, color: '#888' },
  infoValue: { fontSize: 15, fontWeight: '500' },
  fab: { position: 'absolute', right: 16, bottom: 24 },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
