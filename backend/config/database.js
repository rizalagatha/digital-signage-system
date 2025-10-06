const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASS,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'mysql',
    pool: {
      max: 10,       // jumlah maksimal koneksi bersamaan
      min: 0,        // jumlah minimal koneksi
      acquire: 30000, // waktu maksimal (ms) untuk mendapatkan koneksi sebelum error
      idle: 10000    // waktu (ms) koneksi idle sebelum dilepas
    },
    logging: false   // opsional, matikan log SQL
  }
);

module.exports = sequelize;
