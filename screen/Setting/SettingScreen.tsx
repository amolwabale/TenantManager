import React from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  Button,
  HelperText,
  Surface,
  Text,
  TextInput,
  useTheme,
} from 'react-native-paper';
import supabase from '../../service/SupabaseClient';

type Errors = Partial<Record<'propertyName' | 'propertyAddress' | 'water' | 'electricity', string>>;

export default function SettingScreen() {
  const theme = useTheme();
  const [propertyName, setPropertyName] = React.useState('');
  const [propertyAddress, setPropertyAddress] = React.useState('');
  const [water, setWater] = React.useState('');
  const [electricity, setElectricity] = React.useState('');
  const [recordId, setRecordId] = React.useState<number | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [errors, setErrors] = React.useState<Errors>({});

  const fetchSettings = React.useCallback(async () => {
    try {
      setLoading(true);
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

      if (error) throw error;

      if (data) {
        setRecordId(data.id ?? null);
        setPropertyName(data.property_name ?? '');
        setPropertyAddress(data.property_address ?? '');
        setWater(
          data.water === null || data.water === undefined ? '' : String(data.water),
        );
        setElectricity(
          data.electricity_unit === null || data.electricity_unit === undefined
            ? ''
            : String(data.electricity_unit),
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
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      fetchSettings();
    }, [fetchSettings]),
  );

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

  const handleSave = async () => {
    if (!validate()) return;

    try {
      setLoading(true);
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      const userId = userData.user?.id;
      if (!userId) throw new Error('User not found. Please login again.');

      const waterValue = water ? Number(water) : null;
      const electricityValue = electricity ? Number(electricity) : null;

      let data: any = null;
      let error: any = null;

      if (recordId) {
        ({ data, error } = await supabase
          .from('setting')
          .update({
            property_name: propertyName.trim(),
            property_address: propertyAddress.trim() || null,
            water: waterValue,
            electricity_unit: electricityValue,
            user_id: userId,
            modified_at: new Date().toISOString(),
          })
          .eq('id', recordId)
          .eq('user_id', userId)
          .select()
          .maybeSingle());
      } else {
        ({ data, error } = await supabase
          .from('setting')
          .insert({
            property_name: propertyName.trim(),
            property_address: propertyAddress.trim() || null,
            water: waterValue,
            electricity_unit: electricityValue,
            user_id: userId,
          })
          .select()
          .maybeSingle());
      }

      if (error) {
        throw new Error(error.message);
      }

      Alert.alert('Saved', 'Settings have been saved successfully.');
      if (data?.id) {
        setRecordId(data.id);
      }
    } catch (err: any) {
      Alert.alert('Save Failed', err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Surface style={styles.card} elevation={4}>
        <Text variant="headlineMedium" style={[styles.title, { color: theme.colors.primary }]}>
          Property Settings
        </Text>

        <View style={styles.field}>
          <TextInput
            label="Property Name *"
            mode="outlined"
            value={propertyName}
            onChangeText={(text) => {
              setPropertyName(text);
              setErrors((prev) => ({ ...prev, propertyName: '' }));
            }}
            error={!!errors.propertyName}
          />
          <HelperText type="error" visible={!!errors.propertyName}>
            {errors.propertyName || ' '}
          </HelperText>
        </View>

        <View style={styles.field}>
          <TextInput
            label="Property Address"
            mode="outlined"
            multiline
            value={propertyAddress}
            onChangeText={(text) => {
              setPropertyAddress(text);
              setErrors((prev) => ({ ...prev, propertyAddress: '' }));
            }}
            error={!!errors.propertyAddress}
          />
          <HelperText type="error" visible={!!errors.propertyAddress}>
            {errors.propertyAddress || ' '}
          </HelperText>
        </View>

        <View style={styles.field}>
          <TextInput
            label="Water (numeric)"
            mode="outlined"
            keyboardType="numeric"
            value={water}
            onChangeText={(text) => {
              setWater(text);
              setErrors((prev) => ({ ...prev, water: '' }));
            }}
            error={!!errors.water}
          />
          <HelperText type="error" visible={!!errors.water}>
            {errors.water || ' '}
          </HelperText>
        </View>

        <View style={styles.field}>
          <TextInput
            label="Electricity Unit (numeric)"
            mode="outlined"
            keyboardType="numeric"
            value={electricity}
            onChangeText={(text) => {
              setElectricity(text);
              setErrors((prev) => ({ ...prev, electricity: '' }));
            }}
            error={!!errors.electricity}
          />
          <HelperText type="error" visible={!!errors.electricity}>
            {errors.electricity || ' '}
          </HelperText>
        </View>

        <Button
          mode="contained"
          onPress={handleSave}
          disabled={loading}
          style={styles.primaryButton}
          contentStyle={styles.buttonContent}
          loading={loading}
        >
          Save
        </Button>
      </Surface>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
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
