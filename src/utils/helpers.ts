/**
 * 格式化日期为本地字符串
 */
export function formatDate(date: Date): string {
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * 从笔记内容中提取标题
 * 使用第一行作为标题，如果没有则返回"无标题笔记"
 */
export function extractTitleFromContent(content: string): string {
  if (!content.trim()) return "无标题笔记";
  
  const firstLine = content.trim().split('\n')[0];
  // 移除Markdown标记符，如#, *, _, -等
  const cleanTitle = firstLine.replace(/^[\s#\-*_]+/, '').trim();
  
  return cleanTitle || "无标题笔记";
}

/**
 * 从笔记内容中提取标签
 * 采用类似Twitter的#标签格式
 */
export function extractTagsFromContent(content: string): string[] {
  if (!content.trim()) return [];
  
  const tags: string[] = [];
  const regex = /#([a-zA-Z0-9_\u4e00-\u9fa5]+)/g;
  let match;
  
  while ((match = regex.exec(content)) !== null) {
    const tag = match[1].toLowerCase();
    if (!tags.includes(tag)) {
      tags.push(tag);
    }
  }
  
  return tags;
}

/**
 * 限制字符串长度并添加省略号
 */
export function truncateString(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength) + '...';
}

/**
 * 生成随机的唯一ID
 */
export function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

/**
 * 防抖函数
 * 确保在一系列快速调用中只有最后一次调用会被执行
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return function(...args: Parameters<T>) {
    if (timeout !== null) {
      clearTimeout(timeout);
    }
    
    timeout = setTimeout(() => {
      func(...args);
    }, wait);
  };
}

/**
 * 从文件名中获取扩展名
 */
export function getFileExtension(filename: string): string {
  return filename.slice(((filename.lastIndexOf('.') - 1) >>> 0) + 2);
}

/**
 * 判断文件类型是否为图片
 */
export function isImageFile(filename: string): boolean {
  const ext = getFileExtension(filename).toLowerCase();
  return ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'].includes(ext);
}

/**
 * 判断文件类型是否为Markdown
 */
export function isMarkdownFile(filename: string): boolean {
  const ext = getFileExtension(filename).toLowerCase();
  return ['md', 'markdown'].includes(ext);
}

/**
 * 调整相对路径为绝对路径
 */
export function resolveRelativePath(basePath: string, path: string): string {
  if (path.startsWith('/')) return path;
  return `${basePath.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
}

/**
 * 从笔记内容中提取双向链接的正则表达式
 * 匹配格式为 [[链接名称]] 的双向链接
 */
export const WIKILINK_REGEX = /\[\[([^\[\]]+?)\]\]/g;

/**
 * 从文本中提取双向链接
 * @param content 笔记内容
 * @returns 提取的双向链接数组
 */
export function extractWikilinks(content: string): string[] {
  const links: string[] = [];
  const matches = content.matchAll(WIKILINK_REGEX);
  
  for (const match of matches) {
    if (match[1] && !links.includes(match[1].trim())) {
      links.push(match[1].trim());
    }
  }
  
  return links;
}

/**
 * 格式化双向链接，转换为可用于搜索和匹配的格式
 * @param title 链接标题
 * @returns 格式化后的链接标题
 */
export function normalizeWikilinkTitle(title: string): string {
  return title.trim().toLowerCase();
} 