import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });

/**
 * ESLint flat config — next/core-web-vitals + next/typescript।
 * `npm run lint` (--max-warnings=0) ক্লিন পাস করতে হবে।
 */
const config = [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "drizzle/**",
      "public/**",
      "scripts/**",
      "next-env.d.ts",
      "**/*.tsbuildinfo",
    ],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // টাকার হিসাব পূর্ণসংখ্যায় — কোথাও ভাসমান সংখ্যা ছেঁটে ফেলা যাবে না
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
      eqeqeq: ["error", "always", { null: "ignore" }],
      "prefer-const": "error",
      "no-var": "error",
    },
  },
  {
    // টেস্ট ফাইলে console অনুমোদিত
    files: ["tests/**/*.{ts,tsx,mjs}"],
    rules: { "no-console": "off" },
  },
];

export default config;
