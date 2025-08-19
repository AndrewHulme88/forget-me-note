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
  Modal,
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
const DEV_PREMIUM_TOGGLE = false;

// Scheduling guards
const MIN_LEAD_MS = 60_000;        // never schedule within the next 60s
const MAX_BASE_OCCURRENCES = 3;    // future singles (no repeats) to pre-schedule
const REPEAT_CAP = 8;              // initial + up to 7 repeats
const CATEGORY_ID = 'TASK_REMINDER';

function pad2(n) { return String(n).padStart(2, '0'); }
function dateKeyLocal(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
const ensureLead = (d) => {
  const now = new Date();
  return (d.getTime() - now.getTime() < MIN_LEAD_MS)
    ? new Date(now.getTime() + MIN_LEAD_MS)
    : d;
};

// --- Ensure notification category is registered before scheduling ---
const categoriesReadyRef = { current: false, promise: null };
async function ensureCategoriesRegistered() {
  if (categoriesReadyRef.current) return;
  if (categoriesReadyRef.promise) return categoriesReadyRef.promise;

  categoriesReadyRef.promise = (async () => {
    await Notifications.setNotificationCategoryAsync(CATEGORY_ID, [
      { identifier: 'SNOOZE_5', buttonTitle: 'Snooze 5m', options: { opensAppToForeground: true } },
      { identifier: 'SNOOZE_15', buttonTitle: 'Snooze 15m', options: { opensAppToForeground: true } },
      { identifier: 'STOP_TODAY', buttonTitle: 'Stop today', options: { opensAppToForeground: true, isDestructive: true } },
    ]);
    categoriesReadyRef.current = true;
  })();

  return categoriesReadyRef.promise;
}

export default function App() {
  const [tasks, setTasks] = useState([]);
  const tasksRef = useRef(tasks);
  useEffect(() => { tasksRef.current = tasks; }, [tasks]);

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [darkMode, setDarkMode] = useState(false);
  const [showAddScreen, setShowAddScreen] = useState(false);

  const [isPremium, setIsPremium] = useState(false);
  const [showIntro, setShowIntro] = useState(false);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  // Quick Actions modal state
  const [qa, setQa] = useState(null); // { taskId, dateKey, repeatEveryMins, taskName }
  const qaBlockUntilRef = useRef(0);  // debounce re-opening right after an action

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

  // Notifications handler & actions (register early)
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

    // Register actions ASAP on app start
    ensureCategoriesRegistered();

    // Foreground: show in-app Quick Actions sheet immediately
    const recv = Notifications.addNotificationReceivedListener((evt) => {
      const data = evt.request?.content?.data || {};
      const taskId = data.taskId;
      const dateKey = data.dateKey || dateKeyLocal(new Date());
      if (!taskId) return;

      // Debounce & respect stop-today flag
      if (Date.now() < qaBlockUntilRef.current) return;
      const t = tasksRef.current.find(tt => tt.id === taskId);
      if (t?.reminder?.stoppedDates?.[dateKey]) return;

      setQa({
        taskId,
        dateKey,
        repeatEveryMins: Number(data.repeatEveryMins) || 0,
        taskName: evt.request?.content?.body || 'Reminder',
      });
    });

    // When user taps the banner / lock screen (default action), also show Quick Actions
    const resp = Notifications.addNotificationResponseReceivedListener(async (res) => {
      const data = res.notification.request.content.data || {};
      const taskId = data.taskId;
      const dateKey = data.dateKey || dateKeyLocal(new Date());
      const repeatEveryMins = Number(data.repeatEveryMins) || 0;
      const taskName = res.notification.request.content.body || 'Reminder';
      if (!taskId) return;

      const defaultIds = new Set([
        Notifications.DEFAULT_ACTION_IDENTIFIER,
        'com.apple.UNNotificationDefaultActionIdentifier',
        'expo.notifications.actions.DEFAULT',
        undefined,
        null,
      ]);

      // Debounce & respect stop-today flag
      if (Date.now() < qaBlockUntilRef.current) return;
      const t = tasksRef.current.find(tt => tt.id === taskId);
      if (t?.reminder?.stoppedDates?.[dateKey]) return;

      if (defaultIds.has(res.actionIdentifier)) {
        setQa({ taskId, dateKey, repeatEveryMins, taskName });
        return;
      }

      switch (res.actionIdentifier) {
        case 'STOP_TODAY':
          // close immediately, then stop
          closeQa();
          await cancelTodayChain(taskId, dateKey, { markStopped: true });
          break;
        case 'SNOOZE_5':
          closeQa();
          await snooze(taskId, dateKey, 5, repeatEveryMins);
          break;
        case 'SNOOZE_15':
          closeQa();
          await snooze(taskId, dateKey, 15, repeatEveryMins);
          break;
        default:
          break;
      }
    });

    return () => {
      recv.remove();
      resp.remove();
    };
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

  // In App Purchases
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
            (purchase.transactionReceipt || purchase.acknowledged === false || purchase.acknowledged === undefined)
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

  // Cancel ALL notifications for a task (used on delete / disable premium)
  const cancelAllForTask = async (taskId, { clearState = true } = {}) => {
    const task = tasksRef.current.find(t => t.id === taskId);
    const map = task?.reminder?.notifMap || {};
    const allIds = Object.values(map).flat();

    // legacy fallbacks
    const legacy = [
      ...(task?.reminder?.notifIds || []),
      ...(task?.reminder?.notifId ? [task.reminder.notifId] : []),
    ];
    for (const nid of [...allIds, ...legacy]) {
      try { await Notifications.cancelScheduledNotificationAsync(nid); } catch {}
    }
    if (clearState) {
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, reminder: null } : t));
    }
  };

  // Cancel ONLY today's chain (leave future days intact)
  const cancelTodayChain = async (taskId, dateKey = dateKeyLocal(new Date()), opts = { markStopped: false }) => {
    const task = tasksRef.current.find(t => t.id === taskId);
    if (!task?.reminder) return;

    const ids = task.reminder.notifMap?.[dateKey] || [];
    for (const nid of ids) {
      try { await Notifications.cancelScheduledNotificationAsync(nid); } catch {}
    }

    const newMap = { ...(task.reminder.notifMap || {}) };
    delete newMap[dateKey];

    const newStopped = { ...(task.reminder.stoppedDates || {}) };
    if (opts.markStopped) newStopped[dateKey] = true;

    setTasks(prev => prev.map(t =>
      t.id === taskId
        ? { ...t, reminder: { ...t.reminder, notifMap: newMap, stoppedDates: newStopped } }
        : t
    ));
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

  const iosInterruptionLevel =
    Platform.OS === 'ios' ? Notifications.IOSNotificationInterruptionLevel?.TIME_SENSITIVE : undefined;

  const scheduleReminder = async (taskId, reminderObj) => {
    if (!isPremium || !reminderObj?.time) return;

    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return;

    // Ensure actions exist before any schedules
    await ensureCategoriesRegistered();

    const task = tasksRef.current.find(t => t.id === taskId);
    if (!task) return;

    // Preserve any stop flags; clear schedules
    const prevStopped = task.reminder?.stoppedDates || {};
    await cancelAllForTask(taskId, { clearState: false });
    setTasks(prev => prev.map(t =>
      t.id === taskId ? { ...t, reminder: { ...reminderObj, notifMap: {}, stoppedDates: { ...prevStopped } } } : t
    ));

    const picked = new Date(reminderObj.time);
    const hour = picked.getHours();
    const minute = picked.getMinutes();
    const skipToday = isTaskCompletedToday(task) || !!prevStopped[dateKeyLocal(new Date())];

    const upcoming = generateNextOccurrences({
      hour,
      minute,
      selectedDays: task.days,
      count: MAX_BASE_OCCURRENCES,
      skipToday,
    });
    if (upcoming.length === 0) return;

    const baseContent = (taskName, extra = {}) => ({
      title: 'Task Reminder',
      body: taskName || 'Reminder',
      sound: 'default',
      categoryIdentifier: CATEGORY_ID,
      ...(iosInterruptionLevel ? { interruptionLevel: iosInterruptionLevel } : {}),
      ...extra,
    });

    const scheduleAt = async (dateObj, extraData = {}) => {
      const when = ensureLead(dateObj);
      const id = await Notifications.scheduleNotificationAsync({
        content: { ...baseContent(task.name), data: extraData },
        trigger: when, // pass Date directly
      });
      return id;
    };

    const localMap = {};

    // First upcoming day: base + in-day repeats
    const firstAt = ensureLead(upcoming[0]);
    const firstKey = dateKeyLocal(firstAt);
    localMap[firstKey] = localMap[firstKey] || [];

    const firstId = await scheduleAt(firstAt, {
      taskId,
      dateKey: firstKey,
      repeatEveryMins: Number(reminderObj.repeatEveryMins) || 0,
    });
    localMap[firstKey].push(firstId);

    const iv = Number(reminderObj.repeatEveryMins) || 0;
    if (iv > 0) {
      const ivMs = iv * 60 * 1000;
      const endOfDay = new Date(firstAt);
      endOfDay.setHours(23, 59, 59, 999);

      for (let i = 1; i < REPEAT_CAP; i++) {
        const t = ensureLead(new Date(firstAt.getTime() + i * ivMs));
        if (t > endOfDay) break;
        const rid = await scheduleAt(t, {
          taskId,
          dateKey: firstKey,
          repeatEveryMins: iv,
        });
        localMap[firstKey].push(rid);
      }
    }

    // Remaining upcoming days: base only
    for (let i = 1; i < upcoming.length; i++) {
      const d = ensureLead(upcoming[i]);
      const k = dateKeyLocal(d);
      const id = await scheduleAt(d, {
        taskId,
        dateKey: k,
        repeatEveryMins: iv,
      });
      localMap[k] = localMap[k] || [];
      localMap[k].push(id);
      if (Object.values(localMap).flat().length >= 50) break;
    }

    setTasks(prev =>
      prev.map(t =>
        t.id === taskId
          ? { ...t, reminder: { ...reminderObj, notifMap: localMap, stoppedDates: { ...prevStopped } } }
          : t
      )
    );
  };

  // Snooze: cancel today's chain and reschedule today only starting in X minutes
  const scheduleTodayChain = async (taskId, startAt, repeatEveryMins) => {
    const task = tasksRef.current.find(t => t.id === taskId);
    if (!task?.reminder) return;

    await ensureCategoriesRegistered();

    const k = dateKeyLocal(startAt);
    // clear existing today's AND clear stop flag (snooze overrides a stop)
    await cancelTodayChain(taskId, k, { markStopped: false });

    const endOfDay = new Date(startAt);
    endOfDay.setHours(23, 59, 59, 999);

    const ids = [];
    const scheduleAt = async (dateObj) => {
      const when = ensureLead(dateObj);
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Task Reminder',
          body: task.name || 'Reminder',
          sound: 'default',
          categoryIdentifier: CATEGORY_ID,
          ...(iosInterruptionLevel ? { interruptionLevel: iosInterruptionLevel } : {}),
          data: { taskId, dateKey: k, repeatEveryMins: Number(repeatEveryMins) || 0 },
        },
        trigger: when,
      });
      ids.push(id);
    };

    const first = ensureLead(new Date(startAt));
    await scheduleAt(first);

    const iv = Number(repeatEveryMins) || 0;
    if (iv > 0) {
      const ivMs = iv * 60 * 1000;
      for (let i = 1; i < REPEAT_CAP; i++) {
        const t = ensureLead(new Date(first.getTime() + i * ivMs));
        if (t > endOfDay) break;
        await scheduleAt(t);
      }
    }

    // merge into notifMap and clear any stopped flag for that date
    setTasks(prev => prev.map(t => {
      if (t.id !== taskId) return t;
      const prevMap = t.reminder?.notifMap || {};
      const prevStopped = { ...(t.reminder?.stoppedDates || {}) };
      delete prevStopped[k];
      return { ...t, reminder: { ...t.reminder, notifMap: { ...prevMap, [k]: ids }, stoppedDates: prevStopped } };
    }));
  };

  const snooze = async (taskId, dateKey, minutes, repeatEveryMins) => {
    const start = new Date();
    start.setMinutes(start.getMinutes() + minutes);
    await scheduleTodayChain(taskId, start, repeatEveryMins);
  };

  // ===== DEV premium toggle =====
  const togglePremiumDev = async () => {
    const next = !isPremium;
    setIsPremium(next);
    await AsyncStorage.setItem('isPremium', next ? 'true' : 'false');

    if (!next) {
      for (const t of tasksRef.current) {
        if (t.reminder) {
          await cancelAllForTask(t.id);
        }
      }
      Alert.alert('Premium disabled (dev)', 'All scheduled reminders were cleared.');
    } else {
      Alert.alert('Premium enabled (dev)', 'Premium features are now unlocked.');
    }
  };

  const toggleTask = async (id) => {
    if (!canToggle) return;
    const todayDoneKey = new Date().toDateString();
    const todayDateKey = dateKeyLocal(new Date());

    setTasks(prev =>
      prev.map(task =>
        task.id === id
          ? { ...task, done: { ...task.done, [todayDoneKey]: !task.done?.[todayDoneKey] } }
          : task
      )
    );

    // If marking done for today, stop ONLY today's chain
    const t = tasksRef.current.find(x => x.id === id);
    const wasDone = !!t?.done?.[todayDoneKey];
    const willBeDone = !wasDone;
    if (willBeDone) {
      await cancelTodayChain(id, todayDateKey, { markStopped: true });
    }
  };

  const deleteTask = async (id) => {
    await cancelAllForTask(id);
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

  // helpers for QA modal
  const closeQa = () => {
    setQa(null);
    qaBlockUntilRef.current = Date.now() + 1500; // brief block to avoid immediate re-open
  };

  // === Quick Actions Modal ===
  const QuickActions = () => {
    if (!qa?.taskId) return null;
    return (
      <Modal
        visible
        transparent
        animationType="fade"
        onRequestClose={closeQa}
      >
        <Pressable style={styles.qaOverlay} onPress={closeQa}>
          <Pressable style={[styles.qaCard, darkMode && { backgroundColor: '#2a2a2d' }]} onPress={() => {}}>
            <Text style={[styles.qaTitle, darkMode && { color: '#fff' }]}>
              {qa.taskName || 'Reminder'}
            </Text>
            <View style={styles.qaRow}>
              <Pressable
                style={[styles.qaBtn, styles.qaPrimary]}
                onPress={async () => {
                  const { taskId, dateKey } = qa;
                  closeQa();
                  await cancelTodayChain(taskId, dateKey, { markStopped: true });
                }}
              >
                <Text style={styles.qaBtnText}>Stop today</Text>
              </Pressable>
              <Pressable
                style={[styles.qaBtn, { marginLeft: 8 }]}
                onPress={async () => {
                  const { taskId, dateKey, repeatEveryMins } = qa;
                  closeQa();
                  await snooze(taskId, dateKey, 5, repeatEveryMins);
                }}
              >
                <Text style={styles.qaBtnText}>Snooze 5m</Text>
              </Pressable>
              <Pressable
                style={[styles.qaBtn, { marginLeft: 8 }]}
                onPress={async () => {
                  const { taskId, dateKey, repeatEveryMins } = qa;
                  closeQa();
                  await snooze(taskId, dateKey, 15, repeatEveryMins);
                }}
              >
                <Text style={styles.qaBtnText}>Snooze 15m</Text>
              </Pressable>
            </View>
            <Pressable onPress={closeQa} style={[styles.qaClose]}>
              <Text style={[styles.qaCloseText]}>Close</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    );
  };

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
                  await cancelAllForTask(id);
                  return;
                }
                if (!isPremium) {
                  setShowUpgradePrompt(true);
                  return;
                }
                // Store and schedule
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

      {/* In-app Quick Actions for notifications */}
      <QuickActions />

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

  // Quick Actions styling
  qaOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  qaCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  qaTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
    color: '#333',
  },
  qaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  qaBtn: {
    backgroundColor: '#6c6f7d',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  qaPrimary: {
    backgroundColor: '#4A4A58',
  },
  qaBtnText: {
    color: '#fff',
    fontWeight: '700',
  },
  qaClose: {
    alignSelf: 'center',
    paddingVertical: 10,
  },
  qaCloseText: {
    color: '#666',
    fontWeight: '600',
  },
});
