import { describe, expect, it } from "vitest";
import type { PermissoesAcoesMapa } from "../../../src/lib/appRoutes";
import { permissoesFromContext } from "../../../src/hooks/usePermission";
import type { PermissoesMapa } from "../../../src/context/AppContext";
import type { User } from "../../../src/types";

function user(role: User["role"]): User {
  return { id: "u1", name: "Teste", email: "t@spin.com", role };
}

describe("permissoesFromContext", () => {
  it("admin tem acesso total sem loading", () => {
    const r = permissoesFromContext("rh_staff", user("admin"), {} as PermissoesMapa, {} as PermissoesAcoesMapa, true);
    expect(r.loading).toBe(false);
    expect(r.canView).toBe("sim");
    expect(r.canEditarOk).toBe(true);
  });

  it("routeReady false mantém loading", () => {
    const permissions = { rh_staff: "sim" } as PermissoesMapa;
    const r = permissoesFromContext("rh_staff", user("rh"), permissions, {} as PermissoesAcoesMapa, false);
    expect(r.loading).toBe(true);
    expect(r.canView).toBeNull();
  });

  it("gestor sem ver página zera ações", () => {
    const permissions = { rh_staff: "nao" } as PermissoesMapa;
    const acoes = {
      rh_staff: { criar: "sim", editar: "sim", excluir: "nao" },
    } as PermissoesAcoesMapa;
    const r = permissoesFromContext("rh_staff", user("gestor_operacoes"), permissions, acoes, true);
    expect(r.canView).toBe("nao");
    expect(r.canCriar).toBeNull();
    expect(r.canEditarOk).toBe(false);
  });

  it("gestor com ver proprios expõe ações do contexto", () => {
    const permissions = { rh_staff: "proprios" } as PermissoesMapa;
    const acoes = {
      rh_staff: { criar: "proprios", editar: "sim", excluir: null },
    } as PermissoesAcoesMapa;
    const r = permissoesFromContext("rh_staff", user("gestor_operacoes"), permissions, acoes, true);
    expect(r.canView).toBe("proprios");
    expect(r.canCriar).toBe("proprios");
    expect(r.canCriarOk).toBe(true);
    expect(r.canEditarOk).toBe(true);
  });

  it("rh usa can_view e ações do boot", () => {
    const permissions = { rh_staff: "sim" } as PermissoesMapa;
    const acoes = {
      rh_staff: { criar: "sim", editar: "nao", excluir: null },
    } as PermissoesAcoesMapa;
    const r = permissoesFromContext("rh_staff", user("rh"), permissions, acoes, true);
    expect(r.canView).toBe("sim");
    expect(r.canCriarOk).toBe(true);
    expect(r.canEditar).toBe("nao");
  });
});
