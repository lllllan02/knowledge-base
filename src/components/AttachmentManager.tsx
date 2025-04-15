'use client';

import { useState, useRef, useEffect } from 'react';
import { useStore } from '@/lib/store';
import { FaFile, FaImage, FaFileUpload, FaTrash, FaDownload, FaLink } from 'react-icons/fa';
import { Attachment } from '@/lib/db/database';

// 允许的文件类型
const ALLOWED_FILE_TYPES = {
  images: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
  documents: ['application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  all: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
};

// 附件显示组件
const AttachmentItem = ({ attachment, onDelete, onInsert }: { 
  attachment: Attachment, 
  onDelete: (id: number) => void,
  onInsert?: (attachment: Attachment) => void 
}) => {
  const [url, setUrl] = useState<string>('');
  
  useEffect(() => {
    if (attachment.data) {
      const objectUrl = URL.createObjectURL(attachment.data);
      setUrl(objectUrl);
      
      return () => {
        URL.revokeObjectURL(objectUrl);
      };
    }
  }, [attachment.data]);
  
  const isImage = ALLOWED_FILE_TYPES.images.includes(attachment.type);

  const downloadAttachment = () => {
    if (url) {
      const a = document.createElement('a');
      a.href = url;
      a.download = attachment.name; 
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };
  
  return (
    <div className="flex items-center p-2 border rounded mb-2 bg-white">
      <div className="flex-shrink-0 mr-2">
        {isImage ? <FaImage className="text-blue-500" /> : <FaFile className="text-gray-500" />}
      </div>
      
      <div className="flex-grow overflow-hidden">
        <p className="text-sm truncate">{attachment.name}</p>
        <p className="text-xs text-gray-500">{(attachment.data.size / 1024).toFixed(1)} KB</p>
      </div>
      
      <div className="flex space-x-2">
        {onInsert && (
          <button 
            onClick={() => onInsert(attachment)}
            className="text-green-500 p-1"
            title="插入到笔记"
          >
            <FaLink />
          </button>
        )}
        
        <button 
          onClick={downloadAttachment}
          className="text-blue-500 p-1"
          title="下载附件"
        >
          <FaDownload />
        </button>
        
        <button 
          onClick={() => attachment.id && onDelete(attachment.id)}
          className="text-red-500 p-1"
          title="删除附件"
        >
          <FaTrash />
        </button>
      </div>
    </div>
  );
};

// 图片预览组件
const ImagePreview = ({ attachment }: { attachment: Attachment }) => {
  const [url, setUrl] = useState<string>('');
  
  useEffect(() => {
    if (attachment.data) {
      const objectUrl = URL.createObjectURL(attachment.data);
      setUrl(objectUrl);
      
      return () => {
        URL.revokeObjectURL(objectUrl);
      };
    }
  }, [attachment.data]);
  
  if (!url) return null;
  
  return (
    <div className="my-2">
      <img src={url} alt={attachment.name} className="max-w-full max-h-48 rounded" />
    </div>
  );
};

export default function AttachmentManager({ onInsertAttachment }: { onInsertAttachment?: (attachment: Attachment) => void }) {
  const { 
    currentNote,
    currentAttachments,
    isLoadingAttachments,
    loadAttachments,
    uploadAttachment,
    deleteAttachment
  } = useStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // 当前笔记变化时加载附件
  useEffect(() => {
    if (currentNote?.id) {
      loadAttachments(currentNote.id);
    }
  }, [currentNote?.id, loadAttachments]);
  
  // 处理文件上传
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!currentNote?.id || !event.target.files || event.target.files.length === 0) return;
    
    try {
      const file = event.target.files[0];
      
      // 检查文件类型
      if (!ALLOWED_FILE_TYPES.all.includes(file.type)) {
        alert('不支持的文件类型');
        return;
      }
      
      // 添加附件到数据库
      await uploadAttachment(currentNote.id, file);
      
      // 重置文件输入
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('上传附件失败:', error);
    }
  };
  
  // 删除附件
  const handleDeleteAttachment = async (id: number) => {
    try {
      await deleteAttachment(id);
    } catch (error) {
      console.error('删除附件失败:', error);
    }
  };
  
  if (!currentNote) {
    return null;
  }
  
  return (
    <div className="border-t border-gray-200 bg-gray-50 p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-medium">附件</h3>
        
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          className="hidden"
        />
        
        <button
          onClick={() => fileInputRef.current?.click()}
          className="bg-blue-500 text-white flex items-center px-3 py-1.5 rounded text-sm hover:bg-blue-600"
          disabled={isLoadingAttachments || !currentNote?.id}
        >
          <FaFileUpload className="mr-1" />
          上传附件
        </button>
      </div>
      
      {isLoadingAttachments ? (
        <div className="text-center py-4">
          <p className="text-gray-500">加载中...</p>
        </div>
      ) : (
        <div>
          {/* 图片预览部分 */}
          {currentAttachments.filter(att => ALLOWED_FILE_TYPES.images.includes(att.type)).length > 0 && (
            <div className="mb-3">
              <h4 className="text-xs font-medium mb-1 text-gray-500">图片</h4>
              <div className="flex flex-wrap gap-2">
                {currentAttachments
                  .filter(att => ALLOWED_FILE_TYPES.images.includes(att.type))
                  .map(attachment => (
                    <div key={attachment.id} className="relative group">
                      <ImagePreview attachment={attachment} />
                      {onInsertAttachment && (
                        <button
                          onClick={() => onInsertAttachment(attachment)}
                          className="absolute bottom-2 right-2 bg-black bg-opacity-70 text-white p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                          title="插入到笔记"
                        >
                          <FaLink size={14} />
                        </button>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          )}
          
          {/* 附件列表 */}
          <div>
            <h4 className="text-xs font-medium mb-1 text-gray-500">文件</h4>
            {currentAttachments.length === 0 ? (
              <p className="text-gray-400 text-sm">没有附件</p>
            ) : (
              <div className="space-y-2">
                {currentAttachments.map(attachment => (
                  <AttachmentItem 
                    key={attachment.id} 
                    attachment={attachment} 
                    onDelete={handleDeleteAttachment}
                    onInsert={onInsertAttachment}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 