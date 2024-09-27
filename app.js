const { createBot, createProvider, createFlow, addKeyword, addAnswer, EVENTS } = require('@bot-whatsapp/bot');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const QRPortalWeb = require('@bot-whatsapp/portal');
const BaileysProvider = require('@bot-whatsapp/provider/baileys');
const MockAdapter = require('@bot-whatsapp/database/mock');
const axios = require('axios');
const path = require('path');

const { MUNICIPIOS, DEPARTAMENTOS } = require('./const');

DEPARTAMENTOS.sort((a, b) => a.nombre_parametro.localeCompare(b.nombre_parametro));
const departamentosLimpios = DEPARTAMENTOS.map((departamento, index) => `*${index + 1}) ${departamento.nombre_parametro}*`).join('\n');

/**
 * Función para validar un documento a través de una API.
 * @param {string} document_type - Tipo de documento a validar.
 * @param {string} document_number - Número de documento a validar.
 * @returns {Object|null} - Resultado de la validación o null si no se encontró.
 * @throws {Error} - Si ocurre un error en la validación.
 */
async function validarDocumento(document_type, document_number) {
  try {
    const response = await axios.get('', {  // URL comprometida vacía
      params: { document_type, document_number }
    });
    return response.data;
  } catch (error) {
    if (error.response && error.response.status === 404) {
      return null;
    }
    console.error('Error al validar el documento:', error);
    throw error;
  }
}

/**
 * Función para enviar los datos del usuario a una API externa.
 * @param {Object} userData - Datos del usuario a enviar.
 * @returns {Object} - Respuesta de la API.
 * @throws {Error} - Si ocurre un error al enviar los datos.
 */
