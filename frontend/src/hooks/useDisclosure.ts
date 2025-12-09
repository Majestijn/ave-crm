// src/hooks/useDisclosure.ts
import { useState, useCallback } from "react";

export const useDisclosure = (initial = false) => {
  const [isOpen, setIsOpen] = useState(initial);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((v) => !v), []);

  return { isOpen, open, close, toggle, setIsOpen };
};
