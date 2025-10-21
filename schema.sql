-- Enable extensions
CREATE EXTENSION IF NOT EXISTS pg_graphql CASCADE;

-- Books table for catalog (accessed via GraphQL)
CREATE TABLE IF NOT EXISTS books (
  id SERIAL PRIMARY KEY,
  gutenberg_id INTEGER UNIQUE NOT NULL,
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  genres TEXT[] DEFAULT '{}',
  decade INTEGER,
  epub_url TEXT,
  text_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_books_gutenberg_id ON books(gutenberg_id);
CREATE INDEX IF NOT EXISTS idx_books_decade ON books(decade);

-- Allow pg_graphql to read books
COMMENT ON TABLE books IS E'@graphql({"inflect_names": true})';

-- Seed some example books from Project Gutenberg
INSERT INTO books (gutenberg_id, title, author, genres, decade, epub_url, text_url) 
VALUES 
  (1342, 'Pride and Prejudice', 'Jane Austen', ARRAY['Fiction', 'Romance'], 1810, 
   'https://www.gutenberg.org/ebooks/1342.epub3.images', 
   'https://www.gutenberg.org/files/1342/1342-0.txt'),
  (11, 'Alice''s Adventures in Wonderland', 'Lewis Carroll', ARRAY['Fiction', 'Fantasy'], 1860,
   'https://www.gutenberg.org/ebooks/11.epub3.images',
   'https://www.gutenberg.org/files/11/11-0.txt'),
  (84, 'Frankenstein', 'Mary Wollstonecraft Shelley', ARRAY['Fiction', 'Horror', 'Science Fiction'], 1810,
   'https://www.gutenberg.org/ebooks/84.epub3.images',
   'https://www.gutenberg.org/files/84/84-0.txt'),
  (1952, 'The Yellow Wallpaper', 'Charlotte Perkins Gilman', ARRAY['Fiction', 'Short Stories'], 1890,
   'https://www.gutenberg.org/ebooks/1952.epub3.images',
   'https://www.gutenberg.org/files/1952/1952-0.txt'),
  (2701, 'Moby-Dick', 'Herman Melville', ARRAY['Fiction', 'Adventure'], 1850,
   'https://www.gutenberg.org/ebooks/2701.epub3.images',
   'https://www.gutenberg.org/files/2701/2701-0.txt'),
  (345, 'Dracula', 'Bram Stoker', ARRAY['Fiction', 'Horror'], 1890,
   'https://www.gutenberg.org/ebooks/345.epub3.images',
   'https://www.gutenberg.org/files/345/345-0.txt'),
  (174, 'The Picture of Dorian Gray', 'Oscar Wilde', ARRAY['Fiction', 'Philosophy'], 1890,
   'https://www.gutenberg.org/ebooks/174.epub3.images',
   'https://www.gutenberg.org/files/174/174-0.txt'),
  (46, 'A Christmas Carol', 'Charles Dickens', ARRAY['Fiction', 'Short Stories'], 1840,
   'https://www.gutenberg.org/ebooks/46.epub3.images',
   'https://www.gutenberg.org/files/46/46-0.txt'),
  (1661, 'The Adventures of Sherlock Holmes', 'Arthur Conan Doyle', ARRAY['Fiction', 'Mystery'], 1890,
   'https://www.gutenberg.org/ebooks/1661.epub3.images',
   'https://www.gutenberg.org/files/1661/1661-0.txt'),
  (2554, 'Crime and Punishment', 'Fyodor Dostoyevsky', ARRAY['Fiction', 'Philosophy'], 1860,
   'https://www.gutenberg.org/ebooks/2554.epub3.images',
   'https://www.gutenberg.org/files/2554/2554-0.txt'),
  (844, 'The Importance of Being Earnest', 'Oscar Wilde', ARRAY['Fiction', 'Drama'], 1890,
   'https://www.gutenberg.org/ebooks/844.epub3.images',
   'https://www.gutenberg.org/files/844/844-0.txt'),
  (76, 'Adventures of Huckleberry Finn', 'Mark Twain', ARRAY['Fiction', 'Adventure'], 1880,
   'https://www.gutenberg.org/ebooks/76.epub3.images',
   'https://www.gutenberg.org/files/76/76-0.txt'),
  (1400, 'Great Expectations', 'Charles Dickens', ARRAY['Fiction', 'Romance'], 1860,
   'https://www.gutenberg.org/ebooks/1400.epub3.images',
   'https://www.gutenberg.org/files/1400/1400-0.txt'),
  (158, 'Emma', 'Jane Austen', ARRAY['Fiction', 'Romance'], 1810,
   'https://www.gutenberg.org/ebooks/158.epub3.images',
   'https://www.gutenberg.org/files/158/158-0.txt'),
  (98, 'A Tale of Two Cities', 'Charles Dickens', ARRAY['Fiction', 'Historical'], 1850,
   'https://www.gutenberg.org/ebooks/98.epub3.images',
   'https://www.gutenberg.org/files/98/98-0.txt')
ON CONFLICT (gutenberg_id) DO NOTHING;
