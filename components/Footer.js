import React from 'react';
import { View, Pressable, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';

const Footer = ({ darkMode, setDarkMode, resetToToday, onAddPress, isToday }) => {
  return (
    <View style={styles.footer}>
      <Pressable
        onPress={resetToToday}
        disabled={isToday}
        style={[styles.button, isToday && styles.disabled]}
      >
        <Feather name="calendar" size={18} color={isToday ? '#999' : '#fff'} />
        <Text style={[styles.buttonText, isToday && { color: '#999' }]}>Today</Text>
      </Pressable>
      <Pressable onPress={onAddPress} style={styles.addButton}>
        <Feather name="plus" size={18} color="#fff" />
      </Pressable>
      <Pressable onPress={() => setDarkMode(prev => !prev)} style={styles.button}>
        <Feather name="moon" size={18} color="#fff" />
        <Text style={styles.buttonText}>Dark</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 24,
    right: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  button: {
    flexDirection: 'row',
    gap: 6,
    backgroundColor: '#4A4A58',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
  addButton: {
    backgroundColor: '#4A4A58',
    padding: 12,
    borderRadius: 50,
  },
  disabled: {
    backgroundColor: '#ccc',
  },
});

export default Footer;
