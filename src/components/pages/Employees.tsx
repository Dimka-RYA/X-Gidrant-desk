import React, { useState, useEffect, useRef } from 'react';
import { collection, getDocs, addDoc, deleteDoc, doc, query, where, setDoc, getDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { db, auth } from '../../assets/firebase';
import '../../styles/pages/Employees.css';

interface Employee {
  id: string;
  name: string;
  position: string;
  phone: string;
  email: string;
  role: string;
}

interface NewEmployee {
  name: string;
  position: string;
  phone: string;
  email: string;
  password: string;
  role: string;
}

const Employees: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [newEmployee, setNewEmployee] = useState<NewEmployee>({
    name: '',
    position: '',
    phone: '',
    email: '',
    password: '',
    role: ''
  });
  const [employeeType, setEmployeeType] = useState<string>('');
  const [columnWidths, setColumnWidths] = useState<{[key: string]: number}>({});
  const tableRef = useRef<HTMLTableElement>(null);
  const resizingColumn = useRef<string | null>(null);
  const initialWidth = useRef<number>(0);
  const startClientX = useRef<number>(0);
  const resizeLineRef = useRef<HTMLDivElement | null>(null);
  const [userRole, setUserRole] = useState<string>('admin');

  useEffect(() => {
    fetchEmployees();
    checkUserRole();
  }, []);

  // Получаем роль текущего пользователя
  const checkUserRole = async () => {
    try {
      const currentUser = auth.currentUser;
      if (currentUser) {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          if (userData.role) {
            setUserRole(userData.role);
          }
        }
      }
    } catch (error) {
      console.error('Ошибка при получении роли пользователя:', error);
    }
  };

  // Создаем линию индикатора один раз при монтировании компонента
  useEffect(() => {
    // Создаем элемент для линии изменения размера
    const resizeLine = document.createElement('div');
    resizeLine.className = 'column-resize-line';
    resizeLine.style.display = 'none';
    document.body.appendChild(resizeLine);
    
    // Сохраняем ссылку на созданный элемент
    resizeLineRef.current = resizeLine;
    
    // Очищаем при размонтировании
    return () => {
      if (resizeLine && document.body.contains(resizeLine)) {
        document.body.removeChild(resizeLine);
      }
    };
  }, []);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where("role", "in", ["engineer", "dispatcher"]));
      const querySnapshot = await getDocs(q);
      
      const employeesList: Employee[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        employeesList.push({
          id: doc.id,
          name: data.name || 'Не указано',
          position: data.position || 'Не указано',
          phone: data.phone || 'Не указано',
          email: data.email || 'Не указано',
          role: data.role === 'engineer' ? 'Инженер' : 'Диспетчер'
        });
      });
      
      setEmployees(employeesList);
      setError(null);
    } catch (err) {
      console.error("Ошибка при получении списка сотрудников:", err);
      setError(`Не удалось загрузить список сотрудников: ${err instanceof Error ? err.message : 'Неизвестная ошибка'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewEmployee({
      ...newEmployee,
      [name]: value
    });
  };

  const setEmployeeRole = (type: string) => {
    setEmployeeType(type);
    setNewEmployee({
      ...newEmployee,
      role: type === 'engineer' ? 'engineer' : 'dispatcher',
      position: type === 'engineer' ? 'Инженер' : 'Диспетчер'
    });
  };

  // Обработчик начала изменения размера
  const handleResizeStart = (columnId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!tableRef.current) return;
    
    // Ищем нужную ячейку заголовка
    const headerCell = tableRef.current.querySelector(`th[data-column="${columnId}"]`) as HTMLTableHeaderCellElement;
    if (!headerCell) return;
    
    // Сохраняем данные для изменения размера
    resizingColumn.current = columnId;
    const headerRect = headerCell.getBoundingClientRect();
    initialWidth.current = headerRect.width;
    startClientX.current = e.clientX;
    
    // Показываем линию изменения размера
    if (resizeLineRef.current) {
      const tableRect = tableRef.current.getBoundingClientRect();
      resizeLineRef.current.style.top = `${tableRect.top}px`;
      resizeLineRef.current.style.left = `${headerRect.right}px`;
      resizeLineRef.current.style.height = `${tableRect.height}px`;
      resizeLineRef.current.style.display = 'block';
    }
    
    // Добавляем стиль к телу документа
    document.body.classList.add('resizing');
    
    // Добавляем обработчики для отслеживания движения мыши и отпускания кнопки
    document.addEventListener('mousemove', handleResizeMove);
    document.addEventListener('mouseup', handleResizeEnd);
    document.addEventListener('mouseleave', handleResizeEnd);
  };
  
  // Обработчик движения мыши при изменении размера
  const handleResizeMove = (e: MouseEvent) => {
    if (!resizingColumn.current || !resizeLineRef.current || !tableRef.current) return;
    
    // Вычисляем, насколько нужно изменить ширину
    const diff = e.clientX - startClientX.current;
    const newWidth = Math.max(50, initialWidth.current + diff); // Минимальная ширина 50px
    
    // Обновляем положение линии изменения размера
    const headerCell = tableRef.current.querySelector(`th[data-column="${resizingColumn.current}"]`) as HTMLTableHeaderCellElement;
    if (headerCell) {
      const headerRect = headerCell.getBoundingClientRect();
      const tableRect = tableRef.current.getBoundingClientRect();
      
      // Вычисляем абсолютную позицию слева для линии
      const absoluteLeft = headerRect.left + newWidth;
      resizeLineRef.current.style.left = `${absoluteLeft}px`;
    }
  };
  
  // Обработчик завершения изменения размера
  const handleResizeEnd = (e?: MouseEvent) => {
    if (!resizingColumn.current || !tableRef.current || !resizeLineRef.current) {
      cleanupResizeHandlers();
      return;
    }
    
    try {
      // Скрываем линию изменения размера
      resizeLineRef.current.style.display = 'none';
      
      // Удаляем стиль с тела документа
      document.body.classList.remove('resizing');
      
      // Вычисляем новую ширину на основе положения линии
      const lineLeftStr = resizeLineRef.current.style.left;
      if (!lineLeftStr) {
        cleanupResizeHandlers();
        return;
      }
      
      const lineLeft = parseInt(lineLeftStr);
      if (isNaN(lineLeft)) {
        cleanupResizeHandlers();
        return;
      }
      
      const headerCell = tableRef.current.querySelector(`th[data-column="${resizingColumn.current}"]`) as HTMLTableHeaderCellElement;
      
      if (headerCell) {
        const headerRect = headerCell.getBoundingClientRect();
        const newWidth = Math.max(50, lineLeft - headerRect.left);
        
        // Применяем ширину ко всем ячейкам в столбце
        const allCells = tableRef.current.querySelectorAll(`[data-column="${resizingColumn.current}"]`);
        allCells.forEach(cell => {
          (cell as HTMLElement).style.width = `${newWidth}px`;
        });
        
        // Сохраняем новую ширину в состоянии
        setColumnWidths(prev => ({
          ...prev,
          [resizingColumn.current as string]: newWidth
        }));
      }
    } catch (error) {
      console.error('Ошибка при изменении размера:', error);
    } finally {
      // Сбрасываем данные и удаляем обработчики в любом случае
      cleanupResizeHandlers();
    }
  };
  
  // Функция для очистки обработчиков событий
  const cleanupResizeHandlers = () => {
    resizingColumn.current = null;
    document.removeEventListener('mousemove', handleResizeMove);
    document.removeEventListener('mouseup', handleResizeEnd);
    document.removeEventListener('mouseleave', handleResizeEnd);
    document.body.classList.remove('resizing');
    
    if (resizeLineRef.current) {
      resizeLineRef.current.style.display = 'none';
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Проверка роли - только админ может создавать сотрудников
    if (userRole !== 'admin') {
      alert('У вас нет прав для создания сотрудников');
      return;
    }
    
    if (!newEmployee.name || !newEmployee.email || !newEmployee.password || !newEmployee.role) {
      alert('Пожалуйста, заполните все обязательные поля');
      return;
    }
    
    try {
      // 1. Создаем пользователя в Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        newEmployee.email,
        newEmployee.password
      );
      
      // 2. Получаем ID созданного пользователя
      const uid = userCredential.user.uid;
      
      // 3. Сохраняем данные в Firestore
      const userRef = doc(db, 'users', uid);
      await setDoc(userRef, {
        uid: uid,
        name: newEmployee.name,
        email: newEmployee.email,
        phone: newEmployee.phone,
        position: newEmployee.position,
        role: newEmployee.role,
        createdAt: new Date(),
        activity: 0,
        rating: 0.00
      });
      
      // 4. Обновляем список сотрудников
      fetchEmployees();
      
      // 5. Закрываем модальное окно и очищаем форму
      setShowModal(false);
      setNewEmployee({
        name: '',
        position: '',
        phone: '',
        email: '',
        password: '',
        role: ''
      });
      setEmployeeType('');
      
    } catch (err) {
      console.error("Ошибка при создании сотрудника:", err);
      alert(`Ошибка при создании сотрудника: ${err instanceof Error ? err.message : 'Неизвестная ошибка'}`);
    }
  };

  const handleDeleteEmployee = async (id: string) => {
    // Проверка роли - только админ может удалять сотрудников
    if (userRole !== 'admin') {
      alert('У вас нет прав для удаления сотрудников');
      return;
    }
    
    if (window.confirm('Вы уверены, что хотите удалить этого сотрудника?')) {
      try {
        await deleteDoc(doc(db, 'users', id));
        fetchEmployees();
      } catch (err) {
        console.error("Ошибка при удалении сотрудника:", err);
        alert(`Ошибка при удалении сотрудника: ${err instanceof Error ? err.message : 'Неизвестная ошибка'}`);
      }
    }
  };

  return (
    <div className="employees-page">
      <div className="page-header">
        <h2>Сотрудники</h2>
        {/* Кнопка добавления сотрудника только для админа */}
        {userRole === 'admin' && (
          <button className="add-button" onClick={() => setShowModal(true)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 5V19M5 12H19" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Добавить сотрудника
          </button>
        )}
      </div>

      {loading ? (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Загрузка сотрудников...</p>
        </div>
      ) : error ? (
        <div className="error-container">
          <p className="error-message">{error}</p>
          <button onClick={() => fetchEmployees()}>Попробовать снова</button>
        </div>
      ) : (
        <div className="table-container">
          {employees.length === 0 ? (
            <div className="empty-state">
              <p>Сотрудники не найдены</p>
            </div>
          ) : (
            <table className="employees-table" ref={tableRef}>
              <thead>
                <tr>
                  <th 
                    data-column="id" 
                    style={{ width: columnWidths['id'] ? `${columnWidths['id']}px` : undefined }}
                  >
                    ID
                    <div 
                      className="resize-handle"
                      onMouseDown={(e) => handleResizeStart('id', e)}
                    ></div>
                  </th>
                  <th 
                    data-column="name" 
                    style={{ width: columnWidths['name'] ? `${columnWidths['name']}px` : undefined }}
                  >
                    ФИО
                    <div 
                      className="resize-handle"
                      onMouseDown={(e) => handleResizeStart('name', e)}
                    ></div>
                  </th>
                  <th 
                    data-column="position" 
                    style={{ width: columnWidths['position'] ? `${columnWidths['position']}px` : undefined }}
                  >
                    Должность
                    <div 
                      className="resize-handle"
                      onMouseDown={(e) => handleResizeStart('position', e)}
                    ></div>
                  </th>
                  <th 
                    data-column="phone" 
                    style={{ width: columnWidths['phone'] ? `${columnWidths['phone']}px` : undefined }}
                  >
                    Телефон
                    <div 
                      className="resize-handle"
                      onMouseDown={(e) => handleResizeStart('phone', e)}
                    ></div>
                  </th>
                  <th 
                    data-column="email" 
                    style={{ width: columnWidths['email'] ? `${columnWidths['email']}px` : undefined }}
                  >
                    Email
                    <div 
                      className="resize-handle"
                      onMouseDown={(e) => handleResizeStart('email', e)}
                    ></div>
                  </th>
                  {/* Колонка с действиями видна только для админа */}
                  {userRole === 'admin' && (
                    <th 
                      data-column="actions"
                      style={{ width: columnWidths['actions'] ? `${columnWidths['actions']}px` : undefined }}
                    >
                      Действия
                      <div 
                        className="resize-handle"
                        onMouseDown={(e) => handleResizeStart('actions', e)}
                      ></div>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {employees.map(employee => (
                  <tr key={employee.id}>
                    <td data-column="id" style={{ width: columnWidths['id'] ? `${columnWidths['id']}px` : undefined }}>
                      {employee.id}
                    </td>
                    <td data-column="name" style={{ width: columnWidths['name'] ? `${columnWidths['name']}px` : undefined }}>
                      {employee.name}
                    </td>
                    <td data-column="position" style={{ width: columnWidths['position'] ? `${columnWidths['position']}px` : undefined }}>
                      {employee.position}
                    </td>
                    <td data-column="phone" style={{ width: columnWidths['phone'] ? `${columnWidths['phone']}px` : undefined }}>
                      {employee.phone}
                    </td>
                    <td data-column="email" style={{ width: columnWidths['email'] ? `${columnWidths['email']}px` : undefined }}>
                      {employee.email}
                    </td>
                    {/* Кнопки редактирования и удаления только для админа */}
                    {userRole === 'admin' && (
                      <td 
                        className="actions"
                        data-column="actions"
                        style={{ width: columnWidths['actions'] ? `${columnWidths['actions']}px` : undefined }}
                      >
                        <button className="action-button edit">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M11 4H4C3.46957 4 2.96086 4.21071 2.58579 4.58579C2.21071 4.96086 2 5.46957 2 6V20C2 20.5304 2.21071 21.0391 2.58579 21.4142C2.96086 21.7893 3.46957 22 4 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V13" stroke="#383636" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M18.5 2.50001C18.8978 2.10219 19.4374 1.87869 20 1.87869C20.5626 1.87869 21.1022 2.10219 21.5 2.50001C21.8978 2.89784 22.1213 3.4374 22.1213 4.00001C22.1213 4.56262 21.8978 5.10219 21.5 5.50001L12 15L8 16L9 12L18.5 2.50001Z" stroke="#383636" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </button>
                        <button 
                          className="action-button delete"
                          onClick={() => handleDeleteEmployee(employee.id)}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M3 6H5H21" stroke="#D04E4E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6H19Z" stroke="#D04E4E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Модальное окно добавления сотрудника (показывается только для админа) */}
      {showModal && userRole === 'admin' && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Добавление нового сотрудника</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            
            {!employeeType ? (
              <div className="employee-type-selection">
                <h4>Выберите тип сотрудника</h4>
                <div className="employee-type-buttons">
                  <button 
                    className="employee-type-button engineer" 
                    onClick={() => setEmployeeRole('engineer')}
                  >
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M19 22H5C3.89543 22 3 21.1046 3 20V6C3 4.89543 3.89543 4 5 4H7V2H9V4H15V2H17V4H19C20.1046 4 21 4.89543 21 6V20C21 21.1046 20.1046 22 19 22Z" stroke="#333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M16 13L8 13" stroke="#333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M16 17L8 17" stroke="#333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M10 9H8" stroke="#333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span>Инженер</span>
                  </button>
                  <button 
                    className="employee-type-button dispatcher" 
                    onClick={() => setEmployeeRole('dispatcher')}
                  >
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M22 12H18L15 21L9 3L6 12H2" stroke="#333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span>Диспетчер</span>
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleFormSubmit}>
                <div className="form-group">
                  <label htmlFor="name">ФИО (обязательно)</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={newEmployee.name}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="phone">Телефон</label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={newEmployee.phone}
                    onChange={handleInputChange}
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="email">Email (обязательно)</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={newEmployee.email}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="password">Пароль (обязательно)</label>
                  <input
                    type="password"
                    id="password"
                    name="password"
                    value={newEmployee.password}
                    onChange={handleInputChange}
                    required
                    minLength={6}
                  />
                  <small>Минимум 6 символов</small>
                </div>
                
                <div className="form-actions">
                  <button type="button" className="cancel-button" onClick={() => {
                    setEmployeeType('');
                    setNewEmployee({
                      ...newEmployee,
                      role: ''
                    });
                  }}>
                    Назад
                  </button>
                  <button type="submit" className="submit-button">
                    Создать {employeeType === 'engineer' ? 'инженера' : 'диспетчера'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Employees;
