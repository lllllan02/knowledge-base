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
 * 从文本内容中提取标题
 */
export function extractTitleFromContent(content: string): string {
  // 尝试从Markdown标题中提取
  const titleMatch = content.match(/^#\s+(.+)$/m);
  if (titleMatch && titleMatch[1]) {
    return titleMatch[1].trim();
  }
  
  // 尝试从第一行非空内容中提取
  const firstLineMatch = content.match(/^(.+)$/m);
  if (firstLineMatch && firstLineMatch[1]) {
    return firstLineMatch[1].trim();
  }
  
  return '无标题笔记';
}

/**
 * 从文本内容中提取可能的标签
 */
export function extractTagsFromContent(content: string): string[] {
  const tagRegex = /#([a-zA-Z0-9\u4e00-\u9fa5_-]+)/g;
  const matches = content.match(tagRegex) || [];
  
  // 去掉#前缀并去重
  return [...new Set(matches.map(tag => tag.substring(1)))];
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
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  
  return function(...args: Parameters<T>) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
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
 * 将相对路径转换为绝对路径
 */
export function toAbsolutePath(path: string, basePath: string): string {
  if (path.startsWith('/')) return path;
  return `${basePath.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
} 