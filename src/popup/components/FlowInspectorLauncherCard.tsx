import { PanelRight } from "lucide-react";
import { Button } from "@helvety/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@helvety/ui/card";
import { openInspectorSidePanelFromPopup } from "../open-inspector-side-panel";

/**
 * Popup Power Automate tab holds flow settings. Flow Inspector runs in Chrome's side panel;
 * this card explains that and opens it on user gesture.
 */
export function FlowInspectorLauncherCard() {
  return (
    <Card className="border-primary/30 bg-muted/30 shadow-none">
      <CardHeader className="space-y-1 p-3 pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <PanelRight className="h-4 w-4 shrink-0" aria-hidden />
          Flow Inspector
        </CardTitle>
        <CardDescription className="space-y-2 text-xs leading-relaxed">
          <p>
            <strong className="font-medium text-foreground">Not in this popup.</strong> The toolbar
            icon opens these settings. The inspector opens in Chrome&apos;s{" "}
            <strong className="font-medium text-foreground">side panel</strong>—full height beside
            your tab, and it stays open while you work.
          </p>
          <ol className="list-decimal space-y-1 pl-4 text-muted-foreground">
            <li>Sign in on a Power Automate tab (if needed).</li>
            <li>Click the button below.</li>
            <li>Use the panel on the right edge of the browser.</li>
          </ol>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 p-3 pt-0">
        <Button
          type="button"
          className="w-full"
          size="sm"
          onClick={openInspectorSidePanelFromPopup}
        >
          <PanelRight className="mr-2 h-4 w-4" aria-hidden />
          Open Flow Inspector side panel
        </Button>
        <p className="text-center text-[10px] leading-snug text-muted-foreground">
          You can also open it from Chrome&apos;s side panel menu for this extension.
        </p>
      </CardContent>
    </Card>
  );
}
