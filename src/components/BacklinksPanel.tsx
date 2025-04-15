'use client';

import { useState, useEffect } from 'react';
import { useStore } from '@/lib/store';
import { FaLink, FaChevronRight, FaChevronDown } from 'react-icons/fa';
import { Note } from '@/lib/db/database';

export default function BacklinksPanel() {
  const { currentNote, backlinks, isLoadingBacklinks, setCurrentNote } = useStore();
  const [isExpanded, setIsExpanded] = useState(true);
  
  // 如果没有当前笔记或反向链接，不显示面板
  if (!currentNote || (backlinks.length === 0 && !isLoadingBacklinks)) {
    return null;
  }
  
  const handleNoteClick = (note: Note) => {
    setCurrentNote(note);
  };
  
  return (
    <div className="border-t border-gray-200 bg-gray-50">
      <div className="p-2 flex justify-between items-center cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex items-center space-x-2">
          <FaLink className="text-gray-500" />
          <h3 className="text-sm font-medium">反向链接 {backlinks.length > 0 && `(${backlinks.length})`}</h3>
        </div>
        {isExpanded ? <FaChevronDown className="text-gray-500" /> : <FaChevronRight className="text-gray-500" />}
      </div>
      
      {isExpanded && (
        <div className="px-2 py-1">
          {isLoadingBacklinks ? (
            <p className="text-sm text-gray-500 p-2">加载中...</p>
          ) : backlinks.length === 0 ? (
            <p className="text-sm text-gray-500 p-2">没有引用这篇笔记的笔记</p>
          ) : (
            <ul className="space-y-1">
              {backlinks.map((note) => (
                <li 
                  key={note.id} 
                  className="text-sm border-l-2 border-blue-300 pl-2 py-1 hover:bg-blue-50 cursor-pointer"
                  onClick={() => handleNoteClick(note)}
                >
                  {note.title}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
} 