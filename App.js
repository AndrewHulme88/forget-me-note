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
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import TaskItem from './components/TaskItem';
import * as Haptics from 'expo-haptics';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function App() {
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState('');
  const [selectedDays, setSelectedDays] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
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
        done: {}, // per-date completion
        days: [...selectedDays],
      },
    ]);
    setNewTask('');
    setSelectedDays([]);
  };

  const filteredTasks = tasks
    .filter(
      (task) =>
        task.days.length === 0 || task.days.includes(selectedDayName)
    )
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
      setSelectedDate((prev) =>
        new Date(prev.getTime() + direction * 86400000)
      );

      slideAnim.setValue(direction * 50);
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start();
    });
  };

  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (_, gestureState) =>
      Math.abs(gestureState.dx) > 20,
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
    <SafeAreaView style={styles.container} {...panResponder.panHandlers}>
      <Animated.View style={{ transform: [{ translateX: slideAnim }] }}>
        <Text style={styles.title}>Tasks for {selectedString}</Text>

        <View style={styles.navRow}>
          {!atStart && (
            <Pressable onPress={() => animateSlide(-1)}>
              <Text style={styles.navText}>←</Text>
            </Pressable>
          )}
          <Text style={styles.dateText}>{selectedDate.toDateString()}</Text>
          {!atEnd && (
            <Pressable onPress={() => animateSlide(1)}>
              <Text style={styles.navText}>→</Text>
            </Pressable>
          )}
        </View>

        {canToggle && (
          <>
            <View style={styles.inputRow}>
              <TextInput
                placeholder="New task"
                value={newTask}
                onChangeText={setNewTask}
                style={styles.input}
              />
              <Pressable style={styles.button} onPress={addTask}>
                <Text style={styles.buttonText}>Add</Text>
              </Pressable>
            </View>

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
                    style={[
                      styles.dayButton,
                      selected && styles.dayButtonSelected,
                    ]}
                  >
                    <Text
                      style={
                        selected ? styles.dayTextSelected : styles.dayText
                      }
                    >
                      {day}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        )}

        <FlatList
          data={filteredTasks}
          keyExtractor={(item) => item.id}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 12,
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
  },
  dateText: {
    fontSize: 16,
    fontWeight: '500',
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
  },
  button: {
    marginLeft: 10,
    backgroundColor: '#007AFF',
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
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  dayButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    marginRight: 6,
    marginBottom: 6,
  },
  dayButtonSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  dayText: {
    color: '#333',
  },
  dayTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
});
