
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Sales = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to the new Sales Dashboard
    navigate('/sales-dashboard', { replace: true });
  }, [navigate]);

  return null;
};

export default Sales;
