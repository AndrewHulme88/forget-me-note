import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import ReminderModal from './ReminderModal';

const TaskItem = ({
  task,
  onToggle,
  onDelete,
  disabled,
  darkMode,
  onSetReminder,
  isPremium,
  showUpgradePrompt,
}) => {
  const [showReminder, setShowReminder] = useState(false);

  const handleClockPress = () => {
    if (!isPremium) {
      showUpgradePrompt?.();
    } else {
      setShowReminder(true);
    }
  };

  return (
    <View style={[styles.item, darkMode && styles.darkItem]}>
      <Pressable
        onPress={() => !disabled && onToggle(task.id)}
        style={[styles.checkbox, task.done && styles.checked]}
      >
        {task.done && <Feather name="check" size={16} color="#fff" />}
      </Pressable>

      <Text style={[styles.text, task.done && styles.textDone, darkMode && styles.darkText]}>
        {task.name}
      </Text>

      <View style={styles.actions}>
        <Pressable onPress={handleClockPress} style={styles.iconButton}>
          <Feather name="clock" size={18} color={darkMode ? '#fff' : '#333'} />
        </Pressable>
        <Pressable onPress={() => onDelete(task.id)} style={styles.iconButton}>
          <Feather name="trash-2" size={18} color="#ff5c5c" />
        </Pressable>
      </View>

      {isPremium && (
        <ReminderModal
          visible={showReminder}
          onClose={() => setShowReminder(false)}
          onSetReminder={(time, type) => {
            onSetReminder(task.id, time, type);
            setShowReminder(false);
          }}
          onRemoveReminder={() => {
            onSetReminder(task.id, null, null);
            setShowReminder(false);
          }}
          currentReminder={task.reminder}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderColor: '#ddd',
  },
  darkItem: {
    borderColor: '#444',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#888',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checked: {
    backgroundColor: '#4A4A58',
    borderColor: '#4A4A58',
  },
  text: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  darkText: {
    color: '#eee',
  },
  textDone: {
    textDecorationLine: 'line-through',
    color: '#888',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  iconButton: {
    padding: 4,
  },
});

export default TaskItem;
