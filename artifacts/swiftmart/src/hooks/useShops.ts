import { useContext } from "react";
import { ShopsContext } from "@/context/ShopsContext";

export function useShops() {
  const context = useContext(ShopsContext);
  if (!context) {
    throw new Error("useShops must be used within a ShopsProvider");
  }
  return context;
}
