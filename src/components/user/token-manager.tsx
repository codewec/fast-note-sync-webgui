import { ShieldCheck, Smartphone, Monitor, RefreshCw, Trash2, Clock, Globe, ShieldAlert, Plus, Key, Copy, Check, Terminal, FileText, ChevronLeft, ChevronRight, History, Activity, LogIn, UserPlus, CheckCircle2, Zap, AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useTokenHandle, TokenLog } from "@/components/api-handle/token-handle";
import { useTranslation } from "react-i18next";
import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/components/common/Toast";
import { cn } from "@/lib/utils";

export function TokenManager() {
  const { t } = useTranslation();
  const { tokens, isLoading, currentTokenID, handleListTokens, handleRevokeToken, handleCreateToken, handleUpdateToken, handleFetchTokenLogs } = useTokenHandle();
  const [revokingId, setRevokingId] = useState<number | null>(null);
  
  // Token Log View State
  const [isLogOpen, setIsLogOpen] = useState(false);
  const [selectedTokenId, setSelectedTokenId] = useState<number | null>(null);
  const [logs, setLogs] = useState<TokenLog[]>([]);
  const [totalLogs, setTotalLogs] = useState(0);
  const [logPage, setLogPage] = useState(1);
  const [isLogLoading, setIsLogLoading] = useState(false);
  const LOG_PAGE_SIZE = 10;
  
  // Create/Edit token dialog state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingTokenId, setEditingTokenId] = useState<number | null>(null);
  
  const [newClientType, setNewClientType] = useState("Other");
  const [newProtocols, setNewProtocols] = useState<string[]>(["rest", "ws"]);
  const [newClientDim, setNewClientDim] = useState("*");
  const [newFuncDims, setNewFuncDims] = useState<string[]>([]); // Empty means "*"
  const [newExpiresDays, setNewExpiresDays] = useState(30);
  const [newBoundIp, setNewBoundIp] = useState("");
  const [newUserAgent, setNewUserAgent] = useState("");
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    handleListTokens();
  }, [handleListTokens]);

  const onRevoke = async (id: number) => {
    setRevokingId(id);
    const success = await handleRevokeToken(id);
    if (success) {
      toast.success(t("ui.token.revokeSuccess") || "Token revoked successfully");
    } else {
      toast.error(t("ui.token.revokeFailed") || "Failed to revoke token");
    }
    setRevokingId(null);
  };

  const onOpenLogs = (id: number) => {
    setSelectedTokenId(id);
    setLogPage(1);
    setIsLogOpen(true);
    fetchLogs(id, 1);
  };

  const onOpenEdit = (token: any) => {
    setEditingTokenId(token.id);
    setIsEditMode(true);
    setNewClientType(token.clientType);
    setNewBoundIp(token.boundIp);
    setNewUserAgent(token.userAgent);
    
    // Parse scope
    const parts = token.scope.split(" ");
    let p = ["rest", "ws"];
    let c = "*";
    let f = [] as string[];
    
    parts.forEach((part: string) => {
      if (part.startsWith("p:")) p = part.substring(2).split(",").filter(i => i);
      if (part.startsWith("c:")) c = part.substring(2);
      if (part.startsWith("f:")) f = part.substring(2) === "*" ? [] : part.substring(2).split(",").filter(i => i);
    });
    
    setNewProtocols(p);
    setNewClientDim(c);
    setNewFuncDims(f);
    
    // Expires: Calculate days from now
    const expiresAt = new Date(token.expiredAt);
    const diff = Math.ceil((expiresAt.getTime() - new Date().getTime()) / (1000 * 3600 * 24));
    setNewExpiresDays(diff > 0 ? diff : 30);
    
    setIsCreateOpen(true);
  };

  const fetchLogs = async (id: number, page: number) => {
    setIsLogLoading(true);
    const res = await handleFetchTokenLogs(id, page, LOG_PAGE_SIZE);
    if (res) {
      setLogs(res.logs);
      setTotalLogs(res.pager.totalRows);
    }
    setIsLogLoading(false);
  };

  const onPageChange = (newPage: number) => {
    if (selectedTokenId) {
      setLogPage(newPage);
      fetchLogs(selectedTokenId, newPage);
    }
  };

  const onSubmitToken = async () => {
    const protocolStr = newProtocols.length === 0 ? "*" : newProtocols.join(",");
    const funcStr = newFuncDims.length === 0 ? "*" : newFuncDims.join(",");
    
    if (isEditMode && editingTokenId) {
      const success = await handleUpdateToken(
        editingTokenId,
        newClientType.trim(),
        "", // Scope is handled by components if needed, or leave blank to use dimensions
        newExpiresDays,
        newBoundIp.trim(),
        newUserAgent.trim(),
        protocolStr,
        newClientDim.trim(),
        funcStr
      );
      if (success) {
        toast.success(t("ui.common.success"));
        closeCreateDialog();
      } else {
        toast.error(t("ui.common.error"));
      }
    } else {
      const token = await handleCreateToken(
        newClientType.trim(), 
        "", 
        newExpiresDays, 
        newBoundIp.trim(), 
        newUserAgent.trim(),
        protocolStr,
        newClientDim.trim(),
        funcStr
      );
      if (token) {
        setGeneratedToken(token);
        handleListTokens();
        toast.success(t("ui.common.success"));
      } else {
        toast.error(t("ui.common.error"));
      }
    }
  };

  const handleCopy = useCallback(() => {
    if (generatedToken) {
      navigator.clipboard.writeText(generatedToken).then(() => {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
        toast.success(t("ui.vault.copyConfigSuccess") || "Copied to clipboard");
      });
    }
  }, [generatedToken, t]);

  const closeCreateDialog = () => {
    setIsCreateOpen(false);
    setIsEditMode(false);
    setEditingTokenId(null);
    setGeneratedToken(null);
    setNewClientType("Other");
    setNewProtocols(["rest", "ws"]);
    setNewClientDim("*");
    setNewFuncDims([]);
    setNewExpiresDays(30);
    setNewBoundIp("");
    setNewUserAgent("");
  };

  const toggleProtocol = (p: string) => {
    setNewProtocols(prev => 
      prev.includes(p) ? prev.filter(i => i !== p) : [...prev, p]
    );
  };
  const toggleFuncDim = (f: string) => {
    setNewFuncDims(prev => {
      const isSelecting = !prev.includes(f);
      let next = isSelecting ? [...prev, f] : prev.filter(i => i !== f);
      
      if (isSelecting) {
        if (f.endsWith("_w")) {
          const rVersion = f.replace("_w", "_r");
          next = next.filter(i => i !== rVersion);
        } else if (f.endsWith("_r")) {
          const wVersion = f.replace("_r", "_w");
          next = next.filter(i => i !== wVersion);
        }
      }
      return next;
    });
  };
  const getClientIcon = (clientType: string) => {
    const type = clientType.toLowerCase();
    if (type.includes("mobile") || type.includes("ios") || type.includes("android")) {
      return <Smartphone className="h-4 w-4" />;
    }
    return <Monitor className="h-4 w-4" />;
  };

  const isExpired = (expiredAt: string) => {
    return new Date(expiredAt) < new Date();
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <ShieldCheck className="h-8 w-8 text-primary" />
            {t("ui.nav.menuTokens") || "令牌管理"}
          </h1>
          <p className="text-muted-foreground mt-2">
            {t("ui.token.description") || "管理您的活动会话和 API 访问令牌。您可以随时注销不再使用的设备。"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => setIsCreateOpen(true)}
            className="rounded-xl border-primary/20 text-primary hover:bg-primary/5"
          >
            <Plus className="h-4 w-4" />
          </Button>
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => handleListTokens()} 
            disabled={isLoading}
            className="rounded-xl"
          >
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          </Button>
        </div>
      </div>

      <Dialog open={isCreateOpen} onOpenChange={(open) => !open && closeCreateDialog()}>
        <DialogContent className="sm:max-w-[600px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="h-5 w-5 text-primary" />
              {isEditMode ? (t("ui.token.editTitle") || "编辑令牌") : (t("ui.token.createTitle") || "创建新令牌")}
            </DialogTitle>
            <DialogDescription>
              {isEditMode ? (t("ui.token.editDesc") || "修改现有令牌的权限和有效期设置。") : (t("ui.token.createDesc") || "手动创建一个具有特定权限和有效期的 API 访问令牌。")}
            </DialogDescription>
          </DialogHeader>

          {!generatedToken ? (
            <div className="space-y-5 py-4">
              <div className="space-y-2">
                <Label htmlFor="clientType" className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <FileText className="h-3 w-3" />
                  {t("ui.token.name")}
                </Label>
                <Input 
                  id="clientType" 
                  value={newClientType} 
                  onChange={(e) => setNewClientType(e.target.value)}
                  placeholder="e.g. Obsidian-Mobile, MyServer"
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-3">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <Terminal className="h-3 w-3" />
                  {t("ui.token.protocol")}
                </Label>
                <div className="flex flex-wrap gap-4 p-3 rounded-xl bg-muted/50 border border-border">
                  {["rest", "ws", "mcp"].map((p) => (
                    <div key={p} className="flex items-center space-x-2">
                      <Checkbox 
                        id={`p-${p}`} 
                        checked={newProtocols.includes(p)} 
                        onCheckedChange={() => toggleProtocol(p)}
                      />
                      <Label htmlFor={`p-${p}`} className="capitalize cursor-pointer">{p}</Label>
                    </div>
                  ))}
                  <div className="flex items-center space-x-2 border-l pl-4 border-border/50">
                    <Checkbox 
                      id="p-all" 
                      checked={newProtocols.length === 0} 
                      onCheckedChange={(checked) => checked ? setNewProtocols([]) : setNewProtocols(["rest", "ws"])}
                    />
                    <Label htmlFor="p-all" className="cursor-pointer font-bold">{t("ui.common.unrestricted") || "不限制"}</Label>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="clientDim" className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <Smartphone className="h-3 w-3" />
                    {t("ui.token.clientType")}
                  </Label>
                  <Input 
                    id="clientDim" 
                    value={newClientDim} 
                    onChange={(e) => setNewClientDim(e.target.value)}
                    placeholder="e.g. ObsidianPlugin, *"
                    className="rounded-xl"
                  />
                </div>

                <div className="space-y-3">
                  <Label htmlFor="funcDim" className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <ShieldCheck className="h-3 w-3" />
                    {t("ui.token.function")}
                  </Label>
                  <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-muted/50 border border-border">
                    {[
                      { id: "note_r", label: t("ui.token.funcNoteR") },
                      { id: "note_w", label: t("ui.token.funcNoteW") },
                      { id: "file_r", label: t("ui.token.funcFileR") },
                      { id: "file_w", label: t("ui.token.funcFileW") },
                      { id: "config_r", label: t("ui.token.funcConfigR") },
                      { id: "config_w", label: t("ui.token.funcConfigW") },
                    ].map((opt) => (
                      <div key={opt.id} className="flex items-center space-x-2">
                        <Checkbox 
                          id={`f-${opt.id}`} 
                          checked={newFuncDims.includes(opt.id)} 
                          onCheckedChange={() => toggleFuncDim(opt.id)}
                        />
                        <Label htmlFor={`f-${opt.id}`} className="cursor-pointer text-[13px]">{opt.label}</Label>
                      </div>
                    ))}
                    <div className="col-span-2 border-t border-border/50 pt-2 mt-1">
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="f-all" 
                          checked={newFuncDims.length === 0} 
                          onCheckedChange={(checked) => checked ? setNewFuncDims([]) : setNewFuncDims(["note_r"])}
                        />
                        <Label htmlFor="f-all" className="cursor-pointer font-bold text-[13px]">{t("ui.common.unrestricted")}</Label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-border/50 pt-2 mt-2"></div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="expires" className="text-xs font-medium text-muted-foreground">{t("ui.token.expiresDays")}</Label>
                  <Input 
                    id="expires" 
                    type="number" 
                    value={newExpiresDays} 
                    onChange={(e) => setNewExpiresDays(parseInt(e.target.value))}
                    className="rounded-xl h-9"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="boundIp" className="text-xs font-medium text-muted-foreground">{t("ui.token.boundIp")}</Label>
                  <Input 
                    id="boundIp" 
                    value={newBoundIp} 
                    onChange={(e) => setNewBoundIp(e.target.value)}
                    placeholder="e.g. 127.0.0.1"
                    className="rounded-xl h-9"
                  />
                  <p className="text-[11px] text-muted-foreground/70 px-1 italic">
                    {t("ui.token.ipWildcardHint")}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="userAgent" className="text-xs font-medium text-muted-foreground">{t("ui.token.userAgent")}</Label>
                  <Input 
                    id="userAgent" 
                    value={newUserAgent} 
                    onChange={(e) => setNewUserAgent(e.target.value)}
                    placeholder="e.g. Mozilla..."
                    className="rounded-xl h-9"
                  />
                  <p className="text-[11px] text-muted-foreground/70 px-1 italic">
                    {t("ui.token.uaWildcardHint")}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4 py-4 animate-in fade-in zoom-in-95 duration-300">
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs flex gap-2">
                <ShieldAlert className="h-4 w-4 shrink-0" />
                <p>{t("ui.token.warning") || "请务必复制并妥善保存此令牌。出于安全原因，它将不会再次显示。"}</p>
              </div>
              <div className="relative group">
                <div className="p-4 rounded-xl bg-muted font-mono text-sm break-all pr-12 border border-border">
                  {generatedToken}
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="absolute right-2 top-2 h-8 w-8 rounded-lg"
                  onClick={handleCopy}
                >
                  {isCopied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          )}

          <DialogFooter>
            {!generatedToken ? (
              <>
                <Button variant="ghost" onClick={closeCreateDialog} className="rounded-xl">
                  {t("ui.common.cancel")}
                </Button>
                <Button onClick={onSubmitToken} disabled={isLoading} className="rounded-xl px-8">
                  {isLoading && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
                  {t("ui.common.confirm")}
                </Button>
              </>
            ) : (
              <Button onClick={closeCreateDialog} className="rounded-xl w-full">
                {t("ui.common.close")}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid gap-4">
        {tokens.length === 0 && !isLoading ? (
          <Card className="border-dashed border-2 bg-muted/30">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <ShieldAlert className="h-12 w-12 text-muted-foreground mb-4 opacity-20" />
              <p className="text-muted-foreground font-medium">{t("ui.token.noTokens") || "暂无活动令牌"}</p>
            </CardContent>
          </Card>
        ) : (
          tokens.map((token) => (
            <Card key={token.id} className={cn(
              "overflow-hidden transition-all hover:shadow-md border-l-4",
              isExpired(token.expiredAt) ? "border-l-destructive/50 opacity-60" : "border-l-primary/50"
            )}>
              <CardContent className="p-0">
                <div className="flex flex-col md:flex-row md:items-center justify-between p-6 gap-6">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="mt-1 p-2 bg-primary/10 rounded-xl text-primary shrink-0">
                      {getClientIcon(token.clientType)}
                    </div>
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-lg">{token.clientType}</h3>
                        <Badge variant="outline" className="h-5 text-[10px] px-1.5 font-medium flex items-center gap-1 bg-blue-500/10 text-blue-500 border-blue-500/20">
                          {token.issueType === 1 ? <Globe className="h-3 w-3" /> : <UserPlus className="h-3 w-3" />}
                          {token.issueType === 1 ? (t("ui.token.issueTypeLogin") || "登录") : (t("ui.token.issueTypeManual") || "手动")}
                        </Badge>
                        {token.id === currentTokenID && (
                          <Badge variant="outline" className="h-5 text-[10px] px-1.5 font-medium flex items-center bg-emerald-500/10 text-emerald-500 border-emerald-500/20 gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            {t("ui.token.current") || "当前会话"}
                          </Badge>
                        )}
                        {token.isWsOnline && (
                          <Badge variant="outline" className="h-5 text-[10px] px-1.5 font-medium flex items-center bg-emerald-500 text-white border-white/20 gap-1">
                            <Zap className="h-3 w-3 fill-current" />
                            <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                            {t("ui.token.wsOnline") || "WS在线"}
                          </Badge>
                        )}
                        {isExpired(token.expiredAt) ? (
                          <Badge variant="destructive" className="h-5 text-[10px] px-1.5 font-medium flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            {t("ui.token.statusExpired") || "已过期"}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="h-5 text-[10px] px-1.5 font-medium flex items-center bg-muted/30 text-muted-foreground border-border/60 gap-1">
                            <Activity className="h-3 w-3 text-muted-foreground/60" />
                            {t("ui.token.lastUsedAt")}: {token.lastUsedAt && !token.lastUsedAt.startsWith("0001") ? new Date(token.lastUsedAt).toLocaleString() : (t("ui.common.never") || "从未")}
                          </Badge>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground/70 pt-1">
                        <div className="flex items-center gap-1.5">
                          <ShieldCheck className="h-3 w-3" />
                          <span>Scope: <code className="bg-muted px-1 rounded">{token.scope}</code></span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3 w-3" />
                          <span>{t("ui.common.createdAt")}: {new Date(token.createdAt).toLocaleString()}</span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3 w-3 text-amber-500/70" />
                          <span>{t("ui.token.expiresAt") || "过期时间"}: {new Date(token.expiredAt).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="rounded-lg h-9"
                      onClick={() => onOpenLogs(token.id)}
                    >
                      <History className="h-4 w-4 mr-2" />
                      {t("ui.token.logsTitle") || "日志"}
                    </Button>
                    {token.issueType === 2 && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="rounded-lg h-9"
                        onClick={() => onOpenEdit(token)}
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        {t("ui.common.edit") || "编辑"}
                      </Button>
                    )}
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="rounded-lg text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/20 h-9"
                      onClick={() => onRevoke(token.id)}
                      disabled={revokingId === token.id || token.id === currentTokenID}
                      title={token.id === currentTokenID ? "无法注销当前会话令牌" : ""}
                    >
                      {revokingId === token.id ? (
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4 mr-2" />
                      )}
                      {t("ui.common.delete") || "注销"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={isLogOpen} onOpenChange={setIsLogOpen}>
        <DialogContent className="sm:max-w-[800px] rounded-2xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              {t("ui.token.logsTitle") || "访问日志"}
            </DialogTitle>
            <DialogDescription>
              {tokens.find(t => t.id === selectedTokenId)?.clientType} - {t("ui.token.logsDesc") || "查看该令牌的最近访问记录"}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-auto py-4">
            <div className="rounded-xl border border-border overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="w-[160px] text-[11px] uppercase tracking-wider font-bold">{t("ui.token.logTime")}</TableHead>
                    <TableHead className="w-[80px] text-[11px] uppercase tracking-wider font-bold">{t("ui.token.logProtocol") || "协议"}</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wider font-bold">{t("ui.token.logClient")}</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wider font-bold">{t("ui.token.logIp")}</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wider font-bold">{t("ui.token.logUa")}</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wider font-bold text-center">{t("ui.token.logStatus")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLogLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-32 text-center">
                        <RefreshCw className="h-6 w-6 animate-spin mx-auto text-muted-foreground/30" />
                      </TableCell>
                    </TableRow>
                  ) : (logs?.length || 0) === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-32 text-center text-muted-foreground italic">
                        {t("ui.common.noData") || "暂无日志记录"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    logs?.map((log) => (
                      <TableRow key={log.id} className="group hover:bg-muted/30">
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(log.createdAt).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px] uppercase font-mono py-0 h-4 w-fit border-primary/20 text-primary bg-primary/5">
                            {log.protocol}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 whitespace-nowrap">
                            <span className="text-xs font-bold text-foreground/90">{log.clientName || "Unknown"}</span>
                            <span className="text-[11px] text-muted-foreground font-medium">{log.client}</span>
                            {log.clientVersion && (
                              <span className="text-[10px] text-muted-foreground/50 font-mono">v{log.clientVersion}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs font-mono">{log.ip}</TableCell>
                        <TableCell>
                          <div className="text-[10px] text-muted-foreground/60 truncate max-w-[200px]" title={log.ua}>
                            {log.ua}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={cn(
                            "text-xs font-bold",
                            log.statusCode >= 200 && log.statusCode < 300 ? "text-emerald-500" : "text-destructive"
                          )}>{log.statusCode}</span>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          <DialogFooter className="flex items-center justify-between sm:justify-between border-t pt-4">
            <div className="text-xs text-muted-foreground">
              Total {totalLogs} records
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 rounded-lg"
                onClick={() => onPageChange(logPage - 1)}
                disabled={logPage <= 1 || isLogLoading}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="text-sm font-medium px-2">
                {logPage} / {Math.ceil(totalLogs / LOG_PAGE_SIZE) || 1}
              </div>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 rounded-lg"
                onClick={() => onPageChange(logPage + 1)}
                disabled={logPage >= Math.ceil(totalLogs / LOG_PAGE_SIZE) || isLogLoading}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
