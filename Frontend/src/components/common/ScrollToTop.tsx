
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export const ScrollToTop: React.FC = () => {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    // For HashRouter, we need to monitor both pathname and hash
    window.scrollTo(0, 0);
  }, [pathname, hash]);

  return null;
};
