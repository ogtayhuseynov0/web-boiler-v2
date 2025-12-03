import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off", // <-- Allow `any`
      "@typescript-eslint/no-unused-vars": "off", // <-- Allow unused variables
      "react-hooks/exhaustive-deps": "off", // <-- Disable exhaustive-deps rule
      "@next/next/no-img-element": "off", // <-- Disable no-img-element rule
      "@typescript-eslint/no-empty-object-type": "off", // <-- Disable no-empty-object-type rule
      "@typescript-eslint/ban-ts-comment": "off",
      "@typescript-eslint/no-this-alias": "off",
      "@typescript-eslint/no-unsafe-function-type": "off",
    },
  }
];

export default eslintConfig;
