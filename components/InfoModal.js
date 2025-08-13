import React from 'react';
import { Modal, View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';

const PRIMARY = '#4A4A58';

const InfoModal = ({ visible, onClose, darkMode }) => {
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={[styles.card, darkMode && styles.darkCard]}>
          <Text style={[styles.title, darkMode && { color: '#fff' }]}>How to use Forget Me Note</Text>
          <ScrollView style={{ maxHeight: 360 }} showsVerticalScrollIndicator={false}>
            <Text style={[styles.point, darkMode && styles.darkText]}>
              • Swipe left/right (or use the arrows) to move between days.
            </Text>
            <Text style={[styles.point, darkMode && styles.darkText]}>
              • Tap “＋” to create a new task. Pick the days it repeats on (or leave blank for all days).
            </Text>
            <Text style={[styles.point, darkMode && styles.darkText]}>
              • Tap the checkbox to mark a task done for the selected day (only tasks for today can be checked off).
            </Text>
            <Text style={[styles.point, darkMode && styles.darkText]}>
              • Tap the clock to set or remove a reminder (Premium).
            </Text>
            <Text style={[styles.point, darkMode && styles.darkText]}>
              • Tap the trash icon to delete a task.
            </Text>
            <Text style={[styles.point, darkMode && styles.darkText]}>
              • The Today button jumps back to today.
            </Text>
            <Text style={[styles.point, darkMode && styles.darkText]}>
              • Dark Mode is available with Premium.
            </Text>
          </ScrollView>

          <Pressable onPress={onClose} style={styles.button}>
            <Text style={styles.buttonText}>Got it</Text>
          </Pressable>
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
    fontWeight: '700',
    marginBottom: 12,
    color: '#333',
  },
  point: {
    fontSize: 15,
    color: '#444',
    marginBottom: 10,
    lineHeight: 22,
  },
  darkText: {
    color: '#eee',
  },
  button: {
    marginTop: 16,
    alignSelf: 'flex-end',
    backgroundColor: PRIMARY,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 6,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
});

export default InfoModal;
