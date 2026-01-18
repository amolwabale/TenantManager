
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import RegisterScreen from '../screen/Identity/RegisterScreen';
import { StackParamList } from './StackParam';
import AuthScreen from '../screen/Identity/AuthScreen';
import LoginScreen from '../screen/Identity/LoginScreen';

const Stack = createNativeStackNavigator();
  

export default function IdentityStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="AuthScreen" component={AuthScreen} />
      <Stack.Screen name="LoginScreen" component={LoginScreen} />
      <Stack.Screen name="RegisterScreen" component={RegisterScreen} />
    </Stack.Navigator>
  );
}

