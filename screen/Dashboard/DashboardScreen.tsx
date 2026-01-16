import { View, Text } from 'react-native';
import { useTheme } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

export default function DashboardScreen() {
  return (
    <View>
      <MaterialCommunityIcons name="home" size={24} color="red" />

      <Text>Dashboard</Text>
    </View>
  );
}
