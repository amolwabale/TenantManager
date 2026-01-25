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
import { TenantStackParamList } from '../../navigation/StackParam';
import { deleteTenant, fetchTenants, TenantRecord } from '../../service/tenantService';
import { supabase } from '../../service/SupabaseClient';

type Nav = NativeStackNavigationProp<TenantStackParamList, 'TenantList'>;

export default function TenantScreen() {
  const navigation = useNavigation<Nav>();

  const [initialLoading, setInitialLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);

  const [tenants, setTenants] = React.useState<TenantRecord[]>([]);
  const [signedUrls, setSignedUrls] = React.useState<Record<number, string>>({});

  /* ---------------- SIGNED URL ---------------- */

  const createSignedUrl = async (fullUrl?: string | null) => {
    if (!fullUrl) return undefined;

    const marker = '/tenant-manager/';
    const index = fullUrl.indexOf(marker);
    if (index === -1) return undefined;

    const filePath = fullUrl.substring(index + marker.length);

    const { data, error } = await supabase.storage
      .from('tenant-manager')
      .createSignedUrl(filePath, 60 * 60);

    if (error) {
      console.warn('Signed URL error:', error.message);
      return undefined;
    }

    return data.signedUrl;
  };

  /* ---------------- LOAD TENANTS ---------------- */

  const loadTenants = React.useCallback(async (isRefresh = false) => {
    let active = true;

    try {
      isRefresh ? setRefreshing(true) : setInitialLoading(true);

      const data = await fetchTenants();
      if (!active) return;

      setTenants(data || []);

      // 🔥 Signed URLs in background (non-blocking)
      generateSignedUrls(data || []);
    } catch (err: any) {
      Alert.alert('Load Failed', err.message || 'Could not load tenants');
    } finally {
      isRefresh ? setRefreshing(false) : setInitialLoading(false);
    }

    return () => {
      active = false;
    };
  }, []);

  /* ---------------- BACKGROUND SIGNED URL LOAD ---------------- */

  const generateSignedUrls = async (data: TenantRecord[]) => {
    const map: Record<number, string> = {};

    await Promise.all(
      data.map(async (t) => {
        const signed = await createSignedUrl(
          (t as any).profile_photo_url,
        );
        if (signed) map[t.id] = signed;
      }),
    );

    setSignedUrls(map);
  };

  /* ---------------- FOCUS EFFECT ---------------- */

  useFocusEffect(
    React.useCallback(() => {
      loadTenants(false);
    }, [loadTenants]),
  );

  /* ---------------- DELETE ---------------- */

  const handleDelete = (id: number) => {
    Alert.alert('Delete Tenant', 'Are you sure you want to delete this tenant?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            setRefreshing(true);
            await deleteTenant(id);
            await loadTenants(true);
          } catch (err: any) {
            Alert.alert('Delete Failed', err.message || 'Could not delete tenant');
          } finally {
            setRefreshing(false);
          }
        },
      },
    ]);
  };

  /* ---------------- RENDER ITEM ---------------- */

  const renderItem = ({ item }: { item: TenantRecord }) => (
    <TenantCard
      item={item}
      photoUrl={signedUrls[item.id]}
      onPress={() => navigation.navigate('TenantView', { tenantId: item.id })}
      onEdit={() =>
        navigation.navigate('TenantForm', { tenantId: item.id, mode: 'edit' })
      }
      onDelete={() => handleDelete(item.id)}
    />
  );

  /* ---------------- UI ---------------- */

  return (
    <View style={styles.container}>
      {initialLoading ? (
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
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadTenants(true)}
            />
          }
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
  photoUrl,
  onPress,
  onEdit,
  onDelete,
}: {
  item: TenantRecord;
  photoUrl?: string;
  onPress: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) => (
  <TouchableOpacity activeOpacity={0.8} onPress={onPress}>
    <Surface style={styles.card} elevation={2}>
      <View style={styles.cardRow}>
        <AvatarDisplay uri={photoUrl} size={50} />

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
