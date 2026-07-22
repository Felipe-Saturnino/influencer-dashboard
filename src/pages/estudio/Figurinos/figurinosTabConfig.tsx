import type { ReactNode } from "react";
import { Archive, Package, Pin, UserRound, Wrench } from "lucide-react";
import { FILTRO_BAR_TAB_ICON_PROPS } from "../../../components/dashboard";
import type { FigurinosAba } from "./types";

export const FIGURINOS_ABAS: FigurinosAba[] = [
  "available",
  "borrowed",
  "fixed",
  "maintenance",
  "discarded",
];

export const FIGURINOS_TAB_ICONS: Record<FigurinosAba, ReactNode> = {
  available: <Package {...FILTRO_BAR_TAB_ICON_PROPS} />,
  borrowed: <UserRound {...FILTRO_BAR_TAB_ICON_PROPS} />,
  fixed: <Pin {...FILTRO_BAR_TAB_ICON_PROPS} />,
  maintenance: <Wrench {...FILTRO_BAR_TAB_ICON_PROPS} />,
  discarded: <Archive {...FILTRO_BAR_TAB_ICON_PROPS} />,
};
