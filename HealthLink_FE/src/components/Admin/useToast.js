import { useState, useCallback } from 'react';

const useToast = () => {
  const [toast, setToast] = useState({
    show: false,
    title: '',
    message: '',
    type: 'success',
    duration: 3000
  });

  const showToast = useCallback(({ title, message, type = 'success', duration = 3000 }) => {
    setToast({
      show: true,
      title,
      message,
      type,
      duration
    });
  }, []);

  const hideToast = useCallback(() => {
    setToast(prev => ({ ...prev, show: false }));
  }, []);

  return { toast, showToast, hideToast };
};

export default useToast;
