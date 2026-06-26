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
      className={`fixed right-0 top-0 bottom-16 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 z-40 flex flex-col shadow-2xl shadow-black/10 overflow-hidden transition-[width] duration-300 ease-in-out ${
        isChatOpen ? 'w-[340px]' : 'w-0 border-l-0'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-blue-500" />
          <h2 className="text-sm font-bold text-gray-900 dark:text-white">{t('bottomNav.chat', 'Chat')}</h2>
        </div>
        <button
          onClick={closeChat}
          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Search */}
      <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-lg px-3 py-2">
          <Search className="w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder={t('chat.search_placeholder', 'Tìm kiếm...')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent text-sm text-gray-900 dark:text-white placeholder-gray-400 outline-none w-full"
          />
        </div>
      </div>

      {/* Conversation List */}
      {!activeChatUser ? (
        <div className="flex-1 overflow-y-auto">
          {MOCK_CONVERSATIONS.map((conv) => (
            <button
              key={conv.id}
              onClick={() => setActiveChatUser(conv)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-left"
            >
              {/* Avatar */}
              <div className="relative flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-semibold">
                  {conv.avatar}
                </div>
                {conv.online && (
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-900" />
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <span className="text-sm font-semibold text-gray-900 dark:text-white truncate block">
                  {conv.name}
                </span>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                  {conv.lastMessage}
                </p>
              </div>

              {/* Thời gian + Badge — cột riêng bên phải, căn trên */}
              <div className="flex flex-col items-end gap-1 flex-shrink-0 self-start pt-0.5">
                <span className="text-[11px] text-gray-400">
                  {conv.time === 'Hôm qua' ? t('chat.yesterday', 'Hôm qua') : conv.time}
                </span>
                {conv.unread > 0 && (
                  <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                    <span className="text-[10px] text-white font-bold">{conv.unread}</span>
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      ) : (
        /* Chat Detail View */
        <div className="flex-1 flex flex-col">
          {/* Chat Header */}
          <div className="flex items-center gap-3 px-4 py-2 border-b border-gray-100 dark:border-gray-800">
            <button
              onClick={() => setActiveChatUser(null)}
              className="text-blue-500 text-xs font-medium hover:text-blue-400"
            >
              {t('chat.back', '← Quay lại')}
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-semibold">
                {activeChatUser.avatar}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{activeChatUser.name}</p>
                <p className="text-[10px] text-green-500">{activeChatUser.online ? t('chat.online', 'Đang hoạt động') : t('chat.offline', 'Ngoại tuyến')}</p>
              </div>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            <div className="flex justify-start">
              <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-bl-sm px-3 py-2 max-w-[80%]">
                <p className="text-sm text-gray-900 dark:text-white">{activeChatUser.lastMessage || t('chat.start_conversation', 'Bắt đầu cuộc trò chuyện...')}</p>
                <p className="text-[10px] text-gray-400 mt-1">{activeChatUser.time || t('chat.just_now', 'Vừa xong')}</p>
              </div>
            </div>
          </div>

          {/* Input */}
          <div className="px-3 py-2 border-t border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-full px-4 py-2">
              <input
                type="text"
                placeholder={t('chat.message_placeholder', 'Nhập tin nhắn...')}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="bg-transparent text-sm text-gray-900 dark:text-white placeholder-gray-400 outline-none w-full"
              />
              <button className="p-1.5 rounded-full bg-blue-500 text-white hover:bg-blue-600 transition-colors flex-shrink-0">
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ChatPanel;
