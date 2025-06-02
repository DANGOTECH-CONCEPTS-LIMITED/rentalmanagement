// src/screens/OnboardingScreen.tsx
import React, {useEffect, useRef} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
  StatusBar,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';

const {width, height} = Dimensions.get('window');

interface OnboardingScreenProps {
  navigation?: any;
  onComplete?: () => void;
}

export default function OnboardingScreen({
  navigation,
  onComplete,
}: OnboardingScreenProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const buttonAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Staggered animations for a premium feel
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(buttonAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <>
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />
      <LinearGradient
        colors={['#667eea', '#764ba2', '#f093fb']}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 1}}
        style={styles.container}>
        {/* Floating Elements for Visual Interest */}
        <View style={styles.floatingElements}>
          <Animated.View
            style={[styles.floatingCircle, styles.circle1, {opacity: fadeAnim}]}
          />
          <Animated.View
            style={[styles.floatingCircle, styles.circle2, {opacity: fadeAnim}]}
          />
          <Animated.View
            style={[styles.floatingCircle, styles.circle3, {opacity: fadeAnim}]}
          />
        </View>

        {/* Main Content */}
        <View style={styles.content}>
          {/* Logo/Icon Section */}
          <Animated.View
            style={[
              styles.logoContainer,
              {
                opacity: fadeAnim,
                transform: [{translateY: slideAnim}, {scale: scaleAnim}],
              },
            ]}>
            <View style={styles.logoBackground}>
              <Icon name="wallet" size={60} color="#fff" />
            </View>
          </Animated.View>

          {/* Title and Subtitle */}
          <Animated.View
            style={[
              styles.textContainer,
              {
                opacity: fadeAnim,
                transform: [{translateY: slideAnim}],
              },
            ]}>
            <Text style={styles.title}>Welcome to</Text>
            <Text style={styles.brandName}>Dango Pay</Text>
            <Text style={styles.subtitle}>
              Your secure gateway to effortless payments and financial freedom
            </Text>
          </Animated.View>

          {/* Features List */}
          <Animated.View
            style={[
              styles.featuresContainer,
              {
                opacity: fadeAnim,
                transform: [{translateY: slideAnim}],
              },
            ]}>
            <FeatureItem
              icon="shield-checkmark"
              text="Bank-level security"
              delay={200}
            />
            <FeatureItem icon="flash" text="Instant transactions" delay={400} />
            <FeatureItem
              icon="globe"
              text="Country wide accessibility"
              delay={600}
            />
          </Animated.View>

          {/* CTA Button */}
          <Animated.View
            style={[
              styles.buttonContainer,
              {
                opacity: buttonAnim,
                transform: [{scale: buttonAnim}],
              },
            ]}>
            <TouchableOpacity
              style={styles.getStartedButton}
              onPress={() => {
                if (onComplete) {
                  onComplete();
                } else if (navigation) {
                  navigation.navigate('MainApp');
                }
              }}
              activeOpacity={0.8}>
              <LinearGradient
                colors={['#ff6b6b', '#ee5a24']}
                start={{x: 0, y: 0}}
                end={{x: 1, y: 0}}
                style={styles.buttonGradient}>
                <Text style={styles.buttonText}>Get Started</Text>
                <Icon name="arrow-forward" size={20} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>

            {/* <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => {
              
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.secondaryButtonText}>Learn More</Text>
            </TouchableOpacity> */}
          </Animated.View>
        </View>

        {/* Bottom Indicator */}
        <Animated.View style={[styles.bottomIndicator, {opacity: fadeAnim}]}>
          <View style={styles.indicatorDots}>
            <View style={[styles.dot, styles.activeDot]} />
            {/* <View style={styles.dot} />
            <View style={styles.dot} /> */}
          </View>
        </Animated.View>
      </LinearGradient>
    </>
  );
}

// Feature Item Component
interface FeatureItemProps {
  icon: string;
  text: string;
  delay: number;
}

const FeatureItem = ({icon, text, delay}: FeatureItemProps) => {
  const itemAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.timing(itemAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }, delay);

    return () => clearTimeout(timer);
  }, [delay, itemAnim]);

  return (
    <Animated.View
      style={[
        styles.featureItem,
        {
          opacity: itemAnim,
          transform: [
            {
              translateX: itemAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [-20, 0],
              }),
            },
          ],
        },
      ]}>
      <View style={styles.featureIcon}>
        <Icon name={icon} size={20} color="#fff" />
      </View>
      <Text style={styles.featureText}>{text}</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: StatusBar.currentHeight || 40,
  },
  floatingElements: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  floatingCircle: {
    position: 'absolute',
    borderRadius: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  circle1: {
    width: 120,
    height: 120,
    top: height * 0.1,
    right: -60,
  },
  circle2: {
    width: 80,
    height: 80,
    top: height * 0.3,
    left: -40,
  },
  circle3: {
    width: 60,
    height: 60,
    bottom: height * 0.2,
    right: width * 0.2,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  logoContainer: {
    marginBottom: 40,
  },
  logoBackground: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 50,
  },
  title: {
    fontSize: 24,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '300',
    marginBottom: 5,
  },
  brandName: {
    fontSize: 42,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 15,
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  featuresContainer: {
    alignSelf: 'stretch',
    marginBottom: 50,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    paddingHorizontal: 20,
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  featureText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  buttonContainer: {
    alignSelf: 'stretch',
    paddingHorizontal: 20,
  },
  getStartedButton: {
    marginBottom: 15,
    borderRadius: 25,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  buttonGradient: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 30,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginRight: 10,
  },
  secondaryButton: {
    paddingVertical: 15,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
  bottomIndicator: {
    paddingBottom: 30,
    alignItems: 'center',
  },
  indicatorDots: {
    flexDirection: 'row',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginHorizontal: 4,
  },
  activeDot: {
    backgroundColor: '#fff',
    width: 24,
  },
});
