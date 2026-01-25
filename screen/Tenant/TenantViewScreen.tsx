import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { Alert, Linking, ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Avatar, Button, IconButton, Surface, Text } from 'react-native-paper';
import { TenantStackParamList } from '../../navigation/StackParam';
import { fetchTenantById, TenantRecord } from '../../service/tenantService';

type Props = NativeStackScreenProps<TenantStackParamList, 'TenantView'>;

export default function TenantViewScreen() {
  const route = useRoute<Props['route']>();
  const navigation = useNavigation<Props['navigation']>();
  const { tenantId } = route.params;

  const [tenant, setTenant] = React.useState<TenantRecord | null>(null);
  const [loading, setLoading] = React.useState(false);

  const load = React.useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchTenantById(tenantId);
      if (!data) {
        Alert.alert('Not found', 'Tenant could not be loaded', [{ text: 'OK', onPress: () => navigation.goBack() }]);
        return;
      }
      setTenant(data);
    } catch (err: any) {
      Alert.alert('Load Failed', err.message || 'Could not load tenant', [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } finally {
      setLoading(false);
    }
  }, [tenantId, navigation]);

  useFocusEffect(
    React.useCallback(() => {
      load();
    }, [load]),
  );

  if (loading || !tenant) {
    return (
      
        <View style={styles.loaderContainer}>
          <ActivityIndicator />
        </View>
      
    );
  }

  const openLink = (url?: string | null) => {
    if (!url) return;
    Linking.openURL(url);
  };

  return (
    
      <ScrollView contentContainerStyle={styles.container}>
        <Surface style={styles.card} elevation={4}>
          <View style={styles.headerRow}>
            <Text variant="headlineMedium" style={styles.title}>
              Tenant Details
            </Text>
            <IconButton icon="pencil" onPress={() => navigation.navigate('TenantForm', { mode: 'edit', tenantId })} />
          </View>

          <View style={styles.avatarRow}>
            <AvatarDisplay uri={(tenant as any).profile_photo_url as string | undefined} size={88} />
          </View>

          <InfoRow label="Full Name" value={tenant.name} />
          <InfoRow label="Mobile" value={tenant.mobile} />
          <InfoRow label="Alternate Mobile" value={tenant.alternate_mobile} />
          <InfoRow label="Total Family Members" value={tenant.total_family_members} />
          <InfoRow label="Address" value={tenant.address} />
          <InfoRow label="Company Name" value={tenant.company_name} />

          <DocRow label="Aadhaar" url={tenant.adhar_card_url} onPress={() => openLink(tenant.adhar_card_url)} />
          <DocRow label="PAN" url={tenant.pan_card_url} onPress={() => openLink(tenant.pan_card_url)} />
          <DocRow label="Agreement" url={tenant.agreement_url} onPress={() => openLink(tenant.agreement_url)} />
        </Surface>
      </ScrollView>
  );
}

const InfoRow = ({ label, value }: { label: string; value?: string | null }) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue}>{value || '-'}</Text>
  </View>
);

const DocRow = ({ label, url, onPress }: { label: string; url?: string | null; onPress: () => void }) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>{label}</Text>
    {url ? (
      <Button mode="text" onPress={onPress} compact>
        View
      </Button>
    ) : (
      <Text style={styles.infoValue}>Not uploaded</Text>
    )}
  </View>
);

const AvatarDisplay = ({ uri, size }: { uri?: string; size: number }) => {
  if (uri) {
    return <Avatar.Image size={size} source={{ uri }} style={styles.avatar} />;
  }
  return <Avatar.Icon size={size} icon="account" style={styles.avatar} />;
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  container: {
    flexGrow: 1,
    padding: 16,
  },
  card: {
    padding: 16,
    borderRadius: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: {
    fontWeight: '600',
  },
  avatarRow: {
    alignItems: 'center',
    marginVertical: 12,
  },
  avatar: {
    backgroundColor: '#eee',
  },
  infoRow: {
    marginBottom: 10,
  },
  infoLabel: {
    fontWeight: '600',
    marginBottom: 2,
  },
  infoValue: {
    color: '#555',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
