import { NavigationContainer } from '@react-navigation/native';
import BottomTabs from '../navigation/BottomTabs';
import RegisterScreen from '../screen/Identity/RegisterScreen';
import LoginScreen from '../screen/Identity/AuthScreen';
import IdentityStack from '../navigation/IdentityStack';

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <IdentityStack />
    </NavigationContainer>
  );
}
