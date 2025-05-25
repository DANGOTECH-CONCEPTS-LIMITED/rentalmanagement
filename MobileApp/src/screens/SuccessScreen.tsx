// src/screens/SuccessScreen.tsx
import React, {useEffect, useState, useRef} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  StatusBar,
  Animated,
  ScrollView,
  Platform,
  Share,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import Clipboard from '@react-native-clipboard/clipboard';
import {getUtilityPayments} from '../services/api';

export default function SuccessScreen({route, navigation}: any) {
  const {meterNumber} = route.params;
  const [token, setToken] = useState('Fetching...');
  const [loading, setLoading] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState<any>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const fetchToken = async () => {
    try {
      setLoading(true);
      const result = await getUtilityPayments(meterNumber);
      if (result && result.length > 0) {
        const latestPayment = result[0];
        setToken(latestPayment.token || 'Token not yet available');
        setPaymentDetails(latestPayment);
      } else {
        setToken('Token not yet available');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to retrieve token.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchToken();

    // Start animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();

    // Success icon pulse animation
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
    );
    pulseAnimation.start();

    return () => pulseAnimation.stop();
  }, []);

  const copyToken = async () => {
    if (
      token &&
      token !== 'Fetching...' &&
      token !== 'Token not yet available'
    ) {
      Clipboard.setString(token);
      Alert.alert('Copied!', 'Token copied to clipboard');
    }
  };

  const shareToken = async () => {
    if (
      token &&
      token !== 'Fetching...' &&
      token !== 'Token not yet available'
    ) {
      try {
        await Share.share({
          message: `Your electricity token: ${token}\nMeter Number: ${meterNumber}`,
          title: 'Electricity Token',
        });
      } catch (error) {
        // ignore
      }
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const handleBackHome = () => {
    navigation.reset({
      index: 0,
      routes: [{name: 'Home'}],
    });
  };

  const handleViewHistory = () => {
    navigation.navigate('PaymentHistory');
  };

  return (
    <>
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />
      <LinearGradient
        colors={['#4CAF50', '#45a049', '#66bb6a']}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 1}}
        style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          <Animated.View
            style={[
              styles.content,
              {
                opacity: fadeAnim,
                transform: [{scale: scaleAnim}, {translateY: slideAnim}],
              },
            ]}>
            {/* Success Header */}
            <View style={styles.header}>
              <Animated.View
                style={[
                  styles.successIconContainer,
                  {
                    transform: [{scale: pulseAnim}],
                  },
                ]}>
                <View style={styles.successIcon}>
                  <Icon name="checkmark" size={60} color="#fff" />
                </View>
              </Animated.View>
              <Text style={styles.title}>Payment Successful!</Text>
              <Text style={styles.subtitle}>
                Your electricity units have been purchased
              </Text>
            </View>

            {/* Payment Summary Card */}
            {paymentDetails && (
              <View style={styles.summaryCard}>
                <View style={styles.cardHeader}>
                  <Icon name="receipt" size={24} color="#4CAF50" />
                  <Text style={styles.cardTitle}>Payment Summary</Text>
                </View>

                <View style={styles.summaryGrid}>
                  <View style={styles.summaryItem}>
                    <View style={styles.summaryIcon}>
                      <Icon name="wallet" size={20} color="#4CAF50" />
                    </View>
                    <Text style={styles.summaryLabel}>Amount Paid</Text>
                    <Text style={styles.summaryValue}>
                      {formatCurrency(paymentDetails.amount)}
                    </Text>
                  </View>

                  <View style={styles.summaryItem}>
                    <View style={styles.summaryIcon}>
                      <Icon name="card" size={20} color="#ff6b6b" />
                    </View>
                    <Text style={styles.summaryLabel}>Charges</Text>
                    <Text style={styles.summaryValue}>
                      {formatCurrency(paymentDetails.charges)}
                    </Text>
                  </View>

                  <View style={styles.summaryItem}>
                    <View style={styles.summaryIcon}>
                      <Icon name="flash" size={20} color="#FF9800" />
                    </View>
                    <Text style={styles.summaryLabel}>Units</Text>
                    <Text style={styles.summaryValue}>
                      {paymentDetails.units || 'N/A'}
                    </Text>
                  </View>

                  <View style={styles.summaryItem}>
                    <View style={styles.summaryIcon}>
                      <Icon name="call" size={20} color="#667eea" />
                    </View>
                    <Text style={styles.summaryLabel}>Phone</Text>
                    <Text style={styles.summaryValue}>
                      {paymentDetails.phoneNumber}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Token Card */}
            <View style={styles.tokenCard}>
              <View style={styles.cardHeader}>
                <Icon name="key" size={24} color="#4CAF50" />
                <Text style={styles.cardTitle}>Your Electricity Token</Text>
              </View>

              <View style={styles.meterInfo}>
                <Text style={styles.meterLabel}>Meter Number</Text>
                <Text style={styles.meterNumber}>{meterNumber}</Text>
              </View>

              <View style={styles.tokenContainer}>
                <Text style={styles.tokenLabel}>Token Code</Text>
                {loading ? (
                  <View style={styles.tokenLoading}>
                    <Icon name="refresh" size={20} color="#4CAF50" />
                    <Text style={styles.tokenLoadingText}>
                      Fetching token...
                    </Text>
                  </View>
                ) : (
                  <View style={styles.tokenDisplay}>
                    <Text style={styles.tokenValue}>
                      {token === 'Token not yet available'
                        ? 'Token processing...'
                        : token}
                    </Text>
                    {token !== 'Fetching...' &&
                      token !== 'Token not yet available' && (
                        <View style={styles.tokenActions}>
                          <TouchableOpacity
                            style={styles.tokenAction}
                            onPress={copyToken}
                            activeOpacity={0.7}>
                            <Icon name="copy" size={18} color="#4CAF50" />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.tokenAction}
                            onPress={shareToken}
                            activeOpacity={0.7}>
                            <Icon name="share" size={18} color="#4CAF50" />
                          </TouchableOpacity>
                        </View>
                      )}
                  </View>
                )}
              </View>

              {token !== 'Fetching...' &&
                token !== 'Token not yet available' && (
                  <View style={styles.tokenInstructions}>
                    <Icon name="information-circle" size={16} color="#4CAF50" />
                    <Text style={styles.instructionsText}>
                      Enter this token on your prepaid meter to add units
                    </Text>
                  </View>
                )}

              <TouchableOpacity
                style={[styles.refreshButton, loading && styles.buttonDisabled]}
                onPress={fetchToken}
                disabled={loading}
                activeOpacity={0.8}>
                <LinearGradient
                  colors={
                    loading ? ['#a5d6a7', '#81c784'] : ['#43a047', '#388e3c']
                  }
                  start={{x: 0, y: 0}}
                  end={{x: 1, y: 0}}
                  style={styles.refreshGradient}>
                  <Icon name="refresh" size={20} color="#fff" />
                  <Text style={styles.refreshText}>Refresh Token</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {/* Navigation Buttons */}
            <View style={styles.navButtons}>
              <TouchableOpacity
                style={styles.navButton}
                onPress={handleBackHome}
                activeOpacity={0.7}>
                <Text style={styles.navButtonText}>Back to Home</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.navButton}
                onPress={handleViewHistory}
                activeOpacity={0.7}>
                <Text style={styles.navButtonText}>View Payment History</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </ScrollView>
      </LinearGradient>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: 50,
    paddingHorizontal: 20,
    justifyContent: 'center',
    flexGrow: 1,
  },
  content: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: {width: 0, height: 3},
    shadowRadius: 6,
    elevation: 5,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  successIconContainer: {
    backgroundColor: '#4CAF50',
    padding: 20,
    borderRadius: 100,
    marginBottom: 15,
    elevation: 5,
  },
  successIcon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
  summaryCard: {
    backgroundColor: '#e8f5e9',
    borderRadius: 10,
    padding: 15,
    marginBottom: 25,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardTitle: {
    marginLeft: 8,
    fontSize: 18,
    fontWeight: '600',
    color: '#2e7d32',
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  summaryItem: {
    width: '47%',
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: {width: 0, height: 1},
    shadowRadius: 3,
    elevation: 2,
    alignItems: 'center',
  },
  summaryIcon: {
    backgroundColor: '#a5d6a7',
    padding: 6,
    borderRadius: 20,
    marginBottom: 6,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#555',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2e7d32',
  },
  tokenCard: {
    backgroundColor: '#f0f4c3',
    borderRadius: 12,
    padding: 20,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: {width: 0, height: 2},
    shadowRadius: 5,
    elevation: 4,
  },
  meterInfo: {
    marginTop: 10,
    marginBottom: 20,
  },
  meterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#558b2f',
    marginBottom: 3,
  },
  meterNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#33691e',
  },
  tokenContainer: {
    marginBottom: 15,
  },
  tokenLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#33691e',
    marginBottom: 8,
  },
  tokenLoading: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tokenLoadingText: {
    marginLeft: 10,
    color: '#558b2f',
    fontWeight: '600',
  },
  tokenDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tokenValue: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#33691e',
    letterSpacing: 1.2,
  },
  tokenActions: {
    flexDirection: 'row',
  },
  tokenAction: {
    marginLeft: 15,
    padding: 6,
    borderRadius: 6,
    backgroundColor: '#aed581',
  },
  tokenInstructions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  instructionsText: {
    marginLeft: 5,
    fontSize: 12,
    color: '#558b2f',
  },
  refreshButton: {
    marginTop: 15,
    borderRadius: 30,
    overflow: 'hidden',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  refreshGradient: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
  },
  refreshText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
    marginLeft: 8,
  },
  navButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  navButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
    paddingVertical: 14,
    borderRadius: 30,
    marginHorizontal: 5,
  },
  navButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
    textAlign: 'center',
  },
});
