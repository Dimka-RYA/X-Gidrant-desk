import { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, db } from './assets/firebase';
import { doc, getDoc } from 'firebase/firestore';
import AuthForm from './components/AuthForm';
import Layout from './components/Layout';
import TitleBar from './components/TitleBar';
import UserDashboard from './components/pages/UserDashboard';
import './App.css';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<'admin' | 'dispatcher' | 'user' | 'engineer' | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      console.log("onAuthStateChanged - currentUser:", currentUser);
      setUser(currentUser);
      if (currentUser) {
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userDoc = await getDoc(userDocRef);
        console.log("onAuthStateChanged - userDoc.exists():", userDoc.exists());
        if (userDoc.exists()) {
          const fetchedRole = userDoc.data().role;
          console.log("onAuthStateChanged - fetchedRole from Firestore:", fetchedRole);
          setUserRole(fetchedRole);
        } else {
          console.log("onAuthStateChanged - User document does not exist for UID:", currentUser.uid);
          setUserRole(null);
        }
      } else {
        setUserRole(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleAuthSuccess = (role: 'admin' | 'dispatcher' | 'user' | 'engineer') => {
    console.log("handleAuthSuccess - role passed from AuthForm:", role);
    setUserRole(role);
    console.log("handleAuthSuccess - userRole state after setting:", role);
  };

  const handleLogout = () => {
    setUserRole(null);
  };

  console.log("App Component Render - Current userRole state:", userRole);

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
        userRole === 'admin' || userRole === 'dispatcher' || userRole === 'engineer' || userRole === 'user' ? (
          <Layout onLogout={handleLogout} />
        ) : (
          // Fallback for when role is not yet determined or invalid
          <div>Loading user data or invalid role...</div>
        )
      ) : (
        <AuthForm onSuccess={handleAuthSuccess} />
      )}
    </div>
  );
}

export default App;
