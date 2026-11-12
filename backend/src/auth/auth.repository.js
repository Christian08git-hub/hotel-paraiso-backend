
import pool from "../config/db.js";

// Esquema asumido (no hay .sql en el repo):
//   roles(id, nombre)
//   usuarios(id, nombre, correo UNIQUE, telefono, password_hash, rol_id, activo)

export async function buscarPorCorreo(correo) {
  const [filas] = await pool.execute(
    `SELECT u.id, u.nombre, u.correo, u.telefono, u.password_hash, u.activo,
            r.nombre AS rol
       FROM usuarios u
       INNER JOIN roles r ON r.id = u.rol_id
      WHERE u.correo = ?
      LIMIT 1`,
    [correo]
  );
  return filas[0] ?? null;
}

export async function buscarPorId(id) {
  const [filas] = await pool.execute(
    `SELECT u.id, u.nombre, u.correo, u.telefono, u.activo,
            r.nombre AS rol
       FROM usuarios u
       INNER JOIN roles r ON r.id = u.rol_id
      WHERE u.id = ?
      LIMIT 1`,
    [id]
  );
  return filas[0] ?? null;
}

export async function obtenerRolCliente() {
  const [filas] = await pool.execute(
    "SELECT id, nombre FROM roles WHERE nombre = ? LIMIT 1",
    ["cliente"]
  );
  return filas[0] ?? null;
}

export async function crearUsuario({ nombre, correo, telefono, passwordHash, rolId }) {
  const [resultado] = await pool.execute(
    `INSERT INTO usuarios (nombre, correo, telefono, password_hash, rol_id)
     VALUES (?, ?, ?, ?, ?)`,
    [nombre, correo, telefono, passwordHash, rolId]
  );
  return resultado.insertId;
}