import type { ReactNode } from "react";
import { Archive, Package, UserRound, Wrench } from "lucide-react";
import { FILTRO_BAR_TAB_ICON_PROPS } from "../../../components/dashboard";
import type { RhFigurinoStatus } from "./types";

export const FIGURINOS_ABAS: RhFigurinoStatus[] = ["available", "borrowed", "maintenance", "discarded"];

export const FIGURINOS_TAB_ICONS: Record<RhFigurinoStatus, ReactNode> = {
  available: <Package {...FILTRO_BAR_TAB_ICON_PROPS} />,
  borrowed: <UserRound {...FILTRO_BAR_TAB_ICON_PROPS} />,
  maintenance: <Wrench {...FILTRO_BAR_TAB_ICON_PROPS} />,
  discarded: <Archive {...FILTRO_BAR_TAB_ICON_PROPS} />,
};
