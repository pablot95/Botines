const Cart = {
  KEY: 'botinesfv_cart',

  getItems() {
    try {
      return JSON.parse(localStorage.getItem(this.KEY)) || [];
    } catch (e) {
      return [];
    }
  },

  saveItems(items) {
    localStorage.setItem(this.KEY, JSON.stringify(items));
    this.updateUI();
  },

  addItem(product) {
    let items = this.getItems();
    let existing = items.find(i => i.id === product.id && i.size === product.size);
    if (existing) {
      existing.qty += 1;
    } else {
      items.push({
        id: product.id,
        name: product.name,
        category: product.category,
        price: product.price,
        size: product.size,
        image: product.image,
        productCode: product.productCode || null,
        qty: 1
      });
    }
    this.saveItems(items);
    this.showToast('Producto agregado al carrito');
  },

  removeItem(id, size) {
    let items = this.getItems().filter(i => !(i.id === id && i.size === size));
    this.saveItems(items);
  },

  updateQty(id, size, delta) {
    let items = this.getItems();
    let item = items.find(i => i.id === id && i.size === size);
    if (item) {
      item.qty += delta;
      if (item.qty < 1) item.qty = 1;
    }
    this.saveItems(items);
  },

  getTotal() {
    return this.getItems().reduce((sum, i) => sum + i.price * i.qty, 0);
  },

  getCount() {
    return this.getItems().reduce((sum, i) => sum + i.qty, 0);
  },

  clear() {
    localStorage.removeItem(this.KEY);
    this.updateUI();
  },

  formatPrice(n) {
    return '$' + n.toLocaleString('es-AR');
  },

  updateUI() {
    let count = this.getCount();
    let countEls = document.querySelectorAll('#cartCount');
    countEls.forEach(el => {
      el.textContent = count;
      el.classList.toggle('show', count > 0);
    });

    let itemsContainer = document.getElementById('cartItems');
    let emptyEl = document.getElementById('cartEmpty');
    let footerEl = document.getElementById('cartFooter');
    let totalEl = document.getElementById('cartTotal');

    if (!itemsContainer) return;

    let items = this.getItems();

    if (items.length === 0) {
      if (emptyEl) emptyEl.style.display = 'block';
      if (footerEl) footerEl.style.display = 'none';
      let existing = itemsContainer.querySelectorAll('.cart-item');
      existing.forEach(el => el.remove());
      return;
    }

    if (emptyEl) emptyEl.style.display = 'none';
    if (footerEl) footerEl.style.display = 'block';
    if (totalEl) totalEl.textContent = this.formatPrice(this.getTotal());

    let existing = itemsContainer.querySelectorAll('.cart-item');
    existing.forEach(el => el.remove());

    items.forEach(item => {
      let div = document.createElement('div');
      div.className = 'cart-item';
      div.innerHTML = `
        <img src="${item.image}" alt="${item.name}" width="70" height="70">
        <div class="cart-item-info">
          <div class="cart-item-name">${item.name}</div>
          <div class="cart-item-detail">${item.category ? ({'f11':'Fútbol 11','f5':'Fútbol 5','futsal':'Futsal','mixtos':'Mixtos','kids':'Kids'}[item.category] || item.category) : ''} &middot; Talle: ${item.size}</div>
          <div class="cart-item-price">${this.formatPrice(item.price)}</div>
          <div class="cart-item-qty">
            <button type="button" data-action="minus" data-id="${item.id}" data-size="${item.size}">−</button>
            <span>${item.qty}</span>
            <button type="button" data-action="plus" data-id="${item.id}" data-size="${item.size}">+</button>
          </div>
        </div>
        <button class="cart-item-remove" type="button" data-action="remove" data-id="${item.id}" data-size="${item.size}">✕</button>
      `;
      itemsContainer.appendChild(div);
    });

    itemsContainer.addEventListener('click', (e) => {
      let btn = e.target.closest('[data-action]');
      if (!btn) return;
      let action = btn.dataset.action;
      let id = btn.dataset.id;
      let size = btn.dataset.size;
      if (action === 'minus') this.updateQty(id, size, -1);
      if (action === 'plus') this.updateQty(id, size, 1);
      if (action === 'remove') this.removeItem(id, size);
    });
  },

  showToast(msg) {
    let toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2500);
  },

  openSidebar() {
    let sidebar = document.getElementById('cartSidebar');
    let backdrop = document.getElementById('cartBackdrop');
    if (sidebar) sidebar.classList.add('open');
    if (backdrop) backdrop.classList.add('open');
    document.body.style.overflow = 'hidden';
  },

  closeSidebar() {
    let sidebar = document.getElementById('cartSidebar');
    let backdrop = document.getElementById('cartBackdrop');
    if (sidebar) sidebar.classList.remove('open');
    if (backdrop) backdrop.classList.remove('open');
    document.body.style.overflow = '';
  },

  init() {
    this.updateUI();

    let cartBtn = document.getElementById('cartBtn');
    let cartClose = document.getElementById('cartClose');
    let cartBackdrop = document.getElementById('cartBackdrop');

    if (cartBtn) cartBtn.addEventListener('click', () => this.openSidebar());
    if (cartClose) cartClose.addEventListener('click', () => this.closeSidebar());
    if (cartBackdrop) cartBackdrop.addEventListener('click', () => this.closeSidebar());
  }
};

document.addEventListener('DOMContentLoaded', () => Cart.init());
