'use client';

import { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import NoteList from '@/components/NoteList';
import NoteEditor from '@/components/NoteEditor';
import KnowledgeGraph from '@/components/KnowledgeGraph';
import { initDatabase } from '@/lib/db/database';
import { FaProjectDiagram, FaCog } from 'react-icons/fa';
import Link from 'next/link';

export default function Home() {
  const [isDbInitialized, setIsDbInitialized] = useState(false);
  const [showGraph, setShowGraph] = useState(false);
  
  // 初始化数据库
  useEffect(() => {
    const init = async () => {
      await initDatabase();
      setIsDbInitialized(true);
    };
    
    init();
  }, []);
  
  if (!isDbInitialized) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-gray-500">正在初始化知识库...</p>
      </div>
    );
  }
  
  return (
    <main className="flex h-screen">
      {/* 侧边栏 */}
      <Sidebar />
      
      {/* 笔记列表 */}
      <NoteList />
      
      {/* 笔记编辑器 */}
      <div className="flex-grow relative">
        <NoteEditor />
        
        {/* 工具栏 */}
        <div className="absolute bottom-4 right-4 flex space-x-2">
          <button
            onClick={() => setShowGraph(true)}
            className="bg-indigo-500 text-white p-3 rounded-full shadow hover:bg-indigo-600"
            title="知识图谱"
          >
            <FaProjectDiagram />
          </button>
          
          <Link href="/settings">
            <button
              className="bg-gray-500 text-white p-3 rounded-full shadow hover:bg-gray-600"
              title="设置"
            >
              <FaCog />
            </button>
          </Link>
        </div>
      </div>
      
      {/* 知识图谱 */}
      {showGraph && <KnowledgeGraph onClose={() => setShowGraph(false)} />}
    </main>
  );
}