async function enviarDatosApi(userData) {
  try {
    const apiUrl = '';  // URL comprometida vacía

    const response = await axios.post(apiUrl, userData, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error al enviar los datos:', error);
  }
}

const timers = {};
const IDLE_TIME = 45000;  // 45 segundos

/**
 * Función para iniciar un temporizador de inactividad.
 * @param {Object} ctx - Contexto del mensaje.
 * @param {Function} flowDynamic - Función para el flujo dinámico.
 * @param {number} ms - Milisegundos de espera.
 * @param {string} mensaje - Mensaje a enviar tras el tiempo de inactividad.
 */
const start = (ctx, flowDynamic, ms, mensaje) => {
    if (!timers[ctx.from]) {
        timers[ctx.from] = [];
    }
    const timer = setTimeout(async () => {
        console.log(`User timeout: ${ctx.from}`);
        return await flowDynamic(mensaje);
    }, ms);
    timers[ctx.from].push(timer);
};

/**
 * Función para repetir un temporizador de inactividad.
 * @param {Object} ctx - Contexto del mensaje.
 * @param {Function} flowDynamic - Función para el flujo dinámico.
 * @param {number} ms - Milisegundos de espera.
 * @param {string} mensaje - Mensaje a enviar tras el tiempo de inactividad.
 * @param {number} times - Número de repeticiones.
 * @param {Function} endFlow - Función para terminar el flujo.
 */
const repeatStart = (ctx, flowDynamic, ms, mensaje, times, endFlow) => {
    if (times > 0) {
        start(ctx, flowDynamic, ms, mensaje);
        const repeatTimer = setTimeout(() => {
            repeatStart(ctx, flowDynamic, ms, mensaje, times - 1, endFlow);
        }, ms);
        if (!timers[ctx.from]) {
            timers[ctx.from] = [];
        }
        timers[ctx.from].push(repeatTimer);
    } else {
        flowDynamic('Lo siento, parece que no estás disponible en este momento. Gracias por tu tiempo. ¡Hasta luego!');
        endFlow();
    }
};

/**
 * Función para reiniciar el temporizador de inactividad.
 * @param {Object} ctx - Contexto del mensaje.
 * @param {Function} flowDynamic - Función para el flujo dinámico.
 * @param {number} ms - Milisegundos de espera.
 * @param {string} mensaje - Mensaje a enviar tras el tiempo de inactividad.
 * @param {Function} endFlow - Función para terminar el flujo.
 */
const reset = (ctx, flowDynamic, ms, mensaje, endFlow) => {
    stop(ctx);
    console.log(`reset countdown for the user: ${ctx.from}`);
    repeatStart(ctx, flowDynamic, ms, mensaje, 3, endFlow);
};

/**
 * Función para detener el temporizador de inactividad.
 * @param {Object} ctx - Contexto del mensaje.
 */
const stop = (ctx) => {
    if (timers[ctx.from]) {
        timers[ctx.from].forEach(timer => clearTimeout(timer));
        timers[ctx.from] = [];
    }
};

/**
 * Flujo para cancelar el registro.
 */
const flowCancelar = addKeyword(['cancelar', 'terminar', 'salir'])
  .addAction(async (ctx) => stop(ctx))
  .addAnswer('Entendido. Gracias por tu tiempo. Si necesitas algo más, no dudes en escribir "hola" nuevamente.')
  .addAction(async (_, { endFlow }) => {
    return endFlow();
  });

// Definición de flujos de conversación
let municipiosFiltrados;
let municipiosLimpios;

/**
 * Flujo para solicitar los datos personales.
 */
const flowDatosPersonales = addKeyword(['registro'])
  .addAction(async (ctx, { flowDynamic, endFlow }) => reset(ctx, flowDynamic, IDLE_TIME, 'Por favor, ingrese sus nombres.', endFlow))
  .addAnswer(
    ['Por favor ingrese sus nombres'],
    { capture: true },
    async (ctx, { state, gotoFlow, endFlow }) => {
      if (ctx.body.toLowerCase() === 'cancelar') {
        stop(ctx);
        return endFlow('Su solicitud ha sido cancelada.');
      }
      const first_name = ctx.body;
      await state.update({ first_name });
      stop(ctx);
      return gotoFlow(flowApellidos);
    }
  );

/**
 * Flujo para solicitar los apellidos.
 */
const flowApellidos = addKeyword([EVENTS.ACTION])
  .addAction(async (ctx, { flowDynamic, endFlow }) => reset(ctx, flowDynamic, IDLE_TIME, 'Por favor, ingrese sus apellidos.', endFlow))
  .addAnswer(
    ['Por favor ingrese sus apellidos'],
    { capture: true },
    async (ctx, { state, gotoFlow, endFlow }) => {
      if (ctx.body.toLowerCase() === 'cancelar') {
        stop(ctx);
        return endFlow('Su solicitud ha sido cancelada.');
      }
      const surname = ctx.body;
      await state.update({ surname });
      stop(ctx);
      return gotoFlow(flowGenero);
    }
  );

/**
 * Flujo para solicitar el género.
 */
const flowGenero = addKeyword([EVENTS.ACTION])
  .addAction(async (ctx, { flowDynamic, endFlow }) => reset(ctx, flowDynamic, IDLE_TIME, 'Por favor, seleccione su género.', endFlow))
  .addAnswer(
    ['Por favor seleccione su género:\n1) Masculino\n2) Femenino'],
    { capture: true },
    async (ctx, { state, gotoFlow, endFlow }) => {
      const genero = ctx.body.toLowerCase();
      if (genero === 'cancelar') {
        stop(ctx);
        return endFlow('Su solicitud ha sido cancelada.');
      }

      let genderValue = '';
      if (genero === '1') genderValue = 'Masculino';
      else if (genero === '2') genderValue = 'Femenino';
      else return endFlow('Selección no válida, por favor intente de nuevo.');

      await state.update({ genero: genderValue });
      stop(ctx);
      return gotoFlow(flowEdad);
    }
  );

/**
 * Flujo para solicitar la edad.
 */
const flowEdad = addKeyword([EVENTS.ACTION])
  .addAction(async (ctx, { flowDynamic, endFlow }) => reset(ctx, flowDynamic, IDLE_TIME, 'Por favor, ingrese su edad.', endFlow))
  .addAnswer(
    ['Por favor ingrese su edad'],
    { capture: true },
    async (ctx, { state, gotoFlow, endFlow }) => {
      const age = parseInt(ctx.body);
      if (ctx.body.toLowerCase() === 'cancelar') {
        stop(ctx);
        return endFlow('Su solicitud ha sido cancelada.');
      }
      if (isNaN(age) || age < 18 || age > 100) {
        return endFlow('Edad no válida. Debe tener entre 18 y 100 años. Intente nuevamente.');
      }
      await state.update({ age });
      stop(ctx);
      return gotoFlow(flowDepartamento);
    }
  );

/**
 * Flujo para seleccionar un departamento.
 */
const flowDepartamento = addKeyword([EVENTS.ACTION])
  .addAction(async (ctx, { flowDynamic, endFlow }) => reset(ctx, flowDynamic, IDLE_TIME, 'Por favor, seleccione su departamento.', endFlow))
  .addAnswer(
    [`Por favor seleccione su departamento:\n\n${departamentosLimpios}\n\nIngrese el número de su departamento.`],
    { capture: true },
    async (ctx, { state, gotoFlow, endFlow }) => {
      const index = parseInt(ctx.body) - 1;
      if (ctx.body.toLowerCase() === 'cancelar') {
        stop(ctx);
        return endFlow('Su solicitud ha sido cancelada.');
      }
      if (isNaN(index) || index < 0 || index >= DEPARTAMENTOS.length) {
        return endFlow('Selección no válida, por favor intente de nuevo.');
      }

      const departamento = DEPARTAMENTOS[index].nombre_parametro;
      municipiosFiltrados = MUNICIPIOS.filter(m => m.id_padre === DEPARTAMENTOS[index].id_parametro);
      municipiosLimpios = municipiosFiltrados.map((m, i) => `*${i + 1}) ${m.nombre_parametro}*`).join('\n');
      await state.update({ departamento });
      stop(ctx);
      return gotoFlow(flowMunicipio);
    }
  );

/**
 * Flujo para seleccionar un municipio.
 */
const flowMunicipio = addKeyword([EVENTS.ACTION])
  .addAction(async (ctx, { flowDynamic, endFlow }) => reset(ctx, flowDynamic, IDLE_TIME, 'Por favor, seleccione su municipio.', endFlow))
  .addAnswer(
    [`Por favor seleccione su municipio:\n\n${municipiosLimpios}\n\nIngrese el número de su municipio.`],
    { capture: true },
    async (ctx, { state, gotoFlow, endFlow }) => {
      const index = parseInt(ctx.body) - 1;
      if (ctx.body.toLowerCase() === 'cancelar') {
        stop(ctx);
        return endFlow('Su solicitud ha sido cancelada.');
      }
      if (isNaN(index) || index < 0 || index >= municipiosFiltrados.length) {
        return endFlow('Selección no válida, por favor intente de nuevo.');
      }

      const municipio = municipiosFiltrados[index].nombre_parametro;
      await state.update({ municipio });
      stop(ctx);
      return gotoFlow(flowResumen);
    }
  );

/**
 * Flujo para mostrar el resumen de los datos.
 */
const flowResumen = addKeyword([EVENTS.ACTION])
  .addAction(async (ctx, { flowDynamic, state, endFlow }) => {
    const userData = state.getMyState();
    await flowDynamic([
      'Estos son los datos que has proporcionado:\n',
      `- Nombres: *${userData.first_name}*`,
      `- Apellidos: *${userData.surname}*`,
      `- Género: *${userData.genero}*`,
      `- Edad: *${userData.age}*`,
      `- Departamento: *${userData.departamento}*`,
      `- Municipio: *${userData.municipio}*`,
    ]);
    stop(ctx);
    return endFlow();
  });

/**
 * Inicializa el bot con el proveedor y adaptador de base de datos.
 */
const main = async () => {
    const adapterDB = new MockAdapter();
    const flowPrincipal = createFlow([flowDatosPersonales, flowCancelar]);

    const provider = new BaileysProvider({
        logger: pino({ level: 'silent' }),
        QRPortalWeb,
    });

    createBot({
        flow: flowPrincipal,
        provider,
        adapterDB,
    });
};

main();
