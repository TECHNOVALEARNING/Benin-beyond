import React, { createContext, useContext, useState, useEffect } from 'react';

const CART_STORAGE_KEY = 'benin_beyond_cart';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.error('Failed to save cart to localStorage:', e);
    }
  }, [items]);

  const addItem = (newItem) => {
    setItems((prev) => [...prev, newItem]);
  };

  const updateItem = (index, updatedItem) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...updatedItem };
      return next;
    });
  };

  const removeItem = (index) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const clearCart = () => {
    setItems([]);
  };

  const subtotal = items.reduce((sum, item) => {
    const duration = item.nights || item.days || item.qty || 1;
    return sum + (item.price || 0) * duration;
  }, 0);

  const count = items.length;

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        updateItem,
        removeItem,
        clearCart,
        subtotal,
        count
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
