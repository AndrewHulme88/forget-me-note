import React, { useState } from 'react';
import { View, Text, FlatList, SafeAreaView, StyleSheet } from 'react-native';
import TaskItem from './components/TaskItem';

export default function App() {
  const [tasks, setTasks] = useState([
    { id: '1', name: 'Take vitamins', done: false },
    { id: '2', name: 'Feed the dog', done: true },
    { id: '3', name: 'Take medication', done: false },
  ]);

  const toggleTask = (id) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === id ? { ...task, done: !task.done } : task
      )
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Today's Tasks</Text>
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
});
