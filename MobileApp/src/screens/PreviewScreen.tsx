// src/screens/PreviewScreen.tsx
import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  StatusBar,
  Animated,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient'; // Changed import
import Icon from 'react-native-vector-icons/Ionicons'; // Changed import for icons
import {previewUnits, processPayment} from '../services/api';

export default function PreviewScreen({route, navigation}: any) {
  const {meterNumber, amount, customerDetails} = route.params;

  const [previewData, setPreviewData] = useState<any>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [paying, setPaying] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    async function fetchPreview() {
      setLoading(true);
      try {
        const response = await previewUnits(meterNumber, amount);
        if (response.result_code === 0) {
          setPreviewData(response.result);
          // Animate content in
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
        } else {
          Alert.alert(
            'Preview Failed',
            response.reason || 'Failed to get preview',
          );
        }
      } catch (error) {
        Alert.alert('Error', 'Something went wrong fetching preview');
      } finally {
        setLoading(false);
      }
    }
    fetchPreview();
  }, [meterNumber, amount]);

  const handlePayment = async () => {
    if (!phoneNumber) {
      Alert.alert('Validation', 'Please enter phone number');
      return;
    }
    setPaying(true);
    console.log('Processing payment with:', {
      phoneNumber,
      meterNumber,
      amount,
    });
    try {
      const response = await processPayment({
        phoneNumber,
        meterNumber,
        amount,
      });
      console.log('Payment response:', response);

      if (response.result_code === 0) {
        console.log('Payment success, token:', response.result.token);
        navigation.navigate('Success', {
          meterNumber,
          token: response.result.token,
        });
      } else {
        console.warn('Payment failed:', response);
        Alert.alert(
          'Payment Failed',
          response.reason || 'Payment was unsuccessful',
        );
      }
    } catch (error) {
      console.error('Payment error:', error);
      console.log('Payment error:', error);
    } finally {
      setPaying(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0,
    }).format(value);
  };

  if (loading) {
    return (
      <LinearGradient
        colors={['#667eea', '#764ba2', '#f093fb']}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 1}}
        style={styles.loadingContainer}>
        <StatusBar
          barStyle="light-content"
          backgroundColor="transparent"
          translucent
        />
        <View style={styles.loadingContent}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.loadingText}>Calculating units...</Text>
        </View>
      </LinearGradient>
    );
  }

  if (!previewData) return null;

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
              {/* Header */}
              <View style={styles.header}>
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={() => navigation.goBack()}>
                  <Icon name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <View style={styles.headerContent}>
                  <View style={styles.previewIcon}>
                    <Icon name="receipt" size={50} color="#4CAF50" />
                  </View>
                  <Text style={styles.title}>Payment Preview</Text>
                  <Text style={styles.subtitle}>
                    Review your purchase details
                  </Text>
                </View>
              </View>

              {/* Customer Summary Card */}
              <View style={styles.summaryCard}>
                <View style={styles.cardHeader}>
                  <Icon name="person-circle" size={24} color="#667eea" />
                  <Text style={styles.cardTitle}>Customer Details</Text>
                </View>

                <View style={styles.customerInfo}>
                  <Text style={styles.customerName}>
                    {customerDetails?.customer_name}
                  </Text>
                  <Text style={styles.meterNumber}>Meter: {meterNumber}</Text>
                </View>
              </View>

              {/* Units Preview Card */}
              <View style={styles.unitsCard}>
                <View style={styles.cardHeader}>
                  <Icon name="flash" size={24} color="#ff6b6b" />
                  <Text style={styles.cardTitle}>Units Breakdown</Text>
                </View>

                <View style={styles.unitsGrid}>
                  <View style={styles.unitItem}>
                    <View style={styles.unitIcon}>
                      <Icon name="wallet" size={20} color="#667eea" />
                    </View>
                    <Text style={styles.unitLabel}>Amount Paid</Text>
                    <Text style={styles.unitValue}>
                      {formatCurrency(previewData?.total_paid || 0)}
                    </Text>
                  </View>

                  <View style={styles.unitItem}>
                    <View style={styles.unitIcon}>
                      <Icon name="flash" size={20} color="#ff6b6b" />
                    </View>
                    <Text style={styles.unitLabel}>Units</Text>
                    <Text style={styles.unitValue}>
                      {previewData?.total_unit} {previewData?.unit || 'kWh'}
                    </Text>
                  </View>

                  <View style={styles.unitItem}>
                    <View style={styles.unitIcon}>
                      <Icon name="pricetag" size={20} color="#4CAF50" />
                    </View>
                    <Text style={styles.unitLabel}>Rate per Unit</Text>
                    <Text style={styles.unitValue}>
                      {formatCurrency(previewData?.price || 0)}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Phone Number Input Card */}
              <View style={styles.phoneCard}>
                <View style={styles.cardHeader}>
                  <Icon name="call" size={24} color="#667eea" />
                  <Text style={styles.cardTitle}>Payment Method</Text>
                </View>

                <Text style={styles.phoneLabel}>Mobile Money Number</Text>
                <View style={styles.phoneInputContainer}>
                  <View style={styles.countryCode}>
                    <Text style={styles.countryCodeText}>+256</Text>
                  </View>
                  <TextInput
                    style={styles.phoneInput}
                    value={phoneNumber}
                    onChangeText={setPhoneNumber}
                    keyboardType="phone-pad"
                    placeholder="7XX XXX XXX"
                    placeholderTextColor="rgba(102, 126, 234, 0.5)"
                  />
                </View>

                <View style={styles.paymentInfo}>
                  <Icon name="information-circle" size={16} color="#4CAF50" />
                  <Text style={styles.infoText}>
                    You'll receive a prompt on your phone to authorize this
                    payment
                  </Text>
                </View>
              </View>

              {/* Confirm Payment Button */}
              <TouchableOpacity
                style={[
                  styles.confirmButton,
                  (!phoneNumber || paying) && styles.buttonDisabled,
                ]}
                onPress={handlePayment}
                disabled={!phoneNumber || paying}
                activeOpacity={0.8}>
                <LinearGradient
                  colors={
                    !phoneNumber || paying
                      ? ['#ccc', '#999']
                      : ['#ff6b6b', '#ee5a24']
                  }
                  start={{x: 0, y: 0}}
                  end={{x: 1, y: 0}}
                  style={styles.buttonGradient}>
                  {paying ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.buttonText}>Confirm Payment</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  loadingContent: {
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#fff',
  },
  container: {
    flex: 1,
    paddingTop: StatusBar.currentHeight || 40,
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    marginBottom: 20,
    alignItems: 'center',
  },
  backButton: {
    padding: 8,
    marginRight: 12,
  },
  headerContent: {
    flex: 1,
  },
  previewIcon: {
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#ddd',
    textAlign: 'center',
  },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '700',
    color: '#667eea',
  },
  customerInfo: {
    marginTop: 8,
  },
  customerName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  meterNumber: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  unitsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  unitsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  unitItem: {
    alignItems: 'center',
    flex: 1,
  },
  unitIcon: {
    marginBottom: 6,
  },
  unitLabel: {
    fontSize: 12,
    color: '#999',
  },
  unitValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginTop: 4,
  },
  phoneCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  phoneLabel: {
    fontSize: 14,
    color: '#555',
    marginBottom: 8,
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#667eea',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  countryCode: {
    marginRight: 8,
  },
  countryCodeText: {
    fontSize: 16,
    color: '#667eea',
    fontWeight: '600',
  },
  phoneInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    paddingVertical: 4,
  },
  paymentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  infoText: {
    marginLeft: 6,
    fontSize: 12,
    color: '#4CAF50',
  },
  confirmButton: {
    borderRadius: 30,
    overflow: 'hidden',
  },
  buttonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: 30,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
