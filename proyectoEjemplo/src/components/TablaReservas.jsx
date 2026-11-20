import FormularioReserva from './FormularioReserva';
import Swal from 'sweetalert2';
import { useState, useEffect } from 'react';
import DataTable from 'react-data-table-component';
import { createRoot } from 'react-dom/client';
import { obtenerClientes } from '../utils/clientesStorage';
import { generarCodigoReserva } from '../utils/reservasStorage';
import {
  formatearPrecioHabitacion,
  obtenerHabitaciones,
} from '../utils/habitacionesStorage';
import { obtenerPerfilAPI } from '../services/authService';
import {
  actualizarReservaAPI,
  cancelarReservaAPI,
  consultarHabitacionesParaReservar,
  consultarReservas,
  crearReservaAPI,
} from '../services/reservasService';

// Convierte una reserva del backend (MariaDB) al formato que usa la tabla.
function adaptarReservaAPI(reserva) {
  return {
    id: reserva.id,
    habitacionId: reserva.habitacion_id,
    habitacion: reserva.habitacion,
    habitacionTipo: reserva.habitacion_tipo,
    habitacionPrecio: Number(reserva.precio_reservado),
    entrada: reserva.fecha_entrada,
    salida: reserva.fecha_salida,
    estado: reserva.estado,
    clienteId: reserva.usuario_id,
  };
}

