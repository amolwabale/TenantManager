import React from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import {
  ActivityIndicator,
  Avatar,
  Button,
  HelperText,
  Surface,
  Text,
  TextInput,
  useTheme,
} from 'react-native-paper';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import supabase from '../../service/SupabaseClient';
import { RootStackParamList } from '../../navigation/StackParam';

type Errors = Partial<
  Record<'propertyName' | 'propertyAddress' | 'water' | 'electricity', string>
>;

type RootNav = NativeStackNavigationProp<RootStackParamList>;

export default function SettingScreen() {
  const theme = useTheme();
  const navigation = useNavigation<RootNav>();

  /* ---------------- FORM STATE ---------------- */

  const [propertyName, setPropertyName] = React.useState('');
  const [propertyAddress, setPropertyAddress] = React.useState('');
  const [water, setWater] = React.useState('');
  const [electricity, setElectricity] = React.useState('');
  const [recordId, setRecordId] = React.useState<number | null>(null);

  /* ---------------- UI STATE ---------------- */

  const [initialLoading, setInitialLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [errors, setErrors] = React.useState<Errors>({});

  /* ---------------- FETCH SETTINGS ---------------- */

  const fetchSettings = React.useCallback(async () => {
    let active = true;

    try {
      setInitialLoading(true);

      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;

      const userId = userData.user?.id;
      if (!userId) throw new Error('User not found. Please login again.');

      const { data, error } = await supabase
        .from('setting')
        .select('*')
        .eq('user_id', userId)
        .order('modified_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!active) return;
      if (error) throw error;

      if (data) {
        setRecordId(data.id ?? null);
        setPropertyName(data.property_name ?? '');
        setPropertyAddress(data.property_address ?? '');
        setWater(data.water != null ? String(data.water) : '');
        setElectricity(
          data.electricity_unit != null ? String(data.electricity_unit) : '',
        );
      }
    } catch (err: any) {
      Alert.alert('Load Failed', err.message || 'Could not load settings');
    } finally {
      setInitialLoading(false);
    }

    return () => {
      active = false;
    };
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      fetchSettings();
    }, [fetchSettings]),
  );

  /* ---------------- VALIDATION ---------------- */

  const validate = () => {
    const nextErrors: Errors = {};

    if (!propertyName.trim()) {
      nextErrors.propertyName = 'Property name is required';
    }
    if (water && isNaN(Number(water))) {
      nextErrors.water = 'Water must be a number';
    }
    if (electricity && isNaN(Number(electricity))) {
      nextErrors.electricity = 'Electricity unit must be a number';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  /* ---------------- SAVE ---------------- */

  const handleSave = async () => {
    if (!validate()) return;

    try {
      setSaving(true);

      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;

      const userId = userData.user?.id;
      if (!userId) throw new Error('User not found. Please login again.');

      const payload = {
        property_name: propertyName.trim(),
        property_address: propertyAddress.trim() || null,
        water: water ? Number(water) : null,
        electricity_unit: electricity ? Number(electricity) : null,
        user_id: userId,
        modified_at: new Date().toISOString(),
      };

      let result;

      if (recordId) {
        result = await supabase
          .from('setting')
          .update(payload)
          .eq('id', recordId)
          .eq('user_id', userId)
          .select()
          .maybeSingle();
      } else {
        result = await supabase
          .from('setting')
          .insert(payload)
          .select()
          .maybeSingle();
      }

      if (result.error) {
        throw new Error(result.error.message);
      }

      Alert.alert('Saved', 'Settings have been saved successfully.');

      if (result.data?.id) {
        setRecordId(result.data.id);
      }
    } catch (err: any) {
      Alert.alert('Save Failed', err.message || 'Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  /* ---------------- LOGOUT ---------------- */

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await supabase.auth.signOut();
            navigation.reset({
              index: 0,
              routes: [{ name: 'AuthStack' }],
            });
          },
        },
      ],
    );
  };

  if (initialLoading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
      {/* ---------- HERO ---------- */}
      <Surface style={styles.hero} elevation={3}>
        <Avatar.Icon size={56} icon="office-building-outline" />
        <View style={{ marginLeft: 16 }}>
          <Text variant="titleLarge" style={styles.heroTitle}>
            Property Settings
          </Text>
          <Text style={styles.heroSubtitle}>
            Manage your property configuration
          </Text>
        </View>
      </Surface>

      {/* ---------- PROPERTY ---------- */}
      <Surface style={styles.section} elevation={2}>
        <SectionTitle title="Property Details" />

        <Field
          label="Property Name *"
          value={propertyName}
          error={errors.propertyName}
          onChange={setPropertyName}
        />

        <Field
          label="Property Address"
          value={propertyAddress}
          error={errors.propertyAddress}
          onChange={setPropertyAddress}
          multiline
        />
      </Surface>

      {/* ---------- UTILITIES ---------- */}
      <Surface style={styles.section} elevation={2}>
        <SectionTitle title="Utility Charges" />

        <Field
          label="Water (numeric)"
          value={water}
          error={errors.water}
          onChange={setWater}
          keyboardType="numeric"
        />

        <Field
          label="Electricity Unit (numeric)"
          value={electricity}
          error={errors.electricity}
          onChange={setElectricity}
          keyboardType="numeric"
        />

        <Button
          mode="contained"
          onPress={handleSave}
          loading={saving}
          disabled={saving}
          style={styles.primaryButton}
        >
          Save Settings
        </Button>
      </Surface>

      {/* ---------- ACCOUNT ---------- */}
      <Surface style={styles.dangerSection} elevation={1}>
        <SectionTitle title="Account" />

        <Button
          mode="outlined"
          textColor="#D32F2F"
          style={styles.logoutButton}
          onPress={handleLogout}
        >
          Logout
        </Button>
      </Surface>
    </ScrollView>
  );
}

/* ---------------- HELPERS ---------------- */

const SectionTitle = ({ title }: { title: string }) => (
  <Text variant="titleMedium" style={styles.sectionTitle}>
    {title}
  </Text>
);

const Field = ({
  label,
  value,
  onChange,
  error,
  keyboardType,
  multiline,
}: any) => (
  <View style={styles.field}>
    <TextInput
      label={label}
      mode="outlined"
      value={value}
      onChangeText={onChange}
      keyboardType={keyboardType}
      multiline={multiline}
      error={!!error}
    />
    <HelperText type="error" visible={!!error}>
      {error || ' '}
    </HelperText>
  </View>
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
    paddingBottom: 40,
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
  dangerSection: {
    borderRadius: 16,
    padding: 16,
  },
  sectionTitle: {
    fontWeight: '600',
    marginBottom: 12,
  },

  field: {
    marginBottom: 12,
  },

  primaryButton: {
    marginTop: 8,
  },
  logoutButton: {
    borderColor: '#D32F2F',
  },

  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
