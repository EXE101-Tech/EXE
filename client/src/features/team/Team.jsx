import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Users, PlusCircle, Sparkles, SlidersHorizontal, Crown, Shield, UserCheck, Trophy, Filter, ChevronDown } from 'lucide-react';
import { useSportFilter } from '../../shared/context/SportFilterContext';
import TeamCard from './components/TeamCard';
import CreateTeamModal from './components/CreateTeamModal';
import ReviewTeamModal from './components/ReviewTeamModal';
import FilterSelect from '../../shared/components/FilterSelect';
import { useSearchParams } from 'react-router-dom';
import { teamService } from '../../shared/services/api';
import { useChat } from '../../shared/context/ChatContext';

import badmintonImg from '../../assets/sports/badminton.avif';
import footballImg from '../../assets/sports/foodball.avif';
import pickleballImg from '../../assets/sports/pickleball.jpg';
import tennisImg from '../../assets/sports/tennis.jpg';
import basketballImg from '../../assets/sports/bong_ro.jpg';
import volleyballImg from '../../assets/sports/volleyball.jpg';

const TABS = [
  { id: 'captain', label: 'CLB tôi làm chủ', icon: Crown, emoji: '👑' },
  { id: 'member', label: 'CLB tôi tham gia', icon: UserCheck, emoji: '🤝' },
  { id: 'discover', label: 'Khám phá CLB', icon: Users, emoji: '🌐' },
];

