import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import {
  ActivityIndicator,
  Avatar,
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
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
      >
        {/* HERO */}
        <Surface style={styles.hero} elevation={3}>
          <Avatar.Icon size={64} icon="home-city-outline" />
          <View style={styles.heroText}>
            <Text variant="titleLarge" style={styles.roomName}>
              {room.name || 'Room'}
            </Text>
            <Text style={styles.roomType}>{room.type}</Text>
          </View>
        </Surface>

        {/* HIGHLIGHTS */}
        <View style={styles.highlightRow}>
          <HighlightCard icon="ruler-square" label="Area (sq ft)" value={`${room.area ?? '-'}`} />
          <HighlightCard icon="currency-inr" label="Rent (₹)" value={`₹${room.rent ?? '-'}`} />
          <HighlightCard icon="bank" label="Deposit (₹)" value={`₹${room.deposit ?? '-'}`} />
        </View>

        {/* DETAILS */}
        <Surface style={styles.section} elevation={2}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Additional Details
          </Text>
          <InfoRow icon="comment-text-outline" label="Comment" value={room.comment} />
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

/* ---------------- COMPONENTS ---------------- */

const HighlightCard = ({ icon, label, value }: any) => (
  <Surface style={styles.highlightCard} elevation={2}>
    <IconButton icon={icon} size={22} />
    <Text style={styles.highlightLabel}>{label}</Text>
    <Text style={styles.highlightValue}>{value}</Text>
  </Surface>
);

const InfoRow = ({ icon, label, value }: any) => (
  <View style={styles.infoRow}>
    <IconButton icon={icon} size={18} />
    <View style={{ flex: 1 }}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value || '-'}</Text>
    </View>
  </View>
);

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: '#F4F6FA',
  },

  scrollContent: {
    flexGrow: 1,            // ✅ KEY FIX
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
  heroText: {
    marginLeft: 16,
  },
  roomName: {
    fontWeight: '700',
  },
  roomType: {
    color: '#666',
    marginTop: 4,
  },

  highlightRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  highlightCard: {
    width: '31%',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
  },
  highlightLabel: {
    fontSize: 12,
    color: '#777',
    marginTop: 4,
  },
  highlightValue: {
    fontWeight: '700',
    marginTop: 4,
  },

  section: {
    borderRadius: 16,
    padding: 16,
  },
  sectionTitle: {
    fontWeight: '600',
    marginBottom: 12,
  },

  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoLabel: {
    fontSize: 12,
    color: '#888',
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '500',
    marginTop: 2,
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
