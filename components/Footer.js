import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';

const PRIMARY = '#4A4A58';

const Footer = ({ darkMode, setDarkMode, resetToToday }) => {
  return (
    <View style={[styles.footer, darkMode && styles.darkFooter]}>
      <Pressable onPress={resetToToday} style={styles.footerButton}>
        <Text style={styles.footerButtonText}>Today</Text>
      </Pressable>
      <Pressable onPress={() => setDarkMode((prev) => !prev)} style={styles.footerButton}>
        <Text style={styles.footerButtonText}>
          {darkMode ? 'Light Mode' : 'Dark Mode'}
        </Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    padding: 16,
    backgroundColor: '#f4f7fa',
    borderTopWidth: 1,
    borderColor: '#ddd',
  },
  darkFooter: {
    backgroundColor: '#1c1c1e',
    borderColor: '#444',
  },
  footerButton: {
    backgroundColor: PRIMARY,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
  },
  footerButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});

export default Footer;
