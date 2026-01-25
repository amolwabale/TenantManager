
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TenantStackParamList } from './StackParam';
import TenantScreen from '../screen/Tenant/TenantScreen.tsx';
import TenantFormScreen from '../screen/Tenant/TenantFormScreen.tsx';
import TenantViewScreen from '../screen/Tenant/TenantViewScreen.tsx';

const Stack = createNativeStackNavigator<TenantStackParamList>();

export default function TenantStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="TenantList" component={TenantScreen} />
      <Stack.Screen name="TenantForm" component={TenantFormScreen} />
      <Stack.Screen name="TenantView" component={TenantViewScreen} />
    </Stack.Navigator>
  );
}

