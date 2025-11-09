import { fileURLToPath } from "url";
import { dirname } from "path";
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
      // Allow apostrophes and quotes in JSX text
      "react/no-unescaped-entities": "off",
      
      // Downgrade unused vars to warnings instead of errors
      "@typescript-eslint/no-unused-vars": ["warn", {
        "argsIgnorePattern": "^_",
        "varsIgnorePattern": "^_",
        "caughtErrorsIgnorePattern": "^_"
      }],
      
      // Allow explicit any in some cases (can be stricter in production)
      "@typescript-eslint/no-explicit-any": "warn",
      
      // Allow empty interfaces that extend other types
      "@typescript-eslint/no-empty-object-type": "off",
      
      // React hooks exhaustive deps as warning
      "react-hooks/exhaustive-deps": "warn",
    },
  },
  {
    ignores: [
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "node_modules/**",
    ],
  },
];

export default eslintConfig;
