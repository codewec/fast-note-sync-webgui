import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTokenHandle } from "@/components/api-handle/token-handle";
import { Clipboard, ExternalLink, Loader2, Key, X } from "lucide-react";
import { useState, useCallback, useEffect } from "react";
import { toast } from "@/components/common/Toast";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
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
  const [selectedPreset, setSelectedPreset] = useState<string>("我的Win");
  const [customNote, setCustomNote] = useState("");
  const [limitVault, setLimitVault] = useState(true);

  // Reset generated token and fields when modal closes
  useEffect(() => {
    if (!open) {
      setGeneratedToken(null);
      setSelectedPreset("我的Win");
      setCustomNote("");
      setLimitVault(true);
    }
  }, [open]);

  const onGenerate = async () => {
    // Generate a token for Obsidian with rest and ws scopes
    const vaultsParam = (vaultName && limitVault) ? vaultName : undefined;
    const finalNote = selectedPreset === "custom" ? customNote.trim() : selectedPreset;
    const clientParam = finalNote || (vaultName ? `Obsidian - ${vaultName}` : "Obsidian");
    
    // clientType (1st arg) represents the User-defined Title/Remark shown in WebGUI cards.
    // client (7th arg) strictly restricts token usage to the "ObsidianPlugin".
    const token = await handleCreateToken(
      clientParam, // clientType (Remark/Title)
      "rest,ws", // scope (legacy)
      365, // expiredDays
      undefined, // boundIp
      undefined, // userAgent
      "rest,ws", // protocol
      "ObsidianPlugin", // client (Strict Client Restriction)
      undefined, // functionScope
      vaultsParam // vaults
    );
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
          <div className="py-4 px-4 sm:px-6 flex flex-col items-center justify-center space-y-4 border border-dashed border-border rounded-xl bg-muted/20">
            <div className="p-2 bg-primary/10 rounded-full">
              <Key className="h-5 w-5 text-primary" />
            </div>
            <div className="text-center space-y-0.5">
              <h3 className="font-bold text-xs sm:text-sm">{t("ui.obsidian.tokenRequired") || "需要授权令牌"}</h3>
              <p className="text-[10px] sm:text-xs text-muted-foreground max-w-sm px-4">
                {t("ui.obsidian.tokenPrompt") || "点击下方按钮生成一个专用的授权令牌，用于在 Obsidian 中进行同步, 服务端不会保存令牌。"}
              </p>
            </div>

            {/* Form Fields inside the dashed card (stacked & micro size, no external box, exact same width as button) */}
            <div className="w-[180px] space-y-2">
              {/* 备注 Selection or Custom Input in place */}
              <div className="space-y-0.5 w-full">
                <Label className="text-xs font-semibold text-muted-foreground text-center block w-full mb-1">
                  {t("ui.obsidian.remark") || "令牌备注"}
                </Label>
                
                {selectedPreset !== "custom" ? (
                  <Select value={selectedPreset} onValueChange={setSelectedPreset}>
                    <SelectTrigger className="h-8 text-xs rounded-lg bg-background min-h-0 px-3 py-1 flex items-center justify-between w-full">
                      <SelectValue placeholder={t("ui.obsidian.remark") || "令牌备注"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="我的Win" className="text-xs">
                        {t("ui.obsidian.presetWin") || "我的Win"}
                      </SelectItem>
                      <SelectItem value="我的Mac" className="text-xs">
                        {t("ui.obsidian.presetMac") || "我的Mac"}
                      </SelectItem>
                      <SelectItem value="我的手机" className="text-xs">
                        {t("ui.obsidian.presetPhone") || "我的手机"}
                      </SelectItem>
                      <SelectItem value="我的平板" className="text-xs">
                        {t("ui.obsidian.presetTablet") || "我的平板"}
                      </SelectItem>
                      <SelectItem value="我的安卓" className="text-xs">
                        {t("ui.obsidian.presetAndroid") || "我的安卓"}
                      </SelectItem>
                      <SelectItem value="custom" className="text-xs font-semibold text-primary">
                        {t("ui.obsidian.presetCustom") || "自定义"}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="relative flex items-center w-full animate-in fade-in zoom-in-95 duration-200">
                    <Input
                      id="clientNote"
                      placeholder={t("ui.obsidian.remarkPlaceholder") || "输入自定义备注..."}
                      value={customNote}
                      onChange={(e) => setCustomNote(e.target.value)}
                      className="h-8 pl-3 pr-8 py-1 text-xs rounded-lg bg-background text-center min-h-0 w-full"
                      autoFocus
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 h-6 w-6 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground shrink-0 min-h-0"
                      onClick={() => {
                        setSelectedPreset("我的Win"); // Reset back to dropdown
                        setCustomNote("");
                      }}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </div>

              {/* 是否限制笔记库 Checkbox (no external border or background, pure minimalist alignment) */}
              {vaultName && (
                <div className="flex items-center justify-center space-x-1.5 w-full py-0.5">
                  <Checkbox
                    id="limitVault"
                    checked={limitVault}
                    onCheckedChange={(checked) => setLimitVault(checked === true)}
                    className="size-3.5 shrink-0"
                  />
                  <Label htmlFor="limitVault" className="text-[10px] sm:text-[11px] font-medium cursor-pointer select-none truncate text-muted-foreground hover:text-foreground transition-colors">
                    {t("ui.obsidian.limitToCurrentVault") || "仅限当前笔记库"}
                  </Label>
                </div>
              )}
            </div>

            {/* Action Button (exact same width w-[180px] as inputs) */}
            <Button
              onClick={onGenerate}
              disabled={isLoading}
              className="rounded-xl h-9 w-[180px] text-xs font-bold shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95 flex items-center justify-center"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  {t("ui.obsidian.generating") || "正在生成..."}
                </>
              ) : (
                <>
                  <Key className="h-3.5 w-3.5 mr-1.5" />
                  {t("ui.obsidian.generateToken") || "生成并授权"}
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
                className="rounded-xl transition-all shadow-md flex-1 sm:flex-none"
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
