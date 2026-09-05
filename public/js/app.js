/* ==========================================================================
   NARUTO — COMPLETE E-COMMERCE CLIENT APPLICATION LOGIC
   ========================================================================== */

class NarutoApp {
    constructor() {
        this.apiBase = '';
        this.user = null;
        this.cart = [];
        this.wishlist = [];
        this.addresses = [];
        this.products = [];
        this.categories = [];
        this.currentView = 'home';
        this.selectedProduct = null;
        this.selectedSize = 'M';
        this.selectedColor = 'Default';
        this.selectedQty = 1;
        this.appliedDiscount = 0;
        this.authPhone = '';
        this.latestPlacedOrderId = null;
        this.searchTimer = null;

        document.addEventListener('DOMContentLoaded', () => this.init());
    }

    async init() {
        console.log("🔥 Initializing NARUTO Fashion Application...");
        this.setupEventListeners();

        // Load Categories early
        await this.fetchCategories();

        // Check login state
        const savedUser = localStorage.getItem('naruto_user');
        
        setTimeout(() => {
            const splash = document.getElementById('splash-screen');
            splash.style.opacity = '0';
            splash.style.visibility = 'hidden';

            if (savedUser) {
                try {
                    this.user = JSON.parse(savedUser);
                    console.log("Logged in user:", this.user);
                    this.onLoginSuccess();
                } catch (e) {
                    this.showAuthScreen();
                }
            } else {
                this.showAuthScreen();
            }
        }, 1500);
    }

    showAuthScreen() {
        document.getElementById('auth-screen').classList.remove('hidden');
        document.getElementById('main-header').classList.add('hidden');
        document.getElementById('main-content').classList.add('hidden');
        document.getElementById('bottom-nav').classList.add('hidden');
    }

    onLoginSuccess() {
        document.getElementById('auth-screen').classList.add('hidden');
        document.getElementById('main-header').classList.remove('hidden');
        document.getElementById('main-content').classList.remove('hidden');
        document.getElementById('bottom-nav').classList.remove('hidden');

        // Update profile details
        if (this.user) {
            document.getElementById('profile-user-name').innerText = this.user.name || 'Naruto Uzumaki';
            document.getElementById('profile-user-phone').innerText = '+91 ' + (this.user.phone || '9876543210');
            document.getElementById('profile-user-email').innerText = this.user.email || 'naruto@leaf.village';
        }

        // Fetch User Data
        this.syncUserData();
        this.navigateTo('home');
    }

    async syncUserData() {
        const userId = this.user ? this.user.id : 'usr_demo';
        try {
            // Cart
            const resCart = await fetch(`/api/cart?user_id=${userId}`);
            this.cart = await resCart.json();

            // Wishlist
            const resWish = await fetch(`/api/wishlist?user_id=${userId}`);
            const wishProds = await resWish.json();
            this.wishlist = wishProds.map(p => p.id);

            // Notifications
            const resNotif = await fetch(`/api/notifications?user_id=${userId}`);
            const notifs = await resNotif.json();
            const unreadCount = notifs.filter(n => !n.is_read).length;

            this.updateHeaderBadges(unreadCount);
        } catch (e) {
            console.error("Error syncing user data:", e);
        }
    }

    updateHeaderBadges(unreadNotifs = 0) {
        // Cart badge
        const cartBadge = document.getElementById('cart-badge');
        const cartCount = this.cart.reduce((sum, item) => sum + item.quantity, 0);
        if (cartCount > 0) {
            cartBadge.innerText = cartCount;
            cartBadge.classList.remove('hidden');
        } else {
            cartBadge.classList.add('hidden');
        }

        // Wishlist badge
        const wishBadge = document.getElementById('wishlist-badge');
        if (this.wishlist.length > 0) {
            wishBadge.innerText = this.wishlist.length;
            wishBadge.classList.remove('hidden');
        } else {
            wishBadge.classList.add('hidden');
        }

        // Notification badge
        const notifBadge = document.getElementById('notif-badge');
        if (unreadNotifs > 0) {
            notifBadge.innerText = unreadNotifs;
            notifBadge.classList.remove('hidden');
        } else {
            notifBadge.classList.add('hidden');
        }
    }

    setupEventListeners() {
        // Phone Form
        document.getElementById('phone-form').addEventListener('submit', (e) => this.handlePhoneSubmit(e));
        // OTP Form
        document.getElementById('otp-form').addEventListener('submit', (e) => this.handleOTPSubmit(e));
        // Signup Form
        document.getElementById('signup-form').addEventListener('submit', (e) => this.handleSignupSubmit(e));

        // OTP inputs auto-advance
        const otpInputs = document.querySelectorAll('.otp-digit');
        otpInputs.forEach((input, index) => {
            input.addEventListener('keyup', (e) => {
                if (e.key >= '0' && e.key <= '9') {
                    if (index < otpInputs.length - 1) otpInputs[index + 1].focus();
                } else if (e.key === 'Backspace') {
                    if (index > 0) otpInputs[index - 1].focus();
                }
            });
        });
    }

