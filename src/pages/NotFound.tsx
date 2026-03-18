import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { supportedLanguages, languageNames, getMessages } from "../i18n";

const NotFound = () => {
  const location = useLocation();
  const langMatch = location.pathname.match(/^\/(en|es|pt|fr|de|hi|ja|ko|id|ar|zh)/);
  const lang = langMatch?.[1] ?? "en";
  const msgs = getMessages(lang);

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">404</h1>
        <p className="mb-4 text-xl text-muted-foreground">{msgs.notFound}</p>
        <Link to={`/${lang}`} className="text-primary underline hover:text-primary/90">
          {msgs.home}
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
