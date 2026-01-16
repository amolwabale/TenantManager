
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import DashboardScreen from '../screen/Dashboard/DashboardScreen';

const Stack = createNativeStackNavigator();

export default function DashboardStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="DashboardScreen" component={DashboardScreen} />
    </Stack.Navigator>
  );
}
