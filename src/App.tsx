import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Routes, Route, Navigate } from "react-router-dom";
import { supportedLanguages } from "./i18n";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();
const fallbackLanguage = "en";

const getClientPreferredLanguage = (): string => {
  if (typeof navigator === "undefined") return fallbackLanguage;

  const candidates = [...(navigator.languages ?? []), navigator.language]
    .filter(Boolean)
    .map((lang) => lang.toLowerCase());

  for (const candidate of candidates) {
    if (supportedLanguages.includes(candidate)) return candidate;
    const primary = candidate.split("-")[0];
    if (supportedLanguages.includes(primary)) return primary;
  }

  return fallbackLanguage;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <Routes>
        <Route path="/" element={<Navigate replace to={`/${getClientPreferredLanguage()}`} />} />
        <Route path="/:lang/*" element={<Index />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
