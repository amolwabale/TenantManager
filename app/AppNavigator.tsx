import { NavigationContainer } from '@react-navigation/native';
import BottomTabs from '../navigation/BottomTabs';

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <BottomTabs />
    </NavigationContainer>
  );
}
