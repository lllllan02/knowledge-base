import Dexie, { Table } from 'dexie';

// 定义笔记实体类型
export interface Note {
  id?: number;
  title: string;
  content: string;
  tags: string[];
  folderId: number | null;
  createdAt: Date;
  updatedAt: Date;
}

// 定义文件夹实体类型
export interface Folder {
  id?: number;
  name: string;
  parentId: number | null;
  createdAt: Date;
}

// 定义附件实体类型
export interface Attachment {
  id?: number;
  noteId: number;
  name: string;
  type: string;
  data: Blob;
  createdAt: Date;
}

// 定义知识库数据库
class KnowledgeBaseDatabase extends Dexie {
  notes!: Table<Note, number>;
  folders!: Table<Folder, number>;
  attachments!: Table<Attachment, number>;

  constructor() {
    super('KnowledgeBaseDatabase');
    this.version(1).stores({
      notes: '++id, title, folderId, *tags, createdAt, updatedAt',
      folders: '++id, name, parentId, createdAt',
      attachments: '++id, noteId, name, type, createdAt'
    });
  }
}

export const db = new KnowledgeBaseDatabase();

// 创建默认文件夹
export async function initDatabase() {
  const folderCount = await db.folders.count();
  if (folderCount === 0) {
    await db.folders.add({
      name: '默认笔记本',
      parentId: null,
      createdAt: new Date()
    });
  }
} 