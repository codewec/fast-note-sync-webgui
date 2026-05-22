import { NotepadText, Trash2, RefreshCw, Plus, Calendar, Clock, ChevronLeft, ChevronRight, History, Search, X, SortDesc, SortAsc, RotateCcw, Eye, Pencil, Folder as FolderIcon, ChevronDown, FolderSearch, TextCursorInput, Share2, Library } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useConfirmDialog } from "@/components/context/confirm-dialog-context";
import { useNoteHandle } from "@/components/api-handle/note-handle";
import { useShareHandle } from "@/components/api-handle/share-handle";
import React, { useState, useEffect, useRef } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip } from "@/components/ui/tooltip";
import { useAppStore } from "@/stores/app-store";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { VaultType } from "@/lib/types/vault";
import { Input } from "@/components/ui/input";
import { Folder } from "@/lib/types/folder";
import { Note } from "@/lib/types/note";
import { format } from "date-fns";
import { ShareModal } from "@/components/share/share-modal";
import { DndContext, useDraggable, useDroppable, DragEndEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { cn } from "@/lib/utils";


type SearchMode = "path" | "content";
type SortBy = "mtime" | "ctime" | "path";
type SortOrder = "desc" | "asc";
export type ShareFilterType = 'active' | null;
export type ViewModeType = 'flat' | 'folder';

interface NoteListProps {
    vault: string;
    vaults?: VaultType[];
    onVaultChange?: (vault: string) => void;
    onSelectNote: (note: Note, previewMode?: boolean) => void;
    onCreateNote: () => void;
    page: number;
    setPage: (page: number) => void;
    pageSize: number;
    setPageSize: (pageSize: number) => void;
    onViewHistory: (note: Note) => void;
    isRecycle?: boolean;
    searchKeyword: string;
    setSearchKeyword: (keyword: string) => void;
    currentPath: string;
    setCurrentPath: (path: string) => void;
    currentPathHash: string;
    setCurrentPathHash: (hash: string) => void;
    pathHashMap: Record<string, string>;
    setPathHashMap: (map: Record<string, string>) => void;
    shareFilter: ShareFilterType;
    setShareFilter: (filter: ShareFilterType) => void;
    viewMode: ViewModeType;
    setViewMode: (mode: ViewModeType) => void;
}

/**
 * 可拖拽的笔记卡片包装组件 - 支持直接点击拖拽整张卡片
 * Draggable note card wrapper component - supports dragging the entire card directly
 */
interface DraggableNoteCardProps {
    note: Note;
    children: React.ReactNode;
}

function DraggableNoteCard({ note, children }: DraggableNoteCardProps) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: `note-${note.pathHash}`,
        data: {
            type: "note",
            note
        }
    });

    const style = {
        transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
        opacity: isDragging ? 0.4 : undefined,
        zIndex: isDragging ? 9999 : undefined,
    };

    return (
        <div 
            ref={setNodeRef} 
            style={style} 
            {...attributes}
            {...listeners}
            className={cn(
                "w-full cursor-grab active:cursor-grabbing",
                isDragging && "pointer-events-none"
            )}
        >
            {children}
        </div>
    );
}

/**
 * 可放置的文件夹卡片包装组件
 * Droppable folder card wrapper component
 */
interface DroppableFolderCardProps {
    folder: Folder;
    children: React.ReactNode;
}

function DroppableFolderCard({ folder, children }: DroppableFolderCardProps) {
    const { isOver, setNodeRef } = useDroppable({
        id: `folder-${folder.pathHash}`,
        data: {
            type: "folder",
            folder
        }
    });

    return (
        <div 
            ref={setNodeRef} 
            className={cn(
                "transition-all duration-200 rounded-xl",
                isOver && "ring-2 ring-primary ring-offset-2 scale-[1.01] bg-primary/5 border-primary/40 shadow-md"
            )}
        >
            {children}
        </div>
    );
}

/**
 * 可放置的面包屑按钮包装组件
 * Droppable breadcrumb button wrapper component
 */
interface DroppableBreadcrumbButtonProps {
    path: string;
    children: React.ReactNode;
    className?: string;
}

function DroppableBreadcrumbButton({ path, children, className }: DroppableBreadcrumbButtonProps) {
    const { isOver, setNodeRef } = useDroppable({
        id: `breadcrumb-folder-${path || "root"}`,
        data: {
            type: "breadcrumb-folder",
            path
        }
    });

    return (
        <div 
            ref={setNodeRef} 
            className={cn(
                // 默认使用紧凑内边距 px-2 py-0.5，与文字对齐；加上 select-none 优化交互体验
                // Default to tight px-2 py-0.5 padding for visual alignment; add select-none to optimize drag feel
                "inline-flex items-center transition-all duration-200 rounded-md px-2 py-0.5 border border-transparent text-xs sm:text-sm select-none",
                className,
                // 当拖拽悬停时变大并高亮，并赋予 z-40 确保绝对覆盖下方卡片，不受层叠上下文干扰
                // Scale up slightly and highlight when dragged over, add relative z-40 to prevent overlapping issues from lower cards
                isOver && "bg-primary/10 text-primary scale-[1.03] border-primary/20 shadow-sm relative z-40"
            )}
        >
            {children}
        </div>
    );
}


