import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JSDOM } from 'happy-dom';

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('App', () => {
  let dom;
  let document;
  let window;
  
  beforeEach(() => {
    dom = new JSDOM(`
      <!DOCTYPE html>
      <html>
        <body>
          <div class="container">
            <div class="tabs">
              <button class="tab" data-view="catalog">Catalog</button>
              <button class="tab" data-view="library">Library</button>
            </div>
            <div class="filters">
              <input type="text" id="search">
              <select id="genre-filter"></select>
              <select id="decade-filter"></select>
              <button id="clear-filters">Clear</button>
            </div>
            <div id="catalog-view" class="view"></div>
            <div id="library-view" class="view"></div>
            <div id="catalog"></div>
            <div id="library"></div>
            <div id="loading"></div>
            <div id="library-empty"></div>
            <div id="preview-modal" class="modal">
              <div class="modal-content">
                <button class="close-modal">X</button>
                <div id="preview-content"></div>
              </div>
            </div>
          </div>
        </body>
      </html>
    `);
    
    document = dom.window.document;
    window = dom.window;
    global.document = document;
    global.window = window;
    
    mockFetch.mockClear();
  });

  describe('loadCatalog', () => {
    it('fetches books from API', async () => {
      const mockBooks = [
        { 
          gutenberg_id: 1, 
          title: 'Test Book', 
          author: 'Test Author',
          genres: ['Fiction'],
          decade: 1900,
          epub_url: 'http://example.com/book.epub',
          text_url: 'http://example.com/book.txt'
        }
      ];
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockBooks
      });

      const { loadCatalog } = await import('../app.js');
      await loadCatalog();

      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/api/books'));
    });

    it('handles fetch errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const { loadCatalog } = await import('../app.js');
      await loadCatalog();

      const loading = document.getElementById('loading');
      expect(loading.textContent).toContain('Error');
    });
  });

  describe('loadLibrary', () => {
    it('fetches library books from API', async () => {
      const mockLibrary = [
        { gutenberg_id: 1, title: 'Library Book', author: 'Author' }
      ];
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockLibrary
      });

      const { loadLibrary } = await import('../app.js');
      await loadLibrary();

      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/api/library'));
    });
  });

  describe('addToLibrary', () => {
    it('sends POST request to add book', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Added' })
      });

      const book = {
        gutenberg_id: 1,
        title: 'Test',
        author: 'Author',
        genres: [],
        decade: 1900
      };

      const button = document.createElement('button');
      
      const { addToLibrary } = await import('../app.js');
      await addToLibrary(book, button);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/library'),
        expect.objectContaining({
          method: 'POST',
          body: expect.any(String)
        })
      );
    });

    it('handles add errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Failed'));
      
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

      const book = { gutenberg_id: 1, title: 'Test', author: 'Author' };
      const button = document.createElement('button');
      
      const { addToLibrary } = await import('../app.js');
      await addToLibrary(book, button);

      expect(alertSpy).toHaveBeenCalled();
    });
  });

  describe('removeFromLibrary', () => {
    it('sends DELETE request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Removed' })
      });

      const book = { gutenberg_id: 1, title: 'Test', author: 'Author' };
      const card = document.createElement('div');
      
      const { removeFromLibrary } = await import('../app.js');
      await removeFromLibrary(book, card);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/library/1'),
        expect.objectContaining({ method: 'DELETE' })
      );
    });
  });

  describe('initialization', () => {
    it('sets up event listeners', async () => {
      const { init } = await import('../app.js');
      
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => []
      });

      await init();

      const searchInput = document.getElementById('search');
      expect(searchInput).toBeDefined();
    });
  });

  describe('filters', () => {
    it('filters books by search term', async () => {
      const mockBooks = [
        { gutenberg_id: 1, title: 'Pride and Prejudice', author: 'Austen', genres: [], decade: 1810 },
        { gutenberg_id: 2, title: 'Moby Dick', author: 'Melville', genres: [], decade: 1850 }
      ];
      
      mockFetch.mockResolvedValue({ ok: true, json: async () => mockBooks });

      const { init } = await import('../app.js');
      await init();

      const searchInput = document.getElementById('search');
      searchInput.value = 'Pride';
      searchInput.dispatchEvent(new window.Event('input'));

      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(document.getElementById('catalog').children.length).toBeGreaterThan(0);
    });
  });
});
