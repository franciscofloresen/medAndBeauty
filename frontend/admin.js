// admin.js

document.addEventListener('DOMContentLoaded', () => {
    // --- Verificación de Autenticación ---
    const token = localStorage.getItem('authToken');
    if (!token) {
        window.location.href = 'login.html'; // Si no hay token, redirige al login
        return;
    }

    // --- Elementos del DOM ---
    const tableBody = document.getElementById('products-table-body');
    const addProductBtn = document.getElementById('add-product-btn');
    const modal = document.getElementById('product-modal');
    const modalTitle = document.getElementById('modal-title');
    const productForm = document.getElementById('product-form');
    const cancelBtn = document.getElementById('cancel-btn');
    const logoutButton = document.getElementById('logout-button');

    // --- API URL y Headers ---
    const API_URL = 'http://localhost:3001/api/productos';
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };

    // --- Funciones ---

    // Cargar y mostrar todos los productos en la tabla
    async function loadProducts() {
        try {
            const response = await fetch('http://localhost:3001/api/admin/productos', { headers });
            if (!response.ok) {
                if(response.status === 401 || response.status === 403) {
                    localStorage.removeItem('authToken');
                    window.location.href = 'login.html';
                }
                throw new Error('Error al cargar productos');
            }
            const products = await response.json();
            tableBody.innerHTML = '';
            products.forEach(product => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td class="px-6 py-4 whitespace-nowrap">${product.Producto}</td>
                    <td class="px-6 py-4 whitespace-nowrap">${product.SKU || ''}</td>
                    <td class="px-6 py-4 whitespace-nowrap">${product.Precio_de_venta_con_IVA}</td>
                    <td class="px-6 py-4 whitespace-nowrap">${product.Stock}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button class="text-indigo-600 hover:text-indigo-900 edit-btn" data-id="${product.ID}">Editar</button>
                        <button class="text-red-600 hover:text-red-900 ml-4 delete-btn" data-id="${product.ID}">Eliminar</button>
                    </td>
                `;
                tableBody.appendChild(row);
            });
        } catch (error) {
            console.error(error);
        }
    }

    // Abrir el modal (para agregar o editar)
    function openModal(product = null) {
        productForm.reset();
        if (product) {
            modalTitle.textContent = 'Editar Producto';
            document.getElementById('product-id').value = product.ID;
            document.getElementById('producto-nombre').value = product.Producto;
            document.getElementById('producto-sku').value = product.SKU;
            document.getElementById('producto-precio').value = product.Precio_de_venta_con_IVA;
            document.getElementById('producto-stock').value = product.Stock;
            document.getElementById('producto-proveedor').value = product.Proveedor;
            document.getElementById('producto-imagen').value = product.URL_Imagen;
            document.getElementById('producto-descripcion').value = product.Descripcion; // Cargar descripción
        } else {
            modalTitle.textContent = 'Agregar Producto';
            document.getElementById('product-id').value = '';
        }
        modal.classList.add('is-open');
    }

    // Cerrar el modal
    function closeModal() {
        modal.classList.remove('is-open');
    }

    // Manejar el envío del formulario (Crear o Actualizar)
    async function handleFormSubmit(e) {
        e.preventDefault();
        const id = document.getElementById('product-id').value;
        const productData = {
            Producto: document.getElementById('producto-nombre').value,
            SKU: document.getElementById('producto-sku').value,
            Precio_de_venta_con_IVA: document.getElementById('producto-precio').value,
            Stock: document.getElementById('producto-stock').value,
            Proveedor: document.getElementById('producto-proveedor').value,
            URL_Imagen: document.getElementById('producto-imagen').value,
            Descripcion: document.getElementById('producto-descripcion').value // Enviar descripción
        };

        const method = id ? 'PUT' : 'POST';
        const url = id ? `${API_URL}/${id}` : API_URL;

        try {
            const response = await fetch(url, {
                method,
                headers,
                body: JSON.stringify(productData)
            });
            if (!response.ok) throw new Error('Error al guardar el producto');
            closeModal();
            loadProducts();
        } catch (error) {
            console.error(error);
            alert('No se pudo guardar el producto.');
        }
    }

    // Manejar clics en la tabla (para editar o eliminar)
    async function handleTableClick(e) {
        const target = e.target;
        const id = target.dataset.id;

        if (target.classList.contains('edit-btn')) {
            const response = await fetch(`http://localhost:3001/api/admin/productos`, { headers });
            const products = await response.json();
            const product = products.find(p => p.ID == id);
            openModal(product);
        }

        if (target.classList.contains('delete-btn')) {
            if (confirm('¿Estás seguro de que quieres eliminar este producto?')) {
                try {
                    const response = await fetch(`${API_URL}/${id}`, { method: 'DELETE', headers });
                    if (!response.ok) throw new Error('Error al eliminar');
                    loadProducts();
                } catch (error) {
                    console.error(error);
                    alert('No se pudo eliminar el producto.');
                }
            }
        }
    }

    // Cerrar sesión
    function logout() {
        localStorage.removeItem('authToken');
        window.location.href = 'login.html';
    }

    // --- Asignación de Eventos ---
    addProductBtn.addEventListener('click', () => openModal());
    cancelBtn.addEventListener('click', closeModal);
    productForm.addEventListener('submit', handleFormSubmit);
    tableBody.addEventListener('click', handleTableClick);
    logoutButton.addEventListener('click', logout);

    // --- Carga Inicial ---
    loadProducts();
});
