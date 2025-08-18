// components/ReminderModal.js
import React, { useState, useEffect } from 'react';
import { Modal, View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PRIMARY = '#4A4A58';
const INTERVAL_OPTIONS = [1, 5, 10, 15, 30, 60]; // added 1m for testing
const CHANNEL_ID = 'recollecto-reminders';
const KEY = (taskId) => `reminder:${taskId}`;
const MAX_OCCURRENCES = 8; // initial + 7 repeats

async function ensureChannel() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Reminders',
      importance: Notifications.AndroidImportance.MAX,
      sound: 'default',
    });
  }
}

function nextAtFromTimeOfDay(timeISO, now, skipToday) {
  const base = new Date(timeISO);
  const h = base.getHours();
  const m = base.getMinutes();
  const candidate = new Date(now);
  candidate.setSeconds(0, 0);
  candidate.setHours(h, m, 0, 0);
  if (skipToday || candidate <= now) candidate.setDate(candidate.getDate() + 1);
  return candidate;
}

async function scheduleTaskReminder({ taskId, title, body, reminder, isCompletedToday }) {
  if (!taskId || !reminder?.time) return [];
  await ensureChannel();

  const now = new Date();
  const firstAt = nextAtFromTimeOfDay(reminder.time, now, !!isCompletedToday);
  const ids = [];

  // Initial
  const firstId = await Notifications.scheduleNotificationAsync({
    content: { title: title || 'Reminder', body: body || 'Due now', data: { taskId } },
    trigger: { date: firstAt, channelId: CHANNEL_ID },
  });
  ids.push(firstId);

  // Optional repeats
  const iv = Number(reminder.repeatEveryMins) || null;
  if (iv && iv > 0) {
    const ivMs = iv * 60 * 1000;
    let t = new Date(firstAt);
    for (let i = 1; i < MAX_OCCURRENCES; i++) {
      t = new Date(t.getTime() + ivMs);
      const id = await Notifications.scheduleNotificationAsync({
        content: { title: title || 'Reminder', body: body || 'Still due', data: { taskId } },
        trigger: { date: t, channelId: CHANNEL_ID },
      });
      ids.push(id);
    }
  }

  await AsyncStorage.setItem(KEY(taskId), JSON.stringify(ids));
  return ids;
}

export async function cancelScheduledReminder(taskId) {
  try {
    const raw = await AsyncStorage.getItem(KEY(taskId));
    const ids = raw ? JSON.parse(raw) : [];
    await Promise.all(ids.map((id) => Notifications.cancelScheduledNotificationAsync(id).catch(() => {})));
    await AsyncStorage.removeItem(KEY(taskId));
  } catch {}
}

