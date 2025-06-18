import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../assets/firebase';
import Modal from '../Modal';
import OrderForm from '../OrderForm';
import '../../styles/pages/Services.css';

// Описание типа услуги
interface Service {
  id: string;
  title: string;
  description: string;
  price: number;
  categoryId: string;
}

// Описание типа пропсов для компонента Services
interface ServicesProps {
  categoryId: string | null;
  categoryName: string | null;
}

// Основная функция страницы услуг
const Services: React.FC<ServicesProps> = ({ categoryId, categoryName }) => {
  // services — список услуг в выбранной категории
  const [services, setServices] = useState<Service[]>([]);
  // loading — идёт ли сейчас загрузка
  const [loading, setLoading] = useState(true);
  // error — текст ошибки, если что-то пошло не так
  const [error, setError] = useState<string | null>(null);
  // selectedService — выбранная услуга для просмотра или заказа
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  // isDetailModalOpen — открыто ли модальное окно с деталями услуги
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  // isOrderModalOpen — открыто ли модальное окно оформления заказа
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);

  // Загрузка услуг из Firestore при изменении выбранной категории
  useEffect(() => {
    const fetchServices = async () => {
      if (!categoryId) {
        setError("Категория не выбрана.");
        setLoading(false);
        return;
      }

      try {
        const servicesCollectionRef = collection(db, 'services');
        const q = query(
          servicesCollectionRef,
          where('categoryId', '==', categoryId)
        );
        const querySnapshot = await getDocs(q);
        const fetchedServices: Service[] = querySnapshot.docs.map(doc => ({
          id: doc.id,
          title: doc.data().title,
          description: doc.data().description || '',
          price: doc.data().price || 0,
          categoryId: doc.data().categoryId,
        }));
        setServices(fetchedServices);
      } catch (err) {
        console.error("Error fetching services:", err);
        setError("Не удалось загрузить услуги. Пожалуйста, попробуйте еще раз.");
      } finally {
        setLoading(false);
      }
    };

    setLoading(true);
    setError(null);
    setServices([]); // Очищаем предыдущие услуги при смене категории
    fetchServices();
  }, [categoryId]);

  // Если идёт загрузка — показываем сообщение
  if (loading) {
    return <div className="services-loading">Загрузка услуг...</div>;
  }

  // Если возникла ошибка — показываем её
  if (error) {
    return <div className="services-error">{error}</div>;
  }

  // Если категория не выбрана — просим выбрать
  if (!categoryId) {
    return <div className="services-no-category">Выберите категорию для просмотра услуг.</div>;
  }

  // Открыть модальное окно с деталями услуги
  const handleServiceClick = (service: Service) => {
    setSelectedService(service);
    setIsDetailModalOpen(true);
  };

  // Закрыть все модальные окна и сбросить выбранную услугу
  const handleBackToServices = () => {
    setSelectedService(null);
    setIsDetailModalOpen(false);
    setIsOrderModalOpen(false);
  };

  // Открыть модальное окно оформления заказа
  const handleOrderClick = (service: Service) => {
    setSelectedService(service);
    setIsOrderModalOpen(true);
  };

  // Обработка успешного оформления заказа
  const handleOrderSubmit = () => {
    // Здесь вы можете добавить логику для сохранения заказа в Firestore или отправки на сервер
    alert("Заказ успешно оформлен!");
    setIsOrderModalOpen(false);
  };

  // Возвращаем разметку страницы услуг
  return (
    <div className="services-container">
      <h2>Услуги в категории "{categoryName}"</h2>
      <div className="service-list">
        {services.map(service => (
          <div key={service.id} className="service-card" onClick={() => handleServiceClick(service)}>
            <h3>{service.title}</h3>
            <p>{service.description || 'Нет описания'}</p>
            <div className="service-price">Цена: {service.price} руб.</div>
            <button onClick={(e) => { e.stopPropagation(); handleOrderClick(service); }} className="order-button">Заказать</button>
          </div>
        ))}
        {services.length === 0 && (
          <p>Услуги в этой категории не найдены.</p>
        )}
      </div>

      {/* Модальное окно с деталями услуги */}
      <Modal isOpen={isDetailModalOpen} onClose={handleBackToServices}>
        {selectedService && (
          <div className="service-detail-modal-content">
            <h2>{selectedService.title}</h2>
            <p className="service-detail-description">{selectedService.description || 'Нет описания'}</p>
            <div className="service-detail-price">Цена: {selectedService.price} руб.</div>
            <button onClick={() => {
              setIsDetailModalOpen(false); // Закрыть окно деталей
              handleOrderClick(selectedService); // Открыть окно заказа
            }} className="order-button">Заказать</button>
          </div>
        )}
      </Modal>

      {/* Модальное окно оформления заказа */}
      <Modal isOpen={isOrderModalOpen} onClose={handleBackToServices}>
        {selectedService && (
          <OrderForm
            serviceTitle={selectedService.title}
            onClose={handleBackToServices}
            onOrderSuccess={handleOrderSubmit}
          />
        )}
      </Modal>
    </div>
  );
};

export default Services; 