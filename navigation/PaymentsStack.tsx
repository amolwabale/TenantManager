
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import PaymentScreen from '../screen/Payment/PaymentScreen';
import PaymentFormScreen from '../screen/Payment/PaymentFormScreen';

const Stack = createNativeStackNavigator();

export default function PaymentsStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="PaymentList"
        component={PaymentScreen}
        options={{ title: 'Payments' }}
      />
      <Stack.Screen
        name="PaymentForm"
        component={PaymentFormScreen}
        options={{ title: 'Add Payment' }}
      />
    </Stack.Navigator>
  );
}

