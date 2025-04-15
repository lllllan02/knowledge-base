'use client';

import { useState, useEffect } from 'react';
import { useStore } from '@/lib/store';
import { Note } from '@/lib/db/database';

interface WikilinkRendererProps {
  linkText: string;
}

export default function WikilinkRenderer({ linkText }: WikilinkRendererProps) {
  const { findLinkedNote, setCurrentNote } = useStore();
  const [linkedNote, setLinkedNote] = useState<Note | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const fetchLinkedNote = async () => {
      setIsLoading(true);
      try {
        const note = await findLinkedNote(linkText);
        setLinkedNote(note);
      } catch (error) {
        console.error('加载链接笔记失败:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchLinkedNote();
  }, [linkText, findLinkedNote]);
  
  const handleLinkClick = () => {
    if (linkedNote) {
      setCurrentNote(linkedNote);
    }
  };
  
  if (isLoading) {
    return <span className="inline-block px-1 bg-gray-100 rounded">[[{linkText}]]</span>;
  }
  
  if (!linkedNote) {
    // 链接到不存在的笔记，显示为虚线样式
    return (
      <span 
        className="inline-block px-1 text-gray-500 border-b border-dashed border-gray-500 cursor-pointer hover:bg-gray-100"
        title={`创建笔记: ${linkText}`}
      >
        [[{linkText}]]
      </span>
    );
  }
  
  // 链接到存在的笔记，显示为实线样式
  return (
    <span 
      className="inline-block px-1 text-blue-600 border-b border-blue-400 cursor-pointer hover:bg-blue-50"
      onClick={handleLinkClick}
      title={`打开笔记: ${linkedNote.title}`}
    >
      {linkText}
    </span>
  );
} 