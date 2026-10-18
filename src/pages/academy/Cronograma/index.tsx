import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader } from "../../../components/PageHeader";
import { PageMenuIcon } from "../../../components/PageMenuIcon";
import { ModalConfirmArquivarPadrao } from "../../../components/OperacoesModal";
import { FONT } from "../../../constants/theme";
import { useApp } from "../../../context/AppContext";
import { useDashboardBrand } from "../../../hooks/useDashboardBrand";
import { usePermission } from "../../../hooks/usePermission";
import { useRouteTab } from "../../../hooks/useRouteTab";
import {
  ACADEMY_CRONOGRAMA_ERRO_CARGA,
  ACADEMY_CRONOGRAMA_PAGE_KEY,
  ACADEMY_CRONOGRAMA_TABS,
} from "../../../lib/academyCronogramaConstants";
import {
  adicionarTrilhaAoCronograma,
  definirStatusMaterial,
  definirStatusProva,
  definirStatusTrilha,
  fetchAcademyCronogramaCatalogo,
  removerTrilhaDoCronograma,
  reordenarTrilhasCronograma,
  salvarCronograma,
  salvarMaterial,
  salvarProva,
  salvarTrilha,
} from "../../../lib/academyCronogramaDb";
import type {
  AcademyCatalogoStatus,
  AcademyCronogramaCatalogo,
  AcademyCronogramaTab,
  AcademyMaterialTipo,
  AcademyProvaQuestao,
  AcademyTrilhaTipo,
} from "../../../lib/academyCronogramaTypes";
import { getPageMenuLabel } from "../../../lib/pageHeaderMenu";
import { getPageCanonicalSubtitle } from "../../../lib/pageCanonicalCopy";
import { textoContemBuscaEmAlgum } from "../../../lib/searchText";
import { CronogramaAbaCronogramas } from "./CronogramaAbaCronogramas";
import { CronogramaAbaMateriais } from "./CronogramaAbaMateriais";
import { CronogramaAbaProvas } from "./CronogramaAbaProvas";
import { CronogramaAbaTrilhas } from "./CronogramaAbaTrilhas";
import { CronogramaFiltroBar } from "./CronogramaFiltroBar";
import { ModalAdicionarTrilha } from "./ModalAdicionarTrilha";
import { ModalCronogramaForm } from "./ModalCronogramaForm";
import { ModalMaterialForm } from "./ModalMaterialForm";
import { ModalMaterialVer } from "./ModalMaterialVer";
import { ModalProvaForm } from "./ModalProvaForm";
import { ModalProvaVer } from "./ModalProvaVer";
import { ModalTrilhaForm } from "./ModalTrilhaForm";
import { ModalTrilhaVer } from "./ModalTrilhaVer";

type ModalState =
  | null
  | { kind: "cronograma"; id: string | null }
  | { kind: "trilha-ver"; id: string }
  | { kind: "trilha-form"; id: string | null }
  | { kind: "trilha-add" }
  | { kind: "material-ver"; id: string }
  | { kind: "material-form"; id: string | null }
  | { kind: "prova-ver"; id: string }
  | { kind: "prova-form"; id: string | null };

type ArquivarAlvo = { tipo: "trilha" | "material" | "prova"; id: string; nome: string; status: AcademyCatalogoStatus };

const VAZIO: AcademyCronogramaCatalogo = {
  cronogramas: [],
  trilhas: [],
  itens: [],
  materiais: [],
  provas: [],
  trilhaMateriais: [],
  trilhaProvas: [],
};

