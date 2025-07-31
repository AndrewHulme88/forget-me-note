import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';

const IntroScreen = ({ onContinue, darkMode }) => {
  return (
    <View style={[styles.container, darkMode && styles.darkContainer]}>
      <Text style={[styles.title, darkMode && styles.darkText]}>Welcome to Forget Me Note</Text>
      <Text style={[styles.text, darkMode && styles.darkText]}>
        Keep track of your daily tasks, set reminders, and never forget again.
      </Text>
      <Pressable onPress={onContinue} style={styles.button}>
        <Text style={styles.buttonText}>Get Started</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#f4f7fa',
  },
  darkContainer: {
    backgroundColor: '#1c1c1e',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 20,
    color: '#333',
  },
  text: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 40,
    color: '#555',
  },
  darkText: {
    color: '#eee',
  },
  button: {
    backgroundColor: '#4A4A58',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 6,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});

export default IntroScreen;
