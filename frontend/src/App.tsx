import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider } from './auth';
import { RequireAuth } from './auth';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import './App.css';

function App() {
  const clientId =
    import.meta.env.VITE_GOOGLE_CLIENT_ID ||
    '1033556695079-osn1ufaqhamij1uf30gfbairbbolb7l0.apps.googleusercontent.com';

  // Log the resolved Google client ID at runtime to help debug origin/client issues
  // This will print the value in the browser console when the app loads.
  if (typeof window !== 'undefined') {
    // eslint-disable-next-line no-console
    console.log('VITE_GOOGLE_CLIENT_ID:', clientId);
  }

  return (
    <GoogleOAuthProvider clientId={clientId}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/dashboard"
              element={
                <RequireAuth>
                  <Dashboard />
                </RequireAuth>
              }
            />
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}

export default App;
