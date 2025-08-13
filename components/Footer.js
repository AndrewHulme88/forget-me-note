import React from 'react';
import { View, Pressable, StyleSheet, Text } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';

const PRIMARY = '#4A4A58';
const MUTED = '#aaa';

const Footer = ({
  darkMode,
  setDarkMode,
  resetToToday,
  onAddPress,
  onInfoPress,
  isToday,
  isPremium,
}) => {
  const mainIcon = darkMode ? '#fff' : PRIMARY;
  const infoIcon = darkMode ? '#ddd' : '#777';

  return (
    <View style={styles.container}>
      {/* Today */}
      <Pressable
        onPress={isToday ? undefined : resetToToday}
        disabled={isToday}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Go to today"
        accessibilityState={{ disabled: isToday }}
      >
        <Text style={[styles.buttonText, isToday && styles.disabledText]}>Today</Text>
      </Pressable>

      {/* Add task */}
      <Pressable
        onPress={onAddPress}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Add task"
        style={styles.iconButton}
      >
        <Feather name="plus-circle" size={28} color={mainIcon} />
      </Pressable>

      {/* Dark mode (premium only) */}
      <View style={styles.darkModeWrapper}>
        <Pressable
          onPress={isPremium ? () => setDarkMode(prev => !prev) : undefined}
          disabled={!isPremium}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Toggle dark mode"
          accessibilityState={{ disabled: !isPremium, checked: darkMode }}
          style={styles.darkModeButton}
        >
          <Feather
            name={darkMode ? 'sun' : 'moon'}
            size={24}
            color={isPremium ? mainIcon : MUTED}
          />
        </Pressable>
        {!isPremium && <Text style={styles.premiumLabel}>Premium</Text>}
      </View>

      {/* Info */}
      <Pressable
        onPress={onInfoPress}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Info"
        style={styles.iconButton}
      >
        <Ionicons name="information-circle" size={24} color={infoIcon} />
      </Pressable>
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
    color: PRIMARY,
  },
  disabledText: {
    color: '#ccc',
  },
  iconButton: {
    padding: 4,
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
