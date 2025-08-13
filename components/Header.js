import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const PRIMARY = '#4A4A58';

const Header = ({ selectedDate, atStart, atEnd, darkMode, animateSlide }) => {
  const { labelDate, subheading } = useMemo(() => {
    const startOfDay = (d) => {
      const c = new Date(d);
      c.setHours(0, 0, 0, 0);
      return c;
    };
    const today = startOfDay(new Date());
    const sel = startOfDay(selectedDate);
    const diffDays = Math.floor((sel - today) / 86400000);

    let sub = 'Today';
    if (diffDays < 0) sub = 'Last Week';
    if (diffDays > 0) sub = 'Next Week';

    return { labelDate: sel.toDateString(), subheading: sub };
  }, [selectedDate]);

  const iconColor = darkMode ? '#fff' : PRIMARY;

  return (
    <View style={styles.container}>
      <View style={styles.navRow}>
        {/* Left arrow (space always reserved) */}
        <Pressable
          onPress={() => animateSlide(-1)}
          disabled={atStart}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Previous day"
          style={[styles.arrowBox, !atStart ? null : styles.invisible]}
        >
          <Ionicons name="chevron-back" size={24} color={iconColor} />
        </Pressable>

        {/* Center date */}
        <Text style={[styles.dateText, darkMode && styles.darkText]} numberOfLines={1}>
          {labelDate}
        </Text>

        {/* Right arrow (space always reserved) */}
        <Pressable
          onPress={() => animateSlide(1)}
          disabled={atEnd}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Next day"
          style={[styles.arrowBox, styles.rightBox, !atEnd ? null : styles.invisible]}
        >
          <Ionicons name="chevron-forward" size={24} color={iconColor} />
        </Pressable>
      </View>

      <Text style={[styles.subheading, darkMode && styles.subheadingDark]}>{subheading}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { alignItems: 'center', marginBottom: 16 },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 16, // symmetric edge padding so arrows aren’t flush
  },
  arrowBox: {
    width: 44,              // roomy touch target, reserves space
    alignItems: 'flex-start',
  },
  rightBox: { alignItems: 'flex-end' },
  invisible: { opacity: 0 }, // keeps layout space without showing
  dateText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  darkText: { color: '#fff' },
  subheading: { fontSize: 14, color: '#888', marginTop: 4 },
  subheadingDark: { color: '#bbb' },
});

export default Header;
