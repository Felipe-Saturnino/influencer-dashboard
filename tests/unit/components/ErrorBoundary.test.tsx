import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import ErrorBoundary from "@/components/ErrorBoundary";

vi.mock("@/lib/chunkReloadGuard", () => ({
  reloadAfterChunkError: vi.fn(),
}));

function Thrower({ message }: { message: string }) {
  throw new Error(message);
}

describe("ErrorBoundary", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("exibe UI de erro genérico quando o filho lança", () => {
    render(
      <ErrorBoundary>
        <Thrower message="falha de teste" />
      </ErrorBoundary>,
    );

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("Erro ao carregar a página")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tentar novamente" })).toBeInTheDocument();
  });

  it("exibe estado de atualização para erro de chunk", () => {
    render(
      <ErrorBoundary>
        <Thrower message="Failed to fetch dynamically imported module" />
      </ErrorBoundary>,
    );

    expect(screen.getByText("Atualizando...")).toBeInTheDocument();
  });
});
