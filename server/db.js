const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  charset: 'utf8mb4',
  timezone: '+00:00',
});

pool.on('connection', (conn) => {
  conn.query("SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci");
});

module.exports = pool;
