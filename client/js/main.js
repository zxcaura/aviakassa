const API_BASE_URL = '/api';
const CART_EXPIRY_MINUTES = 20;
let cartTimer = null;

function getCart() {
    const cartJson = localStorage.getItem('aviakassa_cart');
    return cartJson ? JSON.parse(cartJson) : { items: [], total: 0, expiresAt: null };
}

function saveCart(cart) {
    localStorage.setItem('aviakassa_cart', JSON.stringify(cart));
}

// КРАСИВОЕ УВЕДОМЛЕНИЕ (ДОБАВЛЕНИЕ)
function showNotification(msg) {
    const oldNotification = document.querySelector('.custom-notification');
    if (oldNotification) oldNotification.remove();
    
    const notification = document.createElement('div');
    notification.className = 'custom-notification';
    notification.innerHTML = `
        <div class="notification-icon"><i class="fas fa-plane-departure"></i></div>
        <div class="notification-content">
            <div class="notification-title">✈️ Билет добавлен!</div>
            <div class="notification-message">${msg}</div>
        </div>
        <button class="notification-close"><i class="fas fa-times"></i></button>
        <div class="notification-progress"></div>
    `;
    
    notification.style.cssText = `
        position: fixed; bottom: 30px; right: 30px; min-width: 320px;
        background: linear-gradient(135deg, #0f172a, #1e293b);
        border-radius: 20px; padding: 16px 20px; display: flex; align-items: center; gap: 16px;
        z-index: 10000; box-shadow: 0 10px 30px rgba(0,0,0,0.4);
        border-left: 4px solid #4db8ff; animation: slideInRight 0.3s ease;
        backdrop-filter: blur(10px);
    `;
    
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideInRight {
            from { opacity: 0; transform: translateX(100px); }
            to { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideOutRight {
            from { opacity: 1; transform: translateX(0); }
            to { opacity: 0; transform: translateX(100px); }
        }
        @keyframes shrink {
            from { width: 100%; }
            to { width: 0%; }
        }
        .custom-notification .notification-icon {
            width: 48px; height: 48px;
            background: linear-gradient(135deg, #4db8ff, #6d7dff);
            border-radius: 50%; display: flex; align-items: center; justify-content: center;
            font-size: 22px; color: white;
        }
        .custom-notification .notification-title { font-weight: bold; font-size: 15px; color: #4db8ff; margin-bottom: 4px; }
        .custom-notification .notification-message { font-size: 13px; color: rgba(255,255,255,0.8); }
        .custom-notification .notification-close {
            background: rgba(255,255,255,0.1); border: none; border-radius: 50%;
            width: 26px; height: 26px; cursor: pointer; color: white;
        }
        .custom-notification .notification-progress {
            position: absolute; bottom: 0; left: 0; height: 3px;
            background: linear-gradient(90deg, #4db8ff, #6d7dff);
            border-radius: 0 0 20px 20px; animation: shrink 3s linear forwards;
        }
    `;
    document.head.appendChild(style);
    document.body.appendChild(notification);
    
    notification.querySelector('.notification-close')?.addEventListener('click', () => {
        notification.style.animation = 'slideOutRight 0.2s ease';
        setTimeout(() => notification.remove(), 200);
    });
    
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.animation = 'slideOutRight 0.2s ease';
            setTimeout(() => notification.remove(), 200);
        }
    }, 3000);
}

// КРАСИВОЕ УВЕДОМЛЕНИЕ (УДАЛЕНИЕ) — СПОКОЙНОЕ
function showRemoveNotification(msg) {
    const oldNotification = document.querySelector('.remove-notification');
    if (oldNotification) oldNotification.remove();
    
    const notification = document.createElement('div');
    notification.className = 'remove-notification';
    notification.innerHTML = `
        <div class="notification-icon"><i class="fas fa-trash-alt"></i></div>
        <div class="notification-content">
            <div class="notification-title">🗑️ Билет удалён</div>
            <div class="notification-message">${msg}</div>
        </div>
        <div class="notification-progress"></div>
    `;
    
    notification.style.cssText = `
        position: fixed; bottom: 30px; right: 30px; min-width: 320px;
        background: linear-gradient(135deg, #1e1a2a, #2a1a2a);
        border-radius: 20px; padding: 16px 20px; display: flex; align-items: center; gap: 16px;
        z-index: 10000; box-shadow: 0 10px 30px rgba(0,0,0,0.4);
        border-left: 4px solid #ff8c8c; animation: slideInRight 0.3s ease;
        backdrop-filter: blur(10px);
    `;
    
    const style = document.createElement('style');
    style.textContent = `
        .remove-notification .notification-icon {
            width: 48px; height: 48px;
            background: linear-gradient(135deg, #ff8c8c, #ff6b6b);
            border-radius: 50%; display: flex; align-items: center; justify-content: center;
            font-size: 20px; color: white;
        }
        .remove-notification .notification-title { font-weight: bold; font-size: 15px; color: #ff8c8c; margin-bottom: 4px; }
        .remove-notification .notification-progress {
            position: absolute; bottom: 0; left: 0; height: 3px;
            background: linear-gradient(90deg, #ff8c8c, #ff6b6b);
            border-radius: 0 0 20px 20px; animation: shrink 3s linear forwards;
        }
    `;
    document.head.appendChild(style);
    document.body.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.animation = 'slideOutRight 0.2s ease';
            setTimeout(() => notification.remove(), 200);
        }
    }, 2500);
}

window.addToCartWithQuantity = function(flightId, flightName, price) {
    const token = localStorage.getItem('token');
    if (!token) {
        if (confirm('Для добавления билетов в корзину нужно войти. Перейти на страницу входа?')) {
            window.location.href = 'auth.html';
        }
        return;
    }
    const qtySelect = document.getElementById(`qty_${flightId}`);
    const qty = qtySelect ? parseInt(qtySelect.value) : 1;
    let cart = getCart();
    
    if (!cart.items.length) {
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + CART_EXPIRY_MINUTES);
        cart.expiresAt = expiresAt.toISOString();
    } else {
        const remaining = new Date(cart.expiresAt) - new Date();
        if (remaining < 5 * 60 * 1000) {
            const expiresAt = new Date();
            expiresAt.setMinutes(expiresAt.getMinutes() + CART_EXPIRY_MINUTES);
            cart.expiresAt = expiresAt.toISOString();
            showNotification('🕐 Время бронирования продлено!');
        }
    }
    
    const existing = cart.items.find(i => i.id === flightId);
    if (existing) existing.quantity += qty;
    else cart.items.push({ id: flightId, name: flightName, price, quantity: qty });
    
    cart.total = cart.items.reduce((s, i) => s + i.price * i.quantity, 0);
    saveCart(cart);
    updateCartCount();
    showNotification(`✅ ${qty} билет(ов) добавлено!`);
};

window.removeFromCart = function(id) {
    let cart = getCart();
    const removedItem = cart.items.find(i => i.id === id);
    cart.items = cart.items.filter(i => i.id !== id);
    if (!cart.items.length) cart.expiresAt = null;
    cart.total = cart.items.reduce((s, i) => s + i.price * i.quantity, 0);
    saveCart(cart);
    updateCartCount();
    
    // Обновляем UI корзины, если мы на странице корзины
    if (location.pathname.includes('cart.html') && typeof renderCart === 'function') {
        renderCart();
    } else if (location.pathname.includes('cart.html') && typeof displayCartItems === 'function') {
        displayCartItems();
    }
    
    if (removedItem) {
        const shortName = removedItem.name.split(':')[0];
        showRemoveNotification(`${shortName} удалён`);
    } else {
        showRemoveNotification('Рейс удалён из корзины');
    }
};

function updateCartCount() {
    const count = getCart().items.reduce((s, i) => s + i.quantity, 0);
    document.querySelectorAll('.cart-count').forEach(el => { if (el) el.textContent = count; });
    const headerCount = document.getElementById('cartCountHeader');
    if (headerCount) headerCount.textContent = count;
}

function initCartTimer() {
    const timer = document.getElementById('cartTimer');
    if (!timer) return;
    if (cartTimer) clearInterval(cartTimer);
    cartTimer = setInterval(() => {
        const cart = getCart();
        if (!cart.expiresAt || !cart.items.length) {
            timer.textContent = '--:--';
            return;
        }
        const diff = new Date(cart.expiresAt) - new Date();
        if (diff <= 0) {
            localStorage.removeItem('aviakassa_cart');
            timer.textContent = '00:00';
            showNotification('⏰ Время бронирования истекло! Корзина очищена.');
            updateCartCount();
            if (location.pathname.includes('cart.html') && typeof displayCartItems === 'function') displayCartItems();
            if (cartTimer) clearInterval(cartTimer);
            return;
        }
        const m = Math.floor(diff / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        timer.textContent = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        timer.style.color = m < 5 ? '#dc2626' : m < 10 ? '#f59e0b' : '#059669';
    }, 1000);
}

function displayCartItems() {
    const container = document.getElementById('cartContainer');
    const summary = document.getElementById('cartSummary');
    const cart = getCart();
    if (!container) return;
    if (!cart.items.length) {
        container.innerHTML = `<div style="text-align:center; padding:80px 20px;"><i class="fas fa-shopping-cart" style="font-size:80px; color:rgba(255,255,255,.3); margin-bottom:20px;"></i><h2 style="font-size:32px; margin-bottom:15px;">Корзина пуста</h2><p style="color:rgba(255,255,255,.6); margin-bottom:35px;">Добавьте авиабилеты, чтобы продолжить бронирование</p><a href="flights.html" class="main-btn">Найти билеты</a></div>`;
        if (summary) summary.innerHTML = '';
        return;
    }
    let itemsHtml = '';
    cart.items.forEach(item => {
        itemsHtml += `<div class="ticket-card"><div class="flight-top"><div><h3>${escapeHtml(item.name)}</h3></div><div class="flight-price">${(item.price * item.quantity).toLocaleString()} ₽</div></div><div class="flight-info"><div class="info-tag">${item.price.toLocaleString()} ₽ × ${item.quantity}</div></div><div class="flight-actions"><button class="secondary-btn" onclick="removeFromCart(${item.id})">Удалить</button></div></div>`;
    });
    container.innerHTML = itemsHtml;
    if (summary) summary.innerHTML = `<div class="ticket-card"><h2>Итого: ${cart.total.toLocaleString()} ₽</h2><div class="flight-actions"><a href="flights.html" class="secondary-btn">Продолжить покупки</a><a href="order.html" class="main-btn">Оформить заказ</a></div></div>`;
    initCartTimer();
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m] || m));
}

window.updateCartCount = updateCartCount;
window.displayCartItems = displayCartItems;
window.initCartTimer = initCartTimer;

document.addEventListener('DOMContentLoaded', () => {
    updateCartCount();
    if (location.pathname.includes('cart.html')) {
        displayCartItems();
        initCartTimer();
    }
});