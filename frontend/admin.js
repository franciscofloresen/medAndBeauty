// admin.js

document.addEventListener('DOMContentLoaded', () => {
    // --- Verificación de Autenticación ---
    const token = localStorage.getItem('authToken');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    // --- CONSTANTES DE API ---
    const API_BASE_URL = 'https://api.distribuidoramedandbeauty.com/api';
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };

    // --- ELEMENTOS DEL DOM: GLOBALES ---
    const logoutButton = document.getElementById('logout-button');

    // --- ELEMENTOS DEL DOM: PRODUCTOS ---
    const productsTableBody = document.getElementById('products-table-body');
    const addProductBtn = document.getElementById('add-product-btn');
    const productModal = document.getElementById('product-modal');
    const productModalTitle = document.getElementById('modal-title');
    const productForm = document.getElementById('product-form');
    const productCancelBtn = document.getElementById('cancel-btn');

    // --- ELEMENTOS DEL DOM: PROMOCIONES ---
    const promosTableBody = document.getElementById('promos-table-body');
    const addPromoBtn = document.getElementById('add-promo-btn');
    const promoModal = document.getElementById('promo-modal');
    const promoModalTitle = document.getElementById('promo-modal-title');
    const promoForm = document.getElementById('promo-form');
    const promoCancelBtn = document.getElementById('promo-cancel-btn');


    // --- LÓGICA DE PRODUCTOS ---

    async function loadProducts() {
        try {
            const response = await fetch(`${API_BASE_URL}/admin/productos`, { headers });
            if (!response.ok) {
                if(response.status === 401 || response.status === 403) {
                    localStorage.removeItem('authToken');
                    window.location.href = 'login.html';
                }
                throw new Error('Error al cargar productos');
            }
            const products = await response.json();
            productsTableBody.innerHTML = '';
            products.forEach(product => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td class="px-6 py-4 whitespace-nowrap">${product.Producto}</td>
                    <td class="px-6 py-4 whitespace-nowrap">${product.SKU || ''}</td>
                    <td class="px-6 py-4 whitespace-nowrap">${product.Precio_de_venta_con_IVA}</td>
                    <td class="px-6 py-4 whitespace-nowrap">${product.Stock}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button class="text-indigo-600 hover:text-indigo-900 edit-product-btn" data-id="${product.ID}">Editar</button>
                        <button class="text-red-600 hover:text-red-900 ml-4 delete-product-btn" data-id="${product.ID}">Eliminar</button>
                    </td>
                `;
                productsTableBody.appendChild(row);
            });
        } catch (error) {
            console.error(error);
        }
    }

    function openProductModal(product = null) {
        productForm.reset();
        if (product) {
            productModalTitle.textContent = 'Editar Producto';
            document.getElementById('product-id').value = product.ID;
            document.getElementById('producto-nombre').value = product.Producto;
            document.getElementById('producto-sku').value = product.SKU;
            document.getElementById('producto-precio').value = product.Precio_de_venta_con_IVA;
            document.getElementById('producto-stock').value = product.Stock;
            document.getElementById('producto-proveedor').value = product.Proveedor;
            document.getElementById('producto-imagen').value = product.URL_Imagen;
            document.getElementById('producto-descripcion').value = product.Descripcion;
            document.getElementById('producto-registro-sanitario').checked = product.RegistroSanitario;
        } else {
            productModalTitle.textContent = 'Agregar Producto';
            document.getElementById('product-id').value = '';
        }
        productModal.classList.add('is-open');
    }

    function closeProductModal() {
        productModal.classList.remove('is-open');
    }

    async function handleProductFormSubmit(e) {
        e.preventDefault();
        const id = document.getElementById('product-id').value;

        const productData = {
            Producto: document.getElementById('producto-nombre').value,
            SKU: document.getElementById('producto-sku').value,
            Precio_de_venta_con_IVA: document.getElementById('producto-precio').value,
            Stock: document.getElementById('producto-stock').value,
            Proveedor: document.getElementById('producto-proveedor').value,
            URL_Imagen: document.getElementById('producto-imagen').value,
            Descripcion: document.getElementById('producto-descripcion').value,
            RegistroSanitario: document.getElementById('producto-registro-sanitario').checked
        };

        const method = id ? 'PUT' : 'POST';
        const url = id ? `${API_BASE_URL}/productos/${id}` : `${API_BASE_URL}/productos`;

        try {
            const response = await fetch(url, { method, headers, body: JSON.stringify(productData) });
            if (!response.ok) throw new Error('Error al guardar el producto');
            closeProductModal();
            loadProducts();
        } catch (error) {
            console.error(error);
            alert('No se pudo guardar el producto.');
        }
    }

    async function handleProductsTableClick(e) {
        const target = e.target;
        const id = target.dataset.id;

        if (target.classList.contains('edit-product-btn')) {
            const response = await fetch(`${API_BASE_URL}/admin/productos`, { headers });
            const products = await response.json();
            const product = products.find(p => p.ID == id);
            openProductModal(product);
        }

        if (target.classList.contains('delete-product-btn')) {
            if (confirm('¿Estás seguro de que quieres eliminar este producto?')) {
                try {
                    await fetch(`${API_BASE_URL}/productos/${id}`, { method: 'DELETE', headers });
                    loadProducts();
                } catch (error) {
                    alert('No se pudo eliminar el producto.');
                }
            }
        }
    }

    // --- LÓGICA DE PROMOCIONES ---

    async function loadPromos() {
        try {
            const response = await fetch(`${API_BASE_URL}/admin/promociones`, { headers });
            const promos = await response.json();
            promosTableBody.innerHTML = '';
            promos.forEach(promo => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td class="px-6 py-4 whitespace-nowrap">${promo.Titulo}</td>
                    <td class="px-6 py-4 whitespace-nowrap">${promo.Activa ? 'Sí' : 'No'}</td>
                    <td class="px-6 py-4 whitespace-nowrap">${promo.Orden}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button class="text-indigo-600 hover:text-indigo-900 edit-promo-btn" data-id="${promo.ID}">Editar</button>
                        <button class="text-red-600 hover:text-red-900 ml-4 delete-promo-btn" data-id="${promo.ID}">Eliminar</button>
                    </td>
                `;
                promosTableBody.appendChild(row);
            });
        } catch (error) {
            console.error('Error al cargar promociones:', error);
        }
    }

    function openPromoModal(promo = null) {
        promoForm.reset();
        if (promo) {
            promoModalTitle.textContent = 'Editar Promoción';
            document.getElementById('promo-id').value = promo.ID;
            document.getElementById('promo-titulo').value = promo.Titulo;
            document.getElementById('promo-subtitulo').value = promo.Subtitulo;
            document.getElementById('promo-texto-boton').value = promo.TextoBoton;
            document.getElementById('promo-enlace-boton').value = promo.EnlaceBoton;
            document.getElementById('promo-imagen').value = promo.URL_Imagen;
            document.getElementById('promo-orden').value = promo.Orden;
            document.getElementById('promo-activa').checked = promo.Activa;
        } else {
            promoModalTitle.textContent = 'Agregar Promoción';
            document.getElementById('promo-id').value = '';
        }
        promoModal.classList.add('is-open');
    }

    function closePromoModal() {
        promoModal.classList.remove('is-open');
    }

    async function handlePromoFormSubmit(e) {
        e.preventDefault();
        const id = document.getElementById('promo-id').value;
        const promoData = {
            Titulo: document.getElementById('promo-titulo').value,
            Subtitulo: document.getElementById('promo-subtitulo').value,
            TextoBoton: document.getElementById('promo-texto-boton').value,
            EnlaceBoton: document.getElementById('promo-enlace-boton').value,
            URL_Imagen: document.getElementById('promo-imagen').value,
            Orden: document.getElementById('promo-orden').value,
            Activa: document.getElementById('promo-activa').checked,
        };

        const method = id ? 'PUT' : 'POST';
        const url = id ? `${API_BASE_URL}/admin/promociones/${id}` : `${API_BASE_URL}/admin/promociones`;

        try {
            const response = await fetch(url, { method, headers, body: JSON.stringify(promoData) });
            if (!response.ok) throw new Error('Error al guardar la promoción');
            closePromoModal();
            loadPromos();
        } catch (error) {
            console.error(error);
            alert('No se pudo guardar la promoción.');
        }
    }

    async function handlePromosTableClick(e) {
        const target = e.target;
        const id = target.dataset.id;

        if (target.classList.contains('edit-promo-btn')) {
            const response = await fetch(`${API_BASE_URL}/admin/promociones`, { headers });
            const promos = await response.json();
            const promo = promos.find(p => p.ID == id);
            openPromoModal(promo);
        }

        if (target.classList.contains('delete-promo-btn')) {
            if (confirm('¿Estás seguro de que quieres eliminar esta promoción?')) {
                try {
                    await fetch(`${API_BASE_URL}/admin/promociones/${id}`, { method: 'DELETE', headers });
                    loadPromos();
                } catch (error) {
                    alert('No se pudo eliminar la promoción.');
                }
            }
        }
    }

    // --- CERRAR SESIÓN ---
    function logout() {
        localStorage.removeItem('authToken');
        window.location.href = 'login.html';
    }

    // --- ASIGNACIÓN DE EVENTOS ---
    addProductBtn.addEventListener('click', () => openProductModal());
    productCancelBtn.addEventListener('click', closeProductModal);
    productForm.addEventListener('submit', handleProductFormSubmit);
    productsTableBody.addEventListener('click', handleProductsTableClick);

    addPromoBtn.addEventListener('click', () => openPromoModal());
    promoCancelBtn.addEventListener('click', closePromoModal);
    promoForm.addEventListener('submit', handlePromoFormSubmit);
    promosTableBody.addEventListener('click', handlePromosTableClick);

    logoutButton.addEventListener('click', logout);

    // --- CARGA INICIAL ---
    loadProducts();
    loadPromos();
});
