import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Checkbox from 'expo-checkbox';

export default function TaskItem({ task, onToggle }) {
  return (
    <View style={styles.container}>
      <Checkbox value={task.done} onValueChange={() => onToggle(task.id)} />
      <Text style={[styles.text, task.done && styles.done]}>
        {task.name}
      </Text>
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
});
