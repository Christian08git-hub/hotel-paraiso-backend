const { z } = require('zod');
const repository = require('./habitaciones.repository');

const schema = z.object({
  nombre: z.string().trim().min(2).max(100),
  tipo: z.enum(['Estándar', 'Premium', 'Suite', 'Otra']),
  precio: z.number().positive().finite().max(9999999999.99),
  estado: z.enum(['Disponible', 'Ocupada', 'Mantenimiento'])
}).strict();

function validarId(req, res) {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id <= 0) {
    res.status(400).json({ mensaje: 'ID inválido' });
    return null;
  }
  return id;
}

function validarDatos(req, res) {
  const resultado = schema.safeParse(req.body);
  if (!resultado.success) {
    res.status(400).json({ mensaje: 'Datos de habitación inválidos', errores: z.flattenError(resultado.error).fieldErrors });
    return null;
  }
  return resultado.data;
}

async function listar(req, res, next) {
  try { res.json({ habitaciones: await repository.listar() }); }
  catch (error) { next(error); }
}
async function obtener(req, res, next) {
  const id = validarId(req, res); if (id === null) return;
  try {
    const habitacion = await repository.buscarPorId(id);
    if (!habitacion) return res.status(404).json({ mensaje: 'Habitación no encontrada' });
    res.json({ habitacion });
  } catch (error) { next(error); }
}
async function crear(req, res, next) {
  const datos = validarDatos(req, res); if (!datos) return;
  try { res.status(201).json({ mensaje: 'Habitación registrada', habitacion: await repository.crear(datos) }); }
  catch (error) { next(error); }
}
async function actualizar(req, res, next) {
  const id = validarId(req, res); if (id === null) return;
  const datos = validarDatos(req, res); if (!datos) return;
  try {
    const habitacion = await repository.actualizar(id, datos);
    if (!habitacion) return res.status(404).json({ mensaje: 'Habitación no encontrada' });
    res.json({ mensaje: 'Habitación actualizada', habitacion });
  } catch (error) { next(error); }
}
async function desactivar(req, res, next) {
  const id = validarId(req, res); if (id === null) return;
  try {
    const desactivada = await repository.desactivar(id);
    if (!desactivada) return res.status(404).json({ mensaje: 'Habitación no encontrada' });
    res.json({ mensaje: 'Habitación desactivada' });
  } catch (error) { next(error); }
}
module.exports = { listar, obtener, crear, actualizar, desactivar };
