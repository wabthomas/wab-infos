import fs from 'node:fs';
const file = 'apps/redaction/src/components/redaction/rh/attendance-review.tsx';
let text = fs.readFileSync(file, 'utf8');
const body = `  const [endTime, setEndTime] = useState(ATTENDANCE_END_TIME);
  useEffect(() => {
    fetchRedaction('/api/redaction/rh/organisation', { cache: 'no-store' })
      .then(async (response) => { if (!response.ok) return; const data = await response.json(); if (data.settings?.attendanceEndTime) setEndTime(data.settings.attendanceEndTime); })
      .catch(() => undefined);
  }, []);
`;
const before = text;
text = text.replace(/(export function AttendanceReview\([^\n]*\) \{\r?\n)/, `$1${body}`);
fs.writeFileSync(file, text, 'utf8');
console.log(text === before ? 'MISS' : 'STATE_OK');
