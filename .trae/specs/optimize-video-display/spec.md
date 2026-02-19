# 视频播放器显示优化 Spec

## Why
当前视频播放页面存在显示模式切换功能，增加了用户操作复杂度。同时视频在播放区域的显示范围存在不适配问题，影响观看体验。需要简化功能并优化视频显示适配。

## What Changes
- 移除视频播放页面顶部的显示模式切换按钮（cover/contain 切换）
- 移除 `videoFit` 状态管理及相关逻辑
- 优化 VideoPlayer 组件的视频显示适配逻辑，采用智能适配策略
- **BREAKING** 移除 `videoFit` prop（不再需要外部控制显示模式）

## Impact
- Affected specs: 视频播放功能
- Affected code: 
  - `src/pages/VideoPlayer/index.tsx` - 移除 videoFit 状态和切换按钮
  - `src/components/VideoPlayer.tsx` - 移除 videoFit prop，优化视频显示

## ADDED Requirements

### Requirement: 智能视频显示适配
系统 SHALL 自动根据视频和容器尺寸比例智能选择最佳显示模式，无需用户手动切换。

#### Scenario: 视频宽高比与容器匹配
- **WHEN** 视频宽高比与播放容器宽高比接近（差异小于10%）
- **THEN** 使用 contain 模式完整显示视频内容

#### Scenario: 视频宽高比与容器差异较大
- **WHEN** 视频宽高比与播放容器宽高比差异较大
- **THEN** 自动计算最佳显示方式，优先保证视频内容完整可见

### Requirement: 视频容器响应式适配
系统 SHALL 确保视频播放区域在不同窗口尺寸下正确适配。

#### Scenario: 窗口尺寸变化
- **WHEN** 用户调整浏览器窗口大小
- **THEN** 视频播放区域自动调整并保持正确的显示比例

#### Scenario: 全屏模式切换
- **WHEN** 用户进入或退出全屏模式
- **THEN** 视频显示自动适配新的容器尺寸

## REMOVED Requirements

### Requirement: 手动显示模式切换
**Reason**: 简化用户操作，采用自动智能适配替代手动切换
**Migration**: 移除切换按钮，系统自动处理显示适配
