const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Playlist = sequelize.define('Playlist', {
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  }
});

module.exports = Playlist;