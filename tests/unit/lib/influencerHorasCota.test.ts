import { describe, expect, it } from "vitest";
import {
  cadastroBloqueiaAgenda,
  deveInativarPorCota,
  horasDeResultado,
  horasPendentesCota,
  isErroInfluencerCadastroInativo,
  parseHorasAcordadas,
} from "@/lib/influencerHorasCota";

describe("horasDeResultado", () => {
  it("soma horas e minutos", () => {
    expect(horasDeResultado(2, 30)).toBe(2.5);
    expect(horasDeResultado(0, 15)).toBe(0.25);
    expect(horasDeResultado(null, null)).toBe(0);
  });
});

describe("horasPendentesCota", () => {
  it("devolve o saldo e não fica negativo no overshoot", () => {
    expect(horasPendentesCota(10, 3)).toBe(7);
    expect(horasPendentesCota(0.5, 2)).toBe(0);
    expect(horasPendentesCota(null, 4)).toBeNull();
    expect(horasPendentesCota(0, 1)).toBeNull();
  });
});

describe("deveInativarPorCota", () => {
  it("inativa ao atingir ou ultrapassar a cota", () => {
    expect(deveInativarPorCota(10, 10)).toBe(true);
    expect(deveInativarPorCota(10, 10.5)).toBe(true);
    expect(deveInativarPorCota(10, 9.99)).toBe(false);
    expect(deveInativarPorCota(null, 20)).toBe(false);
  });
});

describe("parseHorasAcordadas", () => {
  it("aceita vírgula e rejeita zero ou vazio", () => {
    expect(parseHorasAcordadas("10,5")).toBe(10.5);
    expect(parseHorasAcordadas("8")).toBe(8);
    expect(parseHorasAcordadas("0")).toBeNull();
    expect(parseHorasAcordadas("")).toBeNull();
  });
});

describe("cadastroBloqueiaAgenda", () => {
  it("bloqueia inativo e cancelado; legado sem status agenda", () => {
    expect(cadastroBloqueiaAgenda("inativo")).toBe(true);
    expect(cadastroBloqueiaAgenda("cancelado")).toBe(true);
    expect(cadastroBloqueiaAgenda("ativo")).toBe(false);
    expect(cadastroBloqueiaAgenda(null)).toBe(false);
  });
});

describe("isErroInfluencerCadastroInativo", () => {
  it("reconhece o código do trigger", () => {
    expect(isErroInfluencerCadastroInativo("influencer_cadastro_inativo")).toBe(true);
    expect(isErroInfluencerCadastroInativo("outra coisa")).toBe(false);
  });
});
