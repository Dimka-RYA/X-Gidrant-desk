import { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, db } from './assets/firebase';
import { doc, getDoc } from 'firebase/firestore';
import AuthForm from './components/AuthForm';
import Layout from './components/Layout';
import TitleBar from './components/TitleBar';
import './App.css';

// Главная функция приложения. Здесь начинается выполнение программы.
function App() {
  // user — это информация о текущем пользователе (если он вошёл в систему)
  const [user, setUser] = useState<User | null>(null);
  // loading — показывает, загружаются ли сейчас данные (true — идёт загрузка)
  const [loading, setLoading] = useState(true);
  // userRole — роль пользователя (например, админ, диспетчер, инженер, обычный пользователь)
  const [userRole, setUserRole] = useState<'admin' | 'dispatcher' | 'user' | 'engineer' | null>(null);

  // Этот блок выполняется при запуске приложения и когда пользователь меняется
  useEffect(() => {
    // Подписываемся на изменения авторизации пользователя (вход/выход)
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      console.log("onAuthStateChanged - currentUser:", currentUser);
      setUser(currentUser); // Сохраняем пользователя в состояние
      if (currentUser) {
        // Если пользователь вошёл, получаем его роль из базы данных
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userDoc = await getDoc(userDocRef);
        console.log("onAuthStateChanged - userDoc.exists():", userDoc.exists());
        if (userDoc.exists()) {
          // Если документ пользователя найден, берём его роль
          const fetchedRole = userDoc.data().role;
          console.log("onAuthStateChanged - fetchedRole from Firestore:", fetchedRole);
          setUserRole(fetchedRole);
        } else {
          // Если документа нет, роль не определена
          console.log("onAuthStateChanged - User document does not exist for UID:", currentUser.uid);
          setUserRole(null);
        }
      } else {
        // Если пользователь вышел, сбрасываем роль
        setUserRole(null);
      }
      setLoading(false); // Отключаем индикатор загрузки
    });

    // Эта функция отменяет подписку, когда компонент удаляется
    return () => unsubscribe();
  }, []);
  
  // Эта функция вызывается, когда пользователь успешно вошёл в систему через форму
  const handleAuthSuccess = (role: 'admin' | 'dispatcher' | 'user' | 'engineer') => {
    console.log("handleAuthSuccess - role passed from AuthForm:", role);
    setUserRole(role); // Сохраняем роль пользователя
    console.log("handleAuthSuccess - userRole state after setting:", role);
  };

  // Эта функция вызывается, когда пользователь выходит из системы
  const handleLogout = () => {
    setUserRole(null); // Сбрасываем роль пользователя
  };

  console.log("App Component Render - Current userRole state:", userRole);

  // Если данные ещё загружаются, показываем крутящийся индикатор
  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  // Основная часть приложения: если пользователь вошёл и его роль определена — показываем основной интерфейс
  // Если не вошёл — показываем форму входа
  return (
    <div className="app">
      <TitleBar /> {/* Верхняя панель с названием */}
      {user ? (
        userRole === 'admin' || userRole === 'dispatcher' || userRole === 'engineer' || userRole === 'user' ? (
          <Layout onLogout={handleLogout} /> // Основной интерфейс приложения
        ) : (
          // Если роль не определена или неправильная — показываем сообщение
          <div>Loading user data or invalid role...</div>
        )
      ) : (
        <AuthForm onSuccess={handleAuthSuccess} /> // Форма для входа в систему
      )}
    </div>
  );
}

export default App;
