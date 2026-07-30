import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, render } from "@testing-library/react";
import ErrorBoundary from "@/components/ErrorBoundary";
import { reloadAfterChunkError } from "@/lib/chunkReloadGuard";

vi.mock("@/lib/chunkReloadGuard", () => ({
  reloadAfterChunkError: vi.fn(() => true),
  limparChunkReloadGuard: vi.fn(),
}));

const reloadGuardMock = vi.mocked(reloadAfterChunkError);

function Thrower({ message }: { message: string }) {
  throw new Error(message);
}

describe("ErrorBoundary", () => {
  beforeEach(() => {
    reloadGuardMock.mockReturnValue(true);
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("exibe UI de erro genérico quando o filho lança", () => {
    const tela = render(
      <ErrorBoundary>
        <Thrower message="falha de teste" />
      </ErrorBoundary>,
    );

    expect(tela.getByRole("alert")).toBeInTheDocument();
    expect(tela.getByText("Erro ao carregar a página")).toBeInTheDocument();
    expect(tela.getByRole("button", { name: "Tentar novamente" })).toBeInTheDocument();
  });

  it("exibe estado de atualização enquanto a recarga automática está em curso", () => {
    const tela = render(
      <ErrorBoundary>
        <Thrower message="Failed to fetch dynamically imported module" />
      </ErrorBoundary>,
    );

    expect(tela.getByText("Atualizando...")).toBeInTheDocument();
  });

  it("oferece recarga manual quando o limite de recargas automáticas foi atingido", () => {
    reloadGuardMock.mockReturnValue(false);

    const tela = render(
      <ErrorBoundary>
        <Thrower message="Failed to fetch dynamically imported module" />
      </ErrorBoundary>,
    );

    expect(tela.getByText("Nova versão disponível")).toBeInTheDocument();
    expect(tela.getByRole("button", { name: "Recarregar página" })).toBeInTheDocument();
    expect(tela.queryByRole("button", { name: "Tentar novamente" })).not.toBeInTheDocument();
  });
});
