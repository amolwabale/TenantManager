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
  Button,
  FAB,
  IconButton,
  Surface,
  Text,
} from 'react-native-paper';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RoomStackParamList } from '../../navigation/StackParam';
import { deleteRoom, fetchRooms, RoomRecord } from '../../service/RoomService';

type Nav = NativeStackNavigationProp<RoomStackParamList, 'RoomList'>;

export default function RoomScreen() {
  const navigation = useNavigation<Nav>();

  const [initialLoading, setInitialLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [rooms, setRooms] = React.useState<RoomRecord[]>([]);

  const loadRooms = React.useCallback(async (isRefresh = false) => {
    try {
      isRefresh ? setRefreshing(true) : setInitialLoading(true);
      const data = await fetchRooms();
      setRooms(data || []);
    } catch (err: any) {
      Alert.alert('Load Failed', err.message || 'Could not load rooms');
    } finally {
      isRefresh ? setRefreshing(false) : setInitialLoading(false);
    }
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      loadRooms(false);
    }, [loadRooms]),
  );

  const handleDelete = (id: number) => {
    Alert.alert('Delete Room', 'Are you sure you want to delete this room?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            setRefreshing(true);
            await deleteRoom(id);
            await loadRooms(true);
          } catch (err: any) {
            Alert.alert('Delete Failed', err.message || 'Could not delete room');
          } finally {
            setRefreshing(false);
          }
        },
      },
    ]);
  };

  const renderItem = ({ item }: { item: RoomRecord }) => (
    <RoomCard
      item={item}
      onPress={() => navigation.navigate('RoomView', { roomId: item.id })}
      onEdit={() =>
        navigation.navigate('RoomForm', { roomId: item.id, mode: 'edit' })
      }
      onDelete={() => handleDelete(item.id)}
    />
  );

  return (
    <View style={styles.container}>
      {initialLoading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" />
        </View>
      ) : rooms.length === 0 ? (
        <EmptyState onAdd={() => navigation.navigate('RoomForm', { mode: 'add' })} />
      ) : (
        <FlatList
          data={rooms}
          renderItem={renderItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadRooms(true)}
            />
          }
        />
      )}

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => navigation.navigate('RoomForm', { mode: 'add' })}
      />
    </View>
  );
}

/* ---------------- CARD ---------------- */

const RoomCard = ({
  item,
  onPress,
  onEdit,
  onDelete,
}: {
  item: RoomRecord;
  onPress: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) => (
  <TouchableOpacity activeOpacity={0.8} onPress={onPress}>
    <Surface style={styles.card} elevation={2}>
      <View style={styles.cardRow}>
        <Avatar.Icon size={48} icon="home" />

        <View style={styles.cardBody}>
          <Text variant="titleMedium" style={styles.cardTitle}>
            {item.name || '-'}
          </Text>
          <Text style={styles.cardSubtitle}>Type: {item.type || '-'}</Text>
          <Text style={styles.cardCaption}>Rent: ₹{item.rent || '-'}</Text>
        </View>

        <View style={styles.actions}>
          <IconButton icon="pencil" size={18} onPress={onEdit} />
          <IconButton icon="delete" size={18} onPress={onDelete} />
        </View>
      </View>
    </Surface>
  </TouchableOpacity>
);

/* ---------------- EMPTY ---------------- */

const EmptyState = ({ onAdd }: { onAdd: () => void }) => (
  <View style={styles.emptyState}>
    <Avatar.Icon size={72} icon="home-outline" style={styles.emptyIcon} />
    <Text variant="titleMedium" style={styles.emptyTitle}>
      No rooms yet
    </Text>
    <Text style={styles.emptySubtitle}>
      Add rooms to manage rent, deposits and details.
    </Text>
    <Button mode="contained" onPress={onAdd}>
      Add Room
    </Button>
  </View>
);

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F6FA' },
  listContent: { padding: 16, paddingBottom: 120 },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: { borderRadius: 16, padding: 14, marginBottom: 12 },
  cardRow: { flexDirection: 'row', alignItems: 'center' },
  cardBody: { flex: 1, marginLeft: 12 },
  cardTitle: { fontWeight: '600' },
  cardSubtitle: { color: '#555', marginTop: 2 },
  cardCaption: { color: '#777', fontSize: 12, marginTop: 2 },
  actions: { flexDirection: 'row' },
  fab: { position: 'absolute', right: 16, bottom: 24 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  emptyIcon: { marginBottom: 16, backgroundColor: '#E0E0E0' },
  emptyTitle: { fontWeight: '600', marginBottom: 6 },
  emptySubtitle: { color: '#666', textAlign: 'center', marginBottom: 16 },
});
