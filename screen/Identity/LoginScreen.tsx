import { CompositeNavigationProp, useNavigation } from '@react-navigation/native';
import * as React from 'react';
import { View, StyleSheet, Alert, ScrollView } from 'react-native';
import {
  Button,
  Text,
  Surface,
  TextInput,
  HelperText,
  useTheme,
  ActivityIndicator,
} from 'react-native-paper';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList, RootStackParamList } from '../../navigation/StackParam';
import { Login } from '../../service/IdentityService';

type AuthNav = NativeStackNavigationProp<AuthStackParamList, 'LoginScreen'>;
type RootNav = NativeStackNavigationProp<RootStackParamList>;

export default function LoginScreen() {
  const theme = useTheme();
  const navigation = useNavigation<CompositeNavigationProp<AuthNav, RootNav>>();

  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [loading, setLoading] = React.useState(false);

  const handleBack = () => {
    navigation.navigate('AuthScreen');
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Enter a valid email';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;

    try {
      setLoading(true);
      const result = await Login(email, password);
      const user = result.data?.user;

      if (!user || result.error) {
        Alert.alert('Invalid email or password');
        return;
      };

    } catch (error: any) {
      Alert.alert('Login Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Surface style={styles.card} elevation={4}>
        <Text
          variant="headlineMedium"
          style={[styles.title, { color: theme.colors.primary }]}
        >
          Login
        </Text>

        <Text variant="bodyMedium" style={styles.subtitle}>
          Enter your credentials to continue
        </Text>

        {/* Email */}
        <View style={styles.field}>
          <TextInput
            label="Email *"
            mode="outlined"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              setErrors({ ...errors, email: '' });
            }}
            error={!!errors.email}
          />
          <HelperText type="error" visible>
            {errors.email || ' '}
          </HelperText>
        </View>

        {/* Password */}
        <View style={styles.field}>
          <TextInput
            label="Password *"
            mode="outlined"
            secureTextEntry
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              setErrors({ ...errors, password: '' });
            }}
            error={!!errors.password}
          />
          <HelperText type="error" visible>
            {errors.password || ' '}
          </HelperText>
        </View>

        <View style={styles.buttonRow}>
          <Button
            mode="outlined"
            onPress={handleBack}
            style={styles.secondaryButton}
            contentStyle={styles.buttonContent}
            disabled={loading}
          >
            Back
          </Button>

          <Button
            mode="contained"
            onPress={handleLogin}
            style={styles.primaryButton}
            contentStyle={styles.buttonContent}
            disabled={loading}
          >
            Login
          </Button>
        </View>

        {loading && (
          <ActivityIndicator style={{ marginTop: 16 }} />
        )}
      </Surface>
    </ScrollView>
  );
}


const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    padding: 28,
    borderRadius: 16,
  },
  title: {
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 24,
    opacity: 0.7,
  },
  field: {
    marginBottom: 12, // ✅ consistent spacing
  },
  button: {
    marginTop: 16,
  },
  buttonContent: {
    paddingVertical: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12, // RN >= 0.71
    marginTop: 16,
  },
  primaryButton: {
    flex: 1,
  },
  secondaryButton: {
    flex: 1,
  },
  
});
