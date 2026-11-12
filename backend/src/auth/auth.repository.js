import { z } from "zod";
import pool from "../config/db.js";

export const registroSchema = z.object({
  nombre: z.string().trim().min(1, "El nombre es obligatorio"),
  correo: z.email("Correo electrónico inválido").trim().toLowerCase(),
  telefono: z.string().trim().min(7, "Teléfono demasiado corto").max(20),
  password: z.string().min(8, "La contraseña debe tener mínimo 8 caracteres").max(128)
});

export const loginSchema = z.object({
  correo: z.email("Correo electrónico inválido").trim().toLowerCase(),
  password: z.string().min(1, "La contraseña es obligatoria")
});

export async function buscarPorCorreo(correo) {
  const [filas] = await pool.execute(
    `SELECT u.id, u.nombre, u.correo, u.telefono, u.password_hash,
            u.activo, r.nombre AS rol
     FROM usuarios u
     JOIN roles r ON r.id = u.rol_id
     WHERE u.correo = ?`,
    [correo]
  );
  return filas[0] || null;
}

export async function obtenerRolCliente() {
  const [filas] = await pool.execute(
    "SELECT id FROM roles WHERE nombre = ?", ["cliente"]
  );
  return filas[0] || null;
}

export async function crearUsuario(datos) {
  const [resultado] = await pool.execute(
    `INSERT INTO usuarios (nombre, correo, telefono, password_hash, rol_id)
     VALUES (?, ?, ?, ?, ?)`,
    [datos.nombre, datos.correo, datos.telefono, datos.passwordHash, datos.rolId]
  );
  return resultado.insertId;
}
