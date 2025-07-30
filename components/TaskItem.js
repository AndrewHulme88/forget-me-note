import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Checkbox from 'expo-checkbox';
import { MaterialIcons } from '@expo/vector-icons';

export default function TaskItem({ task, onToggle, onDelete, disabled }) {
  return (
    <View style={styles.container}>
      <Checkbox
        value={task.done}
        onValueChange={() => onToggle(task.id)}
        disabled={disabled}
      />
      <Text style={[styles.text, task.done && styles.done]}>
        {task.name}
      </Text>
      <Pressable onPress={() => onDelete(task.id)} style={styles.delete}>
        <MaterialIcons name="delete" size={20} color="#ff3b30" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomColor: '#e2e2e2',
    borderBottomWidth: 1,
    backgroundColor: '#fff',
    borderRadius: 6,
    marginBottom: 8,
  },
  text: {
    marginLeft: 10,
    fontSize: 16,
    flex: 1,
    color: '#1c1c1e',
  },
  done: {
    textDecorationLine: 'line-through',
    color: '#999',
  },
  delete: {
    padding: 6,
  },
});
