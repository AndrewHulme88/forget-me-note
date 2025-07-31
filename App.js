import React, { useState, useEffect } from 'react';
import {
  View,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Animated,
  PanResponder,
  Platform,
  Alert,
  Text,
  Switch,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import Header from './components/Header';
import TaskItem from './components/TaskItem';
import Footer from './components/Footer';
import AddTask from './components/AddTask';
import IntroScreen from './components/IntroScreen';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const PRIMARY = '#4A4A58';

export default function App() {
  const [tasks, setTasks] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [darkMode, setDarkMode] = useState(false);
  const [showAddScreen, setShowAddScreen] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [showIntro, setShowIntro] = useState(false);

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

  useEffect(() => {
    const checkIntro = async () => {
      const seen = await AsyncStorage.getItem('seenIntro');
      if (!seen) setShowIntro(true);
    };
    checkIntro();
  }, []);

  useEffect(() => {
    const load = async () => {
      const json = await AsyncStorage.getItem('tasks');
      const premiumStatus = await AsyncStorage.getItem('isPremium');
      if (json) setTasks(JSON.parse(json));
      if (premiumStatus === 'true') setIsPremium(true);
    };
    load();
  }, []);

  useEffect(() => {
    AsyncStorage.setItem('tasks', JSON.stringify(tasks));
  }, [tasks]);

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

  const togglePremium = async () => {
    const newStatus = !isPremium;
    setIsPremium(newStatus);
    await AsyncStorage.setItem('isPremium', newStatus ? 'true' : 'false');
  };

  const scheduleReminder = async (taskId, time, type) => {
    if (!isPremium) return;

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
      prev.map(task =>
        task.id === taskId ? { ...task, reminder: null } : task
      )
    );
  };

  const toggleTask = (id) => {
    if (!canToggle) return;
    const dateKey = selectedString;
    setTasks(prev =>
      prev.map(task =>
        task.id === id
          ? {
              ...task,
              done: {
                ...task.done,
                [dateKey]: !task.done?.[dateKey],
              },
            }
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
      {
        id: Date.now().toString(),
        name: trimmed,
        done: {},
        days: [...selectedDays],
      },
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
    onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dx) > 20,
    onPanResponderRelease: (_, gestureState) => {
      if (gestureState.dx < -50 && !atEnd) {
        Haptics.selectionAsync();
        animateSlide(1);
      } else if (gestureState.dx > 50 && !atStart) {
        Haptics.selectionAsync();
        animateSlide(-1);
      }
    },
  });

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
                if (!isPremium) return;
                if (!reminder) {
                  cancelReminder(id);
                } else {
                  scheduleReminder(id, reminder.time, reminder.type);
                }
              }}
            />
          )}
        />
      </Animated.View>

      {/* Premium toggle for testing */}
      <View style={styles.toggleRow}>
        <Text style={{ color: darkMode ? '#fff' : '#333' }}>Premium:</Text>
        <Switch value={isPremium} onValueChange={togglePremium} />
      </View>

      <Footer
        darkMode={darkMode}
        setDarkMode={isPremium ? setDarkMode : () => {}}
        resetToToday={() => setSelectedDate(new Date())}
        onAddPress={() => setShowAddScreen(true)}
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
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
});
