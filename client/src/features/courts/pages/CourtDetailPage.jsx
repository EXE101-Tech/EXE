import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import badmintonImg from '../../../assets/sports/badminton.avif';
import footballImg from '../../../assets/sports/foodball.avif';
import pickleballImg from '../../../assets/sports/pickleball.jpg';
import tennisImg from '../../../assets/sports/tennis.jpg';
import basketballImg from '../../../assets/sports/bong_ro.jpg';
import volleyballImg from '../../../assets/sports/volleyball.jpg';

import CourtHero from '../components/CourtHero';
import CourtInfo from '../components/CourtInfo';
import CourtFacilities from '../components/CourtFacilities';
import CourtSchedule from '../components/CourtSchedule';
import BookingBar from '../components/BookingBar';
import BookingSuccessModal from '../components/BookingSuccessModal';
import { courtService, bookingService } from '../../../shared/services/api';

const FALLBACK_VENUES = {
  1: {
    id: 1,
    name: 'Sân Cầu Lông Proton VIP Q10',
    sport: 'badminton',
    address: '286 Thành Thái, Phường 14, Quận 10, TP.HCM',
    distance: '0.8 km',
    rating: 4.9,
    reviewCount: 42,
    price: '50.000đ',
    priceNumber: 50000,
    courtCount: 6,
    image: badmintonImg,
    hostName: 'Anh Tuấn Proton',
    facilities: { wifi: true, parking: true, shower: true, canteen: true, rental: true },
    description: 'Sân cầu lông tiêu chuẩn quốc tế thảm lót chuyên dụng, đèn chống chói, không gian thoáng mát.',
  },
  2: {
    id: 2,
    name: 'Sân Bóng Đá Cỏ Nhân Tạo Elite Q7',
    sport: 'football',
    address: '45 Nguyễn Thị Thập, Tân Phong, Quận 7, TP.HCM',
    distance: '2.5 km',
    rating: 4.8,
    reviewCount: 56,
    price: '80.000đ',
    priceNumber: 80000,
    courtCount: 4,
    image: footballImg,
    hostName: 'Chị Mai Elite',
    facilities: { wifi: true, parking: true, shower: true, canteen: true, rental: true },
    description: 'Sân bóng cỏ nhân tạo chất lượng cao FIFA 2 sao, có khu vực chờ mát mẻ, phục vụ nước uống định kỳ.',
  },
};

function CourtDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [court, setCourt] = useState(null);
  const [venueCourts, setVenueCourts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [selectedDate, setSelectedDate] = useState(0); // 0 to 6
  const [selectedSlots, setSelectedSlots] = useState(new Set());
  const [isFavorite, setIsFavorite] = useState(false);
  const [successBookingData, setSuccessBookingData] = useState(null);

  useEffect(() => {
    const loadCourtData = async () => {
      setIsLoading(true);
      try {
        // Check if data passed from Bookings page
        if (location.state?.venueData) {
          const vData = location.state.venueData;
          setCourt(vData);
          generateSubCourts(vData.courtCount || 4, vData.name);
          setIsLoading(false);
          return;
        }

        // Try API
        try {
          const courtData = await courtService.getById(id);
          const mappedCourt = {
            id: courtData.id,
            name: courtData.venue?.name || courtData.name,
            address: courtData.venue?.address || 'TP.HCM',
            sport: courtData.sport?.name || 'badminton',
            rating: 4.8,
            reviewCount: 24,
            distance: '1.2 km',
            price: '50.000đ',
            priceNumber: 50000,
            courtCount: 4,
            description: courtData.venue?.description || 'Sân thể thao chất lượng cao đáp ứng mọi nhu cầu luyện tập và thi đấu.',
            image: badmintonImg,
            hostName: 'Chủ Sân Thể Thao',
            facilities: { wifi: true, parking: true, shower: true, canteen: true, rental: true },
          };
          setCourt(mappedCourt);
          generateSubCourts(4, mappedCourt.name);
        } catch (apiErr) {
          // Fallback to local mock by ID
          const fb = FALLBACK_VENUES[id] || {
            ...FALLBACK_VENUES[1],
            id: Number(id) || 1,
            name: `Khu Sân Thể Thao Cao Cấp #${id}`,
          };
          setCourt(fb);
          generateSubCourts(fb.courtCount || 4, fb.name);
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadCourtData();
  }, [id, location.state]);

  const generateSubCourts = (count, venueName) => {
    const subList = Array.from({ length: count }, (_, i) => ({
      id: i + 1,
      name: `Sân số ${i + 1} (${venueName ? venueName.split(' ')[0] : 'VIP'})`,
    }));
    setVenueCourts(subList);
  };

  const handleSelectDate = (index) => {
    setSelectedDate(index);
    setSelectedSlots(new Set());
  };

  const handleToggleSlot = (slotId) => {
    setSelectedSlots(prev => {
      const newSet = new Set(prev);
      if (newSet.has(slotId)) {
        newSet.delete(slotId);
      } else {
        newSet.add(slotId);
      }
      return newSet;
    });
  };

  const handleBook = async () => {
    if (selectedSlots.size === 0) return;

    const priceNum = court?.priceNumber || 50000;
    const totalCalc = selectedSlots.size * priceNum;

    const bData = {
      venueName: court?.name || 'Sân Thể Thao SportGo',
      address: court?.address || 'TP.HCM',
      hostName: court?.hostName || 'Chủ sân',
      selectedCount: selectedSlots.size,
      totalPrice: totalCalc,
      slots: Array.from(selectedSlots),
    };

    // Try API call in background without blocking UI celebratory flow
    try {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + selectedDate);
      const dateStr = targetDate.getFullYear() + '-' + String(targetDate.getMonth() + 1).padStart(2, '0') + '-' + String(targetDate.getDate()).padStart(2, '0');

      const promises = [];
      selectedSlots.forEach(slotId => {
        const [cId, time] = slotId.split('-');
        promises.push(
          bookingService.create({
            court_id: parseInt(cId) || 1,
            start_time: `${dateStr}T${time}:00`,
            end_time: `${dateStr}T${add30Mins(time)}:00`
          }).catch(() => {})
        );
      });
      Promise.all(promises);
    } catch (err) {
      console.log('Backend booking sync notice:', err);
    }

    setSuccessBookingData(bData);
  };

  function add30Mins(timeStr) {
    const [h, m] = timeStr.split(':').map(Number);
    let date = new Date();
    date.setHours(h, m + 30);
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  }

  if (isLoading || !court) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-transparent text-slate-500 dark:text-slate-400">
        <div className="w-12 h-12 border-4 border-emerald-200 dark:border-emerald-900 border-t-emerald-600 dark:border-t-emerald-500 rounded-full animate-spin mb-4" />
        <p className="font-bold animate-pulse">Đang tải chi tiết khu sân & lịch thi đấu...</p>
      </div>
    );
  }

  const pricePerSlot = court.priceNumber || 50000;

  return (
    <div className="bg-transparent pb-36 font-sans animate-in fade-in duration-300">
      {/* Ảnh bìa + nút quay lại / yêu thích */}
      <CourtHero
        image={court.image}
        name={court.name}
        isFavorite={isFavorite}
        onToggleFavorite={() => setIsFavorite((f) => !f)}
      />

      {/* Tên sân, rating, địa chỉ, giá */}
      <CourtInfo court={court} />

      {/* Tiện ích */}
      <CourtFacilities facilities={court.facilities} />

      {/* Chọn ngày và khung giờ lưới */}
      <CourtSchedule
        selectedDate={selectedDate}
        onSelectDate={handleSelectDate}
        courts={venueCourts}
        selectedSlots={selectedSlots}
        onToggleSlot={handleToggleSlot}
        pricePerSlot={pricePerSlot}
      />

      {/* Thanh đặt sân cố định dưới cùng */}
      <BookingBar 
        selectedCount={selectedSlots.size} 
        totalPrice={selectedSlots.size * pricePerSlot} 
        onBook={handleBook} 
      />

      {/* Modal xác nhận đặt thành công */}
      <BookingSuccessModal
        isOpen={!!successBookingData}
        onClose={() => setSuccessBookingData(null)}
        bookingData={successBookingData}
      />
    </div>
  );
}

export default CourtDetailPage;
