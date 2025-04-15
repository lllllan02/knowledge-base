# 个人知识库

一个现代化的个人知识管理系统，帮助您组织、存储和检索个人知识。

## 功能特点

### 笔记管理
- Markdown 编辑器（基于 Monaco Editor）
- 富文本预览功能
- 代码语法高亮
- 自动保存功能

### 知识组织
- 笔记本/文件夹结构
- 标签系统（使用 #标签 语法）
- 知识图谱可视化

### 搜索功能
- 全文搜索
- 按标签过滤
- 按笔记本分类

### 数据存储
- 本地存储（IndexedDB）
- 无需服务器，保护隐私

## 技术栈

- 前端框架：Next.js + React + TypeScript
- UI样式：Tailwind CSS
- 编辑器：Monaco Editor
- Markdown 渲染：react-markdown
- 状态管理：Zustand
- 数据存储：Dexie.js (IndexedDB 包装器)
- 知识图谱：React Force Graph

## 快速开始

首先，安装依赖：

```bash
npm install
# 或者
yarn install
```

然后，运行开发服务器：

```bash
npm run dev
# 或者
yarn dev
```

在浏览器中打开 [http://localhost:3000](http://localhost:3000) 查看结果。

## 使用指南

### 创建笔记
1. 点击笔记列表右上角的 "+" 按钮
2. 开始编写笔记（支持 Markdown 格式）
3. 笔记会自动保存

### 组织笔记
- 使用左侧边栏创建和管理笔记本
- 在笔记中使用 #标签 添加标签
- 通过点击标签快速筛选相关笔记

### 使用知识图谱
- 点击右下角的图标打开知识图谱
- 查看笔记和标签之间的关联
- 点击节点直接跳转到相关笔记或标签

## 未来计划

- 文件附件上传功能
- 双向链接系统
- 导出为PDF或HTML
- 云端同步选项
- 版本历史记录
- 移动端适配优化

## 许可证

[MIT](https://choosealicense.com/licenses/mit/)
