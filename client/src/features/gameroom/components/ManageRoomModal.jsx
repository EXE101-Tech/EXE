import React from 'react';
import { X, Check, UserCheck, UserX, ShieldCheck, Crown, Users, Clock, AlertCircle, Pencil, Trash2 } from 'lucide-react';

function ManageRoomModal({ isOpen, onClose, room, onUpdateStatus, onUpdateAttendance, onEdit, onDelete, isLoading = false }) {
  if (!isOpen || !room) return null;

  const {
    title,
    end_time,
    max_players = 6,
    host = { name: 'Bạn (Trưởng phòng)' },
    participants = [],
  } = room;
  const hostAvatar = host.avatar || host.avatar_url || '';

  const pendingList = participants.filter((p) => p.status === 'PENDING' || !p.status);
  const approvedList = participants.filter((p) => p.status === 'APPROVED');
  const hasEnded = Boolean(end_time) && new Date(end_time).getTime() <= Date.now() && room.status !== 'CANCELLED';
  const isClosed = ['CLOSED', 'CANCELLED', 'FINISHED'].includes(room.status) || hasEnded;
  const canConfirmAttendance = hasEnded && room.status !== 'CANCELLED';

  const renderAttendanceControls = (userId, attendanceStatus) => canConfirmAttendance && (
    <div className="mt-2 flex flex-wrap items-center gap-1.5">
      <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 mr-0.5">Kết quả:</span>
      <button
        type="button"
        onClick={() => onUpdateAttendance?.(room.id, userId, 'ATTENDED')}
        disabled={isLoading}
        aria-pressed={attendanceStatus === 'ATTENDED'}
        className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-colors disabled:opacity-60 ${attendanceStatus === 'ATTENDED' ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-600 dark:text-emerald-400' : 'border-slate-300 dark:border-white/15 text-slate-600 dark:text-slate-300 hover:bg-emerald-500/10'}`}
      >
        Đã tham gia
      </button>
      <button
        type="button"
        onClick={() => onUpdateAttendance?.(room.id, userId, 'ABSENT')}
        disabled={isLoading}
        aria-pressed={attendanceStatus === 'ABSENT'}
        className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-colors disabled:opacity-60 ${attendanceStatus === 'ABSENT' ? 'bg-rose-500/15 border-rose-500/40 text-rose-600 dark:text-rose-400' : 'border-slate-300 dark:border-white/15 text-slate-600 dark:text-slate-300 hover:bg-rose-500/10'}`}
      >
        Không tham gia
      </button>
    </div>
  );

  return (
    <div className="sg-modal-backdrop fixed inset-0 z-[1050] flex items-center justify-center p-4 animate-in fade-in duration-200 overflow-y-auto">
      <div 
        className="sg-modal-card relative my-8 flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="sg-modal-header relative flex items-center justify-between p-6 shrink-0">
          <div className="flex items-center gap-3">
            <div className="sg-modal-header-icon flex h-11 w-11 items-center justify-center rounded-2xl shadow-sm">
              <UserCheck className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-xl font-black">Quản lý phòng chờ</h3>
              <p className="text-xs opacity-90 break-words max-w-md">{title}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="sg-modal-close rounded-full p-2 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="sg-modal-body flex-1 space-y-6 overflow-y-auto p-6 custom-scrollbar">
          {/* Summary bar */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs">
            <div className="flex items-center gap-2">
              <Users className="sg-modal-accent-icon w-4 h-4" />
              <span className="font-semibold">Sĩ số phòng hiện tại:</span>
            </div>
            <span className="sg-modal-count text-sm font-black">
              {approvedList.length + 1} / {max_players} Thành viên
            </span>
          </div>

          {/* Pending List (Danh sách chờ phê duyệt) */}
          <div>
            <h3 className="sg-modal-accent-text text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Clock className="sg-modal-accent-icon w-4 h-4" />
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
                  const userAvatar = participant.user?.avatar || participant.user?.avatar_url || participant.avatar || '';
                  const userId = participant.user_id || participant.id;

                  return (
                    <div
                      key={userId}
                      className="sg-modal-pending flex items-center justify-between p-3.5 rounded-2xl border transition-all"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="sg-modal-avatar w-10 h-10 rounded-full overflow-hidden text-white font-bold flex items-center justify-center shrink-0 shadow-sm">
                          {userAvatar ? <img src={userAvatar} alt="" className="h-full w-full object-cover" /> : userName.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <span className="text-sm font-bold text-slate-900 dark:text-white block truncate">
                            {userName}
                          </span>
                          <span className="sg-modal-accent-text text-[11px] font-medium">
                            ⏱ Vừa xin gia nhập
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => onUpdateStatus(room.id, userId, 'REJECTED')}
                          disabled={isLoading || isClosed}
                          className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 font-bold text-xs transition-all flex items-center gap-1"
                          title="Từ chối"
                        >
                          <UserX className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Từ chối</span>
                        </button>

                        <button
                          onClick={() => onUpdateStatus(room.id, userId, 'APPROVED')}
                          disabled={isLoading || isClosed || approvedList.length + 1 >= max_players}
                          className="sg-modal-primary px-4 py-1.5 rounded-xl font-bold text-xs shadow-md active:scale-95 transition-all flex items-center gap-1"
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
            <h3 className="sg-modal-accent-text text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <ShieldCheck className="sg-modal-accent-icon w-4 h-4" />
              <span>Thành viên chính thức ({approvedList.length + 1})</span>
            </h3>

            <div className="space-y-2">
              {/* Host item */}
              <div className="sg-modal-approved flex items-center justify-between p-3.5 rounded-2xl border">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative w-10 h-10 shrink-0">
                    <div className="sg-modal-avatar w-10 h-10 rounded-full overflow-hidden text-white font-bold flex items-center justify-center shadow-sm">
                      {hostAvatar ? <img src={hostAvatar} alt="" className="h-full w-full object-cover" /> : <span>{(host.name || 'H').charAt(0).toUpperCase()}</span>}
                    </div>
                    <Crown className="sg-modal-accent-icon w-3 h-3 absolute -top-1 -right-1" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-sm font-bold text-slate-900 dark:text-white block truncate">
                      {host.name || 'Bạn'}
                    </span>
                    <span className="sg-modal-role text-[11px] font-bold">
                      👑 Chủ phòng
                    </span>
                  </div>
                </div>
              </div>

              {/* Other approved members */}
              {approvedList.map((participant) => {
                const userName = participant.user?.name || participant.name || 'Người chơi';
                const userAvatar = participant.user?.avatar || participant.user?.avatar_url || participant.avatar || '';
                const userId = participant.user_id || participant.id;

                return (
                  <div
                    key={userId}
                    className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="sg-modal-avatar w-10 h-10 rounded-full overflow-hidden text-white font-bold flex items-center justify-center shrink-0 shadow-sm">
                        {userAvatar ? <img src={userAvatar} alt="" className="h-full w-full object-cover" /> : userName.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <span className="text-sm font-bold text-slate-900 dark:text-white block truncate">
                          {userName}
                        </span>
                        <span className="sg-modal-accent-text text-[11px] font-medium">
                          ✔ Thành viên chính thức
                        </span>
                        {renderAttendanceControls(userId, participant.attendance_status)}
                      </div>
                    </div>

                    {!isClosed && <button
                      onClick={() => onUpdateStatus(room.id, userId, 'REJECTED')}
                      disabled={isLoading}
                      className="px-3 py-1.5 rounded-xl text-rose-500 hover:bg-rose-500/10 text-xs font-semibold transition-all disabled:opacity-50"
                      title="Xóa khỏi phòng"
                    >
                      Xóa
                    </button>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="sg-modal-footer flex flex-wrap items-center justify-between gap-2 p-4 shrink-0">
          <div className="flex flex-wrap items-center gap-2">
            {!isClosed && <button
              onClick={() => onEdit?.(room)}
              disabled={isLoading}
              className="sg-modal-secondary flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all disabled:opacity-50"
            >
              <Pencil className="w-4 h-4" /> Chỉnh sửa phòng
            </button>}
            <button
              onClick={() => onDelete?.(room)}
              disabled={isLoading}
              className="sg-modal-danger flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" /> Xóa phòng
            </button>
          </div>
          <button
            onClick={onClose}
            className="sg-modal-primary rounded-xl px-6 py-2.5 text-xs font-bold shadow-md transition-all active:scale-95"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}

export default ManageRoomModal;
