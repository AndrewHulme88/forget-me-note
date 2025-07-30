import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  SafeAreaView,
  StyleSheet,
  TextInput,
  Pressable,
  PanResponder,
  Animated,
  ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import TaskItem from './components/TaskItem';
import * as Haptics from 'expo-haptics';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const PRIMARY = '#4A4A58'; // neutral dark grey

export default function App() {
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState('');
  const [selectedDays, setSelectedDays] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [darkMode, setDarkMode] = useState(false);
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

  const atStart = selectedDate.toDateString() === startDate.toDateString();
  const atEnd = selectedDate.toDateString() === endDate.toDateString();

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
    const dateKey = selectedDate.toDateString();
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

  const addTask = () => {
    const trimmed = newTask.trim();
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
    setNewTask('');
    setSelectedDays([]);
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

  return (
    <SafeAreaView
      style={[styles.container, darkMode && styles.darkContainer]}
      {...panResponder.panHandlers}
    >
      <Animated.View style={{ transform: [{ translateX: slideAnim }] }}>
        <View style={styles.navRow}>
          <View style={{ width: 32 }}>
            {!atStart && (
              <Pressable onPress={() => animateSlide(-1)}>
                <Text style={[styles.navText, darkMode && styles.darkText]}>←</Text>
              </Pressable>
            )}
          </View>
          <Text style={[styles.dateText, darkMode && styles.darkText]}>
            {selectedDate.toDateString()}
          </Text>
          <View style={{ width: 32, alignItems: 'flex-end' }}>
            {!atEnd && (
              <Pressable onPress={() => animateSlide(1)}>
                <Text style={[styles.navText, darkMode && styles.darkText]}>→</Text>
              </Pressable>
            )}
          </View>
        </View>

        {canToggle && (
          <View style={[styles.addTaskCard, darkMode && styles.darkCard]}>
            <View style={styles.inputRow}>
              <TextInput
                placeholder="New task"
                value={newTask}
                onChangeText={setNewTask}
                style={[styles.input, darkMode && styles.darkInput]}
                placeholderTextColor={darkMode ? '#ccc' : '#888'}
              />
              <Pressable style={styles.button} onPress={addTask}>
                <Text style={styles.buttonText}>Add</Text>
              </Pressable>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.daysRow}>
                {DAYS.map((day) => {
                  const selected = selectedDays.includes(day);
                  return (
                    <Pressable
                      key={day}
                      onPress={() =>
                        setSelectedDays((prev) =>
                          prev.includes(day)
                            ? prev.filter((d) => d !== day)
                            : [...prev, day]
                        )
                      }
                      style={[styles.dayButton, selected && styles.dayButtonSelected]}
                    >
                      <Text
                        style={[
                          selected ? styles.dayTextSelected : styles.dayText,
                          !selected && darkMode && { color: '#fff' },
                        ]}
                      >
                        {day}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        )}

        <FlatList
          data={filteredTasks}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 100 }}
          renderItem={({ item }) => (
            <TaskItem
              task={{
                ...item,
                done: item.done?.[selectedString] || false,
              }}
              onToggle={toggleTask}
              onDelete={deleteTask}
              disabled={!canToggle}
            />
          )}
        />
      </Animated.View>

      <View style={[styles.footer, darkMode && styles.darkFooter]}>
        <Pressable onPress={() => setSelectedDate(new Date())} style={styles.footerButton}>
          <Text style={styles.footerButtonText}>Today</Text>
        </Pressable>
        <Pressable onPress={() => setDarkMode((prev) => !prev)} style={styles.footerButton}>
          <Text style={styles.footerButtonText}>
            {darkMode ? 'Light Mode' : 'Dark Mode'}
          </Text>
        </Pressable>
      </View>
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
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  navText: {
    fontSize: 24,
    paddingHorizontal: 10,
    color: PRIMARY,
  },
  darkText: {
    color: '#fff',
  },
  dateText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  addTaskCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 4,
    elevation: 2,
  },
  darkCard: {
    backgroundColor: '#2a2a2d',
  },
  inputRow: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    padding: 10,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  darkInput: {
    backgroundColor: '#444',
    color: '#fff',
    borderColor: '#666',
  },
  button: {
    marginLeft: 10,
    backgroundColor: PRIMARY,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
  daysRow: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
  },
  dayButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    marginRight: 6,
  },
  dayButtonSelected: {
    backgroundColor: PRIMARY,
    borderColor: PRIMARY,
  },
  dayText: {
    color: '#333',
  },
  dayTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    padding: 16,
    backgroundColor: '#f4f7fa',
    borderTopWidth: 1,
    borderColor: '#ddd',
  },
  darkFooter: {
    backgroundColor: '#1c1c1e',
    borderColor: '#444',
  },
  footerButton: {
    backgroundColor: PRIMARY,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
  },
  footerButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});
