import { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import '../styles/Layout.css';
import Home from './pages/Home';
import Employees from './pages/Employees';
import Clients from './pages/Clients';
import Income from './pages/Income';
import Orders from './pages/Orders';
import Categories from './pages/Categories';
import OrderHistory from './pages/OrderHistory';
import { auth, db } from '../assets/firebase';
import { doc, getDoc } from 'firebase/firestore';

// Описание свойств, которые получает Layout от родителя
interface LayoutProps {
  onLogout: () => void; // функция для выхода из аккаунта
}

// Основная функция макета приложения (структура страницы)
const Layout = ({ onLogout }: LayoutProps) => {
  // activeTab — текущая выбранная вкладка
  const [activeTab, setActiveTab] = useState('главная');
  // userRole — роль пользователя (админ или пользователь)
  const [userRole, setUserRole] = useState<'admin' | 'user' | null>(null);

  // Получаем роль пользователя при загрузке компонента
  useEffect(() => {
    const getCurrentUserRole = async () => {
      const user = auth.currentUser;
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            if (userData.role) {
              setUserRole(userData.role as 'admin' | 'user');
            }
          } else {
            // Если документ пользователя не существует, устанавливаем роль по умолчанию или null
            setUserRole(null);
          }
        } catch (error) {
          console.error('Ошибка при получении роли пользователя:', error);
          setUserRole(null);
        }
      } else {
        setUserRole(null);
      }
    };

    getCurrentUserRole();
  }, []);

  // Проверяем доступность вкладки для текущей роли
  useEffect(() => {
    // Вкладки, доступные только для определенных ролей
    const restrictedTabs: { [key: string]: Array<'admin' | 'user'> } = {
      'заказы': ['admin'],
      'доход': ['admin'],
      'сотрудники': ['admin'],
      'клиенты': ['admin'],
      'категории': ['user'],
      'история-заказов': ['user'],
    };

    if (userRole && activeTab !== 'главная') {
      const allowedRoles = restrictedTabs[activeTab];
      if (allowedRoles && !allowedRoles.includes(userRole)) {
        setActiveTab('главная'); // Перенаправляем на главную, если нет доступа
      }
    }
  }, [userRole, activeTab]);

  // Функция для смены вкладки
  const handleChangeTab = (tab: string) => {
    setActiveTab(tab);
  };

  // Отображаем соответствующий контент в зависимости от выбранной вкладки
  const renderContent = () => {
    switch (activeTab) {
      case 'главная':
        return <Home userRole={userRole} />;
      case 'сотрудники':
        return userRole === 'admin' ? <Employees /> : <Home userRole={userRole}/>;
      case 'клиенты':
        return userRole === 'admin' ? <Clients /> : <Home userRole={userRole}/>;
      case 'доход':
        return userRole === 'admin' ? <Income /> : <Home userRole={userRole}/>;
      case 'заказы':
        return userRole === 'admin' ? <Orders /> : <Home userRole={userRole}/>;
      case 'категории':
        return <Categories />;
      case 'история-заказов':
        return userRole === 'user' ? <OrderHistory /> : <Home userRole={userRole}/>;
      default:
        return <Home userRole={userRole}/>;
    }
  };

  // Возвращаем разметку макета приложения
  return (
    <div className="layout">
      <Sidebar onLogout={onLogout} onChangeTab={handleChangeTab} activeTab={activeTab} userRole={userRole} />
      <div className="content">
        {renderContent()}
      </div>
    </div>
  );
};
export default Layout;