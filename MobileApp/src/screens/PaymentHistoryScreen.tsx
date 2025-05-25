// src/screens/PaymentHistoryScreen.tsx
import React, {useState, useRef, useEffect} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StatusBar,
  Animated,
  RefreshControl,
} from 'react-native';

import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';

import {getUtilityPayments} from '../services/api';

export default function PaymentHistoryScreen() {
  const [meterNumber, setMeterNumber] = useState('');
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

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

  const fetchHistory = async () => {
    if (!meterNumber.trim()) {
      Alert.alert('Validation', 'Please enter a meter number');
      return;
    }

    try {
      setLoading(true);
      const result = await getUtilityPayments(meterNumber);
      setPayments(result || []);
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch payment history');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    if (!meterNumber.trim()) return;

    try {
      setRefreshing(true);
      const result = await getUtilityPayments(meterNumber);
      setPayments(result || []);
    } catch (error) {
      Alert.alert('Error', 'Failed to refresh payment history');
    } finally {
      setRefreshing(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'success':
      case 'completed':
        return '#4CAF50';
      case 'pending':
        return '#FF9800';
      case 'failed':
        return '#f44336';
      default:
        return '#666';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'success':
      case 'completed':
        return 'checkmark-circle';
      case 'pending':
        return 'time';
      case 'failed':
        return 'close-circle';
      default:
        return 'help-circle';
    }
  };

  const renderPaymentItem = ({item, index}: {item: any; index: number}) => (
    <Animated.View
      style={[
        styles.paymentItem,
        {
          opacity: fadeAnim,
          transform: [{translateY: slideAnim}],
        },
      ]}>
      <View style={styles.itemHeader}>
        <View style={styles.itemHeaderLeft}>
          <View
            style={[
              styles.statusIcon,
              {backgroundColor: `${getStatusColor(item.status)}15`},
            ]}>
            <Ionicons
              name={getStatusIcon(item.status)}
              size={20}
              color={getStatusColor(item.status)}
            />
          </View>
          <View>
            <Text style={styles.transactionId}>{item.description}</Text>
            <Text style={styles.transactionDate}>
              {new Date(item.createdAt).toLocaleDateString('en-UG', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>
        </View>
        <View
          style={[
            styles.statusBadge,
            {backgroundColor: `${getStatusColor(item.status)}15`},
          ]}>
          <Text
            style={[styles.statusText, {color: getStatusColor(item.status)}]}>
            {item.status}
          </Text>
        </View>
      </View>

      <View style={styles.itemDetails}>
        <View style={styles.detailRow}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Amount</Text>
            <Text style={styles.detailValue}>
              {formatCurrency(item.amount)}
            </Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Charges</Text>
            <Text style={styles.detailValue}>
              {formatCurrency(item.charges)}
            </Text>
          </View>
        </View>

        <View style={styles.detailRow}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Phone</Text>
            <Text style={styles.detailValue}>{item.phoneNumber}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Meter</Text>
            <Text style={styles.detailValue}>{item.meterNumber}</Text>
          </View>
        </View>
        {item.token && (
          <View style={styles.tokenContainer}>
            <View style={styles.tokenHeader}>
              <Ionicons name="key" size={18} color="#2E7D32" />
              <Text style={styles.tokenLabel}>TOKEN</Text>
            </View>
            <Text style={styles.tokenValue}>{item.token}</Text>
          </View>
        )}
        {item.units && (
          <View style={styles.unitsRow}>
            <View style={styles.unitsIcon}>
              <Ionicons name="flash" size={16} color="#ff6b6b" />
            </View>
            <Text style={styles.unitsText}>Units: {item.units}</Text>
          </View>
        )}
      </View>
    </Animated.View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons
        name="receipt-outline"
        size={80}
        color="rgba(255, 255, 255, 0.3)"
      />
      <Text style={styles.emptyTitle}>No Payment History</Text>
      <Text style={styles.emptySubtitle}>
        {meterNumber
          ? 'No payments found for this meter'
          : 'Enter a meter number to view history'}
      </Text>
    </View>
  );

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
        <SafeAreaView style={styles.safeArea}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.keyboardContainer}>
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
                <Text style={styles.title}>Track your utility payments</Text>
              </View>

              {/* Search Card */}
              <View style={styles.searchCard}>
                <Text style={styles.inputLabel}>Meter Number</Text>
                <View style={styles.inputContainer}>
                  <View style={styles.inputIcon}>
                    <Ionicons name="home" size={20} color="#667eea" />
                  </View>
                  <TextInput
                    style={styles.input}
                    value={meterNumber}
                    onChangeText={setMeterNumber}
                    keyboardType="number-pad"
                    placeholder="Enter meter number"
                    placeholderTextColor="rgba(102, 126, 234, 0.5)"
                  />
                </View>

                <TouchableOpacity
                  style={[
                    styles.searchButton,
                    (!meterNumber.trim() || loading) && styles.buttonDisabled,
                  ]}
                  onPress={fetchHistory}
                  disabled={!meterNumber.trim() || loading}
                  activeOpacity={0.8}>
                  <LinearGradient
                    colors={
                      !meterNumber.trim() || loading
                        ? ['#ccc', '#999']
                        : ['#667eea', '#764ba2']
                    }
                    start={{x: 0, y: 0}}
                    end={{x: 1, y: 0}}
                    style={styles.searchButtonGradient}>
                    <Ionicons
                      name="search"
                      size={18}
                      color="#fff"
                      style={styles.searchIcon}
                    />
                    <Text style={styles.searchButtonText}>Search</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>

              {/* History List */}
              <FlatList
                data={payments}
                keyExtractor={item =>
                  item.id || item._id || String(item.createdAt)
                }
                renderItem={renderPaymentItem}
                ListEmptyComponent={renderEmptyState}
                contentContainerStyle={[
                  styles.listContent,
                  !payments.length && styles.listEmpty,
                ]}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    colors={['#764ba2']}
                    tintColor="#764ba2"
                  />
                }
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                onEndReachedThreshold={0.5}
              />
            </Animated.View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </LinearGradient>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  keyboardContainer: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 60,
  },
  header: {
    marginBottom: 20,
    marginTop: 40,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
  },
  searchCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 5},
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  inputLabel: {
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: '#667eea',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 16,
    height: 45,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#667eea',
  },
  searchButton: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  searchButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  listContent: {
    paddingBottom: 20,
  },
  listEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'rgba(255,255,255,0.4)',
    marginTop: 12,
  },
  emptySubtitle: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 14,
    marginTop: 4,
    textAlign: 'center',
  },
  paymentItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  itemHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIcon: {
    width: 32,
    height: 32,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionId: {
    fontWeight: '600',
    fontSize: 16,
    color: '#333',
  },
  transactionDate: {
    color: '#666',
    fontSize: 12,
  },
  statusBadge: {
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  statusText: {
    fontWeight: '600',
    fontSize: 12,
    textTransform: 'capitalize',
  },
  itemDetails: {
    borderTopColor: '#eee',
    borderTopWidth: 1,
    paddingTop: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    fontWeight: '500',
    fontSize: 13,
    color: '#666',
  },
  detailValue: {
    fontWeight: '600',
    fontSize: 14,
    color: '#222',
  },
  tokenContainer: {
    marginTop: 5,
    padding: 12,
    backgroundColor: 'rgba(62, 132, 66, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(46, 125, 50, 0.3)',
  },
  tokenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  tokenLabel: {
    marginLeft: 8,
    fontWeight: '700',
    color: '#2E7D32',
    fontSize: 14,
    letterSpacing: 0.5,
  },
  tokenValue: {
    color: '#2E7D32',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1,
    fontFamily: Platform.OS === 'android' ? 'monospace' : 'Courier New',
  },
  unitsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  unitsIcon: {
    marginRight: 6,
  },
  unitsText: {
    fontWeight: '600',
    color: '#ff6b6b',
  },
});
