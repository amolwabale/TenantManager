import { NavigationContainer } from '@react-navigation/native';
import BottomTabs from '../navigation/MainTabs';
import RegisterScreen from '../screen/Identity/RegisterScreen';
import LoginScreen from '../screen/Identity/AuthScreen';
import AuthStack from '../navigation/AuthStack';

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <AuthStack />
    </NavigationContainer>
  );
}
