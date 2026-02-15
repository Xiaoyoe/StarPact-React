# Electron 存储系统修复 - 产品需求文档

## Overview
- **Summary**: 修复 Electron 应用启动时因存储 API 未定义导致的页面无法加载问题，包括 preload 脚本配置错误、存储相关 IPC 处理器缺失等问题
- **Purpose**: 确保 Electron 应用能够正常启动并访问存储功能，提高应用的稳定性和可靠性
- **Target Users**: Electron 应用的开发者和最终用户

## Goals
- 修复 preload 脚本配置错误，确保 electronAPI 正确暴露给渲染进程
- 实现存储相关的 IPC 处理器，确保 storage API 能够正常工作
- 增强前端代码的错误处理能力，避免因 API 未定义导致的应用崩溃
- 提高应用启动的稳定性和可靠性

## Non-Goals (Out of Scope)
- 重构整个存储系统架构
- 修改存储系统的核心功能逻辑
- 添加新的存储功能特性

## Background & Context
- 当前应用启动时会检查存储路径配置，但 electronAPI.storage 对象在某些情况下不存在
- 当 storage API 未定义时，调用 checkAllPaths() 方法会报错，导致应用无法启动
- preload 脚本路径和模块语法配置有误，导致 electronAPI 没有正确暴露给渲染进程
- 主进程中缺少存储相关的 IPC 处理器注册

## Functional Requirements
- **FR-1**: 修复 preload 脚本配置，确保 electronAPI 正确暴露给渲染进程
- **FR-2**: 实现存储相关的 IPC 处理器，包括 getModulePath、saveModulePath、checkAllPaths 和 migrateModuleData
- **FR-3**: 增强前端代码的错误处理能力，避免因 API 未定义导致的应用崩溃
- **FR-4**: 确保应用能够正常启动并访问存储功能

## Non-Functional Requirements
- **NFR-1**: 应用启动时间不超过 3 秒
- **NFR-2**: 存储 API 调用响应时间不超过 500ms
- **NFR-3**: 应用稳定性提高，避免因 API 未定义导致的崩溃
- **NFR-4**: 代码可维护性提高，遵循 Electron 最佳实践

## Constraints
- **Technical**: 必须使用 Electron 提供的 contextBridge 和 ipcRenderer 进行进程间通信
- **Technical**: 必须使用 CommonJS 模块语法编写 preload 脚本
- **Technical**: 必须确保主进程和渲染进程之间的通信安全

## Assumptions
- 应用使用 Electron 框架进行开发
- 存储系统使用文件系统进行数据持久化
- 前端代码使用 React 框架进行开发

## Acceptance Criteria

### AC-1: Preload 脚本配置正确
- **Given**: 应用启动时
- **When**: 渲染进程加载 preload 脚本
- **Then**: electronAPI 对象正确暴露给渲染进程，包含 storage 和 dialog 属性
- **Verification**: `programmatic`

### AC-2: 存储相关 IPC 处理器正常工作
- **Given**: 渲染进程调用 storage API
- **When**: 主进程处理存储相关的 IPC 请求
- **Then**: 存储 API 调用返回正确的结果，无错误发生
- **Verification**: `programmatic`

### AC-3: 前端代码错误处理增强
- **Given**: electronAPI 或 storage API 未定义
- **When**: 前端代码尝试调用 storage API
- **Then**: 应用不会崩溃，而是优雅处理错误并继续运行
- **Verification**: `programmatic`

### AC-4: 应用启动正常
- **Given**: 应用启动时
- **When**: 应用检查存储路径配置
- **Then**: 应用能够正常启动并加载页面，无错误发生
- **Verification**: `human-judgment`

## Open Questions
- [ ] 存储路径配置的默认值是什么？
- [ ] 存储相关的 IPC 处理器需要实现哪些具体功能？
- [ ] 应用在非 Electron 环境下如何处理存储功能？