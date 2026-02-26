document.addEventListener('DOMContentLoaded', () => {

  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale').forEach(el => {
    revealObserver.observe(el);
  });

  const navProducts = document.getElementById('navProducts');
  if (navProducts) {
    navProducts.querySelector('button').addEventListener('click', (e) => {
      e.stopPropagation();
      navProducts.classList.toggle('active');
    });
    document.addEventListener('click', (e) => {
      if (!navProducts.contains(e.target)) {
        navProducts.classList.remove('active');
      }
    });
  }

  const hamburgerBtn = document.getElementById('hamburgerBtn');
  const mobileMenu = document.getElementById('mobileMenu');
  const mobileBackdrop = document.getElementById('mobileBackdrop');

  if (hamburgerBtn && mobileMenu) {
    hamburgerBtn.addEventListener('click', () => {
      mobileMenu.classList.toggle('open');
      if (mobileBackdrop) mobileBackdrop.classList.toggle('open');
    });
    if (mobileBackdrop) {
      mobileBackdrop.addEventListener('click', () => {
        mobileMenu.classList.remove('open');
        mobileBackdrop.classList.remove('open');
      });
    }
  }

  function doSearch(query) {
    if (query.trim()) {
      window.location.href = 'category.html?buscar=' + encodeURIComponent(query.trim());
    }
  }

  let searchInput = document.getElementById('searchInput');
  let searchBtn = document.getElementById('searchBtn');
  if (searchInput && searchBtn) {
    searchBtn.addEventListener('click', () => doSearch(searchInput.value));
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') doSearch(searchInput.value);
    });
  }

  let mobileSearchInput = document.getElementById('mobileSearchInput');
  let mobileSearchBtn = document.getElementById('mobileSearchBtn');
  if (mobileSearchInput && mobileSearchBtn) {
    mobileSearchBtn.addEventListener('click', () => doSearch(mobileSearchInput.value));
    mobileSearchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') doSearch(mobileSearchInput.value);
    });
  }

  const heroTrack = document.getElementById('heroTrack');
  const heroDots = document.querySelectorAll('.hero-dot');
  const heroPrev = document.getElementById('heroPrev');
  const heroNext = document.getElementById('heroNext');
  let heroSlide = 0;
  let heroInterval;

  function setHeroSlide(idx) {
    heroSlide = idx;
    if (heroTrack) heroTrack.style.transform = `translateX(-${idx * 50}%)`;
    heroDots.forEach((d, i) => d.classList.toggle('active', i === idx));
  }

  function nextHero() {
    setHeroSlide(heroSlide === 0 ? 1 : 0);
  }

  function startHeroAuto() {
    heroInterval = setInterval(nextHero, 5000);
  }

  function resetHeroAuto() {
    clearInterval(heroInterval);
    startHeroAuto();
  }

  if (heroTrack) {
    heroDots.forEach(d => {
      d.addEventListener('click', () => {
        setHeroSlide(parseInt(d.dataset.slide));
        resetHeroAuto();
      });
    });
    if (heroPrev) heroPrev.addEventListener('click', () => { setHeroSlide(heroSlide === 0 ? 1 : 0); resetHeroAuto(); });
    if (heroNext) heroNext.addEventListener('click', () => { nextHero(); resetHeroAuto(); });
    startHeroAuto();
  }

  function formatPrice(n) {
    return '$' + Number(n).toLocaleString('es-AR');
  }

  function createProductCard(product) {
    let card = document.createElement('a');
    card.href = 'product.html?id=' + product.id;
    card.className = 'product-card';

    let imgSrc = (product.images && product.images.length > 0) ? product.images[0] : 'images/logo.jpeg';
    let sizesText = '';
    if (product.sizes && product.sizes.length > 0) {
      let argSizes = product.sizes.map(s => s.arg || s).join(', ');
      sizesText = `Talles: ${argSizes}`;
    }

    let typeText = product.category === 'f11' ? 'Fútbol 11' : product.category === 'f5' ? 'Fútbol 5' : product.category === 'futsal' ? 'Futsal' : product.category === 'adultos' ? 'Adultos' : product.category === 'kids' ? 'Kids' : '';

    let codeText = product.productCode ? `<span class="product-card-code">#${product.productCode}</span>` : '';

    card.innerHTML = `
      <div class="product-card-img">
        <img src="${imgSrc}" alt="${product.name}" width="300" height="300" loading="lazy">
        ${product.featured ? '<span class="product-card-badge">Destacado</span>' : ''}
        ${(product.stock || 0) <= 0 ? '<span class="product-card-badge badge-no-stock">Sin stock</span>' : ''}
      </div>
      <div class="product-card-body">
        ${typeText || codeText ? `<div class="product-card-type">${typeText}${codeText}</div>` : ''}
        <div class="product-card-price">${formatPrice(product.price)}</div>
        ${sizesText ? `<div class="product-card-sizes">${sizesText}</div>` : ''}
      </div>
    `;
    return card;
  }

  const featuredGrid = document.getElementById('featuredGrid');
  if (featuredGrid) {
    db.collection('products').where('featured', '==', true).limit(5).get().then(snapshot => {
      if (snapshot.empty) {
        featuredGrid.innerHTML = '<div class="empty-state"><p>Próximamente: productos destacados</p></div>';
        return;
      }
      snapshot.forEach(doc => {
        let product = { id: doc.id, ...doc.data() };
        let card = createProductCard(product);
        card.classList.add('reveal', 'stagger-' + (featuredGrid.children.length + 1));
        featuredGrid.appendChild(card);
        revealObserver.observe(card);
      });
    });
  }

  const productsGrid = document.getElementById('productsGrid');
  const loadMoreBtn = document.getElementById('loadMoreBtn');
  const emptyState = document.getElementById('emptyState');
  const productsCount = document.getElementById('productsCount');
  const categoryTitle = document.getElementById('categoryTitle');
  const breadcrumbCurrent = document.getElementById('breadcrumbCurrent');

  if (productsGrid) {
    let allProducts = [];
    let displayedCount = 0;
    const PAGE_SIZE = 30;
    let lastDoc = null;
    let hasMore = true;

    const params = new URLSearchParams(window.location.search);
    let initialCat = params.get('categoria');
    let initialSearch = params.get('buscar');

    if (initialCat) {
      let catNames = { f11: 'Fútbol 11', f5: 'Fútbol 5', futsal: 'Futsal', adultos: 'Adultos', kids: 'Kids' };
      let catName = catNames[initialCat] || initialCat.charAt(0).toUpperCase() + initialCat.slice(1);
      if (breadcrumbCurrent) breadcrumbCurrent.textContent = catName;
      let checkbox = document.querySelector(`input[name="categoria"][value="${initialCat}"]`);
      if (checkbox) checkbox.checked = true;
    }

    if (initialSearch) {
      if (breadcrumbCurrent) breadcrumbCurrent.textContent = 'Búsqueda';
    }

    function getActiveFilters() {
      let filters = {};
      let categorias = Array.from(document.querySelectorAll('input[name="categoria"]:checked')).map(c => c.value);
      let talles = Array.from(document.querySelectorAll('input[name="talle"]:checked')).map(c => c.value);
      let priceRange = document.getElementById('priceRange');
      if (categorias.length) filters.categorias = categorias;
      if (talles.length) filters.talles = talles;
      if (priceRange) filters.maxPrice = parseInt(priceRange.value);
      if (initialSearch) filters.search = initialSearch.toLowerCase();
      return filters;
    }

    function filterProduct(product, filters) {
      if (filters.categorias && !filters.categorias.includes((product.category || '').toLowerCase())) return false;
      if (filters.talles) {
        let productSizes = (product.sizes || []).map(s => String(s.arg || s));
        if (!filters.talles.some(t => productSizes.includes(t))) return false;
      }
      if (filters.maxPrice && product.price > filters.maxPrice) return false;
      if (filters.search) {
        let searchable = ((product.name || '') + ' ' + (product.category || '')).toLowerCase();
        if (!searchable.includes(filters.search)) return false;
      }
      return true;
    }

    function renderProducts(products) {
      productsGrid.innerHTML = '';
      if (products.length === 0) {
        if (emptyState) emptyState.style.display = 'block';
        if (loadMoreBtn) loadMoreBtn.style.display = 'none';
        if (productsCount) productsCount.textContent = '0 productos';
        return;
      }
      if (emptyState) emptyState.style.display = 'none';
      if (productsCount) productsCount.textContent = products.length + ' producto' + (products.length !== 1 ? 's' : '');

      let toShow = products.slice(0, displayedCount + PAGE_SIZE);
      displayedCount = toShow.length;

      toShow.forEach(product => {
        let card = createProductCard(product);
        productsGrid.appendChild(card);
      });

      if (loadMoreBtn) {
        loadMoreBtn.style.display = displayedCount < products.length ? 'block' : 'none';
      }
    }

    function loadProducts() {
      displayedCount = 0;
      db.collection('products').orderBy('createdAt', 'desc').get().then(snapshot => {
        allProducts = [];
        snapshot.forEach(doc => {
          allProducts.push({ id: doc.id, ...doc.data() });
        });
        let filters = getActiveFilters();
        let filtered = allProducts.filter(p => filterProduct(p, filters));
        renderProducts(filtered);
      });
    }

    if (loadMoreBtn) {
      loadMoreBtn.addEventListener('click', () => {
        let filters = getActiveFilters();
        let filtered = allProducts.filter(p => filterProduct(p, filters));
        renderProducts(filtered);
      });
    }

    function applyCurrentFilters() {
      displayedCount = 0;
      let filters = getActiveFilters();
      let filtered = allProducts.filter(p => filterProduct(p, filters));
      renderProducts(filtered);
    }

    let applyFilters = document.getElementById('applyFilters');
    if (applyFilters) {
      applyFilters.addEventListener('click', () => {
        applyCurrentFilters();
        let sidebar = document.getElementById('filtersSidebar');
        if (sidebar && window.innerWidth < 960) sidebar.classList.remove('mobile-open');
      });
    }

    // Auto-apply filters on any checkbox change
    document.querySelectorAll('.filters-sidebar input[type="checkbox"]').forEach(cb => {
      cb.addEventListener('change', () => {
        applyCurrentFilters();
      });
    });

    let priceRange = document.getElementById('priceRange');
    let priceRangeValue = document.getElementById('priceRangeValue');
    if (priceRange && priceRangeValue) {
      priceRange.addEventListener('input', () => {
        priceRangeValue.textContent = formatPrice(parseInt(priceRange.value));
        applyCurrentFilters();
      });
    }

    let filtersMobileToggle = document.getElementById('filtersMobileToggle');
    let filtersSidebar = document.getElementById('filtersSidebar');
    if (filtersMobileToggle && filtersSidebar) {
      filtersMobileToggle.addEventListener('click', () => {
        filtersSidebar.classList.toggle('mobile-open');
      });
    }

    loadProducts();
  }

  const productGallery = document.getElementById('productGallery');
  if (productGallery) {
    const params = new URLSearchParams(window.location.search);
    let productId = params.get('id');

    if (productId) {
      db.collection('products').doc(productId).get().then(doc => {
        if (!doc.exists) {
          document.getElementById('productName').textContent = 'Producto no encontrado';
          return;
        }
        let product = { id: doc.id, ...doc.data() };

        document.title = product.name + ' | Botines FV';
        document.getElementById('productName').textContent = product.name;
        let catNames = { f11: 'Fútbol 11', f5: 'Fútbol 5', futsal: 'Futsal', adultos: 'Adultos', kids: 'Kids' };
        document.getElementById('productBrand').textContent = catNames[product.category] || product.category || '';
        document.getElementById('productPrice').textContent = formatPrice(product.price);
        document.getElementById('breadcrumbProduct').textContent = product.name;

        let stockInfo = document.getElementById('stockInfo');
        let productStock = product.stock || 0;
        if (stockInfo) {
          if (productStock > 0) {
            stockInfo.innerHTML = `<span class="stock-available">Stock disponible: ${productStock} unidad${productStock !== 1 ? 'es' : ''}</span>`;
          } else {
            stockInfo.innerHTML = `<span class="stock-out">Sin stock</span>`;
          }
        }

        let mainImg = document.getElementById('productMainImg');
        if (product.images && product.images.length > 0) {
          mainImg.src = product.images[0];
          mainImg.alt = product.name;
        }

        let sizeOptions = document.getElementById('sizeOptions');
        let allSizes = [
          { us: '6.5', cm: '24.5', eur: '39', arg: '38' },
          { us: '7', cm: '25', eur: '40', arg: '39' },
          { us: '7.5', cm: '25.5', eur: '40½', arg: '39½' },
          { us: '8', cm: '26', eur: '41', arg: '40' },
          { us: '8.5', cm: '26.5', eur: '42', arg: '41' },
          { us: '9', cm: '27', eur: '42½', arg: '41½' },
          { us: '9.5', cm: '27.5', eur: '43', arg: '42' },
          { us: '10', cm: '28', eur: '44', arg: '43' },
          { us: '10.5', cm: '28.5', eur: '44½', arg: '43½' },
          { us: '11', cm: '29', eur: '45', arg: '44' },
          { us: '11.5', cm: '29.5', eur: '45½', arg: '44½' },
          { us: '12', cm: '30', eur: '46', arg: '45' }
        ];

        let productSizeArgs = (product.sizes || []).map(s => String(s.arg || s));
        let selectedSize = null;

        allSizes.forEach(size => {
          let btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'size-btn';
          btn.textContent = size.arg;
          let isAvailable = productSizeArgs.includes(size.arg) || productSizeArgs.includes(size.arg.replace('½', '.5'));
          if (!isAvailable && productSizeArgs.length > 0) {
            btn.classList.add('unavailable');
          } else {
            btn.addEventListener('click', () => {
              sizeOptions.querySelectorAll('.size-btn').forEach(b => b.classList.remove('selected'));
              btn.classList.add('selected');
              selectedSize = size.arg;
            });
          }
          sizeOptions.appendChild(btn);
        });

        let btnAddCart = document.getElementById('btnAddCart');
        let btnBuyNow = document.getElementById('btnBuyNow');

        if (btnAddCart) {
          if (productStock <= 0) {
            btnAddCart.disabled = true;
            btnAddCart.textContent = 'Sin stock';
            btnAddCart.classList.add('btn-disabled');
          }
          btnAddCart.addEventListener('click', () => {
            if (!selectedSize) {
              Cart.showToast('Seleccioná un talle');
              return;
            }
            if (productStock <= 0) {
              Cart.showToast('Producto sin stock');
              return;
            }
            Cart.addItem({
              id: product.id,
              name: product.name,
              category: product.category,
              price: product.price,
              size: selectedSize,
              image: (product.images && product.images[0]) || 'images/logo.jpeg',
              productCode: product.productCode || null
            });
          });
        }

        if (btnBuyNow) {
          if (productStock <= 0) {
            btnBuyNow.disabled = true;
            btnBuyNow.textContent = 'Sin stock';
            btnBuyNow.classList.add('btn-disabled');
          }
          btnBuyNow.addEventListener('click', () => {
            if (!selectedSize) {
              Cart.showToast('Seleccioná un talle');
              return;
            }
            if (productStock <= 0) {
              Cart.showToast('Producto sin stock');
              return;
            }
            Cart.addItem({
              id: product.id,
              name: product.name,
              category: product.category,
              price: product.price,
              size: selectedSize,
              image: (product.images && product.images[0]) || 'images/logo.jpeg',
              productCode: product.productCode || null
            });
            window.location.href = 'checkout.html';
          });
        }

        db.collection('products').get().then(allSnap => {
          let all = [];
          allSnap.forEach(d => {
            if (d.id !== productId) all.push({ id: d.id, ...d.data() });
          });
          for (let i = all.length - 1; i > 0; i--) {
            let j = Math.floor(Math.random() * (i + 1));
            [all[i], all[j]] = [all[j], all[i]];
          }
          let related = all.slice(0, 5);
          let relatedGrid = document.getElementById('relatedGrid');
          if (relatedGrid && related.length > 0) {
            related.forEach(p => {
              relatedGrid.appendChild(createProductCard(p));
            });
          }
        });
      });
    }
  }

  const checkoutItems = document.getElementById('checkoutItems');
  if (checkoutItems) {
    const WSP_NUMBER = '5491132053335';
    const EMAILJS_SERVICE = 'YOUR_SERVICE_ID';   // ← reemplazar
    const EMAILJS_TEMPLATE = 'YOUR_TEMPLATE_ID'; // ← reemplazar
    const EMAILJS_PUBLIC_KEY = 'YOUR_PUBLIC_KEY'; // ← reemplazar

    let items = Cart.getItems();
    let subtotal = Cart.getTotal();
    let currentShipping = 0;
    let currentZona = '';
    let currentPayment = '';

    if (items.length === 0) {
      checkoutItems.innerHTML = '<p style="color:var(--gray);font-size:0.88rem">Tu carrito está vacío. <a href="category.html" style="color:var(--gold)">Ver productos</a></p>';
      return;
    }

    items.forEach(item => {
      let div = document.createElement('div');
      div.className = 'checkout-item';
      div.innerHTML = `
        <span class="checkout-item-name">${item.name} (x${item.qty}) - Talle ${item.size}</span>
        <span class="checkout-item-price">${Cart.formatPrice(item.price * item.qty)}</span>
      `;
      checkoutItems.appendChild(div);
    });

    let chkSubtotal = document.getElementById('chkSubtotal');
    let chkTotal = document.getElementById('chkTotal');
    let shippingLabel = document.getElementById('shippingLabel');
    let shippingCost = document.getElementById('shippingCost');
    let paymentMsg = document.getElementById('paymentMsg');
    let zonaInfo = document.getElementById('zonaInfo');
    let optionMP = document.getElementById('optionMP');
    let optionEfectivo = document.getElementById('optionEfectivo');

    if (chkSubtotal) chkSubtotal.textContent = Cart.formatPrice(subtotal);

    function updateTotals() {
      let total = subtotal + currentShipping;
      if (chkTotal) chkTotal.textContent = Cart.formatPrice(total);
    }

    function updateShippingDisplay() {
      if (currentZona === 'caba' || currentZona === 'amba') {
        currentShipping = 10000;
        if (shippingLabel) shippingLabel.textContent = 'Envío por moto';
        if (shippingCost) shippingCost.textContent = Cart.formatPrice(10000);
      } else if (currentZona === 'otra') {
        currentShipping = 0;
        if (shippingLabel) shippingLabel.textContent = 'Envío';
        if (shippingCost) shippingCost.textContent = 'A coordinar';
      } else {
        currentShipping = 0;
        if (shippingLabel) shippingLabel.textContent = 'Envío';
        if (shippingCost) shippingCost.textContent = '—';
      }
      updateTotals();
    }

    // Auto-detect zone from CP
    function detectZonaFromCP(cp) {
      let num = parseInt(cp.replace(/\D/g, ''), 10);
      if (isNaN(num) || num < 1000) return '';
      if (num >= 1000 && num <= 1499) return 'caba';
      if (num >= 1600 && num <= 1899) return 'amba';
      return 'otra';
    }

    let cpInput = document.getElementById('chkCP');
    let zonaSelect = document.getElementById('chkZona');

    if (cpInput && zonaSelect) {
      cpInput.addEventListener('input', () => {
        let cpVal = cpInput.value.trim();
        if (cpVal.length >= 4) {
          let detected = detectZonaFromCP(cpVal);
          if (detected) {
            zonaSelect.value = detected;
            zonaSelect.dispatchEvent(new Event('change'));
          }
        }
      });
    }

    // Zone change
    if (zonaSelect) {
      zonaSelect.addEventListener('change', () => {
        currentZona = zonaSelect.value;
        updateShippingDisplay();

        // Update zone info
        zonaInfo.className = 'zona-info show';
        if (currentZona === 'caba' || currentZona === 'amba') {
          zonaInfo.className += ' zona-ok';
          zonaInfo.innerHTML = '✓ Envío por moto disponible — <strong>$10.000</strong>. Todos los métodos de pago habilitados.';
          // Enable all methods
          if (optionMP) optionMP.classList.remove('disabled');
          if (optionEfectivo) optionEfectivo.classList.remove('disabled');
        } else if (currentZona === 'otra') {
          zonaInfo.className += ' zona-warn';
          zonaInfo.innerHTML = 'El envío se coordina por WhatsApp. Disponible pago con transferencia o Mercado Pago.';
          // Disable efectivo for interior
          if (optionEfectivo) {
            optionEfectivo.classList.add('disabled');
            let efRadio = optionEfectivo.querySelector('input');
            if (efRadio && efRadio.checked) {
              efRadio.checked = false;
              currentPayment = '';
            }
          }
          // Enable MP for interior
          if (optionMP) optionMP.classList.remove('disabled');
        } else {
          zonaInfo.className = 'zona-info';
        }
        updatePayButton();
      });
    }

    // Payment method change
    let paymentRadios = document.querySelectorAll('input[name="paymentMethod"]');
    paymentRadios.forEach(radio => {
      radio.addEventListener('change', () => {
        currentPayment = radio.value;
        if (currentPayment === 'mercadopago') {
          if (paymentMsg) paymentMsg.textContent = 'Te llevaremos a Mercado Pago para terminar la operación.';
        } else if (currentPayment === 'transferencia') {
          if (paymentMsg) paymentMsg.textContent = 'Te redirigiremos a WhatsApp para coordinar la transferencia.';
        } else if (currentPayment === 'efectivo') {
          if (paymentMsg) paymentMsg.textContent = 'Te redirigiremos a WhatsApp para coordinar el pago en efectivo.';
        }
        updatePayButton();
      });
    });

    let billingToggle = document.getElementById('billingToggle');
    let billingFields = document.getElementById('billingFields');
    if (billingToggle && billingFields) {
      billingToggle.addEventListener('change', () => {
        billingFields.classList.toggle('show', billingToggle.checked);
      });
    }

    let checkoutForm = document.getElementById('checkoutForm');
    let btnPay = document.getElementById('btnPay');

    function validateForm() {
      let nombre = document.getElementById('chkNombre').value.trim();
      let apellido = document.getElementById('chkApellido').value.trim();
      let email = document.getElementById('chkEmail').value.trim();
      let telefono = document.getElementById('chkTelefono').value.trim();
      let direccion = document.getElementById('chkDireccion').value.trim();
      let ciudad = document.getElementById('chkCiudad').value.trim();
      let provincia = document.getElementById('chkProvincia').value.trim();
      let cp = document.getElementById('chkCP').value.trim();
      return nombre && apellido && email && telefono && direccion && ciudad && provincia && cp && currentZona && currentPayment;
    }

    function updatePayButton() {
      if (validateForm()) {
        btnPay.classList.add('enabled');
        if (currentPayment === 'mercadopago') {
          btnPay.textContent = 'Confirmar y pagar';
        } else {
          btnPay.textContent = 'Confirmar por WhatsApp';
        }
      } else {
        btnPay.classList.remove('enabled');
        btnPay.textContent = 'Confirmar pedido';
      }
    }

    if (checkoutForm) {
      checkoutForm.addEventListener('input', updatePayButton);
    }

    function buildOrderSummaryText() {
      let nombre = document.getElementById('chkNombre').value.trim();
      let apellido = document.getElementById('chkApellido').value.trim();
      let email = document.getElementById('chkEmail').value.trim();
      let telefono = document.getElementById('chkTelefono').value.trim();
      let direccion = document.getElementById('chkDireccion').value.trim();
      let ciudad = document.getElementById('chkCiudad').value.trim();
      let provincia = document.getElementById('chkProvincia').value.trim();
      let cp = document.getElementById('chkCP').value.trim();
      let mensaje = document.getElementById('chkMensaje').value.trim();
      let zonaText = currentZona === 'caba' ? 'CABA' : currentZona === 'amba' ? 'AMBA' : 'Otra zona';
      let payText = currentPayment === 'mercadopago' ? 'Mercado Pago' : currentPayment === 'transferencia' ? 'Transferencia' : 'Efectivo';
      let shippingText = (currentZona === 'caba' || currentZona === 'amba') ? Cart.formatPrice(10000) + ' (moto)' : 'A coordinar';
      let total = subtotal + currentShipping;

      let text = `🛒 *NUEVO PEDIDO — Botines FV*\n\n`;
      text += `👤 *Cliente:* ${nombre} ${apellido}\n`;
      text += `📧 *Email:* ${email}\n`;
      text += `📱 *Tel:* ${telefono}\n`;
      text += `📍 *Dirección:* ${direccion}\n`;
      text += `🏙️ *Ciudad:* ${ciudad}\n`;
      text += `🏛️ *Provincia:* ${provincia}\n`;
      text += `📮 *CP:* ${cp}\n`;
      text += `🗺️ *Zona:* ${zonaText}\n`;
      if (mensaje) text += `💬 *Mensaje:* ${mensaje}\n`;
      text += `\n📦 *Productos:*\n`;
      items.forEach(item => {
        let codeTag = item.productCode ? `#${item.productCode} ` : '';
        text += `• ${codeTag}${item.name} — Talle ${item.size} (x${item.qty}) — ${Cart.formatPrice(item.price * item.qty)}\n`;
      });
      text += `\n💰 *Subtotal:* ${Cart.formatPrice(subtotal)}\n`;
      text += `🚚 *Envío:* ${shippingText}\n`;
      text += `✅ *Total:* ${Cart.formatPrice(total)}\n`;
      text += `💳 *Método de pago:* ${payText}`;
      return text;
    }

    function buildEmailHTML() {
      let nombre = document.getElementById('chkNombre').value.trim();
      let apellido = document.getElementById('chkApellido').value.trim();
      let email = document.getElementById('chkEmail').value.trim();
      let telefono = document.getElementById('chkTelefono').value.trim();
      let direccion = document.getElementById('chkDireccion').value.trim();
      let ciudad = document.getElementById('chkCiudad').value.trim();
      let provincia = document.getElementById('chkProvincia').value.trim();
      let cp = document.getElementById('chkCP').value.trim();
      let total = subtotal + currentShipping;
      let shippingText = (currentZona === 'caba' || currentZona === 'amba') ? Cart.formatPrice(10000) : 'A coordinar';

      let itemsHTML = items.map(item => {
        let codeTag = item.productCode ? `#${item.productCode} ` : '';
        return `${codeTag}${item.name} — Talle ${item.size} (x${item.qty}) — ${Cart.formatPrice(item.price * item.qty)}`;
      }).join('\n');

      return {
        customer_name: `${nombre} ${apellido}`,
        customer_email: email,
        customer_phone: telefono,
        customer_address: `${direccion}, ${ciudad}, ${provincia} (${cp})`,
        customer_zone: currentZona === 'caba' ? 'CABA' : currentZona === 'amba' ? 'AMBA' : 'Otra zona',
        order_items: itemsHTML,
        order_subtotal: Cart.formatPrice(subtotal),
        order_shipping: shippingText,
        order_total: Cart.formatPrice(total),
        payment_method: currentPayment === 'mercadopago' ? 'Mercado Pago' : currentPayment === 'transferencia' ? 'Transferencia' : 'Efectivo'
      };
    }

    function sendEmailNotification() {
      try {
        emailjs.send(EMAILJS_SERVICE, EMAILJS_TEMPLATE, buildEmailHTML(), EMAILJS_PUBLIC_KEY);
      } catch (e) {
        console.warn('EmailJS error:', e);
      }
    }

    function redirectToWhatsApp(paidByMP) {
      let text = buildOrderSummaryText();
      if (paidByMP) {
        text += `\n\n✅ *YA PAGADO POR MERCADO PAGO* — Necesito coordinar el envío.`;
      }
      let url = `https://wa.me/${WSP_NUMBER}?text=${encodeURIComponent(text)}`;
      // Usar location.href para compatibilidad con iPhone/Safari
      window.location.href = url;
    }

    if (btnPay) {
      btnPay.addEventListener('click', () => {
        if (!validateForm()) return;

        let orderData = {
          customer: {
            nombre: document.getElementById('chkNombre').value.trim(),
            apellido: document.getElementById('chkApellido').value.trim(),
            email: document.getElementById('chkEmail').value.trim(),
            telefono: document.getElementById('chkTelefono').value.trim(),
            direccion: document.getElementById('chkDireccion').value.trim(),
            ciudad: document.getElementById('chkCiudad').value.trim(),
            provincia: document.getElementById('chkProvincia').value.trim(),
            cp: document.getElementById('chkCP').value.trim(),
            mensaje: document.getElementById('chkMensaje').value.trim(),
            zona: currentZona
          },
          billing: null,
          items: items.map(i => ({
            productId: i.id,
            name: i.name,
            category: i.category,
            price: i.price,
            size: i.size,
            qty: i.qty
          })),
          subtotal: subtotal,
          shipping: currentShipping,
          total: subtotal + currentShipping,
          paymentMethod: currentPayment,
          status: 'pending',
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        if (billingToggle && billingToggle.checked) {
          orderData.billing = {
            nombre: document.getElementById('bilNombre').value.trim(),
            apellido: document.getElementById('bilApellido').value.trim(),
            direccion: document.getElementById('bilDireccion').value.trim(),
            dni: document.getElementById('bilDni').value.trim(),
            telefono: document.getElementById('bilTelefono').value.trim()
          };
        }

        btnPay.textContent = 'Procesando...';
        btnPay.classList.remove('enabled');

        db.collection('orders').add(orderData).then(docRef => {
          if (currentPayment === 'mercadopago') {
            Cart.clear();
            if (currentZona === 'otra') {
              
              Cart.showToast('Orden creada. Te redirigimos a WhatsApp para coordinar el envío.');
              btnPay.textContent = 'Compra completada';
              alert('Orden creada con éxito. Nro: ' + docRef.id + '\n\nAquí se redirecionaría a Mercado Pago para completar el pago.\nLuego te redirigiremos a WhatsApp para coordinar el envío.');
              setTimeout(() => { redirectToWhatsApp(true); }, 500);
            } else {
              
              Cart.showToast('Orden creada correctamente');
              alert('Orden creada con éxito. Nro: ' + docRef.id + '\n\nAquí se redirecionaría a Mercado Pago para completar el pago.\nEl email se enviará cuando se confirme el pago.');
              btnPay.textContent = 'Confirmar y pagar';
              btnPay.classList.add('enabled');
            }
          } else {
            sendEmailNotification();
            Cart.clear();
            Cart.showToast('¡Pedido enviado! Te redirigimos a WhatsApp.');
            btnPay.textContent = 'Compra completada';
            setTimeout(() => { redirectToWhatsApp(false); }, 500);
          }
        }).catch(err => {
          btnPay.textContent = currentPayment === 'mercadopago' ? 'Confirmar y pagar' : 'Confirmar por WhatsApp';
          btnPay.classList.add('enabled');
          Cart.showToast('Error al crear la orden. Intentá de nuevo.');
        });
      });
    }
  }

});
