import React from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  ActivityIndicator,
  Button,
  HelperText,
  Surface,
  Text,
  TextInput,
  useTheme,
} from 'react-native-paper';
import supabase from '../../service/SupabaseClient';

type Errors = Partial<
  Record<'propertyName' | 'propertyAddress' | 'water' | 'electricity', string>
>;

export default function SettingScreen() {
  const theme = useTheme();

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
      } else {
        setRecordId(null);
        setPropertyName('');
        setPropertyAddress('');
        setWater('');
        setElectricity('');
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

  /* ---------------- LOADER ---------------- */

  if (initialLoading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  /* ---------------- UI ---------------- */

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Surface style={styles.card} elevation={4}>
        <Text
          variant="headlineMedium"
          style={[styles.title, { color: theme.colors.primary }]}
        >
          Property Settings
        </Text>

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
          contentStyle={styles.buttonContent}
        >
          Save
        </Button>
      </Surface>
    </ScrollView>
  );
}

/* ---------------- FIELD COMPONENT ---------------- */

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
  container: {
    flexGrow: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    padding: 16,
    borderRadius: 12,
  },
  title: {
    marginBottom: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  field: {
    marginBottom: 12,
  },
  primaryButton: {
    marginTop: 8,
  },
  buttonContent: {
    paddingVertical: 6,
  },
});
