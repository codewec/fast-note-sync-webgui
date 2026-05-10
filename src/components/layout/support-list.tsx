import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator, } from "@/components/ui/dropdown-menu";
import { Heart, RefreshCw, Loader2, MessageCircle, Smile, Coffee, QrCode, ExternalLink, SortDesc, ChevronLeft, ChevronRight, AlertCircle } from "lucide-react";
import { useSupport } from "@/components/api-handle/use-support";
import { Tooltip } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";


type SortKey = "time" | "amount";
type SortOrder = "asc" | "desc";

export function SupportList() {
    const { t } = useTranslation()
    const { supportList, pager, isLoading, error, refresh } = useSupport()
    const [page, setPage] = useState(1);
    const [pageSize] = useState(20);
    const [sortKey, setSortKey] = useState<SortKey>("amount");
    const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

    useEffect(() => {
        refresh(page, pageSize, sortKey, sortOrder)
    }, [refresh, page, pageSize, sortKey, sortOrder])

    const handleSortChange = (key: SortKey, order: SortOrder) => {
        setSortKey(key);
        setSortOrder(order);
        setPage(1);
    };

    if (isLoading && supportList.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12 h-full">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
                <span className="text-sm text-muted-foreground">{t("ui.common.loading")}</span>
            </div>
        )
    }

    if (error && supportList.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12 h-full space-y-4">
                <AlertCircle className="h-8 w-8 text-destructive opacity-50" />
                <div className="text-sm text-destructive font-medium">{error}</div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => refresh(page, pageSize, sortKey, sortOrder)}
                    className="rounded-xl border-primary/20 hover:border-primary/50"
                >
                    <RefreshCw className="h-3 w-3 mr-2" />
                    {t("ui.common.retry", { defaultValue: "重试" })}
                </Button>
            </div>
        )
    }

    return (
        <div className="flex flex-col h-full space-y-1.5 focus-visible:outline-none">
            <div className="flex items-center justify-between pb-0.5">
                <h2 className="text-lg font-bold text-card-foreground flex items-center gap-2">
                    <Heart className="h-5 w-5 text-red-500 fill-red-500/10" />
                    {t("ui.support.title")}
                </h2>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => refresh(page, pageSize, sortKey, sortOrder)}
                    disabled={isLoading}
                    className="h-6 w-6 rounded-full hover:bg-muted"
                >
                    <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
                </Button>
            </div>

            <p className="text-xs leading-relaxed text-muted-foreground bg-muted/30 p-2.5 rounded-lg border border-border/40">
                {t("ui.support.supportRequest")}
            </p>

            {/* Donation Methods */}
            <div className="grid grid-cols-2 gap-2 pb-2">
                <a
                    href="https://ko-fi.com/haierkeys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group relative flex flex-col items-center justify-center p-3 rounded-xl bg-orange-500/5 border border-orange-500/10 hover:bg-orange-500/10 hover:border-orange-500/30 transition-all cursor-pointer overflow-hidden"
                >
                    <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-40 transition-opacity">
                        <ExternalLink className="h-2.5 w-2.5 text-orange-600" />
                    </div>
                    <img src="/static/images/kofi.png" alt="Ko-fi" className="h-16 w-auto object-contain mb-2 transition-transform group-hover:scale-105" />
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-orange-600/80">
                        <Coffee className="h-3.5 w-3.5" />
                        {t("ui.support.buyMeACoffee")}
                    </div>
                </a>

                <div className="group relative flex flex-col items-center justify-center p-3 rounded-xl bg-green-500/5 border border-green-500/10 hover:bg-green-500/10 hover:border-green-500/30 transition-all overflow-hidden">
                    <Tooltip
                        content={<img src="/static/images/wxds.png" alt="WeChat Pay" className="w-56 h-auto rounded" />}
                        side="top"
                        className="p-1.5 bg-white border-0 shadow-2xl"
                    >
                        <div className="flex flex-col items-center justify-center w-full h-full cursor-help">
                            <img src="/static/images/wxds.png" alt="WeChat Pay" className="h-16 w-auto object-contain mb-2 rounded-sm opacity-90 group-hover:opacity-100 transition-all group-hover:scale-105" />
                            <div className="flex items-center gap-1.5 text-[11px] font-bold text-green-600/80">
                                <QrCode className="h-3.5 w-3.5" />
                                {t("ui.support.wechatReward")}
                            </div>
                        </div>
                    </Tooltip>
                </div>
            </div>

            <div className="flex items-center justify-between pl-1 pt-1 pb-1">
                <h3 className="text-xs font-bold text-muted-foreground/80 flex items-center gap-1.5">
                    <MessageCircle className="h-3.5 w-3.5" />
                    {t("ui.support.listTitle")}
                </h3>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-6 px-2 text-[11px] gap-1 hover:bg-muted text-muted-foreground">
                            <SortDesc className="h-3.5 w-3.5" />
                            {sortKey === "amount" ? t("ui.support.sortDefault") : t("ui.support.sortTime")}
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="text-[11px] min-w-30">
                        <DropdownMenuLabel className="text-[10px] opacity-50 px-2 py-1">{t("ui.support.sort")}</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            className={`px-2 py-1.5 cursor-pointer ${sortKey === "amount" ? "bg-primary/10 text-primary font-bold" : ""}`}
                            onClick={() => handleSortChange("amount", "desc")}
                        >
                            {t("ui.support.sortDefault")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            className={`px-2 py-1.5 cursor-pointer ${sortKey === "time" ? "bg-primary/10 text-primary font-bold" : ""}`}
                            onClick={() => handleSortChange("time", "desc")}
                        >
                            {t("ui.support.sortTime")}
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            <div className="flex-1 overflow-y-auto border border-border/40 rounded-lg bg-card/10 custom-scrollbar relative min-h-30">
                {supportList.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground space-y-2 opacity-60 py-8">
                        <MessageCircle className="h-6 w-6 stroke-[1.5]" />
                        <span className="text-xs italic">{t("ui.support.noData")}</span>
                    </div>
                ) : (
                    <div className="divide-y divide-border/20">
                        {supportList.map((record, index) => {
                            const tooltipContent = `${record.name || "Anonymous"}: ${record.message || record.item}`;

                            return (
                                <div key={index} className="w-full block">
                                    <Tooltip
                                        side="left"
                                        delay={300}
                                        content={tooltipContent}
                                        className="max-w-75 whitespace-normal"
                                        triggerClassName="w-full"
                                    >
                                        <div className="grid grid-cols-[80px_1fr_80px] gap-2 px-3 py-2 items-center hover:bg-primary/5 transition-colors cursor-default text-[11px] w-full">
                                            <div className="text-muted-foreground font-mono tabular-nums whitespace-nowrap overflow-hidden text-ellipsis opacity-70">
                                                {(record.time || "").split(' ')[0] || "N/A"}
                                            </div>
                                            <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
                                                <Smile className="h-3 w-3 text-primary/60 shrink-0" />
                                                <span className="font-medium shrink-0 max-w-20 truncate">
                                                    {record.name || "Anonymous"}
                                                </span>
                                                {record.message && (
                                                    <span className="text-muted-foreground truncate text-[10px] opacity-70 border-l border-border/50 pl-1.5">
                                                        {record.message}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-right font-bold text-primary tabular-nums">
                                                {record.amount} <span className="text-[9px] opacity-70 font-normal ml-0.5">{record.unit}</span>
                                            </div>
                                        </div>
                                    </Tooltip>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {pager && pager.totalRows > 0 && (
                <div className="flex items-center justify-between pt-1 pb-1 px-1">
                    <div className="text-[10px] text-muted-foreground opacity-70">
                        {t("ui.common.total", { defaultValue: `共 ${pager.totalRows} 条` })}
                    </div>
                    <div className="flex items-center gap-1.5">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 rounded-full hover:bg-muted"
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={page <= 1 || isLoading}
                        >
                            <ChevronLeft className="h-3.5 w-3.5" />
                        </Button>
                        <span className="text-[10px] text-muted-foreground font-mono tabular-nums min-w-7.5 text-center">
                            {page} / {Math.max(1, Math.ceil(pager.totalRows / pageSize))}
                        </span>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 rounded-full hover:bg-muted"
                            onClick={() => setPage((p) => p + 1)}
                            disabled={page >= Math.ceil(pager.totalRows / pageSize) || isLoading}
                        >
                            <ChevronRight className="h-3.5 w-3.5" />
                        </Button>
                    </div>
                </div>
            )}

            <div className="pt-0.5 text-[10px] text-center text-muted-foreground italic opacity-40">
                {t("ui.support.thanks")}
            </div>
        </div>
    )
}
