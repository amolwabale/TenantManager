import { useFocusEffect, useNavigation } from '@react-navigation/native';
import React from 'react';
import { Alert, FlatList, StyleSheet, TouchableOpacity, View } from 'react-native';
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
import { TenantStackParamList } from '../../navigation/StackParam';
import { deleteTenant, fetchTenants, TenantRecord } from '../../service/tenantService';

type Nav = NativeStackNavigationProp<TenantStackParamList, 'TenantList'>;

export default function TenantScreen() {
  const navigation = useNavigation<Nav>();
  const [loading, setLoading] = React.useState(false);
  const [tenants, setTenants] = React.useState<TenantRecord[]>([]);

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
    <View style={styles.container}>
      {loading && tenants.length === 0 ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" />
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
        style={styles.fab}
        onPress={() => navigation.navigate('TenantForm', { mode: 'add' })}
      />
    </View>
  );
}

/* ---------------- CARD ---------------- */

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
    <TouchableOpacity activeOpacity={0.8} onPress={onPress}>
      <Surface style={styles.card} elevation={2}>
        <View style={styles.cardRow}>
          <AvatarDisplay uri={photo} size={48} />

          <View style={styles.cardBody}>
            <Text variant="titleMedium" style={styles.cardTitle}>
              {item.name || '-'}
            </Text>
            <Text style={styles.cardSubtitle}>{item.mobile || '-'}</Text>
            <Text style={styles.cardCaption}>
              Family Members: {item.total_family_members || '-'}
            </Text>
          </View>

          <View style={styles.actions}>
            <IconButton icon="pencil" size={18} onPress={onEdit} />
            <IconButton icon="delete" size={18} onPress={onDelete} />
          </View>
        </View>
      </Surface>
    </TouchableOpacity>
  );
};

const AvatarDisplay = ({ uri, size }: { uri?: string; size: number }) =>
  uri ? (
    <Avatar.Image size={size} source={{ uri }} />
  ) : (
    <Avatar.Icon size={size} icon="account" />
  );

/* ---------------- EMPTY STATE ---------------- */

const EmptyState = ({ onAdd }: { onAdd: () => void }) => (
  <View style={styles.emptyState}>
    <Avatar.Icon size={72} icon="account-group" style={styles.emptyIcon} />
    <Text variant="titleMedium" style={styles.emptyTitle}>
      No tenants yet
    </Text>
    <Text style={styles.emptySubtitle}>
      Add tenants to manage profiles, documents, and billing.
    </Text>
    <Button mode="contained" onPress={onAdd}>
      Add Tenant
    </Button>
  </View>
);

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F6FA',
  },

  listContent: {
    padding: 16,
    paddingBottom: 120,
  },

  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  card: {
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardBody: {
    flex: 1,
    marginLeft: 12,
  },
  cardTitle: {
    fontWeight: '600',
  },
  cardSubtitle: {
    color: '#555',
    marginTop: 2,
  },
  cardCaption: {
    color: '#777',
    fontSize: 12,
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
  },

  fab: {
    position: 'absolute',
    right: 16,
    bottom: 24,
  },

  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyIcon: {
    marginBottom: 16,
    backgroundColor: '#E0E0E0',
  },
  emptyTitle: {
    fontWeight: '600',
    marginBottom: 6,
  },
  emptySubtitle: {
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
});
