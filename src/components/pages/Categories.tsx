import React, { useEffect, useState } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../../assets/firebase';
import Services from './Services';
import '../../styles/pages/Categories.css';
import '../../styles/pages/Services.css';

// Описание типа категории
interface Category {
  id: string; // уникальный идентификатор категории
  name: string; // название категории
  description: string; // описание категории
}

// Основная функция страницы категорий
const Categories: React.FC = () => {
  // categories — список всех категорий
  const [categories, setCategories] = useState<Category[]>([]);
  // loading — идёт ли сейчас загрузка категорий
  const [loading, setLoading] = useState(true);
  // error — текст ошибки, если есть
  const [error, setError] = useState<string | null>(null);
  // selectedCategoryId — id выбранной категории
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  // selectedCategoryName — название выбранной категории
  const [selectedCategoryName, setSelectedCategoryName] = useState<string | null>(null);

  // Загружаем категории из Firestore при первом рендере
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const categoriesCollectionRef = collection(db, 'service_categories');
        const q = query(categoriesCollectionRef, orderBy('name', 'asc'));
        const querySnapshot = await getDocs(q);
        const fetchedCategories: Category[] = querySnapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name,
          description: doc.data().description || '',
        }));
        setCategories(fetchedCategories);

        // Если есть хотя бы одна категория, выбираем первую по умолчанию
        if (fetchedCategories.length > 0) {
          setSelectedCategoryId(fetchedCategories[0].id);
          setSelectedCategoryName(fetchedCategories[0].name);
        }

      } catch (err) {
        console.error("Error fetching categories:", err);
        setError("Не удалось загрузить категории. Пожалуйста, попробуйте еще раз.");
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  // Обработка клика по кнопке категории
  const handleCategoryClick = (categoryId: string, categoryName: string) => {
    setSelectedCategoryId(categoryId);
    setSelectedCategoryName(categoryName);
  };

  // Если идёт загрузка — показываем сообщение
  if (loading) {
    return <div className="categories-loading">Загрузка категорий...</div>;
  }

  // Если произошла ошибка — показываем ошибку
  if (error) {
    return <div className="categories-error">{error}</div>;
  }

  // Возвращаем разметку страницы категорий
  return (
    <div className="categories-page-container">
      <div className="category-switcher-container">
        {categories.map(category => (
          <button 
            key={category.id} 
            className={`category-switcher-button ${selectedCategoryId === category.id ? 'active' : ''}`}
            onClick={() => handleCategoryClick(category.id, category.name)}
          >
            {category.name}
          </button>
        ))}
      </div>

      {selectedCategoryId && selectedCategoryName ? (
        <Services 
          categoryId={selectedCategoryId} 
          categoryName={selectedCategoryName} 
        />
      ) : (
        <p className="no-category-selected-message">Выберите категорию для просмотра услуг.</p>
      )}
    </div>
  );
};

export default Categories; 