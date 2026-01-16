
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import RoomScreen from '../screen/Room/RoomScreen';

const Stack = createNativeStackNavigator();

export default function RoomsStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="RoomScreen" component={RoomScreen} />
    </Stack.Navigator>
  );
}

