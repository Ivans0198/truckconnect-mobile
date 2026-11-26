// Los fixtures viven en src/mocks porque ahora también los importa la app
// (mocks de desarrollo). Los tests siguen importándolos desde aquí.
export { driverAccountFixture, tokensFixture } from "@/mocks/auth-fixtures";
