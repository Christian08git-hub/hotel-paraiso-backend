import mysql from 'mysql2/promise';

// Creamos un pool de conexiones (más eficiente para la memoria)
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 5, // Límite bajo para no saturar tus 3.5GB de RAM
  queueLimit: 0
});

// Verificar la conexión al iniciar
try {
  const connection = await pool.getConnection();
  console.log('✅ Conexión exitosa a la base de datos MariaDB/MySQL');
  connection.release(); // Liberar la conexión de inmediato
} catch (error) {
  console.error('❌ Error al conectar a la base de datos:', error.message);
}

export default pool;
