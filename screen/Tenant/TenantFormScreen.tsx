import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import {
  ActivityIndicator,
  Avatar,
  Button,
  HelperText,
  IconButton,
  Surface,
  Text,
  TextInput,
  useTheme,
} from 'react-native-paper';
import DocumentPicker, { types as docTypes } from 'react-native-document-picker';
import { launchImageLibrary } from 'react-native-image-picker';
import { TenantStackParamList } from '../../navigation/StackParam';
import {
  fetchTenantById,
  FileInput,
  saveTenant,
  TenantRecord,
} from '../../service/tenantService';

type FileState = { file?: FileInput | null; url?: string | null };

type Props = NativeStackScreenProps<TenantStackParamList, 'TenantForm'>;

const isNumeric = (value: string) => /^\d+$/.test(value);
const isMobile = (value: string) => /^\d{10}$/.test(value);

export default function TenantFormScreen() {
  const theme = useTheme();
  const navigation = useNavigation();
  const route = useRoute<Props['route']>();
  const { mode, tenantId } = route.params || { mode: 'add' as const };

  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [tenant, setTenant] = React.useState<TenantRecord | null>(null);
  const [name, setName] = React.useState('');
  const [mobile, setMobile] = React.useState('');
  const [alternateMobile, setAlternateMobile] = React.useState('');
  const [familyMembers, setFamilyMembers] = React.useState('');
  const [address, setAddress] = React.useState('');
  const [company, setCompany] = React.useState('');
  const [profile, setProfile] = React.useState<FileState>({});
  const [adhar, setAdhar] = React.useState<FileState>({});
  const [pan, setPan] = React.useState<FileState>({});
  const [agreement, setAgreement] = React.useState<FileState>({});
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const setFromTenant = (t: TenantRecord) => {
    setTenant(t);
    setName(t.name || '');
    setMobile(t.mobile || '');
    setAlternateMobile(t.alternate_mobile || '');
    setFamilyMembers(t.total_family_members || '');
    setAddress(t.address || '');
    setCompany(t.company_name || '');
    setProfile({ url: (t as any).profile_photo_url || null });
    setAdhar({ url: t.adhar_card_url || null });
    setPan({ url: t.pan_card_url || null });
    setAgreement({ url: t.agreement_url || null });
  };

  const loadTenant = React.useCallback(async () => {
    if (mode !== 'edit' || !tenantId) return;
    try {
      setLoading(true);
      const data = await fetchTenantById(tenantId);
      if (!data) {
        Alert.alert('Not found', 'Tenant could not be loaded.');
        navigation.goBack();
        return;
      }
      setFromTenant(data);
    } catch (err: any) {
      Alert.alert('Load Failed', err.message || 'Could not load tenant');
    } finally {
      setLoading(false);
    }
  }, [mode, tenantId, navigation]);

  useFocusEffect(
    React.useCallback(() => {
      loadTenant();
    }, [loadTenant]),
  );

  const validate = () => {
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = 'Full name is required';
    if (!mobile.trim()) next.mobile = 'Mobile number is required';
    else if (!isMobile(mobile.trim())) next.mobile = 'Enter a valid 10 digit mobile';
    if (alternateMobile && !isNumeric(alternateMobile)) {
      next.alternateMobile = 'Enter numbers only';
    }
    if (familyMembers && !isNumeric(familyMembers)) {
      next.familyMembers = 'Enter numbers only';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const pickPhoto = async () => {
    try {
      const res = await launchImageLibrary({
        mediaType: 'photo',
        selectionLimit: 1,
      });
      const asset = res.assets?.[0];
      if (!asset || !asset.uri) return;
      setProfile({
        file: {
          uri: asset.uri,
          name: asset.fileName || 'photo.jpg',
          type: asset.type || 'image/jpeg',
        },
        url: null,
      });
    } catch (err) {
      Alert.alert('Photo pick failed', 'Unable to select photo');
    }
  };

  const pickFile = async (setter: (f: FileState) => void, allowImagesOnly?: boolean) => {
    try {
      const res = await DocumentPicker.pickSingle({
        type: allowImagesOnly ? [docTypes.images] : [docTypes.images, docTypes.pdf],
        copyTo: 'cachesDirectory',
      });
      setter({
        file: { uri: res.fileCopyUri || res.uri, name: res.name || 'file', type: res.type || undefined },
        url: null,
      });
    } catch (err) {
      if (!DocumentPicker.isCancel(err)) {
        Alert.alert('File pick failed', 'Unable to select file');
      }
    }
  };

  const removeFile = (setter: (f: FileState) => void) => setter({ file: null, url: null });

  const handleSave = async () => {
    if (!validate()) return;
    try {
      setSaving(true);
      const saved = await saveTenant({
        id: mode === 'edit' ? tenantId : undefined,
        name,
        mobile,
        alternate_mobile: alternateMobile,
        total_family_members: familyMembers,
        address,
        company_name: company,
        files: {
          profile,
          adhar,
          pan,
          agreement,
        },
      });
      setTenant(saved || null);
      Alert.alert('Success', 'Tenant saved successfully', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      Alert.alert('Save Failed', err.message || 'Could not save tenant');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <Surface style={styles.card} elevation={4}>
          <Text variant="headlineMedium" style={[styles.title, { color: theme.colors.primary }]}>
            {mode === 'edit' ? 'Edit Tenant' : 'Add Tenant'}
          </Text>

          <View style={styles.avatarRow}>
            <AvatarDisplay uri={profile.url || undefined} size={72} />
            <Button mode="outlined" onPress={pickPhoto} style={styles.avatarBtn}>
              {profile.url || profile.file ? 'Change Photo' : 'Upload Photo'}
            </Button>
            {(profile.url || profile.file) && (
              <IconButton icon="close" onPress={() => removeFile(setProfile)} />
            )}
          </View>

          <TextInput
            label="Full Name *"
            mode="outlined"
            value={name}
            onChangeText={(t) => {
              setName(t);
              setErrors((prev) => ({ ...prev, name: '' }));
            }}
            error={!!errors.name}
            style={styles.input}
          />
          <HelperText type="error" visible={!!errors.name}>
            {errors.name || ' '}
          </HelperText>

          <TextInput
            label="Mobile Number *"
            mode="outlined"
            keyboardType="number-pad"
            value={mobile}
            onChangeText={(t) => {
              setMobile(t);
              setErrors((prev) => ({ ...prev, mobile: '' }));
            }}
            error={!!errors.mobile}
            style={styles.input}
          />
          <HelperText type="error" visible={!!errors.mobile}>
            {errors.mobile || ' '}
          </HelperText>

          <TextInput
            label="Alternate Mobile"
            mode="outlined"
            keyboardType="number-pad"
            value={alternateMobile}
            onChangeText={(t) => {
              setAlternateMobile(t);
              setErrors((prev) => ({ ...prev, alternateMobile: '' }));
            }}
            error={!!errors.alternateMobile}
            style={styles.input}
          />
          <HelperText type="error" visible={!!errors.alternateMobile}>
            {errors.alternateMobile || ' '}
          </HelperText>

          <TextInput
            label="Total Family Members"
            mode="outlined"
            keyboardType="number-pad"
            value={familyMembers}
            onChangeText={(t) => {
              setFamilyMembers(t);
              setErrors((prev) => ({ ...prev, familyMembers: '' }));
            }}
            error={!!errors.familyMembers}
            style={styles.input}
          />
          <HelperText type="error" visible={!!errors.familyMembers}>
            {errors.familyMembers || ' '}
          </HelperText>

          <TextInput
            label="Address"
            mode="outlined"
            multiline
            value={address}
            onChangeText={(t) => setAddress(t)}
            style={styles.input}
          />

          <TextInput
            label="Company Name"
            mode="outlined"
            value={company}
            onChangeText={(t) => setCompany(t)}
            style={styles.input}
          />

          <FileRow
            label="Aadhaar Card"
            state={adhar}
            onPick={() => pickFile(setAdhar)}
            onRemove={() => removeFile(setAdhar)}
          />
          <FileRow
            label="PAN Card"
            state={pan}
            onPick={() => pickFile(setPan)}
            onRemove={() => removeFile(setPan)}
          />
          <FileRow
            label="Agreement"
            state={agreement}
            onPick={() => pickFile(setAgreement)}
            onRemove={() => removeFile(setAgreement)}
          />

          <Button
            mode="contained"
            onPress={handleSave}
            loading={saving}
            disabled={saving}
            style={styles.saveButton}
            contentStyle={styles.saveButtonContent}
          >
            Save
          </Button>
        </Surface>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const FileRow = ({
  label,
  state,
  onPick,
  onRemove,
}: {
  label: string;
  state: FileState;
  onPick: () => void;
  onRemove: () => void;
}) => {
  return (
    <View style={styles.fileRow}>
      <Text style={styles.fileLabel}>{label}</Text>
      <View style={styles.fileActions}>
        <Button mode="outlined" onPress={onPick} style={styles.fileButton}>
          {state.file || state.url ? 'Change' : 'Upload'}
        </Button>
        {(state.file || state.url) && (
          <IconButton icon="close" size={18} onPress={onRemove} />
        )}
      </View>
      {(state.file || state.url) && (
        <Text style={styles.fileName}>{state.file?.name || state.url}</Text>
      )}
    </View>
  );
};

const AvatarDisplay = ({ uri, size }: { uri?: string; size: number }) => {
  if (uri) {
    return <Avatar.Image size={size} source={{ uri }} style={styles.avatar} />;
  }
  return <Avatar.Icon size={size} icon="account" style={styles.avatar} />;
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flexGrow: 1,
    padding: 16,
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
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  avatar: { backgroundColor: '#eee' },
  avatarBtn: { marginLeft: 8 },
  input: { marginBottom: 4 },
  fileRow: {
    marginTop: 12,
    marginBottom: 8,
  },
  fileLabel: {
    fontWeight: '600',
    marginBottom: 6,
  },
  fileActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fileButton: {
    marginRight: 4,
  },
  fileName: {
    marginTop: 4,
    color: '#555',
  },
  saveButton: { marginTop: 16 },
  saveButtonContent: { paddingVertical: 6 },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
