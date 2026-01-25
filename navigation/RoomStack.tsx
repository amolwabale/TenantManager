
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import RoomScreen from '../screen/Room/RoomScreen';
import RoomFormScreen from '../screen/Room/RoomFormScreen';
import { RoomStackParamList } from './StackParam';
import RoomViewScreen from '../screen/Room/RoomViewScreen';


const Stack = createNativeStackNavigator<RoomStackParamList>();

export function RoomStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="RoomList"
        component={RoomScreen}
        options={{ title: 'Rooms' }}
      />
      <Stack.Screen
        name="RoomForm"
        component={RoomFormScreen}
        options={{ title: 'Room' }}
      />
      <Stack.Screen
        name="RoomView"
        component={RoomViewScreen}
        options={{ title: 'Room Details' }}
      />
    </Stack.Navigator>
  );
}

