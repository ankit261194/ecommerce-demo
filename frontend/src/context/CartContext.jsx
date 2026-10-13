import React, { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState(() => {
    const saved = localStorage.getItem('auramarket_cart');
    return saved ? JSON.parse(saved) : [];
  });

  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('auramarket_cart', JSON.stringify(cartItems));
  }, [cartItems]);

  const addToCart = (product, variant = null, qty = 1) => {
    const itemSku = variant ? variant.sku : product.sku;
    const itemPrice = variant ? product.sellingPrice + (variant.additionalPrice || 0) : product.sellingPrice;
    const variantName = variant ? variant.name : 'Standard';

    setCartItems(prev => {
      const existingIndex = prev.findIndex(item => item.productId === product._id && item.variantSku === itemSku);
      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex].quantity += qty;
        return updated;
      } else {
        return [
          ...prev,
          {
            productId: product._id,
            title: product.title,
            image: product.images?.[0] || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500',
            price: itemPrice,
            quantity: qty,
            variantSku: itemSku,
            variantName,
            vendorId: product.vendor?._id || product.vendor,
            vendorName: product.vendor?.storeName || 'Verified Merchant',
            stock: variant ? variant.stock : product.stock,
          },
        ];
      }
    });

    setIsCartOpen(true);
  };

  const updateQuantity = (productId, variantSku, qty) => {
    if (qty <= 0) {
      removeFromCart(productId, variantSku);
      return;
    }
    setCartItems(prev =>
      prev.map(item => (item.productId === productId && item.variantSku === variantSku ? { ...item, quantity: qty } : item))
    );
  };

  const removeFromCart = (productId, variantSku) => {
    setCartItems(prev => prev.filter(item => !(item.productId === productId && item.variantSku === variantSku)));
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const cartTotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  // Multi-Vendor Split Breakdown
  const vendorBreakdown = cartItems.reduce((acc, item) => {
    const vId = item.vendorId || 'default_vendor';
    if (!acc[vId]) {
      acc[vId] = {
        vendorName: item.vendorName,
        items: [],
        subTotal: 0,
      };
    }
    acc[vId].items.push(item);
    acc[vId].subTotal += item.price * item.quantity;
    return acc;
  }, {});

  return (
    <CartContext.Provider
      value={{
        cartItems,
        isCartOpen,
        setIsCartOpen,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        cartTotal,
        cartCount,
        vendorBreakdown,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
