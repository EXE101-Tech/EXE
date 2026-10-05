import { create } from 'zustand';

export type ChatListTab = 'messages' | 'friends';

interface ChatUiState {
  activeTab: ChatListTab;
  setActiveTab: (tab: ChatListTab) => void;
}

/**
 * Remembers the chat list's selected tab across navigations. Opening a conversation and
 * pressing back replaces the list screen (see chat/[id].tsx), which remounts it and would
 * otherwise reset the tab to "Tin nhắn" even if the user had "Bạn bè" open.
 */
export const useChatUiStore = create<ChatUiState>((set) => ({
  activeTab: 'messages',
  setActiveTab: (tab) => set({ activeTab: tab }),
}));