const reservasIniciales = [
  {
    id: 1,
    habitacion: 'Suite 201',
    entrada: '2026-10-19',
    salida: '2016-10-28',
    estado: 'Confirmada',
  },
  {
    id: 2,
    habitacion: 'Doble 106',
    entrada: '2026-11-10',
    salida: '2016-11-15',
    estado: 'Pendiente',
  },
];
function TablaReservas({ clienteId, esAdmin = false }) {
  // El admin sigue usando localStorage; el cliente lee y escribe en el backend.
  const [reservas, setReservas] = useState(() => {
    if (!esAdmin) return [];
    const guardadas = localStorage.getItem('reservasHotel');
    return guardadas ? JSON.parse(guardadas) : reservasIniciales;
  });
  const [clientes] = useState(() => (esAdmin ? obtenerClientes() : []));
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(!esAdmin);

  const recargarReservas = async () => {
    try {
      const delServidor = await consultarReservas(false);
      setReservas(delServidor.map(adaptarReservaAPI));
    } catch (error) {
      await Swal.fire({
        icon: 'error',
        title: 'No se pudieron cargar tus reservas',
        text: error.message,
        confirmButtonColor: '#344c5c',
      });
    } finally {
      setCargando(false);
    }
  };

  // Carga inicial del cliente. Los setState ocurren dentro de callbacks
  // asíncronos (no de forma síncrona en el efecto), y "activo" evita
  // actualizar el estado si el componente ya se desmontó.
  useEffect(() => {
    if (esAdmin) return;
    let activo = true;
    consultarReservas(false)
      .then((delServidor) => {
        if (activo) setReservas(delServidor.map(adaptarReservaAPI));
      })
      .catch((error) => {
        if (activo) {
          Swal.fire({
            icon: 'error',
            title: 'No se pudieron cargar tus reservas',
            text: error.message,
            confirmButtonColor: '#344c5c',
          });
        }
      })
      .finally(() => {
        if (activo) setCargando(false);
      });
    return () => {
      activo = false;
    };
  }, [esAdmin]);

  const abrirFormulario = async (reserva = null) => {
    if (!esAdmin) {
      try {
        const sesion = JSON.parse(
          sessionStorage.getItem('sesionHotel') || 'null',
        );

        if (!sesion?.token) {
          throw new Error('Debes iniciar sesión nuevamente');
        }

        const cliente = await obtenerPerfilAPI(sesion.token);
        if (
          !cliente ||
          cliente.rol !== 'cliente' ||
          cliente.activo === false ||
          cliente.activo === 0
        ) {
          await Swal.fire({
            icon: 'warning',
            title: 'Cuenta no disponible',
            text: 'No puedes realizar reservas con una cuenta inactiva.',
            confirmButtonColor: '#344c5c',
          });
          return;
        }
      } catch (error) {
        await Swal.fire({
          icon: 'error',
          title: 'No se pudo validar la cuenta',
          text: error.message || 'Intenta nuevamente más tarde.',
          confirmButtonColor: '#344c5c',
        });
        return;
      }
    }

    let habitaciones;
    try {
      habitaciones = esAdmin
        ? obtenerHabitaciones()
        : await consultarHabitacionesParaReservar();
    } catch (error) {
      await Swal.fire({
        icon: 'error',
        title: 'No se pudieron cargar las habitaciones',
        text: error.message,
        confirmButtonColor: '#344c5c',
      });
      return;
    }

    const contenedor = document.createElement('div');
    const raiz = createRoot(contenedor);

    raiz.render(
      <FormularioReserva
        reserva={reserva}
        clienteId={clienteId}
        esAdmin={esAdmin}
        clientes={clientes}
        habitaciones={habitaciones}
        reservas={reservas}
        guardar={async (datos) => {
          if (!esAdmin) {
            try {
              const sesion = JSON.parse(
                sessionStorage.getItem('sesionHotel') || 'null',
              );

              if (!sesion?.token) {
                throw new Error('Debes iniciar sesión nuevamnete ');
              }

              const cliente = await obtenerPerfilAPI(sesion.token);
              if (
                cliente.rol !== 'cliente' ||
                cliente.activo === false ||
                cliente.activo === 0
              ) {
                await Swal.fire(
                  'Cuenta no disponible',
                  'No puedes realizar reservas con una cuenta inactiva. Contacta al hotel para recibir ayuda.',
                  'warning',
                );
                return;
              }
            } catch (error) {
              await Swal.fire(
                'Error',
                error.message || 'Intenta nuevamente más tarde.',
                'error',
              );
              return;
            }
          }

          if (!esAdmin) {
            try {
              const datosAPI = {
                habitacion_id: datos.habitacionId,
                fecha_entrada: datos.entrada,
                fecha_salida: datos.salida,
                estado: datos.estado,
              };
              if (reserva) {
                await actualizarReservaAPI(reserva.id, datosAPI);
              } else {
                await crearReservaAPI(datosAPI);
              }
              await recargarReservas();
              Swal.fire({
                icon: 'success',
                title: reserva ? 'Reserva actualizada' : 'Reserva registrada',
                confirmButtonColor: '#344c5c',
              });
            } catch (error) {
              await Swal.fire({
                icon: 'error',
                title: reserva
                  ? 'No se pudo actualizar la reserva'
                  : 'No se pudo crear la reserva',
                text: error.message,
                confirmButtonColor: '#344c5c',
              });
            }
            return;
          }

          if (reserva) {
            setReservas((actuales) =>
              actuales.map((r) =>
                r.id === reserva.id
                  ? {
                      ...r,
                      ...datos,
                      clienteId: esAdmin ? datos.clienteId : r.clienteId,
                    }
                  : r,
              ),
            );
          } else {
            const nuevaReserva = {
              id: generarCodigoReserva(reservas),
              ...datos,
            };
            setReservas((actuales) => [...actuales, nuevaReserva]);
          }
          Swal.close();
        }}
        cancelar={() => Swal.close()}
      />,
    );
    await Swal.fire({
      title: reserva ? 'Editar Reserva' : 'Nueva Reserva',
      html: contenedor,
      showConfirmButton: false,
      didClose: () => raiz.unmount(),
    });
  };
  useEffect(() => {
    // Solo el admin persiste en localStorage; así los datos del backend
    // del cliente nunca pisan los de este almacenamiento.
    if (esAdmin) {
      localStorage.setItem('reservasHotel', JSON.stringify(reservas));
    }
  }, [reservas, esAdmin]);

  const cancelarReserva = async (reserva) => {
    const resultado = await Swal.fire({
      title: '¿Cancelar reserva?',
      text: `Se cancelará la reserva de ${reserva.habitacion} del ${reserva.entrada} al ${reserva.salida}.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, cancelar',
      cancelButtonText: 'No, volver',
      confirmButtonColor: '#dc3545',
    });
    if (!resultado.isConfirmed) return;

    try {
      await cancelarReservaAPI(reserva.id);
      // Se recarga desde el servidor: el estado mostrado es el real y el
      // botón queda deshabilitado al ver la reserva como "Cancelada".
      await recargarReservas();
      Swal.fire({
        icon: 'success',
        title: 'Reserva cancelada',
        confirmButtonColor: '#344c5c',
      });
    } catch (error) {
      await Swal.fire({
        icon: 'error',
        title: 'No se pudo cancelar la reserva',
        text: error.message,
        confirmButtonColor: '#344c5c',
      });
      await recargarReservas();
    }
  };

  const eliminarReserva = async (id) => {
    const resultado = await Swal.fire({
      title: ' Eliminar reserva ?',
      text: 'Esta accion eliminara la reserva',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Si, eliminar',
      confirmButtonColor: '#dc3545',
    });

    if (resultado.isConfirmed) {
      setReservas((actuales) =>
        actuales.filter((reserva) => reserva.id !== id),
      );
      Swal.fire('Reserva eliminada');
    }
  };

  const columnas = [
    {
      name: 'Codigo',
      selector: (fila) => fila.id,
      sortable: true,
    },
    {
      name: 'Habitación',
      selector: (fila) => fila.habitacion,
      sortable: true,
    },
    {
      name: 'Tipo',
      selector: (fila) => fila.habitacionTipo || '—',
      sortable: true,
    },
    {
      name: 'Precio',
      selector: (fila) => fila.habitacionPrecio ?? '',
      format: (fila) =>
        fila.habitacionPrecio == null
          ? '—'
          : formatearPrecioHabitacion(fila.habitacionPrecio),
      sortable: true,
    },
    ...(esAdmin
      ? [
          {
            name: 'Cliente',
            selector: (fila) => {
              const cliente = clientes.find(
                (item) => item.id === fila.clienteId,
              );
              return cliente
                ? cliente.perfil?.nombre || cliente.correo
                : 'Sin asignar';
            },
            sortable: true,
          },
        ]
      : []),
    {
      name: 'Entrada',
      selector: (fila) => fila.entrada,
      sortable: true,
    },
    {
      name: 'Salida',
      selector: (fila) => fila.salida,
      sortable: true,
    },
    {
      name: 'Estado',
      selector: (fila) => fila.estado,
      sortable: true,
    },
    {
      name: 'Acciones',
      width: '200px',
      cell: (fila) =>
        !esAdmin ? (
          <div className="d-flex gap-2">
            <button
              className="btn btn-sm btn-outline-primary"
              title={
                fila.estado === 'Cancelada'
                  ? 'Una reserva cancelada no se puede editar'
                  : 'Editar'
              }
              disabled={fila.estado === 'Cancelada'}
              onClick={() => abrirFormulario(fila)}
            >
              <i className="bi bi-pencil-square"></i>
            </button>
            <button
              className="btn btn-sm btn-outline-danger"
              title={
                fila.estado === 'Cancelada'
                  ? 'Esta reserva ya está cancelada'
                  : 'Cancelar reserva'
              }
              disabled={fila.estado === 'Cancelada'}
              onClick={() => cancelarReserva(fila)}
            >
              <i className="bi bi-x-circle me-1"></i>
              {fila.estado === 'Cancelada' ? 'Cancelada' : 'Cancelar'}
            </button>
          </div>
        ) : (
          <div className="d-flex gap-2">
            <button
              className="btn btn-sm btn-outline-primary"
              title="Editar"
              onClick={() => abrirFormulario(fila)}
            >
              <i className="bi bi-pencil-square"></i>
            </button>
            <button
              className="btn btn-sm btn-outline-danger"
              title="Eliminar"
              onClick={() => eliminarReserva(fila.id)}
            >
              <i className="bi bi-trash"></i>
            </button>
          </div>
        ),
    },
  ];

  // Para el cliente el backend ya devuelve únicamente sus reservas.
  const reservasPropias = reservas;
  const reservasFiltradas = reservasPropias.filter(
    (reserva) =>
      reserva.habitacion.toLowerCase().includes(busqueda.toLowerCase()) ||
      reserva.estado.toLowerCase().includes(busqueda.toLowerCase()),
  );

  return (
    <div>
      <div className="d-flex justify-content-between mb-3 gap-2 ">
        <input
          type="text"
          className="form-control"
          style={{ maxWidth: '280px' }}
          placeholder="Buscar reserva..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
        <button
          className="btn text-white"
          style={{ backgroundColor: '#344c5c' }}
          onClick={() => abrirFormulario()}
        >
          <i className="bi bi-plus-circle me-2"></i>
          {esAdmin ? 'Nueva Reserva' : 'Reservar habitación'}
        </button>
      </div>
      <DataTable
        columns={columnas}
        data={reservasFiltradas}
        pagination
        highlightOnHover
        responsive
        progressPending={cargando}
        noDataComponent={
          esAdmin
            ? 'No se encontraron reservas'
            : 'Aún no tienes reservas. Crea una para verla aquí.'
        }
      />
    </div>
  );
}

export default TablaReservas;
