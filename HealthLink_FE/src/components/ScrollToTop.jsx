// src/components/ScrollToTop.jsx
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export default function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
    // Hoặc cuộn mượt hơn:
    // window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [pathname]); // Mỗi khi pathname thay đổi → cuộn lên đầu

  return null;
}