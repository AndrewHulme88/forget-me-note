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

export default function App() {
  const [tasks, setTasks] = useState([
    { id: '1', name: 'Take vitamins', done: false },
    { id: '2', name: 'Feed the dog', done: true },
  ]);
  const [newTask, setNewTask] = useState('');

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
      { id: Date.now().toString(), name: trimmed, done: false },
    ]);
    setNewTask('');
  };

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

      {/* Task list */}
      <FlatList
        data={tasks}
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
    marginBottom: 20,
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
});
