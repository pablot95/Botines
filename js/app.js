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
  const heroTotal = heroDots.length || 3;
  let heroSlide = 0;
  let heroInterval;

  function setHeroSlide(idx) {
    heroSlide = (idx + heroTotal) % heroTotal;
    if (heroTrack) heroTrack.style.transform = `translateX(-${heroSlide * (100 / heroTotal)}%)`;
    heroDots.forEach((d, i) => d.classList.toggle('active', i === heroSlide));
  }

  function nextHero() {
    setHeroSlide(heroSlide + 1);
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
    if (heroPrev) heroPrev.addEventListener('click', () => { setHeroSlide(heroSlide - 1); resetHeroAuto(); });
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
      let argSizes = product.sizes.map(s => {
        if (s.arg && s.us) return `${s.arg} (US ${s.us})`;
        return s.arg || s;
      }).join(', ');
      sizesText = `Talles: ${argSizes}`;
    }

    let typeText = product.category === 'f11' ? 'Fútbol 11' : product.category === 'f5' ? 'Fútbol 5' : product.category === 'futsal' ? 'Futsal' : product.category === 'mixtos' ? 'Mixtos' : product.category === 'kids' ? 'Kids' : '';

    let codeText = product.productCode ? `<span class="product-card-code">#${product.productCode}</span>` : '';

    card.innerHTML = `
      <div class="product-card-img">
        <img src="${imgSrc}" alt="${product.name}" width="300" height="300" loading="lazy">
        ${product.featured ? '<span class="product-card-badge">Destacado</span>' : ''}
        ${(product.stock || 0) <= 0 ? '<span class="product-card-badge badge-no-stock">Agotado</span>' : ''}
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
    let displayedProducts = [];
    let lastDoc = null;
    let hasMore = true;
    let isLoading = false;
    const PAGE_SIZE = 24;

    const params = new URLSearchParams(window.location.search);
    let initialCat = params.get('categoria');
    let initialSearch = params.get('buscar');

    if (initialCat) {
      let catNames = { f11: 'Fútbol 11', f5: 'Fútbol 5', futsal: 'Futsal', mixtos: 'Mixtos', kids: 'Kids' };
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

    // Construye query Firestore — NO combina where+orderBy para evitar requerir composite indexes
    function buildFirestoreQuery(filters) {
      let query = db.collection('products');
      if (filters.categorias && filters.categorias.length > 0) {
        if (filters.categorias.length === 1) {
          query = query.where('category', '==', filters.categorias[0]);
        } else {
          query = query.where('category', 'in', filters.categorias.slice(0, 10));
        }
      } else {
        // Solo usar orderBy cuando NO hay filtro de categoría (no necesita composite index)
        query = query.orderBy('createdAt', 'desc');
      }
      return query;
    }

    // Filtros que Firestore no soporta eficientemente se aplican client-side por página
    function clientSideMatch(product, filters) {
      if (filters.talles) {
        let productSizes = (product.sizes || []).map(s => String(s.arg || s));
        if (!filters.talles.some(t => productSizes.includes(t))) return false;
      }
      if (filters.maxPrice && product.price > filters.maxPrice) return false;
      if (filters.search) {
        let searchable = ((product.name || '') + ' ' + (product.category || '') + ' ' + (product.productCode || '')).toLowerCase();
        if (!searchable.includes(filters.search)) return false;
      }
      return true;
    }

    function loadProducts(reset) {
      if (isLoading) return;
      isLoading = true;

      if (reset) {
        displayedProducts = [];
        lastDoc = null;
        hasMore = true;
        productsGrid.innerHTML = '';
      }

      let filters = getActiveFilters();
      let query = buildFirestoreQuery(filters);

      if (lastDoc) {
        query = query.startAfter(lastDoc);
      }

      // Pedir más docs cuando hay filtros client-side para compensar los que se descarten
      let hasClientFilters = filters.search || filters.talles || filters.maxPrice;
      let batchSize = hasClientFilters ? PAGE_SIZE : PAGE_SIZE;
      query = query.limit(batchSize);

      query.get().then(snapshot => {
        hasMore = snapshot.docs.length === batchSize;
        if (snapshot.docs.length > 0) {
          lastDoc = snapshot.docs[snapshot.docs.length - 1];
        }

        let newProducts = [];
        snapshot.forEach(doc => {
          let product = { id: doc.id, ...doc.data() };
          if (clientSideMatch(product, filters)) {
            newProducts.push(product);
          }
        });

        // Ordenar por fecha si la query no incluía orderBy (cuando hay filtro de categoría)
        if (filters.categorias && filters.categorias.length > 0) {
          newProducts.sort((a, b) => {
            let ta = a.createdAt ? (a.createdAt.seconds || 0) : 0;
            let tb = b.createdAt ? (b.createdAt.seconds || 0) : 0;
            return tb - ta;
          });
        }

        newProducts.forEach(product => {
          displayedProducts.push(product);
          productsGrid.appendChild(createProductCard(product));
        });

        if (displayedProducts.length === 0 && !hasMore) {
          if (emptyState) emptyState.style.display = 'block';
          if (loadMoreBtn) loadMoreBtn.style.display = 'none';
          if (productsCount) productsCount.textContent = '0 productos';
        } else {
          if (emptyState) emptyState.style.display = 'none';
          if (productsCount) productsCount.textContent = displayedProducts.length + ' producto' + (displayedProducts.length !== 1 ? 's' : '');
          if (loadMoreBtn) loadMoreBtn.style.display = hasMore ? 'block' : 'none';
        }

        isLoading = false;

        // Si filtros client-side descartaron todo este lote pero hay más datos, cargar siguiente página automáticamente
        if (newProducts.length === 0 && hasMore) {
          loadProducts(false);
        }
      }).catch(err => {
        console.error('Error loading products:', err);
        isLoading = false;
        // Fallback: si la query con filtro falla, intentar sin filtro de categoría
        if (filters.categorias && filters.categorias.length > 0 && displayedProducts.length === 0) {
          console.warn('Retrying without category filter...');
          db.collection('products').orderBy('createdAt', 'desc').limit(batchSize).get().then(snapshot => {
            snapshot.forEach(doc => {
              let product = { id: doc.id, ...doc.data() };
              if (clientSideMatch(product, filters) && (!filters.categorias || filters.categorias.includes((product.category || '').toLowerCase()))) {
                displayedProducts.push(product);
                productsGrid.appendChild(createProductCard(product));
              }
            });
            hasMore = snapshot.docs.length === batchSize;
            if (snapshot.docs.length > 0) lastDoc = snapshot.docs[snapshot.docs.length - 1];
            if (displayedProducts.length === 0) {
              if (emptyState) emptyState.style.display = 'block';
              if (productsCount) productsCount.textContent = '0 productos';
            } else {
              if (emptyState) emptyState.style.display = 'none';
              if (productsCount) productsCount.textContent = displayedProducts.length + ' producto' + (displayedProducts.length !== 1 ? 's' : '');
            }
            if (loadMoreBtn) loadMoreBtn.style.display = hasMore ? 'block' : 'none';
          }).catch(() => {});
        }
      });
    }

    if (loadMoreBtn) {
      loadMoreBtn.addEventListener('click', () => {
        loadProducts(false);
      });
    }

    function applyCurrentFilters() {
      loadProducts(true);
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

    loadProducts(true);
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
        let catNames = { f11: 'Fútbol 11', f5: 'Fútbol 5', futsal: 'Futsal', mixtos: 'Mixtos', kids: 'Kids' };
        document.getElementById('productBrand').textContent = catNames[product.category] || product.category || '';
        document.getElementById('productPrice').textContent = formatPrice(product.price);
        document.getElementById('breadcrumbProduct').textContent = product.name;

        let stockInfo = document.getElementById('stockInfo');
        let productStock = product.stock || 0;
        if (stockInfo) {
          if (productStock > 0) {
            stockInfo.innerHTML = `<span class="stock-available">Stock disponible: ${productStock} unidad${productStock !== 1 ? 'es' : ''}</span>`;
          } else {
            stockInfo.innerHTML = `<span class="stock-out">Agotado</span>`;
          }
        }

        let mainImg = document.getElementById('productMainImg');
        if (product.images && product.images.length > 0) {
          mainImg.src = product.images[0];
          mainImg.alt = product.name;
        }

        let sizeOptions = document.getElementById('sizeOptions');
        const ADULT_SIZES = [
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
        const KIDS_SIZES_PRODUCT = [
          { us: '1K', cm: '19.5', eur: '32', arg: '32' },
          { us: '1.5K', cm: '20', eur: '32.5', arg: '32.5' },
          { us: '2K', cm: '20.5', eur: '33', arg: '33' },
          { us: '2.5K', cm: '21', eur: '34', arg: '34' },
          { us: '3K', cm: '21.5', eur: '34.5', arg: '34.5' },
          { us: '3.5K', cm: '22', eur: '35', arg: '35' },
          { us: '4K', cm: '22.5', eur: '36', arg: '36' },
          { us: '4.5K', cm: '23', eur: '36.5', arg: '36.5' },
          { us: '5K', cm: '23.5', eur: '37', arg: '37' },
          { us: '5.5K', cm: '24', eur: '37.5', arg: '37.5' }
        ];
        let allSizes = product.category === 'kids' ? KIDS_SIZES_PRODUCT : ADULT_SIZES;

        let productSizes = product.sizes || [];
        let productSizeArgs = productSizes.map(s => String(s.arg || s));
        let selectedSize = null;
        let selectedSizeStock = 0;

        // Mapa de stock por talle
        let sizeStockMap = {};
        productSizes.forEach(s => {
          sizeStockMap[String(s.arg || s)] = s.stock || 0;
        });

        allSizes.forEach(size => {
          let btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'size-btn';
          let sizeArg = size.arg;
          let sizeArgAlt = size.arg.replace('½', '.5');
          let isAvailable = productSizeArgs.includes(sizeArg) || productSizeArgs.includes(sizeArgAlt);
          let thisSizeStock = sizeStockMap[sizeArg] || sizeStockMap[sizeArgAlt] || 0;
          let isOutOfStock = isAvailable && thisSizeStock <= 0;

          btn.innerHTML = `${size.arg}<br><small class="size-btn-us">US ${size.us}</small>`;

          if (!isAvailable && productSizeArgs.length > 0) {
            btn.classList.add('unavailable');
          } else if (isOutOfStock) {
            btn.classList.add('unavailable');
          } else {
            btn.addEventListener('click', () => {
              sizeOptions.querySelectorAll('.size-btn').forEach(b => b.classList.remove('selected'));
              btn.classList.add('selected');
              selectedSize = sizeArg;
              selectedSizeStock = thisSizeStock;
              selectedQty = 1;
              updateQtyUI();
            });
          }
          sizeOptions.appendChild(btn);
        });

        let btnAddCart = document.getElementById('btnAddCart');
        let btnBuyNow = document.getElementById('btnBuyNow');
        let qtyValue = document.getElementById('qtyValue');
        let qtyMinus = document.getElementById('qtyMinus');
        let qtyPlus = document.getElementById('qtyPlus');
        let selectedQty = 1;

        function getCartQtyForSize() {
          if (!selectedSize) return 0;
          return Cart.getItems().filter(i => i.id === product.id && i.size === selectedSize).reduce((s, i) => s + i.qty, 0);
        }

        function getMaxAllowed() {
          return Math.max(0, selectedSizeStock - getCartQtyForSize());
        }

        function updateQtyUI() {
          let maxAllowed = getMaxAllowed();
          if (selectedQty > maxAllowed && maxAllowed > 0) selectedQty = maxAllowed;
          if (selectedQty < 1) selectedQty = 1;
          if (qtyValue) qtyValue.textContent = selectedQty;
          if (qtyMinus) qtyMinus.disabled = selectedQty <= 1;
          if (qtyPlus) qtyPlus.disabled = selectedSizeStock <= 0 || selectedQty >= maxAllowed;
        }

        if (qtyMinus) {
          qtyMinus.addEventListener('click', () => {
            if (selectedQty > 1) { selectedQty--; updateQtyUI(); }
          });
        }
        if (qtyPlus) {
          qtyPlus.addEventListener('click', () => {
            if (selectedSizeStock <= 0) return;
            let maxAllowed = getMaxAllowed();
            if (selectedQty < maxAllowed) { selectedQty++; updateQtyUI(); }
            else { Cart.showToast('No hay más stock de este talle'); }
          });
        }
        updateQtyUI();

        if (productStock <= 0) {
          let qtySel = document.getElementById('qtySelector');
          if (qtySel) qtySel.style.display = 'none';
        }

        if (btnAddCart) {
          if (productStock <= 0) {
            btnAddCart.disabled = true;
            btnAddCart.textContent = 'Agotado';
            btnAddCart.classList.add('btn-disabled');
          }
          btnAddCart.addEventListener('click', () => {
            if (!selectedSize) {
              Cart.showToast('Seleccioná un talle');
              return;
            }
            if (selectedSizeStock <= 0) {
              Cart.showToast('Talle agotado');
              return;
            }
            let maxAllowed = getMaxAllowed();
            if (maxAllowed <= 0) {
              Cart.showToast('Ya tenés el máximo de este talle en el carrito');
              return;
            }
            let qtyToAdd = Math.min(selectedQty, maxAllowed);
            for (let i = 0; i < qtyToAdd; i++) {
              Cart.addItem({
                id: product.id,
                name: product.name,
                category: product.category,
                price: product.price,
                size: selectedSize,
                image: (product.images && product.images[0]) || 'images/logo.jpeg',
                productCode: product.productCode || null,
                sizeStock: selectedSizeStock
              });
            }
            selectedQty = 1;
            updateQtyUI();
          });
        }

        if (btnBuyNow) {
          if (productStock <= 0) {
            btnBuyNow.disabled = true;
            btnBuyNow.textContent = 'Agotado';
            btnBuyNow.classList.add('btn-disabled');
          }
          btnBuyNow.addEventListener('click', () => {
            if (!selectedSize) {
              Cart.showToast('Seleccioná un talle');
              return;
            }
            if (selectedSizeStock <= 0) {
              Cart.showToast('Talle agotado');
              return;
            }
            let maxAllowed = getMaxAllowed();
            if (maxAllowed <= 0) {
              Cart.showToast('Ya tenés el máximo de este talle en el carrito');
              return;
            }
            let qtyToAdd = Math.min(selectedQty, maxAllowed);
            for (let i = 0; i < qtyToAdd; i++) {
              Cart.addItem({
                id: product.id,
                name: product.name,
                category: product.category,
                price: product.price,
                size: selectedSize,
                image: (product.images && product.images[0]) || 'images/logo.jpeg',
                productCode: product.productCode || null,
                sizeStock: selectedSizeStock
              });
            }
            window.location.href = 'checkout.html';
          });
        }

        // Productos relacionados: cargar solo de la misma categoría con límite
        let relatedQuery = db.collection('products')
          .where('category', '==', product.category)
          .limit(10);
        relatedQuery.get().then(relSnap => {
          let all = [];
          relSnap.forEach(d => {
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

  // ── Manejo de retorno de MercadoPago ──
  (function handleMPReturn() {
    const params = new URLSearchParams(window.location.search);
    const paymentStatus = params.get('payment');
    const paymentCollection = params.get('collection_status');
    const orderId = params.get('order') || localStorage.getItem('mp_pending_order');

    const isSuccess = paymentStatus === 'success' || paymentCollection === 'approved';
    const isFailure = paymentStatus === 'failure' || paymentCollection === 'rejected';
    const isPending = paymentStatus === 'pending' || paymentCollection === 'pending';

    if (!isSuccess && !isFailure && !isPending) return;

    const checkoutPage = document.querySelector('.checkout-page');
    if (!checkoutPage) return;

    window.history.replaceState({}, '', window.location.pathname);
    localStorage.removeItem('mp_pending_order');

    // Mostrar estado de carga mientras verificamos con el servidor
    checkoutPage.innerHTML = `
      <div style="text-align:center;padding:60px 20px;">
        <div style="font-size:3rem;margin-bottom:16px;">⏳</div>
        <h2 style="color:var(--gold);margin-bottom:12px;">Verificando pago...</h2>
        <p style="color:var(--light);">Estamos confirmando tu pago con Mercado Pago.</p>
      </div>
    `;

    // Verificar el pago del lado del servidor (no confiar en parámetros de URL)
    if (orderId) {
      fetch('/verify-payment.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: orderId })
      })
      .then(r => r.json())
      .then(data => {
        if (data.status === 'approved') {
          // Enviar email de notificación desde el servidor
          const savedEmailData = localStorage.getItem('mp_pending_email');
          if (savedEmailData) {
            fetch('/send-email.php', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: savedEmailData
            }).catch(() => {});
            localStorage.removeItem('mp_pending_email');
          }
          checkoutPage.innerHTML = `
            <div style="text-align:center;padding:60px 20px;">
              <div style="font-size:3rem;margin-bottom:16px;">✅</div>
              <h2 style="color:var(--gold);margin-bottom:12px;">¡Pago confirmado!</h2>
              <p style="color:var(--light);margin-bottom:8px;">Tu pago fue procesado correctamente por Mercado Pago.</p>
              <p style="color:var(--gray);font-size:0.85rem;margin-bottom:20px;">Orden: <strong>${orderId}</strong></p>
              <p style="color:var(--light);margin-bottom:24px;">Podés coordinar el envío por WhatsApp.</p>
              <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;">
                <a href="https://wa.me/5491132053335?text=${encodeURIComponent('Hola! Acabo de pagar mi pedido #' + orderId + ' por Mercado Pago. Quiero coordinar el envío.')}" 
                   class="btn-pay enabled" style="display:inline-block;text-decoration:none;padding:12px 28px;">
                  Coordinar envío por WhatsApp
                </a>
                <a href="index.html" style="color:var(--gold);text-decoration:underline;padding:12px;">Volver al inicio</a>
              </div>
            </div>
          `;
        } else if (data.status === 'pending' || data.status === 'in_process') {
          checkoutPage.innerHTML = `
            <div style="text-align:center;padding:60px 20px;">
              <div style="font-size:3rem;margin-bottom:16px;">⏳</div>
              <h2 style="color:var(--gold);margin-bottom:12px;">Pago pendiente</h2>
              <p style="color:var(--light);margin-bottom:8px;">Tu pago está siendo procesado. Te notificaremos cuando se confirme.</p>
              <p style="color:var(--gray);font-size:0.85rem;margin-bottom:20px;">Orden: <strong>${orderId}</strong></p>
              <p style="color:var(--light);margin-bottom:24px;">Si pagaste con Rapipago o Pago Fácil, puede demorar algunas horas.</p>
              <a href="index.html" style="color:var(--gold);text-decoration:underline;padding:12px;">Volver al inicio</a>
            </div>
          `;
        } else {
          checkoutPage.innerHTML = `
            <div style="text-align:center;padding:60px 20px;">
              <div style="font-size:3rem;margin-bottom:16px;">❌</div>
              <h2 style="color:#e74c3c;margin-bottom:12px;">El pago no se pudo procesar</h2>
              <p style="color:var(--light);margin-bottom:24px;">Hubo un problema con tu pago. Podés intentar de nuevo o elegir otro método de pago.</p>
              <a href="checkout.html" class="btn-pay enabled" style="display:inline-block;text-decoration:none;padding:12px 28px;">Intentar de nuevo</a>
            </div>
          `;
        }
      })
      .catch(() => {
        // Si falla la verificación, mostrar mensaje genérico sin marcar como pagado
        checkoutPage.innerHTML = `
          <div style="text-align:center;padding:60px 20px;">
            <div style="font-size:3rem;margin-bottom:16px;">⏳</div>
            <h2 style="color:var(--gold);margin-bottom:12px;">Pago en proceso</h2>
            <p style="color:var(--light);margin-bottom:8px;">Tu pago está siendo verificado.</p>
            <p style="color:var(--gray);font-size:0.85rem;margin-bottom:20px;">Orden: <strong>${orderId}</strong></p>
            <p style="color:var(--light);margin-bottom:24px;">Si ya pagaste, contactanos por WhatsApp para confirmar.</p>
            <a href="https://wa.me/5491132053335?text=${encodeURIComponent('Hola! Quiero verificar el estado de mi pedido #' + orderId)}" 
               class="btn-pay enabled" style="display:inline-block;text-decoration:none;padding:12px 28px;">Consultar por WhatsApp</a>
          </div>
        `;
      });
    } else if (isFailure) {
      checkoutPage.innerHTML = `
        <div style="text-align:center;padding:60px 20px;">
          <div style="font-size:3rem;margin-bottom:16px;">❌</div>
          <h2 style="color:#e74c3c;margin-bottom:12px;">El pago no se pudo procesar</h2>
          <p style="color:var(--light);margin-bottom:24px;">Hubo un problema con tu pago. Podés intentar de nuevo o elegir otro método de pago.</p>
          <a href="checkout.html" class="btn-pay enabled" style="display:inline-block;text-decoration:none;padding:12px 28px;">Intentar de nuevo</a>
        </div>
      `;
    }
  })();

  const checkoutItems = document.getElementById('checkoutItems');
  if (checkoutItems) {
    const WSP_NUMBER = '5491132053335';

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
        <span class="checkout-item-name">${item.name} (x${item.qty}) - Talle ${item.size}${(typeof US_SIZES_MAP !== 'undefined' && US_SIZES_MAP[String(item.size)]) ? ' (US ' + US_SIZES_MAP[String(item.size)] + ')' : ''}</span>
        <span class="checkout-item-price">${Cart.formatPrice(item.price * item.qty)}</span>
      `;
      checkoutItems.appendChild(div);
    });

    let chkSubtotal = document.getElementById('chkSubtotal');
    let chkTotal = document.getElementById('chkTotal');
    let chkDiscount = document.getElementById('chkDiscount');
    let chkDiscountLine = document.getElementById('discountLine');
    let shippingLabel = document.getElementById('shippingLabel');
    let shippingCost = document.getElementById('shippingCost');
    let paymentMsg = document.getElementById('paymentMsg');
    let zonaInfo = document.getElementById('zonaInfo');
    let optionMP = document.getElementById('optionMP');
    let optionEfectivo = document.getElementById('optionEfectivo');

    function computePromoBreakdown(paymentMethod) {
      const isEfectivo = paymentMethod === 'efectivo' || paymentMethod === 'transferencia';

      // Contar unidades y precio unitario promedio por tipo
      let f11 = 0, f5 = 0;
      let f11Total = 0, f5Total = 0;
      items.forEach(item => {
        let qty = item.qty || 1;
        if (item.category === 'f11' || item.category === 'mixtos') {
          f11 += qty;
          f11Total += item.price * qty;
        } else {
          f5 += qty;
          f5Total += item.price * qty;
        }
      });

      let f11Unit = f11 > 0 ? f11Total / f11 : 0;
      let f5Unit = f5 > 0 ? f5Total / f5 : 0;

      // --- Estrategia 1: Promos combo (aplican SIEMPRE) ---
      let totalCombo = 0;

      // Pares F11
      let f11Pairs = Math.floor(f11 / 2);
      totalCombo += f11Pairs * 230000;
      let remF11 = f11 - f11Pairs * 2;

      // Pares F5/Futsal
      let f5Pairs = Math.floor(f5 / 2);
      totalCombo += f5Pairs * 180000;
      let remF5 = f5 - f5Pairs * 2;

      // Combo mixto (1 F11 + 1 F5)
      let mixed = Math.min(remF11, remF5);
      totalCombo += mixed * 220000;
      remF11 -= mixed;
      remF5 -= mixed;

      // Sueltos: con 25% OFF si es efectivo/transferencia, sino precio normal
      if (isEfectivo) {
        totalCombo += remF11 * f11Unit * 0.75;
        totalCombo += remF5 * f5Unit * 0.75;
      } else {
        totalCombo += remF11 * f11Unit;
        totalCombo += remF5 * f5Unit;
      }

      // --- Estrategia 2: 25% OFF directo en todo (solo efectivo/transf) ---
      let total25 = isEfectivo ? subtotal * 0.75 : subtotal;

      // Tomar la mejor opción para el cliente
      let best = Math.round(Math.min(totalCombo, total25));
      return { effectiveSubtotal: best, savings: Math.round(subtotal - best) };
    }

    if (chkSubtotal) chkSubtotal.textContent = Cart.formatPrice(subtotal);

    function updateTotals() {
      let promo = computePromoBreakdown(currentPayment);
      let total = promo.effectiveSubtotal + currentShipping;
      let discountLabel = document.getElementById('discountLabel');
      if (promo.savings > 0) {
        if (chkDiscount) chkDiscount.textContent = '− ' + Cart.formatPrice(promo.savings);
        if (chkDiscountLine) chkDiscountLine.style.display = '';
        if (discountLabel) {
          let isEf = currentPayment === 'efectivo' || currentPayment === 'transferencia';
          discountLabel.textContent = isEf ? 'Promo + desc. ef./transf. 🎉' : 'Promo combo 🎉';
        }
      } else {
        if (chkDiscountLine) chkDiscountLine.style.display = 'none';
      }
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

    // Calcular totales con promo al cargar la página
    updateTotals();

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
        updateTotals();
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
      let promo = computePromoBreakdown(currentPayment);
      let total = promo.effectiveSubtotal + currentShipping;

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

    function buildEmailParams(orderId) {
      let nombre = document.getElementById('chkNombre').value.trim();
      let apellido = document.getElementById('chkApellido').value.trim();
      let email = document.getElementById('chkEmail').value.trim();
      let telefono = document.getElementById('chkTelefono').value.trim();
      let direccion = document.getElementById('chkDireccion').value.trim();
      let ciudad = document.getElementById('chkCiudad').value.trim();
      let provincia = document.getElementById('chkProvincia').value.trim();
      let cp = document.getElementById('chkCP').value.trim();
      let mensaje = document.getElementById('chkMensaje').value.trim();
      let shippingText = (currentZona === 'caba' || currentZona === 'amba') ? Cart.formatPrice(10000) + ' (moto)' : 'A coordinar';
      let zonaText = currentZona === 'caba' ? 'CABA' : currentZona === 'amba' ? 'AMBA' : 'Otra zona';
      let payText = currentPayment === 'mercadopago' ? 'Mercado Pago' : currentPayment === 'transferencia' ? 'Transferencia bancaria' : 'Efectivo';
      let promo = computePromoBreakdown(currentPayment);
      let total = promo.effectiveSubtotal + currentShipping;
      let now = new Date();
      let fecha = now.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
      let hora = now.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });

      let itemsText = items.map((item, i) => {
        let codeTag = item.productCode ? `#${item.productCode} - ` : '';
        return `${i + 1}. ${codeTag}${item.name}\n   Talle: ${item.size} | Cantidad: ${item.qty} | Precio: ${Cart.formatPrice(item.price * item.qty)}`;
      }).join('\n\n');

      let totalQty = items.reduce((sum, i) => sum + i.qty, 0);

      return {
        order_number: orderId || '—',
        order_date: `${fecha} a las ${hora}`,
        customer_name: `${nombre} ${apellido}`,
        customer_email: email,
        customer_phone: telefono,
        customer_address: direccion,
        customer_city: `${ciudad}, ${provincia}`,
        customer_cp: cp,
        customer_zone: zonaText,
        customer_message: mensaje || 'Sin mensaje',
        order_items: itemsText,
        order_qty: totalQty.toString(),
        order_subtotal: Cart.formatPrice(subtotal),
        order_shipping: shippingText,
        order_total: Cart.formatPrice(total),
        payment_method: payText
      };
    }

    function sendEmailNotification(orderId) {
      try {
        fetch('/send-email.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(buildEmailParams(orderId))
        }).catch(() => {});
      } catch (e) {
        console.warn('Email error:', e);
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
      btnPay.addEventListener('click', async () => {
        if (!validateForm()) return;

        btnPay.textContent = 'Verificando stock...';
        btnPay.classList.remove('enabled');

        // Verificar stock y precios reales desde Firestore
        try {
          let productIds = [...new Set(items.map(i => i.id))];
          let realPrices = {};
          let realSizeStocks = {}; // { productId: { sizeArg: stock } }
          for (let pid of productIds) {
            let doc = await db.collection('products').doc(pid).get();
            if (doc.exists) {
              let data = doc.data();
              realPrices[pid] = data.price;
              realSizeStocks[pid] = {};
              (data.sizes || []).forEach(s => {
                realSizeStocks[pid][String(s.arg || s)] = s.stock || 0;
              });
            }
          }

          // Verificar stock suficiente por talle
          for (let item of items) {
            let sizeStocks = realSizeStocks[item.id] || {};
            let available = sizeStocks[item.size] || 0;
            if (available < item.qty) {
              let itemName = item.name || 'Producto';
              btnPay.textContent = 'Confirmar pedido';
              btnPay.classList.add('enabled');
              Cart.showToast(`Sin stock de "${itemName}" talle ${item.size} (disponible: ${available})`);
              return;
            }
          }

          // Reemplazar precios del carrito con los reales de la BD
          items.forEach(item => {
            if (realPrices[item.id] !== undefined) {
              item.price = realPrices[item.id];
            }
          });
          subtotal = items.reduce((sum, i) => sum + i.price * i.qty, 0);
        } catch (e) {
          console.warn('No se pudieron validar precios/stock:', e);
          btnPay.textContent = 'Confirmar pedido';
          btnPay.classList.add('enabled');
          Cart.showToast('Error al verificar stock. Intentá de nuevo.');
          return;
        }

        let promoResult = computePromoBreakdown(currentPayment);
        let effectiveSubtotal = promoResult.effectiveSubtotal;

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
          subtotal: effectiveSubtotal,
          shipping: currentShipping,
          total: effectiveSubtotal + currentShipping,
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

        db.collection('orders').add(orderData).then(async docRef => {
          // Decrementar stock por talle en Firestore
          try {
            // Agrupar qty por producto+talle
            let qtyByProductSize = {};
            items.forEach(item => {
              let key = item.id;
              if (!qtyByProductSize[key]) qtyByProductSize[key] = {};
              qtyByProductSize[key][item.size] = (qtyByProductSize[key][item.size] || 0) + item.qty;
            });
            for (let pid in qtyByProductSize) {
              let prodDoc = await db.collection('products').doc(pid).get();
              if (prodDoc.exists) {
                let data = prodDoc.data();
                let sizes = data.sizes || [];
                let totalStock = 0;
                sizes.forEach(s => {
                  let sizeArg = String(s.arg || s);
                  if (qtyByProductSize[pid][sizeArg]) {
                    s.stock = Math.max(0, (s.stock || 0) - qtyByProductSize[pid][sizeArg]);
                  }
                  totalStock += (s.stock || 0);
                });
                await db.collection('products').doc(pid).update({ sizes: sizes, stock: totalStock });
              }
            }
          } catch (e) {
            console.warn('Error al actualizar stock:', e);
          }

          if (currentPayment === 'mercadopago') {
            // Crear preferencia de pago en MercadoPago via serverless function
            const baseUrl = window.location.origin;
            fetch('/create-preference.php', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                items: items.map(i => ({ id: i.id, name: i.name + ' - Talle ' + i.size, size: i.size, qty: i.qty, price: i.price })),
                payer: {
                  name: document.getElementById('chkNombre').value.trim(),
                  surname: document.getElementById('chkApellido').value.trim(),
                  email: document.getElementById('chkEmail').value.trim(),
                  phone: document.getElementById('chkTelefono').value.trim(),
                  address: document.getElementById('chkDireccion').value.trim(),
                  zip_code: document.getElementById('chkCP').value.trim()
                },
                shipment_cost: currentShipping,
                order_id: docRef.id,
                back_url: baseUrl
              })
            })
            .then(r => r.json())
            .then(data => {
              if (data.init_point) {
                // Guardar datos del email ANTES de limpiar el carrito
                try {
                  const emailParams = buildEmailParams(docRef.id);
                  localStorage.setItem('mp_pending_email', JSON.stringify(emailParams));
                } catch(e) { /* silent */ }
                // Guardar order id para cuando vuelva de MP
                localStorage.setItem('mp_pending_order', docRef.id);
                Cart.clear();
                // Redirigir a MercadoPago
                window.location.href = data.init_point;
              } else {
                throw new Error(data.detail || data.error || 'No se pudo crear el pago');
              }
            })
            .catch(err => {
              console.error('MP error:', err);
              btnPay.textContent = 'Confirmar y pagar';
              btnPay.classList.add('enabled');
              let msg = err.message || '';
              if (msg.includes('Stock insuficiente') || msg.includes('stock')) {
                Cart.showToast('Stock insuficiente. Revisá tu carrito.');
              } else {
                Cart.showToast('Error de Mercado Pago: ' + msg);
              }
            });
          } else {
            sendEmailNotification(docRef.id);
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