    // ==================== AUTHENTICATION FLOW ====================
    async handlePhoneSubmit(e) {
        e.preventDefault();
        const phoneInput = document.getElementById('input-phone').value.trim();
        if (phoneInput.length < 10) {
            this.showToast("Please enter a valid 10-digit phone number.", "error");
            return;
        }

        this.authPhone = phoneInput;

        try {
            const res = await fetch('/api/auth/send-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone: phoneInput })
            });

            const data = await res.json();
            if (res.ok) {
                document.getElementById('phone-form').classList.add('hidden');
                document.getElementById('otp-form').classList.remove('hidden');
                document.getElementById('otp-phone-display').innerText = '+91 ' + phoneInput;
                document.getElementById('debug-otp-code').innerText = data.debug_otp || '789012';
                this.showToast("OTP sent successfully to +91 " + phoneInput, "success");
                this.startResendTimer();
            } else {
                this.showToast(data.error || "Failed to send OTP", "error");
            }
        } catch (err) {
            this.showToast("Network error. Please try again.", "error");
        }
    }

    autofillOTP() {
        const debugCode = document.getElementById('debug-otp-code').innerText || '789012';
        const otpInputs = document.querySelectorAll('.otp-digit');
        for (let i = 0; i < otpInputs.length && i < debugCode.length; i++) {
            otpInputs[i].value = debugCode[i];
        }
        this.showToast("OTP Auto-filled!", "info");
    }

    startResendTimer() {
        let count = 30;
        const timerText = document.getElementById('resend-timer-text');
        const countdownEl = document.getElementById('timer-countdown');
        const resendBtn = document.getElementById('btn-resend-otp');

        timerText.classList.remove('hidden');
        resendBtn.classList.add('hidden');

        const interval = setInterval(() => {
            count--;
            countdownEl.innerText = count;
            if (count <= 0) {
                clearInterval(interval);
                timerText.classList.add('hidden');
                resendBtn.classList.remove('hidden');
            }
        }, 1000);
    }

    async resendOTP() {
        this.handlePhoneSubmit({ preventDefault: () => {} });
    }

    async handleOTPSubmit(e) {
        e.preventDefault();
        const otpInputs = document.querySelectorAll('.otp-digit');
        let enteredOTP = '';
        otpInputs.forEach(inp => enteredOTP += inp.value);

        if (enteredOTP.length < 6) {
            this.showToast("Please enter complete 6-digit OTP", "error");
            return;
        }

        try {
            const res = await fetch('/api/auth/verify-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone: this.authPhone, otp: enteredOTP })
            });

            const data = await res.json();
            if (res.ok) {
                if (data.is_new_user) {
                    document.getElementById('otp-form').classList.add('hidden');
                    document.getElementById('signup-form').classList.remove('hidden');
                    this.showToast("OTP verified! Create your profile", "success");
                } else {
                    this.user = data.user;
                    localStorage.setItem('naruto_user', JSON.stringify(this.user));
                    this.showToast("Login successful! Welcome back", "success");
                    this.onLoginSuccess();
                }
            } else {
                this.showToast(data.error || "Invalid OTP. Try 789012", "error");
            }
        } catch (err) {
            this.showToast("Verification failed", "error");
        }
    }

    async handleSignupSubmit(e) {
        e.preventDefault();
        const name = document.getElementById('signup-name').value.trim();
        const email = document.getElementById('signup-email').value.trim();

        try {
            const res = await fetch('/api/auth/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone: this.authPhone, name, email })
            });

            const data = await res.json();
            if (res.ok) {
                this.user = data.user;
                localStorage.setItem('naruto_user', JSON.stringify(this.user));
                this.showToast("Welcome to NARUTO Fashion! 🎉", "success");
                this.onLoginSuccess();
            } else {
                this.showToast(data.error || "Signup failed", "error");
            }
        } catch (err) {
            this.showToast("Network error", "error");
        }
    }

    logout() {
        localStorage.removeItem('naruto_user');
        this.user = null;
        this.showToast("Logged out successfully", "info");
        this.showAuthScreen();
    }

    // ==================== NAVIGATION ====================
    navigateTo(viewId, params = {}) {
        this.currentView = viewId;

        // Hide all views
        document.querySelectorAll('.app-view').forEach(view => view.classList.add('hidden'));

        // Show target view
        const targetView = document.getElementById(`view-${viewId}`);
        if (targetView) targetView.classList.remove('hidden');

        // Update Bottom Nav Active State
        document.querySelectorAll('.nav-item').forEach(item => {
            if (item.getAttribute('data-view') === viewId) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });

        // View Specific Loaders
        if (viewId === 'home') this.loadHome();
        else if (viewId === 'categories') this.loadCategoriesView();
        else if (viewId === 'products') this.loadProductsView(params);
        else if (viewId === 'wishlist') this.loadWishlistView();
        else if (viewId === 'cart') this.loadCartView();
        else if (viewId === 'addresses') this.loadAddressesView();
        else if (viewId === 'checkout') this.loadCheckoutView();
        else if (viewId === 'orders') this.loadMyOrdersView();
        else if (viewId === 'notifications') this.loadNotificationsView();
        else if (viewId === 'admin') this.loadAdminView();

        // Scroll main content to top
        document.getElementById('main-content').scrollTop = 0;
    }

    // ==================== HOME VIEW ====================
    async loadHome() {
        this.renderCategoriesGrid();
        this.loadFlashSaleProducts();
        this.loadPopularProducts();
        this.loadNewArrivals();
    }

    async fetchCategories() {
        try {
            const res = await fetch('/api/categories');
            this.categories = await res.json();
        } catch (e) {
            console.error("Error fetching categories:", e);
        }
    }

    renderCategoriesGrid() {
        const container = document.getElementById('home-categories-grid');
        if (!container) return;

        container.innerHTML = this.categories.map(cat => `
            <div class="category-chip" onclick="app.filterByCategory('${cat.name}')">
                <div class="category-img-box">
                    <img src="${cat.image}" alt="${cat.name}">
                </div>
                <span class="category-name">${cat.name}</span>
            </div>
        `).join('');
    }

    async loadFlashSaleProducts() {
        const container = document.getElementById('flash-products-scroll');
        if (!container) return;

        try {
            const res = await fetch('/api/products?sort=price_low');
            const products = await res.json();
            const flashList = products.slice(0, 5);

            container.innerHTML = flashList.map(p => this.renderProductCardHTML(p, true)).join('');
        } catch (e) {}
    }

    async loadPopularProducts() {
        const container = document.getElementById('popular-products-grid');
        if (!container) return;

        try {
            const res = await fetch('/api/products?sort=popular');
            const products = await res.json();
            container.innerHTML = products.slice(0, 6).map(p => this.renderProductCardHTML(p)).join('');
        } catch (e) {}
    }

    async loadNewArrivals() {
        const container = document.getElementById('new-products-grid');
        if (!container) return;

        try {
            const res = await fetch('/api/products?sort=newest');
            const products = await res.json();
            container.innerHTML = products.slice(0, 4).map(p => this.renderProductCardHTML(p)).join('');
        } catch (e) {}
    }

    // ==================== PRODUCT CARD RENDERER ====================
    renderProductCardHTML(product, isHorizontal = false) {
        const isWish = this.wishlist.includes(product.id);
        const heartClass = isWish ? 'fa-solid fa-heart active' : 'fa-regular fa-heart';

        return `
            <div class="product-card">
                <div class="product-img-box" onclick="app.openProductDetails('${product.id}')">
                    <img src="${product.images[0]}" alt="${product.name}" loading="lazy">
                    ${product.discount ? `<span class="discount-tag">${product.discount}% OFF</span>` : ''}
                    <button class="wishlist-btn-card ${isWish ? 'active' : ''}" onclick="event.stopPropagation(); app.toggleWishlist('${product.id}')" title="Wishlist">
                        <i class="${heartClass}"></i>
                    </button>
                </div>
                <div class="product-details-card">
                    <span class="product-brand">${product.brand}</span>
                    <h4 class="product-title" onclick="app.openProductDetails('${product.id}')">${product.name}</h4>
                    <div class="product-rating">
                        <i class="fa-solid fa-star"></i>
                        <span>${product.rating}</span>
                        <span class="reviews-count">(${product.reviews_count})</span>
                    </div>
                    <div class="product-price-row">
                        <span class="price-current">₹${product.price}</span>
                        ${product.original_price ? `<span class="price-original">₹${product.original_price}</span>` : ''}
                    </div>
                    <button class="btn btn-primary btn-add-cart-card" onclick="app.addToCart('${product.id}')">
                        <i class="fa-solid fa-bag-shopping"></i> Add to Cart
                    </button>
                </div>
            </div>
        `;
    }

    // ==================== CATEGORIES VIEW ====================
    loadCategoriesView() {
        const container = document.getElementById('all-categories-list');
        if (!container) return;

        container.innerHTML = this.categories.map(cat => `
            <div class="category-card-large" onclick="app.filterByCategory('${cat.name}')">
                <img src="${cat.image}" alt="${cat.name}">
                <div class="category-card-overlay">
                    <h3>${cat.name}</h3>
                    <span>Explore Products <i class="fa-solid fa-arrow-right"></i></span>
                </div>
            </div>
        `).join('');
    }

    // ==================== PRODUCTS LIST & SEARCH ====================
    async loadProductsView(params = {}) {
        const category = params.category || 'All';
        const search = params.search || '';

        document.getElementById('filter-category').value = category;
        document.getElementById('global-search-input').value = search;

        await this.fetchAndRenderProducts();
    }

    async fetchAndRenderProducts() {
        const search = document.getElementById('global-search-input').value.trim();
        const category = document.getElementById('filter-category').value;
        const sort = document.getElementById('sort-select').value;
        const maxPrice = document.getElementById('filter-price-range').value;
        const minRating = document.getElementById('filter-rating').value;

        try {
            let url = `/api/products?sort=${sort}`;
            if (search) url += `&q=${encodeURIComponent(search)}`;
            if (category && category !== 'All') url += `&category=${encodeURIComponent(category)}`;

            const res = await fetch(url);
            let products = await res.json();

            // Client side filter by price and rating
            products = products.filter(p => p.price <= maxPrice && p.rating >= minRating);

            const grid = document.getElementById('products-list-grid');
            const noFound = document.getElementById('no-products-found');
            const countBadge = document.getElementById('products-count-badge');
            const titleEl = document.getElementById('products-found-title');

            titleEl.innerText = category !== 'All' ? `${category} Apparel` : 'Clothing Collection';
            countBadge.innerText = `${products.length} Items`;

            if (products.length === 0) {
                grid.innerHTML = '';
                noFound.classList.remove('hidden');
            } else {
                noFound.classList.add('hidden');
                grid.innerHTML = products.map(p => this.renderProductCardHTML(p)).join('');
            }
        } catch (e) {
            console.error("Error fetching products:", e);
        }
    }

    handleGlobalSearch(e) {
        const clearBtn = document.getElementById('search-clear-btn');
        if (e.target.value.length > 0) clearBtn.classList.remove('hidden');
        else clearBtn.classList.add('hidden');

        clearTimeout(this.searchTimer);
        this.searchTimer = setTimeout(() => {
            if (this.currentView !== 'products') {
                this.navigateTo('products', { search: e.target.value });
            } else {
                this.fetchAndRenderProducts();
            }
        }, 300);
    }

    clearSearch() {
        const input = document.getElementById('global-search-input');
        input.value = '';
        document.getElementById('search-clear-btn').classList.add('hidden');
        this.fetchAndRenderProducts();
    }

    filterByCategory(categoryName) {
        this.navigateTo('products', { category: categoryName });
    }

    handleSortChange(val) {
        this.fetchAndRenderProducts();
    }

    toggleFilterDrawer() {
        const drawer = document.getElementById('filter-drawer');
        drawer.classList.toggle('hidden');
    }

    applyFilters() {
        this.fetchAndRenderProducts();
    }

    resetFilters() {
        document.getElementById('filter-category').value = 'All';
        document.getElementById('filter-price-range').value = '6000';
        document.getElementById('filter-price-val').innerText = '₹6000';
        document.getElementById('filter-rating').value = '0';
        this.clearSearch();
    }

    // ==================== PRODUCT DETAILS ====================
    async openProductDetails(productId) {
        try {
            const res = await fetch(`/api/products/${productId}`);
            const prod = await res.json();

            this.selectedProduct = prod;
            this.selectedSize = prod.sizes ? prod.sizes[0] : 'M';
            this.selectedColor = prod.colors ? prod.colors[0] : 'Default';
            this.selectedQty = 1;

            const isWish = this.wishlist.includes(prod.id);

            const container = document.getElementById('product-detail-container');
            container.innerHTML = `
                <div class="detail-gallery">
                    <img id="main-detail-image" src="${prod.images[0]}" alt="${prod.name}" class="main-detail-img">
                    <div class="thumbnails-row">
                        ${prod.images.map((img, i) => `
                            <img src="${img}" class="thumb-img ${i === 0 ? 'active' : ''}" onclick="app.switchDetailThumb(this, '${img}')">
                        `).join('')}
                    </div>
                </div>

                <div class="detail-meta-box">
                    <span class="product-brand">${prod.brand}</span>
                    <h2 class="detail-title">${prod.name}</h2>

                    <div class="product-rating">
                        <i class="fa-solid fa-star"></i>
                        <strong>${prod.rating}</strong>
                        <span class="reviews-count">(${prod.reviews_count} verified reviews)</span>
                    </div>

                    <div class="product-price-row">
                        <span class="price-current" style="font-size: 1.5rem;">₹${prod.price}</span>
                        ${prod.original_price ? `<span class="price-original" style="font-size: 1.1rem;">₹${prod.original_price}</span>` : ''}
                        ${prod.discount ? `<span class="discount-tag" style="position:static;">${prod.discount}% OFF</span>` : ''}
                    </div>

                    <div class="stock-badge ${prod.stock > 0 ? 'text-green' : 'text-red'}" style="font-weight: 700; font-size: 0.88rem;">
                        <i class="fa-solid ${prod.stock > 0 ? 'fa-circle-check' : 'fa-circle-xmark'}"></i>
                        ${prod.stock > 0 ? `In Stock (${prod.stock} items left)` : 'Out of Stock'}
                    </div>

                    <!-- Size Selector -->
                    <div class="form-group mt-2">
                        <label>Select Size:</label>
                        <div class="selector-pills">
                            ${(prod.sizes || ['S', 'M', 'L', 'XL']).map((size, idx) => `
                                <button class="pill-btn ${idx === 0 ? 'active' : ''}" onclick="app.selectSize(this, '${size}')">${size}</button>
                            `).join('')}
                        </div>
                    </div>

                    <!-- Color Selector -->
                    <div class="form-group">
                        <label>Select Color:</label>
                        <div class="selector-pills">
                            ${(prod.colors || ['Black', 'Orange']).map((col, idx) => `
                                <button class="pill-btn ${idx === 0 ? 'active' : ''}" onclick="app.selectColor(this, '${col}')">${col}</button>
                            `).join('')}
                        </div>
                    </div>

                    <!-- Quantity Adjuster -->
                    <div class="form-group">
                        <label>Quantity:</label>
                        <div class="qty-adjuster">
                            <button class="qty-btn" onclick="app.adjustDetailQty(-1)">-</button>
                            <span id="detail-qty-val" class="qty-val">1</span>
                            <button class="qty-btn" onclick="app.adjustDetailQty(1)">+</button>
                        </div>
                    </div>

                    <!-- Description -->
                    <div class="description-box mt-2">
                        <h3>Description</h3>
                        <p class="text-sub" style="font-size: 0.9rem; line-height: 1.5; margin-top: 6px;">${prod.description}</p>
                    </div>

                    <!-- Actions -->
                    <div class="detail-actions mt-3" style="display: flex; gap: 10px;">
                        <button class="btn btn-outline" style="width: 50px;" onclick="app.toggleWishlist('${prod.id}')">
                            <i class="${isWish ? 'fa-solid fa-heart text-orange' : 'fa-regular fa-heart'}"></i>
                        </button>
                        <button class="btn btn-outline" style="flex: 1;" onclick="app.addToCartFromDetails(false)">
                            <i class="fa-solid fa-bag-shopping"></i> Add to Cart
                        </button>
                        <button class="btn btn-primary" style="flex: 1;" onclick="app.addToCartFromDetails(true)">
                            Buy Now
                        </button>
                    </div>
                </div>
            `;

            this.navigateTo('product-details');
        } catch (e) {
            this.showToast("Could not load product details", "error");
        }
    }

    closeProductDetails() {
        this.navigateTo('products');
    }

    switchDetailThumb(imgEl, src) {
        document.querySelectorAll('.thumb-img').forEach(t => t.classList.remove('active'));
        imgEl.classList.add('active');
        document.getElementById('main-detail-image').src = src;
    }

    selectSize(btn, size) {
        btn.parentElement.querySelectorAll('.pill-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.selectedSize = size;
    }

    selectColor(btn, color) {
        btn.parentElement.querySelectorAll('.pill-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.selectedColor = color;
    }

    adjustDetailQty(delta) {
        let newQty = this.selectedQty + delta;
        if (newQty < 1) newQty = 1;
        if (this.selectedProduct && newQty > this.selectedProduct.stock) {
            this.showToast(`Only ${this.selectedProduct.stock} items in stock`, "warning");
            return;
        }
        this.selectedQty = newQty;
        document.getElementById('detail-qty-val').innerText = newQty;
    }

    async addToCartFromDetails(directCheckout = false) {
        if (!this.selectedProduct) return;
        await this.addToCart(this.selectedProduct.id, this.selectedSize, this.selectedColor, this.selectedQty);

        if (directCheckout) {
            this.navigateTo('checkout');
        }
    }

    // ==================== WISHLIST ====================
    async toggleWishlist(productId) {
        const userId = this.user ? this.user.id : 'usr_demo';
        try {
            const res = await fetch('/api/wishlist/toggle', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: userId, product_id: productId })
            });

            const data = await res.json();
            if (data.added) {
                this.wishlist.push(productId);
                this.showToast("Added to Wishlist ❤️", "success");
            } else {
                this.wishlist = this.wishlist.filter(id => id !== productId);
                this.showToast("Removed from Wishlist", "info");
            }

            this.updateHeaderBadges();

            if (this.currentView === 'wishlist') this.loadWishlistView();
            else if (this.currentView === 'products') this.fetchAndRenderProducts();
        } catch (e) {
            this.showToast("Failed to update wishlist", "error");
        }
    }

    async loadWishlistView() {
        const container = document.getElementById('wishlist-items-container');
        const userId = this.user ? this.user.id : 'usr_demo';

        try {
            const res = await fetch(`/api/wishlist?user_id=${userId}`);
            const wishProducts = await res.json();

            if (wishProducts.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="fa-regular fa-heart empty-icon text-orange"></i>
                        <h3>Your Wishlist is Empty</h3>
                        <p>Save your favorite streetwear items here to shop later.</p>
                        <button class="btn btn-primary" onclick="app.navigateTo('home')">Explore Clothing</button>
                    </div>
                `;
            } else {
                container.innerHTML = wishProducts.map(p => `
                    <div class="wishlist-item-card">
                        <img src="${p.images[0]}" alt="${p.name}" class="cart-item-img" onclick="app.openProductDetails('${p.id}')">
                        <div class="cart-item-details">
                            <span class="product-brand">${p.brand}</span>
                            <h4 class="cart-item-title" onclick="app.openProductDetails('${p.id}')">${p.name}</h4>
                            <span class="price-current">₹${p.price}</span>
                        </div>
                        <div style="display: flex; flex-direction: column; gap: 6px;">
                            <button class="btn btn-sm btn-orange" onclick="app.addToCart('${p.id}')">
                                <i class="fa-solid fa-bag-shopping"></i> Add
                            </button>
                            <button class="btn btn-sm btn-outline text-red" onclick="app.toggleWishlist('${p.id}')">
                                Remove
                            </button>
                        </div>
                    </div>
                `).join('');
            }
        } catch (e) {}
    }

    // ==================== CART & SUMMARY ====================
    async addToCart(productId, size = 'M', color = 'Default', qty = 1) {
        const userId = this.user ? this.user.id : 'usr_demo';
        try {
            const res = await fetch('/api/cart/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: userId,
                    product_id: productId,
                    size: size,
                    color: color,
                    quantity: qty
                })
            });

            const data = await res.json();
            if (res.ok) {
                this.cart = data.cart;
                this.updateHeaderBadges();
                this.showToast("Added to Cart! 🛍️", "success");
            } else {
                this.showToast(data.error || "Could not add to cart", "error");
            }
        } catch (e) {
            this.showToast("Network error", "error");
        }
    }

    async loadCartView() {
        const container = document.getElementById('cart-items-list');
        const summaryCard = document.getElementById('cart-summary-card');
        const userId = this.user ? this.user.id : 'usr_demo';

        try {
            const res = await fetch(`/api/cart?user_id=${userId}`);
            this.cart = await res.json();
            this.updateHeaderBadges();

            if (this.cart.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="fa-solid fa-bag-shopping empty-icon text-orange"></i>
                        <h3>Your Shopping Bag is Empty</h3>
                        <p>Explore NARUTO streetwear and add items to your cart.</p>
                        <button class="btn btn-primary" onclick="app.navigateTo('home')">Start Shopping</button>
                    </div>
                `;
                summaryCard.classList.add('hidden');
            } else {
                summaryCard.classList.remove('hidden');
                container.innerHTML = this.cart.map(item => `
                    <div class="cart-item-card">
                        <img src="${item.image}" alt="${item.name}" class="cart-item-img">
                        <div class="cart-item-details">
                            <span class="product-brand">${item.brand}</span>
                            <h4 class="cart-item-title">${item.name}</h4>
                            <span class="cart-item-meta">Size: <strong>${item.size}</strong> | Color: <strong>${item.color}</strong></span>
                            <span class="price-current">₹${item.price}</span>
                        </div>
                        <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 8px;">
                            <button class="btn-link text-red" style="font-size: 0.8rem;" onclick="app.removeCartItem('${item.id}')">
                                <i class="fa-solid fa-trash"></i>
                            </button>
                            <div class="qty-adjuster">
                                <button class="qty-btn" onclick="app.updateCartQty('${item.id}', ${item.quantity - 1})">-</button>
                                <span class="qty-val">${item.quantity}</span>
                                <button class="qty-btn" onclick="app.updateCartQty('${item.id}', ${item.quantity + 1})">+</button>
                            </div>
                        </div>
                    </div>
                `).join('');

                this.calculateCartSummary();
            }
        } catch (e) {}
    }

    async updateCartQty(itemId, newQty) {
        const userId = this.user ? this.user.id : 'usr_demo';
        try {
            const res = await fetch('/api/cart/update', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: userId, item_id: itemId, quantity: newQty })
            });

            const data = await res.json();
            this.cart = data.cart;
            this.loadCartView();
        } catch (e) {}
    }

    async removeCartItem(itemId) {
        const userId = this.user ? this.user.id : 'usr_demo';
        try {
            const res = await fetch(`/api/cart/remove?user_id=${userId}&item_id=${itemId}`, {
                method: 'DELETE'
            });

            const data = await res.json();
            this.cart = data.cart;
            this.showToast("Item removed from cart", "info");
            this.loadCartView();
        } catch (e) {}
    }

    applyCoupon() {
        const code = document.getElementById('coupon-code-input').value.trim().toUpperCase();
        if (code === 'NARUTO10') {
            const subtotal = this.cart.reduce((sum, i) => sum + (i.price * i.quantity), 0);
            this.appliedDiscount = Math.round(subtotal * 0.10);
            this.showToast("Coupon NARUTO10 applied! 10% OFF", "success");
            this.calculateCartSummary();
        } else {
            this.showToast("Invalid coupon code. Try 'NARUTO10'", "error");
        }
    }

    calculateCartSummary() {
        const subtotal = this.cart.reduce((sum, i) => sum + (i.price * i.quantity), 0);
        const deliveryFee = subtotal > 1499 ? 0 : 99;
        const tax = Math.round(subtotal * 0.05); // 5% GST
        const total = subtotal - this.appliedDiscount + deliveryFee + tax;

        document.getElementById('summary-subtotal').innerText = `₹${subtotal}`;
        document.getElementById('summary-discount').innerText = `-₹${this.appliedDiscount}`;
        document.getElementById('summary-delivery').innerText = deliveryFee === 0 ? 'FREE' : `₹${deliveryFee}`;
        document.getElementById('summary-tax').innerText = `₹${tax}`;
        document.getElementById('summary-total').innerText = `₹${total}`;
    }

    // ==================== ADDRESS MANAGEMENT ====================
    async loadAddressesView() {
        const container = document.getElementById('address-cards-list');
        const userId = this.user ? this.user.id : 'usr_demo';

        try {
            const res = await fetch(`/api/addresses?user_id=${userId}`);
            this.addresses = await res.json();

            if (this.addresses.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="fa-solid fa-location-dot empty-icon text-orange"></i>
                        <h3>No Delivery Address Saved</h3>
                        <p>Please add a shipping address before proceeding to checkout.</p>
                    </div>
                `;
            } else {
                container.innerHTML = this.addresses.map(a => `
                    <div class="address-card ${a.is_default ? 'default-address' : ''}" style="background: var(--card-dark); border: 1px solid var(--border-dark); padding: 14px; border-radius: var(--radius-md); display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <strong style="font-size: 1rem;">${a.name}</strong> ${a.is_default ? '<span class="brand-badge" style="padding: 2px 8px; font-size: 0.7rem;">Default</span>' : ''}<br>
                            <span class="text-sub" style="font-size: 0.85rem;">${a.house}, ${a.street}, ${a.city}, ${a.state} - ${a.pincode}</span><br>
                            <span class="text-muted" style="font-size: 0.8rem;">Phone: +91 ${a.phone}</span>
                        </div>
                        <button class="btn-link text-red" onclick="app.deleteAddress('${a.id}')"><i class="fa-solid fa-trash"></i></button>
                    </div>
                `).join('');
            }
        } catch (e) {}
    }

    openAddAddressModal() {
        document.getElementById('address-modal').classList.remove('hidden');
    }

    closeAddressModal() {
        document.getElementById('address-modal').classList.add('hidden');
    }

    async handleSaveAddress(e) {
        e.preventDefault();
        const userId = this.user ? this.user.id : 'usr_demo';

        const name = document.getElementById('addr-name').value.trim();
        const phone = document.getElementById('addr-phone').value.trim();
        const house = document.getElementById('addr-house').value.trim();
        const street = document.getElementById('addr-street').value.trim();
        const city = document.getElementById('addr-city').value.trim();
        const pincode = document.getElementById('addr-pincode').value.trim();
        const state = document.getElementById('addr-state').value.trim();

        try {
            const res = await fetch('/api/addresses/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: userId,
                    name, phone, house, street, city, pincode, state
                })
            });

            const data = await res.json();
            this.showToast("Address saved successfully", "success");
            this.closeAddressModal();
            this.loadAddressesView();
        } catch (err) {}
    }

    async deleteAddress(addrId) {
        const userId = this.user ? this.user.id : 'usr_demo';
        try {
            await fetch(`/api/addresses/delete?user_id=${userId}&addr_id=${addrId}`, { method: 'DELETE' });
            this.showToast("Address removed", "info");
            this.loadAddressesView();
        } catch (e) {}
    }

    // ==================== CHECKOUT & PAYMENT ====================
    async loadCheckoutView() {
        const userId = this.user ? this.user.id : 'usr_demo';

        // Load Address
        const resAddr = await fetch(`/api/addresses?user_id=${userId}`);
        this.addresses = await resAddr.json();
        const addrContainer = document.getElementById('checkout-selected-address');

        if (this.addresses.length === 0) {
            addrContainer.innerHTML = `
                <div class="text-orange" style="font-size: 0.9rem;">
                    No address selected. <button class="btn-link" onclick="app.openAddAddressModal()">+ Add Address</button>
                </div>
            `;
        } else {
            const defAddr = this.addresses.find(a => a.is_default) || this.addresses[0];
            addrContainer.innerHTML = `
                <strong>${defAddr.name} (+91 ${defAddr.phone})</strong><br>
                <span class="text-sub" style="font-size: 0.85rem;">${defAddr.house}, ${defAddr.street}, ${defAddr.city}, ${defAddr.state} - ${defAddr.pincode}</span>
            `;
            this.selectedCheckoutAddress = defAddr;
        }

        // Render Checkout Items preview
        const itemsContainer = document.getElementById('checkout-order-items');
        itemsContainer.innerHTML = this.cart.map(item => `
            <div style="display: flex; justify-content: space-between; font-size: 0.88rem; margin-bottom: 6px;">
                <span>${item.quantity}x ${item.name} (${item.size})</span>
                <strong>₹${item.price * item.quantity}</strong>
            </div>
        `).join('');

        this.calculateCheckoutTotal();
    }

    togglePaymentNotice() {
        this.calculateCheckoutTotal();
    }

    calculateCheckoutTotal() {
        const subtotal = this.cart.reduce((sum, i) => sum + (i.price * i.quantity), 0);
        let deliveryFee = subtotal > 1499 ? 0 : 99;
        
        const isCOD = document.querySelector('input[name="payment_method"]:checked').value === 'Cash on Delivery';
        if (isCOD) deliveryFee += 50;

        const tax = Math.round(subtotal * 0.05);
        const total = subtotal - this.appliedDiscount + deliveryFee + tax;

        document.getElementById('checkout-final-amount').innerText = `₹${total}`;
        return total;
    }

    async placeOrder() {
        if (this.cart.length === 0) {
            this.showToast("Your cart is empty.", "error");
            return;
        }
        if (!this.selectedCheckoutAddress) {
            this.showToast("Please add and select a delivery address first.", "error");
            this.openAddAddressModal();
            return;
        }

        const paymentMethod = document.querySelector('input[name="payment_method"]:checked').value;

        if (paymentMethod.includes('Online')) {
            // Trigger Payment Modal Simulation
            const modal = document.getElementById('payment-gateway-modal');
            modal.classList.remove('hidden');
            document.getElementById('payment-step-select').classList.remove('hidden');
            document.getElementById('payment-step-processing').classList.add('hidden');
            document.getElementById('pay-modal-amount').innerText = document.getElementById('checkout-final-amount').innerText;
        } else {
            // COD Order
            await this.processOrderAPI(paymentMethod);
        }
    }

    async simulatePaymentSuccess(upiApp) {
        document.getElementById('payment-step-select').classList.add('hidden');
        document.getElementById('payment-step-processing').classList.remove('hidden');

        setTimeout(async () => {
            document.getElementById('payment-gateway-modal').classList.add('hidden');
            await this.processOrderAPI(`Online UPI (${upiApp})`);
        }, 1200);
    }

    async processOrderAPI(paymentMethod) {
        const userId = this.user ? this.user.id : 'usr_demo';

        try {
            const res = await fetch('/api/orders/place', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: userId,
                    payment_method: paymentMethod,
                    address: this.selectedCheckoutAddress,
                    discount: this.appliedDiscount
                })
            });

            const data = await res.json();
            if (res.ok) {
                this.latestPlacedOrderId = data.order.id;
                this.cart = [];
                this.updateHeaderBadges();
                this.renderOrderSuccessView(data.order);
                this.navigateTo('order-success');
                confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
            } else {
                this.showToast(data.error || "Order placement failed", "error");
            }
        } catch (e) {
            this.showToast("Network error placing order", "error");
        }
    }

    renderOrderSuccessView(order) {
        const container = document.getElementById('success-order-details');
        container.innerHTML = `
            <div style="background: var(--bg-dark); padding: 14px; border-radius: var(--radius-md); border: 1px solid var(--border-dark); text-align: left; font-size: 0.88rem; display: flex; flex-direction: column; gap: 8px;">
                <div>Order ID: <strong class="text-orange">${order.id}</strong></div>
                <div>Order Date: <span>${new Date(order.order_date).toLocaleString()}</span></div>
                <div>Total Paid: <strong>₹${order.total_amount}</strong> (${order.payment_method})</div>
                <div>Estimated Delivery: <strong class="text-green">${order.estimated_delivery}</strong></div>
                <div>Shipping to: <span>${order.address.house}, ${order.address.city}</span></div>
            </div>
        `;
    }

    // ==================== MY ORDERS & TRACKING ====================
    async loadMyOrdersView() {
        const container = document.getElementById('my-orders-list');
        const userId = this.user ? this.user.id : 'usr_demo';

        try {
            const res = await fetch(`/api/orders?user_id=${userId}`);
            const orders = await res.json();

            if (orders.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="fa-solid fa-box empty-icon text-orange"></i>
                        <h3>No Orders Yet</h3>
                        <p>Your placed orders will appear here for status tracking.</p>
                    </div>
                `;
            } else {
                container.innerHTML = orders.map(o => `
                    <div class="order-card" style="background: var(--card-dark); border: 1px solid var(--border-dark); border-radius: var(--radius-lg); padding: 16px; display: flex; flex-direction: column; gap: 10px;">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <strong style="font-size: 0.95rem;">${o.id}</strong><br>
                                <small class="text-muted">${new Date(o.order_date).toLocaleDateString()}</small>
                            </div>
                            <span class="brand-badge" style="padding: 4px 10px; font-size: 0.75rem;">${o.order_status}</span>
                        </div>
                        
                        <div style="display: flex; gap: 10px; align-items: center;">
                            <img src="${o.items[0].image}" style="width: 50px; height: 50px; border-radius: 8px; object-fit: cover;">
                            <div style="flex: 1;">
                                <div style="font-size: 0.88rem; font-weight: 600;">${o.items[0].name} ${o.items.length > 1 ? `+${o.items.length - 1} more` : ''}</div>
                                <span class="text-orange" style="font-weight: 700;">₹${o.total_amount}</span> (${o.payment_status})
                            </div>
                        </div>

                        <button class="btn btn-outline btn-sm btn-block mt-2" onclick="app.openOrderTracking('${o.id}')">
                            <i class="fa-solid fa-truck-fast"></i> Track Order Status
                        </button>
                    </div>
                `).join('');
            }
        } catch (e) {}
    }

    async openOrderTracking(orderId) {
        const userId = this.user ? this.user.id : 'usr_demo';
        try {
            const res = await fetch(`/api/orders/${orderId}`);
            const order = await res.json();

            const container = document.getElementById('order-tracking-card');

            const statuses = ['Placed', 'Confirmed', 'Packed', 'Shipped', 'Out for Delivery', 'Delivered'];
            const currentIdx = statuses.indexOf(order.order_status);

            container.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-dark); padding-bottom: 12px;">
                    <div>
                        <h3>Order ${order.id}</h3>
                        <small class="text-muted">Courier: ${order.courier_name} (${order.tracking_number})</small>
                    </div>
                    <span class="brand-badge">${order.order_status}</span>
                </div>

                <div class="tracking-timeline">
                    ${statuses.map((st, idx) => {
                        const isCompleted = idx <= currentIdx;
                        const isActive = idx === currentIdx;
                        const historyItem = order.status_history.find(h => h.status === st);

                        return `
                            <div class="timeline-step ${isCompleted ? 'completed' : ''} ${isActive ? 'active' : ''}">
                                <div class="timeline-icon">
                                    <i class="fa-solid ${isCompleted ? 'fa-check' : 'fa-circle'}"></i>
                                </div>
                                <div class="timeline-title">${st}</div>
                                ${historyItem ? `<div class="timeline-time">${new Date(historyItem.time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>` : ''}
                                ${historyItem && historyItem.note ? `<div class="timeline-note">${historyItem.note}</div>` : ''}
                            </div>
                        `;
                    }).join('')}
                </div>

                <div style="background: var(--bg-dark); padding: 12px; border-radius: var(--radius-md); font-size: 0.85rem;">
                    <strong>Expected Delivery:</strong> <span class="text-green">${order.estimated_delivery}</span><br>
                    <span class="text-muted">Delivery Address: ${order.address.house}, ${order.address.city}</span>
                </div>
            `;

            this.navigateTo('tracking');
        } catch (e) {}
    }

    // ==================== NOTIFICATIONS ====================
    async loadNotificationsView() {
        const container = document.getElementById('notifications-list');
        const userId = this.user ? this.user.id : 'usr_demo';

        try {
            const res = await fetch(`/api/notifications?user_id=${userId}`);
            const notifs = await res.json();

            this.updateHeaderBadges(0); // clear unread count

            if (notifs.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="fa-regular fa-bell empty-icon text-orange"></i>
                        <h3>No Notifications</h3>
                        <p>Order status updates and promos will show up here.</p>
                    </div>
                `;
            } else {
                container.innerHTML = notifs.map(n => `
                    <div class="notification-card" style="background: var(--card-dark); border: 1px solid var(--border-dark); padding: 14px; border-radius: var(--radius-md); display: flex; gap: 12px;">
                        <i class="fa-solid fa-bell text-orange" style="font-size: 1.2rem; margin-top: 2px;"></i>
                        <div style="flex: 1;">
                            <strong style="font-size: 0.95rem;">${n.title}</strong>
                            <p class="text-sub" style="font-size: 0.85rem; margin-top: 4px;">${n.message}</p>
                            <small class="text-muted">${new Date(n.time).toLocaleString()}</small>
                        </div>
                    </div>
                `).join('');
            }
        } catch (e) {}
    }

    // ==================== ADMIN PANEL ====================
    async loadAdminView() {
        // Fetch stats
        const resStats = await fetch('/api/admin/stats');
        const stats = await resStats.json();

        document.getElementById('stat-revenue').innerText = `₹${stats.revenue}`;
        document.getElementById('stat-orders').innerText = stats.orders_count;
        document.getElementById('stat-products').innerText = stats.products_count;
        document.getElementById('stat-users').innerText = stats.users_count;

        this.loadAdminOrders();
    }

    switchAdminTab(tabName) {
        document.querySelectorAll('.admin-tab').forEach(b => b.classList.remove('active'));
        document.getElementById(`tab-btn-${tabName}`).classList.add('active');

        if (tabName === 'orders') {
            document.getElementById('admin-tab-orders').classList.remove('hidden');
            document.getElementById('admin-tab-products').classList.add('hidden');
            this.loadAdminOrders();
        } else {
            document.getElementById('admin-tab-orders').classList.add('hidden');
            document.getElementById('admin-tab-products').classList.remove('hidden');
            this.loadAdminProducts();
        }
    }

    async loadAdminOrders() {
        const container = document.getElementById('admin-orders-list');
        const res = await fetch('/api/admin/orders');
        const orders = await res.json();

        container.innerHTML = orders.map(o => `
            <div style="background: var(--card-dark); border: 1px solid var(--border-dark); padding: 14px; border-radius: var(--radius-md); display: flex; flex-direction: column; gap: 10px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <strong>Order #${o.id}</strong> (${new Date(o.order_date).toLocaleDateString()})<br>
                        <span class="text-muted" style="font-size: 0.8rem;">Customer ID: ${o.user_id}</span>
                    </div>
                    <strong class="text-orange">₹${o.total_amount}</strong>
                </div>

                <div style="font-size: 0.85rem;">Items: ${o.items.map(i => i.name).join(', ')}</div>

                <div style="display: flex; align-items: center; gap: 10px; background: var(--bg-dark); padding: 10px; border-radius: 8px;">
                    <label style="font-size: 0.85rem; font-weight: 700;">Update Status:</label>
                    <select style="flex: 1; padding: 6px; background: var(--card-dark); color: #FFF; border: 1px solid var(--border-dark); border-radius: 6px;" onchange="app.updateOrderStatus('${o.id}', this.value)">
                        <option value="Placed" ${o.order_status === 'Placed' ? 'selected' : ''}>Placed</option>
                        <option value="Confirmed" ${o.order_status === 'Confirmed' ? 'selected' : ''}>Confirmed</option>
                        <option value="Packed" ${o.order_status === 'Packed' ? 'selected' : ''}>Packed</option>
                        <option value="Shipped" ${o.order_status === 'Shipped' ? 'selected' : ''}>Shipped</option>
                        <option value="Out for Delivery" ${o.order_status === 'Out for Delivery' ? 'selected' : ''}>Out for Delivery</option>
                        <option value="Delivered" ${o.order_status === 'Delivered' ? 'selected' : ''}>Delivered</option>
                    </select>
                </div>
            </div>
        `).join('');
    }

    async updateOrderStatus(orderId, newStatus) {
        try {
            const res = await fetch('/api/admin/orders/update-status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    order_id: orderId,
                    status: newStatus,
                    note: `Admin updated order status to ${newStatus}`
                })
            });

            if (res.ok) {
                this.showToast(`Order #${orderId} updated to ${newStatus}`, "success");
                this.loadAdminOrders();
            }
        } catch (e) {}
    }

    async loadAdminProducts() {
        const container = document.getElementById('admin-products-list');
        const res = await fetch('/api/products');
        const prods = await res.json();

        container.innerHTML = prods.map(p => `
            <div style="background: var(--card-dark); border: 1px solid var(--border-dark); padding: 12px; border-radius: var(--radius-md); display: flex; gap: 12px; align-items: center;">
                <img src="${p.images[0]}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 8px;">
                <div style="flex: 1;">
                    <strong style="font-size: 0.9rem;">${p.name}</strong><br>
                    <span class="text-orange">₹${p.price}</span> | Stock: ${p.stock}
                </div>
            </div>
        `).join('');
    }

    openAddProductModal() {
        document.getElementById('admin-product-modal').classList.remove('hidden');
    }

    closeAddProductModal() {
        document.getElementById('admin-product-modal').classList.add('hidden');
    }

    async handleAdminSaveProduct(e) {
        e.preventDefault();
        const name = document.getElementById('adm-prod-name').value;
        const category = document.getElementById('adm-prod-cat').value;
        const brand = document.getElementById('adm-prod-brand').value;
        const price = document.getElementById('adm-prod-price').value;
        const origPrice = document.getElementById('adm-prod-orig-price').value;
        const stock = document.getElementById('adm-prod-stock').value;
        const img = document.getElementById('adm-prod-img').value;
        const desc = document.getElementById('adm-prod-desc').value;

        const discount = Math.round(((origPrice - price) / origPrice) * 100);

        try {
            const res = await fetch('/api/admin/products/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name, category, brand, price, original_price: origPrice, discount, stock,
                    images: [img], description: desc
                })
            });

            if (res.ok) {
                this.showToast("New clothing item added!", "success");
                this.closeAddProductModal();
                this.loadAdminProducts();
            }
        } catch (e) {}
    }

    // ==================== TOAST NOTIFICATIONS ====================
    showToast(message, type = "info") {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast-item toast-${type}`;
        
        let icon = 'fa-circle-info';
        if (type === 'success') icon = 'fa-circle-check text-green';
        else if (type === 'error') icon = 'fa-circle-exclamation text-red';
        else if (type === 'warning') icon = 'fa-triangle-exclamation text-orange';

        toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${message}</span>`;
        container.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
}

// Global App Instance
const app = new NarutoApp();
