import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';

const Header = ({ selectedDate, atStart, atEnd, darkMode, animateSlide }) => {
  const today = new Date();
  const diffDays = Math.floor(
    (selectedDate.setHours(0, 0, 0, 0) - today.setHours(0, 0, 0, 0)) / 86400000
  );

  let subheading = '';
  if (diffDays === 0) subheading = 'Today';
  else if (diffDays < 0) subheading = 'Last Week';
  else subheading = 'Next Week';

  return (
    <View style={styles.container}>
      <View style={styles.navRow}>
        <View style={{ width: 32 }}>
          {!atStart && (
            <Pressable onPress={() => animateSlide(-1)}>
              <Text style={[styles.navText, darkMode && styles.darkText]}>←</Text>
            </Pressable>
          )}
        </View>
        <Text style={[styles.dateText, darkMode && styles.darkText]}>
          {new Date(selectedDate).toDateString()}
        </Text>
        <View style={{ width: -32 }}>
          {!atEnd && (
            <Pressable onPress={() => animateSlide(1)}>
              <Text style={[styles.navText, darkMode && styles.darkText]}>→</Text>
            </Pressable>
          )}
        </View>
      </View>
      <Text style={[styles.subheading, darkMode && styles.darkText]}>
        {subheading}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginBottom: 16,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
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
  subheading: {
    fontSize: 14,
    color: '#888',
    marginTop: 4,
  },
});

export default Header;
