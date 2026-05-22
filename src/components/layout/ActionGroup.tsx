import { ColorSchemeSwitcher } from "./ColorSchemeSwitcher";
import { LanguageSwitcher } from "./language-switcher";
import { ThemeSwitcher } from "./theme-switcher";
import { cn } from "@/lib/utils";


interface ActionGroupProps {
  /** 额外的 CSS 类名 */
  className?: string
}

/**
 * ActionGroup - 操作按钮组
 *
 * 包含常用操作按钮：
 * - 主题选择 (下拉菜单：浅色 / 深色 / 跟随系统 / 自动)
 * - 配色方案切换 (palette icon)
 * - 语言切换 (languages icon)
 * - 使用 ghost variant 按钮
 * - 统一的 gap-1 间距
 */
export function ActionGroup({ className }: ActionGroupProps) {
  return (
    <div className={cn("flex items-center gap-1", className)}>
      {/* Theme Switcher */}
      <ThemeSwitcher />

      {/* Color Scheme Switcher */}
      <ColorSchemeSwitcher className="size-9" />

      {/* Language Switcher */}
      <LanguageSwitcher className="size-9" />
    </div>
  )
}
