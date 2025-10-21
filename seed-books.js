#!/usr/bin/env node
import pg from 'pg';
const { Client } = pg;

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/shelfworker';
const GUTENDEX_API = 'https://gutendex.com/books';

async function fetchBooks(page = 1) {
  const response = await fetch(`${GUTENDEX_API}?page=${page}&languages=en&sort=popular`);
  const data = await response.json();
  return data;
}

function extractGenres(book) {
  const genres = [];
  if (book.subjects) {
    book.subjects.forEach(subject => {
      const cleaned = subject.split(' -- ')[0].trim();
      if (cleaned.length < 50 && !cleaned.includes(',')) {
        genres.push(cleaned);
      }
    });
  }
  return genres.slice(0, 3);
}

function extractDecade(book) {
  if (book.authors && book.authors.length > 0) {
    const author = book.authors[0];
    if (author.birth_year) {
      const birth = author.birth_year;
      const decade = Math.floor((birth + 30) / 10) * 10;
      return decade;
    }
  }
  return null;
}

function getFormat(book, mimeType) {
  const formats = book.formats || {};
  for (const [mime, url] of Object.entries(formats)) {
    if (mime.includes(mimeType)) {
      return url;
    }
  }
  return null;
}

async function seedBooks() {
  const client = new Client({ connectionString: DATABASE_URL });
  
  try {
    await client.connect();
    console.log('Connected to database');
    
    const data = await fetchBooks(1);
    const books = data.results;
    
    console.log(`Fetched ${books.length} books from Gutendex`);
    
    let inserted = 0;
    
    for (const book of books) {
      const author = book.authors && book.authors.length > 0 
        ? book.authors[0].name 
        : 'Unknown';
      
      const genres = extractGenres(book);
      const decade = extractDecade(book);
      const epubUrl = getFormat(book, 'epub');
      const textUrl = getFormat(book, 'text/plain');
      
      if (!epubUrl && !textUrl) continue;
      
      try {
        await client.query(
          `INSERT INTO books (gutenberg_id, title, author, genres, decade, epub_url, text_url) 
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (gutenberg_id) DO NOTHING`,
          [book.id, book.title, author, genres, decade, epubUrl, textUrl]
        );
        inserted++;
        console.log(`✓ ${book.title}`);
      } catch (error) {
        console.error(`✗ Failed to insert ${book.title}:`, error.message);
      }
    }
    
    console.log(`\nSuccessfully inserted ${inserted} books`);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

seedBooks();
