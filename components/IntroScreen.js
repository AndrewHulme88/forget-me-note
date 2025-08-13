import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform, Alert } from 'react-native';
import * as Notifications from 'expo-notifications';

const PRIMARY = '#4A4A58';

const IntroScreen = ({ onContinue, darkMode }) => {
  const handleContinue = async () => {
    try {
      if (Platform.OS === 'ios') {
        const { status: existing, canAskAgain } = await Notifications.getPermissionsAsync();
        if (existing !== 'granted' && canAskAgain) {
          await Notifications.requestPermissionsAsync({
            ios: { allowAlert: true, allowSound: true, allowBadge: true },
          });
        }
        // If still not granted, we still proceed—app works without alerts
      }
    } catch {
      // Non-fatal: proceed
    } finally {
      onContinue();
    }
  };

  return (
    <View style={[styles.container, darkMode && styles.darkContainer]}>
      <Text style={[styles.title, darkMode && styles.darkText]}>Welcome to Forget Me Note</Text>
      <Text style={[styles.description, darkMode && styles.darkText]}>
        • Swipe through days{'\n'}
        • Track and check off tasks{'\n'}
        • Set reminders for tasks
      </Text>

      <Pressable onPress={handleContinue} style={styles.button} accessibilityRole="button">
        <Text style={styles.buttonText}>Get Started</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 100,
    paddingHorizontal: 24,
    backgroundColor: '#f4f7fa',
    alignItems: 'center',
  },
  darkContainer: {
    backgroundColor: '#1c1c1e',
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 24,
    color: '#333',
  },
  darkText: { color: '#fff' },
  description: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 40,
    color: '#555',
  },
  button: {
    backgroundColor: PRIMARY,
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 6,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '500',
    fontSize: 16,
  },
});

export default IntroScreen;
