
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import TenantScreen from '../screen/Tenant/TenantScreen';

const Stack = createNativeStackNavigator();

export default function TenantStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="TenantScreen" component={TenantScreen} />
    </Stack.Navigator>
  );
}

