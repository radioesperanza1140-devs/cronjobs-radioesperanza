const schedule = require("node-schedule");
const axios = require("axios");
const moment = require("moment-timezone");

// Zona horaria para Colombia
const TIMEZONE = "America/Bogota";

// URL base de la API
const apiUrl = "https://dev.radioesperanza1140.com/api/programations";

/**
 * Función principal que consulta las programaciones y actualiza el estado de cada una.
 */
async function performQuery() {
  try {
    console.log("Consulta iniciada:", moment().local().format("YYYY-MM-DDTHH:mm:ss"));
    const programations = await getProgramations();
    let diaActual = moment().tz(TIMEZONE).locale("es").format("dddd"); // Día actual en español
  
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
        const fechaHoy = moment().tz(TIMEZONE).local().format("YYYY-MM-DD");

        // Concatenar la fecha con el tiempo de inicio y fin
        const horaInicioStr = `${fechaHoy}T${programacion.horario_emision_inicio}`;
        const horaFinStr = `${fechaHoy}T${programacion.horario_emision_fin}`;
  
        // Convertir las cadenas a objetos moment en la zona horaria correcta
        const horaInicio = moment.tz(horaInicioStr, TIMEZONE).local();
        const horaFin = moment.tz(horaFinStr, TIMEZONE).local();
        const ahora = moment().tz(TIMEZONE).local();
  
        console.log(`Hora inicio: ${horaInicio.format("YYYY-MM-DDTHH:mm:ss")}`);
        console.log(`Hora fin: ${horaFin.format("YYYY-MM-DDTHH:mm:ss")}`);
        console.log(`Hora actual: ${ahora.format("YYYY-MM-DDTHH:mm:ss")}`);
  
        // Verificar si la hora actual está dentro del rango de emisión
        if (ahora.isBetween(horaInicio, horaFin, null, "[)")) {
          console.log(`Programación activa: ${programacion.title}`);
          await updateProgramation(programacion.documentId, 1);
        }
      }
    }
  
    console.log("Consulta finalizada:", moment().tz(TIMEZONE).local().format("YYYY-MM-DDTHH:mm:ss"));
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
  console.log("Job iniciado:", moment().tz(TIMEZONE).local().format("YYYY-MM-DDTHH:mm:ss"));
  await performQuery();
  console.log("Job terminado:", moment().tz(TIMEZONE).local().format("YYYY-MM-DDTHH:mm:ss"));
});

console.log("Job programado para ejecutarse cada 30 minutos.");
