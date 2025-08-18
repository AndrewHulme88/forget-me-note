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
const DEV_PREMIUM_TOGGLE = true;

// Scheduling guards
const MIN_LEAD_MS = 60_000;           // never schedule within the next 60s
const MAX_BASE_OCCURRENCES = 10;      // future singles to pre-schedule (no repeats)
const REPEAT_CAP = 8;                 // initial + up to 7 repeats

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

  // ===== IAP guards =====
  const iapConnectedRef = useRef(false);
  const purchasingRef = useRef(false);
  const restoringRef = useRef(false);

  // Intro
  useEffect(() => {
    (async () => {
      const seen = await AsyncStorage.getItem('seenIntro');
      if (!seen) setShowIntro(true);
    })();
  }, []);

  // Load persisted data
  useEffect(() => {
    (async () => {
      const json = await AsyncStorage.getItem('tasks');
      const premiumStatus = await AsyncStorage.getItem('isPremium');
      if (json) setTasks(JSON.parse(json));
      if (premiumStatus === 'true') setIsPremium(true);
    })();
  }, []);

  // Persist tasks
  useEffect(() => {
    AsyncStorage.setItem('tasks', JSON.stringify(tasks));
  }, [tasks]);

  // Notifications handler
  useEffect(() => {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
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

  // iOS permissions
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

  // IAP: listener + hydrate
  useEffect(() => {
    let mounted = true;

    InAppPurchases.setPurchaseListener(async ({ responseCode, results, errorCode }) => {
      if (!mounted) return;

      if (responseCode !== InAppPurchases.IAPResponseCode.OK) {
        console.warn('Purchase failed:', errorCode);
        purchasingRef.current = false;
        restoringRef.current = false;
        return;
      }

      for (const purchase of results || []) {
        try {
          if (
            purchase.productId === PREMIUM_ID &&
            (purchase.transactionReceipt ||
              purchase.acknowledged === false ||
              purchase.acknowledged === undefined)
          ) {
            setIsPremium(true);
            await AsyncStorage.setItem('isPremium', 'true');
            await InAppPurchases.finishTransactionAsync(purchase, false);
          }
        } catch (e) {
          console.warn('finishTransaction error', e);
        }
      }

      purchasingRef.current = false;
      restoringRef.current = false;
    });

    (async () => {
      try {
        if (!iapConnectedRef.current) {
          await InAppPurchases.connectAsync();
          iapConnectedRef.current = true;
        }
        const hist = await InAppPurchases.getPurchaseHistoryAsync();
        if (!mounted) return;
        if (hist.responseCode === InAppPurchases.IAPResponseCode.OK) {
          const hasPremium = hist.results?.some(p => p.productId === PREMIUM_ID);
          if (hasPremium) {
            setIsPremium(true);
            await AsyncStorage.setItem('isPremium', 'true');
          }
        }
      } catch (e) {
        console.warn('IAP init error', e?.message || e);
      }
    })();

    return () => { mounted = false; };
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

      await InAppPurchases.purchaseItemAsync(PREMIUM_ID);

      setTimeout(async () => {
        try {
          const hist = await InAppPurchases.getPurchaseHistoryAsync();
          if (
            hist.responseCode === InAppPurchases.IAPResponseCode.OK &&
            hist.results?.some(p => p.productId === PREMIUM_ID)
          ) {
            setIsPremium(true);
            await AsyncStorage.setItem('isPremium', 'true');
          }
        } catch {}
      }, 500);
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

  // ===== Reminder helpers =====
  const isTaskCompletedToday = (task) => !!task?.done?.[new Date().toDateString()];

  // Cancel all scheduled notifications for a task and clear reminder in state (optional)
  const cancelReminder = async (taskId, { clearState = true } = {}) => {
    const task = tasks.find(t => t.id === taskId);
    const ids = task?.reminder?.notifIds || [];
    for (const nid of ids) {
      try { await Notifications.cancelScheduledNotificationAsync(nid); } catch {}
    }
    if (clearState) {
      setTasks(prev =>
        prev.map(task => (task.id === taskId ? { ...task, reminder: null } : task))
      );
    }
  };

  // Generate the next N valid occurrences strictly in the future (>= MIN_LEAD_MS)
  function generateNextOccurrences({ hour, minute, selectedDays, count, skipToday }) {
    const out = [];
    const now = new Date();
    for (let dayOffset = 0; out.length < count && dayOffset < 400; dayOffset++) {
      const d = new Date(now);
      d.setSeconds(0, 0);
      d.setDate(now.getDate() + dayOffset);
      d.setHours(hour, minute, 0, 0);

      const isToday = dayOffset === 0;
      const allowedDay =
        !selectedDays?.length || selectedDays.includes(DAYS[d.getDay()]);
      const farEnough = d.getTime() - now.getTime() >= MIN_LEAD_MS;

      if (allowedDay && (!isToday || !skipToday) && farEnough) {
        out.push(d);
      }
    }
    return out;
  }

  const scheduleReminder = async (taskId, reminderObj) => {
    if (!isPremium || !reminderObj?.time) return;

    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return;

    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    // Clear previous schedules but keep reminder in state
    await cancelReminder(taskId, { clearState: false });

    const picked = new Date(reminderObj.time);
    const hour = picked.getHours();
    const minute = picked.getMinutes();
    const skipToday = isTaskCompletedToday(task);

    // Build upcoming base dates
    const upcoming = generateNextOccurrences({
      hour,
      minute,
      selectedDays: task.days,            // [] or ['Mon','Wed',...]
      count: MAX_BASE_OCCURRENCES,
      skipToday,
    });
    if (upcoming.length === 0) return;

    const notifIds = [];
    const baseContent = {
      title: 'Task Reminder',
      body: `Don't forget: ${task.name || 'a task'}`,
      sound: 'default',
    };

    const scheduleAt = async (dateObj, bodyText) => {
      const id = await Notifications.scheduleNotificationAsync({
        content: bodyText ? { ...baseContent, body: bodyText } : baseContent,
        // Best-practice: pass the Date directly as trigger
        trigger: dateObj,
      });
      notifIds.push(id);
    };

    // 1) First upcoming: base + in-day repeats (stop at midnight)
    const firstAt = upcoming[0];
    await scheduleAt(firstAt, baseContent.body);

    const iv = Number(reminderObj.repeatEveryMins) || 0;
    if (iv > 0) {
      const ivMs = iv * 60 * 1000;
      const endOfDay = new Date(firstAt);
      endOfDay.setHours(23, 59, 59, 999);

      for (let i = 1; i < REPEAT_CAP; i++) {
        const t = new Date(firstAt.getTime() + i * ivMs);
        if (t > endOfDay) break; // don't roll into the next day
        await scheduleAt(t, 'Still due');
      }
    }

    // 2) Remaining upcoming days: base only
    for (let i = 1; i < upcoming.length; i++) {
      await scheduleAt(upcoming[i], baseContent.body);
      if (notifIds.length >= 50) break; // safety against platform caps
    }

    // Persist reminder + ids
    setTasks(prev =>
      prev.map(t =>
        t.id === taskId ? { ...t, reminder: { ...reminderObj, notifIds } } : t
      )
    );
  };

  // ===== DEV premium toggle =====
  const togglePremiumDev = async () => {
    const next = !isPremium;
    setIsPremium(next);
    await AsyncStorage.setItem('isPremium', next ? 'true' : 'false');

    if (!next) {
      for (const t of tasks) {
        if (t.reminder) {
          await cancelReminder(t.id);
        }
      }
      Alert.alert('Premium disabled (dev)', 'All scheduled reminders were cleared.');
    } else {
      Alert.alert('Premium enabled (dev)', 'Premium features are now unlocked.');
    }
  };

  const toggleTask = async (id) => {
    if (!canToggle) return;
    const dateKey = selectedString;

    setTasks(prev =>
      prev.map(task =>
        task.id === id
          ? { ...task, done: { ...task.done, [dateKey]: !task.done?.[dateKey] } }
          : task
      )
    );

    // If marking done now, clear any pending chain for today
    const t = tasks.find(x => x.id === id);
    const willBeDone = !(t?.done?.[dateKey]);
    if (willBeDone) {
      await cancelReminder(id);
    }
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
              hasReminder={!!item.reminder}
              onToggle={toggleTask}
              onDelete={deleteTask}
              disabled={!canToggle}
              darkMode={darkMode}
              onSetReminder={async (id, reminder) => {
                if (!reminder) {
                  await cancelReminder(id);
                  return;
                }
                if (!isPremium) {
                  setShowUpgradePrompt(true);
                  return;
                }
                setTasks(prev => prev.map(t => t.id === id ? { ...t, reminder } : t));
                await scheduleReminder(id, reminder);
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

      {/* DEV premium toggle pill */}
      {DEV_PREMIUM_TOGGLE && (
        <Pressable
          onPress={togglePremiumDev}
          style={[
            styles.devToggle,
            { backgroundColor: isPremium ? '#28a745' : '#c0392b' },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Toggle premium (dev)"
        >
          <Text style={styles.devToggleText}>
            {isPremium ? 'Premium: ON' : 'Premium: OFF'}
          </Text>
        </Pressable>
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

  // Dev pill
  devToggle: {
    position: 'absolute',
    right: 16,
    bottom: 140,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  devToggleText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },
});
