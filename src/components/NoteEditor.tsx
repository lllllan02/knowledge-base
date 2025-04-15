'use client';

import { useEffect, useState, useCallback, memo, useRef } from 'react';
import { useStore } from '@/lib/store';
import Editor, { useMonaco } from '@monaco-editor/react';
import { extractTitleFromContent, extractTagsFromContent, debounce } from '@/utils/helpers';
import { FaSave, FaEye, FaEdit, FaTags, FaPaperclip } from 'react-icons/fa';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github.css';
import AttachmentManager from './AttachmentManager';
import { attachmentOperations } from '@/lib/db/operations';
import { Attachment } from '@/lib/db/database';

// 自定义图片渲染组件，支持附件图片
const CustomImageRenderer = ({ src, alt }: { src: string, alt?: string }) => {
  const { currentAttachments } = useStore();
  const [imageUrl, setImageUrl] = useState<string>('');
  
  useEffect(() => {
    const loadImage = async () => {
      // 检查是否是附件链接
      if (src.startsWith('attachment://')) {
        const attachmentId = parseInt(src.replace('attachment://', ''));
        if (!isNaN(attachmentId)) {
          // 先从当前加载的附件中查找
          const attachment = currentAttachments.find(att => att.id === attachmentId);
          if (attachment && attachment.data) {
            const objectUrl = URL.createObjectURL(attachment.data);
            setImageUrl(objectUrl);
            return () => URL.revokeObjectURL(objectUrl);
          } else {
            // 如果当前附件中没有，则从数据库加载
            try {
              const attachment = await attachmentOperations.getAttachmentById(attachmentId);
              if (attachment && attachment.data) {
                const objectUrl = URL.createObjectURL(attachment.data);
                setImageUrl(objectUrl);
                return () => URL.revokeObjectURL(objectUrl);
              }
            } catch (error) {
              console.error('加载附件图片失败:', error);
              setImageUrl('');
            }
          }
        }
      } else {
        // 处理普通URL
        setImageUrl(src);
      }
    };
    
    loadImage();
    
    return () => {
      // URL.revokeObjectURL在loadImage函数返回的清理函数中处理
    };
  }, [src, currentAttachments]);
  
  if (!imageUrl) {
    return <span className="text-red-500">[图片加载失败]</span>;
  }
  
  return <img src={imageUrl} alt={alt || ''} className="max-w-full" />;
};

// 使用memo优化Markdown预览性能
const MarkdownPreview = memo(({ content }: { content: string }) => (
  <div className="prose max-w-none p-4 overflow-auto h-full">
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeHighlight]}
      components={{
        img: ({ node, ...props }) => <CustomImageRenderer src={props.src || ''} alt={props.alt} />
      }}
    >
      {content}
    </ReactMarkdown>
  </div>
));
MarkdownPreview.displayName = 'MarkdownPreview';

// 使用memo优化Monaco编辑器性能
const MonacoEditor = memo(({ content, onChange, onEditorMount }: { 
  content: string, 
  onChange: (value: string | undefined) => void,
  onEditorMount?: (editor: any) => void 
}) => (
  <Editor
    height="100%"
    defaultLanguage="markdown"
    value={content}
    onChange={onChange}
    onMount={onEditorMount}
    options={{
      minimap: { enabled: false },
      lineNumbers: 'on',
      wordWrap: 'on',
      wrappingIndent: 'same',
      fontSize: 14,
      scrollBeyondLastLine: false,
      renderLineHighlight: 'line',
      renderWhitespace: 'none',
      tabSize: 2,
      quickSuggestions: false,
      contextmenu: false,
    }}
  />
));
MonacoEditor.displayName = 'MonacoEditor';

