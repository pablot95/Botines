const ALL_SIZES = [
  { us: '6.5', cm: '24.5', eur: '39', arg: '38' },
  { us: '7', cm: '25', eur: '40', arg: '39' },
  { us: '7.5', cm: '25.5', eur: '40.5', arg: '39.5' },
  { us: '8', cm: '26', eur: '41', arg: '40' },
  { us: '8.5', cm: '26.5', eur: '42', arg: '41' },
  { us: '9', cm: '27', eur: '42.5', arg: '41.5' },
  { us: '9.5', cm: '27.5', eur: '43', arg: '42' },
  { us: '10', cm: '28', eur: '44', arg: '43' },
  { us: '10.5', cm: '28.5', eur: '44.5', arg: '43.5' },
  { us: '11', cm: '29', eur: '45', arg: '44' },
  { us: '11.5', cm: '29.5', eur: '45.5', arg: '44.5' },
  { us: '12', cm: '30', eur: '46', arg: '45' }
];

document.addEventListener('DOMContentLoaded', () => {

  const loginScreen = document.getElementById('loginScreen');
  const adminApp = document.getElementById('adminApp');
  const loginForm = document.getElementById('loginForm');
  const loginError = document.getElementById('loginError');
  const logoutBtn = document.getElementById('logoutBtn');

  let loggedIn = sessionStorage.getItem('botinesfv_admin') === '1';

  if (loggedIn) {
    loginScreen.style.display = 'none';
    adminApp.style.display = 'flex';
    loadProducts();
    loadOrders();
  }

  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    let user = document.getElementById('loginEmail').value.trim();
    let password = document.getElementById('loginPassword').value;
    loginError.textContent = '';

    if (user === 'BotinesFV' && password === 'BotinesFV2026') {
      sessionStorage.setItem('botinesfv_admin', '1');
      loginScreen.style.display = 'none';
      adminApp.style.display = 'flex';
      loadProducts();
      loadOrders();
    } else {
      loginError.textContent = 'Credenciales incorrectas';
    }
  });

  logoutBtn.addEventListener('click', () => {
    sessionStorage.removeItem('botinesfv_admin');
    loginScreen.style.display = 'flex';
    adminApp.style.display = 'none';
  });

  document.querySelectorAll('.admin-nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.admin-nav-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
      document.getElementById('section' + btn.dataset.section.charAt(0).toUpperCase() + btn.dataset.section.slice(1)).classList.add('active');
    });
  });

  const btnNewProduct = document.getElementById('btnNewProduct');
  const productModal = document.getElementById('productModal');
  const modalBackdrop = document.getElementById('modalBackdrop');
  const modalClose = document.getElementById('modalClose');
  const modalCancel = document.getElementById('modalCancel');
  const modalTitle = document.getElementById('modalTitle');
  const productForm = document.getElementById('productForm');
  const sizesGrid = document.getElementById('sizesGrid');
  const imagePreview = document.getElementById('imagePreview');
  const existingImages = document.getElementById('existingImages');

  let editingProductImages = [];

  ALL_SIZES.forEach(size => {
    let label = document.createElement('label');
    label.innerHTML = `<input type="checkbox" name="size" value="${size.arg}"> ${size.arg} (US ${size.us})`;
    sizesGrid.appendChild(label);
  });

  function openModal() {
    productModal.style.display = 'block';
    modalBackdrop.style.display = 'block';
  }

  function closeModal() {
    productModal.style.display = 'none';
    modalBackdrop.style.display = 'none';
    productForm.reset();
    document.getElementById('productId').value = '';
    imagePreview.innerHTML = '';
    existingImages.innerHTML = '';
    editingProductImages = [];
    sizesGrid.querySelectorAll('input').forEach(c => c.checked = false);
  }

  btnNewProduct.addEventListener('click', () => {
    modalTitle.textContent = 'Nuevo producto';
    closeModal();
    openModal();
  });

  modalClose.addEventListener('click', closeModal);
  modalCancel.addEventListener('click', closeModal);
  modalBackdrop.addEventListener('click', closeModal);

  document.getElementById('pImages').addEventListener('change', (e) => {
    imagePreview.innerHTML = '';
    Array.from(e.target.files).forEach(file => {
      let reader = new FileReader();
      reader.onload = (ev) => {
        let img = document.createElement('img');
        img.src = ev.target.result;
        imagePreview.appendChild(img);
      };
      reader.readAsDataURL(file);
    });
  });

  let isSaving = false;

  productForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (isSaving) return;
    isSaving = true;
    let submitBtn = productForm.querySelector('button[type="submit"]');
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Guardando...'; }

    try {
    let id = document.getElementById('productId').value;
    let name = document.getElementById('pName').value.trim();
    let category = document.getElementById('pCategory').value;
    let price = parseInt(document.getElementById('pPrice').value);
    let stock = parseInt(document.getElementById('pStock').value) || 0;
    let featured = document.getElementById('pFeatured').checked;
    let description = document.getElementById('pDescription').value.trim();

    let selectedSizes = [];
    sizesGrid.querySelectorAll('input:checked').forEach(c => {
      let sizeObj = ALL_SIZES.find(s => s.arg === c.value);
      if (sizeObj) selectedSizes.push(sizeObj);
    });

    let imageUrls = [...editingProductImages];

    let files = document.getElementById('pImages').files;
    if (files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        let file = files[i];
        let fileName = Date.now() + '_' + file.name;
        let ref = storage.ref('products/' + fileName);
        let snapshot = await ref.put(file);
        let url = await snapshot.ref.getDownloadURL();
        imageUrls.push(url);
      }
    }

    let productData = {
      name,
      category,
      price,
      stock,
      featured,
      description,
      sizes: selectedSizes,
      images: imageUrls,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    if (id) {
      await db.collection('products').doc(id).update(productData);
    } else {
      // Auto-generate productCode
      let maxCode = 0;
      let allDocs = await db.collection('products').get();
      allDocs.forEach(d => {
        let c = d.data().productCode || 0;
        if (c > maxCode) maxCode = c;
      });
      productData.productCode = maxCode + 1;
      productData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
      await db.collection('products').add(productData);
    }

    closeModal();
    loadProducts();
    } catch (err) {
      console.error('Error al guardar producto:', err);
      alert('Error al guardar el producto. Intentá de nuevo.');
    } finally {
      isSaving = false;
      let submitBtn = productForm.querySelector('button[type="submit"]');
      if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Guardar producto'; }
    }
  });

  function formatPrice(n) {
    return '$' + Number(n).toLocaleString('es-AR');
  }

  function loadProducts() {
    db.collection('products').orderBy('createdAt', 'desc').get().then(snapshot => {
      let tbody = document.getElementById('productsTableBody');
      tbody.innerHTML = '';
      if (snapshot.empty) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--gray);padding:30px">No hay productos cargados</td></tr>';
        return;
      }
      snapshot.forEach(doc => {
        let p = doc.data();
        let tr = document.createElement('tr');
        let imgSrc = (p.images && p.images.length > 0) ? p.images[0] : '../images/logo.jpeg';
        tr.innerHTML = `
          <td><img src="${imgSrc}" alt="${p.name}"></td>
          <td>${p.name} <small style="color:#999;font-weight:400">#${p.productCode || '—'}</small></td>
          <td>${p.category === 'f11' ? 'Fútbol 11' : p.category === 'f5' ? 'Fútbol 5' : p.category === 'futsal' ? 'Futsal' : p.category === 'mixtos' ? 'Mixtos' : p.category === 'kids' ? 'Kids' : (p.category || '')}</td>
          <td>${formatPrice(p.price)}</td>
          <td><span class="badge-stock ${(p.stock || 0) > 0 ? 'in-stock' : 'no-stock'}">${p.stock || 0}</span></td>
          <td>${p.featured ? '<span class="badge-featured">Sí</span>' : 'No'}</td>
          <td>
            <div class="actions-cell">
              <button class="btn-edit" data-id="${doc.id}">Editar</button>
              <button class="btn-delete" data-id="${doc.id}">Eliminar</button>
            </div>
          </td>
        `;
        tbody.appendChild(tr);
      });

      tbody.querySelectorAll('.btn-edit').forEach(btn => {
        btn.addEventListener('click', () => editProduct(btn.dataset.id));
      });

      tbody.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', () => deleteProduct(btn.dataset.id));
      });
    });
  }

  function editProduct(id) {
    db.collection('products').doc(id).get().then(doc => {
      if (!doc.exists) return;
      let p = doc.data();
      modalTitle.textContent = 'Editar producto';
      document.getElementById('productId').value = id;
      document.getElementById('pName').value = p.name || '';
      document.getElementById('pCategory').value = p.category || '';
      document.getElementById('pPrice').value = p.price || 0;
      document.getElementById('pStock').value = p.stock || 0;
      document.getElementById('pFeatured').checked = p.featured || false;
      document.getElementById('pDescription').value = p.description || '';

      sizesGrid.querySelectorAll('input').forEach(c => {
        c.checked = (p.sizes || []).some(s => String(s.arg) === c.value);
      });

      editingProductImages = p.images || [];
      existingImages.innerHTML = '';
      editingProductImages.forEach((url, idx) => {
        let wrap = document.createElement('div');
        wrap.className = 'admin-existing-image-wrap';
        wrap.innerHTML = `
          <img src="${url}" alt="Imagen ${idx + 1}">
          <button type="button" class="remove-img" data-idx="${idx}">&times;</button>
        `;
        wrap.querySelector('.remove-img').addEventListener('click', () => {
          editingProductImages.splice(idx, 1);
          loadExistingImages();
        });
        existingImages.appendChild(wrap);
      });

      imagePreview.innerHTML = '';
      openModal();
    });
  }

  function loadExistingImages() {
    existingImages.innerHTML = '';
    editingProductImages.forEach((url, idx) => {
      let wrap = document.createElement('div');
      wrap.className = 'admin-existing-image-wrap';
      wrap.innerHTML = `
        <img src="${url}" alt="Imagen ${idx + 1}">
        <button type="button" class="remove-img" data-idx="${idx}">&times;</button>
      `;
      wrap.querySelector('.remove-img').addEventListener('click', () => {
        editingProductImages.splice(idx, 1);
        loadExistingImages();
      });
      existingImages.appendChild(wrap);
    });
  }

  function deleteProduct(id) {
    if (!confirm('¿Estás seguro de que querés eliminar este producto?')) return;
    db.collection('products').doc(id).delete().then(() => {
      loadProducts();
    });
  }

  const orderDetailModal = document.getElementById('orderDetailModal');
  const orderModalClose = document.getElementById('orderModalClose');

  orderModalClose.addEventListener('click', () => {
    orderDetailModal.style.display = 'none';
    modalBackdrop.style.display = 'none';
  });

  function loadOrders() {
    db.collection('orders').orderBy('createdAt', 'desc').get().then(snapshot => {
      let tbody = document.getElementById('ordersTableBody');
      tbody.innerHTML = '';
      if (snapshot.empty) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--gray);padding:30px">No hay órdenes</td></tr>';
        return;
      }
      snapshot.forEach(doc => {
        let o = doc.data();
        let dateStr = o.createdAt ? new Date(o.createdAt.seconds * 1000).toLocaleDateString('es-AR') : '-';
        let statusClass = o.status || 'pending';
        let statusText = o.status === 'completed' ? 'Completada' : o.status === 'cancelled' ? 'Cancelada' : 'Pendiente';
        let tr = document.createElement('tr');
        tr.innerHTML = `
          <td style="font-size:0.72rem">${doc.id.substring(0, 8)}...</td>
          <td>${o.customer ? (o.customer.nombre + ' ' + o.customer.apellido) : '-'}</td>
          <td>${o.customer ? o.customer.email : '-'}</td>
          <td>${formatPrice(o.total || 0)}</td>
          <td><span class="badge-status ${statusClass}">${statusText}</span></td>
          <td>${dateStr}</td>
          <td>
            <div class="actions-cell">
              <button class="btn-view" data-id="${doc.id}">Ver</button>
            </div>
          </td>
        `;
        tbody.appendChild(tr);
      });

      tbody.querySelectorAll('.btn-view').forEach(btn => {
        btn.addEventListener('click', () => viewOrder(btn.dataset.id));
      });
    });
  }

  function viewOrder(id) {
    db.collection('orders').doc(id).get().then(doc => {
      if (!doc.exists) return;
      let o = doc.data();
      let body = document.getElementById('orderDetailBody');
      let dateStr = o.createdAt ? new Date(o.createdAt.seconds * 1000).toLocaleString('es-AR') : '-';

      let itemsHtml = '';
      if (o.items && o.items.length > 0) {
        itemsHtml = `
          <div class="order-items-list">
            <h4 style="font-family:var(--font-heading);font-size:0.85rem;letter-spacing:1.5px;text-transform:uppercase;color:var(--gold-dark);margin-bottom:10px;">Productos</h4>
            <table>
              <thead>
                <tr><th>Producto</th><th>Categoría</th><th>Talle</th><th>Cant.</th><th>Precio</th></tr>
              </thead>
              <tbody>
                ${o.items.map(i => `<tr><td>${i.name}</td><td>${i.category || i.brand || ''}</td><td>${i.size}</td><td>${i.qty}</td><td>${formatPrice(i.price * i.qty)}</td></tr>`).join('')}
              </tbody>
            </table>
          </div>
        `;
      }

      let billingHtml = '';
      if (o.billing) {
        billingHtml = `
          <div class="order-detail-section">
            <h4>Facturación</h4>
            <p><strong>Nombre:</strong> ${o.billing.nombre} ${o.billing.apellido}</p>
            <p><strong>Dirección:</strong> ${o.billing.direccion}</p>
            <p><strong>DNI/CUIT:</strong> ${o.billing.dni}</p>
            <p><strong>Teléfono:</strong> ${o.billing.telefono}</p>
          </div>
        `;
      }

      body.innerHTML = `
        <div class="order-detail-grid">
          <div class="order-detail-section">
            <h4>Cliente</h4>
            <p><strong>Nombre:</strong> ${o.customer ? (o.customer.nombre + ' ' + o.customer.apellido) : '-'}</p>
            <p><strong>Email:</strong> ${o.customer ? o.customer.email : '-'}</p>
            <p><strong>Teléfono:</strong> ${o.customer ? o.customer.telefono : '-'}</p>
            <p><strong>Dirección:</strong> ${o.customer ? o.customer.direccion : '-'}</p>
            ${o.customer && o.customer.mensaje ? `<p><strong>Mensaje:</strong> ${o.customer.mensaje}</p>` : ''}
          </div>
          <div class="order-detail-section">
            <h4>Orden</h4>
            <p><strong>ID:</strong> ${doc.id}</p>
            <p><strong>Fecha:</strong> ${dateStr}</p>
            <p><strong>Subtotal:</strong> ${formatPrice(o.subtotal || 0)}</p>
            <p><strong>Envío:</strong> ${formatPrice(o.shipping || 0)}</p>
            <p><strong>Total:</strong> ${formatPrice(o.total || 0)}</p>
            <p><strong>Estado:</strong> ${o.status === 'completed' ? 'Completada' : o.status === 'cancelled' ? 'Cancelada' : 'Pendiente'}</p>
          </div>
          ${billingHtml}
        </div>
        ${itemsHtml}
      `;

      orderDetailModal.style.display = 'block';
      modalBackdrop.style.display = 'block';
    });
  }

});
