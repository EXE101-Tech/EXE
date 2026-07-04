import { createContext, useContext, useState } from 'react';

const SportFilterContext = createContext();

export function SportFilterProvider({ children }) {
  // Default to null so when no sport is selected, it can show all (if applicable)
  // or 'football' if we want a default. Home.jsx used 'football', GameRoom used null.
  // We will default to null.
  const [selectedSport, setSelectedSport] = useState(null);

  return (
    <SportFilterContext.Provider value={{ selectedSport, setSelectedSport }}>
      {children}
    </SportFilterContext.Provider>
  );
}

export function useSportFilter() {
  const context = useContext(SportFilterContext);
  if (!context) {
    throw new Error('useSportFilter must be used within a SportFilterProvider');
  }
  return context;
}
