import { useState, useEffect } from 'react';

/**
 * Custom hook for managing state with local storage persistence
 * 
 * @param {string} key - The key to use for local storage
 * @param {any} initialValue - The initial value to use if no value exists in local storage
 * @returns {[any, Function]} The current value and a function to update it
 */
const useLocalStorage = (key, initialValue) => {
  // Initialize state with value from local storage or initial value
  const [value, setValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      // Parse stored json or return initialValue if none
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  // Update local storage when the state changes
  useEffect(() => {
    try {
      // Allow value to be a function to match useState API
      const valueToStore = value instanceof Function ? value(value) : value;
      
      // Save to local storage
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, value]);

  return [value, setValue];
};

export default useLocalStorage; 