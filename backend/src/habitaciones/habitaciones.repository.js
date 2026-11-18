const pool = require('../config/db');

async function listar() {
  const [filas] = await pool.execute(
    'SELECT id, nombre, tipo, precio, estado FROM habitaciones WHERE activo = 1 ORDER BY id DESC'
  );
  return filas;
}

async function buscarPorId(id) {
  const [filas] = await pool.execute(
    'SELECT id, nombre, tipo, precio, estado FROM habitaciones WHERE id = ? AND activo = 1', [id]
  );
  return filas[0] || null;
}

async function crear(datos) {
  const [resultado] = await pool.execute(
    'INSERT INTO habitaciones (nombre, tipo, precio, estado) VALUES (?, ?, ?, ?)',
    [datos.nombre, datos.tipo, datos.precio, datos.estado]
  );
  return buscarPorId(resultado.insertId);
}

async function actualizar(id, datos) {
  const [resultado] = await pool.execute(
    `UPDATE habitaciones SET nombre = ?, tipo = ?, precio = ?, estado = ?
     WHERE id = ? AND activo = 1`,
    [datos.nombre, datos.tipo, datos.precio, datos.estado, id]
  );
  return resultado.affectedRows ? buscarPorId(id) : null;
}

async function desactivar(id) {
  const [resultado] = await pool.execute(
    'UPDATE habitaciones SET activo = 0 WHERE id = ? AND activo = 1', [id]
  );
  return resultado.affectedRows > 0;
}

module.exports = { listar, buscarPorId, crear, actualizar, desactivar };
