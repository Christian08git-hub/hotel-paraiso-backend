import { z } from 'zod'

const registroSchema = z.object({
  nombre: z.string().trim().min(1, 'el nombre es obligatorio'),
  correo: z.email('correo electronico invalido')
    .trim()
    .toLowerCase(),

  telefono: z.string().trim().min(7, 'el telefono debe ser minimo 7 digitos')
    .max(20, 'tiene demasiados numeros'),

  password: z.string()
    .min(8, 'la contraseña debe ser minimo 8 caracteres')
    .max(120, 'la contraseña es demasiado larga'),

})

export { registroSchema };