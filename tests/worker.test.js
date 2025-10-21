import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockPgClient = {
  connect: vi.fn(),
  query: vi.fn(),
  end: vi.fn()
};

// Create persistent collection mock
const mockCollection = {
  find: vi.fn(() => ({
    toArray: vi.fn(() => Promise.resolve([]))
  })),
  findOne: vi.fn(() => Promise.resolve(null)),
  insertOne: vi.fn(() => Promise.resolve()),
  deleteOne: vi.fn(() => Promise.resolve())
};

// Create persistent db mock
const mockDb = {
  collection: vi.fn(() => mockCollection)
};

const mockMongoClient = {
  connect: vi.fn(),
  db: vi.fn(() => mockDb),
  close: vi.fn()
};

vi.mock('pg', () => ({
  default: {
    Client: vi.fn(() => mockPgClient)
  }
}));

vi.mock('mongodb', () => ({
  MongoClient: vi.fn(() => mockMongoClient)
}));

describe('Worker', () => {
  let worker;
  let env;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Reset mock implementations to defaults
    mockCollection.findOne.mockResolvedValue(null);
    mockCollection.find.mockReturnValue({
      toArray: vi.fn(() => Promise.resolve([]))
    });

    env = {
      DATABASE_URL: 'postgresql://test',
      FERRETDB_URL: 'mongodb://test'
    };

    worker = await import('../worker.js');
  });

  describe('OPTIONS requests', () => {
    it('returns CORS headers', async () => {
      const request = new Request('http://localhost/api/books', {
        method: 'OPTIONS'
      });

      const response = await worker.default.fetch(request, env);

      expect(response.status).toBe(204);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    });
  });

  describe('GET /api/books', () => {
    it('returns books from GraphQL', async () => {
      const mockGraphQLResponse = {
        rows: [{
          resolve: {
            data: {
              booksCollection: {
                edges: [
                  { node: { gutenberg_id: 1, title: 'Test Book', author: 'Author' } }
                ]
              }
            }
          }
        }]
      };

      mockPgClient.query.mockResolvedValueOnce(mockGraphQLResponse);

      const request = new Request('http://localhost/api/books');
      const response = await worker.default.fetch(request, env);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
    });

    it('handles empty results', async () => {
      const mockGraphQLResponse = {
        rows: [{ resolve: { data: null } }]
      };

      mockPgClient.query.mockResolvedValueOnce(mockGraphQLResponse);

      const request = new Request('http://localhost/api/books');
      const response = await worker.default.fetch(request, env);

      const data = await response.json();
      expect(data).toEqual([]);
    });
  });

  describe('GET /api/library', () => {
    it('returns library books from FerretDB', async () => {
      const request = new Request('http://localhost/api/library');
      const response = await worker.default.fetch(request, env);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
    });
  });

  describe('POST /api/library', () => {
    it('adds book to library', async () => {
      const book = {
        gutenberg_id: 1,
        title: 'Test',
        author: 'Author',
        genres: [],
        decade: 1900
      };

      const request = new Request('http://localhost/api/library', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(book)
      });

      const response = await worker.default.fetch(request, env);

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.message).toBeDefined();
    });

    it('handles existing book', async () => {
      mockCollection.findOne.mockResolvedValueOnce({ gutenberg_id: 1 });

      const book = { gutenberg_id: 1, title: 'Test', author: 'Author' };

      const request = new Request('http://localhost/api/library', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(book)
      });

      const response = await worker.default.fetch(request, env);

      expect(response.status).toBe(200);
    });
  });

  describe('DELETE /api/library/:id', () => {
    it('removes book from library', async () => {
      const request = new Request('http://localhost/api/library/1', {
        method: 'DELETE'
      });

      const response = await worker.default.fetch(request, env);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.message).toBeDefined();
    });
  });

  describe('Error handling', () => {
    it('returns 404 for unknown routes', async () => {
      const request = new Request('http://localhost/api/unknown');
      const response = await worker.default.fetch(request, env);

      expect(response.status).toBe(404);
    });

    it('handles worker errors', async () => {
      mockPgClient.connect.mockRejectedValueOnce(new Error('Connection failed'));

      const request = new Request('http://localhost/api/books');
      const response = await worker.default.fetch(request, env);

      expect(response.status).toBe(500);
    });
  });

  describe('CORS headers', () => {
    it('includes CORS headers in all responses', async () => {
      const request = new Request('http://localhost/api/books');
      mockPgClient.query.mockResolvedValueOnce({
        rows: [{ resolve: { data: { booksCollection: { edges: [] } } } }]
      });

      const response = await worker.default.fetch(request, env);

      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    });
  });
});
