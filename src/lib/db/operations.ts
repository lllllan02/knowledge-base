import { db, Note, Folder, Attachment } from './database';

// 笔记相关操作
export const noteOperations = {
  async getAllNotes(): Promise<Note[]> {
    // 限制返回的笔记数量，并按更新时间降序排序
    return db.notes.orderBy('updatedAt').reverse().toArray();
  },
  
  async getRecentNotes(limit: number = 50): Promise<Note[]> {
    // 获取最近更新的笔记，限制数量
    return db.notes.orderBy('updatedAt').reverse().limit(limit).toArray();
  },
  
  async getNotesByFolder(folderId: number | null): Promise<Note[]> {
    // 使用索引查询，然后在内存中排序
    const notes = await db.notes.where({ folderId }).toArray();
    return notes.sort((a, b) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  },
  
  async getNotesByTag(tag: string): Promise<Note[]> {
    // 使用索引查询，然后在内存中排序
    const notes = await db.notes.where('tags').equals(tag).toArray();
    return notes.sort((a, b) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  },
  
  async getNoteById(id: number): Promise<Note | undefined> {
    return db.notes.get(id);
  },
  
  async searchNotes(query: string): Promise<Note[]> {
    // 简单的全文搜索实现，后续可扩展为更复杂的搜索引擎
    query = query.toLowerCase();
    
    // 使用索引查询标题可能会更快
    const titleMatches = await db.notes
      .where('title')
      .startsWithIgnoreCase(query)
      .toArray();
    
    // 然后再进行全文搜索
    const contentMatches = await db.notes
      .filter(note => 
        !titleMatches.some(m => m.id === note.id) && // 排除已匹配的标题结果
        (note.content.toLowerCase().includes(query) ||
         note.tags.some(tag => tag.toLowerCase().includes(query)))
      )
      .toArray();
    
    // 合并结果并按更新时间排序
    return [...titleMatches, ...contentMatches].sort((a, b) => {
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  },
  
  async createNote(note: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>): Promise<number> {
    const now = new Date();
    return db.notes.add({
      ...note,
      createdAt: now,
      updatedAt: now
    });
  },
  
  async updateNote(id: number, noteData: Partial<Omit<Note, 'id' | 'createdAt'>>): Promise<number> {
    await db.notes.update(id, {
      ...noteData,
      updatedAt: new Date()
    });
    return id;
  },
  
  async deleteNote(id: number): Promise<void> {
    // 使用事务确保原子性操作
    return db.transaction('rw', [db.notes, db.attachments], async () => {
      // 删除附件
      await db.attachments.where({ noteId: id }).delete();
      // 删除笔记
      await db.notes.delete(id);
    });
  }
};

// 文件夹相关操作
export const folderOperations = {
  async getAllFolders(): Promise<Folder[]> {
    return db.folders.toArray();
  },
  
  async getFolderById(id: number): Promise<Folder | undefined> {
    return db.folders.get(id);
  },
  
  async getChildFolders(parentId: number | null): Promise<Folder[]> {
    return db.folders.where({ parentId }).toArray();
  },
  
  async createFolder(folder: Omit<Folder, 'id' | 'createdAt'>): Promise<number> {
    return db.folders.add({
      ...folder,
      createdAt: new Date()
    });
  },
  
  async updateFolder(id: number, name: string): Promise<number> {
    await db.folders.update(id, { name });
    return id;
  },
  
  async deleteFolder(id: number): Promise<void> {
    // 使用事务确保原子性操作
    return db.transaction('rw', [db.folders, db.notes, db.attachments], async () => {
      // 获取所有子文件夹
      const childFolders = await this.getChildFolders(id);
      
      // 递归删除子文件夹
      for (const folder of childFolders) {
        if (folder.id) {
          await this.deleteFolder(folder.id);
        }
      }
      
      // 获取文件夹中的笔记ID
      const notesInFolder = await db.notes.where({ folderId: id }).toArray();
      const noteIds = notesInFolder.map(note => note.id).filter(Boolean) as number[];
      
      // 批量删除笔记相关的附件
      if (noteIds.length > 0) {
        await db.attachments.where('noteId').anyOf(noteIds).delete();
      }
      
      // 删除文件夹中的所有笔记
      await db.notes.where({ folderId: id }).delete();
      
      // 删除文件夹
      await db.folders.delete(id);
    });
  }
};

// 附件相关操作
export const attachmentOperations = {
  async getAttachmentsByNote(noteId: number): Promise<Attachment[]> {
    return db.attachments.where({ noteId }).toArray();
  },
  
  async getAttachmentById(id: number): Promise<Attachment | undefined> {
    return db.attachments.get(id);
  },
  
  async createAttachment(attachment: Omit<Attachment, 'id' | 'createdAt'>): Promise<number> {
    return db.attachments.add({
      ...attachment,
      createdAt: new Date()
    });
  },
  
  async deleteAttachment(id: number): Promise<void> {
    await db.attachments.delete(id);
  }
};

// 双向链接相关操作
export const wikilinkOperations = {
  // 根据链接名称查找笔记
  async findNotesByTitle(title: string): Promise<Note[]> {
    const normalizedTitle = title.toLowerCase().trim();
    
    // 先查找标题完全匹配的笔记
    const exactMatch = await db.notes
      .where('title')
      .equalsIgnoreCase(normalizedTitle)
      .toArray();
    
    if (exactMatch.length > 0) {
      return exactMatch;
    }
    
    // 如果没有找到完全匹配的，查找包含该标题的笔记
    return db.notes
      .filter(note => note.title.toLowerCase().includes(normalizedTitle))
      .toArray();
  },
  
  // 查找引用了指定笔记的所有笔记（反向链接）
  async findBacklinks(noteId: number): Promise<Note[]> {
    // 获取当前笔记的标题
    const currentNote = await db.notes.get(noteId);
    if (!currentNote) return [];
    
    const normalizedTitle = currentNote.title.toLowerCase().trim();
    
    // 查找内容中包含 [[当前笔记标题]] 的笔记
    return db.notes
      .filter(note => 
        note.id !== noteId && 
        note.content.toLowerCase().includes(`[[${normalizedTitle}]]`)
      )
      .toArray();
  }
}; 