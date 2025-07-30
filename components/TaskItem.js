import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';

const PRIMARY = '#4A4A58';

export default function TaskItem({ task, onToggle, onDelete, disabled, darkMode }) {
  return (
    <View style={[styles.card, darkMode && styles.darkCard]}>
      <Pressable
        onPress={() => !disabled && onToggle(task.id)}
        style={[styles.checkbox, task.done && styles.checked]}
      >
        {task.done && <FontAwesome name="check" size={16} color="#fff" />}
      </Pressable>
      <Text
        style={[
          styles.text,
          task.done && styles.doneText,
          darkMode && styles.darkText,
        ]}
      >
        {task.name}
      </Text>
      <Pressable onPress={() => onDelete(task.id)}>
        <FontAwesome name="trash" size={18} color="#cc0000" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  darkCard: {
    backgroundColor: '#2a2a2d',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 2,
    borderColor: PRIMARY,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 4,
  },
  checked: {
    backgroundColor: PRIMARY,
  },
  text: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  darkText: {
    color: '#fff',
  },
  doneText: {
    textDecorationLine: 'line-through',
    opacity: 0.5,
  },
});
