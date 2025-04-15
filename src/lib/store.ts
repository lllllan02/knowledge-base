'use client';
import { create } from 'zustand';
import { Note, Folder, Attachment } from './db/database';
import { noteOperations, folderOperations, attachmentOperations, wikilinkOperations } from './db/operations';
import { extractWikilinks } from '@/utils/helpers';

interface KnowledgeBaseState {
  // 当前选中的笔记
  currentNote: Note | null;
  // 当前选中的文件夹
  currentFolder: Folder | null;
  // 所有笔记
  notes: Note[];
  // 所有文件夹
  folders: Folder[];
  // 笔记是否修改过但未保存
  isNoteDirty: boolean;
  // 搜索查询
  searchQuery: string;
  // 标签过滤器
  tagFilter: string | null;
  // 是否正在加载数据
  isLoading: boolean;

  // 附件相关
  currentAttachments: Attachment[];
  isLoadingAttachments: boolean;

  // 双向链接相关
  backlinks: Note[];
  isLoadingBacklinks: boolean;
  linkedNotes: Map<string, Note[]>;

  // 操作方法
  setCurrentNote: (note: Note | null) => void;
  setCurrentFolder: (folder: Folder | null) => void;
  setNotes: (notes: Note[]) => void;
  setFolders: (folders: Folder[]) => void;
  setNoteDirty: (isDirty: boolean) => void;
  setSearchQuery: (query: string) => void;
  setTagFilter: (tag: string | null) => void;

  // 加载数据
  loadNotes: () => Promise<void>;
  loadFolders: () => Promise<void>;
  loadNotesByFolder: (folderId: number | null) => Promise<void>;
  searchNotes: (query: string) => Promise<void>;
  filterNotesByTag: (tag: string) => Promise<void>;

  // 笔记操作
  createNote: (note: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>) => Promise<number>;
  updateNote: (id: number, noteData: Partial<Omit<Note, 'id' | 'createdAt'>>) => Promise<void>;
  deleteNote: (id: number) => Promise<void>;

  // 文件夹操作
  createFolder: (folder: Omit<Folder, 'id' | 'createdAt'>) => Promise<number>;
  updateFolder: (id: number, name: string) => Promise<void>;
  deleteFolder: (id: number) => Promise<void>;

  // 附件操作
  loadAttachments: (noteId: number) => Promise<void>;
  uploadAttachment: (noteId: number, file: File) => Promise<number | null>;
  deleteAttachment: (id: number) => Promise<void>;

  // 双向链接操作
  loadBacklinks: (noteId: number) => Promise<void>;
  findLinkedNote: (title: string) => Promise<Note | null>;
}