export default function Team() {
  const [searchParams] = useSearchParams();
  const routeSearch = (searchParams.get('search') || '').trim().toLowerCase();
  const { selectedSport, setSelectedSport } = useSportFilter();
  const { openChat } = useChat();
  const [teams, setTeams] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('captain');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState(null);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [reviewTeam, setReviewTeam] = useState(null);
  const [memberDialog, setMemberDialog] = useState(null);
  const [members, setMembers] = useState([]);
  const [alertMessage, setAlertMessage] = useState('');

  const loadTeams = useCallback(async () => {
    setIsLoading(true);
    try {
      const items = await teamService.getAll({ scope: 'all', sport_id: selectedSport || undefined });
      const emojis = { badminton: '🏸', football: '⚽', pickleball: '🏓', tennis: '🎾', basketball: '🏀', volleyball: '🏐' };
      const images = { badminton: badmintonImg, football: footballImg, pickleball: pickleballImg, tennis: tennisImg, basketball: basketballImg, volleyball: volleyballImg };
      setTeams(items.map((team) => ({
        ...team,
        sportId: team.sport_id,
        sportEmoji: emojis[team.sport_id] || '🏅',
        image: team.image_url || images[team.sport_id] || badmintonImg,
        captain: team.owner_name,
        members: team.member_count,
        totalSlots: team.total_slots,
        ratingCount: team.rating_count,
        createdAt: new Date(team.created_at).toLocaleDateString('vi-VN'),
        isCaptain: team.is_captain,
        isMember: team.is_member,
        membershipStatus: team.membership_status,
        isVip: false,
      })));
      setError('');
    } catch (err) {
      setError(err.message || 'Không tải được danh sách CLB');
    } finally {
      setIsLoading(false);
    }
  }, [selectedSport]);

  useEffect(() => { loadTeams(); }, [loadTeams]);

  // Filter by tab (captain / member / discover) + sport from navbar
  const filteredTeams = useMemo(() => {
    return teams.filter(team => {
      const matchSport = Boolean(routeSearch) || !selectedSport || team.sportId === selectedSport;
      const matchSearch = !routeSearch || [team.name, team.location, team.description, team.sportName]
        .some((value) => value?.toLowerCase().includes(routeSearch));
      let matchTab = false;
      if (routeSearch) matchTab = true;
      else if (activeTab === 'captain') matchTab = team.isCaptain;
      else if (activeTab === 'member') matchTab = team.isMember;
      else if (activeTab === 'discover') matchTab = !team.isCaptain && !team.isMember;
      return matchSport && matchTab && matchSearch;
    });
  }, [teams, activeTab, selectedSport, routeSearch]);

  const showToast = (msg) => {
    setAlertMessage(msg);
    setTimeout(() => setAlertMessage(''), 4500);
  };

  const handleSaveTeam = async (data) => {
    try {
      if (editingTeam) await teamService.update(editingTeam.id, data);
      else await teamService.create(data);
      await loadTeams();
      setIsCreateModalOpen(false);
      setEditingTeam(null);
      showToast(editingTeam ? 'Đã cập nhật thông tin CLB.' : 'Đã tạo CLB.');
    } catch (err) {
      throw err;
    }
  };

  const handleJoinTeam = async (team) => {
    try {
      await teamService.join(team.id);
      await loadTeams();
      showToast('Đã gửi yêu cầu tham gia CLB.');
    } catch (err) { showToast(err.message || 'Không gửi được yêu cầu'); }
  };

  const handleReview = async (data) => {
    try {
      await teamService.review(reviewTeam.id, data);
      await loadTeams();
      setReviewTeam(null);
      showToast('Đã lưu đánh giá của bạn.');
    } catch (err) { throw err; }
  };

  const openMembers = async (team) => {
    setMemberDialog(team);
    try {
      setMembers(await teamService.getMembers(team.id));
    } catch (err) {
      setMembers([]);
      showToast(err.message || 'Không tải được danh sách thành viên');
    }
  };

  const updateMember = async (member, status) => {
    try {
      await teamService.setMemberStatus(memberDialog.id, member.user_id, status);
      setMembers((current) => current.filter((item) => item.user_id !== member.user_id));
      await loadTeams();
    } catch (err) { showToast(err.message || 'Không cập nhật được thành viên'); }
  };

  return (
    <div className="min-h-screen bg-transparent dark:bg-transparent text-slate-900 dark:text-[#F6F7ED] relative w-full overflow-x-clip font-sans transition-colors duration-500 selection:bg-[#589470]/30 pb-20">

      {/* Toast Notification Alert */}
      {alertMessage && (
        <div className="fixed top-36 right-6 z-[9999] max-w-md bg-white dark:bg-slate-900 border-2 border-[#589470] text-slate-800 dark:text-white px-5 py-4 rounded-2xl shadow-2xl flex items-start gap-3 animate-in slide-in-from-right duration-300">
          <Sparkles className="w-5 h-5 text-[#589470] shrink-0 mt-0.5" />
          <div className="text-sm font-bold leading-snug flex-1">{alertMessage}</div>
          <button onClick={() => setAlertMessage('')} className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-xs font-bold">✕</button>
        </div>
      )}



      {/* ── Filter Bar Section ── */}
      <div className="navbar-filter-bar pb-4 pt-2 px-4 sm:px-6 sticky top-[112px] sm:top-[132px] z-40 transition-all duration-300">
        <div className="max-w-[1600px] mx-auto bg-white/35 dark:bg-white/[0.08] backdrop-blur-2xl backdrop-saturate-[180%] border border-white/60 dark:border-white/15 rounded-xl sm:rounded-2xl p-1.5 sm:p-2.5 shadow-[0_8px_32px_rgba(0,0,0,0.08),inset_0_1px_1px_0_rgba(255,255,255,0.8),inset_0_0_16px_rgba(255,255,255,0.4)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3),inset_0_1px_1px_0_rgba(255,255,255,0.25),inset_0_0_16px_rgba(255,255,255,0.05)] flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-2 xl:gap-3 transition-all duration-300">
          
          {/* Mobile Header (Toggle + Action Button) */}
          <div className="flex xl:hidden items-center justify-between gap-2 w-full">
            <button 
              onClick={() => setIsMobileFilterOpen(!isMobileFilterOpen)}
              className="flex items-center justify-center gap-1.5 flex-1 bg-white dark:bg-white/10 text-slate-700 dark:text-slate-200 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 font-bold text-sm shadow-sm"
            >
              <Filter className="w-4 h-4" />
              <span>Bộ lọc</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${isMobileFilterOpen ? 'rotate-180' : ''}`} />
            </button>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-3.5 py-1.5 rounded-lg font-bold text-sm bg-gradient-to-r from-[#74C365] to-[#589470] text-white shadow-md flex items-center justify-center gap-1.5 shrink-0 whitespace-nowrap"
            >
              <PlusCircle className="w-4 h-4 shrink-0" />
              <span>Tạo CLB</span>
            </button>
          </div>

          {/* Tab Buttons & Sport Filter */}
          <div className={`${isMobileFilterOpen ? 'flex' : 'hidden'} xl:flex flex-col xl:flex-row items-stretch xl:items-center gap-2 xl:gap-3 flex-1 overflow-x-auto no-scrollbar p-1 -m-1 xl:p-0 xl:m-0 xl:flex-wrap xl:overflow-visible`}>
            {/* Sport Filter */}
            <FilterSelect
              icon={Trophy}
              iconColor="text-amber-500"
              value={selectedSport || 'all'}
              onChange={(e) => setSelectedSport(e.target.value === 'all' ? null : e.target.value)}
            >
              <option value="all">Tất cả môn</option>
              <option value="football">⚽ Bóng đá</option>
              <option value="badminton">🏸 Cầu lông</option>
              <option value="pickleball">🏓 Pickleball</option>
              <option value="tennis">🎾 Tennis</option>
              <option value="basketball">🏀 Bóng rổ</option>
              <option value="volleyball">🏐 Bóng chuyền</option>
            </FilterSelect>

            <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-1.5 sm:gap-2 px-3.5 py-2 sm:px-5 sm:py-2.5 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-bold transition-all duration-200 border-2 shrink-0 whitespace-nowrap ${
                      isActive
                        ? 'bg-white dark:bg-[#001F3F] text-[#589470] dark:text-[#74C365] border-[#589470] dark:border-[#74C365] shadow-md'
                        : 'bg-white dark:bg-[#001F3F]/80 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-white/15 hover:bg-slate-50 dark:hover:bg-white/5 hover:border-slate-300'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right action: Create Button */}
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="hidden xl:flex px-3.5 py-2 xl:px-5 xl:py-2.5 rounded-xl sm:rounded-2xl font-bold text-xs sm:text-sm bg-gradient-to-r from-[#74C365] to-[#589470] hover:opacity-95 text-white shadow-md hover:shadow-lg items-center justify-center gap-1.5 sm:gap-2 transition-all duration-200 active:scale-95 group shrink-0 whitespace-nowrap"
          >
            <PlusCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 group-hover:rotate-90 transition-transform duration-300 shrink-0" />
            <span className="sm:hidden">Tạo CLB</span>
            <span className="hidden sm:inline">Thành lập CLB</span>
          </button>

        </div>
      </div>

      {/* ── Main Teams Feed ── */}
      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 pt-4 sm:pt-6">

        {error && <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">{error}</div>}
        {isLoading ? (
          <div className="py-16 text-center text-sm font-semibold text-slate-500">Đang tải dữ liệu CLB…</div>
        ) : filteredTeams.length === 0 ? (
          <div className="bg-slate-50 dark:bg-white/5 border border-dashed border-slate-200 dark:border-white/10 rounded-3xl p-12 text-center my-6">
            <div className="w-16 h-16 bg-slate-200 dark:bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
              {activeTab === 'captain' ? '👑' : activeTab === 'member' ? '🤝' : '🔍'}
            </div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-1">
              {activeTab === 'captain' && 'Bạn chưa sở hữu CLB nào'}
              {activeTab === 'member' && 'Bạn chưa tham gia CLB nào'}
              {activeTab === 'discover' && 'Không tìm thấy CLB nào'}
            </h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm max-w-md mx-auto mb-6">
              {activeTab === 'captain' && 'Hãy thành lập CLB mới để bắt đầu xây dựng cộng đồng thể thao của riêng bạn!'}
              {activeTab === 'member' && 'Hãy khám phá và tham gia các CLB trong tab "Khám phá CLB" để kết nối cộng đồng!'}
              {activeTab === 'discover' && 'Hiện chưa có CLB nào phù hợp với môn thể thao bạn đang chọn. Thử xóa bộ lọc hoặc thành lập CLB mới!'}
            </p>
            {(activeTab === 'captain' || activeTab === 'discover') && (
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-500 text-white font-bold text-xs shadow-lg active:scale-95 transition-all"
              >
                + Thành lập CLB mới
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {filteredTeams.map((team) => (
              <TeamCard
                key={team.id}
                team={team}
                activeTab={activeTab}
                onReview={() => setReviewTeam(team)}
                onJoin={handleJoinTeam}
                onManageMembers={openMembers}
                onEdit={(item) => { setEditingTeam(item); setIsCreateModalOpen(true); }}
                onChat={(item) => openChat({ id: item.owner_id, name: item.captain })}
              />
            ))}
          </div>
        )}

      </main>

      {/* ── Modals ── */}
      <CreateTeamModal
        isOpen={isCreateModalOpen}
        initialTeam={editingTeam}
        onClose={() => { setIsCreateModalOpen(false); setEditingTeam(null); }}
        onSubmit={handleSaveTeam}
      />

      {reviewTeam && (
        <ReviewTeamModal
          teamId={reviewTeam.id}
          isOpen={!!reviewTeam}
          onClose={() => setReviewTeam(null)}
          onSubmit={handleReview}
        />
      )}

      {memberDialog && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/60 p-4" role="presentation" onClick={() => setMemberDialog(null)}>
          <section className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl dark:bg-slate-900" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-lg font-black">{memberDialog.isCaptain ? 'Yêu cầu tham gia' : 'Thành viên CLB'} · {memberDialog.name}</h2>
              <button onClick={() => setMemberDialog(null)} aria-label="Đóng" className="rounded-lg px-3 py-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10">×</button>
            </div>
            {members.length === 0 ? <p className="py-6 text-center text-sm text-slate-500">{memberDialog.isCaptain ? 'Không có yêu cầu đang chờ.' : 'CLB chưa có thành viên được hiển thị.'}</p> : (
              <ul className="max-h-[60vh] space-y-2 overflow-y-auto">
                {members.map((member) => <li key={member.id} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3 dark:bg-white/5">
                  <div className="min-w-0"><p className="truncate text-sm font-bold">{member.full_name || member.email}</p><p className="text-xs text-slate-500">{member.status}</p></div>
                  {memberDialog.isCaptain && member.status === 'PENDING' && <div className="flex gap-2"><button onClick={() => updateMember(member, 'REJECTED')} className="rounded-lg border px-3 py-1.5 text-xs font-bold">Từ chối</button><button onClick={() => updateMember(member, 'APPROVED')} className="rounded-lg bg-[#589470] px-3 py-1.5 text-xs font-bold text-white">Duyệt</button></div>}
                </li>)}
              </ul>
            )}
          </section>
        </div>
      )}

    </div>
  );
}
