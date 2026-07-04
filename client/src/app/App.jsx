import AppRoutes from './routes';
import { AuthProvider } from '../shared/context/AuthContext';
import { ThemeProvider } from '../shared/context/ThemeContext';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
