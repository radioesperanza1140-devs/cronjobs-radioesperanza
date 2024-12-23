const schedule = require("node-schedule");
const axios = require("axios");
const moment = require('moment-timezone');


// URL base de la API
const apiUrl = "https://dev.radioesperanza1140.com/api/programations";

/**
 * Función principal que consulta las programaciones y actualiza el estado de cada una.
 */
async function performQuery() {
  try {
    console.log("Consulta iniciada:", moment.utc(new Date()).format('YYYY-MM-DDTHH:mm:ss'));
    const programations = await getProgramations();
    let diaActual = new Date().toLocaleString("es-ES", { weekday: "long" });
  
    for (const programacion of programations) {
      // Desactivar todas las programaciones previas
      await updateProgramation(programacion.documentId, 0);
  
      // Verificar que los datos esenciales existan
      if (!programacion.dias_EnEmision || !programacion.horario_emision_inicio || !programacion.horario_emision_fin) {
        console.error("Datos incompletos en programación:", programacion);
        continue;
      }
  
      let diasDeEmision = programacion.dias_EnEmision;
      
      if (isValidDay(diasDeEmision, diaActual)) {
        const fechaHoy = moment.utc(new Date()).format('YYYY-MM-DD');
        

        // Concatenar la fecha con el tiempo de inicio y fin
        const horaInicioStr = `${fechaHoy}T${programacion.horario_emision_inicio}`;
        const horaFinStr = `${fechaHoy}T${programacion.horario_emision_fin}`;
  
        // Convertir las cadenas a objetos Date
        const horaInicio = new moment.utc(new Date(horaInicioStr)).format('YYYY-MM-DDTHH:mm:ss');
        const horaFin = new moment.utc(new Date(horaFinStr)).format('YYYY-MM-DDTHH:mm:ss');
        const ahora = new moment.utc(new Date()).format('YYYY-MM-DDTHH:mm:ss'); 
        console.log(horaInicio);
        console.log(horaFin);
        console.log(ahora);
        // Verificar si la hora actual está dentro del rango de emisión
        if (horaInicio <= ahora && horaFin >= ahora) {
          console.log(`Programación activa: ${programacion.title}`);
          await updateProgramation(programacion.documentId, 1);
        }
      }
    }
  
    console.log("Consulta finalizada:", new Date());
  } catch (error) {
    console.error("Error durante la ejecución del job:", error);
  }
  
}

/**
 * Obtiene las programaciones desde la API.
 */
const getProgramations = async () => {
  try {
    const response = await axios.get(`${apiUrl}?populate=imagen`);
    return response.data.data;
  } catch (error) {
    console.error(
      "Error al obtener las programaciones:",
      error.response?.data || error.message
    );
    return [];
  }
};

/**
 * Actualiza el estado de una programación en la API.
 *
 * @param {string} programationId - ID de la programación.
 * @param {number} isActive - Estado de la programación (1 para activa, 0 para inactiva).
 */
const updateProgramation = async (programationId, isActive) => {
  try {
    const response = await axios.put(`${apiUrl}/${programationId}`, {
      data: {
        currentProgram: isActive,
      },
    });
    console.log(
      `Programación ${programationId} actualizada a estado: ${isActive}`
    );
    return response.data;
  } catch (error) {
    console.error(
      `Error al actualizar la programación ${programationId}:`,
      error.response?.data || error.message
    );
    return null;
  }
};

/**
 * Valida si el día actual está dentro del rango de días especificado.
 *
 * @param {string} rangoDias - Cadena que indica los días de emisión.
 * @param {string} diaActual - Día de la semana actual.
 * @returns {boolean} - Verdadero si el día actual es válido, falso en caso contrario.
 */
const isValidDay = (rangoDias, diaActual) => {
  rangoDias = rangoDias.toLowerCase().trim();
  diaActual = diaActual.toLowerCase().trim();
  console.log(diaActual);
  let diasDeLaSemana = [
    "domingo",
    "lunes",
    "martes",
    "miércoles",
    "jueves",
    "viernes",
    "sábado",
  ];

  if (rangoDias.includes(diaActual)) {
    return true;
  }

  if (rangoDias.includes("a")) {
    const [inicio, fin] = rangoDias.split("a").map((dia) => dia.trim());
    const diaInicio = diasDeLaSemana.indexOf(inicio);
    const diaFin = diasDeLaSemana.indexOf(fin);
    const diaHoy = diasDeLaSemana.indexOf(diaActual);

    return diaHoy >= diaInicio && diaHoy <= diaFin;
  }

  return false;
};

// Programa el job para ejecutarse cada 30 minutos
schedule.scheduleJob("*/1 * * * *", async () => {
  console.log("Job iniciado:", moment.utc(new Date()).format('YYYY-MM-DD'));
  await performQuery();
  console.log("Job terminado:", moment.utc(new Date()).format('YYYY-MM-DD'));
});

console.log("Job programado para ejecutarse cada 30 minutos.");
