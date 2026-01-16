
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import PaymentScreen from '../screen/Payment/PaymentScreen';

const Stack = createNativeStackNavigator();

export default function PaymentsStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="PaymentScreen" component={PaymentScreen} />
    </Stack.Navigator>
  );
}

