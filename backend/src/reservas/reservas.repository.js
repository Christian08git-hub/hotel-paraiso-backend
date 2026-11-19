const pool = require('../config/db');

async function listar() {
  const [filas] = await pool.execute(`
    SELECT r.id, r.fecha_entrada, r.fecha_salida, r.estado,
           r.precio_reservado, r.usuario_id, u.nombre AS cliente,
           r.habitacion_id, h.nombre AS habitacion
    FROM reservas r
    JOIN usuarios u ON u.id = r.usuario_id
    JOIN habitaciones h ON h.id = r.habitacion_id
    ORDER BY r.id DESC`);
  return filas;
}

async function listarPropias(usuarioId) {
  const [filas] = await pool.execute(
    `
    SELECT r.id, r.fecha_entrada, r.fecha_salida, r.estado,
           r.precio_reservado, r.habitacion_id, h.nombre AS habitacion
    FROM reservas r
    JOIN habitaciones h ON h.id = r.habitacion_id
    WHERE r.usuario_id = ? ORDER BY r.id DESC`,
    [usuarioId],
  );
  return filas;
}

// La transacción bloquea la habitación para serializar las reservas de esa habitación.
async function crear(usuarioId, datos) {
  const conexion = await pool.getConnection();
  try {
    await conexion.beginTransaction();
    const [habitaciones] = await conexion.execute(
      `SELECT id, precio, estado, activo FROM habitaciones WHERE id = ? FOR UPDATE`,
      [datos.habitacion_id],
    );
    const habitacion = habitaciones[0];
    if (
      !habitacion ||
      !habitacion.activo ||
      habitacion.estado !== 'Disponible'
    ) {
      const error = new Error('La habitación no está disponible');
      error.status = 409;
      throw error;
    }
    const [conflictos] = await conexion.execute(
      `SELECT id FROM reservas
       WHERE habitacion_id = ? AND estado IN ('Pendiente', 'Confirmada')
       AND fecha_entrada < ? AND fecha_salida > ? LIMIT 1`,
      [datos.habitacion_id, datos.fecha_salida, datos.fecha_entrada],
    );
    if (conflictos.length) {
      const error = new Error(
        'La habitación ya está reservada para esas fechas',
      );
      error.status = 409;
      throw error;
    }
    const noches = Math.round(
      (Date.parse(datos.fecha_salida + 'T00:00:00Z') -
        Date.parse(datos.fecha_entrada + 'T00:00:00Z')) /
        86400000,
    );
    const total = Number((Number(habitacion.precio) * noches).toFixed(2));
    if (!Number.isFinite(total) || total <= 0) {
      const error = new Error('No se pudo calcular el valor de la reserva');
      error.status = 400;
      throw error;
    }
    const [resultado] = await conexion.execute(
      `INSERT INTO reservas (fecha_entrada, fecha_salida, estado, precio_reservado, usuario_id, habitacion_id)
       VALUES (?, ?, 'Pendiente', ?, ?, ?)`,
      [
        datos.fecha_entrada,
        datos.fecha_salida,
        total,
        usuarioId,
        datos.habitacion_id,
      ],
    );
    await conexion.commit();
    return {
      id: resultado.insertId,
      ...datos,
      usuario_id: usuarioId,
      estado: 'Pendiente',
      noches,
      precio_reservado: total,
    };
  } catch (error) {
    await conexion.rollback();
    throw error;
  } finally {
    conexion.release();
  }
}
async function listarHabitacionesActivas() {
  const [filas] = await pool.execute(`
      select id, nombre, tipo, precio, estado
    from habitaciones
    where activo = 1
    and estado = 'Disponible'
    order by id
    `);
  return filas;
}

module.exports = { listar, listarPropias, crear, listarHabitacionesActivas };
