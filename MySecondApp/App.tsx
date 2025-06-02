import React, {useState, useEffect, ReactNode} from 'react';
import {View, StatusBar, StyleSheet} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import {
  createBottomTabNavigator,
  BottomTabBarProps,
} from '@react-navigation/bottom-tabs';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import OnboardingScreen from './src/screens/OnboardingScreen';
import PaymentScreen from './src/screens/PaymentScreen';
import PreviewScreen from './src/screens/PreviewScreen';
import SuccessScreen from './src/screens/SuccessScreen';
import PaymentHistoryScreen from './src/screens/PaymentHistoryScreen';
import MeterDetailsScreen from './src/screens/MeterDetailsScreen';

const RootStack = createNativeStackNavigator<any>();
const PaymentStack = createNativeStackNavigator<any>();
const Tab = createBottomTabNavigator<any>();

function PaymentStackNavigator() {
  return (
    <PaymentStack.Navigator
      screenOptions={{
        headerStyle: {backgroundColor: 'transparent'},
        headerTransparent: true,
        headerTintColor: '#fff',
        headerTitleStyle: {fontWeight: '600', fontSize: 18},
        headerBackground: () => (
          <LinearGradient
            colors={['#667eea', '#764ba2']}
            start={{x: 0, y: 0}}
            end={{x: 1, y: 0}}
            style={{flex: 1}}
          />
        ),
      }}>
      <PaymentStack.Screen
        name="Payment"
        component={PaymentScreen}
        options={{title: 'Make Payment'}}
      />
      <PaymentStack.Screen
        name="MeterDetails"
        component={MeterDetailsScreen}
        options={{title: 'Meter Details'}}
      />
      <PaymentStack.Screen
        name="Preview"
        component={PreviewScreen}
        options={{title: 'Payment Preview'}}
      />
      <PaymentStack.Screen
        name="Success"
        component={SuccessScreen}
        options={{headerShown: false}}
      />
    </PaymentStack.Navigator>
  );
}

function CustomTabBar({state, descriptors, navigation}: BottomTabBarProps) {
  return (
    <View style={styles.tabBarContainer}>
      <LinearGradient
        colors={['rgba(102, 126, 234, 0.9)', 'rgba(118, 75, 162, 0.9)']}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 0}}
        style={styles.tabBarGradient}>
        <View style={styles.tabBar}>
          {state.routes.map((route, index) => {
            const {options} = descriptors[route.key];
            const isFocused = state.index === index;

            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            };

            let iconName = 'ellipse-outline';
            if (route.name === 'Home') {
              iconName = isFocused ? 'home' : 'home-outline';
            } else if (route.name === 'History') {
              iconName = isFocused ? 'time' : 'time-outline';
            }

            return (
              <View
                key={route.name}
                style={[styles.tabItem, isFocused && styles.activeTabItem]}>
                <View
                  style={[
                    styles.tabButton,
                    isFocused && styles.activeTabButton,
                  ]}>
                  <Icon
                    name={iconName}
                    size={24}
                    color={isFocused ? '#fff' : 'rgba(255, 255, 255, 0.6)'}
                    onPress={onPress}
                  />
                </View>
                {isFocused && <View style={styles.activeIndicator} />}
              </View>
            );
          })}
        </View>
      </LinearGradient>
    </View>
  );
}

function MainTabNavigator() {
  return (
    <Tab.Navigator
      tabBar={props => <CustomTabBar {...props} />}
      screenOptions={{
        headerStyle: {
          backgroundColor: 'transparent',
          shadowColor: 'transparent',
        },
        headerTransparent: true,
        headerTintColor: '#fff',
        headerTitleStyle: {fontWeight: '600', fontSize: 20},
        headerBackground: () => (
          <LinearGradient
            colors={['#667eea', '#764ba2']}
            start={{x: 0, y: 0}}
            end={{x: 1, y: 0}}
            style={{flex: 1}}
          />
        ),
      }}>
      <Tab.Screen
        name="Home"
        component={PaymentStackNavigator}
        options={{headerShown: false, tabBarLabel: 'Home'}}
      />
      <Tab.Screen
        name="History"
        component={PaymentHistoryScreen}
        options={{title: 'Payment History', tabBarLabel: 'History'}}
      />
    </Tab.Navigator>
  );
}

function OnboardingWrapper({navigation}: {navigation: any}) {
  const handleOnboardingComplete = async () => {
    try {
      await AsyncStorage.setItem('hasSeenOnboarding', 'true');
      navigation.replace('MainTabs');
    } catch (error) {
      console.error('Error saving onboarding status:', error);
    }
  };

  return <OnboardingScreen onComplete={handleOnboardingComplete} />;
}

function RootNavigator({isFirstTime}: {isFirstTime: boolean}) {
  return (
    <RootStack.Navigator screenOptions={{headerShown: false}}>
      <RootStack.Screen name="Onboarding" component={OnboardingWrapper} />

      <RootStack.Screen name="MainTabs" component={MainTabNavigator} />
    </RootStack.Navigator>
  );
}

export default function App() {
  const [isFirstTime, setIsFirstTime] = useState<boolean | null>(null);

  useEffect(() => {
    checkFirstTimeUser();
  }, []);

  const checkFirstTimeUser = async () => {
    try {
      const hasSeenOnboarding = await AsyncStorage.getItem('hasSeenOnboarding');
      setIsFirstTime(hasSeenOnboarding === null);
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      setIsFirstTime(true);
    }
  };

  if (isFirstTime === null) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#667eea" />
        <LinearGradient
          colors={['#667eea', '#764ba2']}
          style={styles.loadingGradient}>
          <Icon name="wallet" size={60} color="#fff" />
        </LinearGradient>
      </View>
    );
  }

  return (
    <>
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />
      <NavigationContainer>
        <RootNavigator isFirstTime={isFirstTime} />
      </NavigationContainer>
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {flex: 1},
  loadingGradient: {flex: 1, justifyContent: 'center', alignItems: 'center'},
  tabBarContainer: {
    position: 'absolute',
    bottom: 10,
    left: 20,
    right: 20,
    borderRadius: 25,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 5},
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  tabBarGradient: {paddingVertical: 10},
  tabBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  activeTabItem: {},
  tabButton: {
    padding: 12,
    borderRadius: 20,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeTabButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  activeIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#fff',
    marginTop: 4,
  },
});
