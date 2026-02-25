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

    card.innerHTML = `
      <div class="product-card-img">
        <img src="${imgSrc}" alt="${product.name}" width="300" height="300" loading="lazy">
        ${product.featured ? '<span class="product-card-badge">Destacado</span>' : ''}
      </div>
      <div class="product-card-body">
        <div class="product-card-brand">${product.brand || ''}</div>
        <div class="product-card-name">${product.name}</div>
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
    let initialBrand = params.get('marca');
    let initialCat = params.get('categoria');
    let initialSearch = params.get('buscar');

    if (initialBrand && categoryTitle) {
      let brandName = initialBrand.charAt(0).toUpperCase() + initialBrand.slice(1);
      categoryTitle.textContent = 'Botines ' + brandName;
      if (breadcrumbCurrent) breadcrumbCurrent.textContent = brandName;
      let checkbox = document.querySelector(`input[name="marca"][value="${initialBrand}"]`);
      if (checkbox) checkbox.checked = true;
    }

    if (initialCat && categoryTitle) {
      let catName = initialCat.charAt(0).toUpperCase() + initialCat.slice(1);
      categoryTitle.textContent = catName;
      if (breadcrumbCurrent) breadcrumbCurrent.textContent = catName;
      let checkbox = document.querySelector(`input[name="categoria"][value="${initialCat}"]`);
      if (checkbox) checkbox.checked = true;
    }

    if (initialSearch && categoryTitle) {
      categoryTitle.textContent = 'Resultados: "' + initialSearch + '"';
      if (breadcrumbCurrent) breadcrumbCurrent.textContent = 'Búsqueda';
    }

    function getActiveFilters() {
      let filters = {};
      let marcas = Array.from(document.querySelectorAll('input[name="marca"]:checked')).map(c => c.value);
      let categorias = Array.from(document.querySelectorAll('input[name="categoria"]:checked')).map(c => c.value);
      let tipos = Array.from(document.querySelectorAll('input[name="tipo"]:checked')).map(c => c.value);
      let talles = Array.from(document.querySelectorAll('input[name="talle"]:checked')).map(c => c.value);
      let priceRange = document.getElementById('priceRange');
      if (marcas.length) filters.marcas = marcas;
      if (categorias.length) filters.categorias = categorias;
      if (tipos.length) filters.tipos = tipos;
      if (talles.length) filters.talles = talles;
      if (priceRange) filters.maxPrice = parseInt(priceRange.value);
      if (initialSearch) filters.search = initialSearch.toLowerCase();
      return filters;
    }

    function filterProduct(product, filters) {
      if (filters.marcas && !filters.marcas.includes((product.brand || '').toLowerCase())) return false;
      if (filters.categorias && !filters.categorias.includes((product.category || '').toLowerCase())) return false;
      if (filters.tipos && !filters.tipos.includes((product.type || '').toLowerCase())) return false;
      if (filters.talles) {
        let productSizes = (product.sizes || []).map(s => String(s.arg || s));
        if (!filters.talles.some(t => productSizes.includes(t))) return false;
      }
      if (filters.maxPrice && product.price > filters.maxPrice) return false;
      if (filters.search) {
        let searchable = ((product.name || '') + ' ' + (product.brand || '') + ' ' + (product.category || '')).toLowerCase();
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

    let applyFilters = document.getElementById('applyFilters');
    if (applyFilters) {
      applyFilters.addEventListener('click', () => {
        displayedCount = 0;
        let filters = getActiveFilters();
        let filtered = allProducts.filter(p => filterProduct(p, filters));
        renderProducts(filtered);
        let sidebar = document.getElementById('filtersSidebar');
        if (sidebar && window.innerWidth < 960) sidebar.classList.remove('mobile-open');
      });
    }

    let priceRange = document.getElementById('priceRange');
    let priceRangeValue = document.getElementById('priceRangeValue');
    if (priceRange && priceRangeValue) {
      priceRange.addEventListener('input', () => {
        priceRangeValue.textContent = formatPrice(parseInt(priceRange.value));
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
        document.getElementById('productBrand').textContent = product.brand || '';
        document.getElementById('productPrice').textContent = formatPrice(product.price);
        document.getElementById('breadcrumbProduct').textContent = product.name;

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
          btnAddCart.addEventListener('click', () => {
            if (!selectedSize) {
              Cart.showToast('Seleccioná un talle');
              return;
            }
            Cart.addItem({
              id: product.id,
              name: product.name,
              brand: product.brand,
              price: product.price,
              size: selectedSize,
              image: (product.images && product.images[0]) || 'images/logo.jpeg'
            });
          });
        }

        if (btnBuyNow) {
          btnBuyNow.addEventListener('click', () => {
            if (!selectedSize) {
              Cart.showToast('Seleccioná un talle');
              return;
            }
            Cart.addItem({
              id: product.id,
              name: product.name,
              brand: product.brand,
              price: product.price,
              size: selectedSize,
              image: (product.images && product.images[0]) || 'images/logo.jpeg'
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
    let items = Cart.getItems();
    let subtotal = Cart.getTotal();
    let shipping = 10000;
    let total = subtotal + shipping;

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
    if (chkSubtotal) chkSubtotal.textContent = Cart.formatPrice(subtotal);
    if (chkTotal) chkTotal.textContent = Cart.formatPrice(total);

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
      return nombre && apellido && email && telefono && direccion;
    }

    if (checkoutForm && btnPay) {
      checkoutForm.addEventListener('input', () => {
        if (validateForm()) {
          btnPay.classList.add('enabled');
        } else {
          btnPay.classList.remove('enabled');
        }
      });

      btnPay.addEventListener('click', () => {
        if (!validateForm()) return;

        let orderData = {
          customer: {
            nombre: document.getElementById('chkNombre').value.trim(),
            apellido: document.getElementById('chkApellido').value.trim(),
            email: document.getElementById('chkEmail').value.trim(),
            telefono: document.getElementById('chkTelefono').value.trim(),
            direccion: document.getElementById('chkDireccion').value.trim(),
            mensaje: document.getElementById('chkMensaje').value.trim()
          },
          billing: null,
          items: items.map(i => ({
            productId: i.id,
            name: i.name,
            brand: i.brand,
            price: i.price,
            size: i.size,
            qty: i.qty
          })),
          subtotal: subtotal,
          shipping: shipping,
          total: total,
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
          Cart.clear();
          Cart.showToast('Orden creada correctamente');
          alert('Orden creada con éxito. Nro: ' + docRef.id + '\n\nAquí se redireccionaría a Mercado Pago para completar el pago.');
        }).catch(err => {
          btnPay.textContent = 'Confirmar y pagar';
          btnPay.classList.add('enabled');
          Cart.showToast('Error al crear la orden. Intentá de nuevo.');
        });
      });
    }
  }

});
