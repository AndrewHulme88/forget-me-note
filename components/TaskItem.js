import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import ReminderModal from './ReminderModal';

const PRIMARY = '#4A4A58';
const ALERT_RED = '#E74C3C';

const TaskItem = ({
  task,
  onToggle,
  onDelete,
  disabled,
  darkMode,
  onSetReminder,      
  isPremium,
  showUpgradePrompt,
  hasReminder,       
}) => {
  const [showReminder, setShowReminder] = useState(false);

  const derivedHasReminder =
    hasReminder ??
    !!(task?.reminder && ((task.reminder.notifIds?.length ?? 0) > 0 || task.reminder.notifId));

  const iconColor = derivedHasReminder ? ALERT_RED : (darkMode ? '#fff' : '#333');

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
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={task.done ? 'Mark task not done' : 'Mark task done'}
        accessibilityState={{ disabled, checked: !!task.done }}
        style={[styles.checkbox, task.done && styles.checked, disabled && styles.checkboxDisabled]}
      >
        {task.done && <Feather name="check" size={16} color="#fff" />}
      </Pressable>

      <Text
        style={[styles.text, task.done && styles.textDone, darkMode && styles.darkText]}
        numberOfLines={2}
        ellipsizeMode="tail"
      >
        {task.name}
      </Text>

      <View style={styles.actions}>
        <Pressable
          onPress={handleClockPress}
          hitSlop={8}
          style={styles.iconButton}
          accessibilityRole="button"
          accessibilityLabel={derivedHasReminder ? 'Edit reminder (set)' : 'Set reminder'}
        >
          <Feather name="clock" size={18} color={iconColor} />
        </Pressable>
        <Pressable
          onPress={() => onDelete(task.id)}
          hitSlop={8}
          style={[styles.iconButton, styles.iconButtonRight]}
          accessibilityRole="button"
          accessibilityLabel="Delete task"
        >
          <Feather name="trash-2" size={18} color="#ff5c5c" />
        </Pressable>
      </View>

      {isPremium && (
        <ReminderModal
          visible={showReminder}
          onClose={() => setShowReminder(false)}
          existingReminder={task.reminder}
          onSetReminder={(reminder) => {
            onSetReminder(task.id, reminder); 
            setShowReminder(false);
          }}
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
  darkItem: { borderColor: '#444' },

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
  checkboxDisabled: { opacity: 0.5 },
  checked: {
    backgroundColor: PRIMARY,
    borderColor: PRIMARY,
  },

  text: { flex: 1, fontSize: 16, color: '#333' },
  darkText: { color: '#eee' },
  textDone: { textDecorationLine: 'line-through', color: '#888' },

  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  iconButton: { padding: 4 },
  iconButtonRight: { marginLeft: 12 }, 
});

export default TaskItem;
