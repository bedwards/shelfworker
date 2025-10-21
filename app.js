const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:8787'
  : 'https://shelfworker-api.bedwards.workers.dev';

let catalogBooks = [];
let libraryBooks = [];
let genres = new Set();
let decades = new Set();

async function init() {
  setupEventListeners();
  await loadCatalog();
  await loadLibrary();
  populateFilters();
}

function setupEventListeners() {
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => switchView(tab.dataset.view));
  });

  document.getElementById('search').addEventListener('input', applyFilters);
  document.getElementById('genre-filter').addEventListener('change', applyFilters);
  document.getElementById('decade-filter').addEventListener('change', applyFilters);
  document.getElementById('clear-filters').addEventListener('click', clearFilters);

  document.querySelector('.close-modal').addEventListener('click', closeModal);
  document.getElementById('preview-modal').addEventListener('click', (e) => {
    if (e.target.id === 'preview-modal') closeModal();
  });
}

function switchView(view) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  
  document.querySelector(`[data-view="${view}"]`).classList.add('active');
  document.getElementById(`${view}-view`).classList.add('active');

  if (view === 'library') {
    renderLibrary();
  }
}

async function loadCatalog() {
  try {
    const response = await fetch(`${API_BASE}/api/books`);
    const data = await response.json();
    catalogBooks = data;
    
    catalogBooks.forEach(book => {
      if (book.genres) genres.add(...book.genres);
      if (book.decade) decades.add(book.decade);
    });

    renderCatalog();
  } catch (error) {
    console.error('Error loading catalog:', error);
    document.getElementById('loading').textContent = 'Error loading books. Please try again.';
  }
}

async function loadLibrary() {
  try {
    const response = await fetch(`${API_BASE}/api/library`);
    const data = await response.json();
    libraryBooks = data;
  } catch (error) {
    console.error('Error loading library:', error);
  }
}

function populateFilters() {
  const genreFilter = document.getElementById('genre-filter');
  const decadeFilter = document.getElementById('decade-filter');

  Array.from(genres).sort().forEach(genre => {
    const option = document.createElement('option');
    option.value = genre;
    option.textContent = genre;
    genreFilter.appendChild(option);
  });

  Array.from(decades).sort((a, b) => a - b).forEach(decade => {
    const option = document.createElement('option');
    option.value = decade;
    option.textContent = `${decade}s`;
    decadeFilter.appendChild(option);
  });
}

function applyFilters() {
  const search = document.getElementById('search').value.toLowerCase();
  const genre = document.getElementById('genre-filter').value;
  const decade = document.getElementById('decade-filter').value;

  const filtered = catalogBooks.filter(book => {
    const matchesSearch = !search || 
      book.title.toLowerCase().includes(search) ||
      book.author.toLowerCase().includes(search);
    const matchesGenre = !genre || (book.genres && book.genres.includes(genre));
    const matchesDecade = !decade || book.decade === parseInt(decade);
    return matchesSearch && matchesGenre && matchesDecade;
  });

  renderCatalog(filtered);
}

function clearFilters() {
  document.getElementById('search').value = '';
  document.getElementById('genre-filter').value = '';
  document.getElementById('decade-filter').value = '';
  renderCatalog();
}

function renderCatalog(books = catalogBooks) {
  const catalog = document.getElementById('catalog');
  const loading = document.getElementById('loading');
  
  loading.style.display = 'none';
  catalog.innerHTML = '';

  if (books.length === 0) {
    catalog.innerHTML = '<div class="empty-state">No books found matching your filters.</div>';
    return;
  }

  books.forEach(book => {
    const inLibrary = libraryBooks.some(lb => lb.gutenberg_id === book.gutenberg_id);
    const card = createBookCard(book, inLibrary);
    catalog.appendChild(card);
  });
}

function renderLibrary() {
  const library = document.getElementById('library');
  const empty = document.getElementById('library-empty');

  library.innerHTML = '';

  if (libraryBooks.length === 0) {
    empty.style.display = 'block';
    return;
  }

  empty.style.display = 'none';
  libraryBooks.forEach(book => {
    const card = createBookCard(book, true, true);
    library.appendChild(card);
  });
}

