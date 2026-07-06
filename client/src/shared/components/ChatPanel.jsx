import { useState } from 'react';
import { MessageSquare, X, Send, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useChat } from '../context/ChatContext';

const MOCK_CONVERSATIONS = [
  {
    id: 1,
    name: 'Minh Tran',
    avatar: 'M',
    lastMessage: 'Tối nay đánh không?',
    time: '19:00',
    unread: 2,
    online: true,
  },
  {
    id: 2,
    name: 'Huy Nguyen',
    avatar: 'H',
    lastMessage: 'Ok, hẹn 7h nhé!',
    time: '18:30',
    unread: 0,
    online: true,
  },
  {
    id: 3,
    name: 'Lan Pham',
    avatar: 'L',
    lastMessage: 'Sân Proton còn slot không?',
    time: '17:45',
    unread: 1,
    online: false,
  },
  {
    id: 4,
    name: 'Duc Le',
    avatar: 'D',
    lastMessage: 'Trận hôm qua vui quá!',
    time: 'Hôm qua',
    unread: 0,
    online: false,
  },
];

function ChatPanel() {
  const { t } = useTranslation();
  const { isChatOpen, closeChat, activeChatUser, setActiveChatUser } = useChat();
  const [message, setMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div
      className={`fixed top-[108px] sm:top-[128px] bottom-6 sm:bottom-6 left-4 right-4 sm:left-auto sm:right-6 w-auto sm:w-[368px] max-w-[380px] sm:max-w-none mx-auto sm:mx-0 bg-white/95 dark:bg-[#0a192f]/95 backdrop-blur-2xl rounded-3xl border border-gray-200/80 dark:border-white/10 z-[1000] flex flex-col shadow-2xl overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        isChatOpen ? 'translate-y-0 translate-x-0 opacity-100 scale-100' : 'translate-y-8 sm:translate-y-0 translate-x-0 sm:translate-x-[120%] opacity-0 scale-95 sm:scale-100 pointer-events-none'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-black/5 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02]">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-[#74C365]/10 text-[#74C365]">
            <MessageSquare className="w-5 h-5" />
          </div>
          <h2 className="text-base font-extrabold text-gray-900 dark:text-white tracking-tight">{t('bottomNav.chat', 'Chat')}</h2>
        </div>
        <button
          onClick={closeChat}
          className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 text-gray-500 dark:text-gray-400 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Search */}
      <div className="px-4 py-3 border-b border-black/5 dark:border-white/5">
        <div className="flex items-center gap-2 bg-slate-100 dark:bg-white/[0.05] rounded-xl px-3 py-2 border border-transparent dark:border-white/5 focus-within:border-[#74C365]/50 transition-colors">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder={t('chat.search_placeholder', 'Tìm kiếm...')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent text-sm text-gray-900 dark:text-white placeholder-gray-400 outline-none w-full font-medium"
          />
        </div>
      </div>

      {/* Conversation List */}
      {!activeChatUser ? (
        <div className="flex-1 overflow-y-auto divide-y divide-gray-100 dark:divide-white/5">
          {MOCK_CONVERSATIONS.map((conv) => (
            <button
              key={conv.id}
              onClick={() => setActiveChatUser(conv)}
              className="w-full flex items-center gap-3.5 px-4 py-3.5 hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-colors text-left group"
            >
              {/* Avatar */}
              <div className="relative flex-shrink-0">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#74C365] to-[#589470] flex items-center justify-center text-white text-base font-bold shadow-md shadow-[#74C365]/20 group-hover:scale-105 transition-transform">
                  {conv.avatar}
                </div>
                {conv.online && (
                  <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-[#74C365] rounded-full border-2 border-white dark:border-[#0a192f] shadow-sm" />
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <span className="text-sm font-bold text-gray-900 dark:text-white truncate block group-hover:text-[#74C365] transition-colors">
                  {conv.name}
                </span>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5 font-medium">
                  {conv.lastMessage}
                </p>
              </div>

              {/* Thời gian + Badge */}
              <div className="flex flex-col items-end gap-1.5 flex-shrink-0 self-start pt-1">
                <span className="text-[11px] font-semibold text-gray-400">
                  {conv.time === 'Hôm qua' ? t('chat.yesterday', 'Hôm qua') : conv.time}
                </span>
                {conv.unread > 0 && (
                  <div className="min-w-[20px] h-5 px-1.5 rounded-full bg-[#74C365] flex items-center justify-center shadow-sm shadow-[#74C365]/30">
                    <span className="text-[10px] text-white font-black">{conv.unread}</span>
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      ) : (
        /* Chat Detail View */
        <div className="flex-1 flex flex-col min-h-0">
          {/* Chat Header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02]">
            <button
              onClick={() => setActiveChatUser(null)}
              className="text-[#74C365] text-xs font-bold hover:text-[#589470] transition-colors flex items-center gap-1"
            >
              {t('chat.back', '← Quay lại')}
            </button>
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#74C365] to-[#589470] flex items-center justify-center text-white text-sm font-bold shadow-sm">
                {activeChatUser.avatar}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{activeChatUser.name}</p>
                <p className="text-[11px] font-semibold text-[#74C365] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#74C365] animate-pulse" />
                  {activeChatUser.online ? t('chat.online', 'Đang hoạt động') : t('chat.offline', 'Ngoại tuyến')}
                </p>
              </div>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            <div className="flex justify-start">
              <div className="bg-slate-100 dark:bg-white/10 rounded-2xl rounded-bl-sm px-3.5 py-2.5 max-w-[85%] border border-transparent dark:border-white/5 shadow-sm">
                <p className="text-sm font-medium text-gray-900 dark:text-white">{activeChatUser.lastMessage || t('chat.start_conversation', 'Bắt đầu cuộc trò chuyện...')}</p>
                <p className="text-[10px] text-gray-400 mt-1 text-right font-semibold">{activeChatUser.time || t('chat.just_now', 'Vừa xong')}</p>
              </div>
            </div>
          </div>

          {/* Input */}
          <div className="px-4 py-3 border-t border-black/5 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02]">
            <div className="flex items-center gap-2 bg-slate-100 dark:bg-white/[0.05] rounded-2xl px-3.5 py-2 border border-transparent dark:border-white/5 focus-within:border-[#74C365]/50 transition-colors">
              <input
                type="text"
                placeholder={t('chat.message_placeholder', 'Nhập tin nhắn...')}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="bg-transparent text-sm text-gray-900 dark:text-white placeholder-gray-400 outline-none w-full font-medium"
              />
              <button className="p-2 rounded-xl bg-[#74C365] text-white hover:bg-[#60a852] transition-colors flex-shrink-0 shadow-md shadow-[#74C365]/20">
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ChatPanel;
