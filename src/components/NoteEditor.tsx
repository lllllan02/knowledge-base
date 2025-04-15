'use client';

import { useEffect, useState, useCallback, memo } from 'react';
import { useStore } from '@/lib/store';
import Editor, { useMonaco } from '@monaco-editor/react';
import { extractTitleFromContent, extractTagsFromContent, debounce } from '@/utils/helpers';
import { FaSave, FaEye, FaEdit, FaTags } from 'react-icons/fa';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github.css';

// 使用memo优化Markdown预览性能
const MarkdownPreview = memo(({ content }: { content: string }) => (
  <div className="prose max-w-none p-4 overflow-auto h-full">
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeHighlight]}
    >
      {content}
    </ReactMarkdown>
  </div>
));
MarkdownPreview.displayName = 'MarkdownPreview';

// 使用memo优化Monaco编辑器性能
const MonacoEditor = memo(({ content, onChange }: { content: string, onChange: (value: string | undefined) => void }) => (
  <Editor
    height="100%"
    defaultLanguage="markdown"
    value={content}
    onChange={onChange}
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
    isLoading
  } = useStore();
  
  const [content, setContent] = useState('');
  const [isPreview, setIsPreview] = useState(false);
  const [isShowingTags, setIsShowingTags] = useState(false);
  const monaco = useMonaco();
  
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
      <div className="flex-grow overflow-auto">
        {isPreview ? (
          <MarkdownPreview content={content} />
        ) : (
          <MonacoEditor content={content} onChange={handleEditorChange} />
        )}
      </div>
    </div>
  );
} 