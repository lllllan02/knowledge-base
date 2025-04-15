'use client';

import { useState, useEffect } from 'react';
import { useStore } from '@/lib/store';
import { attachmentOperations } from '@/lib/db/operations';

// 自定义图片渲染组件，支持附件图片
export const CustomImageRenderer = ({ src, alt }: { src: string, alt?: string }) => {
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