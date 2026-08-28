import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
<<<<<<< HEAD
    ".venv-report/**",
    "output/**",
    "tmp/**",
    "vendor/**",
=======
>>>>>>> 5d20e0b (Initial commit from Create Next App)
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
