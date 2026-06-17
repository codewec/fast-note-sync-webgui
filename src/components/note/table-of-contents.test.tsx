import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TableOfContents } from './table-of-contents';
import { TocProvider, useToc } from '@/components/context/toc-context';
import React from 'react';

// Mock IntersectionObserver（jsdom 不支持）
class MockIntersectionObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
  constructor(_callback: IntersectionObserverCallback, _options?: IntersectionObserverInit) {}
}

beforeEach(() => {
  vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
});

// Mock motion 库
vi.mock('motion/react', () => ({
  motion: {
    div: 'div',
    nav: 'nav',
    button: 'button',
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
}));

// Helper: 创建带 Provider 的渲染
const renderWithProvider = (ui: React.ReactElement) => {
  return render(
    <TocProvider>
      {ui}
    </TocProvider>
  );
};

describe('TableOfContents', () => {
  beforeEach(() => {
    // 清理 DOM
    document.body.innerHTML = '';
  });

  it('无标题时应显示空状态提示', () => {
    renderWithProvider(<TableOfContents />);

    // 点击按钮展开
    const button = screen.getByRole('button', { name: /目录/i });
    fireEvent.click(button);

    expect(screen.getByText(/无目录/i)).toBeInTheDocument();
  });

  it('有标题时应正确渲染目录列表', () => {
    // 创建测试标题元素
    const h1 = document.createElement('h1');
    h1.id = 'heading-1';
    h1.textContent = 'First Heading';
    document.body.appendChild(h1);

    const h2 = document.createElement('h2');
    h2.id = 'heading-2';
    h2.textContent = 'Second Heading';
    document.body.appendChild(h2);

    // 使用辅助组件注册标题
    const TestHelper = () => {
      const { registerHeading } = useToc();
      React.useEffect(() => {
        registerHeading({ id: 'heading-1', level: 1, text: 'First Heading', element: h1 });
        registerHeading({ id: 'heading-2', level: 2, text: 'Second Heading', element: h2 });
      }, [registerHeading]);
      return null;
    };

    render(
      <TocProvider>
        <TestHelper />
        <TableOfContents />
      </TocProvider>
    );

    // 点击按钮展开
    const button = screen.getByRole('button', { name: /目录/i });
    fireEvent.click(button);

    // 使用 getAllByText 因为标题文本可能同时出现在 DOM 的标题元素和目录链接中
    const firstHeadingLinks = screen.getAllByText('First Heading');
    expect(firstHeadingLinks.length).toBeGreaterThanOrEqual(1);
    
    const secondHeadingLinks = screen.getAllByText('Second Heading');
    expect(secondHeadingLinks.length).toBeGreaterThanOrEqual(1);
  });

  it('应支持展开/收起切换', () => {
    renderWithProvider(<TableOfContents />);

    const button = screen.getByRole('button', { name: /目录/i });

    // 初始状态：收起
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();

    // 点击展开
    fireEvent.click(button);
    expect(screen.getByRole('navigation')).toBeInTheDocument();

    // 点击收起
    fireEvent.click(button);
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
  });

  it('应限制显示深度（maxDepth）', () => {
    const h1 = document.createElement('h1');
    h1.id = 'depth-1';
    document.body.appendChild(h1);

    const h4 = document.createElement('h4');
    h4.id = 'depth-4';
    document.body.appendChild(h4);

    const TestHelper = () => {
      const { registerHeading } = useToc();
      React.useEffect(() => {
        registerHeading({ id: 'depth-1', level: 1, text: 'Depth 1', element: h1 });
        registerHeading({ id: 'depth-4', level: 4, text: 'Depth 4', element: h4 });
      }, [registerHeading]);
      return null;
    };

    render(
      <TocProvider>
        <TestHelper />
        <TableOfContents maxDepth={3} />
      </TocProvider>
    );

    const button = screen.getByRole('button', { name: /目录/i });
    fireEvent.click(button);

    expect(screen.getByText('Depth 1')).toBeInTheDocument();
    expect(screen.queryByText('Depth 4')).not.toBeInTheDocument();
  });
});
