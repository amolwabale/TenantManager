import { useFocusEffect, useNavigation } from '@react-navigation/native';
import React from 'react';
import { Alert, FlatList, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ActivityIndicator,
  Avatar,
  Button,
  FAB,
  IconButton,
  Surface,
  Text,
  useTheme,
} from 'react-native-paper';
import { TenantStackParamList } from '../../navigation/StackParam';
import { deleteTenant, fetchTenants, TenantRecord } from '../../service/tenantService';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

type Nav = NativeStackNavigationProp<TenantStackParamList, 'TenantList'>;

export default function TenantScreen() {
  const theme = useTheme();
  const navigation = useNavigation<Nav>();
  const [loading, setLoading] = React.useState(false);
  const [tenants, setTenants] = React.useState<TenantRecord[]>([]);
  const insets = useSafeAreaInsets();

  const load = React.useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchTenants();
      setTenants(data || []);
    } catch (err: any) {
      Alert.alert('Load Failed', err.message || 'Could not load tenants');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      load();
    }, [load]),
  );

  const handleDelete = (id: number) => {
    Alert.alert('Delete Tenant', 'Are you sure you want to delete this tenant?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            setLoading(true);
            await deleteTenant(id);
            await load();
          } catch (err: any) {
            Alert.alert('Delete Failed', err.message || 'Could not delete tenant');
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  const renderItem = ({ item }: { item: TenantRecord }) => (
    <TenantCard
      item={item}
      onPress={() => navigation.navigate('TenantView', { tenantId: item.id })}
      onEdit={() => navigation.navigate('TenantForm', { tenantId: item.id, mode: 'edit' })}
      onDelete={() => handleDelete(item.id)}
    />
  );

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={[styles.safeArea, { paddingTop: insets.top }]}
    >
      {loading && tenants.length === 0 ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator />
        </View>
      ) : tenants.length === 0 ? (
        <EmptyState onAdd={() => navigation.navigate('TenantForm', { mode: 'add' })} />
      ) : (
        <FlatList
          data={tenants}
          renderItem={renderItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          refreshing={loading}
          onRefresh={load}
        />
      )}

      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        color="white"
        onPress={() => navigation.navigate('TenantForm', { mode: 'add' })}
      />
    </SafeAreaView>
  );
}

const TenantCard = ({
  item,
  onPress,
  onEdit,
  onDelete,
}: {
  item: TenantRecord;
  onPress: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) => {
  const photo = (item as any).profile_photo_url as string | undefined;
  return (
    <Surface style={styles.card} elevation={2}>
      <View style={styles.cardRow}>
        <AvatarDisplay uri={photo} size={48} />
        <View style={styles.cardBody}>
          <Text variant="titleMedium" style={styles.cardTitle} onPress={onPress}>
            {item.name || '-'}
          </Text>
          <Text variant="bodyMedium" style={styles.cardSubtitle} onPress={onPress}>
            {item.mobile || '-'}
          </Text>
          <Text variant="bodySmall" style={styles.cardCaption} onPress={onPress}>
            Family: {item.total_family_members || '-'}
          </Text>
        </View>
        <View style={styles.actions}>
          <IconButton icon="pencil" size={18} onPress={onEdit} />
          <IconButton icon="delete" size={18} onPress={onDelete} />
        </View>
      </View>
    </Surface>
  );
};

const AvatarDisplay = ({ uri, size }: { uri?: string; size: number }) => {
  if (uri) {
    return <Avatar.Image size={size} source={{ uri }} style={styles.avatar} />;
  }
  return <Avatar.Icon size={size} icon="account" style={styles.avatar} />;
};

const EmptyState = ({ onAdd }: { onAdd: () => void }) => (
  <View style={styles.emptyState}>
    <Text variant="titleMedium" style={styles.emptyTitle}>
      No tenants added yet
    </Text>
    <Text style={styles.emptySubtitle}>Start by adding your first tenant.</Text>
    <Button mode="contained" onPress={onAdd} style={styles.emptyButton}>
      Add Tenant
    </Button>
  </View>
);

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f5f5f5' },
  listContent: { padding: 12, paddingBottom: 96 },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  cardRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: { marginRight: 12, backgroundColor: '#eee' },
  cardBody: { flex: 1 },
  cardTitle: { fontWeight: '600' },
  cardSubtitle: { color: '#444' },
  cardCaption: { color: '#666' },
  actions: { flexDirection: 'row' },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 24,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyTitle: { marginBottom: 8, fontWeight: '600' },
  emptySubtitle: { marginBottom: 16, color: '#666' },
  emptyButton: {},
});
