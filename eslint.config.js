// @ts-check

import eslint from "@eslint/js";
import { defineConfig } from "eslint/config";
import prettierConfig from "eslint-config-prettier";
import tseslint from "typescript-eslint";

// eslint-config-prettier의 rules 타입이 ESLint의 RuleConfig와 호환되지 않음
// (prettier측에서 string을 쓰지만 ESLint는 RuleConfig<unknown[]> 요구)
const prettier = /** @type {import("eslint").Linter.Config} */ (prettierConfig);

export default defineConfig(
  eslint.configs.recommended,
  tseslint.configs.recommended,
  // Prettier와 충돌하는 ESLint 규칙 비활성화 (항상 마지막에)
  prettier,
  {
    ignores: ["node_modules/", "dist/", "**/dist/"],
  },
);
