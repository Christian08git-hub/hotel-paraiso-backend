const API_URL = `${import.meta.env.VITE_API_URL || "http://localhost:3000"}/api/auth`;

async function enviarSolicitud(ruta, datos) {
  let respuesta;
  try {
    respuesta = await fetch(`${API_URL}${ruta}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(datos)
    });
  } catch {
    throw new Error("No se pudo conectar con el servidor.");
  }
  const resultado = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok) throw new Error(resultado.mensaje || "Error en la solicitud.");
  return resultado;
}

export const iniciarSesionAPI = (correo, password) => enviarSolicitud("/login", { correo, password });
export const registrarClienteAPI = (datos) => enviarSolicitud("/registro", datos);
