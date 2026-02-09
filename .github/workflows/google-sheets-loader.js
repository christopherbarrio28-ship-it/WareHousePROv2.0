/**
 * Google Sheets Data Loader
 * Carga productos desde Google Sheets públicas
 */

class GoogleSheetsLoader {
  constructor(sheetId, sheetName = 'Sheet1') {
    this.sheetId = sheetId;
    this.sheetName = sheetName;
    this.cache = null;
    this.cacheTime = null;
    this.cacheExpiry = 5 * 60 * 1000; // 5 minutos
  }

  /**
   * Método 1: Usar Google Visualization API (Recomendado)
   */
  async loadWithVisualizationAPI() {
    try {
      const url = `https://docs.google.com/spreadsheets/d/${this.sheetId}/gviz/tq?tqx=out:json&sheet=${this.sheetName}`;
      
      const response = await fetch(url);
      if (!response.ok) throw new Error('Error al cargar Google Sheet');
      
      const text = await response.text();
      // Google responde con: google.visualization.Query.setResponse({...})
      // Necesitamos extraer el JSON
      const jsonText = text.substring(47).slice(0, -2);
      const data = JSON.parse(jsonText);
      
      return this.parseVisualizationData(data);
    } catch (error) {
      console.error('Error cargando desde Google Sheets:', error);
      throw error;
    }
  }

  /**
   * Método 2: Usar exportación CSV (Alternativa)
   */
  async loadWithCSV() {
    try {
      const url = `https://docs.google.com/spreadsheets/d/${this.sheetId}/export?format=csv&gid=0`;
      
      const response = await fetch(url);
      if (!response.ok) throw new Error('Error al cargar CSV');
      
      const csvText = await response.text();
      return this.parseCSV(csvText);
    } catch (error) {
      console.error('Error cargando CSV:', error);
      throw error;
    }
  }

  /**
   * Método principal con caché
   */
  async loadProducts(forceRefresh = false) {
    // Verificar caché
    const now = Date.now();
    if (!forceRefresh && this.cache && this.cacheTime && (now - this.cacheTime) < this.cacheExpiry) {
      console.log('📦 Usando datos en caché');
      return this.cache;
    }

    console.log('🔄 Cargando datos desde Google Sheets...');
    
    try {
      // Intentar método 1
      const products = await this.loadWithVisualizationAPI();
      
      // Actualizar caché
      this.cache = products;
      this.cacheTime = now;
      
      console.log(`✅ ${products.length} productos cargados exitosamente`);
      return products;
      
    } catch (error) {
      console.log('⚠️ Visualization API falló, intentando CSV...');
      
      try {
        // Intentar método 2
        const products = await this.loadWithCSV();
        this.cache = products;
        this.cacheTime = now;
        return products;
      } catch (csvError) {
        console.error('❌ Ambos métodos fallaron');
        throw csvError;
      }
    }
  }

  /**
   * Parsear datos de Visualization API
   */
  parseVisualizationData(data) {
    if (!data.table || !data.table.rows) {
      throw new Error('Formato de datos inválido');
    }

    const rows = data.table.rows;
    const products = [];

    rows.forEach((row, index) => {
      try {
        // row.c es un array de celdas
        const cells = row.c || [];
        
        // Saltar fila si está vacía
        if (!cells[0] || !cells[0].v) return;

        const product = {
          sku: this.getCellValue(cells[0]) || `AUTO-${1000 + index}`,
          name: this.getCellValue(cells[1]) || 'Sin nombre',
          category: this.getCellValue(cells[2]) || 'Uncategorized',
          status: this.getCellValue(cells[3]) || 'In Stock',
          price: parseFloat(this.getCellValue(cells[4])) || 0,
          thumb: this.getCellValue(cells[5]) || this.makeThumb(this.getCellValue(cells[1]))
        };

        products.push(product);
      } catch (err) {
        console.warn(`Error en fila ${index}:`, err);
      }
    });

    return products;
  }

  /**
   * Parsear CSV
   */
  parseCSV(csvText) {
    const lines = csvText.split('\n').filter(line => line.trim());
    const products = [];

    // Saltar la primera fila (encabezados)
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const cells = this.parseCSVLine(line);
      
      if (cells[0]) { // Verificar que tenga SKU
        const product = {
          sku: cells[0] || `AUTO-${1000 + i}`,
          name: cells[1] || 'Sin nombre',
          category: cells[2] || 'Uncategorized',
          status: cells[3] || 'In Stock',
          price: parseFloat(cells[4]) || 0,
          thumb: cells[5] || this.makeThumb(cells[1])
        };

        products.push(product);
      }
    }

    return products;
  }

  /**
   * Helper: parsear línea CSV (maneja comillas)
   */
  parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    result.push(current.trim());
    return result;
  }

  /**
   * Helper: obtener valor de celda
   */
  getCellValue(cell) {
    if (!cell) return null;
    return cell.v !== undefined ? String(cell.v) : null;
  }

  /**
   * Helper: generar thumbnail
   */
  makeThumb(name) {
    if (!name) return 'PR';
    return name.split(' ').slice(0, 2).map(s => s[0]).join('').toUpperCase();
  }

  /**
   * Limpiar caché
   */
  clearCache() {
    this.cache = null;
    this.cacheTime = null;
    console.log('🗑️ Caché limpiado');
  }
}

// Exportar para uso global
if (typeof window !== 'undefined') {
  window.GoogleSheetsLoader = GoogleSheetsLoader;
}
