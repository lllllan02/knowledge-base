'use client';

import { useEffect, useCallback, memo } from 'react';
import { useStore } from '@/lib/store';
import { Note } from '@/lib/db/database';
import { formatDate, truncateString } from '@/utils/helpers';
import { FaPlus, FaTrash, FaTag, FaSync } from 'react-icons/fa';

// 笔记项组件
const NoteItem = memo(({ 
  note, 
  isActive, 
  tagFilter, 
  onNoteClick, 
  onDeleteClick, 
  onTagClick 
}: { 
  note: Note, 
  isActive: boolean, 
  tagFilter: string | null, 
  onNoteClick: (note: Note) => void, 
  onDeleteClick: (e: React.MouseEvent, noteId: number) => void, 
  onTagClick: (e: React.MouseEvent, tag: string) => void 
}) => (
  <li 
    className={`
      border-b border-gray-200 p-3 cursor-pointer group
      ${isActive ? 'bg-blue-50' : 'hover:bg-gray-50'}
    `}
    onClick={() => onNoteClick(note)}
  >
    <div className="flex justify-between">
      <h3 className="font-medium">{note.title}</h3>
      <button 
        onClick={(e) => note.id && onDeleteClick(e, note.id)}
        className="text-red-500 opacity-0 group-hover:opacity-100 hover:text-red-700"
      >
        <FaTrash size={14} />
      </button>
    </div>
    
    <p className="text-sm text-gray-500 mt-1">
      {truncateString(note.content.replace(/^#.*$/m, '').trim(), 100)}
    </p>
    
    <div className="flex mt-2 justify-between items-center">
      <div className="flex flex-wrap gap-1">
        {note.tags.map((tag) => (
          <span 
            key={tag}
            className={`
              inline-flex items-center text-xs px-2 py-1 rounded-full
              ${tagFilter === tag ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}
            `}
            onClick={(e) => onTagClick(e, tag)}
          >
            <FaTag className="mr-1" size={10} />
            {tag}
          </span>
        ))}
      </div>
      <span className="text-xs text-gray-400">
        {formatDate(new Date(note.updatedAt))}
      </span>
    </div>
  </li>
));
NoteItem.displayName = 'NoteItem';

export default function NoteList() {
  const { 
    notes, 
    loadNotes, 
    currentFolder,
    currentNote,
    setCurrentNote,
    createNote,
    deleteNote,
    tagFilter,
    setTagFilter,
    isLoading
  } = useStore();
  
  // 加载笔记列表
  useEffect(() => {
    loadNotes();
  }, [loadNotes]);
  
  // 处理创建新笔记
  const handleCreateNote = useCallback(async () => {
    await createNote({
      title: '新笔记',
      content: '# 新笔记\n\n开始编写你的笔记...',
      tags: [],
      folderId: currentFolder?.id || null,
    });
  }, [createNote, currentFolder?.id]);
  
  // 处理笔记点击
  const handleNoteClick = useCallback((note: Note) => {
    setCurrentNote(note);
  }, [setCurrentNote]);
  
  // 处理笔记删除
  const handleDeleteNote = useCallback(async (e: React.MouseEvent, noteId: number) => {
    e.stopPropagation();
    
    if (window.confirm('确定要删除这个笔记吗？')) {
      await deleteNote(noteId);
    }
  }, [deleteNote]);
  
  // 处理标签点击
  const handleTagClick = useCallback((e: React.MouseEvent, tag: string) => {
    e.stopPropagation();
    
    // 如果当前已经过滤了这个标签，则清除过滤
    if (tagFilter === tag) {
      setTagFilter(null);
    } else {
      setTagFilter(tag);
    }
  }, [tagFilter, setTagFilter]);
  
  // 处理刷新笔记列表
  const handleRefresh = useCallback(() => {
    loadNotes();
  }, [loadNotes]);
  
  return (
    <div className="w-72 h-screen bg-white border-r border-gray-200 flex flex-col">
      {/* 标题与新建按钮 */}
      <div className="flex justify-between items-center p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold flex items-center">
          {currentFolder ? currentFolder.name : '所有笔记'}
          {tagFilter && <span className="ml-2 text-sm text-blue-500">#{tagFilter}</span>}
          <button 
            onClick={handleRefresh}
            className="ml-2 text-gray-400 hover:text-gray-600"
            title="刷新列表"
          >
            <FaSync size={14} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </h2>
        <button 
          onClick={handleCreateNote}
          className="text-blue-500 hover:text-blue-700"
          disabled={isLoading}
        >
          <FaPlus />
        </button>
      </div>
      
      {/* 笔记列表 */}
      <div className="overflow-y-auto flex-grow">
        {isLoading && notes.length === 0 ? (
          <div className="flex justify-center items-center h-32">
            <FaSync className="animate-spin text-gray-400" />
          </div>
        ) : notes.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            没有笔记，点击右上角的加号创建一个
          </div>
        ) : (
          <ul>
            {notes.map((note) => (
              <NoteItem 
                key={note.id}
                note={note}
                isActive={currentNote?.id === note.id}
                tagFilter={tagFilter}
                onNoteClick={handleNoteClick}
                onDeleteClick={handleDeleteNote}
                onTagClick={handleTagClick}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
} 