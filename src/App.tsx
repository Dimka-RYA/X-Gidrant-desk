import { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from './assets/firebase';
import AuthForm from './components/AuthForm';
import Layout from './components/Layout';
import TitleBar from './components/TitleBar';
import './App.css';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleAuthSuccess = () => {
    // После успешной авторизации ничего не делаем,
    // так как onAuthStateChanged автоматически обновит состояние
  };

  const handleLogout = () => {
    // После успешного выхода ничего не делаем,
    // так как onAuthStateChanged автоматически обновит состояние
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="app">
      <TitleBar />
      {user ? (
        <Layout onLogout={handleLogout} />
      ) : (
        <AuthForm onSuccess={handleAuthSuccess} />
      )}
    </div>
  );
}

export default App;
