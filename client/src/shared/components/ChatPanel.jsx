import { useCallback, useEffect, useRef, useState } from 'react';
import { MessageSquare, X, Send, Search, ArrowLeft, UserPlus, UserCheck, Check, MessageCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useChat } from '../context/ChatContext';
import { useAuth } from '../context/AuthContext';
import { chatService, resolveMediaUrl } from '../services/api';

const toContact = (conversation) => ({
  conversationId: conversation.id,
  userId: conversation.other_user.id,
  name: conversation.other_user.name,
  avatar: resolveMediaUrl(conversation.other_user.avatar_url),
  last_message: conversation.last_message,
  updated_at: conversation.updated_at,
  unread_count: conversation.unread_count || 0,
  friendship_status: conversation.friendship_status || 'none',
  friendship_id: conversation.friendship_id || null,
});

const formatMessageTime = (value) => {
  if (!value) return '';
  const date = new Date(value.endsWith('Z') ? value : `${value}Z`);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

function ChatPanel() {
  const { t } = useTranslation();
  const { isChatOpen, closeChat, pendingRecipient, setPendingRecipient } = useChat();
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isMessagesLoading, setIsMessagesLoading] = useState(false);
  const [isLoadingOlderMessages, setIsLoadingOlderMessages] = useState(false);
  const [hasOlderMessages, setHasOlderMessages] = useState(false);
  const [message, setMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('messages');
  const [people, setPeople] = useState([]);
  const [peopleQuery, setPeopleQuery] = useState('');
  const [isSearchingPeople, setIsSearchingPeople] = useState(false);
  const [friends, setFriends] = useState([]);
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [friendActionId, setFriendActionId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');
  const messageCursorRef = useRef({ conversationId: null, oldestId: 0, latestId: 0 });

  const loadConversations = useCallback(async () => {
    try {
      const data = await chatService.getConversations();
      setConversations(data.map(toContact));
    } catch (err) {
      setError(err.message || 'Không tải được danh sách cuộc trò chuyện');
    }
  }, []);

  const loadMessages = useCallback((conversationId, params = {}) => (
    chatService.getMessages(conversationId, params)
  ), []);

  const loadFriendData = useCallback(async () => {
    try {
      const [friendList, requests] = await Promise.all([
        chatService.getFriends(),
        chatService.getFriendRequests(),
      ]);
      setFriends(friendList);
      setIncomingRequests(requests);
    } catch (err) {
      setError(err.message || 'Không tải được danh sách bạn bè');
    }
  }, []);

  useEffect(() => {
    if (!isChatOpen) return undefined;
    const initialLoad = window.setTimeout(loadConversations, 0);
    const timer = window.setInterval(loadConversations, 12000);
    return () => {
      window.clearTimeout(initialLoad);
      window.clearInterval(timer);
    };
  }, [isChatOpen, loadConversations]);

  useEffect(() => {
    if (!isChatOpen || selected || activeTab !== 'friends') return undefined;
    const timer = window.setTimeout(loadFriendData, 0);
    return () => window.clearTimeout(timer);
  }, [isChatOpen, selected, activeTab, loadFriendData]);

  useEffect(() => {
    const query = searchQuery.trim();
    if (!isChatOpen || selected || activeTab !== 'friends' || query.length < 2) return undefined;
    let active = true;
    const timer = window.setTimeout(() => {
      setIsSearchingPeople(true);
      chatService.searchUsers(query)
        .then((items) => { if (active) { setPeople(items); setPeopleQuery(query); } })
        .catch((err) => { if (active) setError(err.message || 'Không tìm được người dùng'); })
        .finally(() => { if (active) setIsSearchingPeople(false); });
    }, 250);
    return () => { active = false; window.clearTimeout(timer); };
  }, [isChatOpen, selected, activeTab, searchQuery]);

  useEffect(() => {
    if (!isChatOpen || !pendingRecipient?.id) return undefined;
    let active = true;
    const timer = window.setTimeout(() => {
      if (!active) return;
      setIsLoading(true);
      setError('');
      chatService.startConversation(pendingRecipient.id)
        .then((conversation) => {
          if (!active) return;
          const contact = toContact(conversation);
          setMessages([]);
          setHasOlderMessages(false);
          setIsMessagesLoading(true);
          setSelected(contact);
          setPendingRecipient(null);
        })
        .catch((err) => {
          if (active) setError(err.message || 'Không thể bắt đầu cuộc trò chuyện');
        })
        .finally(() => { if (active) setIsLoading(false); });
    }, 0);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [isChatOpen, pendingRecipient, setPendingRecipient]);

  useEffect(() => {
    if (!isChatOpen || !selected?.conversationId) return undefined;
    const conversationId = selected.conversationId;
    let active = true;
    let requestInFlight = false;
    let latestId = 0;
    messageCursorRef.current = { conversationId, oldestId: 0, latestId: 0 };

    const refreshMessages = async (initial = false) => {
      if (!active || requestInFlight) return;
      requestInFlight = true;
      try {
        const detail = await loadMessages(conversationId, initial
          ? { limit: 50 }
          : { after_id: messageCursorRef.current.latestId, limit: 50 });
        if (!active) return;

        const fetched = detail.messages || [];
        if (initial) {
          setMessages(fetched);
          setHasOlderMessages(Boolean(detail.has_more));
          const firstId = Number(fetched[0]?.id) || 0;
          latestId = Number(fetched.at(-1)?.id) || 0;
          messageCursorRef.current = { conversationId, oldestId: firstId, latestId };
        } else if (fetched.length) {
          setMessages((current) => {
            const existingIds = new Set(current.map((item) => item.id));
            return [...current, ...fetched.filter((item) => !existingIds.has(item.id))];
          });
          latestId = Math.max(messageCursorRef.current.latestId, ...fetched.map((item) => Number(item.id) || 0));
          messageCursorRef.current.latestId = latestId;
          const contact = toContact(detail);
          setConversations((current) => [
            contact,
            ...current.filter((item) => item.conversationId !== conversationId),
          ]);
        }

        setSelected((current) => {
          if (current?.conversationId !== conversationId
            || (current.friendship_status === detail.friendship_status
              && current.friendship_id === detail.friendship_id)) return current;
          return { ...current, friendship_status: detail.friendship_status, friendship_id: detail.friendship_id };
        });
        setError('');
      } catch (err) {
        if (active) setError(err.message || 'Không tải được tin nhắn');
      } finally {
        requestInFlight = false;
        if (initial && active) setIsMessagesLoading(false);
      }
    };

    refreshMessages(true);
    const timer = window.setInterval(() => refreshMessages(false), 5000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [isChatOpen, selected?.conversationId, loadMessages]);

  const loadOlderMessages = async () => {
    const cursor = messageCursorRef.current;
    if (!selected?.conversationId || cursor.conversationId !== selected.conversationId
      || !cursor.oldestId || isLoadingOlderMessages) return;
    setIsLoadingOlderMessages(true);
    try {
      const detail = await loadMessages(selected.conversationId, { before_id: cursor.oldestId, limit: 50 });
      if (messageCursorRef.current.conversationId !== selected.conversationId) return;
      const olderMessages = detail.messages || [];
      if (olderMessages.length) {
        setMessages((current) => {
          const existingIds = new Set(current.map((item) => item.id));
          return [...olderMessages.filter((item) => !existingIds.has(item.id)), ...current];
        });
        messageCursorRef.current.oldestId = Number(olderMessages[0].id) || cursor.oldestId;
      }
      setHasOlderMessages(Boolean(detail.has_more));
    } catch (err) {
      setError(err.message || 'Không tải được tin nhắn cũ hơn');
    } finally {
      setIsLoadingOlderMessages(false);
    }
  };

  const updateSelectedFriendship = async () => {
    if (!selected?.userId) return;
    const actionKey = `chat-${selected.userId}`;
    setFriendActionId(actionKey);
    setError('');
    try {
      let status = selected.friendship_status;
      let friendshipId = selected.friendship_id;
      if (status === 'none') {
        const request = await chatService.sendFriendRequest(selected.userId);
        status = 'outgoing';
        friendshipId = request.id;
      } else if (status === 'incoming' && friendshipId) {
        await chatService.acceptFriendRequest(friendshipId);
        status = 'accepted';
      } else {
        return;
      }
      setSelected((current) => current?.conversationId === selected.conversationId
        ? { ...current, friendship_status: status, friendship_id: friendshipId }
        : current);
    } catch (err) {
      setError(err.message || 'Không thể cập nhật bạn bè');
    } finally {
      setFriendActionId(null);
    }
  };

  const sendMessage = async (event) => {
    event.preventDefault();
    const text = message.trim();
    if (!text || !selected?.conversationId || isSending) return;
    setIsSending(true);
    setError('');
    try {
      const sent = await chatService.sendMessage(selected.conversationId, text);
      setMessages((current) => [...current, sent]);
      messageCursorRef.current.latestId = Math.max(messageCursorRef.current.latestId, Number(sent.id) || 0);
      setConversations((current) => {
        const contact = { ...selected, last_message: sent.text, updated_at: sent.created_at };
        return [contact, ...current.filter((item) => item.conversationId !== selected.conversationId)];
      });
      setMessage('');
    } catch (err) {
      setError(err.message || 'Không gửi được tin nhắn');
    } finally {
      setIsSending(false);
    }
  };

  const filteredConversations = conversations.filter((conversation) =>
    (conversation.name || '').toLowerCase().includes(searchQuery.trim().toLowerCase())
  );

  const runFriendAction = async (key, action) => {
    setFriendActionId(key);
    setError('');
    try {
      await action();
      await loadFriendData();
      if (searchQuery.trim().length >= 2) {
        const query = searchQuery.trim();
        setPeople(await chatService.searchUsers(query));
        setPeopleQuery(query);
      }
    } catch (err) {
      setError(err.message || 'Không thể cập nhật bạn bè');
    } finally {
      setFriendActionId(null);
    }
  };

  const openFriendConversation = async (friend) => {
    setIsLoading(true);
    setError('');
    try {
      const conversation = await chatService.startConversation(friend.user.id);
      const contact = toContact(conversation);
      setConversations((current) => [contact, ...current.filter((item) => item.conversationId !== contact.conversationId)]);
      setMessages([]);
      setHasOlderMessages(false);
      setIsMessagesLoading(true);
      setSelected(contact);
    } catch (err) {
      setError(err.message || 'Không mở được cuộc trò chuyện');
    } finally {
      setIsLoading(false);
    }
  };

  const visiblePeople = peopleQuery === searchQuery.trim() ? people : [];
  const searchedUserIds = new Set(visiblePeople.map((person) => person.id));
  const selectedFriendshipStatus = selected?.friendship_status || 'none';
  const selectedFriendshipLabel = selectedFriendshipStatus === 'accepted'
    ? 'Bạn bè'
    : selectedFriendshipStatus === 'incoming'
      ? 'Đã gửi lời mời cho bạn'
      : selectedFriendshipStatus === 'outgoing'
        ? 'Đã gửi lời mời'
        : 'Người lạ';
  const selectedFriendActionKey = selected ? `chat-${selected.userId}` : '';

  return (
    <>
    <button
      type="button"
      aria-label="Đóng nền chat"
      tabIndex={-1}
      onClick={closeChat}
      className={`fixed inset-x-0 top-[var(--mobile-chat-top,96px)] bottom-0 z-[998] bg-slate-950/35 backdrop-blur-[1px] transition-opacity duration-200 md:hidden ${isChatOpen ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
    />
    <div
      className={`navbar-chat-panel fixed top-[var(--mobile-chat-top,96px)] md:top-[148px] bottom-3 sm:bottom-6 left-3 right-3 md:left-auto md:right-6 w-auto md:w-[368px] max-w-[380px] md:max-w-none mx-auto md:mx-0 bg-white/95 dark:bg-[#0a192f]/95 backdrop-blur-2xl rounded-3xl border border-gray-200/80 dark:border-white/10 z-[1000] flex flex-col shadow-2xl overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        isChatOpen ? 'translate-y-0 translate-x-0 opacity-100 scale-100' : 'translate-y-8 sm:translate-y-0 translate-x-0 sm:translate-x-[120%] opacity-0 scale-95 sm:scale-100 pointer-events-none'
      }`}
    >
      <div className="flex items-center justify-between px-5 py-4 border-b border-black/5 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02]">
        <div className="flex items-center gap-2.5">
          {selected && <button onClick={() => { setSelected(null); setMessages([]); setHasOlderMessages(false); }} aria-label="Quay lại" className="p-1 text-slate-500"><ArrowLeft className="w-4 h-4" /></button>}
          <div className="p-2 rounded-xl bg-[#74C365]/10 text-[#74C365]"><MessageSquare className="w-5 h-5" /></div>
          <div className="min-w-0">
            <h2 className="truncate text-base font-extrabold text-gray-900 dark:text-white tracking-tight">{selected?.name || t('bottomNav.chat', 'Chat')}</h2>
            {selected && <div className="mt-0.5 flex items-center gap-2 text-[10px] leading-4">
              <span className={selectedFriendshipStatus === 'accepted' ? 'font-semibold text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}>{selectedFriendshipLabel}</span>
              {selectedFriendshipStatus === 'none' && <button type="button" disabled={friendActionId === selectedFriendActionKey} onClick={updateSelectedFriendship} className="inline-flex items-center gap-1 font-bold text-[#589470] hover:text-[#74C365] disabled:opacity-50"><UserPlus className="h-3 w-3" />Kết bạn</button>}
              {selectedFriendshipStatus === 'incoming' && <button type="button" disabled={friendActionId === selectedFriendActionKey} onClick={updateSelectedFriendship} className="inline-flex items-center gap-1 font-bold text-[#589470] hover:text-[#74C365] disabled:opacity-50"><Check className="h-3 w-3" />Chấp nhận</button>}
            </div>}
          </div>
        </div>
        <button onClick={closeChat} aria-label="Đóng chat" className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 text-gray-500"><X className="w-4 h-4" /></button>
      </div>

      {error && <p role="alert" className="mx-4 mt-3 rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</p>}

      {!selected ? (
        <>
          <div className="px-4 py-3 border-b border-black/5 dark:border-white/5">
            <div className="flex items-center gap-2 bg-slate-100 dark:bg-white/[0.05] rounded-xl px-3 py-2">
              <Search className="w-4 h-4 text-slate-400" />
              <input type="search" placeholder={t('chat.search_placeholder', 'Tìm kiếm...')} value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} className="bg-transparent text-sm text-gray-900 dark:text-white outline-none w-full" />
            </div>
            <div className="mt-3 grid grid-cols-2 rounded-xl bg-slate-100 p-1 dark:bg-white/[0.05]">
              <button type="button" onClick={() => { setActiveTab('messages'); setSearchQuery(''); }} className={`rounded-lg py-2 text-xs font-bold ${activeTab === 'messages' ? 'bg-white text-[#589470] shadow-sm dark:bg-white/10 dark:text-[#74C365]' : 'text-slate-500'}`}>Tin nhắn</button>
              <button type="button" onClick={() => { setActiveTab('friends'); setSearchQuery(''); }} className={`rounded-lg py-2 text-xs font-bold ${activeTab === 'friends' ? 'bg-white text-[#589470] shadow-sm dark:bg-white/10 dark:text-[#74C365]' : 'text-slate-500'}`}>Bạn bè</button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-gray-100 dark:divide-white/5">
            {activeTab === 'messages' && isLoading && <p className="p-5 text-center text-sm text-slate-500">Đang tải…</p>}
            {activeTab === 'messages' && !isLoading && filteredConversations.length === 0 && !error && (
              <p className="p-6 text-center text-sm text-slate-500">Chưa có cuộc trò chuyện. Mở tab Bạn bè để tìm và kết bạn.</p>
            )}
            {activeTab === 'messages' && filteredConversations.map((conversation) => (
              <button key={conversation.conversationId} onClick={() => { setMessages([]); setHasOlderMessages(false); setIsMessagesLoading(true); setSelected(conversation); }} className="w-full flex items-center gap-3.5 px-4 py-3.5 hover:bg-slate-50 dark:hover:bg-white/[0.04] text-left">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#74C365] to-[#589470] flex items-center justify-center text-white font-bold shrink-0 overflow-hidden">
                  {conversation.avatar ? <img src={conversation.avatar} alt="" className="h-full w-full object-cover" /> : conversation.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-bold text-gray-900 dark:text-white truncate block">{conversation.name}</span>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{conversation.last_message || 'Chưa có tin nhắn'}</p>
                </div>
                {conversation.unread_count > 0 && <span className="min-w-5 h-5 px-1.5 rounded-full bg-[#74C365] text-white text-[10px] font-black flex items-center justify-center">{conversation.unread_count}</span>}
              </button>
            ))}
            {activeTab === 'friends' && incomingRequests.map((request) => (
              <div key={`request-${request.id}`} className="flex items-center gap-3 px-4 py-3.5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#74C365]/15 font-bold text-[#589470]">{request.user.avatar_url ? <img src={resolveMediaUrl(request.user.avatar_url)} alt="" className="h-full w-full object-cover" /> : request.user.name.charAt(0).toUpperCase()}</div>
                <div className="min-w-0 flex-1"><span className="block truncate text-sm font-bold text-gray-900 dark:text-white">{request.user.name}</span><p className="text-xs text-slate-500">Lời mời kết bạn</p></div>
                <button type="button" disabled={friendActionId === request.id} onClick={() => runFriendAction(request.id, () => chatService.acceptFriendRequest(request.id))} className="rounded-lg bg-[#589470] px-2.5 py-2 text-xs font-bold text-white disabled:opacity-50"><Check className="mr-1 inline h-3.5 w-3.5" />Chấp nhận</button>
              </div>
            ))}
            {activeTab === 'friends' && searchQuery.trim().length >= 2 && visiblePeople.map((person) => (
              <div key={`person-${person.id}`} className="flex items-center gap-3 px-4 py-3.5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#74C365]/15 font-bold text-[#589470]">{person.avatar_url ? <img src={resolveMediaUrl(person.avatar_url)} alt="" className="h-full w-full object-cover" /> : person.name.charAt(0).toUpperCase()}</div>
                <div className="min-w-0 flex-1"><span className="block truncate text-sm font-bold text-gray-900 dark:text-white">{person.name}</span><p className="text-xs text-slate-500">{person.friendship_status === 'accepted' ? 'Bạn bè' : person.friendship_status === 'incoming' ? 'Đã gửi lời mời cho bạn' : person.friendship_status === 'outgoing' ? 'Đã gửi lời mời' : 'Người dùng SportGo'}</p></div>
                {person.friendship_status === 'none' && <button type="button" disabled={friendActionId === person.id} onClick={() => runFriendAction(person.id, () => chatService.sendFriendRequest(person.id))} className="rounded-lg bg-[#589470] px-3 py-2 text-xs font-bold text-white disabled:opacity-50"><UserPlus className="mr-1 inline h-3.5 w-3.5" />Kết bạn</button>}
                {person.friendship_status === 'incoming' && <button type="button" disabled={friendActionId === person.friendship_id} onClick={() => runFriendAction(person.friendship_id, () => chatService.acceptFriendRequest(person.friendship_id))} className="rounded-lg bg-[#589470] px-2.5 py-2 text-xs font-bold text-white disabled:opacity-50"><Check className="mr-1 inline h-3.5 w-3.5" />Chấp nhận</button>}
                {person.friendship_status === 'outgoing' && <span className="text-xs font-semibold text-slate-400"><UserCheck className="mr-1 inline h-4 w-4" />Đã gửi</span>}
                {person.friendship_status === 'accepted' && <button type="button" onClick={() => openFriendConversation({ user: person })} className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 dark:bg-white/10 dark:text-white"><MessageCircle className="mr-1 inline h-3.5 w-3.5" />Chat</button>}
              </div>
            ))}
            {activeTab === 'friends' && friends.filter((friend) => friend.user.name.toLowerCase().includes(searchQuery.trim().toLowerCase()) && !searchedUserIds.has(friend.user.id)).map((friend) => (
              <button key={`friend-${friend.id}`} type="button" onClick={() => openFriendConversation(friend)} className="flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-slate-50 dark:hover:bg-white/[0.04]">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#74C365]/15 font-bold text-[#589470]">{friend.user.avatar_url ? <img src={resolveMediaUrl(friend.user.avatar_url)} alt="" className="h-full w-full object-cover" /> : friend.user.name.charAt(0).toUpperCase()}</div>
                <div className="min-w-0 flex-1"><span className="block truncate text-sm font-bold text-gray-900 dark:text-white">{friend.user.name}</span><p className="text-xs text-slate-500">Bạn bè · Nhấn để nhắn tin</p></div><MessageCircle className="h-4 w-4 text-[#589470]" />
              </button>
            ))}
            {activeTab === 'friends' && searchQuery.trim().length < 2 && friends.length === 0 && incomingRequests.length === 0 && <p className="p-6 text-center text-sm text-slate-500">Tìm theo tên từ 2 ký tự để thêm bạn bè.</p>}
            {activeTab === 'friends' && searchQuery.trim().length >= 2 && (isSearchingPeople || peopleQuery !== searchQuery.trim()) && <p className="p-5 text-center text-xs text-slate-500">Đang tìm người dùng…</p>}
            {activeTab === 'friends' && searchQuery.trim().length >= 2 && !isSearchingPeople && peopleQuery === searchQuery.trim() && visiblePeople.length === 0 && <p className="p-5 text-center text-xs text-slate-500">Không tìm thấy người dùng phù hợp.</p>}
          </div>
        </>
      ) : (
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {hasOlderMessages && <button type="button" disabled={isLoadingOlderMessages} onClick={loadOlderMessages} className="mx-auto block rounded-full px-3 py-1 text-[11px] font-semibold text-[#589470] hover:bg-emerald-500/10 disabled:opacity-50">{isLoadingOlderMessages ? 'Đang tải…' : 'Tải tin nhắn cũ hơn'}</button>}
            {isMessagesLoading && messages.length === 0 && <p className="text-center text-xs text-slate-500">Đang tải tin nhắn…</p>}
            {!isMessagesLoading && messages.length === 0 && <p className="text-center text-xs text-slate-500">Bắt đầu cuộc trò chuyện với {selected.name}.</p>}
            {messages.map((item) => {
              const own = Number(item.sender_id) === Number(user?.id);
              return <div key={item.id} className={`flex ${own ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 shadow-sm ${own ? 'bg-[#74C365] text-white rounded-br-sm' : 'bg-slate-100 dark:bg-white/10 text-gray-900 dark:text-white rounded-bl-sm'}`}>
                  <p className="text-sm whitespace-pre-wrap break-words">{item.text}</p>
                  <p className={`text-[10px] mt-1 text-right ${own ? 'text-white/75' : 'text-slate-400'}`}>{formatMessageTime(item.created_at)}</p>
                </div>
              </div>;
            })}
          </div>
          <form onSubmit={sendMessage} className="px-4 py-3 border-t border-black/5 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02]">
            <div className="flex items-center gap-2 bg-slate-100 dark:bg-white/[0.05] rounded-2xl px-3.5 py-2">
              <input type="text" placeholder={t('chat.message_placeholder', 'Nhập tin nhắn...')} value={message} onChange={(event) => setMessage(event.target.value)} maxLength={4000} className="bg-transparent text-sm text-gray-900 dark:text-white placeholder-gray-400 outline-none w-full" />
              <button type="submit" disabled={!message.trim() || isSending} aria-label="Gửi tin nhắn" className="p-2 rounded-xl bg-[#74C365] text-white disabled:opacity-50"><Send className="w-4 h-4" /></button>
            </div>
          </form>
        </div>
      )}
    </div>
    </>
  );
}

export default ChatPanel;
