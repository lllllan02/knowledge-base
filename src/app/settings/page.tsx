'use client';

import { useState } from 'react';
import Link from 'next/link';
import { FaArrowLeft, FaSave } from 'react-icons/fa';

export default function Settings() {
  const [theme, setTheme] = useState('light');
  const [autoSave, setAutoSave] = useState(true);
  const [editorFontSize, setEditorFontSize] = useState('14');
  
  // 保存设置（未实现）
  const handleSaveSettings = () => {
    // 这里可以将设置保存到LocalStorage或数据库
    alert('设置已保存');
  };
  
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">设置</h1>
          <Link href="/">
            <button className="flex items-center text-blue-500 hover:text-blue-700">
              <FaArrowLeft className="mr-1" /> 返回
            </button>
          </Link>
        </div>
        
        <div className="space-y-6">
          {/* 外观设置 */}
          <div>
            <h2 className="text-xl font-semibold mb-3 pb-2 border-b">外观设置</h2>
            <div className="space-y-4">
              <div>
                <label className="block mb-2 font-medium">主题</label>
                <select
                  value={theme}
                  onChange={(e) => setTheme(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded"
                >
                  <option value="light">浅色</option>
                  <option value="dark">深色</option>
                  <option value="system">跟随系统</option>
                </select>
              </div>
              
              <div>
                <label className="block mb-2 font-medium">编辑器字体大小</label>
                <select
                  value={editorFontSize}
                  onChange={(e) => setEditorFontSize(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded"
                >
                  <option value="12">12px</option>
                  <option value="14">14px</option>
                  <option value="16">16px</option>
                  <option value="18">18px</option>
                  <option value="20">20px</option>
                </select>
              </div>
            </div>
          </div>
          
          {/* 编辑器设置 */}
          <div>
            <h2 className="text-xl font-semibold mb-3 pb-2 border-b">编辑器设置</h2>
            <div className="space-y-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="autoSave"
                  checked={autoSave}
                  onChange={(e) => setAutoSave(e.target.checked)}
                  className="mr-2"
                />
                <label htmlFor="autoSave" className="font-medium">启用自动保存</label>
              </div>
            </div>
          </div>
          
          {/* 数据管理 */}
          <div>
            <h2 className="text-xl font-semibold mb-3 pb-2 border-b">数据管理</h2>
            <div className="space-y-4">
              <div>
                <button className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
                  导出所有数据
                </button>
              </div>
              
              <div>
                <button className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600">
                  导入数据
                </button>
              </div>
              
              <div>
                <button className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600">
                  清空所有数据
                </button>
              </div>
            </div>
          </div>
          
          {/* 关于 */}
          <div>
            <h2 className="text-xl font-semibold mb-3 pb-2 border-b">关于</h2>
            <p>个人知识库 v1.0.0</p>
            <p className="mt-2 text-gray-600">这是一个帮助你组织、存储和检索个人知识的系统。</p>
          </div>
        </div>
        
        <div className="mt-8 flex justify-end">
          <button
            onClick={handleSaveSettings}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 flex items-center"
          >
            <FaSave className="mr-2" /> 保存设置
          </button>
        </div>
      </div>
    </div>
  );
} 