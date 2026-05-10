import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useTokenHandle } from "@/components/api-handle/token-handle";
import { Clipboard, ExternalLink, Loader2, Key } from "lucide-react";
import { useState, useCallback, useEffect } from "react";
import { toast } from "@/components/common/Toast";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import env from "@/env.ts";


interface ObsidianAuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vaultName?: string;
  onSuccess?: () => void;
}

export function ObsidianAuthModal({ open, onOpenChange, vaultName, onSuccess }: ObsidianAuthModalProps) {
  const { t } = useTranslation();
  const { handleCreateToken, isLoading } = useTokenHandle();
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);

  // Reset generated token when modal closes
  useEffect(() => {
    if (!open) {
      setGeneratedToken(null);
    }
  }, [open]);

  const onGenerate = async () => {
    // Generate a token for Obsidian with rest and ws scopes
    const token = await handleCreateToken("ObsidianPlugin", "rest,ws", 365);
    if (token) {
      setGeneratedToken(token);
      toast.success(t("ui.common.success"));
      onSuccess?.();
    } else {
      toast.error(t("ui.common.error"));
    }
  };

  const getConfigJson = useCallback(() => {
    return JSON.stringify({
      api: env.API_URL,
      apiToken: generatedToken || "",
      ...(vaultName ? { vault: vaultName } : {}),
    }, null, 2);
  }, [generatedToken, vaultName]);

  const getObsidianUrl = useCallback(() => {
    if (!generatedToken) return "";
    const api = env.API_URL;
    const vault = vaultName || "";
    return `obsidian://fast-note-sync/sso?pushApi=${encodeURIComponent(api)}&pushApiToken=${encodeURIComponent(generatedToken)}&pushVault=${encodeURIComponent(vault)}`;
  }, [generatedToken, vaultName]);

  const handleCopyConfig = () => {
    const configText = getConfigJson();
    if (navigator.clipboard) {
      navigator.clipboard
        .writeText(configText)
        .then(() => {
          toast.success(t("ui.vault.copyConfigSuccess"));
        })
        .catch((err) => {
          toast.error(t("ui.common.error") + err);
        });
    } else {
      toast.error(t("ui.vault.copyConfigError"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-2xl mx-auto rounded-lg sm:rounded-xl">
        <DialogHeader>
          <DialogTitle className="text-base sm:text-lg truncate pr-8 flex items-center gap-2">
            <Key className="h-5 w-5 text-primary" />
            {t("ui.vault.authTokenConfig")}
            {vaultName && <span className="text-muted-foreground font-normal ml-1">- {vaultName}</span>}
          </DialogTitle>
          <DialogDescription>
            {t("ui.obsidian.generateTokenDesc") || "为 Obsidian 插件生成一个具有完整同步权限的专用授权令牌。"}
          </DialogDescription>
        </DialogHeader>

        {!generatedToken ? (
          <div className="py-12 flex flex-col items-center justify-center space-y-6 border-2 border-dashed border-border rounded-xl bg-muted/30">
            <div className="p-4 bg-primary/10 rounded-full">
              <Key className="h-10 w-10 text-primary" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="font-bold text-lg">{t("ui.obsidian.tokenRequired") || "需要授权令牌"}</h3>
              <p className="text-sm text-muted-foreground max-w-xs">
                {t("ui.obsidian.tokenPrompt") || "点击下方按钮生成一个专用的授权令牌，用于在 Obsidian 中进行同步。"}
              </p>
            </div>
            <Button
              onClick={onGenerate}
              disabled={isLoading}
              className="rounded-xl h-11 px-8 font-bold shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t("ui.obsidian.generating") || "正在生成..."}
                </>
              ) : (
                <>
                  <Key className="h-4 w-4 mr-2" />
                  {t("ui.obsidian.generateToken") || "生成授权令牌"}
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
            <div className="relative group">
              <pre className="p-4 rounded-xl bg-muted text-xs sm:text-sm overflow-x-auto max-h-48 sm:max-h-64 font-mono whitespace-pre-wrap break-all border border-border group-hover:border-primary/30 transition-colors">
                {getConfigJson()}
              </pre>
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleCopyConfig}>
                  <Clipboard className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">
                {t("ui.common.close")}
              </Button>
              <Button
                className="rounded-xl bg-sky-700 hover:bg-sky-900 text-white transition-all shadow-md shadow-sky-500/10 flex-1 sm:flex-none"
                onClick={() => {
                  window.location.href = getObsidianUrl();
                }}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                {t("ui.obsidian.oneClickImport")}
              </Button>
              <Button onClick={handleCopyConfig} className="rounded-xl flex-1 sm:flex-none">
                <Clipboard className="h-4 w-4 mr-2" />
                {t("ui.vault.copyConfig")}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
