const API_URL = 'http://localhost:3000/api/habitaciones';

function obtenerToken() {
  try {
    const sesion = JSON.parse(sessionStorage.getItem('sesionHotel') || 'null');
    if (!sesion?.token) throw new Error('Debes iniciar sesión');
    return sesion.token;
  } catch {
    throw new Error('Debes iniciar sesión');
  }
}

async function solicitar(ruta = '', metodo = 'GET', datos) {
  let respuesta;
  try {
    respuesta = await fetch(`${API_URL}${ruta}`, {
      method: metodo,
      headers: {
        Authorization: `Bearer ${obtenerToken()}`,
        ...(datos ? { 'Content-Type': 'application/json' } : {})
      },
      ...(datos ? { body: JSON.stringify(datos) } : {})
    });
  } catch (error) {
    if (error.message === 'Debes iniciar sesión') throw error;
    throw new Error('No se pudo conectar con el backend');
  }
  const resultado = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok) throw new Error(resultado.mensaje || `Error HTTP ${respuesta.status}`);
  return resultado;
}

export async function listarHabitacionesAPI() {
  return (await solicitar()).habitaciones;
}
export async function crearHabitacionAPI(datos) {
  return (await solicitar('', 'POST', datos)).habitacion;
}
export async function actualizarHabitacionAPI(id, datos) {
  return (await solicitar(`/${id}`, 'PUT', datos)).habitacion;
}
export async function desactivarHabitacionAPI(id) {
  return solicitar(`/${id}`, 'DELETE');
}
