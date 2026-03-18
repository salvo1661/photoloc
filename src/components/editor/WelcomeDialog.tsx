import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ShieldCheck, MonitorSmartphone, WifiOff } from "lucide-react";
import type { Messages } from "@/i18n";

export function WelcomeDialog({ messages }: { messages: Messages }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const dismissed = sessionStorage.getItem("welcome-dismissed");
    if (!dismissed) setOpen(true);
  }, []);

  const handleClose = () => {
    setOpen(false);
    sessionStorage.setItem("welcome-dismissed", "true");
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="border-border bg-card sm:max-w-md p-0 gap-0 overflow-hidden">
        <div className="flex flex-col items-center px-8 pt-8 pb-6">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-editor-active/15 mb-4">
            <ShieldCheck className="h-7 w-7 text-editor-active" />
          </div>

          <h2 className="text-lg font-semibold text-foreground mb-1.5">
            {messages.ui.dialogs.welcome.title}
          </h2>
          <p className="text-center text-sm text-muted-foreground leading-relaxed mb-6">
            {messages.ui.dialogs.welcome.body}
          </p>

          <div className="w-full space-y-3 mb-6">
            {[
              {
                icon: MonitorSmartphone,
                title: messages.ui.dialogs.welcome.feature1Title,
                desc: messages.ui.dialogs.welcome.feature1Desc,
              },
              {
                icon: WifiOff,
                title: messages.ui.dialogs.welcome.feature2Title,
                desc: messages.ui.dialogs.welcome.feature2Desc,
              },
              {
                icon: ShieldCheck,
                title: messages.ui.dialogs.welcome.feature3Title,
                desc: messages.ui.dialogs.welcome.feature3Desc,
              },
            ].map((item, i) => (
              <div
                key={i}
                className="flex items-start gap-3 rounded-lg bg-secondary/50 px-3.5 py-2.5"
              >
                <item.icon className="mt-0.5 h-4 w-4 shrink-0 text-editor-active" />
                <div>
                  <p className="text-xs font-medium text-foreground">
                    {item.title}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <Button
            className="w-full h-9 text-sm"
            onClick={handleClose}
          >
            {messages.ui.dialogs.welcome.getStarted}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
