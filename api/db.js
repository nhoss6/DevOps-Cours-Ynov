/**
 * Database module
 * Gère la connexion à PostgreSQL via pg
 */

const { Pool } = require('pg');

// Configuration du pool PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Ou séparément :
  // host: process.env.DB_HOST || 'localhost',
  // port: process.env.DB_PORT || 5432,
  // user: process.env.POSTGRES_USER || 'postgres',
  // password: process.env.POSTGRES_PASSWORD || 'postgres',
  // database: process.env.POSTGRES_DB || 'postgres',

  max: 20,                    // Connections max
  idleTimeoutMillis: 30000,   // Timeout inactivité
  connectionTimeoutMillis: 5000, // Timeout connexion
});

// Event listeners
pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err);
});

pool.on('connect', () => {
  console.log('[DB] New client connected');
});

pool.on('remove', () => {
  console.log('[DB] Client removed from pool');
});

/**
 * Exécute une requête SQL
 * @param {string} text - Requête SQL avec placeholders ($1, $2, etc.)
 * @param {array} params - Paramètres pour éviter les injections SQL
 * @returns {Promise} Résultat de la requête
 */
async function query(text, params) {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('[DB] Executed query', { text, duration: `${duration}ms`, rows: result.rowCount });
    return result;
  } catch (error) {
    console.error('[DB] Query error', { text, error: error.message });
    throw error;
  }
}

/**
 * Exécute une requête dans une transaction
 * @param {Function} callback - Fonction qui exécute les requêtes
 */
async function transaction(callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Ferme toutes les connexions
 */
async function end() {
  await pool.end();
  console.log('[DB] Connection pool closed');
}

module.exports = {
  query,
  transaction,
  end,
  pool
};
