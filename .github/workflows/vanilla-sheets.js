(function(){
  'use strict';

  // ============================================
  // CONFIGURACIÓN DE GOOGLE SHEETS
  // ============================================
  const GOOGLE_SHEET_CONFIG = {
    // 🔥 REEMPLAZA ESTE ID CON EL DE TU GOOGLE SHEET
   sheetId: '1TDCVPDW3-4XNAqQNENii5h9e_e29naX23pmL78xBZCc',
    sheetName: 'Sheet1' // Nombre de la pestaña (por defecto Sheet1)
  };

  // ============================================
  // VARIABLE GLOBAL DE INVENTARIO
  // ============================================
  let inventoryData = [];
  let sheetsLoader = null;

  class FilterDropdown {
    constructor(root, options = {}){
      this.root = root;
      this.trigger = root.querySelector('.filter-trigger');
      this.menu = root.querySelector('.filter-menu');
      this.items = Array.from(root.querySelectorAll('.filter-item'));
      this.onFilterChange = options.onFilterChange || function(){};

      const active = this.items.find(i=> i.classList.contains('active'));
      this.selected = active ? active.dataset.value : (this.items[0] && this.items[0].dataset.value) || 'All Categories';
      this.open = false;

      this._bind();
      this._reflectSelection();
    }

    _bind(){
      this.trigger.addEventListener('click', (e)=>{ e.stopPropagation(); this.toggle(); });
      this.items.forEach(item => {
        item.addEventListener('click', (e)=>{ e.stopPropagation(); this._select(item); });
        item.addEventListener('keydown', (e)=>{
          if(e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this._select(item); }
        });
      });

      document.addEventListener('click', (e)=>{ if(this.open && !this.root.contains(e.target)) this.close(); });

      document.addEventListener('keydown', (e)=>{
        if(!this.open) return;
        if(e.key === 'Escape') { this.close(); this.trigger.focus(); }
      });
    }

    toggle(){ this.open ? this.close() : this.openMenu(); }

    openMenu(){
      this.root.classList.add('open');
      this.trigger.setAttribute('aria-expanded', 'true');
      this.open = true;
      try{ const panel = this.root.closest('.data-panel'); if(panel) panel.classList.add('filter-open'); }catch(e){}
      const sel = this.items.find(i=> i.classList.contains('active'));
      if(sel) sel.focus();
    }

    close(){
      this.root.classList.remove('open');
      this.trigger.setAttribute('aria-expanded', 'false');
      this.open = false;
      try{ const panel = this.root.closest('.data-panel'); if(panel) panel.classList.remove('filter-open'); }catch(e){}
    }

    _select(item){
      const value = item.dataset.value;
      this.items.forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      this.selected = value;
      this._reflectSelection();
      this.onFilterChange(value);
      this.close();
      this.trigger.focus();
    }

    _reflectSelection(){
      this.trigger.childNodes[0].textContent = this.selected + ' ';
      this.items.forEach(i => i.setAttribute('aria-selected', i.classList.contains('active')));
    }
  }

  class Pagination {
    constructor(container, opts = {}){
      this.container = container;
      this.countEl = container.querySelector('.count');
      this.nav = container.querySelector('.page-nav');

      this.totalItems = typeof opts.totalItems === 'number' ? opts.totalItems : 0;
      this.itemsPerPage = typeof opts.itemsPerPage === 'number' ? opts.itemsPerPage : 5;
      this.currentPage = typeof opts.currentPage === 'number' ? opts.currentPage : 1;

      this._render();
      this._bind();
      this._update();
    }

    _render(){
      this.nav.innerHTML = '';

      this.prevBtn = document.createElement('button');
      this.prevBtn.className = 'page-btn prev';
      this.prevBtn.innerHTML = '<i class="fa-solid fa-chevron-left"></i>';
      this.nav.appendChild(this.prevBtn);

      this.pagesWrap = document.createElement('div');
      this.pagesWrap.className = 'pages-wrap';
      this.pagesWrap.style.display = 'flex';
      this.pagesWrap.style.gap = '8px';
      this.nav.appendChild(this.pagesWrap);

      this.nextBtn = document.createElement('button');
      this.nextBtn.className = 'page-btn next';
      this.nextBtn.innerHTML = '<i class="fa-solid fa-chevron-right"></i>';
      this.nav.appendChild(this.nextBtn);

      this._renderPages();
    }

    _renderPages(){
      this.pagesWrap.innerHTML = '';
      const totalPages = this.totalPages;

      for(let p = 1; p <= totalPages; p++){
        const btn = document.createElement('button');
        btn.className = 'page-btn num';
        btn.textContent = String(p);
        btn.dataset.page = String(p);
        this.pagesWrap.appendChild(btn);
      }
    }

    _bind(){
      this.prevBtn.addEventListener('click', ()=> this.goTo(this.currentPage - 1));
      this.nextBtn.addEventListener('click', ()=> this.goTo(this.currentPage + 1));

      this.pagesWrap.addEventListener('click', (e)=>{
        const btn = e.target.closest('button.page-btn');
        if(!btn) return;
        const page = Number(btn.dataset.page);
        if(page) this.goTo(page);
      });
    }

    get totalPages(){ return Math.max(1, Math.ceil(this.totalItems / this.itemsPerPage)); }

    goTo(page){
      if(page < 1) page = 1;
      if(page > this.totalPages) page = this.totalPages;
      if(page === this.currentPage) return;
      this.currentPage = page;
      this._update();
    }

    setCurrentPage(page){
      this.currentPage = page;
      this._update();
    }

    updateTotalItems(total){
      this.totalItems = total;
      this._renderPages();
      if(this.currentPage > this.totalPages) this.currentPage = this.totalPages;
      this._update();
    }

    _update(){
      const start = (this.currentPage - 1) * this.itemsPerPage + 1;
      const end = Math.min(this.currentPage * this.itemsPerPage, this.totalItems);
      this.countEl.textContent = `Showing ${start}–${end} of ${this.totalItems} products`;

      if(this.currentPage <= 1){ this.prevBtn.classList.add('disabled'); } else { this.prevBtn.classList.remove('disabled'); }
      if(this.currentPage >= this.totalPages){ this.nextBtn.classList.add('disabled'); } else { this.nextBtn.classList.remove('disabled'); }

      const buttons = Array.from(this.pagesWrap.querySelectorAll('button.page-btn'));
      buttons.forEach(b => b.classList.toggle('active', Number(b.dataset.page) === this.currentPage));

      const activeBtn = buttons.find(b => Number(b.dataset.page) === this.currentPage);
      if(activeBtn){
        activeBtn.classList.add('animate');
        setTimeout(()=> activeBtn.classList.remove('animate'), 800);
      }

      this.container.dispatchEvent(new CustomEvent('pageChange', { detail: { currentPage: this.currentPage } }));
    }
  }

  // ============================================
  // FUNCIONES DE CARGA DE DATOS
  // ============================================
  
  async function loadInventoryFromGoogleSheets() {
    const loadingIndicator = showLoadingIndicator();
    
    try {
      if (!sheetsLoader) {
        sheetsLoader = new GoogleSheetsLoader(
          GOOGLE_SHEET_CONFIG.sheetId,
          GOOGLE_SHEET_CONFIG.sheetName
        );
      }

      inventoryData = await sheetsLoader.loadProducts();
      
      if (inventoryData.length === 0) {
        showNotification('⚠️ No se encontraron productos en la hoja', 'warning');
      } else {
        showNotification(`✅ ${inventoryData.length} productos cargados`, 'success');
      }

      return inventoryData;

    } catch (error) {
      console.error('Error cargando inventario:', error);
      showNotification('❌ Error al cargar datos. Usando datos de ejemplo.', 'error');
      
      // Fallback a datos de ejemplo
      inventoryData = getFallbackData();
      return inventoryData;
      
    } finally {
      hideLoadingIndicator(loadingIndicator);
    }
  }

  function getFallbackData() {
    return [
      { sku: 'WH-1001', name: 'Bluetooth Speaker', category: 'Electronics', status: 'In Stock', price: 49.99, thumb: 'BS' },
      { sku: 'WH-1002', name: 'Wireless Mouse', category: 'Electronics', status: 'In Stock', price: 25.50, thumb: 'WM' },
      { sku: 'WH-1003', name: 'Cargo Jacket', category: 'Apparel', status: 'Out of Stock', price: 79.95, thumb: 'CJ' },
      { sku: 'WH-1004', name: 'Ceramic Vase', category: 'Home', status: 'In Stock', price: 34.00, thumb: 'CV' },
      { sku: 'WH-1005', name: 'Leather Wallet', category: 'Accessories', status: 'In Stock', price: 45.00, thumb: 'LW' }
    ];
  }

  // ============================================
  // UI HELPERS
  // ============================================

  function showLoadingIndicator() {
    const loader = document.createElement('div');
    loader.id = 'loading-indicator';
    loader.innerHTML = `
      <div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); 
                  background: var(--glass-bg); padding: 2rem; border-radius: 20px; 
                  border: 1px solid var(--glass-border); z-index: 9999; 
                  backdrop-filter: blur(10px); text-align: center;">
        <div style="font-size: 2rem; margin-bottom: 1rem;">📦</div>
        <div style="color: var(--text-primary);">Cargando inventario...</div>
      </div>
    `;
    document.body.appendChild(loader);
    return loader;
  }

  function hideLoadingIndicator(loader) {
    if (loader && loader.parentNode) {
      loader.parentNode.removeChild(loader);
    }
  }

  function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    const colors = {
      success: '#22c55e',
      error: '#ef4444',
      warning: '#f59e0b',
      info: '#3b82f6'
    };

    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: var(--glass-bg);
      border: 1px solid var(--glass-border);
      border-left: 4px solid ${colors[type]};
      padding: 1rem 1.5rem;
      border-radius: 12px;
      backdrop-filter: blur(10px);
      z-index: 10000;
      animation: slideIn 0.3s ease;
      max-width: 400px;
      color: var(--text-primary);
    `;

    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  // ============================================
  // INICIALIZACIÓN
  // ============================================

  document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Iniciando aplicación...');

    // Cargar datos desde Google Sheets
    await loadInventoryFromGoogleSheets();

    // Variables globales
    let currentFilter = 'All Categories';
    let filteredData = [...inventoryData];

    // Función de filtrado
    function applyFilters(category) {
      currentFilter = category;
      if (category === 'All Categories') {
        filteredData = [...inventoryData];
      } else {
        filteredData = inventoryData.filter(p => p.category === category);
      }

      if (window.mainPagination) {
        window.mainPagination.updateTotalItems(filteredData.length);
        window.mainPagination.goTo(1);
      }
    }

    // Renderizado de tabla
    function renderProductsTable(page) {
      const tbody = document.getElementById('products-tbody');
      if (!tbody) return;

      tbody.classList.add('paging-out');

      setTimeout(() => {
        const itemsPerPage = window.mainPagination ? window.mainPagination.itemsPerPage : 5;
        const start = (page - 1) * itemsPerPage;
        const end = start + itemsPerPage;
        const pageData = filteredData.slice(start, end);

        tbody.innerHTML = pageData.map(p => `
          <tr data-sku="${p.sku}">
            <td><strong>${p.sku}</strong></td>
            <td>
              <div class="product-thumb">${p.thumb || 'PR'}</div>
            </td>
            <td>${p.name}</td>
            <td>
              <span class="badge badge-${p.category.toLowerCase()}">${p.category}</span>
            </td>
            <td>
              <span class="status-pill ${p.status === 'In Stock' ? 'in-stock' : 'out-stock'}">
                ${p.status}
              </span>
            </td>
            <td><strong>$${Number(p.price).toFixed(2)}</strong></td>
          </tr>
        `).join('');
        
        tbody.classList.remove('paging-out');
        tbody.classList.add('paging-in');

        setTimeout(() => {
            tbody.classList.remove('paging-in');
        }, 720);
      }, 300);
    }

    // Inicializar filtro
    const filterDropdownEl = document.querySelector('.filter-dropdown');
    if (filterDropdownEl) {
      new FilterDropdown(filterDropdownEl, {
        onFilterChange: (val) => {
          applyFilters(val);
        }
      });
    }

    // Inicializar paginación
    const paginationEl = document.querySelector('.pagination');
    if (paginationEl) {
      window.mainPagination = new Pagination(paginationEl, {
        totalItems: filteredData.length,
        itemsPerPage: 5,
        currentPage: 1
      });

      paginationEl.addEventListener('pageChange', (e) => {
        renderProductsTable(e.detail.currentPage);
      });
    }

    // Renderizado inicial
    renderProductsTable(1);
    updateKpis();

    // ============================================
    // BÚSQUEDA EN TIEMPO REAL
    // ============================================
    const searchInput = document.querySelector('.search-container input');
    if (searchInput) {
      let searchTimeout;
      searchInput.addEventListener('input', function(e) {
        const query = e.target.value.toLowerCase().trim();
        
        // Debounce: esperar 300ms después de que el usuario deje de escribir
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
          if (query === '') {
            // Si no hay búsqueda, mostrar todo según filtro actual
            applyFilters(currentFilter);
          } else {
            // Buscar en todos los campos
            filteredData = inventoryData.filter(p => {
              return (
                (p.sku && p.sku.toLowerCase().includes(query)) ||
                (p.name && p.name.toLowerCase().includes(query)) ||
                (p.category && p.category.toLowerCase().includes(query)) ||
                (p.status && p.status.toLowerCase().includes(query)) ||
                (p.price && p.price.toString().includes(query))
              );
            });
            
            // Aplicar filtro de categoría si hay uno activo
            if (currentFilter !== 'All Categories') {
              filteredData = filteredData.filter(p => p.category === currentFilter);
            }
            
            if (window.mainPagination) {
              window.mainPagination.updateTotalItems(filteredData.length);
              window.mainPagination.goTo(1);
            }
          }
        }, 300);
      });
    }

    // ============================================
    // MODAL DE PRODUCTOS
    // ============================================
    (function(){
      const modal = document.getElementById('add-product-modal');
      const form = document.getElementById('add-product-form');
      const cancel = document.getElementById('modal-cancel');
      let keyHandler = null;
      let editingSku = null;

      window.openProductModal = function(prod = null){
        modal.setAttribute('aria-hidden','false');

        if(prod){
          editingSku = prod.sku;
          form.querySelector('[name="sku"]').value = prod.sku;
          form.querySelector('[name="name"]').value = prod.name;
          form.querySelector('[name="category"]').value = prod.category;
          form.querySelector('[name="status"]').value = prod.status;
          form.querySelector('[name="price"]').value = prod.price;
          form.querySelector('[name="thumb"]').value = prod.thumb || '';
          const title = modal.querySelector('#add-product-title');
          if(title) title.textContent = 'Edit Product';
          const submitBtn = form.querySelector('button[type="submit"]');
          if(submitBtn) submitBtn.textContent = 'Save Changes';
        } else {
          editingSku = null;
          form.reset();
          const title = modal.querySelector('#add-product-title');
          if(title) title.textContent = 'Add Product';
          const submitBtn = form.querySelector('button[type="submit"]');
          if(submitBtn) submitBtn.textContent = 'Add Product';
        }

        setTimeout(()=> {
          const nameInput = form.querySelector('[name="name"]');
          if(nameInput) nameInput.focus();
        }, 50);

        keyHandler = function(e){ if(e.key === 'Escape'){ e.preventDefault(); closeModal(); } };
        document.addEventListener('keydown', keyHandler);
      };

      function closeModal(){
        modal.setAttribute('aria-hidden','true');
        try{ form.reset(); }catch(e){}
        editingSku = null;
        if(keyHandler){ document.removeEventListener('keydown', keyHandler); keyHandler = null; }
      }

      if(modal && form){
        if(cancel) cancel.addEventListener('click', (e)=>{ e.preventDefault(); closeModal(); });
        const backdrop = modal.querySelector('.modal-backdrop');
        if(backdrop) backdrop.addEventListener('click', (e)=>{ e.preventDefault(); closeModal(); });

        form.addEventListener('submit', (e)=>{
          e.preventDefault();
          showNotification('⚠️ Los cambios no se guardan en Google Sheets automáticamente. Edita la hoja directamente.', 'warning');
          closeModal();
        });
      }
    })();

    // ============================================
    // KPIs
    // ============================================
    function updateKpis(){
      const total = inventoryData.length;
      const counts = {};
      inventoryData.forEach(p => { counts[p.category] = (counts[p.category] || 0) + 1; });
      const breakdownHtml = Object.entries(counts)
        .map(([cat, c]) => `<span style="white-space:nowrap">${cat}: <b>${c}</b></span>`)
        .join('<span style="margin:0 6px; opacity:0.3">|</span>');

      const elTotal = document.getElementById('kpi-total-products');
      const elBreakdown = document.getElementById('kpi-category-breakdown');

      if(elTotal) elTotal.textContent = String(total);
      if(elBreakdown) elBreakdown.innerHTML = breakdownHtml || 'No items';
    }

    // ============================================
    // SCROLL & HEADER
    // ============================================
    (function(){
      const root = document.documentElement;
      root.style.setProperty('--scroll-blur', '0px');
      let ticking = false;
      const header = document.querySelector('.main-header');

      function updateHeaderHeight(){
        if(header){
          const h = header.offsetHeight || 76;
          root.style.setProperty('--header-height', h + 'px');
        }
      }

      function update(){
        const y = window.scrollY || window.pageYOffset || 0;
        const t = Math.min(50, Math.max(0, y)) / 50;
        const blurVal = (t * 12).toFixed(2);
        root.style.setProperty('--scroll-blur', blurVal + 'px');

        if(header){
          if(y > 0) header.classList.add('scrolled');
          else header.classList.remove('scrolled');
          updateHeaderHeight();
        }

        ticking = false;
      }

      window.addEventListener('scroll', ()=>{
        if(!ticking){
          ticking = true;
          window.requestAnimationFrame(update);
        }
      }, { passive: true });

      window.addEventListener('resize', ()=>{ updateHeaderHeight(); }, { passive: true });

      updateHeaderHeight();
      update();

      const small = window.matchMedia('(max-width: 600px)');
      function checkSmall(){ if(small.matches) root.style.setProperty('--scroll-blur','0px'); }
      if (typeof small.addEventListener === 'function') {
        small.addEventListener('change', checkSmall);
      }
      checkSmall();
    })();

    // ============================================
    // THEME TOGGLE
    // ============================================
    const themeToggle = document.getElementById('theme-toggle');
    if(themeToggle){
      const saved = localStorage.getItem('theme');
      if(saved === 'light'){
        document.body.classList.add('light-mode');
        themeToggle.checked = true;
      }

      themeToggle.addEventListener('change', function(){
        if(this.checked){
          document.body.classList.add('light-mode');
          localStorage.setItem('theme', 'light');
        } else {
          document.body.classList.remove('light-mode');
          localStorage.setItem('theme', 'dark');
        }
      });
    }

    // ============================================
    // NAVEGACIÓN
    // ============================================
    const menuLinks = document.querySelectorAll('.menu-link');
    const mainHeader = document.querySelector('.main-header');
    menuLinks.forEach(link => {
      link.addEventListener('click', function(e){
        const href = this.getAttribute('href');
        if(!href || href === '#') return;

        e.preventDefault();
        menuLinks.forEach(l => l.classList.remove('active'));
        this.classList.add('active');

        const views = document.querySelectorAll('.view-container');
        views.forEach(v => {
          v.style.display = 'none';
          v.classList.remove('active');
        });

        const targetId = href.replace('#', '') + '-view';
        const targetView = document.getElementById(targetId);
        if(targetView){
          targetView.style.display = 'block';
          setTimeout(() => targetView.classList.add('active'), 10);
        }

        if (href === '#settings') {
            mainHeader.classList.add('hidden');
        } else {
            mainHeader.classList.remove('hidden');
        }
      });
    });

    console.log('✅ Aplicación inicializada');
  });

})();
