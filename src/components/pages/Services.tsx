import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../../assets/firebase';
import Modal from '../Modal';
import OrderForm from '../OrderForm';
import '../../styles/pages/Services.css';

interface Service {
  id: string;
  title: string;
  description: string;
  price: number;
  categoryId: string;
}

interface ServicesProps {
  categoryId: string | null;
  categoryName: string | null;
}

const Services: React.FC<ServicesProps> = ({ categoryId, categoryName }) => {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);

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
    setServices([]); // Clear previous services when categoryId changes
    fetchServices();
  }, [categoryId]);

  if (loading) {
    return <div className="services-loading">Загрузка услуг...</div>;
  }

  if (error) {
    return <div className="services-error">{error}</div>;
  }

  if (!categoryId) {
    return <div className="services-no-category">Выберите категорию для просмотра услуг.</div>;
  }

  const handleServiceClick = (service: Service) => {
    setSelectedService(service);
    setIsDetailModalOpen(true);
  };

  const handleBackToServices = () => {
    setSelectedService(null);
    setIsDetailModalOpen(false);
    setIsOrderModalOpen(false);
  };

  const handleOrderClick = (service: Service) => {
    setSelectedService(service);
    setIsOrderModalOpen(true);
  };

  const handleOrderSubmit = () => {
    // Здесь вы можете добавить логику для сохранения заказа в Firestore или отправки на сервер
    alert("Заказ успешно оформлен!");
    setIsOrderModalOpen(false);
  };

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

      <Modal isOpen={isDetailModalOpen} onClose={handleBackToServices}>
        {selectedService && (
          <div className="service-detail-modal-content">
            <h2>{selectedService.title}</h2>
            <p className="service-detail-description">{selectedService.description || 'Нет описания'}</p>
            <div className="service-detail-price">Цена: {selectedService.price} руб.</div>
            <button onClick={() => {
              setIsDetailModalOpen(false); // Close detail modal
              handleOrderClick(selectedService); // Open order modal
            }} className="order-button">Заказать</button>
          </div>
        )}
      </Modal>

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