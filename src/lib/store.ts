import { create } from 'zustand';
import { Note, Folder } from './db/database';
import { noteOperations, folderOperations } from './db/operations';

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

  setCurrentNote: (note) => set({ currentNote: note }),
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
      
      // 更新当前笔记和笔记列表中的笔记，而不是重新加载所有笔记
      const updatedNote = await noteOperations.getNoteById(id);
      if (updatedNote) {
        set((state) => ({ 
          currentNote: state.currentNote?.id === id ? updatedNote : state.currentNote,
          notes: state.notes.map(note => note.id === id ? updatedNote : note),
          isNoteDirty: false
        }));
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
})); 