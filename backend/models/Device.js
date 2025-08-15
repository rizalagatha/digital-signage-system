const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Device = sequelize.define('Device', {
  // Nama yang mudah dikenali untuk perangkat, misal: "TV Pintu Masuk Toko A"
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  // ID unik yang akan digunakan oleh aplikasi player di TV untuk identifikasi
  // Contoh: "TV-STORE-A-01"
  deviceId: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  lastSeen: {
    type: DataTypes.DATE,
    allowNull: true
  }
});

module.exports = Device;