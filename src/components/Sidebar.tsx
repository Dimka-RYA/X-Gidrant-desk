import { useState, useEffect } from 'react';
import { auth, db } from '../assets/firebase';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import '../styles/Sidebar.css';

interface SidebarProps {
  onLogout: () => void;
  onChangeTab: (tab: string) => void;
  activeTab?: string;
}

const Sidebar = ({ onLogout, onChangeTab, activeTab = 'главная' }: SidebarProps) => {
  const [activeItem, setActiveItem] = useState(activeTab);
  const [username, setUsername] = useState('пользователь');
  const [collapsed, setCollapsed] = useState(false);
  const [userRole, setUserRole] = useState<string>('admin');
  
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Если есть имя пользователя, устанавливаем его
        if (user.displayName) {
          setUsername(user.displayName);
        }
        
        // Получаем роль пользователя из Firestore
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            if (userData.name) {
              setUsername(userData.name);
            }
            
            if (userData.role) {
              setUserRole(userData.role);
            }
          }
        } catch (error) {
          console.error('Ошибка при получении данных пользователя:', error);
        }
      }
    });
    
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (activeTab !== activeItem) {
      setActiveItem(activeTab);
    }
  }, [activeTab]);
  
  const handleLogout = async () => {
    try {
      await signOut(auth);
      onLogout();
    } catch (error) {
      console.error('Ошибка при выходе:', error);
    }
  };

  const handleItemClick = (item: string) => {
    console.log('Menu item clicked:', item);
    setActiveItem(item);
    onChangeTab(item);
  };
  
  return (
    <div className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <button className="toggle-button" onClick={() => setCollapsed(!collapsed)} aria-label="Toggle sidebar">
        {collapsed ? (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M10 17L15 12L10 7" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        ) : (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M14 17L9 12L14 7" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </button>
      
      <div className="sidebar-menu">
        <div 
          className={`menu-item ${activeItem === 'главная' ? 'active' : ''}`}
          onClick={() => handleItemClick('главная')}
        >
          <div className="menu-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L3 9V20C3 20.5304 3.21071 21.0391 3.58579 21.4142C3.96086 21.7893 4.46957 22 5 22H19C19.5304 22 20.0391 21.7893 20.4142 21.4142C20.7893 21.0391 21 20.5304 21 20V9L12 2Z" stroke={activeItem === 'главная' ? '#D04E4E' : 'white'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className={activeItem === 'главная' ? 'active-text' : ''}>Главная</span>
        </div>
        
        {/* Пункт меню "" - показывается только для роли а */}
        {userRole === 'dispatcher' && (
          <div 
            className={`menu-item ${activeItem === '' ? 'active' : ''}`}
            onClick={() => handleItemClick('')}
          >
            <div className="menu-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M21 16V8C20.9996 7.4736 20.7203 6.97884 20.25 6.69L13.25 2.69C12.7793 2.40116 12.2207 2.40116 11.75 2.69L4.75 6.69C4.2797 6.97884 4.00037 7.4736 4 8V16C4.00037 16.5264 4.2797 17.0212 4.75 17.31L11.75 21.31C12.2207 21.5988 12.7793 21.5988 13.25 21.31L20.25 17.31C20.7203 17.0212 20.9996 16.5264 21 16Z" stroke={activeItem === '' ? '#D04E4E' : 'white'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M4.5 7.5L12 12L19.5 7.5" stroke={activeItem === '' ? '#D04E4E' : 'white'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 22V12" stroke={activeItem === '' ? '#D04E4E' : 'white'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className={activeItem === '' ? 'active-text' : ''}></span>
          </div>
        )}
        
        <div 
          className={`menu-item ${activeItem === 'сотрудники' ? 'active' : ''}`}
          onClick={() => handleItemClick('сотрудники')}
        >
          <div className="menu-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M15 4C16.0609 4 17.0783 4.42143 17.8284 5.17157C18.5786 5.92172 19 6.93913 19 8C19 9.06087 18.5786 10.0783 17.8284 10.8284C17.0783 11.5786 16.0609 12 15 12C13.9391 12 12.9217 11.5786 12.1716 10.8284C11.4214 10.0783 11 9.06087 11 8C11 6.93913 11.4214 5.92172 12.1716 5.17157C12.9217 4.42143 13.9391 4 15 4Z" stroke={activeItem === 'сотрудники' ? '#D04E4E' : 'white'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M7 8C8.10457 8 9 7.10457 9 6C9 4.89543 8.10457 4 7 4C5.89543 4 5 4.89543 5 6C5 7.10457 5.89543 8 7 8Z" stroke={activeItem === 'сотрудники' ? '#D04E4E' : 'white'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M21 20C21 18.1435 20.2625 16.363 18.9497 15.0503C17.637 13.7375 15.8565 13 14 13C12.1435 13 10.363 13.7375 9.05025 15.0503C7.7375 16.363 7 18.1435 7 20" stroke={activeItem === 'сотрудники' ? '#D04E4E' : 'white'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M3 20C3 18.9391 3.42143 17.9217 4.17157 17.1716C4.92172 16.4214 5.93913 16 7 16" stroke={activeItem === 'сотрудники' ? '#D04E4E' : 'white'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className={activeItem === 'сотрудники' ? 'active-text' : ''}>Сотрудники</span>
        </div>
        
        {/* Пункт меню "Заказы" - показывается только для админов */}
        {userRole === 'admin' && (
          <div 
            className={`menu-item ${activeItem === 'заказы' ? 'active' : ''}`}
            onClick={() => handleItemClick('заказы')}
          >
            <div className="menu-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M5 3V19C5 19.5304 5.21071 20.0391 5.58579 20.4142C5.96086 20.7893 6.46957 21 7 21H19C19.5304 21 20.0391 20.7893 20.4142 20.4142C20.7893 20.0391 21 19.5304 21 19V7L17 3H7C6.46957 3 5.96086 3.21071 5.58579 3.58579C5.21071 3.96086 5 4.46957 5 5V15" stroke={activeItem === 'заказы' ? '#D04E4E' : 'white'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className={activeItem === 'заказы' ? 'active-text' : ''}>Заказы</span>
          </div>
        )}
        
        <div 
          className={`menu-item ${activeItem === 'клиенты' ? 'active' : ''}`}
          onClick={() => handleItemClick('клиенты')}
        >
          <div className="menu-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21" stroke={activeItem === 'клиенты' ? '#D04E4E' : 'white'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M12 11C14.2091 11 16 9.20914 16 7C16 4.79086 14.2091 3 12 3C9.79086 3 8 4.79086 8 7C8 9.20914 9.79086 11 12 11Z" stroke={activeItem === 'клиенты' ? '#D04E4E' : 'white'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className={activeItem === 'клиенты' ? 'active-text' : ''}>Клиенты</span>
        </div>
        
        {/* Пункт меню "Доход" - показываем только для роли админа */}
        {userRole === 'admin' && (
          <div 
            className={`menu-item ${activeItem === 'доход' ? 'active' : ''}`}
            onClick={() => handleItemClick('доход')}
          >
            <div className="menu-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2V22" stroke={activeItem === 'доход' ? '#D04E4E' : 'white'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M17 5H9.5C8.57174 5 7.6815 5.36875 7.02513 6.02513C6.36875 6.6815 6 7.57174 6 8.5C6 9.42826 6.36875 10.3185 7.02513 10.9749C7.6815 11.6313 8.57174 12 9.5 12H14.5C15.4283 12 16.3185 12.3687 16.9749 13.0251C17.6313 13.6815 18 14.5717 18 15.5C18 16.4283 17.6313 17.3185 16.9749 17.9749C16.3185 18.6313 15.4283 19 14.5 19H6" stroke={activeItem === 'доход' ? '#D04E4E' : 'white'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className={activeItem === 'доход' ? 'active-text' : ''}>Доход</span>
          </div>
        )}
      </div>
      
      <div className="sidebar-footer">
        <div className="user-info">
          <div className="user-avatar">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M12 11C14.2091 11 16 9.20914 16 7C16 4.79086 14.2091 3 12 3C9.79086 3 8 4.79086 8 7C8 9.20914 9.79086 11 12 11Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="user-name">{username}</span>
          <div className="user-role"></div>
          <button className="logout-button" onClick={handleLogout} title="Выйти">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H9" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M16 17L21 12L16 7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M21 12H9" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};
export default Sidebar