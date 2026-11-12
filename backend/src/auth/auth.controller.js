
import { registroSchema, loginSchema } from "./auth.schema.js";
import * as service from "./auth.service.js";

function responderDatosInvalidos(res, resultado) {
  return res.status(400).json({
    mensaje: "Datos inválidos",
    errores: resultado.error.issues.map(({ path, message }) => ({
      campo: path.join("."),
      mensaje: message
    }))
  });
}

function responderError(res, error) {
  // Los errores con .status los lanza el service a propósito (409, 401, 403...)
  if (error.status) {
    return res.status(error.status).json({ mensaje: error.message });
  }

  console.error("Error inesperado en auth:", error);
  return res.status(500).json({ mensaje: "Error interno del servidor" });
}

export async function registro(req, res) {
  const resultado = registroSchema.safeParse(req.body);
  if (!resultado.success) return responderDatosInvalidos(res, resultado);

  try {
    const usuario = await service.registrar(resultado.data);
    return res.status(201).json({
      mensaje: "Usuario registrado correctamente",
      usuario
    });
  } catch (error) {
    return responderError(res, error);
  }
}

export async function login(req, res) {
  const resultado = loginSchema.safeParse(req.body);
  if (!resultado.success) return responderDatosInvalidos(res, resultado);

  try {
    const { token, usuario } = await service.iniciarSesion(resultado.data);
    return res.status(200).json({
      mensaje: "Inicio de sesión exitoso",
      token,
      usuario
    });
  } catch (error) {
    return responderError(res, error);
  }
}

export async function obtenerPerfil(req, res) {
  try {
    const usuario = await service.obtenerUsuarioActual(req.usuario.id);
    return res.status(200).json({ usuario });
  } catch (error) {
    return responderError(res, error);
  }
}