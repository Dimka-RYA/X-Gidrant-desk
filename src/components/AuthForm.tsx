import React, { useState } from 'react';
import { 
  signInWithEmailAndPassword,
  AuthError,
  createUserWithEmailAndPassword
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../assets/firebase';
import '../styles/AuthForm.css';
// Импортируем SVG изображения
import firdSvg from '../assets/fird.svg';
import firdstSvg from '../assets/firdst.svg';

// Описание свойств, которые получает AuthForm от родителя
interface AuthFormProps {
  onSuccess: (role: 'admin' | 'user') => void; // функция, вызывается при успешной авторизации/регистрации
}

// Основная функция формы авторизации и регистрации
const AuthForm = ({ onSuccess }: AuthFormProps) => {
  // email — введённый email пользователя
  const [email, setEmail] = useState('');
  // password — введённый пароль
  const [password, setPassword] = useState('');
  // error — текст ошибки, если есть
  const [error, setError] = useState<string | null>(null);
  // loading — идёт ли сейчас процесс входа/регистрации
  const [loading, setLoading] = useState(false);
  // role — выбранная роль (админ или пользователь)
  const [role, setRole] = useState<'admin' | 'user'>('admin');
  // isRegistering — режим: регистрация или вход
  const [isRegistering, setIsRegistering] = useState(false);

  // Функция регистрации нового пользователя
  const handleRegister = async () => {
    setError(null);
    setLoading(true);
    try {
      // Регистрируем пользователя в Firebase
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const userId = userCredential.user.uid;
      
      // Создаём документ пользователя в Firestore
      await setDoc(doc(db, 'users', userId), {
        uid: userId,
        email: email,
        role: role,
        name: 
          role === 'admin' ? 'Администратор' : 
          'Пользователь',
        createdAt: new Date()
      });
      onSuccess(role);
    } catch (err) {
      const authError = err as AuthError;
      let errorMessage = 'Произошла ошибка при регистрации';

      // Обработка популярных ошибок
      if (authError.code === 'auth/email-already-in-use') {
        errorMessage = 'Пользователь с таким email уже существует.';
      } else if (authError.code === 'auth/weak-password') {
        errorMessage = 'Пароль должен быть не менее 6 символов.';
      } else if (authError.code === 'auth/invalid-email') {
        errorMessage = 'Некорректный email';
      }
      console.error("Ошибка регистрации:", authError);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Функция отправки формы (вход или регистрация)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isRegistering) {
      handleRegister();
      return;
    }
    setError(null);
    setLoading(true);

    try {
      // Проверяем, используются ли тестовые учетные данные
      const isTestAdmin = email === 'admin@xgidrant.com' && password === 'admin123';
      const isTestUser = email === 'user@xgidrant.com' && password === 'user123';
      
      // Если используются тестовые данные, создаем пользователя, если он не существует
      if (isTestAdmin || isTestUser) {
        try {
          // Пытаемся войти с тестовыми данными
          const userCredential = await signInWithEmailAndPassword(auth, email, password);
          const userId = userCredential.user.uid;
          
          // Если успешно вошли, проверяем роль в Firestore
          const userDocRef = doc(db, 'users', userId);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            // Обновляем роль, если пользователь существует
            const userData = userDoc.data();
            if (userData.role !== role) {
              await setDoc(userDocRef, { 
                ...userData, 
                role: role,
                name: 
                  role === 'admin' ? 'Администратор' : 
                  'Пользователь'
              }, { merge: true });
            }
          } else {
            // Создаем документ пользователя в Firestore
            await setDoc(userDocRef, {
              uid: userId,
              email: email,
              role: role,
              name:
                role === 'admin' ? 'Администратор' :
                'Пользователь',
              createdAt: new Date()
            });
          }
          
          // Успешный вход
          onSuccess(role);
          return;
        } catch (error) {
          // Если не удалось войти, значит пользователь не существует
          console.log("Пользователь не существует, создаем нового...");
          
          setError("Тестовый пользователь не существует в Firebase. В реальном проекте здесь должен быть код регистрации.");
          setLoading(false);
          return;
        }
      }

      // Для обычной авторизации продолжаем как раньше
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const userId = userCredential.user.uid;
      
      // Отладочный вывод в консоль
      console.log("Пользователь успешно аутентифицирован:", userId);
      console.log("UID пользователя:", userId);
      console.log("Email пользователя:", userCredential.user.email);
      console.log("Текущий токен:", await userCredential.user.getIdToken());
      
      // Проверка роли пользователя
      const userDocRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userDocRef);
      
      // Отладочный вывод в консоль
      console.log("Документ пользователя существует:", userDoc.exists());
      if (userDoc.exists()) {
        console.log("Данные пользователя:", userDoc.data());
        console.log("Роль пользователя:", userDoc.data().role);
      } else {
        // Если документ в Firestore не существует, создаем его с правильным uid и выбранной ролью
        console.log("Документ пользователя не существует, создаем новый");
        await setDoc(userDocRef, {
          uid: userId,
          email: userCredential.user.email,
          role: role,
          name:
            role === 'admin' ? 'Администратор' :
            'Пользователь',
          createdAt: new Date()
        });
        console.log("Документ пользователя успешно создан");
        console.log("UID документа:", userDocRef.id);
      }
      
      // Проверяем роль пользователя
      if (!userDoc.exists()) {
        console.warn("Документ пользователя не существует. Создан новый документ.");
        // Пропускаем пользователя без проверки роли
        onSuccess(role);
        return;
      }
      
      const userRole = userDoc.data().role;
      if (userRole !== 'admin' && userRole !== 'user') {
        console.warn("У пользователя нет допустимой роли. Текущая роль:", userRole || "не указана");
        setError('У вас нет доступа к панели управления. Обратитесь к администратору.');
        setLoading(false);
        return;
      }
      
      // Если всё в порядке, авторизуем пользователя
      onSuccess(userRole);
      
    } catch (err) {
      const authError = err as AuthError;
      let errorMessage = 'Произошла ошибка при авторизации';
      
      // Обработка популярных ошибок
      if (authError.code === 'auth/invalid-email') {
        errorMessage = 'Некорректный email';
      } else if (authError.code === 'auth/user-not-found' || authError.code === 'auth/wrong-password' || authError.code === 'auth/invalid-credential') {
        errorMessage = 'Неверный email или пароль';
      }
      
      console.error("Ошибка авторизации:", authError);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Функция для автозаполнения тестовых данных
  const useTestCredentials = () => {
    if (role === 'admin') {
      setEmail('admin@xgidrant.com');
      setPassword('admin123');
    } else if (role === 'user') {
      setEmail('user@xgidrant.com');
      setPassword('user123');
    }
  };

  // Возвращаем разметку формы авторизации/регистрации
  return (
    <div className="auth-container">
      <div className="auth-form-container">
        <div className="auth-header">
          <h2>{isRegistering ? 'Регистрация' : 'Вход'}</h2>
        </div>
        
        <form onSubmit={handleSubmit} className="auth-form">
          {error && <div className="auth-error">{error}</div>}
          
          <div className="form-group role-selector">
            <label>Выберите роль:</label>
            <div className="role-buttons">
              <button 
                type="button"
                className={`role-button ${role === 'admin' ? 'active' : ''}`}
                onClick={() => setRole('admin')}
              >
                Администратор
              </button>
              <button 
                type="button"
                className={`role-button ${role === 'user' ? 'active' : ''}`}
                onClick={() => setRole('user')}
              >
                Пользователь
              </button>
            </div>
          </div>
          
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">Пароль</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          
          <button type="submit" className="auth-button" disabled={loading}>
            {isRegistering ? 'Зарегистрироваться' : 'Войти'}
          </button>
          
          <button 
            type="button"
            className="toggle-auth-mode-button"
            onClick={() => setIsRegistering(!isRegistering)}
          >
            {isRegistering ? 'Уже есть аккаунт? Войти' : 'Нет аккаунта? Зарегистрироваться'}
          </button>

          <button 
            type="button"
            className="test-data-button"
            onClick={useTestCredentials}
            disabled={loading}
          >
            Использовать тестовые данные
          </button>
        </form>
      </div>
      
      <div className="auth-background">
        <div className="auth-bg-gradient"></div>
        <div className="auth-bg-elements">
          {/* Добавляем импортированные SVG изображения */}
          <img src={firdSvg} alt="Decorative wave" className="auth-bg-svg auth-bg-svg-1" />
          <img src={firdstSvg} alt="Decorative wave" className="auth-bg-svg auth-bg-svg-2" />
        </div>
        <div className="auth-bg-circles">
          <div className="auth-bg-circle auth-bg-circle-1"></div>
          <div className="auth-bg-circle auth-bg-circle-2"></div>
          <div className="auth-bg-circle auth-bg-circle-3"></div>
        </div>
      </div>
    </div>
  );
};

export default AuthForm