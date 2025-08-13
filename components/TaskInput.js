import React from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
} from 'react-native';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const PRIMARY = '#4A4A58';

const TaskInput = ({
  newTask,
  setNewTask,
  selectedDays,
  setSelectedDays,
  addTask,
  darkMode,
}) => {
  const trimmed = newTask.trim();
  const canAdd = trimmed.length > 0;

  const toggleDay = (day) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  return (
    <View style={[styles.card, darkMode && styles.darkCard]}>
      <View style={styles.inputRow}>
        <TextInput
          placeholder="New task"
          value={newTask}
          onChangeText={setNewTask}
          style={[styles.input, darkMode && styles.darkInput]}
          placeholderTextColor={darkMode ? '#ccc' : '#888'}
          autoCapitalize="sentences"
          autoCorrect
          returnKeyType="done"
          onSubmitEditing={() => { if (canAdd) addTask(); }}
          blurOnSubmit
          maxLength={120}
        />
        <Pressable
          style={[styles.button, !canAdd && styles.buttonDisabled]}
          onPress={() => canAdd && addTask()}
          disabled={!canAdd}
          accessibilityRole="button"
          accessibilityLabel="Add task"
        >
          <Text style={styles.buttonText}>Add</Text>
        </Pressable>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.daysRow}>
        {DAYS.map((day) => {
          const selected = selectedDays.includes(day);
          return (
            <Pressable
              key={day}
              onPress={() => toggleDay(day)}
              style={[styles.dayButton, selected && styles.dayButtonSelected]}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={`Repeat on ${day}`}
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
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 4,
    elevation: 2,
  },
  darkCard: { backgroundColor: '#2a2a2d' },
  inputRow: { flexDirection: 'row', marginBottom: 12, alignItems: 'center' },
  input: {
    flex: 1,
    borderWidth: 1, borderColor: '#ccc',
    borderRadius: 6, padding: 10, fontSize: 16, backgroundColor: '#fff',
  },
  darkInput: { backgroundColor: '#444', color: '#fff', borderColor: '#666' },
  button: {
    marginLeft: 10, backgroundColor: PRIMARY,
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 6,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#fff', fontWeight: '600' },
  daysRow: { flexDirection: 'row' },
  dayButton: {
    paddingHorizontal: 10, paddingVertical: 6,
    borderWidth: 1, borderColor: '#ccc',
    borderRadius: 6, marginRight: 6,
  },
  dayButtonSelected: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  dayText: { color: '#333' },
  dayTextSelected: { color: '#fff', fontWeight: '600' },
});

export default TaskInput;