export default function NoteEditor() {
  const { 
    currentNote, 
    updateNote, 
    isNoteDirty, 
    setNoteDirty,
    isLoading,
    currentAttachments
  } = useStore();
  
  const [content, setContent] = useState('');
  const [isPreview, setIsPreview] = useState(false);
  const [isShowingTags, setIsShowingTags] = useState(false);
  const [isShowingAttachments, setIsShowingAttachments] = useState(false);
  const monaco = useMonaco();
  const editorRef = useRef<any>(null);
  
  // 设置Monaco编辑器
  useEffect(() => {
    if (monaco) {
      // 设置编辑器主题
      monaco.editor.defineTheme('lightTheme', {
        base: 'vs',
        inherit: true,
        rules: [],
        colors: {
          'editor.background': '#ffffff',
        }
      });
      monaco.editor.setTheme('lightTheme');
    }
  }, [monaco]);
  
  // 加载当前笔记内容
  useEffect(() => {
    if (currentNote) {
      setContent(currentNote.content);
    } else {
      setContent('');
    }
    
    setNoteDirty(false);
  }, [currentNote, setNoteDirty]);
  
  // 自动保存（防抖）- 使用useCallback确保不会重复创建
  const debouncedSave = useCallback(
    debounce(async (content: string) => {
      if (currentNote?.id && content.trim()) {
        const title = extractTitleFromContent(content);
        const tags = extractTagsFromContent(content);
        
        await updateNote(currentNote.id, {
          title,
          content,
          tags,
        });
      }
    }, 1000),
    [currentNote?.id, updateNote]
  );
  
  // 处理内容变化
  const handleEditorChange = useCallback((value: string = '') => {
    setContent(value);
    setNoteDirty(true);
    debouncedSave(value);
  }, [debouncedSave, setNoteDirty]);
  
  // 手动保存笔记
  const handleSaveNote = useCallback(async () => {
    if (currentNote?.id && content.trim()) {
      const title = extractTitleFromContent(content);
      const tags = extractTagsFromContent(content);
      
      await updateNote(currentNote.id, {
        title,
        content,
        tags,
      });
    }
  }, [currentNote?.id, content, updateNote]);
  
  // 在编辑器中插入附件链接
  const insertAttachmentLink = useCallback((attachment: Attachment) => {
    if (!editorRef.current) return;
    
    const isImage = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'].includes(attachment.type);
    let markdownText = '';
    
    if (isImage) {
      markdownText = `![${attachment.name}](attachment://${attachment.id})`;
    } else {
      markdownText = `[${attachment.name}](attachment://${attachment.id})`;
    }
    
    // 获取编辑器实例
    const editor = editorRef.current;
    const selection = editor.getSelection();
    const id = { major: 1, minor: 1 };
    const op = {
      identifier: id,
      range: selection,
      text: markdownText,
      forceMoveMarkers: true
    };
    editor.executeEdits("attachment-insert", [op]);
    editor.focus();
  }, []);
  
  // 获取编辑器实例引用
  const handleEditorMount = useCallback((editor: any) => {
    editorRef.current = editor;
  }, []);
  
  // 如果没有选中笔记，显示空白
  if (!currentNote) {
    return (
      <div className="flex-grow flex items-center justify-center bg-gray-50 h-screen">
        <p className="text-gray-400">选择一个笔记或创建新笔记</p>
      </div>
    );
  }
  
  return (
    <div className="flex-grow flex flex-col h-screen">
      {/* 工具栏 */}
      <div className="flex items-center justify-between p-2 border-b border-gray-200 bg-white">
        <div className="flex space-x-2">
          <button
            onClick={() => setIsPreview(false)}
            className={`p-2 rounded ${!isPreview ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
            title="编辑模式"
          >
            <FaEdit />
          </button>
          <button
            onClick={() => setIsPreview(true)}
            className={`p-2 rounded ${isPreview ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
            title="预览模式"
          >
            <FaEye />
          </button>
          <button
            onClick={() => setIsShowingTags(!isShowingTags)}
            className={`p-2 rounded ${isShowingTags ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
            title="显示标签"
          >
            <FaTags />
          </button>
          <button
            onClick={() => setIsShowingAttachments(!isShowingAttachments)}
            className={`p-2 rounded ${isShowingAttachments ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
            title="附件管理"
          >
            <FaPaperclip />
          </button>
        </div>
        <div className="flex items-center">
          {isLoading && <span className="text-sm text-blue-500 mr-2">保存中...</span>}
          {isNoteDirty && !isLoading && <span className="text-sm text-gray-500 mr-2">未保存</span>}
          <button
            onClick={handleSaveNote}
            className="bg-blue-500 text-white px-4 py-1 rounded hover:bg-blue-600 disabled:bg-blue-300"
            disabled={!isNoteDirty || isLoading}
          >
            <FaSave className="mr-1 inline" /> 保存
          </button>
        </div>
      </div>
      
      {/* 标签显示区域 */}
      {isShowingTags && (
        <div className="p-2 bg-gray-50 border-b border-gray-200">
          <div className="flex flex-wrap gap-1">
            {currentNote.tags.map((tag) => (
              <span 
                key={tag} 
                className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full"
              >
                #{tag}
              </span>
            ))}
            {currentNote.tags.length === 0 && (
              <span className="text-gray-400 text-sm">没有标签，在笔记中使用 #标签名 添加标签</span>
            )}
          </div>
        </div>
      )}
      
      {/* 编辑区/预览区 */}
      <div className={`flex-grow overflow-auto ${isShowingAttachments ? 'flex-shrink' : ''}`}>
        {isPreview ? (
          <MarkdownPreview content={content} />
        ) : (
          <MonacoEditor 
            content={content} 
            onChange={handleEditorChange}
            onEditorMount={handleEditorMount}
          />
        )}
      </div>
      
      {/* 附件管理区域 */}
      {isShowingAttachments && (
        <AttachmentManager onInsertAttachment={insertAttachmentLink} />
      )}
    </div>
  );
} 