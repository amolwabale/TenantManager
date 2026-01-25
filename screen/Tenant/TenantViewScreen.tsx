import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { Alert, Linking, ScrollView, StyleSheet, View } from 'react-native';
import {
  ActivityIndicator,
  Avatar,
  Button,
  FAB,
  IconButton,
  Surface,
  Text,
} from 'react-native-paper';
import { TenantStackParamList } from '../../navigation/StackParam';
import { fetchTenantById, TenantRecord } from '../../service/tenantService';
import { supabase } from '../../service/SupabaseClient'; // ✅ REQUIRED

type Props = NativeStackScreenProps<TenantStackParamList, 'TenantView'>;

export default function TenantViewScreen() {
  const route = useRoute<Props['route']>();
  const navigation = useNavigation<Props['navigation']>();
  const { tenantId } = route.params;

  const [tenant, setTenant] = React.useState<TenantRecord | null>(null);
  const [profileSignedUrl, setProfileSignedUrl] = React.useState<string | undefined>();
  const [loading, setLoading] = React.useState(false);

  const createSignedUrl = async (fullUrl?: string | null) => {
    if (!fullUrl) return undefined;

    try {
      const marker = '/tenant-manager/';
      const index = fullUrl.indexOf(marker);
      if (index === -1) return undefined;

      const filePath = fullUrl.substring(index + marker.length);

      const { data, error } = await supabase.storage
        .from('tenant-manager')
        .createSignedUrl(filePath, 60 * 60); // 1 hour

      if (error) {
        console.warn('Signed URL error:', error.message);
        return undefined;
      }

      return data.signedUrl;
    } catch {
      return undefined;
    }
  };

  const load = React.useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchTenantById(tenantId);
      if (!data) {
        Alert.alert('Not found', 'Tenant could not be loaded', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
        return;
      }

      setTenant(data);

      // 🔐 Generate signed URL for profile photo
      const signed = await createSignedUrl(
        (data as any).profile_photo_url
      );
      setProfileSignedUrl(signed);
    } catch (err: any) {
      Alert.alert('Load Failed', err.message || 'Could not load tenant', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
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
      <View style={styles.loader}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const openLink = (url?: string | null) => {
    if (!url) return;
    Linking.openURL(url);
  };

  return (
    <>
      <ScrollView contentContainerStyle={styles.container}>
        {/* HERO */}
        <Surface style={styles.hero} elevation={2}>
          <AvatarDisplay uri={profileSignedUrl} size={88} />
          <View style={styles.heroText}>
            <Text variant="titleLarge" style={styles.tenantName}>
              {tenant.name}
            </Text>
            <Text style={styles.subText}>{tenant.mobile}</Text>
          </View>
        </Surface>

        {/* PERSONAL INFO */}
        <Section title="Personal Information">
          <InfoRow icon="phone" label="Mobile" value={tenant.mobile} />
          <InfoRow icon="phone-plus" label="Alternate Mobile" value={tenant.alternate_mobile} />
          <InfoRow
            icon="account-group"
            label="Family Members"
            value={tenant.total_family_members}
          />
        </Section>

        {/* ADDRESS */}
        <Section title="Address & Work">
          <InfoRow icon="map-marker" label="Address" value={tenant.address} />
          <InfoRow icon="office-building" label="Company" value={tenant.company_name} />
        </Section>

        {/* DOCUMENTS */}
        <Section title="Documents">
          <View style={styles.docGrid}>
            <DocTile
              icon="card-account-details"
              label="Aadhaar"
              url={tenant.adhar_card_url}
              onPress={() => openLink(tenant.adhar_card_url)}
            />
            <DocTile
              icon="card-bulleted"
              label="PAN"
              url={tenant.pan_card_url}
              onPress={() => openLink(tenant.pan_card_url)}
            />
            <DocTile
              icon="file-document"
              label="Agreement"
              url={tenant.agreement_url}
              onPress={() => openLink(tenant.agreement_url)}
            />
          </View>
        </Section>
      </ScrollView>

      {/* FLOATING EDIT */}
      <FAB
        icon="pencil"
        style={styles.fab}
        onPress={() =>
          navigation.navigate('TenantForm', { mode: 'edit', tenantId })
        }
      />
    </>
  );
}

/* ---------------- UI COMPONENTS ---------------- */

const Section = ({ title, children }: any) => (
  <Surface style={styles.section} elevation={2}>
    <Text variant="titleMedium" style={styles.sectionTitle}>
      {title}
    </Text>
    {children}
  </Surface>
);

const InfoRow = ({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value?: string | number | null;
}) => (
  <View style={styles.infoRow}>
    <IconButton icon={icon} size={18} />
    <View>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value ?? '-'}</Text>
    </View>
  </View>
);

const DocTile = ({
  icon,
  label,
  url,
  onPress,
}: {
  icon: string;
  label: string;
  url?: string | null;
  onPress: () => void;
}) => (
  <Surface style={styles.docTile} elevation={1}>
    <IconButton icon={icon} size={28} />
    <Text style={styles.docLabel}>{label}</Text>
    {url ? (
      <Button mode="text" onPress={onPress}>
        View
      </Button>
    ) : (
      <Text style={styles.muted}>Not uploaded</Text>
    )}
  </Surface>
);

const AvatarDisplay = ({ uri, size }: { uri?: string; size: number }) =>
  uri ? (
    <Avatar.Image size={size} source={{ uri }} />
  ) : (
    <Avatar.Icon size={size} icon="account" />
  );

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 120,
    backgroundColor: '#F4F6FA',
  },

  hero: {
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  heroText: {
    flex: 1,
    marginLeft: 16,
  },
  tenantName: {
    fontWeight: '700',
  },
  subText: {
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

  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 12,
    color: '#888',
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '500',
  },

  docGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  docTile: {
    width: '48%',
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
  },
  docLabel: {
    fontWeight: '600',
    marginVertical: 6,
  },
  muted: {
    color: '#999',
    fontSize: 12,
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