export default function AcademyCronogramaPage() {
  const { theme: t, user } = useApp();
  const brand = useDashboardBrand();
  const perm = usePermission(ACADEMY_CRONOGRAMA_PAGE_KEY);
  const [aba, setAba] = useRouteTab<AcademyCronogramaTab>(ACADEMY_CRONOGRAMA_PAGE_KEY, "cronogramas", ACADEMY_CRONOGRAMA_TABS);
  const [catalogo, setCatalogo] = useState<AcademyCronogramaCatalogo>(VAZIO);
  const [loading, setLoading] = useState(true);
  const [erroCarga, setErroCarga] = useState<string | null>(null);
  const [cronogramaId, setCronogramaId] = useState("");
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState<AcademyCatalogoStatus>("publicado");
  const [modal, setModal] = useState<ModalState>(null);
  const [saving, setSaving] = useState(false);
  const [erroModal, setErroModal] = useState<string | null>(null);
  const [arquivar, setArquivar] = useState<ArquivarAlvo | null>(null);

  const recarregar = useCallback(async (preferId?: string) => {
    const data = await fetchAcademyCronogramaCatalogo();
    setCatalogo(data);
    setCronogramaId((prev) => {
      const next = preferId || prev;
      if (next && data.cronogramas.some((c) => c.id === next)) return next;
      const publicado = data.cronogramas.find((c) => c.status === "publicado");
      return publicado?.id ?? data.cronogramas[0]?.id ?? "";
    });
  }, []);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setErroCarga(null);
    void recarregar()
      .catch((e: unknown) => {
        if (alive) setErroCarga(e instanceof Error ? e.message : ACADEMY_CRONOGRAMA_ERRO_CARGA);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [recarregar]);

  const cronograma = catalogo.cronogramas.find((c) => c.id === cronogramaId) ?? null;
  const itensDoCrono = useMemo(
    () => catalogo.itens.filter((i) => i.cronograma_id === cronogramaId).sort((a, b) => a.ordem - b.ordem),
    [catalogo.itens, cronogramaId],
  );
  const ordemIds = itensDoCrono.map((i) => i.trilha_id);

  const trilhasFiltradas = useMemo(
    () =>
      catalogo.trilhas.filter(
        (row) => row.status === status && textoContemBuscaEmAlgum(busca, row.nome, row.descricao),
      ),
    [catalogo.trilhas, status, busca],
  );
  const materiaisFiltrados = useMemo(
    () =>
      catalogo.materiais.filter(
        (row) => row.status === status && textoContemBuscaEmAlgum(busca, row.titulo, row.introducao),
      ),
    [catalogo.materiais, status, busca],
  );
  const provasFiltradas = useMemo(
    () => catalogo.provas.filter((row) => row.status === status && textoContemBuscaEmAlgum(busca, row.nome)),
    [catalogo.provas, status, busca],
  );

  async function runSave(fn: () => Promise<void>) {
    setSaving(true);
    setErroModal(null);
    try {
      await fn();
      await recarregar();
      setModal(null);
    } catch (e: unknown) {
      setErroModal(e instanceof Error ? e.message : "Não foi possível gravar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="app-page-shell app-page-shell--pb64" style={{ background: t.bg, minHeight: "100vh", fontFamily: FONT.body }}>
      <PageHeader
        icon={<PageMenuIcon pageKey={ACADEMY_CRONOGRAMA_PAGE_KEY} />}
        title={getPageMenuLabel(ACADEMY_CRONOGRAMA_PAGE_KEY)}
        subtitle={getPageCanonicalSubtitle(ACADEMY_CRONOGRAMA_PAGE_KEY)}
      />

      {erroCarga ? (
        <div
          role="alert"
          style={{
            marginBottom: 14,
            padding: "12px 16px",
            borderRadius: 12,
            border: "1px solid rgba(232,64,37,0.35)",
            background: "color-mix(in srgb, #e84025 10%, transparent)",
            color: "#e84025",
            fontSize: 13,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <span>{erroCarga}</span>
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              setErroCarga(null);
              void recarregar()
                .catch((e: unknown) => setErroCarga(e instanceof Error ? e.message : ACADEMY_CRONOGRAMA_ERRO_CARGA))
                .finally(() => setLoading(false));
            }}
            style={{
              fontFamily: FONT.body,
              fontSize: 13,
              fontWeight: 700,
              padding: "8px 14px",
              borderRadius: 10,
              border: "1px solid rgba(232,64,37,0.35)",
              background: "transparent",
              color: "#e84025",
              cursor: "pointer",
            }}
          >
            Tentar novamente
          </button>
        </div>
      ) : null}

      <CronogramaFiltroBar
        brand={brand}
        t={t}
        aba={aba}
        onSelectAba={setAba}
        cronogramas={catalogo.cronogramas}
        cronogramaId={cronogramaId}
        onSelecionarCronograma={setCronogramaId}
        busca={busca}
        onBusca={setBusca}
        status={status}
        onStatus={setStatus}
        canCriar={perm.canCriarOk}
        onNovoCronograma={() => {
          setErroModal(null);
          setModal({ kind: "cronograma", id: null });
        }}
        onNovaTrilha={() => {
          setErroModal(null);
          setModal({ kind: "trilha-form", id: null });
        }}
        onNovoMaterial={() => {
          setErroModal(null);
          setModal({ kind: "material-form", id: null });
        }}
        onNovaProva={() => {
          setErroModal(null);
          setModal({ kind: "prova-form", id: null });
        }}
      />

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
          <Loader2 className="app-lucide-spin" size={28} color={t.textMuted} aria-label="Carregando" />
        </div>
      ) : (
        <>
          <div id="panel-cronograma-cronogramas" role="tabpanel" hidden={aba !== "cronogramas"}>
            <CronogramaAbaCronogramas
              brand={brand}
              t={t}
              cronograma={cronograma}
              itens={itensDoCrono}
              trilhas={catalogo.trilhas}
              materiais={catalogo.materiais}
              provas={catalogo.provas}
              trilhaMateriais={catalogo.trilhaMateriais}
              trilhaProvas={catalogo.trilhaProvas}
              canEditar={perm.canEditarOk}
              onEditar={() => cronograma && setModal({ kind: "cronograma", id: cronograma.id })}
              onAdicionar={() => setModal({ kind: "trilha-add" })}
              onMover={(trilhaId, dir) => {
                const idx = ordemIds.indexOf(trilhaId);
                const swap = idx + dir;
                if (idx < 0 || swap < 0 || swap >= ordemIds.length) return;
                const next = [...ordemIds];
                [next[idx], next[swap]] = [next[swap], next[idx]];
                void runSave(async () => {
                  await reordenarTrilhasCronograma(cronogramaId, next, user?.id ?? null);
                });
              }}
              onRemover={(trilhaId) => {
                void runSave(async () => {
                  await removerTrilhaDoCronograma(cronogramaId, trilhaId, ordemIds, user?.id ?? null);
                });
              }}
            />
          </div>
          <div id="panel-cronograma-trilhas" role="tabpanel" hidden={aba !== "trilhas"}>
            <CronogramaAbaTrilhas
              brand={brand}
              t={t}
              rows={trilhasFiltradas}
              cronogramas={catalogo.cronogramas}
              itens={catalogo.itens}
              materiais={catalogo.materiais}
              provas={catalogo.provas}
              trilhaMateriais={catalogo.trilhaMateriais}
              trilhaProvas={catalogo.trilhaProvas}
              resetKey={`${status}|${busca}`}
              canEditar={perm.canEditarOk}
              onVer={(id) => setModal({ kind: "trilha-ver", id })}
              onEditar={(id) => setModal({ kind: "trilha-form", id })}
            />
          </div>
          <div id="panel-cronograma-materiais" role="tabpanel" hidden={aba !== "materiais"}>
            <CronogramaAbaMateriais
              brand={brand}
              t={t}
              rows={materiaisFiltrados}
              trilhas={catalogo.trilhas}
              trilhaMateriais={catalogo.trilhaMateriais}
              resetKey={`${status}|${busca}`}
              canEditar={perm.canEditarOk}
              onVer={(id) => setModal({ kind: "material-ver", id })}
              onEditar={(id) => setModal({ kind: "material-form", id })}
            />
          </div>
          <div id="panel-cronograma-provas" role="tabpanel" hidden={aba !== "provas"}>
            <CronogramaAbaProvas
              brand={brand}
              t={t}
              rows={provasFiltradas}
              trilhas={catalogo.trilhas}
              trilhaProvas={catalogo.trilhaProvas}
              resetKey={`${status}|${busca}`}
              canEditar={perm.canEditarOk}
              onVer={(id) => setModal({ kind: "prova-ver", id })}
              onEditar={(id) => setModal({ kind: "prova-form", id })}
            />
          </div>
        </>
      )}

      {modal?.kind === "cronograma" ? (
        <ModalCronogramaForm
          initial={modal.id ? catalogo.cronogramas.find((c) => c.id === modal.id) ?? null : null}
          saving={saving}
          erro={erroModal}
          onClose={() => setModal(null)}
          onSave={(payload) => {
            void (async () => {
              setSaving(true);
              setErroModal(null);
              try {
                const id = await salvarCronograma({
                  id: modal.id ?? undefined,
                  nome: payload.nome,
                  descricao: payload.descricao,
                  duracaoDias: payload.duracaoDias,
                  userId: user?.id ?? null,
                });
                await recarregar(id);
                setModal(null);
              } catch (e: unknown) {
                setErroModal(e instanceof Error ? e.message : "Não foi possível gravar.");
              } finally {
                setSaving(false);
              }
            })();
          }}
        />
      ) : null}

      {modal?.kind === "trilha-add" && cronograma ? (
        <ModalAdicionarTrilha
          trilhas={catalogo.trilhas}
          jaNoCronograma={ordemIds}
          saving={saving}
          erro={erroModal}
          onClose={() => setModal(null)}
          onAdd={(trilhaId) => {
            void runSave(async () => {
              await adicionarTrilhaAoCronograma(cronograma.id, trilhaId, ordemIds, user?.id ?? null);
            });
          }}
        />
      ) : null}

      {modal?.kind === "trilha-ver"
        ? (() => {
            const trilha = catalogo.trilhas.find((row) => row.id === modal.id);
            return trilha ? (
              <ModalTrilhaVer
                trilha={trilha}
                cronogramas={catalogo.cronogramas}
                itens={catalogo.itens}
                materiais={catalogo.materiais}
                provas={catalogo.provas}
                trilhaMateriais={catalogo.trilhaMateriais}
                trilhaProvas={catalogo.trilhaProvas}
                onClose={() => setModal(null)}
              />
            ) : null;
          })()
        : null}

      {modal?.kind === "trilha-form"
        ? (() => {
            const trilha = modal.id ? catalogo.trilhas.find((row) => row.id === modal.id) ?? null : null;
            return (
              <ModalTrilhaForm
                initial={trilha}
                materiais={catalogo.materiais}
                materialIdsIniciais={catalogo.trilhaMateriais.filter((v) => v.trilha_id === modal.id).map((v) => v.material_id)}
                saving={saving}
                erro={erroModal}
                onClose={() => setModal(null)}
                onSave={(payload: {
                  nome: string;
                  tipo: AcademyTrilhaTipo;
                  jogo: string | null;
                  descricao: string;
                  materialIds: string[];
                }) => {
                  void runSave(async () => {
                    await salvarTrilha({ ...payload, id: modal.id ?? undefined, userId: user?.id ?? null });
                  });
                }}
                onArquivar={
                  trilha
                    ? () => {
                        if (trilha.status === "arquivado") {
                          void runSave(async () => {
                            await definirStatusTrilha(trilha.id, "publicado", user?.id ?? null);
                          });
                          return;
                        }
                        setArquivar({ tipo: "trilha", id: trilha.id, nome: trilha.nome, status: trilha.status });
                      }
                    : undefined
                }
              />
            );
          })()
        : null}

      {modal?.kind === "material-ver"
        ? (() => {
            const material = catalogo.materiais.find((row) => row.id === modal.id);
            return material ? (
              <ModalMaterialVer
                material={material}
                trilhas={catalogo.trilhas}
                trilhaMateriais={catalogo.trilhaMateriais}
                onClose={() => setModal(null)}
              />
            ) : null;
          })()
        : null}

      {modal?.kind === "material-form"
        ? (() => {
            const material = modal.id ? catalogo.materiais.find((row) => row.id === modal.id) ?? null : null;
            return (
              <ModalMaterialForm
                initial={material}
                trilhas={catalogo.trilhas}
                trilhaIdsIniciais={catalogo.trilhaMateriais.filter((v) => v.material_id === modal.id).map((v) => v.trilha_id)}
                saving={saving}
                erro={erroModal}
                onClose={() => setModal(null)}
                onSave={(payload: {
                  titulo: string;
                  tipo: AcademyMaterialTipo;
                  introducao: string;
                  trilhaIds: string[];
                  file: File | null;
                }) => {
                  void runSave(async () => {
                    await salvarMaterial({
                      ...payload,
                      id: modal.id ?? undefined,
                      versaoAtual: material?.versao,
                      userId: user?.id ?? null,
                    });
                  });
                }}
                onArquivar={
                  material
                    ? () => {
                        if (material.status === "arquivado") {
                          void runSave(async () => {
                            await definirStatusMaterial(material.id, "publicado", user?.id ?? null);
                          });
                          return;
                        }
                        setArquivar({ tipo: "material", id: material.id, nome: material.titulo, status: material.status });
                      }
                    : undefined
                }
              />
            );
          })()
        : null}

      {modal?.kind === "prova-ver"
        ? (() => {
            const prova = catalogo.provas.find((row) => row.id === modal.id);
            return prova ? (
              <ModalProvaVer
                prova={prova}
                trilhas={catalogo.trilhas}
                trilhaProvas={catalogo.trilhaProvas}
                onClose={() => setModal(null)}
              />
            ) : null;
          })()
        : null}

      {modal?.kind === "prova-form"
        ? (() => {
            const prova = modal.id ? catalogo.provas.find((row) => row.id === modal.id) ?? null : null;
            return (
              <ModalProvaForm
                initial={prova}
                trilhas={catalogo.trilhas}
                trilhaIdsIniciais={catalogo.trilhaProvas.filter((v) => v.prova_id === modal.id).map((v) => v.trilha_id)}
                saving={saving}
                erro={erroModal}
                onClose={() => setModal(null)}
                onSave={(payload: {
                  nome: string;
                  notaMinima: number;
                  questoes: AcademyProvaQuestao[];
                  trilhaIds: string[];
                }) => {
                  void runSave(async () => {
                    await salvarProva({ ...payload, id: modal.id ?? undefined, userId: user?.id ?? null });
                  });
                }}
                onArquivar={
                  prova
                    ? () => {
                        if (prova.status === "arquivado") {
                          void runSave(async () => {
                            await definirStatusProva(prova.id, "publicado", user?.id ?? null);
                          });
                          return;
                        }
                        setArquivar({ tipo: "prova", id: prova.id, nome: prova.nome, status: prova.status });
                      }
                    : undefined
                }
              />
            );
          })()
        : null}

      {arquivar ? (
        <ModalConfirmArquivarPadrao
          descricaoItem={arquivar.nome}
          loading={saving}
          error={erroModal}
          onCancel={() => setArquivar(null)}
          onConfirm={() => {
            void (async () => {
              setSaving(true);
              setErroModal(null);
              try {
                if (arquivar.tipo === "trilha") await definirStatusTrilha(arquivar.id, "arquivado", user?.id ?? null);
                if (arquivar.tipo === "material") await definirStatusMaterial(arquivar.id, "arquivado", user?.id ?? null);
                if (arquivar.tipo === "prova") await definirStatusProva(arquivar.id, "arquivado", user?.id ?? null);
                await recarregar();
                setArquivar(null);
                setModal(null);
              } catch (e: unknown) {
                setErroModal(e instanceof Error ? e.message : "Não foi possível arquivar.");
              } finally {
                setSaving(false);
              }
            })();
          }}
        />
      ) : null}
    </div>
  );
}
