import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Modal,
  StyleSheet,
  ScrollView,
} from 'react-native';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const PRIMARY = '#4A4A58';

const AddTask = ({ onCancel, onAdd, darkMode }) => {
  const [name, setName] = useState('');
  const [days, setDays] = useState([]);

  const toggleDay = (day) => {
    setDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleAdd = () => {
    const trimmed = name.trim();
    if (trimmed) {
      onAdd(trimmed, days);
      setName('');
      setDays([]);
      onCancel();
    }
  };

  return (
    <Modal animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={[styles.card, darkMode && styles.darkCard]}>
          <Text style={[styles.title, darkMode && { color: '#fff' }]}>New Task</Text>

          <TextInput
            placeholder="Task name"
            value={name}
            onChangeText={setName}
            style={[styles.input, darkMode && styles.darkInput]}
            placeholderTextColor={darkMode ? '#ccc' : '#888'}
          />

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.daysRow}>
              {DAYS.map((day) => {
                const selected = days.includes(day);
                return (
                  <Pressable
                    key={day}
                    onPress={() => toggleDay(day)}
                    style={[styles.dayButton, selected && styles.dayButtonSelected]}
                    accessibilityRole="button"
                    accessibilityLabel={`Select ${day}`}
                  >
                    <Text
                      style={[
                        selected ? styles.dayTextSelected : styles.dayText,
                        !selected && darkMode && { color: '#fff' },
                      ]}
                    >
                      {day}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>

          <View style={styles.hintRow}>
            <Text style={[styles.hintText, darkMode && { color: '#ddd' }]}>
              Leave all days unselected to schedule for every day.
            </Text>
          </View>

          <View style={styles.buttonRow}>
            <Pressable onPress={onCancel} style={[styles.button, styles.cancel]}>
              <Text style={styles.buttonText}>Cancel</Text>
            </Pressable>
            <Pressable onPress={handleAdd} style={[styles.button, styles.confirm, { marginLeft: 12 }]}>
              <Text style={styles.buttonText}>Add</Text>
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
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
  },
  darkCard: {
    backgroundColor: '#2a2a2d',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    padding: 10,
    fontSize: 16,
    backgroundColor: '#fff',
    marginBottom: 12,
  },
  darkInput: {
    backgroundColor: '#444',
    color: '#fff',
    borderColor: '#666',
  },
  daysRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  dayButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    marginRight: 6,
  },
  dayButtonSelected: {
    backgroundColor: PRIMARY,
    borderColor: PRIMARY,
  },
  dayText: {
    color: '#333',
  },
  dayTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  hintRow: {
    marginBottom: 12,
  },
  hintText: {
    fontSize: 12,
    color: '#666',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  cancel: {
    backgroundColor: '#888',
  },
  confirm: {
    backgroundColor: PRIMARY,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
});

export default AddTask;
