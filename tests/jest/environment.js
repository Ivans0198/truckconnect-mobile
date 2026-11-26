// El entorno nativo de jest-expo, más una copia del fetch real de Node.
//
// En jest, Expo instala su `expo/fetch` como global, y su módulo nativo es un
// stub vacío: cada respuesta llega sin `status` ni cuerpo. Guardamos aquí el
// fetch de Node, antes de que Expo y React Native lo reemplacen, para que
// jest.setup.ts lo restaure y msw intercepte un fetch de verdad. En el
// teléfono la app sigue usando expo/fetch; esto solo vive en los tests.
const { TestEnvironment } = require("jest-expo/src/preset/nativeEnvironment");

class TestEnvironmentWithNodeFetch extends TestEnvironment {
  constructor(config, context) {
    super(config, context);
    this.global.__nodeFetch = {
      fetch: this.global.fetch,
      Request: this.global.Request,
      Response: this.global.Response,
      Headers: this.global.Headers,
    };
  }
}

module.exports = TestEnvironmentWithNodeFetch;
