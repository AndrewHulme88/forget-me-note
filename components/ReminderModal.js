import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

const PRIMARY = '#4A4A58';

const ReminderModal = ({ visible, onClose, onSetReminder, existingReminder }) => {
  // Keep the committed time and a temp time the user can adjust
  const initial = existingReminder ? new Date(existingReminder.time) : new Date();
  const [time, setTime] = useState(initial);
  const [tempTime, setTempTime] = useState(initial);

  // Reset picker time when modal opens with a different existing time
  useEffect(() => {
    const t = existingReminder ? new Date(existingReminder.time) : new Date();
    setTime(t);
    setTempTime(t);
  }, [existingReminder, visible]);

  const handleConfirm = () => {
    setTime(tempTime);
    onSetReminder({ time: tempTime.toISOString() });
    onClose();
  };

  const handleRemove = () => {
    onSetReminder(null);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>Set Reminder</Text>

          {/* Display current temp time */}
          <View style={styles.timeButton}>
            <Text style={styles.timeText}>
              {tempTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>

          {/* Inline picker: user scrolls freely; we commit only on Set */}
          <DateTimePicker
            value={tempTime}
            mode="time"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(_, selected) => {
              if (selected) setTempTime(selected);
            }}
          />

          <View style={styles.actions}>
            <Pressable onPress={handleRemove} style={styles.removeButton}>
              <Text style={styles.buttonText}>Remove</Text>
            </Pressable>
            <Pressable onPress={onClose} style={styles.cancelButton}>
              <Text style={styles.buttonText}>Cancel</Text>
            </Pressable>
            <Pressable onPress={handleConfirm} style={styles.confirmButton}>
              <Text style={styles.buttonText}>Set</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  timeButton: {
    padding: 12,
    backgroundColor: '#eee',
    borderRadius: 8,
    marginBottom: 12,
    alignItems: 'center',
  },
  timeText: {
    fontSize: 18,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 12,
  },
  confirmButton: {
    backgroundColor: PRIMARY,
    padding: 10,
    borderRadius: 6,
  },
  cancelButton: {
    backgroundColor: '#aaa',
    padding: 10,
    borderRadius: 6,
  },
  removeButton: {
    backgroundColor: '#c0392b',
    padding: 10,
    borderRadius: 6,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
});

export default ReminderModal;
