# Mocks (sem Supabase de staging)

Testes que precisarem do cliente Supabase devem **mockar** `@/lib/supabase` ou o método usado (`from`, `rpc`, etc.), nunca apontar para produção.

Exemplo mínimo com `vi.mock`:

```ts
import { vi } from "vitest";

const from = vi.fn();
vi.mock("@/lib/supabase", () => ({
  supabase: { from, auth: { getSession: vi.fn() } },
}));
```

Prefira testar **lógica pura** em `src/lib/**` e **componentes** com dados injetados via props, reduzindo dependência de PostgREST.
