import { useState , useEffect  } from "react"
import FormularioHabitacion from "./FormularioHabitacion"
import Swal from "sweetalert2"

import DataTable from "react-data-table-component"
import { formatearPrecioHabitacion } from "../utils/habitacionesStorage"

import {
    listarHabitacionesAPI, 
    crearHabitacionAPI, 
    actualizarHabitacionAPI,
    desactivarHabitacionAPI
} from  "../services/habitaciones.Service"


function TablaHabitaciones() {
    const [habitaciones, setHabitaciones] = useState([])
    const [mostrarFormulario , setMostrarFormulario] = useState(false)
    const [habitacionEditando, setHabitacionEditando] = useState(null)
    
    useEffect(() => {
        async function cargarHabitaciones(){
            try{
                const datos = await listarHabitacionesAPI()
                setHabitaciones(datos)
            }catch (error){
                Swal.fire("Error", error.message, "error")
            }
        }
      cargarHabitaciones()
    }, [])

    const [busqueda , setBusqueda] = useState("")

    const editarHabitacion = (habitacion) => {
        setHabitacionEditando(habitacion)
        setMostrarFormulario(true)
    }

    const guardarHabitacion = async (datos) => {
        try{
        if (habitacionEditando) {
            const actualizada = await actualizarHabitacionAPI(
                   habitacionEditando.id,
                   datos
            )
             setHabitaciones((actuales) => 
                actuales.map((habitacion) =>
                habitacion.id === habitacionEditando.id
             ? actualizada
             : habitacion
                )
             )

            Swal.fire("Actualizada", "Habitacion actualizada en BD", "success")
            } else {
                const nueva = await crearHabitacionAPI(datos)
                setHabitaciones((actuales)=> [...actuales, nueva])
                 Swal.fire("Registrada", "Habitacion guardada", "success")
            }
        setMostrarFormulario(false)
        setHabitacionEditando(null)
    } catch (error){
         Swal.fire("Error", error.message, "error")
    }
}

    const cancelarFormulario = () => {
        setMostrarFormulario(false)
        setHabitacionEditando(null)
    }

    const eliminarHabitacion = async (habitacion) => {
        const resultado = await  Swal.fire({
            title :"Desactivar Habitación ?",
            text: `Se desactivara la habitación ${habitacion.nombre}`, 
            icon:"warning",
            showCancelButton: true,
            confirmButtonText:"Si, desactivar",
            cancelButtonText:"Cancelar",
            confirmButtonColor:"#344c5c",

        })
               
            if (!resultado.isConfirmed)  return
                try {
                    await desactivarHabitacionAPI(habitacion.id)
                    setHabitaciones((actuales) =>
                    actuales.filter((h) => h.id !== habitacion.id)
                )
                Swal.fire(
                    "Desactivada",
                    "La habitacion se descativo correctamente",
                    "success" 
                    )
            } catch (error) {
              Swal.fire("Error", error.message, "error")
        }
    }

    const columnas =[
        {
            name:"ID",
            selector:fila => fila.id,
            sortable:true
        }, 
        {
            name:"Habitación",
            selector:fila => fila.nombre,
            sortable:true
        }, 
        {
            name:"Tipo",
            selector:fila => fila.tipo,
            sortable:true
        },
        {
            name:"Precio",
            selector:fila => fila.precio,
            format: fila => formatearPrecioHabitacion(fila.precio),
            sortable:true
        },
        {
            name:"Estado",
            selector:fila => fila.estado,
            sortable:true
        }, 
        {
            name:"Acciones",
            cell: (fila) => (
                <div className="d-flex gap-2">
                    <button
                    className="btn btn-sm btn-outline-primary"
                    onClick={() => editarHabitacion(fila)}
                    >
                        <i className="bi bi-pencil-square"></i>
                    </button>

                    <button
                    className="btn btn-sm btn-outline-danger"
                    onClick={() => eliminarHabitacion(fila)}
                    >
                        <i className="bi bi-trash"></i>
                    </button>

                </div>
            )

        } 
        
    ]

    const habitacionesFiltradas = habitaciones.filter((habitacion) =>
        habitacion.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        habitacion.estado.toLowerCase().includes(busqueda.toLowerCase()) 
    ) 


    return(
        <section className="hp-panel">
            
            <div className="d-flex justify-content-between align-items-center mb-3">
            
            <h2 className="mb-0">Gestión de habitaciones</h2>
            <button
            className="btn-nueva-habitacion"
            onClick={() => {
                setHabitacionEditando(null)
                setMostrarFormulario(true)
            }}
            >
                + Nueva Habitación 
            </button>

             </div>   

            {mostrarFormulario && (
                <div className="card p-4 mb-4">
                    <h5 className="mb-3">
                        {habitacionEditando ? "Editar Habitación" : "Registrar Habitación"}
                    </h5>
                    <FormularioHabitacion 
                    key={habitacionEditando?.id ?? "nueva"}
                    habitacion={habitacionEditando}
                    guardar={guardarHabitacion}
                    cancelar={cancelarFormulario}
                    />
                </div>
            )}


            <p className="text-secondary"> Consulta y Administración de habitaciones </p>
        
            <div className="mt-4">
                <div className="d-flex justify-content-end mb-3">
                    <div className="input-group w-100" style={{ maxWidth: "400px" }}>
                        <span className="input-group-text">
                            <i className="bi bi-search" aria-hidden="true"></i>
                        </span>
                        <input
                            type="text"
                            className="form-control"
                            placeholder="Buscar por habitacion nombre o estado"
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                        />
                    </div>
                </div>

                <DataTable  
                columns={columnas}
                data={habitacionesFiltradas}
                pagination
                highlightOnHover
                striped
                responsive
                noDataComponent="No hay habitaciones registradas"
                
                />
            </div>
        
        </section>
    )
}

export  default TablaHabitaciones