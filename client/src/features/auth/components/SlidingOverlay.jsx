import { Zap, CheckCircle2 } from 'lucide-react';

const FEATURES = ['Tìm bạn chơi phù hợp', 'Diễn đàn thể thao'];

function SlidingOverlay({ isActive, onShowRegister, onShowLogin }) {
  return (
    /*
     * Khung overlay: rộng 50%, định vị tuyệt đối.
     * isActive=false → nửa trái  (che panel đăng ký, hiện panel đăng nhập)
     * isActive=true  → nửa phải  (che panel đăng nhập, hiện panel đăng ký)
     */
    <div
      className={`absolute top-0 left-0 w-1/2 h-full overflow-hidden z-10
        transition-transform duration-700 ease-in-out
        ${isActive ? 'translate-x-full' : 'translate-x-0'}`}
    >
      {/*
       * Div bên trong: rộng 200%, chứa 2 panel đặt cạnh nhau.
       * isActive=false → translate-x-0    → Hiện Panel 1 ("Xin chào!")
       * isActive=true  → -translate-x-1/2 → Hiện Panel 2 ("Chào mừng trở lại!")
       */}
      <div
        className={`relative w-[200%] h-full flex
          bg-gradient-to-br from-blue-700 to-blue-950
          transition-transform duration-700 ease-in-out
          ${isActive ? '-translate-x-1/2' : 'translate-x-0'}`}
      >
        {/* ── Panel 1: thương hiệu + kêu gọi đăng ký ── */}
        <div className="w-1/2 flex flex-col items-center justify-center px-10 xl:px-16 text-center text-white">
          <div className="w-16 h-16 bg-white/15 rounded-2xl flex items-center justify-center mb-6">
            <Zap className="w-8 h-8 text-white fill-white" />
          </div>
          <h1 className="text-2xl xl:text-3xl font-bold leading-tight">
            Cộng đồng
          </h1>
          <h1 className="text-2xl xl:text-3xl font-bold text-yellow-300 leading-tight mb-4">
            Thể Thao SportGo
          </h1>
          <p className="text-white/75 text-sm leading-relaxed mb-6 max-w-xs">
            Kết nối người chơi, tìm bạn đồng hành và chia sẻ đam mê thể thao trên
            cùng một nền tảng.
          </p>
          <div className="flex flex-col gap-2.5 mb-8 w-full max-w-xs">
            {FEATURES.map((label) => (
              <div key={label} className="flex items-center gap-2.5">
                <CheckCircle2 className="text-cyan-300 w-4 h-4 shrink-0" />
                <span className="text-white/90 text-sm border border-white/25 rounded-full px-4 py-1">
                  {label}
                </span>
              </div>
            ))}
          </div>
          <div className="w-full max-w-xs h-px bg-white/20 mb-6" />
          <p className="text-white/70 text-sm mb-4">Chưa có tài khoản?</p>
          <button
            onClick={onShowRegister}
            className="px-8 py-2.5 border-2 border-white/60 rounded-full text-sm font-semibold hover:bg-white hover:text-blue-700 transition-colors duration-200"
          >
            Đăng ký ngay
          </button>
        </div>

        {/* ── Panel 2: chào mừng trở lại + kêu gọi đăng nhập ── */}
        <div className="w-1/2 flex flex-col items-center justify-center px-10 xl:px-16 text-center text-white">
          <div className="w-16 h-16 bg-white/15 rounded-2xl flex items-center justify-center mb-6">
            <Zap className="w-8 h-8 text-white fill-white" />
          </div>
          <h2 className="text-2xl xl:text-3xl font-bold mb-3">Chào mừng trở lại!</h2>
          <p className="text-white/75 text-sm leading-relaxed mb-8 max-w-xs">
            Đăng nhập để kết nối bạn bè và theo dõi hoạt động thể thao của bạn.
          </p>
          <div className="w-full max-w-xs h-px bg-white/20 mb-8" />
          <p className="text-white/70 text-sm mb-4">Đã có tài khoản?</p>
          <button
            onClick={onShowLogin}
            className="px-8 py-2.5 border-2 border-white/60 rounded-full text-sm font-semibold hover:bg-white hover:text-blue-700 transition-colors duration-200"
          >
            Đăng nhập ngay
          </button>
        </div>
      </div>
    </div>
  );
}

export default SlidingOverlay;
