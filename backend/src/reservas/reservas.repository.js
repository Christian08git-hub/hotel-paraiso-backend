const pool = require('../config/db');

async function listar() {
  const [filas] = await pool.execute(`
    SELECT r.id,
           DATE_FORMAT(r.fecha_entrada, '%Y-%m-%d') AS fecha_entrada,
           DATE_FORMAT(r.fecha_salida, '%Y-%m-%d') AS fecha_salida,
           r.estado,
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
    SELECT r.id,
           DATE_FORMAT(r.fecha_entrada, '%Y-%m-%d') AS fecha_entrada,
           DATE_FORMAT(r.fecha_salida, '%Y-%m-%d') AS fecha_salida,
           r.estado,
           r.precio_reservado, r.habitacion_id,
           h.nombre AS habitacion, h.tipo AS habitacion_tipo
    FROM reservas r
    JOIN habitaciones h ON h.id = r.habitacion_id
    WHERE r.usuario_id = ? ORDER BY r.id DESC`,
    [usuarioId],
  );
  return filas;
}

// Edita una reserva propia (habitación, fechas y estado) y recalcula el valor.
async function actualizar(usuarioId, reservaId, datos, hoy) {
  const conexion = await pool.getConnection();
  try {
    await conexion.beginTransaction();
    const [filas] = await conexion.execute(
      `SELECT id, estado, usuario_id, habitacion_id,
              DATE_FORMAT(fecha_entrada, '%Y-%m-%d') AS fecha_entrada
       FROM reservas WHERE id = ? FOR UPDATE`,
      [reservaId],
    );
    const reserva = filas[0];
    // Si no existe o es de otro usuario, misma respuesta para no revelar datos ajenos.
    if (!reserva || String(reserva.usuario_id) !== String(usuarioId)) {
      const error = new Error('Reserva no encontrada');
      error.status = 404;
      throw error;
    }
    if (reserva.estado === 'Cancelada') {
      const error = new Error('Una reserva cancelada no se puede editar');
      error.status = 409;
      throw error;
    }
    // Solo se valida "fecha pasada" si el cliente cambió la fecha de entrada.
    if (datos.fecha_entrada !== reserva.fecha_entrada && datos.fecha_entrada < hoy) {
      const error = new Error('No se permiten reservas en fechas pasadas');
      error.status = 400;
      throw error;
    }
    const [habitaciones] = await conexion.execute(
      `SELECT id, precio, estado, activo FROM habitaciones WHERE id = ? FOR UPDATE`,
      [datos.habitacion_id],
    );
    const habitacion = habitaciones[0];
    const cambioHabitacion =
      Number(datos.habitacion_id) !== Number(reserva.habitacion_id);
    if (
      !habitacion ||
      (cambioHabitacion &&
        (!habitacion.activo || habitacion.estado !== 'Disponible'))
    ) {
      const error = new Error('La habitación no está disponible');
      error.status = 409;
      throw error;
    }
    // Una reserva que queda cancelada ya no ocupa la habitación.
    if (datos.estado !== 'Cancelada') {
      const [conflictos] = await conexion.execute(
        `SELECT id FROM reservas
         WHERE habitacion_id = ? AND id <> ? AND estado IN ('Pendiente', 'Confirmada')
         AND fecha_entrada < ? AND fecha_salida > ? LIMIT 1`,
        [
          datos.habitacion_id,
          reservaId,
          datos.fecha_salida,
          datos.fecha_entrada,
        ],
      );
      if (conflictos.length) {
        const error = new Error(
          'La habitación ya está reservada para esas fechas',
        );
        error.status = 409;
        throw error;
      }
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
    await conexion.execute(
      `UPDATE reservas
       SET fecha_entrada = ?, fecha_salida = ?, estado = ?,
           precio_reservado = ?, habitacion_id = ?
       WHERE id = ?`,
      [
        datos.fecha_entrada,
        datos.fecha_salida,
        datos.estado,
        total,
        datos.habitacion_id,
        reservaId,
      ],
    );
    await conexion.commit();
    return {
      id: reserva.id,
      ...datos,
      usuario_id: usuarioId,
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

// Cancela una reserva propia. No borra la fila: cambia el estado a 'Cancelada'
// para conservar el historial y liberar la habitación (el chequeo de
// disponibilidad solo considera 'Pendiente' y 'Confirmada').
async function cancelar(usuarioId, reservaId) {
  const conexion = await pool.getConnection();
  try {
    await conexion.beginTransaction();
    const [filas] = await conexion.execute(
      `SELECT id, estado, usuario_id FROM reservas WHERE id = ? FOR UPDATE`,
      [reservaId],
    );
    const reserva = filas[0];
    // Si no existe o es de otro usuario, misma respuesta para no revelar datos ajenos.
    if (!reserva || String(reserva.usuario_id) !== String(usuarioId)) {
      const error = new Error('Reserva no encontrada');
      error.status = 404;
      throw error;
    }
    if (reserva.estado === 'Cancelada') {
      const error = new Error('La reserva ya está cancelada');
      error.status = 409;
      throw error;
    }
    await conexion.execute(
      `UPDATE reservas SET estado = 'Cancelada' WHERE id = ?`,
      [reservaId],
    );
    await conexion.commit();
    return { id: reserva.id, estado: 'Cancelada' };
  } catch (error) {
    await conexion.rollback();
    throw error;
  } finally {
    conexion.release();
  }
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
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        datos.fecha_entrada,
        datos.fecha_salida,
        datos.estado ?? 'Pendiente',
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
      estado: datos.estado ?? 'Pendiente',
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

module.exports = {
  listar,
  listarPropias,
  crear,
  actualizar,
  cancelar,
  listarHabitacionesActivas,
};
