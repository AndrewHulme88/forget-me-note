import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Animated,
  PanResponder,
  Platform,
  Pressable,
  Alert,
  Text,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import * as InAppPurchases from 'expo-in-app-purchases';

import Header from './components/Header';
import TaskItem from './components/TaskItem';
import Footer from './components/Footer';
import AddTask from './components/AddTask';
import IntroScreen from './components/IntroScreen';
import InfoModal from './components/InfoModal';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const PREMIUM_ID = 'premium_upgrade';

export default function App() {
  const [tasks, setTasks] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [darkMode, setDarkMode] = useState(false);
  const [showAddScreen, setShowAddScreen] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [showIntro, setShowIntro] = useState(false);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  const slideAnim = useState(new Animated.Value(0))[0];

  const today = new Date();
  const todayString = today.toDateString();
  const selectedString = selectedDate.toDateString();
  const selectedDayName = DAYS[selectedDate.getDay()];
  const canToggle = todayString === selectedString;

  const startDate = new Date(today);
  startDate.setDate(today.getDate() - 6);
  const endDate = new Date(today);
  endDate.setDate(today.getDate() + 5);
  const atStart = selectedString === startDate.toDateString();
  const atEnd = selectedString === endDate.toDateString();

  // ===== IAP connection guards =====
  const iapConnectedRef = useRef(false);
  const purchasingRef = useRef(false);
  const restoringRef = useRef(false);

  // First-run intro
  useEffect(() => {
    const checkIntro = async () => {
      const seen = await AsyncStorage.getItem('seenIntro');
      if (!seen) setShowIntro(true);
    };
    checkIntro();
  }, []);

  // Load persisted data
  useEffect(() => {
    const load = async () => {
      const json = await AsyncStorage.getItem('tasks');
      const premiumStatus = await AsyncStorage.getItem('isPremium');
      if (json) setTasks(JSON.parse(json));
      if (premiumStatus === 'true') setIsPremium(true);
    };
    load();
  }, []);

  // Persist tasks
  useEffect(() => {
    AsyncStorage.setItem('tasks', JSON.stringify(tasks));
  }, [tasks]);

  // Notifications setup (once)
  useEffect(() => {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });

    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('alarm', {
        name: 'Alarm Channel',
        importance: Notifications.AndroidImportance.HIGH,
        sound: 'default',
      });
      Notifications.setNotificationChannelAsync('silent', {
        name: 'Silent Channel',
        importance: Notifications.AndroidImportance.DEFAULT,
        sound: null,
      });
    }
  }, []);

  // In-App Purchases: connect once, restore, and listen
  useEffect(() => {
    let mounted = true;

    const initIAP = async () => {
      try {
        if (!iapConnectedRef.current) {
          await InAppPurchases.connectAsync();
          iapConnectedRef.current = true;
        }

        // Restore on launch (non-consumable)
        const hist = await InAppPurchases.getPurchaseHistoryAsync();
        if (mounted && hist.responseCode === InAppPurchases.IAPResponseCode.OK) {
          const hasPremium = hist.results?.some(p => p.productId === PREMIUM_ID);
          if (hasPremium) {
            setIsPremium(true);
            await AsyncStorage.setItem('isPremium', 'true');
          }
        }

        InAppPurchases.setPurchaseListener(async ({ responseCode, results, errorCode }) => {
          if (responseCode !== InAppPurchases.IAPResponseCode.OK) {
            console.warn('Purchase failed:', errorCode);
            purchasingRef.current = false;
            restoringRef.current = false;
            return;
          }
          for (const purchase of results || []) {
            try {
              if (purchase.productId === PREMIUM_ID) {
                setIsPremium(true);
                await AsyncStorage.setItem('isPremium', 'true');
              }
              await InAppPurchases.finishTransactionAsync(purchase, false);
            } catch (e) {
              console.warn('finishTransaction error', e);
            }
          }
          purchasingRef.current = false;
          restoringRef.current = false;
        });
      } catch (e) {
        console.warn('IAP init error', e?.message || e);
      }
    };

    initIAP();
    return () => {
      mounted = false;
      // Keep connected during app lifetime; disconnecting here is optional.
      // InAppPurchases.disconnectAsync().catch(() => {});
    };
  }, []);

  const handleUpgradePurchase = async () => {
    if (purchasingRef.current) return;
    purchasingRef.current = true;
    try {
      const { responseCode, results } = await InAppPurchases.getProductsAsync([PREMIUM_ID]);
      if (responseCode !== InAppPurchases.IAPResponseCode.OK || !results?.length) {
        Alert.alert('Product not found', 'Check product ID and App Store Connect status.');
        purchasingRef.current = false;
        return;
      }
      const res = await InAppPurchases.purchaseItemAsync(PREMIUM_ID);
      // Optimistic unlock; listener will also persist and clear lock
      if (res?.responseCode === InAppPurchases.IAPResponseCode.OK) {
        setIsPremium(true);
        await AsyncStorage.setItem('isPremium', 'true');
      }
    } catch (e) {
      Alert.alert('Purchase error', String(e?.message || e));
      purchasingRef.current = false;
    }
  };

  const handleRestore = async () => {
    if (restoringRef.current) return;
    restoringRef.current = true;
    try {
      const { responseCode, results } = await InAppPurchases.getPurchaseHistoryAsync();
      if (responseCode === InAppPurchases.IAPResponseCode.OK) {
        const hasPremium = results?.some(p => p.productId === PREMIUM_ID);
        if (hasPremium) {
          setIsPremium(true);
          await AsyncStorage.setItem('isPremium', 'true');
          Alert.alert('Restored', 'Premium restored on this device.');
        } else {
          Alert.alert('Nothing to restore', 'No premium purchase found.');
        }
      } else {
        Alert.alert('Restore failed', 'Please try again.');
      }
    } catch (e) {
      Alert.alert('Restore error', String(e?.message || e));
    } finally {
      restoringRef.current = false;
    }
  };

  const scheduleReminder = async (taskId, time, type) => {
    if (!isPremium) return;

    // (Optional) ensure permission and future time here if needed
    const triggerDate = new Date(time);
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Task Reminder',
        body: `Don't forget: ${tasks.find(t => t.id === taskId)?.name || 'a task'}`,
        sound: type === 'alarm' ? 'default' : null,
      },
      trigger: triggerDate,
    });
    setTasks(prev =>
      prev.map(task =>
        task.id === taskId ? { ...task, reminder: { time, type, notifId: id } } : task
      )
    );
  };

  const cancelReminder = async (taskId) => {
    const task = tasks.find(t => t.id === taskId);
    if (task?.reminder?.notifId) {
      await Notifications.cancelScheduledNotificationAsync(task.reminder.notifId);
    }
    setTasks(prev =>
      prev.map(task => (task.id === taskId ? { ...task, reminder: null } : task))
    );
  };

  const toggleTask = (id) => {
    if (!canToggle) return;
    const dateKey = selectedString;
    setTasks(prev =>
      prev.map(task =>
        task.id === id
          ? { ...task, done: { ...task.done, [dateKey]: !task.done?.[dateKey] } }
          : task
      )
    );
  };

  const deleteTask = async (id) => {
    await cancelReminder(id);
    setTasks(prev => prev.filter(task => task.id !== id));
  };

  const addTask = (taskName, selectedDays) => {
    if (!isPremium && tasks.length >= 10) {
      Alert.alert('Upgrade required', 'Free version is limited to 10 tasks.');
      return;
    }
    const trimmed = taskName.trim();
    if (!trimmed) return;
    setTasks(prev => [
      ...prev,
      { id: Date.now().toString(), name: trimmed, done: {}, days: [...selectedDays] },
    ]);
  };

  const filteredTasks = tasks
    .filter(task => task.days.length === 0 || task.days.includes(selectedDayName))
    .sort((a, b) => {
      const aDone = a.done?.[selectedString] || false;
      const bDone = b.done?.[selectedString] || false;
      return aDone - bDone;
    });

  const animateSlide = (direction) => {
    Animated.timing(slideAnim, {
      toValue: direction * -50,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      setSelectedDate(prev => new Date(prev.getTime() + direction * 86400000));
      slideAnim.setValue(direction * 50);
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start();
    });
  };

  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 20,
    onPanResponderRelease: (_, g) => {
      if (g.dx < -50 && !atEnd) {
        Haptics.selectionAsync();
        animateSlide(1);
      } else if (g.dx > 50 && !atStart) {
        Haptics.selectionAsync();
        animateSlide(-1);
      }
    },
  });

  // One-shot upgrade prompt
  useEffect(() => {
    if (showUpgradePrompt) {
      Alert.alert(
        'Upgrade required',
        'Alarm reminders are only available in the premium version.',
        [{ text: 'OK', onPress: () => setShowUpgradePrompt(false) }]
      );
    }
  }, [showUpgradePrompt]);

  // Modal screens
  if (showAddScreen) {
    return (
      <AddTask
        onCancel={() => setShowAddScreen(false)}
        onAdd={(taskName, days) => {
          addTask(taskName, days);
          setShowAddScreen(false);
        }}
        darkMode={darkMode}
      />
    );
  }

  if (showIntro) {
    return (
      <IntroScreen
        onContinue={async () => {
          await AsyncStorage.setItem('seenIntro', 'true');
          setShowIntro(false);
        }}
        darkMode={darkMode}
      />
    );
  }

  // Main
  return (
    <SafeAreaView
      style={[styles.container, darkMode && styles.darkContainer]}
      {...panResponder.panHandlers}
    >
      <Animated.View style={{ transform: [{ translateX: slideAnim }] }}>
        <Header
          selectedDate={selectedDate}
          darkMode={darkMode}
          animateSlide={animateSlide}
          atStart={atStart}
          atEnd={atEnd}
        />

        <FlatList
          data={filteredTasks}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 100 }}
          renderItem={({ item }) => (
            <TaskItem
              task={{ ...item, done: item.done?.[selectedString] || false }}
              onToggle={toggleTask}
              onDelete={deleteTask}
              disabled={!canToggle}
              darkMode={darkMode}
              onSetReminder={(id, reminder) => {
                if (!reminder) {
                  cancelReminder(id);
                } else {
                  if (!isPremium && reminder.type === 'alarm') {
                    setShowUpgradePrompt(true);
                  } else {
                    scheduleReminder(id, reminder.time, reminder.type);
                  }
                }
              }}
              isPremium={isPremium}
              showUpgradePrompt={() => setShowUpgradePrompt(true)}
            />
          )}
        />
      </Animated.View>

      {/* Upgrade bar pinned above the footer */}
      {!isPremium && (
        <View style={styles.upgradeBar}>
          <Text style={{ color: darkMode ? '#fff' : '#333', flex: 1 }}>
            Unlock premium features:
          </Text>
          <Pressable onPress={handleUpgradePurchase} style={styles.upgradeButton}>
            <Text style={{ color: '#fff' }}>Upgrade</Text>
          </Pressable>
          <Pressable onPress={handleRestore} style={[styles.upgradeButton, { marginLeft: 8 }]}>
            <Text style={{ color: '#fff' }}>Restore</Text>
          </Pressable>
        </View>
      )}

      {/* Info modal */}
      <InfoModal visible={showInfo} onClose={() => setShowInfo(false)} darkMode={darkMode} />

      <Footer
        darkMode={darkMode}
        setDarkMode={isPremium ? setDarkMode : () => {}}
        resetToToday={() => setSelectedDate(new Date())}
        onAddPress={() => setShowAddScreen(true)}
        onInfoPress={() => setShowInfo(true)}
        isToday={todayString === selectedString}
        isPremium={isPremium}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
    paddingHorizontal: 24,
    backgroundColor: '#f4f7fa',
  },
  darkContainer: {
    backgroundColor: '#1c1c1e',
  },

  // Upgrade bar (absolute, just above the footer)
  upgradeBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 76, // sits above the footer (adjust if your footer height changes)
    backgroundColor: '#eee',
    borderRadius: 8,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  upgradeButton: {
    backgroundColor: '#4A4A58',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
});
