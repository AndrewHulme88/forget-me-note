import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  SafeAreaView,
  StyleSheet,
  TextInput,
  Pressable,
} from 'react-native';
import TaskItem from './components/TaskItem';
import Checkbox from 'expo-checkbox';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect } from 'react';


const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const today = DAYS[new Date().getDay()];

export default function App() {
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState('');
  const [selectedDays, setSelectedDays] = useState([]);

  const toggleTask = (id) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === id ? { ...task, done: !task.done } : task
      )
    );
  };

  const addTask = () => {
    const trimmed = newTask.trim();
    if (!trimmed) return;
    setTasks((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        name: trimmed,
        done: false,
        days: [...selectedDays],
      },
    ]);
    setNewTask('');
    setSelectedDays([]);
  };

  useEffect(() => {
    const loadTasks = async () => {
      try {
        const json = await AsyncStorage.getItem('tasks');
        if (json != null) {
          setTasks(JSON.parse(json));
        }
      } catch (e) {
        console.error('Failed to load tasks:', e);
      }
    };
    loadTasks();
  }, []);

  useEffect(() => {
    const saveTasks = async () => {
      try {
        await AsyncStorage.setItem('tasks', JSON.stringify(tasks));
      } catch (e) {
        console.error('Failed to save tasks:', e);
      }
    };
    saveTasks();
  }, [tasks]);

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Today's Tasks</Text>

      {/* Task input */}
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

      {/* Day selector */}
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
                style={selected ? styles.dayTextSelected : styles.dayText}
              >
                {day}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Task list */}
      <FlatList
        data={tasks.filter(
          (task) => task.days.length === 0 || task.days.includes(today)
        )}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TaskItem task={item} onToggle={toggleTask} />
        )}
      />
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
    fontSize: 26,
    fontWeight: '600',
    marginBottom: 20,
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
