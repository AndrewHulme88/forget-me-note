import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';

const Header = ({ selectedDate, atStart, atEnd, darkMode, onSlide }) => {
  return (
    <View style={styles.navRow}>
      <View style={{ width: 32 }}>
        {!atStart && (
          <Pressable onPress={() => onSlide(-1)}>
            <Text style={[styles.navText, darkMode && styles.darkText]}>←</Text>
          </Pressable>
        )}
      </View>
      <Text style={[styles.dateText, darkMode && styles.darkText]}>
        {selectedDate.toDateString()}
      </Text>
      <View style={{ width: 32, alignItems: 'flex-end' }}>
        {!atEnd && (
          <Pressable onPress={() => onSlide(1)}>
            <Text style={[styles.navText, darkMode && styles.darkText]}>→</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  navText: {
    fontSize: 24,
    paddingHorizontal: 10,
    color: '#4A4A58',
  },
  darkText: {
    color: '#fff',
  },
  dateText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
});

export default Header;
