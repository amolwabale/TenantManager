
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import SettingScreen from '../screen/Setting/SettingScree';

const Stack = createNativeStackNavigator();

export default function SettingsStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="SettingScreen" component={SettingScreen} />
    </Stack.Navigator>
  );
}

