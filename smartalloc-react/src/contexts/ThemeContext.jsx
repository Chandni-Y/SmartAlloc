import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }) => {
  const [themePref, setThemePref] = useState(() => {
    return localStorage.getItem('smartalloc-theme') || 'system';
  });

  const [activeTheme, setActiveTheme] = useState('dark');

  useEffect(() => {
    localStorage.setItem('smartalloc-theme', themePref);
    
    if (themePref === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => setActiveTheme(mediaQuery.matches ? 'dark' : 'light');
      
      setActiveTheme(mediaQuery.matches ? 'dark' : 'light');
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    } else {
      setActiveTheme(themePref);
    }
  }, [themePref]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', activeTheme);
  }, [activeTheme]);

  return (
    <ThemeContext.Provider value={{ themePref, setThemePref, activeTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