function createBookCard(book, inLibrary, isLibraryView = false) {
  const card = document.createElement('div');
  card.className = 'book-card';

  const title = document.createElement('div');
  title.className = 'book-title';
  title.textContent = book.title;
  card.appendChild(title);

  const author = document.createElement('div');
  author.className = 'book-author';
  author.textContent = book.author;
  card.appendChild(author);

  const meta = document.createElement('div');
  meta.className = 'book-meta';
  
  if (book.decade) {
    const decadeBadge = document.createElement('span');
    decadeBadge.className = 'badge decade';
    decadeBadge.textContent = `${book.decade}s`;
    meta.appendChild(decadeBadge);
  }

  if (book.genres && book.genres.length > 0) {
    book.genres.slice(0, 2).forEach(genre => {
      const genreBadge = document.createElement('span');
      genreBadge.className = 'badge genre';
      genreBadge.textContent = genre;
      meta.appendChild(genreBadge);
    });
  }
  
  card.appendChild(meta);

  const actions = document.createElement('div');
  actions.className = 'book-actions';

  if (!isLibraryView && !inLibrary) {
    const addBtn = document.createElement('button');
    addBtn.className = 'btn btn-primary';
    addBtn.textContent = '+ Add to Library';
    addBtn.onclick = () => addToLibrary(book, addBtn);
    actions.appendChild(addBtn);
  }

  if (isLibraryView) {
    const removeBtn = document.createElement('button');
    removeBtn.className = 'btn btn-danger';
    removeBtn.textContent = 'Remove';
    removeBtn.onclick = () => removeFromLibrary(book, card);
    actions.appendChild(removeBtn);
  }

  if (book.text_url) {
    const previewBtn = document.createElement('button');
    previewBtn.className = 'btn btn-secondary';
    previewBtn.textContent = 'Preview';
    previewBtn.onclick = () => previewBook(book);
    actions.appendChild(previewBtn);
  }

  if (book.epub_url) {
    const downloadBtn = document.createElement('button');
    downloadBtn.className = 'btn btn-secondary';
    downloadBtn.textContent = '📖 EPUB';
    downloadBtn.onclick = () => window.open(book.epub_url, '_blank');
    actions.appendChild(downloadBtn);
  }

  if (book.text_url) {
    const textBtn = document.createElement('button');
    textBtn.className = 'btn btn-secondary';
    textBtn.textContent = '📄 Text';
    textBtn.onclick = () => window.open(book.text_url, '_blank');
    actions.appendChild(textBtn);
  }

  card.appendChild(actions);
  return card;
}

async function addToLibrary(book, button) {
  button.disabled = true;
  button.textContent = 'Adding...';
  
  console.log('Adding to library:', book.title);

  try {
    const response = await fetch(`${API_BASE}/api/library`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        gutenberg_id: book.gutenberg_id,
        title: book.title,
        author: book.author,
        genres: book.genres || [],
        decade: book.decade,
        epub_url: book.epub_url,
        text_url: book.text_url
      })
    });

    if (!response.ok) throw new Error('Failed to add book');

    libraryBooks.push(book);
    button.textContent = '✓ Added';
    setTimeout(() => renderCatalog(), 1000);
  } catch (error) {
    console.error('Error adding to library:', error);
    button.disabled = false;
    button.textContent = '+ Add to Library';
    alert('Failed to add book. Please try again.');
  }
}

async function removeFromLibrary(book, card) {
  console.log('Removing from library:', book.title);

  try {
    const response = await fetch(`${API_BASE}/api/library/${book.gutenberg_id}`, {
      method: 'DELETE'
    });

    if (!response.ok) throw new Error('Failed to remove book');

    libraryBooks = libraryBooks.filter(b => b.gutenberg_id !== book.gutenberg_id);
    card.remove();

    if (libraryBooks.length === 0) {
      document.getElementById('library-empty').style.display = 'block';
    }
  } catch (error) {
    console.error('Error removing from library:', error);
    alert('Failed to remove book. Please try again.');
  }
}

async function previewBook(book) {
  const modal = document.getElementById('preview-modal');
  const content = document.getElementById('preview-content');
  
  content.innerHTML = '<div class="loading">Loading preview...</div>';
  modal.classList.add('active');

  try {
    const response = await fetch(book.text_url);
    const text = await response.text();
    const preview = text.substring(0, 3000) + '\n\n[... preview truncated ...]';
    content.textContent = preview;
  } catch (error) {
    console.error('Error loading preview:', error);
    content.textContent = 'Failed to load preview.';
  }
}

function closeModal() {
  document.getElementById('preview-modal').classList.remove('active');
}

if (typeof window !== 'undefined') {
  document.addEventListener('DOMContentLoaded', init);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { init, loadCatalog, loadLibrary, addToLibrary, removeFromLibrary };
}
