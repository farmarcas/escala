import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

type PageTitleState = { title: string | undefined; setTitle: (title: string | undefined) => void };

const PageTitleContext = createContext<PageTitleState | null>(null);

// Nome da tela de detalhe (grupo, loja) para o último item do caminho na barra superior.
export function PageTitleProvider({ children }: { children: ReactNode }) {
  const [title, setTitle] = useState<string>();
  return (
    <PageTitleContext.Provider value={{ title, setTitle }}>{children}</PageTitleContext.Provider>
  );
}

export function usePageTitleValue(): string | undefined {
  return useContext(PageTitleContext)?.title;
}

// A tela de detalhe informa o próprio nome enquanto estiver aberta.
export function usePageTitle(title: string | undefined) {
  const setTitle = useContext(PageTitleContext)?.setTitle;
  useEffect(() => {
    setTitle?.(title);
    return () => setTitle?.(undefined);
  }, [setTitle, title]);
}
