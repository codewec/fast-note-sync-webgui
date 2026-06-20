import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MermaidBlock } from "./mermaid-block";

// Mock mermaid 库
vi.mock("mermaid", () => ({
    default: {
        initialize: vi.fn(),
        render: vi.fn().mockResolvedValue({
            svg: '<svg width="100" height="100"><rect width="100" height="100" fill="blue"/></svg>',
        }),
    },
}));

// Mock 主题上下文
vi.mock("@/components/context/theme-context", () => ({
    useTheme: () => ({ resolvedTheme: "light" }),
}));

// Mock 全屏模态框
vi.mock("./mermaid-fullscreen-modal", () => ({
    MermaidFullscreenModal: ({ open }: { open: boolean }) =>
        open ? <div data-testid="fullscreen-modal">Fullscreen Modal</div> : null,
}));

// Mock lucide-react 图标
vi.mock("lucide-react", () => ({
    Maximize2: () => <span data-testid="maximize-icon" />,
}));

describe("MermaidBlock", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("渲染 Mermaid 图表", async () => {
        const mermaid = await import("mermaid");

        render(<MermaidBlock code="graph TD; A-->B" />);

        await waitFor(() => {
            expect(mermaid.default.render).toHaveBeenCalled();
        });

        expect(screen.getByText("全屏查看")).toBeInTheDocument();
    });

    it("渲染错误时显示错误信息", async () => {
        const mermaid = await import("mermaid");
        (mermaid.default.render as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
            new Error("语法错误")
        );

        render(<MermaidBlock code="invalid code" />);

        await waitFor(() => {
            expect(screen.getByText(/Mermaid 渲染错误/)).toBeInTheDocument();
        });

        expect(screen.getByText("语法错误")).toBeInTheDocument();
    });

    it("悬停时显示全屏按钮", async () => {
        render(<MermaidBlock code="graph TD; A-->B" />);

        await waitFor(() => {
            expect(screen.getByText("全屏查看")).toBeInTheDocument();
        });

        const button = screen.getByText("全屏查看");
        expect(button).toBeInTheDocument();
    });

    it("使用正确的主题初始化 mermaid", async () => {
        const mermaid = await import("mermaid");

        render(<MermaidBlock code="graph TD; A-->B" />);

        await waitFor(() => {
            expect(mermaid.default.initialize).toHaveBeenCalledWith(
                expect.objectContaining({
                    startOnLoad: false,
                    theme: "default",
                    securityLevel: "strict",
                })
            );
        });
    });
});