const ReminderModal = ({
  visible,
  onClose,
  onSetReminder,       // (reminder|null) => void  (persist in task)
  existingReminder,    // { time: ISOString, repeatEveryMins?: number|null }
  taskId,
  taskTitle,
  isCompletedToday,
}) => {
  const initialTime = existingReminder?.time ? new Date(existingReminder.time) : new Date();
  const [tempTime, setTempTime] = useState(initialTime);
  const [mode, setMode] = useState(existingReminder?.repeatEveryMins ? 'repeat' : 'single');
  const [intervalMins, setIntervalMins] = useState(existingReminder?.repeatEveryMins || 10);

  useEffect(() => {
    const t = existingReminder?.time ? new Date(existingReminder.time) : new Date();
    setTempTime(t);
    setMode(existingReminder?.repeatEveryMins ? 'repeat' : 'single');
    setIntervalMins(existingReminder?.repeatEveryMins || 10);
  }, [existingReminder, visible]);

  const safeTempTime = Number.isFinite(tempTime?.getTime?.()) ? tempTime : new Date();

  const currentSummary = existingReminder
    ? `${new Date(existingReminder.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}${
        existingReminder.repeatEveryMins && Number(existingReminder.repeatEveryMins) > 0
          ? ` • repeats every ${existingReminder.repeatEveryMins}m`
          : ' • single'
      }`
    : null;

  const handleConfirm = async () => {
    const payload = {
      time: safeTempTime.toISOString(),
      repeatEveryMins: mode === 'repeat' ? intervalMins : null,
    };

    // Persist to task so the modal shows correct mode next time
    onSetReminder?.(payload);

    // Replace any existing schedules, then schedule fresh
    await cancelScheduledReminder(taskId);
    await scheduleTaskReminder({
      taskId,
      title: taskTitle,
      body: 'Tap to open',
      reminder: payload,
      isCompletedToday: !!isCompletedToday,
    });

    onClose?.();
  };

  const handleRemove = async () => {
    onSetReminder?.(null);
    await cancelScheduledReminder(taskId);
    onClose?.();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>Set Reminder</Text>

          {currentSummary && (
            <View style={styles.currentRow}>
              <Text style={styles.currentLabel}>Currently:</Text>
              <Text style={styles.currentValue}>{currentSummary}</Text>
            </View>
          )}

          <View style={styles.timeButton}>
            <Text style={styles.timeText}>
              {safeTempTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>

          <DateTimePicker
            value={safeTempTime}
            mode="time"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(_, selected) => selected && setTempTime(selected)}
          />

          {/* Mode selector */}
          <View style={styles.modeRow}>
            <Pressable
              onPress={() => setMode('single')}
              style={[styles.modeChip, mode === 'single' && styles.modeChipActive]}
            >
              <Text style={[styles.modeText, mode === 'single' && styles.modeTextActive]}>Single</Text>
            </Pressable>
            <Pressable
              onPress={() => setMode('repeat')}
              style={[styles.modeChip, mode === 'repeat' && styles.modeChipActive, { marginLeft: 8 }]}
            >
              <Text style={[styles.modeText, mode === 'repeat' && styles.modeTextActive]}>Repeat</Text>
            </Pressable>
          </View>

          {mode === 'repeat' && (
            <>
              <Text style={styles.sectionLabel}>Repeat every</Text>
              <View style={styles.intervalRow}>
                {INTERVAL_OPTIONS.map((m) => {
                  const active = intervalMins === m;
                  return (
                    <Pressable
                      key={m}
                      onPress={() => setIntervalMins(m)}
                      style={[styles.intervalChip, active && styles.intervalChipActive]}
                      accessibilityLabel={`Repeat every ${m} minutes`}
                    >
                      <Text style={[styles.intervalText, active && styles.intervalTextActive]}>{m}m</Text>
                    </Pressable>
                  );
                })}
              </View>
            </>
          )}

          <Text style={styles.hint}>If completed today, we’ll start from tomorrow.</Text>

          <View style={styles.actions}>
            <Pressable onPress={handleRemove} style={styles.removeButton}>
              <Text style={styles.buttonText}>Remove</Text>
            </Pressable>
            <Pressable onPress={onClose} style={[styles.cancelButton, { marginLeft: 10 }]}>
              <Text style={styles.buttonText}>Cancel</Text>
            </Pressable>
            <Pressable onPress={handleConfirm} style={[styles.confirmButton, { marginLeft: 10 }]}>
              <Text style={styles.buttonText}>Set</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 20 },
  title: { fontSize: 18, fontWeight: '600', marginBottom: 12 },
  currentRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  currentLabel: { fontSize: 12, color: '#666', marginRight: 6 },
  currentValue: { fontSize: 12, color: '#333' },
  timeButton: { padding: 12, backgroundColor: '#eee', borderRadius: 8, marginBottom: 12, alignItems: 'center' },
  timeText: { fontSize: 18 },
  modeRow: { flexDirection: 'row', marginTop: 8, marginBottom: 6 },
  modeChip: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: '#bbb' },
  modeChipActive: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  modeText: { color: '#333', fontWeight: '600' },
  modeTextActive: { color: '#fff' },
  sectionLabel: { fontSize: 13, color: '#555', marginTop: 8, marginBottom: 6 },
  intervalRow: { flexDirection: 'row', flexWrap: 'wrap' },
  intervalChip: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, borderWidth: 1, borderColor: '#bbb', marginRight: 8, marginBottom: 8 },
  intervalChipActive: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  intervalText: { color: '#333' },
  intervalTextActive: { color: '#fff', fontWeight: '700' },
  hint: { fontSize: 12, color: '#666', marginTop: 8 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12 },
  confirmButton: { backgroundColor: PRIMARY, padding: 10, borderRadius: 6 },
  cancelButton: { backgroundColor: '#aaa', padding: 10, borderRadius: 6 },
  removeButton: { backgroundColor: '#c0392b', padding: 10, borderRadius: 6 },
  buttonText: { color: '#fff', fontWeight: '600' },
});

export default ReminderModal;
