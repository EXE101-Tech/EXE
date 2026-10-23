import { useMemo, useState } from 'react';
import { CalendarDays, CheckCircle2, ClipboardCheck, Users } from 'lucide-react';
import { buildAttendanceHistory } from '../../../shared/utils/attendanceHistory';

const icons = { room: CalendarDays, member: Users, checkin: CheckCircle2, result: ClipboardCheck };
const date = (value) => new Date(/(?:Z|[+-]\d\d:\d\d)$/.test(value) ? value : `${value}Z`);

export default function AttendanceHistory({ events, viewerId }) {
  const [visibleCount, setVisibleCount] = useState(8);
  const activities = useMemo(() => buildAttendanceHistory(events, viewerId), [events, viewerId]);
  const groups = new Map();
  for (const activity of activities.slice(0, visibleCount)) {
    const key = date(activity.created_at).toLocaleDateString('vi-VN');
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(activity);
  }
  return <div className="sg-attendance-history">
    {activities.length ? <>
      <p className="sg-attendance-history-hint">Hoạt động gần đây · Mới nhất trước</p>
      {[...groups].map(([key, items]) => <section className="sg-attendance-history-day" key={key} aria-label={`Hoạt động ngày ${key}`}>
        <h5>{date(items[0].created_at).toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}</h5>
        <ol className="sg-attendance-events">{items.map((activity) => {
          const Icon = icons[activity.kind];
          return <li key={activity.id}>
            <span className={`sg-attendance-event-icon kind-${activity.kind}`}><Icon size={14} aria-hidden="true" /></span>
            <div className="sg-attendance-event-copy"><strong>{activity.title}</strong>{activity.description && <p>{activity.description}</p>}</div>
            <time dateTime={date(activity.created_at).toISOString()}>{date(activity.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</time>
          </li>;
        })}</ol>
      </section>)}
      {activities.length > visibleCount && <button type="button" className="sg-attendance-secondary" onClick={() => setVisibleCount((count) => count + 8)}>Xem thêm hoạt động</button>}
    </> : <p>Chưa có hoạt động được ghi nhận.</p>}
  </div>;
}
