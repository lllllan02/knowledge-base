'use client';

import { memo, ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github.css';
import { WIKILINK_REGEX } from '@/utils/helpers';
import WikilinkRenderer from './WikilinkRenderer';
import { CustomImageRenderer } from './CustomComponents';

interface ProcessedTextProps {
  text: string;
}

// 处理文本中的双向链接
const ProcessedText = ({ text }: ProcessedTextProps) => {
  if (!text.includes('[[')) {
    return <>{text}</>;
  }
  
  const segments: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  
  // 重置正则表达式状态
  WIKILINK_REGEX.lastIndex = 0;
  
  while ((match = WIKILINK_REGEX.exec(text)) !== null) {
    const [fullMatch, linkText] = match;
    const index = match.index;
    
    // 添加链接前的文本
    if (index > lastIndex) {
      segments.push(text.substring(lastIndex, index));
    }
    
    // 添加链接
    segments.push(
      <WikilinkRenderer key={`link-${index}`} linkText={linkText} />
    );
    
    lastIndex = index + fullMatch.length;
  }
  
  // 添加剩余文本
  if (lastIndex < text.length) {
    segments.push(text.substring(lastIndex));
  }
  
  return <>{segments}</>;
};

interface MarkdownProcessorProps {
  content: string;
}

const MarkdownProcessor = memo(({ content }: MarkdownProcessorProps) => {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeHighlight]}
      components={{
        // 处理图片，支持附件图片
        img: ({ node, ...props }) => <CustomImageRenderer src={props.src || ''} alt={props.alt} />,
        
        // 处理段落文本，支持双向链接
        p: ({ children }) => <p><ProcessedText text={String(children)}/></p>,
        
        // 处理行内文本，支持双向链接
        span: ({ children }) => <span><ProcessedText text={String(children)}/></span>,
        
        // 处理链接文本，支持双向链接
        a: ({ children, href }) => {
          if (href?.startsWith('attachment://')) {
            return <a href={href}>{children}</a>;
          }
          return <a href={href} target="_blank" rel="noopener noreferrer">
            <ProcessedText text={String(children)}/>
          </a>;
        }
      }}
    >
      {content}
    </ReactMarkdown>
  );
});

MarkdownProcessor.displayName = 'MarkdownProcessor';

export default MarkdownProcessor; 