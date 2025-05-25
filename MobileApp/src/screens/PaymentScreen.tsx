// src/screens/PaymentScreen.tsx
import React, {useState, useRef, useEffect} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Animated,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {verifyMeter} from '../services/api';

export default function PaymentScreen({navigation}: any) {
  const [meterNumber, setMeterNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleVerify = async () => {
    if (!meterNumber.trim()) {
      Alert.alert('Validation Error', 'Please enter a valid meter number');
      return;
    }

    try {
      setLoading(true);
      const response = await verifyMeter({meterNumber});
      if (
        response.result_code === 0 &&
        response.result &&
        response.result.length > 0
      ) {
        navigation.navigate('MeterDetails', {
          meterInfo: response,
        });
      } else {
        Alert.alert(
          'Verification Failed',
          response.reason ||
            'Invalid meter number. Please check and try again.',
        );
      }
    } catch (error) {
      Alert.alert(
        'Connection Error',
        'Please check your internet connection and try again',
      );
    } finally {
      setLoading(false);
    }
  };

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
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardContainer}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}>
            <Animated.View
              style={[
                styles.content,
                {
                  opacity: fadeAnim,
                  transform: [{translateY: slideAnim}],
                },
              ]}>
              {/* Header Section */}
              <View style={styles.header}>
                <View style={styles.iconContainer}>
                  <Ionicons name="flash" size={40} color="#fff" />
                </View>
                <Text style={styles.title}>Pay Your Utility Bill</Text>
                <Text style={styles.subtitle}>
                  Enter your meter number to get started with your payment
                </Text>
              </View>

              {/* Input Card */}
              <View style={styles.inputCard}>
                <View style={styles.inputHeader}>
                  <Ionicons name="home" size={20} color="#667eea" />
                  <Text style={styles.inputLabel}>Meter Number</Text>
                </View>

                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    value={meterNumber}
                    onChangeText={setMeterNumber}
                    keyboardType="number-pad"
                    placeholder="Enter your meter number"
                    placeholderTextColor="rgba(102, 126, 234, 0.5)"
                    maxLength={15}
                    editable={!loading}
                  />
                  <View style={styles.inputIcon}>
                    <Ionicons
                      name="keypad"
                      size={20}
                      color="rgba(102, 126, 234, 0.6)"
                    />
                  </View>
                </View>

                {meterNumber.length > 0 && (
                  <Animated.View style={styles.inputInfo}>
                    <Ionicons
                      name="information-circle"
                      size={16}
                      color="#667eea"
                    />
                    <Text style={styles.infoText}>
                      {meterNumber.length} digits entered
                    </Text>
                  </Animated.View>
                )}
              </View>

              {/* Action Button */}
              <TouchableOpacity
                style={[styles.verifyButton, loading && styles.buttonDisabled]}
                onPress={handleVerify}
                disabled={loading || !meterNumber.trim()}
                activeOpacity={0.8}>
                <LinearGradient
                  colors={loading ? ['#ccc', '#999'] : ['#ff6b6b', '#ee5a24']}
                  start={{x: 0, y: 0}}
                  end={{x: 1, y: 0}}
                  style={styles.buttonGradient}>
                  {loading ? (
                    <View style={styles.loadingContainer}>
                      <Animated.View
                        style={[
                          styles.loadingSpinner,
                          {
                            transform: [
                              {
                                rotate: fadeAnim.interpolate({
                                  inputRange: [0, 1],
                                  outputRange: ['0deg', '360deg'],
                                }),
                              },
                            ],
                          },
                        ]}>
                        <Ionicons name="refresh" size={20} color="#fff" />
                      </Animated.View>
                      <Text style={styles.buttonText}>Verifying Meter...</Text>
                    </View>
                  ) : (
                    <View style={styles.buttonContent}>
                      <Text style={styles.buttonText}>Verify Meter</Text>
                      <Ionicons name="arrow-forward" size={20} color="#fff" />
                    </View>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              {/* Quick Actions */}
              {/* <View style={styles.quickActions}>
                <Text style={styles.quickActionsTitle}>Quick Actions</Text>
                <View style={styles.actionRow}>
                  <TouchableOpacity style={styles.actionCard}>
                    <Ionicons name="time" size={24} color="#fff" />
                    <Text style={styles.actionText}>Recent</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionCard}>
                    <Ionicons name="scan" size={24} color="#fff" />
                    <Text style={styles.actionText}>Scan QR</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionCard}>
                    <Ionicons name="bookmark" size={24} color="#fff" />
                    <Text style={styles.actionText}>Saved</Text>
                  </TouchableOpacity>
                </View>
              </View> */}
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: StatusBar.currentHeight || 40,
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    minHeight: '100%',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 60,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  inputCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    padding: 24,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 10},
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
  },
  inputHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#667eea',
    marginLeft: 8,
  },
  inputContainer: {
    position: 'relative',
  },
  input: {
    backgroundColor: 'rgba(102, 126, 234, 0.05)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 18,
    color: '#333',
    borderWidth: 2,
    borderColor: 'rgba(102, 126, 234, 0.1)',
    paddingRight: 50,
  },
  inputIcon: {
    position: 'absolute',
    right: 16,
    top: 16,
  },
  inputInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#667eea',
    marginLeft: 6,
  },
  verifyButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 30,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  buttonDisabled: {
    elevation: 2,
    shadowOpacity: 0.1,
  },
  buttonGradient: {
    paddingVertical: 18,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingSpinner: {
    marginRight: 12,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginRight: 8,
  },
  quickActions: {
    marginTop: 20,
  },
  quickActionsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 16,
    textAlign: 'center',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  actionCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    minWidth: 80,
  },
  actionText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 8,
    fontWeight: '500',
  },
});
