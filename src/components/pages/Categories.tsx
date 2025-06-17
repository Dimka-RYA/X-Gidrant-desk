import React, { useEffect, useState } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../../assets/firebase';
import Services from './Services';
import '../../styles/pages/Categories.css';
import '../../styles/pages/Services.css';

interface Category {
  id: string;
  name: string;
  description: string;
}

const Categories: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedCategoryName, setSelectedCategoryName] = useState<string | null>(null);

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

  const handleCategoryClick = (categoryId: string, categoryName: string) => {
    setSelectedCategoryId(categoryId);
    setSelectedCategoryName(categoryName);
  };

  if (loading) {
    return <div className="categories-loading">Загрузка категорий...</div>;
  }

  if (error) {
    return <div className="categories-error">{error}</div>;
  }

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
          onBackToCategories={() => { }}
        />
      ) : (
        <p className="no-category-selected-message">Выберите категорию для просмотра услуг.</p>
      )}
    </div>
  );
};

export default Categories; 