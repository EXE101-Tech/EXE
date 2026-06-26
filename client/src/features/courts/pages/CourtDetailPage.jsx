import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import protonImg from '../../../assets/images/ProtonBadmintonCenter.png';
import eliteImg from '../../../assets/images/EliteFootballArena.png';
import CourtHero from '../components/CourtHero';
import CourtInfo from '../components/CourtInfo';
import CourtFacilities from '../components/CourtFacilities';
import CourtSchedule from '../components/CourtSchedule';
import BookingBar from '../components/BookingBar';
import { courtService, bookingService } from '../../../shared/services/api';


function CourtDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [court, setCourt] = useState(null);
  const [venueCourts, setVenueCourts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [selectedDate, setSelectedDate] = useState(0); // 0 to 6
  const [selectedSlots, setSelectedSlots] = useState(new Set());
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const courtData = await courtService.getById(id);
        
        const mappedCourt = {
          id: courtData.id,
          name: courtData.venue?.name || courtData.name,
          address: courtData.venue?.address || 'TP.HCM',
          sport: courtData.sport?.name || 'thể thao',
          rating: 4.8,
          distance: '1.2 km',
          price: '50k/30m',
          description: courtData.venue?.description || 'Sân thể thao chất lượng cao.',
          image: null,
          facilities: { wifi: true, parking: true, shower: true, canteen: true, rental: true },
        };
        setCourt(mappedCourt);

        if (courtData.venue_id) {
          const courtsInVenue = await courtService.getAll({ venue_id: courtData.venue_id });
          setVenueCourts(courtsInVenue);
        } else {
          setVenueCourts([courtData]);
        }
      } catch (err) {
        console.error("Lỗi tải thông tin sân:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [id]);

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
    
    const courtSlots = {};
    selectedSlots.forEach(slotId => {
      const [cId, time] = slotId.split('-');
      if (!courtSlots[cId]) courtSlots[cId] = [];
      courtSlots[cId].push(time);
    });

    try {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + selectedDate);
      // Ensure we get local date string properly
      const dateStr = targetDate.getFullYear() + '-' + String(targetDate.getMonth() + 1).padStart(2, '0') + '-' + String(targetDate.getDate()).padStart(2, '0');

      const promises = [];
      
      Object.entries(courtSlots).forEach(([cId, times]) => {
        const sortedTimes = times.sort();
        
        let currentBlockStart = sortedTimes[0];
        let currentBlockEnd = add30Mins(currentBlockStart);

        for (let i = 1; i < sortedTimes.length; i++) {
          if (sortedTimes[i] === currentBlockEnd) {
            currentBlockEnd = add30Mins(sortedTimes[i]);
          } else {
            promises.push(
              bookingService.create({
                court_id: parseInt(cId),
                start_time: `${dateStr}T${currentBlockStart}:00`,
                end_time: `${dateStr}T${currentBlockEnd}:00`
              })
            );
            currentBlockStart = sortedTimes[i];
            currentBlockEnd = add30Mins(sortedTimes[i]);
          }
        }
        promises.push(
          bookingService.create({
            court_id: parseInt(cId),
            start_time: `${dateStr}T${currentBlockStart}:00`,
            end_time: `${dateStr}T${currentBlockEnd}:00`
          })
        );
      });

      await Promise.all(promises);
      alert("Đặt sân thành công!");
      navigate('/?tab=bookings');
    } catch (err) {
      console.error(err);
      alert("Lỗi khi đặt sân: " + (err.response?.data?.detail || err.message));
    }
  };

  function add30Mins(timeStr) {
    const [h, m] = timeStr.split(':').map(Number);
    let date = new Date();
    date.setHours(h, m + 30);
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  }

  if (isLoading || !court) {
    return <div className="min-h-screen bg-white dark:bg-gray-950 flex items-center justify-center text-gray-500">Đang tải...</div>;
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 pb-44">
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
      />

      {/* Thanh đặt sân cố định dưới cùng */}
      <BookingBar selectedCount={selectedSlots.size} totalPrice={selectedSlots.size * 50000} onBook={handleBook} />
    </div>
  );
}

export default CourtDetailPage;