export function NoteList({ vault, vaults, onVaultChange, onSelectNote, onCreateNote, page, setPage, pageSize, setPageSize, onViewHistory, isRecycle = false, searchKeyword, setSearchKeyword, currentPath, setCurrentPath, currentPathHash, setCurrentPathHash, pathHashMap, setPathHashMap, shareFilter, setShareFilter, viewMode, setViewMode }: NoteListProps) {
    const { t } = useTranslation();
    const { handleNoteList, handleDeleteNote, handleRestoreNote, handleFolderList, handleFolderNotes, handlePermanentDeleteNote, handleClearNoteRecycle, handleRenameNote, handleNoteListByPaths } = useNoteHandle();
    const { handleGetNoteSharePaths } = useShareHandle();
    const { openConfirmDialog } = useConfirmDialog();

    // 拖拽传感器配置，加上 8px 移动判定以过滤普通的笔记点击阅读
    // Drag sensors configuration, with 8px constraint to filter normal clicks for reading notes
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        })
    );

    // 处理笔记拖拽至子目录或面包屑导航（笔记库根目录/上级目录）的放置逻辑
    // Handle drop logic of dragging notes to subfolders or breadcrumb navigation (vault root/parent folders)
    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over) return;

        const activeData = active.data.current;
        const overData = over.data.current;

        if (activeData?.type === "note") {
            const dragNote = activeData.note as Note;
            const filename = dragNote.path.split("/").pop() || "";
            let targetPath: string | null = null;

            if (overData?.type === "folder") {
                const targetFolder = overData.folder as Folder;
                targetPath = targetFolder.path;
            } else if (overData?.type === "breadcrumb-folder") {
                targetPath = overData.path; // targetPath is "" for vault root
            }

            if (targetPath === null) return;

            // 如果 targetPath 是空字符串，表示移动到笔记库根目录；否则移动到对应相对路径子目录
            // If targetPath is an empty string, it means moving to the vault root; otherwise, moving to the subfolder
            const newFullPath = targetPath === "" ? filename : targetPath + "/" + filename;

            if (newFullPath === dragNote.path) return;

            handleRenameNote({
                vault,
                oldPath: dragNote.path,
                path: newFullPath,
                oldPathHash: dragNote.pathHash
            }, () => {
                fetchNotes();
            });
        }
    };

    const [notes, setNotes] = useState<Note[]>([]);
    const [loading, setLoading] = useState(false);
    const [totalRows, setTotalRows] = useState(0);
    const [debouncedKeyword, setDebouncedKeyword] = useState(searchKeyword);
    const [searchMode, setSearchMode] = useState<SearchMode>("path");

    const [sortBy, setSortBy] = useState<SortBy>("mtime");
    const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
    const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());
    const [batchRestoreProgress, setBatchRestoreProgress] = useState<{ current: number; total: number } | null>(null);
    const [folders, setFolders] = useState<Folder[]>([]);
    const noteRequestIdRef = useRef(0);
    const { trashType, setModule } = useAppStore();
    const [shareModalOpen, setShareModalOpen] = useState(false);
    const [selectedShareNote, setSelectedShareNote] = useState<Note | null>(null);
    // 仅存储有效分享的笔记路径集合，替代原来的完整 ShareItem 列表
    // Only store active shared note paths, replacing the full ShareItem list
    const [activeSharePaths, setActiveSharePaths] = useState<Set<string>>(new Set());

    const refreshShareItems = () => {
        if (isRecycle) return;
        handleGetNoteSharePaths(vault, (paths) => {
            // 内容未变化时跳过更新，避免触发不必要的全列表重渲染
            // Skip update when content is unchanged to avoid unnecessary full list re-render
            setActiveSharePaths(prev => {
                if (paths.length !== prev.size || !paths.every(p => prev.has(p))) return new Set(paths);
                return prev;
            });
        });
    };

    // 非回收站模式下异步懒加载分享路径（不阻塞首屏笔记列表渲染）
    // Lazy-load share paths asynchronously after mount (does not block first-screen note list)
    useEffect(() => {
        refreshShareItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [vault]);

    // 活跃分享路径集合即为 activeSharePaths（已按 vault 过滤）
    // Active note path set is already filtered by vault on backend
    const activeShareCount = activeSharePaths.size;

    // 仅在分享筛选激活时才将 size 纳入 fetchNotes 依赖，避免正常模式下触发多余请求
    // Only include share path count as a fetchNotes dependency when share filter is active
    const shareFilterActiveDep = shareFilter === 'active' ? activeSharePaths.size : 0;

    // Debounce search keyword
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedKeyword(searchKeyword);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchKeyword]);



    const fetchNotes = (currentPage: number = page, currentPageSize: number = pageSize, keyword: string = debouncedKeyword) => {
        const requestId = ++noteRequestIdRef.current;



        setLoading(true);

        // 分享筛选：全库平铺查询（修复子文件夹漏筛）
        if (shareFilter === 'active' && !isRecycle) {
            setFolders([]);
            if (activeSharePaths.size === 0) {
                setNotes([]);
                setTotalRows(0);
                setLoading(false);
                return;
            }

            handleNoteListByPaths(vault, [...activeSharePaths], currentPage, currentPageSize, sortBy, sortOrder, (data) => {
                if (requestId !== noteRequestIdRef.current) return;
                setNotes(data?.list || []);
                setTotalRows(data?.pager?.totalRows || 0);
                setLoading(false);
            });
            return;
        }

        if (viewMode === "folder" && !isRecycle) {
            // 并行发起目录列表和目录笔记两个独立请求，减少首屏等待时间
            // Issue both folder list and folder notes requests in parallel to reduce initial load time
            Promise.all([
                new Promise<Folder[] | null>(resolve => handleFolderList(vault, currentPath, currentPathHash, resolve)),
                new Promise<{ list: Note[]; pager: { page: number; pageSize: number; totalRows: number } } | null>(resolve =>
                    handleFolderNotes(vault, currentPath, currentPathHash, currentPage, currentPageSize, sortBy, sortOrder, resolve)
                ),
            ]).then(([folderData, noteData]) => {
                if (requestId !== noteRequestIdRef.current) return;
                setFolders(folderData || []);
                setNotes(noteData?.list || []);
                setTotalRows(noteData?.pager?.totalRows || 0);
                setLoading(false);
            });
        } else {
            handleNoteList(vault, currentPage, currentPageSize, keyword, isRecycle, searchMode, false, sortBy, sortOrder, (data) => {
                if (requestId !== noteRequestIdRef.current) return;

                let filteredList = data?.list || [];



                setNotes(filteredList);
                setTotalRows(data?.pager?.totalRows || 0);
                setLoading(false);
            });
        }
    };

    useEffect(() => {
        fetchNotes(page, pageSize, debouncedKeyword);
        setSelectedPaths(new Set()); // 清空选中
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [vault, page, pageSize, debouncedKeyword, isRecycle, searchMode, sortBy, sortOrder, viewMode, currentPath, shareFilter, shareFilterActiveDep]);

    // 当搜索内容、目录路径或浏览模式变化时，重置页码到第1页
    useEffect(() => {
        if (debouncedKeyword) {
            setViewMode("flat");
        }
    }, [debouncedKeyword, currentPath, viewMode, setPage]);

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= Math.ceil(totalRows / pageSize)) {
            setPage(newPage);
        }
    };

    const onDelete = (e: React.MouseEvent, note: Note) => {
        e.stopPropagation();
        const title = note.path.replace(/\.md$/, "");
        openConfirmDialog(t("ui.note.deleteNoteConfirm", { title }), "confirm", () => {
            handleDeleteNote(vault, note.path, note.pathHash, () => {
                fetchNotes();
            });
        });
    };

    const onRestore = (e: React.MouseEvent, note: Note) => {
        e.stopPropagation();
        const title = note.path.replace(/\.md$/, "");
        openConfirmDialog(t("ui.note.restoreNoteConfirm", { title }), "confirm", () => {
            handleRestoreNote(vault, note.path, note.pathHash, () => {
                fetchNotes();
            });
        });
    };
    const onPermanentDelete = (e: React.MouseEvent, note: Note) => {
        e.stopPropagation();
        const title = note.path.replace(/\.md$/, "");
        openConfirmDialog(t("ui.note.permanentDeleteConfirm", { title }), "confirm", () => {
            handlePermanentDeleteNote(vault, note.path, note.pathHash, () => {
                fetchNotes();
            });
        });
    };

    /**
     * 重命名笔记并支持移动文件夹
     * Rename the note and support moving between folders
     */
    const onRename = (e: React.MouseEvent, note: Note) => {
        e.stopPropagation();
        
        // 提取扩展名与不含扩展名的完整相对路径
        // Extract file extension and the full relative path without extension
        const extension = note.path.includes(".") ? note.path.substring(note.path.lastIndexOf(".")) : ".md";
        const baseRelativePath = note.path.includes(".") ? note.path.substring(0, note.path.lastIndexOf(".")) : note.path;
        let newPath = baseRelativePath;

        openConfirmDialog(
            t("ui.note.renameNote"),
            "confirm",
            () => {
                if (!newPath || newPath === baseRelativePath) return;

                // 拼接新相对路径的扩展名
                // Combine the new relative path with its file extension
                const finalPath = newPath.endsWith(extension) ? newPath : newPath + extension;

                handleRenameNote({
                    vault,
                    oldPath: note.path,
                    path: finalPath,
                    oldPathHash: note.pathHash
                }, () => {
                    fetchNotes();
                });
            },
            <div className="pt-2">
                <Input
                    autoFocus
                    defaultValue={baseRelativePath}
                    placeholder={t("ui.note.renameNotePlaceholder")}
                    onChange={(e) => {
                        newPath = e.target.value;
                    }}
                />
            </div>
        );
    };

    const toggleSelectAll = () => {
        if (selectedPaths.size === notes.length && notes.length > 0) {
            setSelectedPaths(new Set());
        } else {
            setSelectedPaths(new Set(notes.map(n => n.pathHash)));
        }
    };

    const toggleSelect = (e: React.MouseEvent, pathHash: string) => {
        e.stopPropagation();
        const newSelected = new Set(selectedPaths);
        if (newSelected.has(pathHash)) {
            newSelected.delete(pathHash);
        } else {
            newSelected.add(pathHash);
        }
        setSelectedPaths(newSelected);
    };

    const onBatchRestore = () => {
        if (selectedPaths.size === 0) return;

        openConfirmDialog(t("ui.file.batchRestoreConfirm", { count: selectedPaths.size }), "confirm", async () => {
            setLoading(true);
            const selectedNotes = notes.filter(n => selectedPaths.has(n.pathHash));
            const total = selectedNotes.length;

            try {
                for (let i = 0; i < selectedNotes.length; i++) {
                    setBatchRestoreProgress({ current: i + 1, total });
                    await Promise.race([
                        new Promise<void>((resolve) => {
                            handleRestoreNote(vault, selectedNotes[i].path, selectedNotes[i].pathHash, resolve);
                        }),
                        new Promise<void>((resolve) => setTimeout(resolve, 30000)),
                    ]);
                }
            } finally {
                setBatchRestoreProgress(null);
                setSelectedPaths(new Set());
                fetchNotes();
            }
        });
    };

    const onBatchPermanentDelete = () => {
        if (selectedPaths.size === 0) return;

        openConfirmDialog(t("ui.common.batchPermanentDeleteConfirm", { count: selectedPaths.size }), "confirm", async () => {
            setLoading(true);
            const selectedNotes = notes.filter(n => selectedPaths.has(n.pathHash));
            const total = selectedNotes.length;

            try {
                for (let i = 0; i < selectedNotes.length; i++) {
                    setBatchRestoreProgress({ current: i + 1, total });
                    await Promise.race([
                        new Promise<void>((resolve) => {
                            handlePermanentDeleteNote(vault, selectedNotes[i].path, selectedNotes[i].pathHash, resolve);
                        }),
                        new Promise<void>((resolve) => setTimeout(resolve, 30000)),
                    ]);
                }
            } finally {
                setBatchRestoreProgress(null);
                setSelectedPaths(new Set());
                fetchNotes();
            }
        });
    };

    const onClearRecycleBin = () => {
        openConfirmDialog(t("ui.note.clearRecycleConfirm"), "confirm", () => {
            handleClearNoteRecycle(vault, () => {
                fetchNotes();
            });
        });
    };

    const totalPages = Math.ceil(totalRows / pageSize);

    return (
        <div className="w-full flex flex-col space-y-4">
            {/* 工具栏 */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-1">
                {/* 左侧：仓库选择 */}
                <div className="flex items-center gap-3">
                    {vaults && onVaultChange && (
                        <Select value={vault} onValueChange={onVaultChange}>
                            <SelectTrigger className="w-auto min-w-45 rounded-xl">
                                <SelectValue placeholder={t("ui.common.selectVault")} />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                                {vaults.map((v) => (
                                    <SelectItem key={v.id} value={v.vault} className="rounded-xl">
                                        {v.vault}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                    {!isRecycle && (
                        <Button
                            variant={shareFilter === 'active' ? 'default' : 'outline'}
                            size="sm"
                            className="rounded-xl text-xs h-8"
                            onClick={() => {
                                const next = shareFilter === 'active' ? null : 'active';
                                setShareFilter(next);
                                if (next) setPage(1);
                            }}
                        >
                            <Share2 className="h-3 w-3 mr-1" />
                            {t("ui.share.tabActive")} ({activeShareCount})
                        </Button>
                    )}
                </div>

                {/* 右侧：搜索和操作 */}
                <div className="flex flex-col gap-2 w-full sm:w-auto">
                    <div className="flex items-center gap-2">
                        <div className="relative flex-1 sm:w-64 group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                            <Input
                                type="text"
                                placeholder={t("ui.note.searchPlaceholder")}
                                className="pl-9 pr-14 rounded-xl"
                                value={searchKeyword}
                                onChange={(e) => setSearchKeyword(e.target.value)}
                            />
                            <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
                                {searchKeyword && (
                                    <button
                                        className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
                                        onClick={() => setSearchKeyword("")}
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                )}
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <button className="flex items-center gap-1 px-1.5 py-1 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/80 rounded-lg transition-colors">
                                            {searchMode === "path" && <FolderSearch className="h-3.5 w-3.5" />}
                                            {searchMode === "content" && <NotepadText className="h-3.5 w-3.5" />}

                                            <ChevronDown className="h-3 w-3" />
                                        </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="rounded-xl min-w-32">
                                        <DropdownMenuItem
                                            onClick={() => setSearchMode("path")}
                                            className={`rounded-lg flex items-center justify-between ${searchMode === "path" ? "bg-accent" : ""}`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <FolderSearch className="h-4 w-4" />
                                                <span>{t("ui.note.searchPath")}</span>
                                            </div>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            onClick={() => setSearchMode("content")}
                                            className={`rounded-lg flex items-center justify-between ${searchMode === "content" ? "bg-accent" : ""}`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <NotepadText className="h-4 w-4" />
                                                <span>{t("ui.note.searchContentMode")}</span>
                                            </div>
                                        </DropdownMenuItem>

                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </div>
                        <Button
                            variant="outline"
                            size="icon"
                            aria-label={t("ui.common.refresh")}
                            onClick={() => fetchNotes()}
                            disabled={loading}
                            className="rounded-xl shrink-0"
                        >
                            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                        </Button>
                        {!isRecycle && (
                            <Button onClick={onCreateNote} className="rounded-xl shrink-0">
                                <Plus className="h-4 w-4 sm:mr-2" />
                                <span className="hidden sm:inline">{t("ui.note.newNote")}</span>
                            </Button>
                        )}
                    </div>

                </div>
            </div>

            {/* 第二行工具栏：平铺/目录切换 (非回收站模式) */}
            {!isRecycle && (
                <div className="flex flex-wrap items-center gap-4 py-2 px-2 bg-muted/30 rounded-xl border border-border/50">
                    {!shareFilter && (
                        <div className="flex items-center gap-3">
                            <div className="flex items-center h-8 rounded-lg border border-border overflow-hidden bg-background shadow-sm">
                                <button
                                    className={`px-4 h-full text-xs font-medium transition-colors ${viewMode === 'folder' ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                                    onClick={() => {
                                        setSearchKeyword("");
                                        setDebouncedKeyword("");
                                        setViewMode("folder");
                                    }}
                                >
                                    {t("ui.note.viewFolder")}
                                </button>
                                <button
                                    className={`px-4 h-full text-xs font-medium transition-colors border-l border-border ${viewMode === 'flat' ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                                    onClick={() => setViewMode("flat")}
                                >
                                    {t("ui.note.viewFlat")}
                                </button>
                            </div>
                            <span className="text-sm font-medium text-muted-foreground mr-2">
                                {totalRows} {t("ui.note.note")}
                            </span>
                        </div>
                    )}

                    {/* 排序选择 */}
                    <div className="flex items-center h-8 rounded-xl border border-border overflow-hidden bg-background shadow-sm ml-auto">
                        <button
                            className={`px-3 h-full text-xs flex items-center gap-1.5 transition-colors ${sortBy === "mtime" ? "bg-accent text-accent-foreground" : "hover:bg-muted"}`}
                            onClick={() => setSortBy("mtime")}
                        >
                            <Clock className="h-3.5 w-3.5" />
                            {t("ui.note.sortByMtime")}
                        </button>
                        <button
                            className={`px-3 h-full text-xs flex items-center gap-1.5 transition-colors border-l border-border ${sortBy === "ctime" ? "bg-accent text-accent-foreground" : "hover:bg-muted"}`}
                            onClick={() => setSortBy("ctime")}
                        >
                            <Calendar className="h-3.5 w-3.5" />
                            {t("ui.note.sortByCtime")}
                        </button>
                        <button
                            className={`px-3 h-full text-xs flex items-center gap-1.5 transition-colors border-l border-border ${sortBy === "path" ? "bg-accent text-accent-foreground" : "hover:bg-muted"}`}
                            onClick={() => setSortBy("path")}
                        >
                            <NotepadText className="h-3.5 w-3.5" />
                            {t("ui.note.sortByPath")}
                        </button>
                        <Tooltip content={sortOrder === "desc" ? t("ui.note.sortDesc") : t("ui.note.sortAsc")} side="top" delay={200}>
                            <button
                                className={`px-2.5 h-full text-xs flex items-center transition-colors border-l border-border hover:bg-muted`}
                                onClick={() => setSortOrder(sortOrder === "desc" ? "asc" : "desc")}
                            >
                                {sortOrder === "desc" ? (
                                    <SortDesc className="h-3.5 w-3.5" />
                                ) : (
                                    <SortAsc className="h-3.5 w-3.5" />
                                )}
                            </button>
                        </Tooltip>
                    </div>
                </div>
            )}

            {/* 第二行工具栏：仅在回收站模式下显示 */}
            {isRecycle && (
                <div className="flex flex-wrap items-center gap-2 sm:gap-4 py-2 px-2 bg-muted/30 rounded-xl border border-border/50">
                    <div className="flex items-center gap-3">
                        {/* 页面切换开关 */}
                        <div className="flex items-center h-8 rounded-lg border border-border overflow-hidden bg-background shadow-sm">
                            <button
                                className={`px-4 h-full text-xs font-medium transition-colors ${trashType === 'notes' ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                                onClick={() => setModule("trash", "notes")}
                            >
                                {t("ui.note.note")}
                            </button>
                            <button
                                className={`px-4 h-full text-xs font-medium transition-colors border-l border-border ${trashType === 'files' ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                                onClick={() => setModule("trash", "files")}
                            >
                                {t("ui.file.file")}
                            </button>
                        </div>

                        {/* 数量统计 */}
                        <span className="text-sm font-medium text-muted-foreground mr-2">
                            {totalRows} {t("ui.nav.menuTrash")}{t("ui.note.note")}
                        </span>
                        {notes.length > 0 && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={onClearRecycleBin}
                                className="h-8 rounded-lg text-destructive hover:bg-destructive/10 hover:text-destructive"
                            >
                                <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                                {t("ui.common.clear")}
                            </Button>
                        )}
                    </div>


                    {/* 批量操作控制 */}
                    {notes.length > 0 && (
                        <div className="flex items-center gap-3 pl-0 sm:pl-4 border-l-0 sm:border-l border-border/60">
                            <div className="flex items-center gap-2">
                                <Checkbox
                                    id="select-all"
                                    checked={selectedPaths.size === notes.length && notes.length > 0}
                                    onCheckedChange={toggleSelectAll}
                                    className="rounded-md"
                                />
                                <label htmlFor="select-all" className="text-xs font-medium cursor-pointer text-muted-foreground hover:text-foreground transition-colors">
                                    {t("ui.common.selectAll")}
                                </label>
                            </div>

                            {selectedPaths.size > 0 && (
                                <div className="flex items-center gap-3 animate-in fade-in slide-in-from-left-2 duration-200">
                                    <span className="text-xs text-primary font-semibold bg-primary/10 px-2 py-0.5 rounded-full">
                                        {t("ui.file.selectedCount", { count: selectedPaths.size })}
                                    </span>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={onBatchRestore}
                                        className="h-8 rounded-lg text-green-600 border-green-200 hover:bg-green-50 hover:text-green-700 hover:border-green-300 shadow-sm"
                                    >
                                        <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                                        {t("ui.file.batchRestore")}
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={onBatchPermanentDelete}
                                        className="h-8 rounded-lg text-destructive border-destructive/20 hover:bg-destructive/5 hover:text-destructive hover:border-destructive/40 shadow-sm"
                                    >
                                        <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                                        {t("ui.common.batchPermanentDelete")}
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* 排序选择 */}
                    <div className="flex items-center h-8 rounded-xl border border-border overflow-hidden bg-background shadow-sm ml-auto">
                        <button
                            className={`px-3 h-full text-xs flex items-center gap-1.5 transition-colors ${sortBy === "mtime" ? "bg-accent text-accent-foreground" : "hover:bg-muted"}`}
                            onClick={() => setSortBy("mtime")}
                        >
                            <Clock className="h-3.5 w-3.5" />
                            {t("ui.note.sortByMtime")}
                        </button>
                        <button
                            className={`px-3 h-full text-xs flex items-center gap-1.5 transition-colors border-l border-border ${sortBy === "ctime" ? "bg-accent text-accent-foreground" : "hover:bg-muted"}`}
                            onClick={() => setSortBy("ctime")}
                        >
                            <Calendar className="h-3.5 w-3.5" />
                            {t("ui.note.sortByCtime")}
                        </button>
                        <button
                            className={`px-3 h-full text-xs flex items-center gap-1.5 transition-colors border-l border-border ${sortBy === "path" ? "bg-accent text-accent-foreground" : "hover:bg-muted"}`}
                            onClick={() => setSortBy("path")}
                        >
                            <NotepadText className="h-3.5 w-3.5" />
                            {t("ui.note.sortByPath")}
                        </button>
                        <Tooltip content={sortOrder === "desc" ? t("ui.note.sortDesc") : t("ui.note.sortAsc")} side="top" delay={200}>
                            <button
                                className={`px-2.5 h-full text-xs flex items-center transition-colors border-l border-border hover:bg-muted`}
                                onClick={() => setSortOrder(sortOrder === "desc" ? "asc" : "desc")}
                            >
                                {sortOrder === "desc" ? (
                                    <SortDesc className="h-3.5 w-3.5" />
                                ) : (
                                    <SortAsc className="h-3.5 w-3.5" />
                                )}
                            </button>
                        </Tooltip>
                    </div>
                </div>
            )}

            {/* 启用拖拽上下文包裹面包屑导航与列表 */}
            {/* Enable Drag & Drop context wrapping breadcrumbs and lists */}
            <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
                {/* 面包屑导航 - 仅在目录模式且无分享筛选时显示 */}
                {/* Breadcrumbs navigation - only displayed in folder mode without active share filter */}
                {viewMode === "folder" && !isRecycle && currentPath && !shareFilter && (
                    <div 
                        // 面包屑容器使用 py-2 提供变大安全区域，使用 mb-4 拉开下部间距，并使用 z-30 提供层级保护
                        // Breadcrumbs wrapper uses py-2 for scale breathing room, mb-4 for visual gap, and z-30 for layout layering
                        className="flex items-center gap-2 px-1.5 py-2 mb-4 text-sm text-muted-foreground overflow-x-auto whitespace-nowrap scrollbar-hide relative z-30"
                    >
                        {/* 笔记库根目录，包装为 Droppable 容器以接受拖放移动到根目录 */}
                        {/* Vault root folder, wrapped as a droppable container to accept dropping to move to root */}
                        <DroppableBreadcrumbButton path="" className="flex items-center gap-1">
                            <button
                                className="hover:text-primary transition-colors flex items-center gap-1 text-xs sm:text-sm"
                                onClick={() => {
                                    setCurrentPath("");
                                    setCurrentPathHash("");
                                    setPage(1);
                                }}
                            >
                                <Library className="h-4 w-4 shrink-0 mr-1" />
                                <span>{vault}</span>
                            </button>
                        </DroppableBreadcrumbButton>
                        {currentPath.split("/").filter(Boolean).map((part, index, arr) => (
                            <React.Fragment key={`breadcrumb-${index}`}>
                                <ChevronRight className="h-4 w-4 shrink-0" />
                                {index === arr.length - 1 ? (
                                    /* 最后一级为当前文件夹目录，采用对应的 px-2 py-0.5 以确保与前几级节点基线和高度绝对对齐 */
                                    /* The last level is the current folder directory. Adopt matching px-2 py-0.5 to keep baseline and heights strictly aligned */
                                    <span className="px-2 py-0.5 text-foreground font-medium text-xs sm:text-sm select-none">
                                        {part}
                                    </span>
                                ) : (
                                    /* 上级子目录，包装为 Droppable 容器以接受拖动移动到该目录下 */
                                    /* Parent subfolders, wrapped as a droppable container to accept dropping to move under this folder */
                                    <DroppableBreadcrumbButton path={arr.slice(0, index + 1).join("/")}>
                                        <button
                                            className="hover:text-primary transition-colors flex items-center text-xs sm:text-sm"
                                            onClick={() => {
                                                const path = arr.slice(0, index + 1).join("/");
                                                setCurrentPath(path);
                                                setCurrentPathHash(pathHashMap[path] || "");
                                                setPage(1);
                                            }}
                                        >
                                            {part}
                                        </button>
                                    </DroppableBreadcrumbButton>
                                )}
                            </React.Fragment>
                        ))}
                    </div>
                )}

                {/* 笔记及目录列表 */}
                {loading ? (
                    <div className="rounded-xl border border-border bg-card p-12 text-center text-muted-foreground">
                        <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                        {batchRestoreProgress
                            ? `${batchRestoreProgress.current} / ${batchRestoreProgress.total}`
                            : t("ui.common.loading")}
                    </div>
                ) : (!Array.isArray(notes) || notes.length === 0) && (!Array.isArray(folders) || folders.length === 0 || viewMode === "flat") ? (
                    <div className="rounded-xl border border-border bg-card p-12 text-center text-muted-foreground">
                        {t("ui.note.noNotes")}
                    </div>
                ) : (
                    <div 
                        // 为下方内容容器显式添加 relative z-10，配合上方 z-30 面包屑进行完美物理隔离
                        // Explicitly add relative z-10 for the content list container, isolating it from the z-30 breadcrumbs
                        className="-mx-2 px-2 relative z-10"
                    >
                        <div className="grid grid-cols-1 gap-3 py-1">
                            {/* 目录列表 */}
                            {viewMode === "folder" && !isRecycle && folders.map((folder) => (
                                <DroppableFolderCard key={`folder-droppable-${folder.pathHash}`} folder={folder}>
                                    <article
                                        className="rounded-xl border border-border bg-card p-4 cursor-pointer transition-all duration-200 hover:shadow-md hover:border-primary/30"
                                        onClick={() => {
                                            setPathHashMap({ ...pathHashMap, [folder.path]: folder.pathHash });
                                            setCurrentPath(folder.path);
                                            setCurrentPathHash(folder.pathHash);
                                            setPage(1);
                                        }}
                                    >
                                        <div className="flex items-center justify-between gap-4">
                                            <div className="flex items-start gap-3 min-w-0 flex-1">
                                                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500 shrink-0">
                                                    <FolderIcon className="h-5 w-5 fill-current opacity-70" />
                                                </span>
                                                <div className="min-w-0 flex-1">
                                                    <h3 className="font-semibold text-card-foreground truncate">
                                                        {folder.path.split("/").pop()}
                                                    </h3>
                                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-xs text-muted-foreground">
                                                        <Tooltip content={t("ui.common.createdAt")} side="top" delay={300}>
                                                            <span className="hidden sm:flex items-center gap-1">
                                                                <Calendar className="h-3.5 w-3.5" />
                                                                {format(new Date(folder.ctime), "yyyy-MM-dd HH:mm")}
                                                            </span>
                                                        </Tooltip>
                                                        <Tooltip content={t("ui.common.updatedAt")} side="top" delay={300}>
                                                            <span className="flex items-center gap-1">
                                                                <Clock className="h-3.5 w-3.5" />
                                                                {format(new Date(folder.mtime), "yyyy-MM-dd HH:mm")}
                                                            </span>
                                                        </Tooltip>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="shrink-0">
                                                <ChevronRight className="h-5 w-5 text-muted-foreground" />
                                            </div>
                                        </div>
                                    </article>
                                </DroppableFolderCard>
                            ))}

                            {/* 笔记列表 */}
                            {/* Note list */}
                            {Array.isArray(notes) && notes.map((note) => {
                                const noteIsShared = !isRecycle && activeSharePaths.has(note.path);
                                const cardContent = (
                                    <article
                                        key={`note-${note.pathHash}`}
                                        className="rounded-xl border border-border bg-card p-2.5 sm:p-4 cursor-pointer transition-all duration-200 hover:shadow-md hover:border-primary/30 w-full"
                                        onClick={() => onSelectNote(note, true)}
                                    >
                                        <div className="flex items-center justify-between gap-2 sm:gap-4">
                                            {/* 左侧：图标和内容 */}
                                            {/* Left: Icon and content */}
                                            <div className="flex items-start gap-3 min-w-0 flex-1">
                                                {isRecycle && (
                                                    <div
                                                        className="flex items-center self-center"
                                                        onClick={(e) => toggleSelect(e, note.pathHash)}
                                                    >
                                                        <Checkbox
                                                            checked={selectedPaths.has(note.pathHash)}
                                                            className="rounded-md"
                                                        />
                                                    </div>
                                                )}
                                                <span className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
                                                    <NotepadText className="h-4 w-4 sm:h-5 sm:w-5" />
                                                </span>
                                                <div className="min-w-0 flex-1">
                                                    <h3 className="font-semibold text-card-foreground truncate flex items-center gap-1">
                                                        <span className="truncate">{(viewMode === "folder" && !isRecycle && !shareFilter ? note.path.split("/").pop() : note.path)?.replace(/\.md$/, "")}</span>
                                                        {noteIsShared && (
                                                            <Share2 className="h-3 w-3 text-green-500 shrink-0" />
                                                        )}
                                                    </h3>
                                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-xs text-muted-foreground">
                                                        <Tooltip content={t("ui.common.createdAt")} side="top" delay={300}>
                                                            <span className="hidden sm:flex items-center gap-1">
                                                                <Calendar className="h-3.5 w-3.5" />
                                                                {format(new Date(note.ctime), "yyyy-MM-dd HH:mm")}
                                                            </span>
                                                        </Tooltip>
                                                        <Tooltip content={t("ui.common.updatedAt")} side="top" delay={300}>
                                                            <span className="flex items-center gap-1">
                                                                <Clock className="h-3.5 w-3.5" />
                                                                <span className="sm:hidden">{format(new Date(note.mtime), "MM-dd HH:mm")}</span>
                                                                <span className="hidden sm:inline">{format(new Date(note.mtime), "yyyy-MM-dd HH:mm")}</span>
                                                            </span>
                                                        </Tooltip>
                                                        {note.version > 0 && (
                                                            <Tooltip content={t("ui.history.title")} side="top" delay={300}>
                                                                <span className="flex items-center gap-1">
                                                                    <History className="h-3.5 w-3.5" />
                                                                    v{note.version}
                                                                </span>
                                                            </Tooltip>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* 右侧：操作按钮 */}
                                            {/* Right: Actions */}
                                            <div className="flex items-center gap-1 shrink-0">
                                                <Tooltip content={t("ui.note.viewNote")} side="top" delay={200}>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7 sm:h-8 sm:w-8 rounded-xl text-muted-foreground hover:text-primary"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onSelectNote(note, true);
                                                        }}
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
                                                </Tooltip>
                                                <Tooltip content={t("ui.note.editNote")} side="top" delay={200}>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="hidden sm:inline-flex h-7 w-7 sm:h-8 sm:w-8 rounded-xl text-muted-foreground hover:text-blue-600"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onSelectNote(note, false);
                                                        }}
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                </Tooltip>
                                                <Tooltip content={t("ui.history.title")} side="top" delay={200}>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="hidden sm:inline-flex h-7 w-7 sm:h-8 sm:w-8 rounded-xl text-muted-foreground hover:text-purple-600"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onViewHistory(note);
                                                        }}
                                                    >
                                                        <History className="h-4 w-4" />
                                                    </Button>
                                                </Tooltip>
                                                {!isRecycle && (
                                                    <Tooltip content={t("ui.common.rename")} side="top" delay={200}>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-7 w-7 sm:h-8 sm:w-8 rounded-xl text-muted-foreground hover:text-blue-500"
                                                            onClick={(e) => onRename(e, note)}
                                                        >
                                                            <TextCursorInput className="h-4 w-4" />
                                                        </Button>
                                                    </Tooltip>
                                                )}
                                                {!isRecycle && (
                                                    <Tooltip content={t("ui.share.title")} side="top" delay={200}>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className={`h-7 w-7 sm:h-8 sm:w-8 rounded-xl ${noteIsShared ? "text-green-600 hover:text-green-700 bg-green-500/10" : "text-muted-foreground hover:text-primary"}`}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setSelectedShareNote(note);
                                                                setShareModalOpen(true);
                                                            }}
                                                        >
                                                            <Share2 className="h-4 w-4" />
                                                        </Button>
                                                    </Tooltip>
                                                )}
                                                {!isRecycle && (
                                                    <Tooltip content={t("ui.common.delete")} side="top" delay={200}>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-7 w-7 sm:h-8 sm:w-8 rounded-xl text-muted-foreground hover:text-destructive"
                                                            onClick={(e) => onDelete(e, note)}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </Tooltip>
                                                )}
                                                {isRecycle && (
                                                    <>
                                                        <Tooltip content={t("ui.common.restore")} side="top" delay={200}>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-7 w-7 sm:h-8 sm:w-8 rounded-xl text-muted-foreground hover:text-green-600"
                                                                onClick={(e) => onRestore(e, note)}
                                                            >
                                                                <RotateCcw className="h-4 w-4" />
                                                            </Button>
                                                        </Tooltip>
                                                        <Tooltip content={t("ui.common.permanentDelete")} side="top" delay={200}>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 rounded-xl text-muted-foreground hover:text-destructive"
                                                                onClick={(e) => onPermanentDelete(e, note)}
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </Tooltip>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </article>
                                );

                                return isRecycle ? (
                                    <React.Fragment key={`note-${note.pathHash}`}>
                                        {cardContent}
                                    </React.Fragment>
                                ) : (
                                    <DraggableNoteCard key={`note-draggable-${note.pathHash}`} note={note}>
                                        {cardContent}
                                    </DraggableNoteCard>
                                );
                            })}
                        </div>
                    </div>
                )}
            </DndContext>

            {/* 分页控制 */}
            {notes.length > 0 && (
                <div className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-4 pt-2 shrink-0">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{t("ui.common.of")} {totalRows} {t("ui.note.results")}</span>
                        <Select value={pageSize.toString()} onValueChange={(val) => {
                            const newSize = parseInt(val);
                            setPageSize(newSize);
                            setPage(1);
                        }}>
                            <SelectTrigger className="h-8 w-25 rounded-xl">
                                <SelectValue placeholder={pageSize.toString()} />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                                {[10, 20, 50, 100].map((size) => (
                                    <SelectItem key={size} value={size.toString()} className="rounded-xl">
                                        {size} {t("ui.common.perPage")}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePageChange(page - 1)}
                            disabled={page === 1 || loading}
                            className="rounded-xl"
                        >
                            <ChevronLeft className="h-4 w-4" />
                            {t("ui.common.previous")}
                        </Button>
                        <span className="text-sm font-medium px-2">
                            {page} / {totalPages}
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePageChange(page + 1)}
                            disabled={page === totalPages || loading}
                            className="rounded-xl"
                        >
                            {t("ui.common.next")}
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}

            {selectedShareNote && (
                <ShareModal
                    vault={vault}
                    path={selectedShareNote.path}
                    pathHash={selectedShareNote.pathHash}
                    open={shareModalOpen}
                    onOpenChange={setShareModalOpen}
                    onShareChange={refreshShareItems}
                />
            )}
        </div>
    );
}
