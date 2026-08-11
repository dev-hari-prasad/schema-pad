import React from "react";
import ReactDOM from "react-dom/client";
import iconUrl from "../../public/Icon.png";
import "../../src/index.css";
import "./webview.css";
import SchemaCanvasPage from "@/components/SchemaCanvasPage";
import { QueryProvider } from "@/components/QueryProvider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { SchemaPadBridge } from "./SchemaPadBridge";

declare global {
  interface Window {
    __SCHEMA_PAD_ICON_URL__?: string;
  }
}

window.__SCHEMA_PAD_ICON_URL__ = iconUrl;

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryProvider>
      <TooltipProvider>
        <SchemaCanvasPage extensionMode />
        <SchemaPadBridge />
        <Toaster />
        <Sonner />
      </TooltipProvider>
    </QueryProvider>
  </React.StrictMode>,
);
