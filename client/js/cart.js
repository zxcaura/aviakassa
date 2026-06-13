// Этот файл использует функции из main.js
window.getCart = window.getCart || function() {
    const cartJson = localStorage.getItem('aviakassa_cart');
    return cartJson ? JSON.parse(cartJson) : { items: [], total: 0, expiresAt: null };
};

window.updateCartCount = window.updateCartCount || function() {
    const cart = window.getCart();
    const count = cart.items.reduce((s, i) => s + i.quantity, 0);
    document.querySelectorAll('.cart-count').forEach(el => {
        if (el) el.textContent = count;
    });
};