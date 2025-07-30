import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Checkbox from 'expo-checkbox';

export default function TaskItem({ task, onToggle, onDelete }) {
  return (
    <View style={styles.container}>
      <Checkbox value={task.done} onValueChange={() => onToggle(task.id)} />
      <Text style={[styles.text, task.done && styles.done]}>
        {task.name}
      </Text>
      <Pressable onPress={() => onDelete(task.id)} style={styles.delete}>
        <Text style={styles.deleteText}>✕</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomColor: '#ddd',
    borderBottomWidth: 1,
  },
  text: {
    marginLeft: 10,
    fontSize: 16,
  },
  done: {
    textDecorationLine: 'line-through',
    color: '#999',
  },
  delete: {
    marginLeft: 'auto',
    padding: 4,
  },
  deleteText: {
    color: '#ff3b30',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
