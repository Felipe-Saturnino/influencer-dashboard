-- Tech Ops → Gestão de Estoque: código exibido passa de 3 para 4 dígitos (ex.: ITM-0001).
-- Só documentação (comentários de tabela) — a coluna codigo_num permanece inalterada;
-- o formato é aplicado na UI por formatCodigoEstoque (src/lib/techOpsEstoque.ts).

COMMENT ON TABLE public.tech_ops_estoque_itens IS
  'Tech Ops → Gestão de Estoque, aba Itens. Código exibido = ITM-<codigo_num com 4 dígitos>. Estoque = total - em uso - manutenção (derivado na UI).';

COMMENT ON TABLE public.tech_ops_estoque_equipamentos IS
  'Tech Ops → Gestão de Estoque, aba Equipamentos. Código exibido = EQP-<codigo_num com 4 dígitos>. Alocação (estudio_slug) preenchida quando status = em_uso.';

COMMENT ON TABLE public.tech_ops_estoque_jogo_lotes IS
  'Tech Ops → Gestão de Estoque, aba Jogo. Código exibido = JOG-<codigo_num com 4 dígitos>. Qtd atual = inicial - consumida - descartada (derivado na UI).';
