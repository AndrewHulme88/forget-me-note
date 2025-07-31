// components/ReminderModal.js
import React, { useState } from 'react';
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
  const [time, setTime] = useState(
    existingReminder ? new Date(existingReminder.time) : new Date()
  );
  const [mode, setMode] = useState(existingReminder?.mode || 'silent');
  const [showPicker, setShowPicker] = useState(false);

  const handleConfirm = () => {
    onSetReminder({ time: time.toISOString(), mode });
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

          <Pressable onPress={() => setShowPicker(true)} style={styles.timeButton}>
            <Text style={styles.timeText}>{time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
          </Pressable>

          {showPicker && (
            <DateTimePicker
              value={time}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(e, selected) => {
                setShowPicker(false);
                if (selected) setTime(selected);
              }}
            />
          )}

          <View style={styles.modeRow}>
            {['alarm', 'silent'].map((m) => (
              <Pressable
                key={m}
                onPress={() => setMode(m)}
                style={[styles.modeButton, mode === m && styles.modeSelected]}
              >
                <Text style={[styles.modeText, mode === m && styles.modeSelectedText]}>
                  {m === 'alarm' ? 'Alarm' : 'Silent'}
                </Text>
              </Pressable>
            ))}
          </View>

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
    marginBottom: 16,
    alignItems: 'center',
  },
  timeText: {
    fontSize: 18,
  },
  modeRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
    gap: 12,
  },
  modeButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: PRIMARY,
  },
  modeSelected: {
    backgroundColor: PRIMARY,
  },
  modeText: {
    color: PRIMARY,
    fontWeight: '600',
  },
  modeSelectedText: {
    color: '#fff',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
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
