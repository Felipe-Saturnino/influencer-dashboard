import { useHomeInformativos } from "./useHomeInformativos";

/** @deprecated Usar `useHomeInformativos("investidor")` */
export function useHomeInvestidorInformativos() {
  return useHomeInformativos("investidor");
}

export type { HomeInformativoItem } from "./useHomeInformativos";
