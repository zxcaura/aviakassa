let currentUser = null;

async function checkAuth() {
    const token = localStorage.getItem('token');
    const loginContainer = document.getElementById('loginContainer');
    
    if (!loginContainer) return;
    
    if (!token) {
        // Неавторизованный — без корзины
        loginContainer.innerHTML = `
            <a href="auth.html" class="secondary-btn">Войти</a>
            <a href="auth.html?tab=register" class="main-btn">Регистрация</a>
        `;
        return;
    }
    
    try {
        const res = await fetch('/api/auth/profile', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const user = await res.json();
        
        if (user && !user.error) {
            currentUser = user;
            // Авторизованный — с корзиной
            loginContainer.innerHTML = `
                <a href="cart.html" class="cart-icon" style="position: relative; display: flex; align-items: center; gap: 8px; text-decoration: none; color: white; background: rgba(255,255,255,.08); padding: 8px 16px; border-radius: 40px; transition: all 0.3s;">
                    <i class="fas fa-shopping-cart" style="font-size: 18px;"></i>
                    <span style="font-weight: 500;">Корзина</span>
                    <span class="cart-count" id="cartCountHeader" style="background: #ef4444; color: white; border-radius: 50%; width: 20px; height: 20px; font-size: 11px; display: inline-flex; align-items: center; justify-content: center;">0</span>
                </a>
                <div class="user-menu" style="position: relative; display: inline-block;">
                    <div class="user-name" style="display: flex; align-items: center; gap: 8px; background: rgba(255,255,255,.08); padding: 8px 18px; border-radius: 999px; cursor: pointer;">
                        <i class="fas fa-user-circle"></i> 
                        <span>${escapeHtml(user.FullName)}</span> 
                        <i class="fas fa-chevron-down"></i>
                    </div>
                    <div class="dropdown-menu" style="position: absolute; top: 100%; right: 0; background: #091426; border-radius: 16px; min-width: 200px; display: none; z-index: 1000; margin-top: 8px; border: 1px solid rgba(255,255,255,.08); overflow: hidden;">
                        <a href="profile.html" style="display: flex; align-items: center; gap: 10px; padding: 12px 18px; text-decoration: none; color: rgba(255,255,255,.8); border-bottom: 1px solid rgba(255,255,255,.05);">
                            <i class="fas fa-id-card"></i> Мой профиль
                        </a>
                        <a href="orders.html" style="display: flex; align-items: center; gap: 10px; padding: 12px 18px; text-decoration: none; color: rgba(255,255,255,.8); border-bottom: 1px solid rgba(255,255,255,.05);">
                            <i class="fas fa-history"></i> Мои заказы
                        </a>
                        <a href="#" id="logoutBtn" style="display: flex; align-items: center; gap: 10px; padding: 12px 18px; text-decoration: none; color: #ff6b6b;">
                            <i class="fas fa-sign-out-alt"></i> Выйти
                        </a>
                    </div>
                </div>
            `;
            
            // Обновляем счётчик корзины
            updateCartCountHeader();
            
            // Клик по имени — показать/скрыть меню
            const userNameDiv = document.querySelector('.user-name');
            const dropdownMenu = document.querySelector('.dropdown-menu');
            
            if (userNameDiv && dropdownMenu) {
                userNameDiv.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const isVisible = dropdownMenu.style.display === 'block';
                    dropdownMenu.style.display = isVisible ? 'none' : 'block';
                });
                
                document.addEventListener('click', (e) => {
                    if (!userNameDiv.contains(e.target) && !dropdownMenu.contains(e.target)) {
                        dropdownMenu.style.display = 'none';
                    }
                });
            }
            
            const logoutBtn = document.getElementById('logoutBtn');
            if (logoutBtn) {
                logoutBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    logout();
                });
            }
        } else {
            logout();
        }
    } catch(e) {
        logout();
    }
}

function updateCartCountHeader() {
    const cartJson = localStorage.getItem('aviakassa_cart');
    const cart = cartJson ? JSON.parse(cartJson) : { items: [] };
    const count = cart.items.reduce((total, item) => total + item.quantity, 0);
    const cartCountSpan = document.getElementById('cartCountHeader');
    if (cartCountSpan) {
        cartCountSpan.textContent = count;
    }
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    currentUser = null;
    const loginContainer = document.getElementById('loginContainer');
    if (loginContainer) {
        loginContainer.innerHTML = `<a href="auth.html" class="secondary-btn">Войти</a><a href="auth.html?tab=register" class="main-btn">Регистрация</a>`;
    }
    if (window.location.pathname.includes('profile.html') || window.location.pathname.includes('orders.html')) {
        window.location.href = 'index.html';
    }
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    updateCartCountHeader();
    
    window.addEventListener('storage', (e) => {
        if (e.key === 'aviakassa_cart') {
            updateCartCountHeader();
        }
    });
});

window.checkAuth = checkAuth;
window.logout = logout;
window.updateCartCountHeader = updateCartCountHeader;