export const useStore = create<KnowledgeBaseState>((set, get) => ({
  currentNote: null,
  currentFolder: null,
  notes: [],
  folders: [],
  isNoteDirty: false,
  searchQuery: '',
  tagFilter: null,
  isLoading: false,

  currentAttachments: [],
  isLoadingAttachments: false,

  backlinks: [],
  isLoadingBacklinks: false,
  linkedNotes: new Map(),

  setCurrentNote: (note) => {
    set({ currentNote: note });
    
    if (note?.id) {
      get().loadBacklinks(note.id);
      
      if (note.content) {
        const wikilinks = extractWikilinks(note.content);
        for (const link of wikilinks) {
          get().findLinkedNote(link);
        }
      }
    } else {
      set({ backlinks: [] });
    }
  },
  setCurrentFolder: (folder) => set({ currentFolder: folder }),
  setNotes: (notes) => set({ notes }),
  setFolders: (folders) => set({ folders }),
  setNoteDirty: (isDirty) => set({ isNoteDirty: isDirty }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setTagFilter: (tag) => set({ tagFilter: tag }),

  loadNotes: async () => {
    try {
      set({ isLoading: true });
      const notes = await noteOperations.getAllNotes();
      set({ notes, isLoading: false });
    } catch (error) {
      console.error('加载笔记失败:', error);
      set({ isLoading: false });
    }
  },

  loadFolders: async () => {
    try {
      set({ isLoading: true });
      const folders = await folderOperations.getAllFolders();
      set({ folders, isLoading: false });
    } catch (error) {
      console.error('加载文件夹失败:', error);
      set({ isLoading: false });
    }
  },

  loadNotesByFolder: async (folderId) => {
    try {
      set({ isLoading: true });
      const notes = await noteOperations.getNotesByFolder(folderId);
      set({ notes, isLoading: false });
    } catch (error) {
      console.error('按文件夹加载笔记失败:', error);
      set({ isLoading: false });
    }
  },

  searchNotes: async (query) => {
    if (!query.trim()) {
      await get().loadNotes();
      return;
    }
    
    try {
      set({ isLoading: true });
      const notes = await noteOperations.searchNotes(query);
      set({ notes, searchQuery: query, isLoading: false });
    } catch (error) {
      console.error('搜索笔记失败:', error);
      set({ isLoading: false });
    }
  },

  filterNotesByTag: async (tag) => {
    if (!tag) {
      await get().loadNotes();
      set({ tagFilter: null });
      return;
    }
    
    try {
      set({ isLoading: true });
      const notes = await noteOperations.getNotesByTag(tag);
      set({ notes, tagFilter: tag, isLoading: false });
    } catch (error) {
      console.error('按标签过滤笔记失败:', error);
      set({ isLoading: false });
    }
  },

  createNote: async (note) => {
    try {
      set({ isLoading: true });
      const id = await noteOperations.createNote(note);
      
      // 只获取创建的笔记，而不是重新加载所有笔记
      const createdNote = await noteOperations.getNoteById(id);
      if (createdNote) {
        set((state) => ({ 
          notes: [createdNote, ...state.notes],
          currentNote: createdNote,
          isLoading: false
        }));
      }
      
      return id;
    } catch (error) {
      console.error('创建笔记失败:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  updateNote: async (id, noteData) => {
    try {
      await noteOperations.updateNote(id, noteData);
      
      // 更新当前笔记和笔记列表中的笔记
      const updatedNote = await noteOperations.getNoteById(id);
      if (updatedNote) {
        set((state) => ({ 
          currentNote: state.currentNote?.id === id ? updatedNote : state.currentNote,
          notes: state.notes.map(note => note.id === id ? updatedNote : note),
          isNoteDirty: false
        }));
        
        // 如果更新了内容，则重新加载反向链接
        if (noteData.content && updatedNote.id) {
          await get().loadBacklinks(updatedNote.id);
          
          // 提取并预加载所有双向链接对应的笔记
          if (updatedNote.content) {
            const wikilinks = extractWikilinks(updatedNote.content);
            for (const link of wikilinks) {
              await get().findLinkedNote(link);
            }
          }
        }
      }
    } catch (error) {
      console.error('更新笔记失败:', error);
      throw error;
    }
  },

  deleteNote: async (id) => {
    try {
      set({ isLoading: true });
      await noteOperations.deleteNote(id);
      
      // 从当前状态中删除笔记，而不是重新加载所有笔记
      set((state) => ({ 
        notes: state.notes.filter(note => note.id !== id),
        currentNote: state.currentNote?.id === id ? null : state.currentNote,
        isLoading: false
      }));
    } catch (error) {
      console.error('删除笔记失败:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  createFolder: async (folder) => {
    try {
      set({ isLoading: true });
      const id = await folderOperations.createFolder(folder);
      
      // 只获取创建的文件夹，而不是重新加载所有文件夹
      const createdFolder = await folderOperations.getFolderById(id);
      if (createdFolder) {
        set((state) => ({ 
          folders: [...state.folders, createdFolder],
          isLoading: false
        }));
      }
      
      return id;
    } catch (error) {
      console.error('创建文件夹失败:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  updateFolder: async (id, name) => {
    try {
      await folderOperations.updateFolder(id, name);
      
      // 更新当前文件夹和文件夹列表中的文件夹，而不是重新加载所有文件夹
      const updatedFolder = await folderOperations.getFolderById(id);
      if (updatedFolder) {
        set((state) => ({ 
          currentFolder: state.currentFolder?.id === id ? updatedFolder : state.currentFolder,
          folders: state.folders.map(folder => folder.id === id ? updatedFolder : folder)
        }));
      }
    } catch (error) {
      console.error('更新文件夹失败:', error);
      throw error;
    }
  },

  deleteFolder: async (id) => {
    try {
      set({ isLoading: true });
      await folderOperations.deleteFolder(id);
      
      // 从当前状态中删除文件夹和相关笔记，而不是重新加载所有内容
      set((state) => ({ 
        folders: state.folders.filter(folder => folder.id !== id),
        notes: state.currentFolder?.id === id ? [] : state.notes,
        currentFolder: state.currentFolder?.id === id ? null : state.currentFolder,
        isLoading: false
      }));
      
      // 如果当前没有选择文件夹，重新加载所有笔记
      if (!get().currentFolder) {
        await get().loadNotes();
      }
    } catch (error) {
      console.error('删除文件夹失败:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  // 附件操作
  loadAttachments: async (noteId: number) => {
    try {
      set({ isLoadingAttachments: true });
      const attachments = await attachmentOperations.getAttachmentsByNote(noteId);
      set({ currentAttachments: attachments, isLoadingAttachments: false });
    } catch (error) {
      console.error('加载附件失败:', error);
      set({ isLoadingAttachments: false });
    }
  },
  
  uploadAttachment: async (noteId: number, file: File) => {
    try {
      set({ isLoading: true });
      const newAttachmentId = await attachmentOperations.createAttachment({
        noteId,
        name: file.name,
        type: file.type,
        data: file
      });
      
      // 获取新添加的附件
      const newAttachment = await attachmentOperations.getAttachmentById(newAttachmentId);
      if (newAttachment) {
        set((state) => ({ 
          currentAttachments: [...state.currentAttachments, newAttachment],
          isLoading: false 
        }));
      }
      
      return newAttachmentId;
    } catch (error) {
      console.error('上传附件失败:', error);
      set({ isLoading: false });
      return null;
    }
  },
  
  deleteAttachment: async (id: number) => {
    try {
      set({ isLoading: true });
      await attachmentOperations.deleteAttachment(id);
      
      // 从当前状态中删除附件
      set((state) => ({ 
        currentAttachments: state.currentAttachments.filter(att => att.id !== id),
        isLoading: false
      }));
    } catch (error) {
      console.error('删除附件失败:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  // 加载反向链接（引用了当前笔记的笔记）
  loadBacklinks: async (noteId: number) => {
    try {
      set({ isLoadingBacklinks: true });
      const backlinks = await wikilinkOperations.findBacklinks(noteId);
      set({ backlinks, isLoadingBacklinks: false });
    } catch (error) {
      console.error('加载反向链接失败:', error);
      set({ isLoadingBacklinks: false });
    }
  },
  
  // 查找与标题匹配的笔记（用于显示双向链接）
  findLinkedNote: async (title: string) => {
    try {
      // 先检查缓存中是否已有该标题对应的笔记
      const { linkedNotes } = get();
      if (!linkedNotes.has(title)) {
        const matchedNotes = await wikilinkOperations.findNotesByTitle(title);
        // 更新缓存
        set((state) => ({
          linkedNotes: new Map(state.linkedNotes).set(title, matchedNotes)
        }));
      }
      
      const notesForTitle = get().linkedNotes.get(title) || [];
      // 返回最匹配的第一个笔记
      return notesForTitle.length > 0 ? notesForTitle[0] : null;
    } catch (error) {
      console.error('查找链接笔记失败:', error);
      return null;
    }
  },
})); 