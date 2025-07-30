import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function useTaskManager(selectedDate) {
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState('');
  const [selectedDays, setSelectedDays] = useState([]);

  useEffect(() => {
    AsyncStorage.getItem('tasks').then((json) => {
      if (json) setTasks(JSON.parse(json));
    });
  }, []);

  useEffect(() => {
    AsyncStorage.setItem('tasks', JSON.stringify(tasks));
  }, [tasks]);

  const addTask = () => {
    const trimmed = newTask.trim();
    if (!trimmed) return;
    setTasks((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        name: trimmed,
        done: {},
        days: [...selectedDays],
      },
    ]);
    setNewTask('');
    setSelectedDays([]);
  };

  const toggleTask = (id, dateKey) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === id
          ? {
              ...task,
              done: {
                ...task.done,
                [dateKey]: !task.done?.[dateKey],
              },
            }
          : task
      )
    );
  };

  const deleteTask = (id) => {
    setTasks((prev) => prev.filter((task) => task.id !== id));
  };

  return {
    tasks,
    newTask,
    setNewTask,
    selectedDays,
    setSelectedDays,
    addTask,
    toggleTask,
    deleteTask,
  };
}
