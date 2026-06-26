import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Moon, Sun, LogIn, Sparkles, LogOut, Crown, Check, X } from 'lucide-react';
import gpsImg from '../../assets/svgs/gps.svg';
import arrowDownImg from '../../assets/svgs/arrow_down.svg';
import notificationImg from '../../assets/svgs/notification.svg';
import searchImg from '../../assets/svgs/search.svg';
import badmintonImg from '../../assets/icons/badminton.png';
import pickleballImg from '../../assets/icons/pickelball.png';
import tennisImg from '../../assets/icons/tennis.png';
import footballImg from '../../assets/icons/football.png';
import { useAuth } from '../../shared/context/AuthContext';
import Header from '../../shared/components/Header';
import { gameRoomService } from '../../shared/services/api';

/* ─── Danh mục môn thể thao ─── */
const MOCK_SPORTS = [
  { id: 1, name: 'Badminton', image: badmintonImg, key: 'badminton' },
  { id: 2, name: 'Football', image: footballImg, key: 'football' },
  { id: 3, name: 'Pickleball', image: pickleballImg, key: 'pickleball' },
  { id: 4, name: 'Tennis', image: tennisImg, key: 'tennis' },
];

const LEVEL_STYLES = {
  BEGINNER: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400',
  INTERMEDIATE: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400',
  ADVANCED: 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-400',
  PRO: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400',
};

const BORDER_COLORS = {
  BEGINNER: 'border-green-500',
  INTERMEDIATE: 'border-blue-500',
  ADVANCED: 'border-orange-400',
  PRO: 'border-red-500',
};

const AVATAR_COLORS = {
  B: 'bg-blue-500', P: 'bg-purple-500', M: 'bg-green-500', L: 'bg-pink-500',
  T: 'bg-teal-500', D: 'bg-amber-500', H: 'bg-indigo-500', K: 'bg-rose-500',
};

