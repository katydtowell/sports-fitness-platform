/**
 * SidePanelContext — global state for the right-side panel system.
 *
 * Any component in the tree can open a panel by calling `openPanel` with
 * a React node and a size ("quarter" | "third" | "half").  The Layout
 * component reads the state and renders the panel + pushes content.
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";

export type PanelSize = "quarter" | "third" | "half";

interface SidePanelState {
  /** Whether a panel is currently open. */
  isOpen: boolean;
  /** The content to render inside the panel. */
  content: ReactNode | null;
  /** Panel width fraction of the main content area. */
  size: PanelSize;
  /** Optional title shown in the panel header. */
  title: string;
}

interface SidePanelContextValue extends SidePanelState {
  openPanel: (content: ReactNode, opts?: { size?: PanelSize; title?: string }) => void;
  closePanel: () => void;
}

const SidePanelCtx = createContext<SidePanelContextValue | null>(null);

export function SidePanelProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SidePanelState>({
    isOpen: false,
    content: null,
    size: "quarter",
    title: "",
  });

  const openPanel = useCallback(
    (content: ReactNode, opts?: { size?: PanelSize; title?: string }) => {
      setState({
        isOpen: true,
        content,
        size: opts?.size ?? "quarter",
        title: opts?.title ?? "",
      });
    },
    []
  );

  const closePanel = useCallback(() => {
    setState({ isOpen: false, content: null, size: "quarter", title: "" });
  }, []);

  return (
    <SidePanelCtx.Provider value={{ ...state, openPanel, closePanel }}>
      {children}
    </SidePanelCtx.Provider>
  );
}

export function useSidePanel() {
  const ctx = useContext(SidePanelCtx);
  if (!ctx) throw new Error("useSidePanel must be used within SidePanelProvider");
  return ctx;
}
