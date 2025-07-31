import React from 'react';
import { View, Pressable, StyleSheet, Text } from 'react-native';
import { Feather } from '@expo/vector-icons';

const Footer = ({ darkMode, setDarkMode, resetToToday, onAddPress, isToday, isPremium }) => {
  return (
    <View style={styles.container}>
      <Pressable onPress={isToday ? null : resetToToday} disabled={isToday}>
        <Text style={[styles.buttonText, isToday && styles.disabled]}>Today</Text>
      </Pressable>

      <Pressable onPress={onAddPress}>
        <Feather name="plus-circle" size={28} color="#4A4A58" />
      </Pressable>

      <View style={styles.darkModeWrapper}>
        <Pressable
          onPress={isPremium ? () => setDarkMode(prev => !prev) : null}
          disabled={!isPremium}
          style={styles.darkModeButton}
        >
          <Feather
            name={darkMode ? 'sun' : 'moon'}
            size={24}
            color={isPremium ? '#4A4A58' : '#aaa'}
          />
        </Pressable>
        {!isPremium && <Text style={styles.premiumLabel}>Premium</Text>}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 24,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    color: '#4A4A58',
  },
  disabled: {
    color: '#ccc',
  },
  darkModeWrapper: {
    alignItems: 'center',
  },
  darkModeButton: {
    padding: 4,
  },
  premiumLabel: {
    fontSize: 10,
    color: '#999',
    marginTop: 2,
  },
});

export default Footer;
