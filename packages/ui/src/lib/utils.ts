import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * cn() — Utilitário de composição de classes CSS.
 *
 * Combina clsx (lógica condicional) com tailwind-merge (resolve conflitos Tailwind).
 * Uso: cn('px-4', condition && 'text-red-500', 'px-2') → 'text-red-500 px-2'
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
