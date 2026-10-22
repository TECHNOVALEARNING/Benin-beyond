import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { CartProvider } from './context/CartContext';
import { LanguageProvider } from './context/LanguageContext';
import { initCurrency } from './utils/currency';
import './index.css';

// La devise du visiteur est résolue avant le premier rendu pour que tous les prix soient cohérents
initCurrency().finally(() => ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <LanguageProvider>
        <CartProvider>
          <App />
        </CartProvider>
      </LanguageProvider>
    </BrowserRouter>
  </React.StrictMode>
));
