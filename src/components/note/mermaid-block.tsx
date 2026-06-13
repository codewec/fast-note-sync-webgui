import { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";
import { useTheme } from "@/components/context/theme-context";

// 全局基础设置，防止 mermaid 自动寻找页面上的 .mermaid 标签并初始化
mermaid.initialize({
    startOnLoad: false,
    securityLevel: "strict",
});

interface MermaidBlockProps {
    code: string;
}

export function MermaidBlock({ code }: MermaidBlockProps) {
    const { resolvedTheme } = useTheme();
    const [svgHtml, setSvgHtml] = useState<string>("");
    const [error, setError] = useState<string>("");
    const [isRendering, setIsRendering] = useState<boolean>(true);
    // 生成唯一的 ID 以防多图渲染冲突
    const idRef = useRef(`mermaid-${Math.random().toString(36).substring(2, 9)}`);

    useEffect(() => {
        let isMounted = true;
        setIsRendering(true);
        setError("");

        const renderChart = async () => {
            try {
                // 每次主题改变或重新渲染时动态配置 Mermaid 的主题
                mermaid.initialize({
                    startOnLoad: false,
                    theme: resolvedTheme === "dark" ? "dark" : "default",
                    securityLevel: "strict",
                });
                
                // 渲染 Mermaid 代码为 SVG 字符串
                const { svg } = await mermaid.render(idRef.current, code);
                
                if (isMounted) {
                    setSvgHtml(svg);
                    setError("");
                    setIsRendering(false);
                }
            } catch (err: any) {
                console.error("Mermaid render error:", err);
                if (isMounted) {
                    setError(err.message || String(err));
                    setIsRendering(false);
                }
            }
        };

        renderChart();

        return () => {
            isMounted = false;
        };
    }, [code, resolvedTheme]);

    if (error) {
        return (
            <div className="my-4 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900/30 dark:bg-red-950/20 text-red-600 dark:text-red-400">
                <p className="text-xs font-semibold mb-2">Mermaid 渲染错误 / Render Error:</p>
                <pre className="text-xs overflow-x-auto whitespace-pre-wrap font-mono">{error}</pre>
                <details className="mt-2 text-xs">
                    <summary className="cursor-pointer select-none text-muted-foreground hover:text-foreground">
                        查看原始代码 / View raw code
                    </summary>
                    <pre className="mt-2 p-2 bg-muted rounded font-mono text-[11px] overflow-x-auto text-foreground">
                        {code}
                    </pre>
                </details>
            </div>
        );
    }

    return (
        <div className="my-4 flex justify-center overflow-x-auto rounded-lg border border-border/60 bg-muted/20 p-4 relative min-h-[40px]">
            {isRendering && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10">
                    <span className="text-xs text-muted-foreground animate-pulse">Rendering diagram...</span>
                </div>
            )}
            <div 
                className="mermaid-svg-container w-full flex justify-center [&>svg]:max-w-full [&>svg]:h-auto"
                dangerouslySetInnerHTML={{ __html: svgHtml }}
            />
        </div>
    );
}
