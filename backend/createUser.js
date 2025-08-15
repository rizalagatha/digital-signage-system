const sequelize = require('./config/database');
const User = require('./models/User');

const createAdmin = async () => {
  try {
    await sequelize.sync();
    const existingAdmin = await User.findOne({ where: { username: 'admin' } });

    if (existingAdmin) {
      console.log('User admin sudah ada.');
      return;
    }

    await User.create({
      username: 'admin',
      password: 'password123'
    });
    console.log('User admin berhasil dibuat!');
  } catch (error) {
    console.error('Gagal membuat admin:', error);
  } finally {
    await sequelize.close();
  }
};

createAdmin();