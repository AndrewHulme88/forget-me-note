import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  SafeAreaView,
  StyleSheet,
  TextInput,
  Pressable,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import TaskItem from './components/TaskItem';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function App() {
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState('');
  const [selectedDays, setSelectedDays] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());

  const today = new Date();
  const todayString = today.toDateString();
  const selectedDayName = DAYS[selectedDate.getDay()];
  const selectedString = selectedDate.toDateString();
  const canToggle = todayString === selectedString;

  // Limit navigation to ±7 days from today
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - 6); // Only allow back to 6 days ago (excludes today)

  const endDate = new Date(today);
  endDate.setDate(today.getDate() + 5); // Only allow forward to 6 days ahead (excludes today)

  const atStart = selectedDate <= startDate;
  const atEnd = selectedDate >= endDate;

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
    setTasks((prev) =>
      prev.map((task) =>
        task.id === id ? { ...task, done: !task.done } : task
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
        done: false,
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
    .sort((a, b) => a.done - b.done);

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Tasks for {selectedString}</Text>

      {/* Date navigation */}
      <View style={styles.navRow}>
        {!atStart && (
          <Pressable
            onPress={() =>
              setSelectedDate((prev) => new Date(prev.getTime() - 86400000))
            }
          >
            <Text style={styles.navText}>←</Text>
          </Pressable>
        )}
        <Text style={styles.dateText}>{selectedDate.toDateString()}</Text>
        {!atEnd && (
          <Pressable
            onPress={() =>
              setSelectedDate((prev) => new Date(prev.getTime() + 86400000))
            }
          >
            <Text style={styles.navText}>→</Text>
          </Pressable>
        )}
      </View>

      {/* Only show input form for today */}
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

      {/* Task list */}
      <FlatList
        data={filteredTasks}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TaskItem
            task={item}
            onToggle={toggleTask}
            onDelete={deleteTask}
            disabled={!canToggle}
          />
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
