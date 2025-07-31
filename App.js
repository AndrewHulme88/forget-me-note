import React, { useState, useEffect } from 'react';
import {
  View,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Animated,
  PanResponder,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import Header from './components/Header';
import TaskItem from './components/TaskItem';
import Footer from './components/Footer';
import AddTask from './components/AddTask';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const PRIMARY = '#4A4A58';

export default function App() {
  const [tasks, setTasks] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [darkMode, setDarkMode] = useState(false);
  const [showAddScreen, setShowAddScreen] = useState(false);
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
    const load = async () => {
      const json = await AsyncStorage.getItem('tasks');
      if (json) setTasks(JSON.parse(json));
    };
    load();
  }, []);

  useEffect(() => {
    AsyncStorage.setItem('tasks', JSON.stringify(tasks));
  }, [tasks]);

  const toggleTask = (id) => {
    if (!canToggle) return;
    const dateKey = selectedString;
    setTasks((prev) =>
      prev.map((task) =>
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

  const deleteTask = (id) => {
    setTasks((prev) => prev.filter((task) => task.id !== id));
  };

  const addTask = (taskName, selectedDays) => {
    const trimmed = taskName.trim();
    if (!trimmed) return;
    setTasks((prev) => [
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
    .filter((task) => task.days.length === 0 || task.days.includes(selectedDayName))
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
      setSelectedDate((prev) => new Date(prev.getTime() + direction * 86400000));
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
            />
          )}
        />
      </Animated.View>

      <Footer
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        resetToToday={() => setSelectedDate(new Date())}
        onAddPress={() => setShowAddScreen(true)}
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
});
