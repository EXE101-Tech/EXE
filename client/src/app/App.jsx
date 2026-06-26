import AppRoutes from './routes';
import { AuthProvider } from '../shared/context/AuthContext';

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

export default App;
