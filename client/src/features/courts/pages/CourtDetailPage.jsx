import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
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

const SPORT_IMAGES = {
  badminton: badmintonImg,
  football: footballImg,
  pickleball: pickleballImg,
  tennis: tennisImg,
  basketball: basketballImg,
  volleyball: volleyballImg,
};

function mapVenue(data) {
  const sport = data.sport_key || data.courts?.[0]?.sport?.name?.toLowerCase() || '';
  return {
    ...data,
    sport,
    image: data.image_url || SPORT_IMAGES[sport],
    price: data.price_label || '',
    courtCount: data.court_count ?? data.courts?.length ?? 0,
    facilities: data.facilities || {},
    hostName: data.owner_name || '',
  };
}

const getVietnamDate = (offset = 0) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  const day = new Date(Date.UTC(Number(values.year), Number(values.month) - 1, Number(values.day) + offset));
  return `${day.getUTCFullYear()}-${String(day.getUTCMonth() + 1).padStart(2, '0')}-${String(day.getUTCDate()).padStart(2, '0')}`;
};

function toUtcEpoch(value) {
  const normalized = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(value) ? value : `${value}Z`;
  return new Date(normalized).getTime();
}

function makeUnavailableSlots(bookings, day) {
  const unavailable = new Set();
  const slotTimes = Array.from({ length: 36 }, (_, index) => {
    const minutes = 360 + index * 30;
    return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${minutes % 60 ? '30' : '00'}`;
  });

  bookings.forEach((booking) => {
    const start = toUtcEpoch(booking.start_time);
    const end = toUtcEpoch(booking.end_time);
    if (!Number.isFinite(start) || !Number.isFinite(end)) return;
    slotTimes.forEach((time) => {
      const slotStart = new Date(`${day}T${time}:00+07:00`).getTime();
      const slotEnd = slotStart + 30 * 60 * 1000;
      if (start < slotEnd && end > slotStart) unavailable.add(`${booking.court_id}|${time}`);
    });
  });
  return unavailable;
}

function CourtDetailPage() {
  const { id } = useParams();
  const [venue, setVenue] = useState(null);
  const [courts, setCourts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedDate, setSelectedDate] = useState(() => getVietnamDate());
  const [selectedSlots, setSelectedSlots] = useState(new Set());
  const [unavailableSlots, setUnavailableSlots] = useState(new Set());
  const [isAvailabilityLoading, setIsAvailabilityLoading] = useState(true);
  const [availabilityError, setAvailabilityError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const [successBookingData, setSuccessBookingData] = useState(null);

  const loadVenue = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await courtService.getVenueById(id);
      setVenue(mapVenue(data));
      setCourts((data.courts || []).filter((court) => court.is_active !== false));
      setIsAvailabilityLoading(true);
      setUnavailableSlots(new Set());
      setAvailabilityError('');
    } catch (loadError) {
      setError(loadError.message || 'Không tải được thông tin sân từ máy chủ.');
      setVenue(null);
      setCourts([]);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    let active = true;
    courtService.getVenueById(id)
      .then((data) => {
        if (!active) return;
        setVenue(mapVenue(data));
        setCourts((data.courts || []).filter((court) => court.is_active !== false));
        setUnavailableSlots(new Set());
        setAvailabilityError('');
        setIsAvailabilityLoading(true);
      })
      .catch((loadError) => {
        if (!active) return;
        setError(loadError.message || 'Không tải được thông tin sân từ máy chủ.');
        setVenue(null);
        setCourts([]);
      })
      .finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; };
  }, [id]);

  useEffect(() => {
    let active = true;
    if (!venue?.id) return () => { active = false; };

    bookingService.getAvailability(venue.id, selectedDate)
      .then((bookings) => {
        if (active) setUnavailableSlots(makeUnavailableSlots(bookings, selectedDate));
      })
      .catch((loadError) => {
        if (active) setAvailabilityError(loadError.message || 'Không tải được lịch đặt sân.');
      })
      .finally(() => { if (active) setIsAvailabilityLoading(false); });
    return () => { active = false; };
  }, [venue?.id, selectedDate]);

  const handleSelectDate = (date) => {
    setSelectedDate(date);
    setSelectedSlots(new Set());
    setUnavailableSlots(new Set());
    setAvailabilityError('');
    setIsAvailabilityLoading(true);
    setBookingError('');
  };

  const handleToggleSlot = (slotId) => {
    setBookingError('');
    setSelectedSlots((previous) => {
      const next = new Set(previous);
      if (next.has(slotId)) next.delete(slotId);
      else next.add(slotId);
      return next;
    });
  };

  const selectedItems = useMemo(() => Array.from(selectedSlots).map((slotId) => {
    const [courtId, time] = slotId.split('|');
    const court = courts.find((item) => item.id === Number(courtId));
    return { court, time };
  }).filter((item) => item.court), [selectedSlots, courts]);

  const totalPrice = selectedItems.reduce((total, { court }) => total + Number(court.price_per_hour || 0) / 2, 0);
  const displayPricePerSlot = courts.length
    ? Math.min(...courts.map((court) => Number(court.price_per_hour || 0))) / 2
    : 0;

  const handleBook = async () => {
    if (!selectedItems.length || isSubmitting || isAvailabilityLoading || availabilityError) return;
    setIsSubmitting(true);
    setBookingError('');
    try {
      const bookings = selectedItems.map(({ court, time }) => {
        const start = new Date(`${selectedDate}T${time}:00+07:00`);
        const end = new Date(start.getTime() + 30 * 60 * 1000);
        return {
          court_id: court.id,
          start_time: start.toISOString(),
          end_time: end.toISOString(),
        };
      });
      const created = await bookingService.createBatch(bookings);
      const newUnavailable = new Set(unavailableSlots);
      selectedItems.forEach(({ court, time }) => newUnavailable.add(`${court.id}|${time}`));
      setUnavailableSlots(newUnavailable);
      setSuccessBookingData({
        venueName: venue.name,
        address: venue.address,
        hostName: venue.hostName,
        ownerId: venue.owner_id,
        bookingIds: created.map((booking) => booking.id),
        selectedCount: created.length,
        totalPrice: created.reduce((total, booking) => total + Number(booking.total_price || 0), 0),
        date: selectedDate,
        slots: selectedItems.map(({ court, time }) => `${court.name} · ${time}`),
      });
      setSelectedSlots(new Set());
    } catch (bookError) {
      setBookingError(bookError.message || 'Không thể hoàn tất đặt sân. Vui lòng tải lại lịch và thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <div className="min-h-[50vh] flex items-center justify-center text-slate-500">Đang tải thông tin sân…</div>;
  }

  if (error || !venue) {
    return (
      <div className="max-w-3xl mx-auto my-12 rounded-2xl border border-rose-200 bg-white p-6 text-center dark:bg-slate-900">
        <p className="font-semibold text-rose-700 dark:text-rose-300">{error || 'Không tìm thấy sân.'}</p>
        <button type="button" onClick={loadVenue} className="mt-4 rounded-xl bg-emerald-600 px-5 py-2 font-bold text-white">Thử tải lại</button>
      </div>
    );
  }

  return (
    <div className="bg-transparent pb-36 font-sans animate-in fade-in duration-300">
      <CourtHero image={venue.image} name={venue.name} />
      <CourtInfo court={venue} />
      <CourtFacilities facilities={venue.facilities} />

      {!courts.length && (
        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
          Sân này chưa có sân con đang hoạt động nên hiện chưa thể đặt trực tuyến. Vui lòng liên hệ chủ sân.
        </div>
      )}

      {!!courts.length && (
        <>
          <CourtSchedule
            selectedDate={selectedDate}
            onSelectDate={handleSelectDate}
            courts={courts}
            selectedSlots={selectedSlots}
            unavailableSlots={unavailableSlots}
            onToggleSlot={handleToggleSlot}
            pricePerSlot={displayPricePerSlot}
            isAvailabilityLoading={isAvailabilityLoading}
            availabilityError={availabilityError}
          />
          {(bookingError || availabilityError) && (
            <div role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-800">
              {bookingError || availabilityError}
            </div>
          )}
          <BookingBar
            selectedCount={selectedSlots.size}
            totalPrice={totalPrice}
            onBook={handleBook}
            isSubmitting={isSubmitting}
            disabled={isAvailabilityLoading || !!availabilityError}
          />
        </>
      )}

      <BookingSuccessModal
        isOpen={!!successBookingData}
        onClose={() => setSuccessBookingData(null)}
        bookingData={successBookingData}
      />
    </div>
  );
}

export default CourtDetailPage;
