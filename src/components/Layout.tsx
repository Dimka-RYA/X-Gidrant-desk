import { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import '../styles/Layout.css';
import Home from './pages/Home';
import Employees from './pages/Employees';
import Clients from './pages/Clients';
import Income from './pages/Income';
import Dispatcher from './pages/Dispatcher';
import Orders from './pages/Orders';
import { auth, db } from '../assets/firebase';
import { doc, getDoc } from 'firebase/firestore';

interface LayoutProps {
  onLogout: () => void;
}

const Layout = ({ onLogout }: LayoutProps) => {
  const [activeTab, setActiveTab] = useState('главная');
  const [userRole, setUserRole] = useState<string>('admin');

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
              setUserRole(userData.role);
            }
          }
        } catch (error) {
          console.error('Ошибка при получении роли пользователя:', error);
        }
      }
    };

    getCurrentUserRole();
  }, []);

  // Проверяем доступность вкладки для текущей роли
  useEffect(() => {
    // Если роль админа и выбрана вкладка "диспетчер", перенаправляем на главную
    if (userRole === 'admin' && activeTab === 'диспетчер') {
      setActiveTab('главная');
    }
    
    // Если роль диспетчера и выбрана вкладка "доход", перенаправляем на главную
    if (userRole === 'dispatcher' && activeTab === 'доход') {
      setActiveTab('главная');
    }
  }, [userRole, activeTab]);

  const handleChangeTab = (tab: string) => {
    setActiveTab(tab);
  };

  // Отображаем соответствующий контент в зависимости от выбранной вкладки
  const renderContent = () => {
    switch (activeTab) {
      case 'главная':
        return <Home />;
      case 'сотрудники':
        return <Employees />;
      case 'клиенты':
        return <Clients />;
      case 'доход':
        return <Income />;
      case 'диспетчер':
        // Вкладка диспетчера доступна только диспетчерам
        return userRole === 'dispatcher' ? <Dispatcher /> : <Home />;
      case 'заказы':
        // Вкладка заказов доступна только админам
        return userRole === 'admin' ? <Orders /> : <Home />;
      default:
        return <Home />;
    }
  };

  return (
    <div className="layout">
      <Sidebar onLogout={onLogout} onChangeTab={handleChangeTab} activeTab={activeTab} />
      <div className="content">
        {renderContent()}
      </div>
    </div>
  );
};
export default Layout