'use client';

import { useEffect, useState, useCallback } from 'react';
import { useStore } from '@/lib/store';
import dynamic from 'next/dynamic';
import { FaTimes } from 'react-icons/fa';

// 动态导入ForceGraph组件，避免SSR问题
const ForceGraph = dynamic(() => import('react-force-graph-2d'), {
  ssr: false,
  loading: () => <div className="flex-grow flex items-center justify-center">加载知识图谱...</div>
});

// 图节点类型
interface GraphNode {
  id: string;
  name: string;
  val: number;
  color: string;
  nodeType: 'note' | 'tag';
}

// 图连接类型
interface GraphLink {
  source: string;
  target: string;
}

// 图数据类型
interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

export default function KnowledgeGraph({ onClose }: { onClose: () => void }) {
  const { notes, setTagFilter, setCurrentNote } = useStore();
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });
  
  // 从笔记数据生成图数据
  useEffect(() => {
    if (notes.length === 0) return;
    
    const nodes: GraphNode[] = [];
    const links: GraphLink[] = [];
    const tagMap = new Map<string, number>(); // 标签到其在节点数组中索引的映射
    
    // 先添加所有笔记节点
    notes.forEach(note => {
      if (note.id) {
        nodes.push({
          id: `note-${note.id}`,
          name: note.title,
          val: 2,
          color: '#5c7cfa',
          nodeType: 'note'
        });
      }
    });
    
    // 添加标签节点和连接
    notes.forEach(note => {
      if (!note.id) return;
      
      note.tags.forEach(tag => {
        // 如果标签节点不存在，添加它
        if (!tagMap.has(tag)) {
          const nodeIndex = nodes.length;
          tagMap.set(tag, nodeIndex);
          nodes.push({
            id: `tag-${tag}`,
            name: `#${tag}`,
            val: 1.5,
            color: '#4dabf7',
            nodeType: 'tag'
          });
        }
        
        // 添加笔记到标签的连接
        links.push({
          source: `note-${note.id}`,
          target: `tag-${tag}`
        });
      });
    });
    
    // 找出相同标签的笔记之间的连接
    const notesWithTag = new Map<string, string[]>(); // 标签到笔记ID的映射
    
    notes.forEach(note => {
      if (!note.id) return;
      
      note.tags.forEach(tag => {
        if (!notesWithTag.has(tag)) {
          notesWithTag.set(tag, []);
        }
        notesWithTag.get(tag)?.push(`note-${note.id}`);
      });
    });
    
    // 对于每个有多于一个笔记的标签，将这些笔记连接起来
    notesWithTag.forEach((noteIds, tag) => {
      if (noteIds.length > 1) {
        for (let i = 0; i < noteIds.length; i++) {
          for (let j = i + 1; j < noteIds.length; j++) {
            // 添加连接
            links.push({
              source: noteIds[i],
              target: noteIds[j]
            });
          }
        }
      }
    });
    
    setGraphData({ nodes, links });
  }, [notes]);
  
  // 处理节点点击
  const handleNodeClick = useCallback((node: any) => {
    if (node.nodeType === 'tag') {
      // 处理标签点击 - 过滤对应标签的笔记
      const tagName = node.name.substring(1); // 去除#前缀
      setTagFilter(tagName);
      onClose();
    } else if (node.nodeType === 'note') {
      // 处理笔记点击 - 打开对应笔记
      const noteId = parseInt(node.id.split('-')[1]);
      const noteToOpen = notes.find(note => note.id === noteId);
      if (noteToOpen) {
        setCurrentNote(noteToOpen);
        onClose();
      }
    }
  }, [notes, setTagFilter, setCurrentNote, onClose]);
  
  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col">
      <div className="p-3 border-b border-gray-200 flex justify-between items-center">
        <h2 className="text-lg font-semibold">知识图谱</h2>
        <button
          onClick={onClose}
          className="p-2 rounded hover:bg-gray-100"
        >
          <FaTimes />
        </button>
      </div>
      
      <div className="flex-grow">
        {graphData.nodes.length > 0 ? (
          <ForceGraph
            graphData={graphData}
            nodeLabel="name"
            nodeColor={(node) => node.color}
            nodeVal={(node) => node.val}
            linkWidth={1}
            linkColor={() => '#cccccc'}
            cooldownTicks={100}
            nodeCanvasObject={(node, ctx, globalScale) => {
              // 绘制节点
              const label = node.name;
              const fontSize = 12/globalScale;
              ctx.font = `${fontSize}px Arial`;
              const textWidth = ctx.measureText(label).width;
              const backgroundNodeSize = textWidth + 8/globalScale;
              
              // 绘制节点背景
              ctx.fillStyle = node.color;
              ctx.beginPath();
              ctx.arc(node.x, node.y, node.val * 3, 0, 2 * Math.PI);
              ctx.fill();
              
              // 绘制节点标签
              ctx.fillStyle = 'white';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(label, node.x, node.y);
              
              // 使节点可以被点击的大小
              node.size = Math.max(node.val * 3, backgroundNodeSize/2);
            }}
            onNodeClick={handleNodeClick}
          />
        ) : (
          <div className="flex-grow flex items-center justify-center">
            <p className="text-gray-400">没有足够的数据生成知识图谱</p>
          </div>
        )}
      </div>
      
      <div className="p-3 border-t border-gray-200">
        <p className="text-sm text-gray-500">提示: 点击节点可以查看相关笔记或标签</p>
      </div>
    </div>
  );
} 