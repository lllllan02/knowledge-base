'use client';

import { useEffect, useState, useCallback, memo, useRef } from 'react';
import { useStore } from '@/lib/store';
import Editor, { useMonaco } from '@monaco-editor/react';
import { extractTitleFromContent, extractTagsFromContent, debounce } from '@/utils/helpers';
import { FaSave, FaEye, FaEdit, FaTags, FaPaperclip, FaLink } from 'react-icons/fa';
import 'highlight.js/styles/github.css';
import AttachmentManager from './AttachmentManager';
import { Attachment } from '@/lib/db/database';
import MarkdownProcessor from './MarkdownProcessor';
import BacklinksPanel from './BacklinksPanel';

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

// 使用memo优化Markdown预览性能
const MarkdownPreview = memo(({ content }: { content: string }) => (
  <div className="prose max-w-none p-4 overflow-auto h-full">
    <MarkdownProcessor content={content} />
  </div>
));
MarkdownPreview.displayName = 'MarkdownPreview';

export default function NoteEditor() {
  const { 
    currentNote, 
    updateNote, 
    isNoteDirty, 
    setNoteDirty,
    isLoading,
    notes,
    backlinks
  } = useStore();
  
  const [content, setContent] = useState('');
  const [isPreview, setIsPreview] = useState(false);
  const [isShowingTags, setIsShowingTags] = useState(false);
  const [isShowingAttachments, setIsShowingAttachments] = useState(false);
  const [showWikilinkSelector, setShowWikilinkSelector] = useState(false);
  const [wikilinkSearch, setWikilinkSearch] = useState('');
  const [filteredNotes, setFilteredNotes] = useState<typeof notes>([]);
  const [cursorPosition, setCursorPosition] = useState<{ lineNumber: number, column: number } | null>(null);
  
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
      
      // 添加双向链接的语法高亮
      monaco.languages.registerCompletionItemProvider('markdown', {
        provideCompletionItems: (model, position) => {
          const textUntilPosition = model.getValueInRange({
            startLineNumber: position.lineNumber,
            startColumn: 1,
            endLineNumber: position.lineNumber,
            endColumn: position.column,
          });
          
          // 当用户输入 [[ 时触发补全
          if (textUntilPosition.endsWith('[[')) {
            return {
              suggestions: [
                {
                  label: '笔记链接',
                  kind: monaco.languages.CompletionItemKind.Snippet,
                  insertText: '${1:笔记标题}]]',
                  insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                  documentation: '插入到另一篇笔记的链接',
                },
              ],
            };
          }
          
          return { suggestions: [] };
        },
      });
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
    
    // 监听光标位置变化
    editor.onDidChangeCursorPosition((e: any) => {
      setCursorPosition({
        lineNumber: e.position.lineNumber,
        column: e.position.column
      });
    });
    
    // 添加快捷键：Ctrl+/ 触发双向链接选择器
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Slash, () => {
      setShowWikilinkSelector(true);
    });
  }, [monaco]);
  
  // 处理双向链接搜索
  useEffect(() => {
    if (showWikilinkSelector && wikilinkSearch) {
      const search = wikilinkSearch.toLowerCase();
      const filtered = notes
        .filter(note => note.title.toLowerCase().includes(search))
        .slice(0, 10); // 限制结果数量
      setFilteredNotes(filtered);
    } else {
      setFilteredNotes([]);
    }
  }, [notes, wikilinkSearch, showWikilinkSelector]);
  
  // 插入双向链接
  const insertWikilink = useCallback((noteTitle: string) => {
    if (!editorRef.current || !cursorPosition) return;
    
    const markdownText = `[[${noteTitle}]]`;
    
    // 获取编辑器实例
    const editor = editorRef.current;
    const position = {
      lineNumber: cursorPosition.lineNumber,
      column: cursorPosition.column
    };
    
    const range = {
      startLineNumber: position.lineNumber,
      startColumn: position.column,
      endLineNumber: position.lineNumber,
      endColumn: position.column
    };
    
    // 在当前光标位置插入链接
    editor.executeEdits("wikilink-insert", [{
      range,
      text: markdownText,
      forceMoveMarkers: true
    }]);
    
    // 关闭选择器
    setShowWikilinkSelector(false);
    setWikilinkSearch('');
    
    // 聚焦回编辑器
    editor.focus();
  }, [cursorPosition]);
  
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
          {!isPreview && (
            <button
              onClick={() => setShowWikilinkSelector(true)}
              className="p-2 rounded hover:bg-gray-100"
              title="插入笔记链接 (Ctrl+/)"
            >
              <FaLink />
            </button>
          )}
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
          <div className="relative h-full">
            <MonacoEditor 
              content={content} 
              onChange={handleEditorChange}
              onEditorMount={handleEditorMount}
            />
            
            {/* 双向链接选择器 */}
            {showWikilinkSelector && (
              <div className="absolute top-1/4 left-1/2 transform -translate-x-1/2 bg-white shadow-xl rounded-lg border border-gray-200 w-80 z-10">
                <div className="p-3 border-b border-gray-200">
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="搜索笔记..."
                    value={wikilinkSearch}
                    onChange={(e) => setWikilinkSearch(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {filteredNotes.length > 0 ? (
                    <ul className="divide-y divide-gray-100">
                      {filteredNotes.map((note) => (
                        <li
                          key={note.id}
                          className="p-2 hover:bg-blue-50 cursor-pointer"
                          onClick={() => insertWikilink(note.title)}
                        >
                          {note.title}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="p-4 text-center text-gray-500">
                      {wikilinkSearch ? "没有找到匹配的笔记" : "输入关键词搜索笔记"}
                    </div>
                  )}
                </div>
                <div className="p-3 border-t border-gray-200 text-right">
                  <button
                    className="text-sm text-gray-500 hover:text-gray-700"
                    onClick={() => {
                      setShowWikilinkSelector(false);
                      setWikilinkSearch('');
                    }}
                  >
                    关闭
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* 反向链接面板 */}
      {backlinks.length > 0 && (
        <BacklinksPanel />
      )}
      
      {/* 附件管理区域 */}
      {isShowingAttachments && (
        <AttachmentManager onInsertAttachment={insertAttachmentLink} />
      )}
    </div>
  );
} 