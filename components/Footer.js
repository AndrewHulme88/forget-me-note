import React from 'react';
import { View, Pressable, StyleSheet, Text } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';

const Footer = ({ darkMode, setDarkMode, resetToToday, onAddPress, onInfoPress, isToday, isPremium }) => {
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

      <Pressable
        onPress={onInfoPress}
        style={[styles.button, darkMode && styles.darkButton]}
      >
        <Ionicons name="information-circle" size={24} color="#aaa" />
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




// import React from 'react';
// import { View, Pressable, Text, StyleSheet } from 'react-native';
// import { Ionicons } from '@expo/vector-icons';

// export default function Footer({
//   darkMode,
//   setDarkMode,
//   resetToToday,
//   onAddPress,
//   onInfoPress,
//   isToday,
//   isPremium,
// }) {
//   return (
//     <View style={[styles.footer, darkMode && styles.darkFooter]}>
//       {/* Today button */}
//       <Pressable
//         onPress={resetToToday}
//         disabled={isToday}
//         style={[
//           styles.button,
//           isToday && styles.disabledButton,
//           darkMode && styles.darkButton,
//         ]}
//       >
//         <Text style={styles.buttonText}>Today</Text>
//       </Pressable>

//       {/* Add Task button */}
//       <Pressable
//         onPress={onAddPress}
//         style={[styles.button, darkMode && styles.darkButton]}
//       >
//         <Ionicons name="add" size={24} color="#fff" />
//       </Pressable>

//       {/* Dark mode toggle (only for premium) */}
//       <Pressable
//         onPress={() => setDarkMode((prev) => !prev)}
//         style={[styles.button, darkMode && styles.darkButton]}
//       >
//         <Ionicons
//           name={darkMode ? 'sunny' : 'moon'}
//           size={22}
//           color="#fff"
//         />
//       </Pressable>

//       {/* Info button */}
//       <Pressable
//         onPress={onInfoPress}
//         style={[styles.button, darkMode && styles.darkButton]}
//       >
//         <Ionicons name="information-circle" size={24} color="#fff" />
//       </Pressable>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   footer: {
//     position: 'absolute',
//     bottom: 0,
//     left: 0,
//     right: 0,
//     flexDirection: 'row',
//     justifyContent: 'space-evenly',
//     paddingVertical: 12,
//     backgroundColor: '#4A4A58',
//   },
//   darkFooter: {
//     backgroundColor: '#2c2c34',
//   },
//   button: {
//     backgroundColor: '#4A4A58',
//     paddingHorizontal: 16,
//     paddingVertical: 10,
//     borderRadius: 8,
//   },
//   darkButton: {
//     backgroundColor: '#3a3a44',
//   },
//   disabledButton: {
//     opacity: 0.5,
//   },
//   buttonText: {
//     color: '#fff',
//     fontSize: 14,
//   },
// });
