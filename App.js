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

// How far ahead to schedule 
const DAILY_HORIZON_DAYS = 30;   // schedule next 30 daily occurrences
const WEEKLY_HORIZON_WEEKS = 12; // schedule next 12 occurrences per selected weekday

export default function App() {
  const [tasks, setTasks] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [darkMode, setDarkMode] = useState(false);
  const [showAddScreen, setShowAddScreen] = useState(false);

  // Production: start false
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

  // First run intro
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

  // Notifications foreground handler 
  useEffect(() => {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true, // iOS 15+
        shouldShowList: true,
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
    }
  }, []);

  // iOS permission request
  useEffect(() => {
    (async () => {
      const { status: existing } = await Notifications.getPermissionsAsync();
      let status = existing;
      if (existing !== 'granted') {
        const { status: asked } = await Notifications.requestPermissionsAsync({
          ios: { allowAlert: true, allowSound: true, allowBadge: true },
        });
        status = asked;
      }
      if (status !== 'granted') {
        Alert.alert(
          'Notifications disabled',
          'Enable them in iOS Settings > Notifications to receive alerts.'
        );
      }
    })();
  }, []);

  // In App Purchases: connect/restore/listen
  useEffect(() => {
    let mounted = true;

    const initIAP = async () => {
      try {
        if (!iapConnectedRef.current) {
          await InAppPurchases.connectAsync();
          iapConnectedRef.current = true;
        }

        const hist = await InAppPurchases.getPurchaseHistoryAsync();
        if (mounted && hist.responseCode === InAppPurchases.IAPResponseCode.OK) {
          const hasPremium = hist.results?.some(p => p.productId === 'premium_upgrade');
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
              if (purchase.productId === 'premium_upgrade') {
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
    };
  }, []);

  const handleUpgradePurchase = async () => {
    if (purchasingRef.current) return;
    purchasingRef.current = true;
    try {
      const { responseCode, results } = await InAppPurchases.getProductsAsync(['premium_upgrade']);
      if (responseCode !== InAppPurchases.IAPResponseCode.OK || !results?.length) {
        Alert.alert('Product not found', 'Check product ID and App Store Connect status.');
        purchasingRef.current = false;
        return;
      }
      const res = await InAppPurchases.purchaseItemAsync('premium_upgrade');
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
        const hasPremium = results?.some(p => p.productId === 'premium_upgrade');
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

  // Cancel all existing reminder notifications for a task
  const cancelReminder = async (taskId) => {
    const task = tasks.find(t => t.id === taskId);
    const ids = task?.reminder?.notifIds || (task?.reminder?.notifId ? [task.reminder.notifId] : []);
    for (const nid of ids) {
      try {
        await Notifications.cancelScheduledNotificationAsync(nid);
      } catch {}
    }
    setTasks(prev =>
      prev.map(task => (task.id === taskId ? { ...task, reminder: null } : task))
    );
  };

  // Build a Date for today at hour:minute, else roll to tomorrow; ensure >= 30s in the future
  function nextDailyOccurrence(hour, minute) {
    const now = new Date();
    const d = new Date(now);
    d.setSeconds(0, 0);
    d.setHours(hour, minute, 0, 0);
    if (d.getTime() - now.getTime() <= 30_000) {
      d.setDate(d.getDate() + 1);
    }
    return d;
  }

  // Build a Date for the next occurrence of given weekday (0=Sun..6=Sat) at hour:minute; ensure >=30s
  function nextWeeklyOccurrence(weekdayZeroBased, hour, minute) {
    const now = new Date();
    const d = new Date(now);
    d.setSeconds(0, 0);
    d.setHours(hour, minute, 0, 0);

    const today = now.getDay(); 
    let diff = weekdayZeroBased - today;
    if (diff < 0) diff += 7;
    d.setDate(now.getDate() + diff);

    if (d.getTime() - now.getTime() <= 30_000) {
      d.setDate(d.getDate() + 7);
    }
    return d;
  }

  // Schedule repeating reminders without repeats (pre-schedule concrete dates)
  const scheduleReminder = async (taskId, timeISO) => {
    if (!isPremium) return;

    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return;

    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    // Clear any previous schedules for this task
    await cancelReminder(taskId);

    const picked = new Date(timeISO);
    const hour = picked.getHours();
    const minute = picked.getMinutes();

    const notifIds = [];
    const baseContent = {
      title: 'Task Reminder',
      body: `Don't forget: ${task.name || 'a task'}`,
      sound: 'default',
    };

    // Helper to schedule at a concrete Date
    const scheduleAt = async (dateObj) => {
      const id = await Notifications.scheduleNotificationAsync({
        content: baseContent,
        trigger: { type: 'date', date: dateObj }, 
      });
      notifIds.push(id);
    };

    if (!task.days || task.days.length === 0) {
      // Daily: schedule next 30 days
      let first = nextDailyOccurrence(hour, minute);
      for (let i = 0; i < DAILY_HORIZON_DAYS; i++) {
        const d = new Date(first);
        d.setDate(first.getDate() + i);
        await scheduleAt(d);
      }
    } else {
      // Weekly: for each selected weekday, schedule next 12 weeks
      const weekdayZero = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
      for (const dayName of task.days) {
        const wzb = weekdayZero[dayName];
        if (wzb == null) continue;
        const first = nextWeeklyOccurrence(wzb, hour, minute);
        for (let i = 0; i < WEEKLY_HORIZON_WEEKS; i++) {
          const d = new Date(first);
          d.setDate(first.getDate() + i * 7);
          await scheduleAt(d);
        }
      }
    }

    setTasks(prev =>
      prev.map(t =>
        t.id === taskId ? { ...t, reminder: { time: timeISO, notifIds } } : t
      )
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

  useEffect(() => {
    if (showUpgradePrompt) {
      Alert.alert(
        'Upgrade required',
        'Reminders are only available in the premium version.',
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
              hasReminder={!!(item.reminder && (item.reminder.notifIds?.length || item.reminder.notifId))}
              onToggle={toggleTask}
              onDelete={deleteTask}
              disabled={!canToggle}
              darkMode={darkMode}
              onSetReminder={(id, reminder) => {
                if (!reminder) {
                  cancelReminder(id);
                } else {
                  if (!isPremium) {
                    setShowUpgradePrompt(true);
                  } else {
                    scheduleReminder(id, reminder.time);
                  }
                }
              }}
              isPremium={isPremium}
              showUpgradePrompt={() => setShowUpgradePrompt(true)}
            />
          )}
        />
      </Animated.View>

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

  upgradeBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 76,
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
