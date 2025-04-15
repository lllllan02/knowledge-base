'use client';

import { useState, useEffect } from 'react';
import { useStore } from '@/lib/store';
import { Folder } from '@/lib/db/database';
import { FaFolder, FaFolderOpen, FaPlus, FaSearch } from 'react-icons/fa';

export default function Sidebar() {
  const { 
    folders, 
    loadFolders, 
    createFolder, 
    setCurrentFolder,
    currentFolder,
    loadNotesByFolder,
    searchNotes,
    loadNotes,
  } = useStore();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [newFolderName, setNewFolderName] = useState('');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  
  // 加载文件夹列表
  useEffect(() => {
    loadFolders();
  }, [loadFolders]);
  
  // 处理文件夹点击事件
  const handleFolderClick = async (folder: Folder) => {
    setCurrentFolder(folder);
    await loadNotesByFolder(folder.id);
  };
  
  // 处理搜索
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      await searchNotes(searchQuery);
    } else {
      await loadNotes();
    }
  };
  
  // 创建新文件夹
  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newFolderName.trim()) {
      await createFolder({
        name: newFolderName,
        parentId: null,
      });
      
      setNewFolderName('');
      setIsCreatingFolder(false);
    }
  };
  
  return (
    <div className="w-64 h-screen bg-gray-100 p-4 border-r border-gray-200 flex flex-col">
      {/* 搜索框 */}
      <form onSubmit={handleSearch} className="mb-4">
        <div className="relative">
          <input 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索笔记..."
            className="w-full p-2 border border-gray-300 rounded pl-8"
          />
          <FaSearch className="absolute left-2 top-3 text-gray-400" />
        </div>
      </form>
      
      {/* 文件夹标题与添加按钮 */}
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-lg font-semibold">笔记本</h2>
        <button 
          onClick={() => setIsCreatingFolder(true)}
          className="text-blue-500 hover:text-blue-700"
        >
          <FaPlus />
        </button>
      </div>
      
      {/* 创建新文件夹表单 */}
      {isCreatingFolder && (
        <form onSubmit={handleCreateFolder} className="mb-2">
          <div className="flex">
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="笔记本名称"
              className="flex-grow p-1 border border-gray-300 rounded-l text-sm"
              autoFocus
            />
            <button 
              type="submit"
              className="bg-blue-500 text-white px-2 rounded-r"
            >
              保存
            </button>
          </div>
        </form>
      )}
      
      {/* 文件夹列表 */}
      <div className="overflow-y-auto flex-grow">
        <ul className="space-y-1">
          {folders.map((folder) => (
            <li 
              key={folder.id} 
              className={`
                flex items-center p-2 rounded cursor-pointer
                ${currentFolder?.id === folder.id ? 'bg-blue-100' : 'hover:bg-gray-200'}
              `}
              onClick={() => handleFolderClick(folder)}
            >
              {currentFolder?.id === folder.id ? 
                <FaFolderOpen className="mr-2 text-blue-500" /> : 
                <FaFolder className="mr-2 text-gray-500" />
              }
              <span>{folder.name}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
} 