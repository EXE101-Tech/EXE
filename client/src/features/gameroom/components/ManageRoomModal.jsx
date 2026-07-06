import React from 'react';
import { X, Check, UserCheck, UserX, ShieldCheck, Crown, Users, Clock, AlertCircle } from 'lucide-react';

function ManageRoomModal({ isOpen, onClose, room, onUpdateStatus, isLoading = false }) {
  if (!isOpen || !room) return null;

  const {
    title,
    max_players = 6,
    host = { name: 'Bạn (Trưởng phòng)' },
    participants = [],
  } = room;

  const pendingList = participants.filter((p) => p.status === 'PENDING' || !p.status);
  const approvedList = participants.filter((p) => p.status === 'APPROVED');

  return (
    <div className="fixed inset-0 z-[1050] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
      <div 
        className="relative w-full max-w-2xl bg-white dark:bg-[#001F3F] border border-gray-200 dark:border-white/10 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 my-8 flex flex-col max-h-[88vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="relative bg-gradient-to-r from-[#74C365] to-[#589470] p-6 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-sm">
              <UserCheck className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-xl font-black">Quản Lý Thành Viên Phòng Chờ</h3>
              <p className="text-xs opacity-90 break-words max-w-md">{title}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full bg-black/10 hover:bg-black/20 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6 text-slate-900 dark:text-white">
          {/* Summary bar */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-[#589470] dark:text-[#DBE64C]" />
              <span className="font-semibold">Sĩ số phòng hiện tại:</span>
            </div>
            <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
              {approvedList.length + 1} / {max_players} Thành viên
            </span>
          </div>

          {/* Pending List (Danh sách chờ phê duyệt) */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-3 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-amber-500" />
              <span>Danh sách chờ duyệt ({pendingList.length})</span>
            </h3>

            {pendingList.length === 0 ? (
              <div className="p-6 rounded-2xl bg-slate-50/50 dark:bg-white/[0.02] border border-dashed border-slate-200 dark:border-white/10 text-center text-xs text-slate-400">
                Hiện không có yêu cầu xin gia nhập nào đang chờ duyệt.
              </div>
            ) : (
              <div className="space-y-2.5">
                {pendingList.map((participant) => {
                  const userName = participant.user?.name || participant.name || 'Người chơi';
                  const userAvatar = participant.user?.avatar || '';
                  const userId = participant.user_id || participant.id;

                  return (
                    <div
                      key={userId}
                      className="flex items-center justify-between p-3.5 rounded-2xl bg-amber-500/[0.05] border border-amber-500/20 hover:bg-amber-500/[0.08] transition-all"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 text-white font-bold flex items-center justify-center shrink-0 shadow-sm">
                          {userName.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <span className="text-sm font-bold text-slate-900 dark:text-white block truncate">
                            {userName}
                          </span>
                          <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                            ⏱ Vừa xin gia nhập
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => onUpdateStatus(room.id, userId, 'REJECTED')}
                          disabled={isLoading}
                          className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 font-bold text-xs transition-all flex items-center gap-1"
                          title="Từ chối"
                        >
                          <UserX className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Từ chối</span>
                        </button>

                        <button
                          onClick={() => onUpdateStatus(room.id, userId, 'APPROVED')}
                          disabled={isLoading || approvedList.length + 1 >= max_players}
                          className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-500/20 active:scale-95 transition-all flex items-center gap-1"
                          title="Chấp nhận vào phòng"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Duyệt vào</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Approved List (Thành viên chính thức) */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-3 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Thành viên chính thức ({approvedList.length + 1})</span>
            </h3>

            <div className="space-y-2">
              {/* Host item */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-emerald-500/[0.08] border border-emerald-500/30">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 text-white font-bold flex items-center justify-center shrink-0 shadow-sm relative">
                    <span>{(host.name || 'H').charAt(0).toUpperCase()}</span>
                    <Crown className="w-3 h-3 absolute -top-1 -right-1 text-amber-300" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-sm font-bold text-slate-900 dark:text-white block truncate">
                      {host.name || 'Bạn'}
                    </span>
                    <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400">
                      👑 Trưởng phòng (Chủ phòng)
                    </span>
                  </div>
                </div>
                <span className="text-xs font-bold text-slate-400 px-3 py-1 rounded-full bg-slate-200 dark:bg-white/10">
                  Host
                </span>
              </div>

              {/* Other approved members */}
              {approvedList.map((participant) => {
                const userName = participant.user?.name || participant.name || 'Người chơi';
                const userId = participant.user_id || participant.id;

                return (
                  <div
                    key={userId}
                    className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold flex items-center justify-center shrink-0 shadow-sm">
                        {userName.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <span className="text-sm font-bold text-slate-900 dark:text-white block truncate">
                          {userName}
                        </span>
                        <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                          ✔ Thành viên chính thức
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => onUpdateStatus(room.id, userId, 'REJECTED')}
                      className="px-3 py-1.5 rounded-xl text-rose-500 hover:bg-rose-500/10 text-xs font-semibold transition-all"
                      title="Xóa khỏi phòng"
                    >
                      Xóa
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] flex items-center justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs shadow-md hover:bg-slate-800 dark:hover:bg-slate-100 transition-all active:scale-95"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}

export default ManageRoomModal;
