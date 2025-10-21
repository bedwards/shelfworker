import { MongoClient } from 'mongodb';
import pg from 'pg';
const { Client } = pg;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    try {
      const url = new URL(request.url);
      const path = url.pathname;

      if (path === '/api/books' && request.method === 'GET') {
        return handleGetBooks(env);
      }

      if (path === '/api/library' && request.method === 'GET') {
        return handleGetLibrary(env);
      }

      if (path === '/api/library' && request.method === 'POST') {
        return handleAddToLibrary(request, env);
      }

      if (path.startsWith('/api/library/') && request.method === 'DELETE') {
        return handleRemoveFromLibrary(request, env);
      }

      return jsonResponse({ error: 'Not found' }, 404);
    } catch (error) {
      console.error('Worker error:', error);
      return jsonResponse({ error: error.message }, 500);
    }
  }
};

async function handleGetBooks(env) {
  const pgClient = new Client({ connectionString: env.DATABASE_URL });
  
  try {
    await pgClient.connect();

    const query = `
      SELECT graphql.resolve($$
        query {
          booksCollection(first: 100) {
            edges {
              node {
                gutenberg_id
                title
                author
                genres
                decade
                epub_url
                text_url
              }
            }
          }
        }
      $$);
    `;

    const result = await pgClient.query(query);
    const data = result.rows[0].resolve.data;
    
    if (data && data.booksCollection && data.booksCollection.edges) {
      const books = data.booksCollection.edges.map(edge => edge.node);
      return jsonResponse(books);
    }

    return jsonResponse([]);
  } finally {
    await pgClient.end();
  }
}

async function handleGetLibrary(env) {
  const mongoClient = new MongoClient(env.FERRETDB_URL);
  
  try {
    await mongoClient.connect();
    const db = mongoClient.db('shelfworker');
    const library = db.collection('library');
    
    const books = await library.find({}).toArray();
    
    return jsonResponse(books.map(book => ({
      gutenberg_id: book.gutenberg_id,
      title: book.title,
      author: book.author,
      genres: book.genres || [],
      decade: book.decade,
      epub_url: book.epub_url,
      text_url: book.text_url
    })));
  } finally {
    await mongoClient.close();
  }
}

async function handleAddToLibrary(request, env) {
  const book = await request.json();
  const mongoClient = new MongoClient(env.FERRETDB_URL);
  
  try {
    await mongoClient.connect();
    const db = mongoClient.db('shelfworker');
    const library = db.collection('library');
    
    const existing = await library.findOne({ gutenberg_id: book.gutenberg_id });
    if (existing) {
      return jsonResponse({ message: 'Book already in library' }, 200);
    }

    await library.insertOne({
      gutenberg_id: book.gutenberg_id,
      title: book.title,
      author: book.author,
      genres: book.genres || [],
      decade: book.decade,
      epub_url: book.epub_url,
      text_url: book.text_url,
      added_at: new Date()
    });

    return jsonResponse({ message: 'Book added to library' }, 201);
  } finally {
    await mongoClient.close();
  }
}

async function handleRemoveFromLibrary(request, env) {
  const url = new URL(request.url);
  const gutenberg_id = parseInt(url.pathname.split('/').pop());
  
  const mongoClient = new MongoClient(env.FERRETDB_URL);
  
  try {
    await mongoClient.connect();
    const db = mongoClient.db('shelfworker');
    const library = db.collection('library');
    
    await library.deleteOne({ gutenberg_id });
    
    return jsonResponse({ message: 'Book removed from library' });
  } finally {
    await mongoClient.close();
  }
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}
