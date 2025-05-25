// src/screens/MeterDetailsScreen.tsx
import React, {useState, useRef, useEffect} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Animated,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';

export default function MeterDetailsScreen({route, navigation}: any) {
  const {meterInfo} = route.params;
  const customer = meterInfo.result[0];

  const [amount, setAmount] = useState('');
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  const quickAmounts = [5000, 10000, 20000, 50000, 100000];

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

  const handleQuickAmount = (quickAmount: number) => {
    setAmount(quickAmount.toString());
    setSelectedAmount(quickAmount);
  };

  const handleProceed = () => {
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount');
      return;
    }

    navigation.navigate('Preview', {
      meterNumber: customer.meter_number,
      amount: parseFloat(amount),
      customerDetails: customer,
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0,
    }).format(value);
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
              {/* Header */}
              <View style={styles.header}>
                <View style={styles.successIcon}>
                  <Ionicons name="checkmark-circle" size={60} color="#4CAF50" />
                </View>
                <Text style={styles.title}>Meter Verified Successfully</Text>
                <Text style={styles.subtitle}>
                  Review your details and proceed with payment
                </Text>
              </View>

              {/* Customer Details Card */}
              <View style={styles.detailsCard}>
                <View style={styles.cardHeader}>
                  <Ionicons name="person-circle" size={24} color="#667eea" />
                  <Text style={styles.cardTitle}>Customer Information</Text>
                </View>

                <View style={styles.detailRow}>
                  <View style={styles.detailIcon}>
                    <Ionicons name="person" size={20} color="#667eea" />
                  </View>
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>Customer Name</Text>
                    <Text style={styles.detailValue}>
                      {customer.customer_name}
                    </Text>
                  </View>
                </View>

                <View style={styles.detailRow}>
                  <View style={styles.detailIcon}>
                    <Ionicons name="card" size={20} color="#667eea" />
                  </View>
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>Customer Number</Text>
                    <Text style={styles.detailValue}>
                      {customer.customer_number}
                    </Text>
                  </View>
                </View>

                <View style={styles.detailRow}>
                  <View style={styles.detailIcon}>
                    <Ionicons name="home" size={20} color="#667eea" />
                  </View>
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>Meter Number</Text>
                    <Text style={styles.detailValue}>
                      {customer.meter_number}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Amount Input Card */}
              <View style={styles.amountCard}>
                <View style={styles.cardHeader}>
                  <Ionicons name="wallet" size={24} color="#667eea" />
                  <Text style={styles.cardTitle}>Payment Amount</Text>
                </View>

                {/* Quick Amount Buttons */}
                <Text style={styles.quickAmountLabel}>Quick Select</Text>
                <View style={styles.quickAmountContainer}>
                  {quickAmounts.map(quickAmount => (
                    <TouchableOpacity
                      key={quickAmount}
                      style={[
                        styles.quickAmountButton,
                        selectedAmount === quickAmount &&
                          styles.selectedQuickAmount,
                      ]}
                      onPress={() => handleQuickAmount(quickAmount)}
                      activeOpacity={0.7}>
                      <Text
                        style={[
                          styles.quickAmountText,
                          selectedAmount === quickAmount &&
                            styles.selectedQuickAmountText,
                        ]}>
                        {formatCurrency(quickAmount).replace('UGX', 'UGX ')}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Custom Amount Input */}
                <Text style={styles.customAmountLabel}>
                  Or Enter Custom Amount
                </Text>
                <View style={styles.inputContainer}>
                  <View style={styles.currencyPrefix}>
                    <Text style={styles.currencyText}>UGX</Text>
                  </View>
                  <TextInput
                    style={styles.amountInput}
                    value={amount}
                    onChangeText={value => {
                      setAmount(value);
                      setSelectedAmount(null);
                    }}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor="rgba(102, 126, 234, 0.5)"
                  />
                </View>

                {amount && parseFloat(amount) > 0 && (
                  <Animated.View style={styles.amountPreview}>
                    <Ionicons
                      name="information-circle"
                      size={16}
                      color="#4CAF50"
                    />
                    <Text style={styles.previewText}>
                      You're about to pay {formatCurrency(parseFloat(amount))}
                    </Text>
                  </Animated.View>
                )}
              </View>

              {/* Proceed Button */}
              <TouchableOpacity
                style={[
                  styles.proceedButton,
                  (!amount || parseFloat(amount) <= 0) && styles.buttonDisabled,
                ]}
                onPress={handleProceed}
                disabled={!amount || parseFloat(amount) <= 0}
                activeOpacity={0.8}>
                <LinearGradient
                  colors={
                    !amount || parseFloat(amount) <= 0
                      ? ['#ccc', '#999']
                      : ['#ff6b6b', '#ee5a24']
                  }
                  start={{x: 0, y: 0}}
                  end={{x: 1, y: 0}}
                  style={styles.buttonGradient}>
                  <Text style={styles.buttonText}>Proceed to Payment</Text>
                  <Ionicons name="arrow-forward" size={20} color="#fff" />
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
  container: {
    flex: 1,
    paddingTop: StatusBar.currentHeight || 40,
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 100,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  successIcon: {
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  detailsCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
  },
  amountCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    padding: 24,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(102, 126, 234, 0.1)',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#667eea',
    marginLeft: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  detailIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  quickAmountLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#667eea',
    marginBottom: 12,
  },
  quickAmountContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 24,
    gap: 8,
  },
  quickAmountButton: {
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginRight: 8,
  },
  selectedQuickAmount: {
    backgroundColor: '#667eea',
  },
  quickAmountText: {
    color: '#667eea',
    fontWeight: '600',
  },
  selectedQuickAmountText: {
    color: '#fff',
  },
  customAmountLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  currencyPrefix: {
    marginRight: 8,
  },
  currencyText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#667eea',
  },
  amountInput: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    padding: 0,
  },
  amountPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  previewText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#4caf50',
  },
  proceedButton: {
    borderRadius: 30,
    overflow: 'hidden',
    elevation: 4,
  },
  buttonGradient: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginRight: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