/* ─── Room Card ─── */
function RoomCard({ room, onJoin, onCancel, onApprove, onEdit, onChat, t }) {
  const { id, title, description, hostName, level, sportLabel, time, avatarBadge, players, isHost, userStatus } = room;
  const slotsLeft = players.required - players.joined;

  return (
    <div className={`flex items-start gap-4 p-5 bg-gray-50 dark:bg-gray-900 rounded-2xl border-l-4 ${BORDER_COLORS[level] ?? 'border-gray-400'} shadow-sm`}>
      {/* Avatar */}
      <div className={`w-12 h-12 rounded-full shrink-0 flex items-center justify-center mt-1 ${AVATAR_COLORS[avatarBadge] ?? 'bg-blue-500'}`}>
        <span className="text-white font-bold text-lg select-none">{avatarBadge}</span>
      </div>

      {/* Thông tin */}
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-gray-900 dark:text-white font-bold text-base line-clamp-1">{title || ''}</h3>
          <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${LEVEL_STYLES[level] ?? 'bg-gray-100 text-gray-600'}`}>
            {t(`sports.${level?.toLowerCase()}`, level)}
          </span>
        </div>
        
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {t('roomCard.host')} <span className="text-gray-900 dark:text-white">{hostName}</span>
        </p>

        {description && (
          <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 italic">
            "{description}"
          </p>
        )}

        <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 pt-1">
          {t(`sports.${room.sport}`, sportLabel)} • {time}
        </p>
        
        <p className={`text-xs font-bold pt-0.5 ${slotsLeft <= 1 ? 'text-red-500' : 'text-green-600 dark:text-green-400'}`}>
          {t('roomCard.lookingFor')} {players.joined}/{players.required} {t('roomCard.players')} {slotsLeft <= 1 && `• ${t('roomCard.almostFull')}`}
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col justify-center gap-2 self-stretch ml-2 w-28">
        {isHost ? (
          <>
            <button onClick={() => onEdit?.(id)} className="w-full shrink-0 bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300 text-xs font-bold px-4 py-2 rounded-xl hover:bg-gray-300 dark:hover:bg-gray-700 transition-all">
              {t('roomCard.edit')}
            </button>
            <button onClick={() => onApprove?.(room)} className="w-full shrink-0 bg-blue-600 text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-blue-500 active:scale-95 transition-all shadow-md shadow-blue-500/30">
              {t('roomCard.approve')}
            </button>
          </>
        ) : (
          <>
            <button onClick={() => onChat?.(room.hostId)} className="w-full shrink-0 bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300 text-[11px] font-bold px-3 py-2 rounded-xl hover:bg-gray-300 dark:hover:bg-gray-700 transition-all">
              {t('roomCard.chatHost')}
            </button>
            {(userStatus === 'NONE' || userStatus === 'REJECTED') ? (
              <button onClick={() => onJoin?.(room)} className="w-full shrink-0 bg-blue-600 text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-blue-500 active:scale-95 transition-all shadow-md shadow-blue-500/30">
                {t('roomCard.join')}
              </button>
            ) : userStatus === 'PENDING' ? (
              <div className="flex flex-col gap-1 w-full">
                <button disabled className="w-full shrink-0 bg-gray-400 text-white text-[10px] font-bold px-2 py-1.5 rounded-xl cursor-not-allowed">{t('roomCard.pending')}</button>
                <button onClick={() => onCancel?.(id)} className="w-full shrink-0 bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 text-[10px] font-bold px-2 py-1.5 rounded-xl hover:bg-red-200 transition-all">{t('roomCard.cancel')}</button>
              </div>
            ) : (
              <div className="flex flex-col gap-1 w-full">
                <button disabled className="w-full shrink-0 bg-green-500 text-white text-[10px] font-bold px-2 py-1.5 rounded-xl cursor-not-allowed">{t('roomCard.joined')}</button>
                <button onClick={() => onCancel?.(id)} className="w-full shrink-0 bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300 text-[10px] font-bold px-2 py-1.5 rounded-xl hover:bg-gray-300 transition-all">{t('roomCard.leave')}</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function RoomCardSkeleton() {
  return (
    <div className="flex items-start gap-4 p-5 bg-gray-50 dark:bg-gray-900 rounded-2xl border-l-4 border-gray-200 dark:border-gray-800 shadow-sm animate-pulse">
      <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 shrink-0 mt-1"></div>
      <div className="flex-1 space-y-3 py-1">
        <div className="flex justify-between items-center">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-full w-1/2"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-full w-16"></div>
        </div>
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full w-1/3"></div>
      </div>
      <div className="flex flex-col gap-2 ml-2">
        <div className="w-20 h-8 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
        <div className="w-20 h-8 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
      </div>
    </div>
  );
}

function GameRoom() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isAuthenticated, user, logout, updateProfile } = useAuth();
  
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedSport, setSelectedSport] = useState(null);
  const [currentLocation] = useState('Hồ Chí Minh');
  const [isDark, setIsDark] = useState(() => localStorage.getItem('theme') !== 'light');
  
  const [activeTab, setActiveTab] = useState('open'); // 'open' or 'my'
  
  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isModalRendered, setIsModalRendered] = useState(false);
  const [isCreateSuccess, setIsCreateSuccess] = useState(false);
  
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [currentJoinRoom, setCurrentJoinRoom] = useState(null);
  
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [currentApproveRoom, setCurrentApproveRoom] = useState(null);

  // Data
  const [myRooms, setMyRooms] = useState([]);
  const [openRooms, setOpenRooms] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [formData, setFormData] = useState({
    title: '', description: '', location: '', sport: 'badminton', level: 'BEGINNER', date: '', time: '', maxPlayers: 4,
  });

  const fetchRooms = async () => {
    setIsLoading(true);
    try {
      const data = await gameRoomService.getAll();
      const mappedRooms = data.map(match => {
        const hostName = match.host?.profile?.full_name || match.host?.email || '';
        const joinedCount = match.participants?.filter(p => p.status === "APPROVED" && p.role !== 'HOST').length || 0;
        const slotsLeft = match.max_players - joinedCount - 1; // -1 for host
        
        const isHost = match.host_id === user?.id;
        let userStatus = 'NONE';
        if (match.participants) {
          const p = match.participants.find(p => p.user_id === user?.id);
          if (p && !isHost) userStatus = p.status;
        }

        return {
          id: match.id,
          hostId: match.host_id,
          isHost,
          userStatus,
          title: match.title,
          description: match.description,
          hostName: hostName,
          level: match.required_level?.toUpperCase() || '',
          sport: MOCK_SPORTS.find(s => s.id === match.sport_id)?.key || 'badminton',
          rawSportId: match.sport_id,
          sportLabel: match.sport?.name || MOCK_SPORTS.find(s => s.id === match.sport_id)?.name || '',
          time: new Date(match.start_time).toLocaleString('vi-VN', {
            year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
          }),
          avatarBadge: hostName ? hostName.charAt(0).toUpperCase() : '',
          players: { joined: joinedCount, required: match.max_players - 1 },
          participants: match.participants || []
        };
      });
      
      setMyRooms(mappedRooms.filter(r => r.isHost));
      setOpenRooms(mappedRooms.filter(r => !r.isHost));
    } catch (err) {
      console.error("Lỗi khi tải danh sách phòng:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, [user]); // refetch if user changes

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCreateRoom = async () => {
    if (!formData.title || !formData.date || !formData.time) {
      alert(t('gameroom.errorCreate') + " Missing required fields."); return;
    }
    try {
      const startTime = new Date(`${formData.date}T${formData.time}`);
      const endTime = new Date(startTime.getTime() + 2 * 60 * 60 * 1000);
      const sportObj = MOCK_SPORTS.find(s => s.key === formData.sport);
      const sport_id = sportObj ? sportObj.id : 1;
      const levelMap = { 'BEGINNER': 'Beginner', 'INTERMEDIATE': 'Intermediate', 'ADVANCED': 'Advanced', 'PRO': 'Expert' };
      
      const payload = {
        title: formData.title, description: formData.description || null,
        sport_id: sport_id, court_id: null,
        required_level: levelMap[formData.level] || 'Beginner',
        start_time: startTime.toISOString(), end_time: endTime.toISOString(),
        max_players: (parseInt(formData.maxPlayers) || 4) + 1 // +1 for host
      };

      await gameRoomService.create(payload);
      setIsCreateSuccess(true);
      setTimeout(() => {
        setIsCreateModalOpen(false);
        setTimeout(() => {
          setIsCreateSuccess(false);
          setFormData({ title: '', description: '', location: '', sport: 'badminton', level: 'BEGINNER', date: '', time: '', maxPlayers: 4 });
          fetchRooms();
          setActiveTab('my'); // switch to my rooms tab automatically
        }, 300);
      }, 2000);
    } catch (err) { alert(t('gameroom.errorCreate') + err.message); }
  };

  useEffect(() => {
    if (isCreateModalOpen) setIsModalRendered(true);
    else { const t_timeout = setTimeout(() => setIsModalRendered(false), 300); return () => clearTimeout(t_timeout); }
  }, [isCreateModalOpen]);

  useEffect(() => {
    if (isDark) { document.documentElement.classList.add('dark'); localStorage.setItem('theme', 'dark'); }
    else { document.documentElement.classList.remove('dark'); localStorage.setItem('theme', 'light'); }
  }, [isDark]);

  const handleFilterSport = (sportId) => {
    setSelectedSport(sportId === selectedSport ? null : sportId);
  };

  const selectedSportKey = selectedSport ? MOCK_SPORTS.find((s) => s.id === selectedSport)?.key : null;
  const currentList = activeTab === 'my' ? myRooms : openRooms;
  const filteredRooms = selectedSportKey ? currentList.filter((r) => r.sport === selectedSportKey) : currentList;

  // Actions
  const handleEdit = () => { alert(t('gameroom.comingSoon')); };
  const handleChat = () => { alert(t('gameroom.comingSoon')); };
  
  const handleJoinClick = (room) => {
    if(!isAuthenticated) return alert(t('gameroom.loginRequired'));
    setCurrentJoinRoom(room);
    setIsJoinModalOpen(true);
  };

  const confirmJoin = async () => {
    if(!currentJoinRoom) return;
    try {
      await gameRoomService.join(currentJoinRoom.id);
      setIsJoinModalOpen(false);
      setCurrentJoinRoom(null);
      fetchRooms();
    } catch(err) { alert(t('gameroom.errorJoin') + err.message); }
  };

  const handleCancel = async (roomId) => {
    try {
      await gameRoomService.leave(roomId);
      fetchRooms();
    } catch(err) { alert(t('gameroom.errorJoin') + err.message); }
  };

  const handleApproveClick = (room) => {
    setCurrentApproveRoom(room);
    setIsApproveModalOpen(true);
  };

  const handleParticipantStatus = async (userId, status) => {
    if(!currentApproveRoom) return;
    try {
      await gameRoomService.approveParticipant(currentApproveRoom.id, userId, status);
      // Cập nhật lại list sau khi duyệt
      fetchRooms();
      // Tạm cập nhật local modal state để không phải đóng modal
      setCurrentApproveRoom(prev => ({
        ...prev,
        participants: prev.participants.map(p => p.user_id === userId ? {...p, status} : p)
      }));
    } catch(err) { alert(t('gameroom.errorJoin') + err.message); }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 pb-24">
      <Header currentLocation={currentLocation} isDark={isDark} setIsDark={setIsDark} searchKeyword={searchKeyword} setSearchKeyword={setSearchKeyword} />

      <div className="px-4 pt-5 space-y-7">
        <section>
          <div className="flex justify-around">
            {MOCK_SPORTS.map((sport) => (
              <button key={sport.id} onClick={() => handleFilterSport(sport.id)} className="flex flex-col items-center gap-2">
                <div className={`relative w-14 h-14 rounded-full overflow-hidden transition-all flex items-center justify-center ${selectedSport === sport.id ? 'scale-105' : 'hover:scale-105'}`}>
                  <img src={sport.image} alt={sport.name} className="w-full h-full object-cover" />
                  {selectedSport === sport.id && <div className="absolute inset-0 rounded-full border-[3px] border-blue-500 pointer-events-none"></div>}
                </div>
                <span className={`text-xs font-medium ${selectedSport === sport.id ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'}`}>
                  {t(`sports.${sport.key}`, sport.name)}
                </span>
              </button>
            ))}
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-4 border-b border-gray-200 dark:border-gray-800 pb-2">
            <div className="flex gap-4">
              <button 
                onClick={() => setActiveTab('open')} 
                className={`font-bold text-lg pb-2 transition-all ${activeTab === 'open' ? 'text-blue-600 border-b-2 border-blue-600 dark:text-blue-400 dark:border-blue-400' : 'text-gray-400 dark:text-gray-600'}`}
              >{t('gameroom.openRooms')}</button>
              {isAuthenticated && (
                <button 
                  onClick={() => setActiveTab('my')} 
                  className={`font-bold text-lg pb-2 transition-all ${activeTab === 'my' ? 'text-blue-600 border-b-2 border-blue-600 dark:text-blue-400 dark:border-blue-400' : 'text-gray-400 dark:text-gray-600'}`}
                >{t('gameroom.myRooms')}</button>
              )}
            </div>
            
            <button onClick={() => {
                if(!isAuthenticated) return alert(t('gameroom.loginRequired'));
                setIsCreateModalOpen(true);
              }} 
              className="bg-blue-600 text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-blue-500 active:scale-95 transition-all shadow-md shadow-blue-500/30 flex items-center gap-1 mb-2">
              <span className="text-lg leading-none">+</span> {t('gameroom.createRoom')}
            </button>
          </div>

          {isLoading ? (
            <div className="flex flex-col gap-3">
              <RoomCardSkeleton /><RoomCardSkeleton />
            </div>
          ) : filteredRooms.length > 0 ? (
            <div className="flex flex-col gap-3">
              {filteredRooms.map((room) => (
                <RoomCard key={room.id} room={room} onJoin={handleJoinClick} onCancel={handleCancel} onApprove={handleApproveClick} onEdit={handleEdit} onChat={handleChat} t={t} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                <span className="text-2xl">🎮</span>
              </div>
              <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">
                {activeTab === 'my' ? t('gameroom.noMyRooms') : t('gameroom.noOpenRooms')}
              </p>
            </div>
          )}
        </section>
      </div>

      {/* CREATE MODAL */}
      {isModalRendered && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className={`absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${isCreateModalOpen ? 'opacity-100' : 'opacity-0'}`} onClick={() => setIsCreateModalOpen(false)}></div>
          <div className={`relative w-full max-w-sm bg-white/90 dark:bg-gray-900/90 backdrop-blur-md rounded-[2.5rem] rounded-tl-[4rem] rounded-br-[4rem] border border-white/20 dark:border-gray-800/50 p-6 shadow-2xl transition-all duration-300 ${isCreateModalOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-90 translate-y-8'}`}>
            <button onClick={() => setIsCreateModalOpen(false)} className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-black/5 dark:bg-white/10 text-gray-600 dark:text-gray-300 hover:bg-red-100 transition-colors"><X size={16} /></button>
            {isCreateSuccess ? (
              <div className="flex flex-col items-center justify-center py-12 opacity-100 transition-opacity duration-500">
                <div className="relative w-24 h-24 flex items-center justify-center mb-6">
                  <div className="absolute inset-0 bg-green-500 rounded-full animate-ping opacity-20"></div>
                  <div className="w-full h-full bg-gradient-to-tr from-green-400 to-green-600 rounded-full flex items-center justify-center"><Check size={32} color="white" /></div>
                </div>
                <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2">{t('gameroom.createRoomSuccess')}</h3>
              </div>
            ) : (
              <>
                <h3 className="text-xl font-black text-gray-900 dark:text-white mb-5 text-center mt-2">{t('gameroom.createNewRoom')}</h3>
                <div className="space-y-4 max-h-[60vh] overflow-y-auto scrollbar-hide px-1 pb-2">
                  <div><label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">{t('gameroom.roomName')}</label><input type="text" name="title" value={formData.title} onChange={handleInputChange} className="w-full bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3 text-sm outline-none focus:border-blue-500" /></div>
                  <div><label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">{t('gameroom.description')}</label><textarea name="description" value={formData.description} onChange={handleInputChange} className="w-full bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3 text-sm outline-none focus:border-blue-500 resize-none" rows="2"></textarea></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">{t('gameroom.sport')}</label>
                      <select name="sport" value={formData.sport} onChange={handleInputChange} className="w-full bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 rounded-2xl px-3 py-3 text-sm outline-none focus:border-blue-500">
                        <option value="badminton">Badminton</option><option value="football">Football</option><option value="pickleball">Pickleball</option><option value="tennis">Tennis</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">{t('gameroom.level')}</label>
                      <select name="level" value={formData.level} onChange={handleInputChange} className="w-full bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 rounded-2xl px-3 py-3 text-sm outline-none focus:border-blue-500">
                        <option value="BEGINNER">Beginner</option><option value="INTERMEDIATE">Intermediate</option><option value="ADVANCED">Advanced</option><option value="PRO">Pro</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2">
                      <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">{t('gameroom.playTime')}</label>
                      <div className="grid grid-cols-2 gap-2">
                        <input type="date" name="date" value={formData.date} onChange={handleInputChange} className="w-full bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 rounded-2xl px-3 py-3 text-[11px] outline-none" />
                        <input type="time" name="time" value={formData.time} onChange={handleInputChange} className="w-full bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 rounded-2xl px-3 py-3 text-[11px] outline-none" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">{t('gameroom.playerCount')}</label>
                      <input type="number" name="maxPlayers" value={formData.maxPlayers} onChange={handleInputChange} className="w-full bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 rounded-2xl px-3 py-3 text-sm outline-none" />
                    </div>
                  </div>
                </div>
                <button onClick={handleCreateRoom} className="w-full mt-6 bg-blue-600 text-white font-black py-3.5 rounded-2xl hover:bg-blue-500 active:scale-95 transition-all">{t('gameroom.confirmCreate')}</button>
              </>
            )}
          </div>
        </div>
      )}

      {/* JOIN CONFIRM MODAL */}
      {isJoinModalOpen && currentJoinRoom && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsJoinModalOpen(false)}></div>
          <div className="relative w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{t('gameroom.joinConfirmTitle')}</h3>
            <p className="text-gray-600 dark:text-gray-300 text-sm mb-6">{t('gameroom.joinConfirmDesc')} <strong>{currentJoinRoom.title}</strong>?</p>
            <div className="flex gap-3">
              <button onClick={() => setIsJoinModalOpen(false)} className="flex-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold py-2.5 rounded-xl">{t('gameroom.cancel')}</button>
              <button onClick={confirmJoin} className="flex-1 bg-blue-600 text-white font-bold py-2.5 rounded-xl hover:bg-blue-500">{t('gameroom.confirm')}</button>
            </div>
          </div>
        </div>
      )}

      {/* APPROVE MODAL */}
      {isApproveModalOpen && currentApproveRoom && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsApproveModalOpen(false)}></div>
          <div className="relative w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-2xl flex flex-col max-h-[80vh]">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">{t('gameroom.approvalList')}</h3>
              <button onClick={() => setIsApproveModalOpen(false)} className="text-gray-500 hover:text-red-500 transition-colors"><X size={20}/></button>
            </div>
            
            <div className="overflow-y-auto space-y-3 flex-1">
              {currentApproveRoom.participants
                .filter(p => p.role !== 'HOST')
                .sort((a, b) => new Date(a.joined_at) - new Date(b.joined_at))
                .map(p => {
                  const applicantSport = p.user?.sports?.find(s => s.sport_id === currentApproveRoom.rawSportId);
                  const skillLevel = applicantSport ? applicantSport.skill_level : 'Beginner';
                  
                  return (
                    <div key={p.user_id} className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700">
                      <div>
                        <p className="text-sm font-bold text-gray-900 dark:text-white">{p.user?.profile?.full_name || p.user?.email}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{t('gameroom.sportLevelLabel')} <span className="font-semibold">{skillLevel}</span></p>
                        <p className="text-[10px] text-gray-400 mt-0.5">{t('gameroom.joinedAt')} {new Date(p.joined_at).toLocaleTimeString('vi-VN')}</p>
                      </div>
                      
                      {p.status === 'PENDING' ? (
                        <div className="flex gap-2">
                          <button onClick={() => handleParticipantStatus(p.user_id, 'REJECTED')} className="w-9 h-9 flex items-center justify-center rounded-xl bg-red-100 text-red-600 hover:bg-red-200 active:scale-95 transition-all"><X size={18}/></button>
                          <button onClick={() => handleParticipantStatus(p.user_id, 'APPROVED')} className="w-9 h-9 flex items-center justify-center rounded-xl bg-green-100 text-green-600 hover:bg-green-200 active:scale-95 transition-all"><Check size={18}/></button>
                        </div>
                      ) : (
                        <span className={`text-[10px] font-bold px-3 py-1.5 rounded-xl uppercase ${p.status === 'APPROVED' ? 'bg-green-100 text-green-700 dark:bg-green-900/30' : 'bg-red-100 text-red-700 dark:bg-red-900/30'}`}>
                          {p.status === 'APPROVED' ? t('gameroom.approved') : t('gameroom.rejected')}
                        </span>
                      )}
                    </div>
                  );
              })}
              
              {currentApproveRoom.participants.filter(p => p.role !== 'HOST').length === 0 && (
                <div className="text-center text-gray-500 dark:text-gray-400 py-10 text-sm">
                  {t('gameroom.noApplicants')}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default GameRoom;
