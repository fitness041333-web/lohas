import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  User,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Trash2,
  Edit3,
  Plus,
  Database,
  CheckSquare,
  Shield,
  LogOut,
  AlertCircle,
  Users,
  Heart,
  Sparkles,
  Star,
  Filter,
  UserCheck,
  PlayCircle,
  Lock,
  Unlock,
  Mail,
  Dumbbell,
  Printer,
  ClipboardList,
  BookOpen,
  Repeat,
  Globe,
  Bell,
  CircleDollarSign,
  Save,
  Info,
  UserPlus,
  CheckCircle,
  Calculator,
  FileText,
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import {
  getFirestore,
  collection,
  onSnapshot,
  doc,
  setDoc,
  deleteDoc,
  updateDoc,
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyBQZnv-mm_KWaq5MX80VO_8tsnrjL4Xx_0',
  authDomain: 'lohas-class-arrange-a64ba.firebaseapp.com',
  projectId: 'lohas-class-arrange-a64ba',
  storageBucket: 'lohas-class-arrange-a64ba.firebasestorage.app',
  messagingSenderId: '881102029383',
  appId: '1:881102029383:web:e6c734912c99ab0105e762',
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const INITIAL_TEACHERS = [
  { id: 1, name: '陳立明', avatar: 'bg-teal-400', defaultRate: 500 },
  { id: 2, name: '林雅婷', avatar: 'bg-rose-400', defaultRate: 500 },
  { id: 3, name: '王大偉', avatar: 'bg-orange-400', defaultRate: 600 },
  { id: 4, name: '張心潔', avatar: 'bg-indigo-400', defaultRate: 450 },
];

const DEFAULT_ADMIN = {
  id: 'super_admin',
  name: '高級管理員',
  username: 'admin',
  password: '123',
};
const DAY_NAMES = ['日', '一', '二', '三', '四', '五', '六'];

const TIMES = [];
for (let h = 8; h < 23; h++) {
  TIMES.push(
    `${String(h).padStart(2, '0')}:00`,
    `${String(h).padStart(2, '0')}:30`
  );
}
const END_TIMES = [...TIMES.slice(1), '23:00'];

const formatDateLocal = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`;
const parseLocalDate = (ds) => {
  if (!ds) return new Date();
  const p = String(ds).split('-');
  return p.length === 3
    ? new Date(parseInt(p[0], 10), parseInt(p[1], 10) - 1, parseInt(p[2], 10))
    : new Date(ds);
};

const getCurrentWeek = (baseDate) => {
  const curr = new Date(baseDate),
    first = curr.getDate() - curr.getDay() + (curr.getDay() === 0 ? -6 : 1),
    days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(curr.getFullYear(), curr.getMonth(), first + i);
    days.push({
      dateStr: formatDateLocal(d),
      displayDate: `${d.getMonth() + 1}/${d.getDate()}`,
      dayName: DAY_NAMES[d.getDay()],
    });
  }
  return days;
};

const getAvailableEndTimes = (st) => END_TIMES.filter((t) => t > st);
const formatDateTime = (ts) => {
  if (!ts) return '-';
  const d = new Date(ts);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(
    2,
    '0'
  )}/${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(
    2,
    '0'
  )}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const calculateBonusPercent = (hrs) =>
  hrs >= 71
    ? 0.16
    : hrs >= 61
    ? 0.12
    : hrs >= 51
    ? 0.08
    : hrs >= 41
    ? 0.05
    : hrs >= 33
    ? 0.03
    : 0;

const globalStyles = `
  .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
  .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
  .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
  .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #818cf8; }
  @media print {
    body { background-color: white !important; }
    .no-print, nav, main { display: none !important; }
    .fixed.inset-0 { position: relative !important; display: block !important; background: white !important; padding: 0 !important; margin: 0 !important; overflow: visible !important; }
    .printable-area { position: relative !important; width: 100% !important; height: auto !important; padding: 0 !important; box-shadow: none !important; margin: 0 !important; overflow: visible !important; }
    table { page-break-inside: auto; }
    tr { page-break-inside: avoid; page-break-after: auto; }
    thead { display: table-header-group; }
  }
`;

export default function App() {
  const [fbUser, setFbUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [currentView, setCurrentView] = useState('home');
  const [adminTab, setAdminTab] = useState('schedule');

  const [teachers, setTeachers] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [events, setEvents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [salaryRules, setSalaryRules] = useState([]);
  const [customHolidays, setCustomHolidays] = useState([]);
  const [salaryAdjustments, setSalaryAdjustments] = useState([]);

  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [viewDate, setViewDate] = useState(new Date());
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const weekDays = useMemo(() => getCurrentWeek(viewDate), [viewDate]);
  const [dailyActiveTeacherIds, setDailyActiveTeacherIds] = useState(null);
  const [showOnlyOnline, setShowOnlyOnline] = useState(false);
  const [calendarTeacherFilter, setCalendarTeacherFilter] = useState('');

  const [adminBatch, setAdminBatch] = useState({
    teacherId: '',
    courseName: '',
    startDate: formatDateLocal(new Date()),
    endDate: formatDateLocal(new Date()),
    daysOfWeek: [1, 3],
    startTime: '08:00',
    endTime: '09:00',
    eventType: 'course',
    excludeDates: [],
    note: '',
  });
  const [teacherBatch, setTeacherBatch] = useState({
    courseName: '',
    startDate: formatDateLocal(new Date()),
    endDate: formatDateLocal(new Date()),
    daysOfWeek: [1, 3],
    startTime: '08:00',
    endTime: '09:00',
    eventType: 'pending',
    excludeDates: [],
    note: '',
  });
  const [historyFilter, setHistoryFilter] = useState({
    teacherId: '',
    type: '',
  });
  const [historySort, setHistorySort] = useState('updateDesc');
  const [historySearch, setHistorySearch] = useState('');
  const [selectedGroups, setSelectedGroups] = useState([]);
  const [salaryMonth, setSalaryMonth] = useState(
    formatDateLocal(new Date()).slice(0, 7)
  );
  const [expandedSalaryTeacher, setExpandedSalaryTeacher] = useState(null);
  const [selectedSalaryTeachers, setSelectedSalaryTeachers] = useState([]);

  const [dialog, setDialog] = useState({
    isOpen: false,
    type: 'alert',
    message: '',
    onConfirm: null,
  });
  const [addModal, setAddModal] = useState({
    isOpen: false,
    date: '',
    teacherId: '',
    startIdx: 0,
    endIdx: 0,
    eventType: 'course',
    reason: '',
    isRepeat: false,
    endDate: '',
    note: '',
    customRate: '',
    venueFee: '',
  });
  const [calendarAddModal, setCalendarAddModal] = useState({
    isOpen: false,
    date: '',
    teacherId: '',
    reason: '線上課程',
    startTime: '08:00',
    endTime: '09:00',
    eventType: 'course',
    isRepeat: false,
    endDate: '',
    note: '',
    customRate: '',
    venueFee: '',
  });
  const [adminEditModal, setAdminEditModal] = useState({
    isOpen: false,
    group: null,
    teacherId: '',
    reason: '',
    startTime: '',
    endTime: '',
    daysOfWeek: [],
    startDate: '',
    endDate: '',
    type: 'course',
    createdBy: '',
    note: '',
    customRate: '',
    venueFee: '',
  });
  const [printSalaryModal, setPrintSalaryModal] = useState({
    isOpen: false,
    dataList: [],
    monthStr: '',
  });
  const [printAttendanceModal, setPrintAttendanceModal] = useState({
    isOpen: false,
    classData: null,
  });
  const [adjModal, setAdjModal] = useState({
    isOpen: false,
    id: '',
    tId: '',
    tName: '',
    month: '',
    reimbursements: [],
    adminFees: [],
    deductions: [],
  });

  const [attendanceClass, setAttendanceClass] = useState('');
  const [attendanceLesson, setAttendanceLesson] = useState(1);
  const [attendanceDate, setAttendanceDate] = useState(
    formatDateLocal(new Date())
  );
  const [attendanceTeacherId, setAttendanceTeacherId] = useState('');
  const [attendanceNote, setAttendanceNote] = useState('');
  const [currentAttendanceRecords, setCurrentAttendanceRecords] = useState({});
  const [classModal, setClassModal] = useState({
    isOpen: false,
    id: '',
    name: '',
    startDate: formatDateLocal(new Date()),
    endDate: formatDateLocal(new Date()),
    defaultTeacherId: '',
    totalLessons: 12,
    studentsInput: '',
  });

  const [newTeacherName, setNewTeacherName] = useState('');
  const [newTeacherRole, setNewTeacherRole] = useState('teacher'); // ✨ 新增：身份選擇
  const [newTeacherRate, setNewTeacherRate] = useState(500);
  const [newHoliday, setNewHoliday] = useState({
    date: formatDateLocal(new Date()),
    name: '',
  });
  const [newSalaryRule, setNewSalaryRule] = useState({ keyword: '', rate: '' });
  const [editSalaryRuleModal, setEditSalaryRuleModal] = useState({
    isOpen: false,
    id: '',
    keyword: '',
    rate: '',
  });
  const [teacherNameModal, setTeacherNameModal] = useState({
    isOpen: false,
    teacher: null,
    newName: '',
    newRate: 0,
  });
  const [adminAccountModal, setAdminAccountModal] = useState({
    isOpen: false,
    admin: null,
    name: '',
    username: '',
    password: '',
  });

  useEffect(() => {
    if (!document.getElementById('tailwind-cdn')) {
      const script = document.createElement('script');
      script.id = 'tailwind-cdn';
      script.src = 'https://cdn.tailwindcss.com';
      document.head.appendChild(script);
    }
    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch (e) {
        console.error(e);
        setIsLoading(false);
      }
    };
    initAuth();

    const storedUser = localStorage.getItem('lohas_user');
    if (storedUser) {
      try {
        setCurrentUser(JSON.parse(storedUser));
      } catch (e) {
        console.error(e);
      }
    }
    return onAuthStateChanged(auth, setFbUser);
  }, []);

  useEffect(() => {
    if (!fbUser) return;
    const unsubT = onSnapshot(collection(db, 'teachers'), (snap) => {
      if (snap.empty) {
        INITIAL_TEACHERS.forEach((t) =>
          setDoc(doc(db, 'teachers', String(t.id)), t)
        );
      } else {
        const tData = snap.docs.map((d) => d.data());
        setTeachers(tData);
        if (tData.length > 0 && !adminBatch.teacherId)
          setAdminBatch((prev) => ({
            ...prev,
            teacherId: String(tData[0].id),
          }));
      }
      setIsLoading(false);
    });
    const unsubA = onSnapshot(collection(db, 'admins'), (snap) => {
      if (snap.empty)
        setDoc(doc(db, 'admins', DEFAULT_ADMIN.id), DEFAULT_ADMIN);
      else setAdmins(snap.docs.map((d) => d.data()));
    });
    const unsubE = onSnapshot(collection(db, 'events'), (snap) =>
      setEvents(snap.docs.map((d) => d.data()))
    );
    const unsubC = onSnapshot(collection(db, 'classes'), (snap) =>
      setClasses(snap.docs.map((d) => d.data()))
    );
    const unsubAtt = onSnapshot(collection(db, 'attendance'), (snap) =>
      setAttendance(snap.docs.map((d) => d.data()))
    );
    const unsubR = onSnapshot(collection(db, 'salaryRules'), (snap) =>
      setSalaryRules(snap.docs.map((d) => ({ ...d.data(), docId: d.id })))
    ); // ✨ 寫入 docId 修復刪除問題
    const unsubH = onSnapshot(collection(db, 'holidays'), (snap) =>
      setCustomHolidays(snap.docs.map((d) => d.data()))
    );
    const unsubAdj = onSnapshot(collection(db, 'salaryAdjustments'), (snap) =>
      setSalaryAdjustments(snap.docs.map((d) => d.data()))
    );

    return () => {
      unsubT();
      unsubA();
      unsubE();
      unsubC();
      unsubAtt();
      unsubR();
      unsubH();
      unsubAdj();
    };
  }, [fbUser]);

  const showAlert = (message) =>
    setDialog({
      isOpen: true,
      type: 'alert',
      message: String(message || ''),
      onConfirm: null,
    });
  const showConfirm = (message, onConfirm) =>
    setDialog({
      isOpen: true,
      type: 'confirm',
      message: String(message || ''),
      onConfirm,
    });
  const closeDialog = () =>
    setDialog({ isOpen: false, type: 'alert', message: '', onConfirm: null });
  const getHolidayName = (dateStr) =>
    customHolidays.find((h) => String(h?.date || '') === String(dateStr))
      ?.name || null;
  const toggleGroupSelection = (id) =>
    setSelectedGroups((prev) =>
      prev.includes(String(id))
        ? prev.filter((x) => x !== String(id))
        : [...prev, String(id)]
    );

  const copyToClipboard = (text) => {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.top = '0';
    textArea.style.left = '0';
    textArea.style.position = 'fixed';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
      showAlert('✅ 內容已成功複製！您可以直接貼上。');
    } catch (err) {
      showAlert('❌ 複製失敗，請手動選取複製。');
    }
    document.body.removeChild(textArea);
  };

  const getSalaryText = (data, monthStr) => {
    if (!data) return '';
    const rawDetail = data.details
      .map(
        (dt) =>
          `・${dt.date} ${dt.time} | ${dt.reason}${
            dt.note ? ` (${dt.note})` : ''
          } | ${dt.hours}hr | 鐘點:$${dt.fee}${
            dt.venueFee > 0 ? ` + 場地:$${dt.venueFee}` : ''
          }`
      )
      .join('\n');

    let extraDetail = '';
    data.reimbursements.forEach((item) => {
      if (Number(item.amount) > 0)
        extraDetail += `・--/-- --:-- | 代墊費用退款${
          item.note ? ` (${item.note})` : ''
        } | - | - | +$${Number(item.amount)}\n`;
    });
    data.adminFees.forEach((item) => {
      if (Number(item.amount) > 0)
        extraDetail += `・--/-- --:-- | 行政工作費用${
          item.note ? ` (${item.note})` : ''
        } | - | - | +$${Number(item.amount)}\n`;
    });
    data.deductions.forEach((item) => {
      if (Number(item.amount) > 0)
        extraDetail += `・--/-- --:-- | 扣款項目${
          item.note ? ` (${item.note})` : ''
        } | - | - | -$${Number(item.amount)}\n`;
    });

    return `您好，\n\n以下是您 ${monthStr.replace(
      '-',
      '年'
    )}月 的薪資結算明細：\n\n教師姓名：${data.teacher.name}\n總授課時數：${
      data.totalHours
    } 小時\n基本結算：$${data.baseSalary.toLocaleString()}\n場地費補貼：$${data.totalVenueFee.toLocaleString()}\n達標獎金加給：$${data.bonus.toLocaleString()} (+${
      data.bonusPctDisplay
    }%)\n------------------------\n【課表與明細】\n${rawDetail}${
      extraDetail ? '\n' + extraDetail : ''
    }\n------------------------\n本月應發總計：$${data.totalSalary.toLocaleString()}\n\n請確認，謝謝！`;
  };

  const openEditModal = (g) => {
    setAdminEditModal({
      isOpen: true,
      group: g,
      teacherId: String(g.teacherId || ''),
      reason: String(g.reason || ''),
      startTime: String(TIMES[g.slotIndices[0]] || ''),
      endTime: String(END_TIMES[g.slotIndices[g.slotIndices.length - 1]] || ''),
      daysOfWeek: g.daysOfWeek || [],
      startDate: String(g.startDate || g.date || ''),
      endDate: String(g.endDate || g.date || ''),
      type: String(g.type || 'course'),
      createdBy: String(g.createdBy || ''),
      note: String(g.note || ''),
      customRate: String(g.customRate || ''),
      venueFee: String(g.venueFee || ''),
    });
  };

  const submitBatchData = async (
    batchData,
    targetTeacherId,
    existingBatchId = null,
    existingCreatedAt = null,
    creatorInfo = null,
    existingEventId = null,
    isSingle = false
  ) => {
    const sMins =
      parseInt(String(batchData?.startTime || '00:00').split(':')[0]) * 60 +
      parseInt(String(batchData?.startTime || '00:00').split(':')[1]);
    const eMins =
      parseInt(String(batchData?.endTime || '00:00').split(':')[0]) * 60 +
      parseInt(String(batchData?.endTime || '00:00').split(':')[1]);
    if (sMins >= eMins)
      return { success: false, msg: '結束時間需晚於開始時間！' };

    const startIdx = Math.floor((sMins - 480) / 30),
      endIdx = Math.ceil((eMins - 480) / 30) - 1;
    const startD = parseLocalDate(batchData?.startDate),
      endD = parseLocalDate(batchData?.endDate);
    let newEvents = [],
      overlapCount = 0;

    const finalReason =
      String(batchData?.courseName || '').trim() ||
      (batchData?.eventType === 'unavailable' ? '無法排課' : '一般課程');
    const finalNote = String(batchData?.note || '').trim();
    const finalCustomRate = batchData?.customRate
      ? Number(batchData.customRate)
      : null;
    const finalVenueFee = batchData?.venueFee ? Number(batchData.venueFee) : 0;

    const currentBatchId = isSingle
      ? null
      : existingBatchId ||
        'batch_' +
          Date.now().toString() +
          '_' +
          Math.random().toString(36).substring(2, 7);
    const creationTime = existingCreatedAt || Date.now(),
      currentTime = Date.now();
    const createdBy =
      creatorInfo ||
      (currentUser
        ? `${currentUser.role === 'admin' ? '管理員' : '老師'}：${
            currentUser.name || ''
          }`
        : '系統');

    const isAdmin = currentUser?.role === 'admin';
    const finalStatus =
      batchData?.eventType === 'pending' || !isAdmin ? 'pending' : 'approved';
    const finalType =
      batchData?.eventType === 'pending' ? 'course' : batchData?.eventType;

    const excludeDates = batchData?.excludeDates || [],
      daysOfWeek = batchData?.daysOfWeek || [];
    const replacedEventIds = new Set();
    if (existingBatchId)
      events
        .filter((e) => String(e?.batchId || '') === String(existingBatchId))
        .forEach((e) => replacedEventIds.add(String(e.id)));
    else if (existingEventId) replacedEventIds.add(String(existingEventId));

    for (let d = new Date(startD); d <= endD; d.setDate(d.getDate() + 1)) {
      if (daysOfWeek.includes(d.getDay())) {
        const dStr = formatDateLocal(d);
        if (excludeDates.includes(dStr)) continue;
        const indices = [];
        for (let i = startIdx; i <= endIdx; i++) indices.push(i);

        const isConflict = events.some((ev) => {
          if (replacedEventIds.has(String(ev.id))) return false;
          const isSameTeacher =
            String(ev?.teacherId || '') === String(targetTeacherId);
          const isSameDate = String(ev?.date || '') === dStr;
          const isSameTime = (ev?.slotIndices || []).some((idx) =>
            indices.includes(idx)
          );
          return isSameTeacher && isSameDate && isSameTime;
        });

        if (isConflict) {
          overlapCount++;
          continue;
        }

        newEvents.push({
          id:
            Date.now().toString() +
            '_' +
            Math.random().toString(36).substring(2, 9),
          teacherId: isNaN(Number(targetTeacherId))
            ? targetTeacherId
            : Number(targetTeacherId),
          date: dStr,
          slotIndices: indices,
          reason: finalReason,
          type: finalType,
          batchId: currentBatchId,
          createdAt: creationTime,
          updatedAt: currentTime,
          originDays: daysOfWeek,
          createdBy: String(createdBy),
          note: finalNote,
          status: finalStatus,
          customRate: finalCustomRate,
          venueFee: finalVenueFee,
        });
      }
    }

    if (!newEvents.length)
      return {
        success: false,
        msg:
          overlapCount > 0
            ? `有 ${overlapCount} 堂課與既有排程衝突，請確認時段。`
            : '期間內沒有符合條件的日期。',
      };

    if (existingBatchId) {
      const oldEvs = events.filter(
        (e) => String(e?.batchId || '') === String(existingBatchId)
      );
      for (const e of oldEvs)
        await deleteDoc(doc(db, 'events', String(e?.id || '')));
    } else if (existingEventId) {
      await deleteDoc(doc(db, 'events', String(existingEventId)));
    }

    for (const ev of newEvents)
      await setDoc(doc(db, 'events', String(ev.id)), ev);
    return {
      success: true,
      msg:
        finalStatus === 'pending'
          ? '已送出申請，請等待審核！'
          : '排課更新成功！',
    };
  };

  const handleApprovePending = async (group) => {
    for (const ev of group?.events || []) {
      await setDoc(doc(db, 'events', String(ev?.id || '')), {
        ...ev,
        status: 'approved',
        updatedAt: Date.now(),
      });
    }
    showAlert('✅ 已核准此排課申請！');
  };

  const groupedEvents = useMemo(() => {
    const groups = [];
    const processedBatchIds = new Set();
    const sortedEvents = [...events].sort(
      (a, b) =>
        (b?.updatedAt || b?.createdAt || 0) -
        (a?.updatedAt || a?.createdAt || 0)
    );

    sortedEvents.forEach((ev) => {
      if (ev?.batchId) {
        if (!processedBatchIds.has(ev.batchId)) {
          const batchEvents = events
            .filter((e) => String(e?.batchId || '') === String(ev.batchId))
            .sort(
              (a, b) =>
                new Date(a?.date || 0).getTime() -
                new Date(b?.date || 0).getTime()
            );
          if (batchEvents.length > 0) {
            groups.push({
              isBatch: true,
              id: ev.batchId,
              batchId: ev.batchId,
              teacherId: ev.teacherId,
              type: ev.type,
              reason: ev.reason,
              startDate: batchEvents[0]?.date,
              endDate: batchEvents[batchEvents.length - 1]?.date,
              slotIndices: ev.slotIndices,
              count: batchEvents.length,
              events: batchEvents,
              sortTime:
                ev.createdAt || new Date(batchEvents[0]?.date || 0).getTime(),
              updateTime:
                batchEvents[0]?.updatedAt || batchEvents[0]?.createdAt || 0,
              daysOfWeek:
                ev.originDays ||
                Array.from(
                  new Set(
                    batchEvents.map((e) => parseLocalDate(e?.date).getDay())
                  )
                ),
              createdBy: String(ev.createdBy || '系統'),
              note: String(ev.note || ''),
              status: String(batchEvents[0]?.status || 'approved'),
              customRate: ev.customRate || '',
              venueFee: ev.venueFee || 0,
            });
            processedBatchIds.add(ev.batchId);
          }
        }
      } else {
        groups.push({
          isBatch: false,
          id: ev?.id,
          teacherId: ev?.teacherId,
          type: ev?.type,
          reason: ev?.reason,
          date: ev?.date,
          slotIndices: ev?.slotIndices,
          events: [ev],
          sortTime: ev?.createdAt || new Date(ev?.date || 0).getTime(),
          updateTime: ev?.updatedAt || ev?.createdAt || 0,
          daysOfWeek: [parseLocalDate(ev?.date).getDay()],
          createdBy: String(ev?.createdBy || '系統'),
          note: String(ev?.note || ''),
          status: String(ev?.status || 'approved'),
          customRate: ev?.customRate || '',
          venueFee: ev?.venueFee || 0,
        });
      }
    });
    return groups;
  }, [events]);

  const eventsMap = useMemo(() => {
    const map = {};
    events.forEach((ev) => {
      (ev.slotIndices || []).forEach((idx) => {
        map[`${ev.teacherId}_${ev.date}_${idx}`] = ev;
      });
    });
    return map;
  }, [events]);

  const onlineEventsByDate = useMemo(() => {
    const map = {};
    events.forEach((ev) => {
      if (!map[ev.date]) map[ev.date] = [];
      map[ev.date].push(ev);
    });
    return map;
  }, [events]);

  const filteredHistory = useMemo(() => {
    let f = groupedEvents.filter(
      (g) =>
        (!historyFilter.teacherId ||
          String(g.teacherId) === String(historyFilter.teacherId)) &&
        (!historyFilter.type ||
          String(g.type) === String(historyFilter.type)) &&
        g.status !== 'pending' &&
        (!historySearch ||
          String(g.reason).includes(historySearch) ||
          String(g.note).includes(historySearch))
    );
    f.sort((a, b) => {
      if (historySort === 'updateDesc')
        return (b.updateTime || 0) - (a.updateTime || 0);
      if (historySort === 'updateAsc')
        return (a.updateTime || 0) - (b.updateTime || 0);
      if (historySort === 'createDesc')
        return (b.sortTime || 0) - (a.sortTime || 0);
      if (historySort === 'createAsc')
        return (a.sortTime || 0) - (b.sortTime || 0);
      if (historySort === 'dateDesc')
        return (
          new Date(b.startDate || b.date).getTime() -
          new Date(a.startDate || a.date).getTime()
        );
      return (
        new Date(a.startDate || a.date).getTime() -
        new Date(b.startDate || b.date).getTime()
      );
    });
    return f;
  }, [groupedEvents, historyFilter, historySearch, historySort]);

  // --- 💰 薪資結算 ---
  const calculatedSalaryData = useMemo(() => {
    const data = {};
    teachers.forEach((t) => {
      const adjId = `${t.id}_${salaryMonth}`;
      const adj = salaryAdjustments.find((a) => a.id === adjId) || {};

      const rItems =
        adj.reimbursements ||
        (adj.reimbursement
          ? [{ amount: adj.reimbursement, note: adj.reimbursementNote }]
          : []);
      const aItems = t.adminFees || []; // ✨ 修改：從老師基本資料(t)拉取固定行政費，而不是每月單獨設定
      const dItems =
        adj.deductions ||
        (adj.deduction
          ? [{ amount: adj.deduction, note: adj.deductionNote }]
          : []);

      const totalReimbursement = rItems.reduce(
        (sum, item) => sum + Number(item.amount || 0),
        0
      );
      const totalAdminFee = aItems.reduce(
        (sum, item) => sum + Number(item.amount || 0),
        0
      );
      const totalDeduction = dItems.reduce(
        (sum, item) => sum + Number(item.amount || 0),
        0
      );

      data[t.id] = {
        teacher: t,
        totalHours: 0,
        baseSalary: 0,
        bonus: 0,
        totalVenueFee: 0,
        totalSalary: 0,
        details: [],
        reimbursements: rItems,
        reimbursement: totalReimbursement,
        adminFees: aItems,
        adminFee: totalAdminFee,
        deductions: dItems,
        deduction: totalDeduction,
      };
    });

    events.forEach((ev) => {
      if (
        !String(ev.date).startsWith(salaryMonth) ||
        ev.type === 'unavailable' ||
        ev.status === 'pending'
      )
        return;
      const tId = ev.teacherId;
      if (!data[tId]) return;
      const hours = ev.slotIndices.length * 0.5,
        vFee = Number(ev.venueFee || 0);
      let rateApplied = data[tId].teacher.defaultRate || 0,
        rateType = '預設底薪';
      if (ev.customRate && Number(ev.customRate) > 0) {
        rateApplied = Number(ev.customRate);
        rateType = '單堂手動';
      } else {
        const matchedRule = salaryRules.find((r) =>
          String(ev.reason).includes(String(r.keyword))
        );
        if (matchedRule) {
          rateApplied = Number(matchedRule.rate);
          rateType = `加成(${matchedRule.keyword})`;
        }
      }
      const fee = rateApplied * hours;
      data[tId].totalHours += hours;
      data[tId].baseSalary += fee;
      data[tId].totalVenueFee += vFee;
      data[tId].details.push({
        date: ev.date,
        time: `${TIMES[ev.slotIndices[0]]}~${
          END_TIMES[ev.slotIndices[ev.slotIndices.length - 1]]
        }`,
        reason: ev.reason,
        hours,
        rateApplied,
        rateType,
        fee,
        note: ev.note,
        venueFee: vFee,
      });
    });

    Object.values(data).forEach((d) => {
      d.details.sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );
      const bonusPct = calculateBonusPercent(d.totalHours);
      d.bonusPctDisplay = (bonusPct * 100).toFixed(0);
      d.bonus = Math.round(
        d.totalHours * (d.teacher.defaultRate || 0) * bonusPct
      );
      d.totalSalary =
        d.baseSalary +
        d.bonus +
        d.totalVenueFee +
        d.reimbursement +
        d.adminFee -
        d.deduction;
    });

    // ✨ 不管有沒有上課，全部列出，讓行政人員也能填寫薪資加減項
    return Object.values(data);
  }, [events, teachers, salaryMonth, salaryRules, salaryAdjustments]);

  // --- 互動事件處理 ---
  const handleSlotClick = (teacherId, dayDateStr, slotIndex) => {
    const isAdmin = currentUser?.role === 'admin';
    const isTeacher = currentUser?.role === 'teacher';
    const isMySchedule =
      isTeacher && String(currentUser.teacherId) === String(teacherId);

    const existing = eventsMap[`${teacherId}_${dayDateStr}_${slotIndex}`];
    if (existing) {
      if (!isAdmin && !isMySchedule)
        return showAlert('只有管理員或該授課老師可以修改此排程喔！');
      const groupFormat = {
        isBatch: false,
        id: existing.id,
        teacherId: existing.teacherId,
        type: existing.type,
        reason: existing.reason,
        date: existing.date,
        slotIndices: existing.slotIndices,
        events: [existing],
        daysOfWeek: [parseLocalDate(existing.date).getDay()],
        sortTime: existing.createdAt,
        updateTime: existing.updatedAt,
        createdBy: existing.createdBy,
        note: String(existing.note || ''),
        status: String(existing.status || 'approved'),
        customRate: existing.customRate || '',
        venueFee: existing.venueFee || '',
      };
      openEditModal(groupFormat);
      return;
    }
    setAddModal({
      isOpen: true,
      date: String(dayDateStr),
      teacherId: String(teacherId),
      startIdx: slotIndex,
      endIdx: slotIndex,
      eventType: isAdmin ? 'course' : 'pending',
      reason: '',
      isRepeat: false,
      endDate: String(dayDateStr),
      note: '',
      customRate: '',
      venueFee: '',
    });
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (
      !String(addModal?.reason || '').trim() &&
      addModal?.eventType !== 'unavailable'
    )
      return showAlert('請輸入課程名稱！');
    const dayOfWeek = parseLocalDate(addModal.date).getDay();
    const finalEndDate =
      addModal.isRepeat && addModal.endDate ? addModal.endDate : addModal.date;

    const res = await submitBatchData(
      {
        courseName: addModal.reason,
        startDate: addModal.date,
        endDate: finalEndDate,
        daysOfWeek: [dayOfWeek],
        startTime: TIMES[addModal.startIdx],
        endTime: END_TIMES[addModal.endIdx],
        eventType: addModal.eventType,
        excludeDates: [],
        note: addModal.note,
        customRate: addModal.customRate,
        venueFee: addModal.venueFee,
      },
      String(addModal.teacherId),
      null,
      null,
      null,
      null,
      !addModal.isRepeat
    );

    if (res.success) {
      setAddModal({
        isOpen: false,
        date: '',
        teacherId: '',
        startIdx: 0,
        endIdx: 0,
        eventType: 'course',
        reason: '',
        isRepeat: false,
        endDate: '',
        note: '',
        customRate: '',
        venueFee: '',
      });
      showAlert(res.msg);
    } else {
      showAlert(res.msg);
    }
  };

  const handleCalendarAddSubmit = async (e) => {
    e.preventDefault();
    const {
      date,
      teacherId,
      reason,
      startTime,
      endTime,
      eventType,
      isRepeat,
      endDate,
      note,
      customRate,
      venueFee,
    } = calendarAddModal;
    if (!teacherId) return showAlert('請選擇指派的老師！');
    if (!String(reason || '').trim() && eventType !== 'unavailable')
      return showAlert('請輸入內容或原因！');

    const dayOfWeek = parseLocalDate(date).getDay();
    const finalEndDate = isRepeat && endDate ? endDate : date;

    const res = await submitBatchData(
      {
        courseName: reason,
        startDate: date,
        endDate: finalEndDate,
        daysOfWeek: [dayOfWeek],
        startTime,
        endTime,
        eventType,
        excludeDates: [],
        note,
        customRate,
        venueFee,
      },
      String(teacherId),
      null,
      null,
      null,
      null,
      !isRepeat
    );

    if (res.success) {
      setCalendarAddModal({
        isOpen: false,
        date: '',
        teacherId: '',
        reason: '線上課程',
        startTime: '08:00',
        endTime: '09:00',
        eventType: 'course',
        isRepeat: false,
        endDate: '',
        note: '',
        customRate: '',
        venueFee: '',
      });
      showAlert(res.msg);
    } else {
      showAlert(res.msg);
    }
  };

  const handleAdminEditSubmit = async (e) => {
    e.preventDefault();
    const {
      group,
      teacherId,
      reason,
      startTime,
      endTime,
      daysOfWeek,
      startDate,
      endDate,
      type,
      note,
      customRate,
      venueFee,
    } = adminEditModal;
    if (!String(reason || '').trim() && type !== 'unavailable')
      return showAlert('名稱不能是空白的！');

    const res = await submitBatchData(
      {
        courseName: reason,
        startDate: startDate || group?.date,
        endDate: endDate || group?.date,
        daysOfWeek,
        startTime,
        endTime,
        eventType: type,
        excludeDates: [],
        note,
        customRate,
        venueFee,
      },
      String(teacherId),
      group?.isBatch ? group.batchId : null,
      group?.sortTime,
      group?.createdBy,
      group?.isBatch ? null : group?.id,
      !group?.isBatch
    );

    if (res.success) {
      setAdminEditModal({
        isOpen: false,
        group: null,
        teacherId: '',
        reason: '',
        startTime: '',
        endTime: '',
        daysOfWeek: [],
        startDate: '',
        endDate: '',
        type: 'course',
        createdBy: '',
        note: '',
        customRate: '',
        venueFee: '',
      });
      showAlert('修改成功！');
    } else {
      showAlert(res.msg);
    }
  };

  const handleAttendanceSave = async () => {
    if (!attendanceDate) return showAlert('請填寫上課日期！');
    if (!attendanceTeacherId) return showAlert('請選擇授課老師！');

    const attId = `${attendanceClass}_${attendanceLesson}`;
    await setDoc(doc(db, 'attendance', attId), {
      id: attId,
      classId: attendanceClass,
      lessonNumber: attendanceLesson,
      date: attendanceDate,
      teacherId: attendanceTeacherId,
      note: attendanceNote,
      records: currentAttendanceRecords,
      updatedAt: Date.now(),
    });
    showAlert('✅ 點名紀錄已儲存！');
    setCurrentView('attendance-home');
  };

  // ==========================================
  // 視圖渲染區
  // ==========================================

  const renderHomeView = () => (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="max-w-4xl w-full text-center animate-in zoom-in-95 duration-500">
        <div className="bg-orange-50 w-24 h-24 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-inner border-2 border-white">
          <CalendarDays size={48} className="text-orange-500" />
        </div>
        <h2 className="text-5xl font-black mb-4 text-gray-800 tracking-tighter">
          LOHAS 數位管理中心
        </h2>
        <p className="text-gray-500 font-bold mb-12">
          請選擇您要使用的服務入口
        </p>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <button
            onClick={() => setCurrentView('attendance-home')}
            className="bg-white p-6 rounded-[2rem] shadow-xl hover:-translate-y-2 hover:shadow-2xl transition-all border-4 border-transparent hover:border-blue-100 flex flex-col items-center gap-3 group"
          >
            <div className="w-16 h-16 bg-blue-500 text-white rounded-[1.5rem] flex items-center justify-center shadow-lg group-hover:rotate-6 transition-transform">
              <UserCheck size={28} />
            </div>
            <h3 className="text-lg font-black text-gray-800">快速點名</h3>
            <p className="text-[10px] font-bold text-gray-400">
              免登入班級點名
            </p>
          </button>
          <button
            onClick={() => setCurrentView('teacher-select')}
            className="bg-white p-6 rounded-[2rem] shadow-xl hover:-translate-y-2 hover:shadow-2xl transition-all border-4 border-transparent hover:border-orange-100 flex flex-col items-center gap-3 group"
          >
            <div className="w-16 h-16 bg-orange-500 text-white rounded-[1.5rem] flex items-center justify-center shadow-lg group-hover:rotate-6 transition-transform">
              <Clock size={28} />
            </div>
            <h3 className="text-lg font-black text-gray-800">個人課表</h3>
            <p className="text-[10px] font-bold text-gray-400">
              專屬排班與請假
            </p>
          </button>
          <button
            onClick={() => {
              setCurrentView('daily');
              setViewDate(new Date());
            }}
            className="bg-white p-6 rounded-[2rem] shadow-xl hover:-translate-y-2 hover:shadow-2xl transition-all border-4 border-transparent hover:border-teal-100 flex flex-col items-center gap-3 group"
          >
            <div className="w-16 h-16 bg-teal-500 text-white rounded-[1.5rem] flex items-center justify-center shadow-lg group-hover:rotate-6 transition-transform">
              <Users size={28} />
            </div>
            <h3 className="text-lg font-black text-gray-800">單日總覽</h3>
            <p className="text-[10px] font-bold text-gray-400">
              各老師當天檔期
            </p>
          </button>
          <button
            onClick={() => setCurrentView('calendar')}
            className="bg-white p-6 rounded-[2rem] shadow-xl hover:-translate-y-2 hover:shadow-2xl transition-all border-4 border-transparent hover:border-indigo-100 flex flex-col items-center gap-3 group"
          >
            <div className="w-16 h-16 bg-indigo-500 text-white rounded-[1.5rem] flex items-center justify-center shadow-lg group-hover:rotate-6 transition-transform">
              <Globe size={28} />
            </div>
            <h3 className="text-lg font-black text-gray-800">線上月曆</h3>
            <p className="text-[10px] font-bold text-gray-400">
              線上課專屬排程
            </p>
          </button>
          <button
            onClick={() => {
              currentUser?.role === 'admin'
                ? setCurrentView('admin')
                : setCurrentView('admin-login');
            }}
            className="bg-white p-6 rounded-[2rem] shadow-xl hover:-translate-y-2 hover:shadow-2xl transition-all border-4 border-transparent hover:border-rose-100 flex flex-col items-center gap-3 group md:col-span-1 col-span-2"
          >
            <div className="w-16 h-16 bg-rose-500 text-white rounded-[1.5rem] flex items-center justify-center shadow-lg group-hover:rotate-6 transition-transform">
              <Shield size={28} />
            </div>
            <h3 className="text-lg font-black text-gray-800">管理後台</h3>
            <p className="text-[10px] font-bold text-gray-400">
              薪資設定與權限
            </p>
          </button>
        </div>
      </div>
    </div>
  );

  const renderAdminLogin = () => (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-white p-10 rounded-[3rem] shadow-2xl max-w-sm w-full text-center border-4 border-white animate-in zoom-in-95">
        <div className="mx-auto w-20 h-20 bg-teal-50 text-teal-500 rounded-[2rem] flex items-center justify-center mb-6 shadow-inner border-2 border-white">
          <Shield size={40} />
        </div>
        <h2 className="text-3xl font-black mb-8 text-gray-800">管理員登入</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const user = String(e.target.username.value);
            const pwd = String(e.target.password.value);
            const found = admins.find(
              (a) => String(a.username) === user && String(a.password) === pwd
            );
            if (found) {
              const adminUser = {
                role: 'admin',
                name: String(found.name),
                id: String(found.id),
              };
              setCurrentUser(adminUser);
              localStorage.setItem('lohas_user', JSON.stringify(adminUser));
              setCurrentView('admin');
            } else {
              showAlert('帳號或密碼錯誤！');
            }
          }}
        >
          <input
            name="username"
            placeholder="帳號"
            className="w-full p-4 bg-gray-50 border-2 rounded-2xl font-bold outline-none focus:border-teal-400 mb-4"
          />
          <input
            name="password"
            type="password"
            placeholder="密碼"
            className="w-full p-4 bg-gray-50 border-2 rounded-2xl font-bold outline-none focus:border-teal-400 mb-8"
          />
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setCurrentView('home')}
              className="flex-1 py-4 bg-gray-100 text-gray-500 font-black rounded-2xl"
            >
              返回
            </button>
            <button
              type="submit"
              className="flex-[2] py-4 bg-teal-500 text-white font-black rounded-2xl shadow-lg"
            >
              登入
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  const renderTeacherSelect = () => (
    <div className="min-h-screen p-4">
      <div className="max-w-5xl mx-auto mt-10">
        <button
          onClick={() => setCurrentView('home')}
          className="mb-6 flex items-center gap-2 text-gray-400 font-bold hover:text-gray-800 transition-colors"
        >
          <ChevronLeft /> 返回首頁
        </button>
        <h2 className="text-3xl font-black text-gray-800 mb-8 flex items-center gap-3">
          <User className="text-orange-500" /> 點選您的名字進入課表
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {teachers.map((t, idx) => (
            <div
              key={`tsel-${t.id}-${idx}`}
              onClick={() => {
                if (currentUser?.role !== 'admin') {
                  const tUser = {
                    role: 'teacher',
                    teacherId: String(t.id),
                    name: String(t.name),
                  };
                  setCurrentUser(tUser);
                  localStorage.setItem('lohas_user', JSON.stringify(tUser));
                }
                setSelectedTeacher(t);
                setCurrentView('schedule');
              }}
              className="bg-white p-8 rounded-[3rem] shadow-xl hover:-translate-y-2 transition-all text-center border-4 border-transparent hover:border-orange-100 cursor-pointer group"
            >
              <div
                className={`w-24 h-24 mx-auto ${t.avatar} text-white rounded-[2rem] flex items-center justify-center text-4xl font-black mb-4 shadow-inner border-4 border-white group-hover:rotate-6 transition-transform`}
              >
                {String(t.name || '').charAt(0)}
              </div>
              <h3 className="font-black text-xl text-gray-700">
                {String(t.name || '')}
              </h3>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderDailyView = () => {
    const viewDateStr = formatDateLocal(viewDate);
    const dayNum = viewDate.getDay();
    const dayOfWeekStr = isNaN(dayNum) ? '' : DAY_NAMES[dayNum];
    const isSpecialDay =
      dayNum === 0 || dayNum === 6 || Boolean(getHolidayName(viewDateStr));

    const activeDailyTeachers =
      dailyActiveTeacherIds === null
        ? teachers
        : teachers.filter((t) => dailyActiveTeacherIds.includes(String(t.id)));

    return (
      <div className="animate-in slide-in-from-bottom-8 duration-500">
        <div className="bg-white p-6 rounded-[2.5rem] shadow-2xl border-4 border-teal-50 mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
            <h2 className="font-extrabold text-2xl flex items-center gap-3 text-gray-800 bg-teal-50 pr-6 pl-4 py-2 rounded-2xl">
              <Users className="text-teal-500" size={28} />
              單日總覽
            </h2>
            <div className="flex items-center gap-3 bg-gray-50 p-2 rounded-2xl border-2 border-gray-100 shadow-sm">
              <button
                onClick={() =>
                  setViewDate(new Date(viewDate.getTime() - 86400000))
                }
                className="p-3 bg-white rounded-xl shadow-sm text-teal-500 hover:bg-teal-50 transition-colors"
              >
                <ChevronLeft />
              </button>
              <div className="flex items-center gap-2 relative group cursor-pointer">
                <CalendarIcon
                  size={18}
                  className="text-teal-400 hidden sm:block group-hover:text-teal-600 transition-colors"
                />
                <input
                  type="date"
                  value={viewDateStr}
                  onChange={(e) => {
                    const d = new Date(e.target.value);
                    if (!isNaN(d.getTime())) {
                      setViewDate(d);
                    }
                  }}
                  className="px-3 py-2 rounded-xl border-2 border-teal-100 text-teal-700 font-black outline-none focus:border-teal-400 cursor-pointer bg-white transition-all text-sm sm:text-base hover:shadow-sm"
                />
                <span className="font-bold text-gray-500 text-sm hidden sm:inline">
                  (週{String(dayOfWeekStr)})
                </span>
              </div>
              <button
                onClick={() =>
                  setViewDate(new Date(viewDate.getTime() + 86400000))
                }
                className="p-3 bg-white rounded-xl shadow-sm text-teal-500 hover:bg-teal-50 transition-colors"
              >
                <ChevronRight />
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 mb-4 bg-teal-50/50 p-4 rounded-2xl border border-teal-100">
            <span className="text-sm font-black text-teal-800">
              <Filter size={16} className="inline mr-1" /> 顯示名單：
            </span>
            <label className="flex items-center gap-1.5 cursor-pointer text-sm font-bold text-teal-600 hover:text-teal-800 transition-colors">
              <input
                type="checkbox"
                checked={
                  dailyActiveTeacherIds === null ||
                  dailyActiveTeacherIds.length === teachers.length
                }
                onChange={(e) =>
                  setDailyActiveTeacherIds(e.target.checked ? null : [])
                }
                className="w-4 h-4 accent-teal-500 rounded"
              />{' '}
              全選
            </label>
            {teachers.map((t, idx) => (
              <label
                key={`dt-filt-${t.id}-${idx}`}
                className="flex items-center gap-1.5 cursor-pointer text-sm font-bold text-gray-600 hover:text-gray-900 transition-colors"
              >
                <input
                  type="checkbox"
                  checked={
                    dailyActiveTeacherIds === null ||
                    dailyActiveTeacherIds.includes(String(t.id))
                  }
                  onChange={() => {
                    let current =
                      dailyActiveTeacherIds === null
                        ? teachers.map((x) => String(x.id))
                        : dailyActiveTeacherIds;
                    if (current.includes(String(t.id))) {
                      const next = current.filter((x) => x !== String(t.id));
                      setDailyActiveTeacherIds(
                        next.length === teachers.length ? null : next
                      );
                    } else {
                      const next = [...current, String(t.id)];
                      setDailyActiveTeacherIds(
                        next.length === teachers.length ? null : next
                      );
                    }
                  }}
                  className="w-4 h-4 accent-teal-500 rounded"
                />{' '}
                {String(t.name || '')}
              </label>
            ))}
          </div>

          <div className="overflow-x-auto custom-scrollbar pb-2">
            <table className="w-full min-w-[800px] border-separate border-spacing-1.5">
              <thead>
                <tr>
                  <th className="w-20 text-teal-300 font-black text-sm sticky left-0 bg-white z-10">
                    時間
                  </th>
                  {activeDailyTeachers.map((t, idx) => (
                    <th
                      key={`d-th-${t.id}-${idx}`}
                      className={`py-4 rounded-2xl ${
                        isSpecialDay ? 'bg-rose-50' : 'bg-teal-50/50'
                      }`}
                    >
                      <div
                        className={`w-10 h-10 mx-auto rounded-xl ${t.avatar} text-white flex items-center justify-center font-bold mb-1 shadow-inner border-2 border-white`}
                      >
                        {String(t?.name || '').charAt(0)}
                      </div>
                      <div className="text-xs font-extrabold text-gray-700">
                        {String(t?.name || '')}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {TIMES.map((time, slotIdx) => (
                  <tr key={`d-tr-${time}-${slotIdx}`}>
                    <td className="text-center font-black text-sm text-teal-300 py-2 sticky left-0 bg-white z-10">
                      {String(time)}
                    </td>
                    {activeDailyTeachers.map((t, idx) => {
                      const ev = eventsMap[`${t.id}_${viewDateStr}_${slotIdx}`];
                      let cls =
                        'h-12 rounded-xl cursor-pointer border-2 border-transparent relative transition-all ';
                      if (ev) {
                        const isPending = ev.status === 'pending';
                        if (ev.slotIndices[0] === slotIdx) {
                          cls +=
                            ev.type === 'unavailable'
                              ? 'bg-slate-100 border-slate-200'
                              : isPending
                              ? 'bg-amber-100 border-amber-200 shadow-md'
                              : 'bg-teal-100 border-teal-200 shadow-md';
                          if (isPending) cls += ' border-dashed opacity-80 ';
                          let icon =
                            ev.type === 'unavailable' ? (
                              '🚫'
                            ) : isPending ? (
                              <span className="text-amber-500 font-black text-xs">
                                ⏳
                              </span>
                            ) : (
                              <Sparkles
                                size={12}
                                className="text-teal-500 fill-teal-100"
                              />
                            );
                          const hasNote = Boolean(
                            ev.note && ev.note.trim() !== ''
                          );
                          return (
                            <td
                              key={`d-td-${t.id}-${slotIdx}-${idx}`}
                              className={cls}
                              onClick={() =>
                                handleSlotClick(t.id, viewDateStr, slotIdx)
                              }
                            >
                              <div
                                className={`absolute inset-0 p-2 text-[10px] font-bold truncate flex items-center gap-1 ${
                                  isPending ? 'text-amber-800' : 'text-gray-700'
                                }`}
                              >
                                {icon} {String(ev.reason || '')}{' '}
                                {hasNote && (
                                  <span
                                    title={String(ev.note || '')}
                                    className="text-sm shrink-0 ml-1"
                                  >
                                    📝
                                  </span>
                                )}
                              </div>
                            </td>
                          );
                        }
                        cls +=
                          ev.type === 'unavailable'
                            ? 'bg-slate-100 border-slate-200'
                            : isPending
                            ? 'bg-amber-100 border-amber-200'
                            : 'bg-teal-100 border-teal-200';
                        if (isPending) cls += ' border-dashed opacity-80 ';
                        return (
                          <td
                            key={`d-td-${t.id}-${slotIdx}-${idx}`}
                            className={cls}
                            onClick={() =>
                              handleSlotClick(t.id, viewDateStr, slotIdx)
                            }
                          ></td>
                        );
                      }

                      return (
                        <td
                          key={`d-td-${t.id}-${slotIdx}-${idx}`}
                          className={cls + 'bg-gray-50/30 hover:bg-teal-50'}
                          onClick={() =>
                            handleSlotClick(t.id, viewDateStr, slotIdx)
                          }
                        >
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity pointer-events-none">
                            <Plus size={16} className="mx-auto text-teal-500" />
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderOnlineCalendarView = () => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = new Date(year, month, 1).getDay();

    const calendarDays = [];
    for (let i = 0; i < firstDayOfMonth; i++) calendarDays.push(null);
    for (let i = 1; i <= daysInMonth; i++)
      calendarDays.push(new Date(year, month, i));

    return (
      <div className="animate-in fade-in duration-500 max-w-6xl mx-auto">
        <div className="text-center mb-6">
          <h2 className="text-3xl font-black text-gray-800 flex items-center justify-center gap-3">
            <Globe className="text-indigo-500" /> 線上課專屬排課月曆
          </h2>
          <p className="text-gray-500 font-bold mt-2 mb-4">
            點擊月曆格子，即可單日排課或設定每週重複喔！
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <label className="inline-flex items-center gap-2 cursor-pointer bg-indigo-50 text-indigo-700 px-5 py-2.5 rounded-xl font-bold shadow-sm border-2 border-indigo-100 hover:bg-indigo-100 transition-all">
              <input
                type="checkbox"
                checked={showOnlyOnline}
                onChange={(e) => setShowOnlyOnline(e.target.checked)}
                className="w-5 h-5 accent-indigo-500"
              />
              ☑️ 只顯示名稱包含「線上」的課程
            </label>
            <select
              value={calendarTeacherFilter}
              onChange={(e) => setCalendarTeacherFilter(e.target.value)}
              className="px-5 py-2.5 rounded-xl font-bold border-2 border-indigo-100 text-indigo-700 bg-white outline-none focus:border-indigo-400"
            >
              <option value="">所有老師</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[3rem] shadow-2xl border-4 border-indigo-50 mb-8">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-black text-indigo-900">
              {String(year)} 年 {String(month + 1)} 月
            </h2>
            <div className="flex gap-2">
              <button
                onClick={() => setCalendarMonth(new Date(year, month - 1, 1))}
                className="p-3 bg-gray-100 rounded-xl hover:bg-indigo-100 hover:text-indigo-600 transition-colors"
              >
                <ChevronLeft />
              </button>
              <button
                onClick={() => setCalendarMonth(new Date())}
                className="px-6 py-3 bg-gray-100 font-bold rounded-xl hover:bg-indigo-100 hover:text-indigo-600 transition-colors"
              >
                這個月
              </button>
              <button
                onClick={() => setCalendarMonth(new Date(year, month + 1, 1))}
                className="p-3 bg-gray-100 rounded-xl hover:bg-indigo-100 hover:text-indigo-600 transition-colors"
              >
                <ChevronRight />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-2 md:gap-4 mb-2">
            {DAY_NAMES.map((d, idx) => (
              <div
                key={`hdr-cal-${idx}`}
                className="text-center font-black text-indigo-400 py-2 bg-indigo-50 rounded-xl"
              >
                {String(d)}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2 md:gap-4 auto-rows-fr">
            {calendarDays.map((day, idx) => {
              if (!day)
                return (
                  <div
                    key={`empty-cal-${idx}`}
                    className="min-h-[120px] bg-gray-50/50 rounded-2xl border-2 border-dashed border-gray-100"
                  ></div>
                );
              const dateStr = formatDateLocal(day);
              const isToday = dateStr === formatDateLocal(new Date());

              const dayEvents = (onlineEventsByDate[dateStr] || [])
                .filter(
                  (e) =>
                    (currentUser?.role === 'admin' ||
                      String(e?.teacherId) ===
                        String(currentUser?.teacherId)) &&
                    (!calendarTeacherFilter ||
                      String(e?.teacherId) === String(calendarTeacherFilter)) &&
                    (!showOnlyOnline ||
                      String(e?.reason || '').includes('線上') ||
                      String(e?.note || '').includes('線上'))
                )
                .sort(
                  (a, b) =>
                    (a?.slotIndices?.[0] || 0) - (b?.slotIndices?.[0] || 0)
                );

              return (
                <div
                  key={`cal-${dateStr}-${idx}`}
                  onClick={() => {
                    setCalendarAddModal({
                      isOpen: true,
                      date: dateStr,
                      teacherId:
                        currentUser?.role === 'teacher'
                          ? String(currentUser.teacherId)
                          : teachers.length > 0
                          ? String(teachers[0].id)
                          : '',
                      endDate: dateStr,
                      isRepeat: false,
                      reason: '線上課程',
                      startTime: '08:00',
                      endTime: '08:30',
                      eventType:
                        currentUser?.role === 'admin' ? 'course' : 'pending',
                      note: '',
                      customRate: '',
                      venueFee: '',
                    });
                  }}
                  className={`min-h-[120px] p-2 rounded-2xl border-4 transition-all cursor-pointer hover:-translate-y-1 hover:shadow-lg ${
                    isToday
                      ? 'bg-orange-50 border-orange-200'
                      : 'bg-white border-gray-100 hover:border-indigo-200'
                  }`}
                >
                  <div className="flex justify-between items-center mb-2">
                    <span
                      className={`w-8 h-8 flex items-center justify-center rounded-xl font-black ${
                        isToday ? 'bg-orange-500 text-white' : 'text-gray-700'
                      }`}
                    >
                      {String(day.getDate())}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {dayEvents.map((ev, evIdx) => {
                      const t = teachers.find(
                        (x) => String(x.id) === String(ev?.teacherId)
                      );
                      const isLock = ev?.type === 'unavailable';
                      const isPending = ev?.status === 'pending';
                      const hasNote = Boolean(
                        ev?.note && String(ev.note).trim() !== ''
                      );
                      return (
                        <div
                          key={`cal-ev-${ev?.id}-${evIdx}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditModal({
                              isBatch: false,
                              id: ev.id,
                              teacherId: ev.teacherId,
                              type: ev.type,
                              reason: ev.reason,
                              date: ev.date,
                              slotIndices: ev.slotIndices,
                              events: [ev],
                              daysOfWeek: [parseLocalDate(ev.date).getDay()],
                              sortTime: ev.createdAt,
                              updateTime: ev.updatedAt,
                              createdBy: ev.createdBy,
                              note: String(ev.note || ''),
                              status: String(ev.status || 'approved'),
                              customRate: ev.customRate || '',
                              venueFee: ev.venueFee || '',
                            });
                          }}
                          className={`p-1.5 rounded-lg text-left shadow-sm border-2 truncate hover:brightness-95 transition-all ${
                            isLock
                              ? 'bg-slate-100 border-slate-200'
                              : isPending
                              ? 'bg-amber-50 border-amber-200'
                              : 'bg-indigo-50 border-indigo-100'
                          }`}
                        >
                          <div className="text-[9px] font-black opacity-60 mb-0.5">
                            {String(TIMES[ev?.slotIndices?.[0] || 0])}
                          </div>
                          <div
                            className={`text-[11px] font-extrabold flex items-center gap-1 truncate ${
                              isPending ? 'text-amber-800' : 'text-indigo-800'
                            }`}
                          >
                            {isLock ? (
                              '🚫'
                            ) : isPending ? (
                              '⏳'
                            ) : (
                              <div
                                className={`w-3 h-3 rounded-full ${
                                  t ? t.avatar : 'bg-gray-300'
                                } flex-shrink-0`}
                              ></div>
                            )}
                            <span className="truncate">
                              {isLock
                                ? String(ev?.reason || '')
                                : `${String(t?.name || '')} (${String(
                                    ev?.reason || ''
                                  )})`}
                            </span>
                            {hasNote && (
                              <span
                                title={String(ev?.note || '')}
                                className="text-[10px] ml-1"
                              >
                                📝
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderAttendanceHome = () => {
    const activeClasses = classes.filter((c) => !c.isClosed);
    return (
      <div className="min-h-screen p-4">
        <div className="max-w-4xl mx-auto mt-10 animate-in fade-in">
          <button
            onClick={() => setCurrentView('home')}
            className="mb-6 flex items-center gap-2 text-gray-400 font-bold hover:text-gray-800 transition-colors"
          >
            <ChevronLeft /> 返回首頁
          </button>
          <div className="bg-white p-8 rounded-[3rem] shadow-xl border-4 border-blue-50 text-center mb-8">
            <UserCheck size={48} className="mx-auto text-blue-500 mb-4" />
            <h2 className="text-3xl font-black text-gray-800 mb-6">
              請選擇要點名的班級
            </h2>
            <div className="max-w-sm mx-auto space-y-4">
              <select
                value={attendanceClass}
                onChange={(e) => setAttendanceClass(e.target.value)}
                className="w-full p-4 border-2 border-blue-100 rounded-2xl font-black text-gray-700 outline-none focus:border-blue-400 text-lg text-center bg-white"
              >
                <option value="" disabled>
                  -- 選擇進行中班級 --
                </option>
                {activeClasses.map((c, idx) => (
                  <option key={`att-cls-${c.id}-${idx}`} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {attendanceClass && (
                <div className="animate-in slide-in-from-top-2">
                  <select
                    value={attendanceLesson}
                    onChange={(e) =>
                      setAttendanceLesson(Number(e.target.value))
                    }
                    className="w-full p-4 border-2 border-blue-100 rounded-2xl font-black text-blue-600 outline-none focus:border-blue-400 text-lg text-center mb-6 bg-blue-50"
                  >
                    {[
                      ...Array(
                        classes.find((c) => c.id === attendanceClass)
                          ?.totalLessons || 12
                      ),
                    ].map((_, i) => (
                      <option key={`lesson-opt-${i}`} value={i + 1}>
                        第 {i + 1} 堂課
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => {
                      const cls = classes.find((c) => c.id === attendanceClass);
                      const attId = `${attendanceClass}_${attendanceLesson}`;
                      const existingAtt = attendance.find(
                        (a) => a.id === attId
                      );
                      setAttendanceDate(
                        existingAtt?.date || formatDateLocal(new Date())
                      );
                      setAttendanceTeacherId(
                        existingAtt?.teacherId || cls?.defaultTeacherId || ''
                      );
                      setAttendanceNote(existingAtt?.note || '');
                      setCurrentAttendanceRecords(existingAtt?.records || {});
                      setCurrentView('attendance-take');
                    }}
                    className="w-full py-4 mt-4 bg-blue-500 text-white font-black text-xl rounded-2xl shadow-lg hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
                  >
                    <PlayCircle /> 進入點名表
                  </button>
                </div>
              )}
            </div>
            {activeClasses.length === 0 && (
              <p className="text-gray-400 font-bold mt-4">
                目前沒有進行中的班級，請聯繫管理員建立。
              </p>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderAttendanceTake = () => {
    const cls = classes.find((c) => c.id === attendanceClass);
    return (
      <div className="min-h-screen bg-gray-900 p-4 sm:p-8">
        <div className="max-w-3xl mx-auto bg-white rounded-[3rem] overflow-hidden shadow-2xl animate-in slide-in-from-bottom-8">
          <div className="bg-blue-500 p-6 sm:p-8 text-white relative">
            <button
              onClick={() => setCurrentView('attendance-home')}
              className="absolute top-6 left-6 p-2 bg-white/20 rounded-xl hover:bg-white/30"
            >
              <ChevronLeft />
            </button>
            <h2 className="text-2xl sm:text-3xl font-black text-center mt-10 sm:mt-0">
              {cls?.name}
            </h2>
            <div className="text-center font-bold text-blue-100 mt-2 text-lg">
              第 {attendanceLesson} 堂課 點名單
            </div>
          </div>

          <div className="p-4 sm:p-8 bg-blue-50 border-b-4 border-blue-100 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black text-blue-400 ml-1 uppercase">
                上課日期
              </label>
              <input
                type="date"
                value={attendanceDate}
                onChange={(e) => setAttendanceDate(e.target.value)}
                className="w-full p-3 rounded-xl border-2 border-white focus:border-blue-400 outline-none font-bold text-gray-700 shadow-sm"
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-blue-400 ml-1 uppercase">
                授課教師 (可切換代課)
              </label>
              <select
                value={attendanceTeacherId}
                onChange={(e) => setAttendanceTeacherId(e.target.value)}
                className="w-full p-3 rounded-xl border-2 border-white focus:border-blue-400 outline-none font-bold text-gray-700 shadow-sm bg-white"
              >
                <option value="" disabled>
                  請選擇授課教師
                </option>
                {teachers.map((t, idx) => (
                  <option key={`att-teach-${t.id}-${idx}`} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="text-[10px] font-black text-blue-400 ml-1 uppercase">
                課堂紀錄 / 備註
              </label>
              <input
                value={attendanceNote}
                onChange={(e) => setAttendanceNote(e.target.value)}
                placeholder="例如：今日教學進度、學生狀況..."
                className="w-full p-3 rounded-xl border-2 border-white focus:border-blue-400 outline-none font-bold text-gray-700 shadow-sm"
              />
            </div>
          </div>

          <div className="p-4 sm:p-8 space-y-3 max-h-[50vh] overflow-y-auto custom-scrollbar">
            {(cls?.students || []).map((student, i) => (
              <div
                key={`take-stu-${i}`}
                className="flex flex-col sm:flex-row sm:items-center justify-between bg-gray-50 p-4 rounded-2xl border-2 border-gray-100 gap-4 hover:border-blue-200 transition-colors"
              >
                <div className="font-extrabold text-xl text-gray-800">
                  {String(student)}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      setCurrentAttendanceRecords({
                        ...currentAttendanceRecords,
                        [student]: 'present',
                      })
                    }
                    className={`flex-1 sm:flex-none px-4 py-3 rounded-xl font-black text-sm transition-all border-2 ${
                      currentAttendanceRecords[student] === 'present'
                        ? 'bg-emerald-500 text-white border-emerald-600 shadow-md'
                        : 'bg-white text-gray-400 border-gray-200'
                    }`}
                  >
                    ✅ 出席
                  </button>
                  <button
                    onClick={() =>
                      setCurrentAttendanceRecords({
                        ...currentAttendanceRecords,
                        [student]: 'leave',
                      })
                    }
                    className={`flex-1 sm:flex-none px-4 py-3 rounded-xl font-black text-sm transition-all border-2 ${
                      currentAttendanceRecords[student] === 'leave'
                        ? 'bg-amber-400 text-white border-amber-500 shadow-md'
                        : 'bg-white text-gray-400 border-gray-200'
                    }`}
                  >
                    ⚠️ 請假
                  </button>
                  <button
                    onClick={() =>
                      setCurrentAttendanceRecords({
                        ...currentAttendanceRecords,
                        [student]: 'absent',
                      })
                    }
                    className={`flex-1 sm:flex-none px-4 py-3 rounded-xl font-black text-sm transition-all border-2 ${
                      currentAttendanceRecords[student] === 'absent'
                        ? 'bg-rose-500 text-white border-rose-600 shadow-md'
                        : 'bg-white text-gray-400 border-gray-200'
                    }`}
                  >
                    ❌ 缺席
                  </button>
                </div>
              </div>
            ))}
            {(cls?.students || []).length === 0 && (
              <div className="text-center font-bold text-gray-400 py-10">
                這個班級還沒有加入任何學員喔！
              </div>
            )}
          </div>

          <div className="p-4 sm:p-8 bg-gray-50 border-t-2 border-gray-100">
            <button
              onClick={handleAttendanceSave}
              className="w-full py-5 bg-blue-500 text-white font-black text-xl rounded-2xl shadow-xl shadow-blue-200 hover:bg-blue-600 transition-colors"
            >
              💾 儲存點名單
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderScheduleView = () => {
    return (
      <div className="animate-in slide-in-from-bottom-12 duration-500">
        <div className="bg-white p-6 sm:p-8 rounded-[3.5rem] shadow-2xl border-4 border-orange-50 mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-6 mb-10">
            <h2 className="font-black text-2xl sm:text-3xl flex items-center gap-4 text-gray-800 bg-orange-50 pr-8 sm:pr-10 pl-4 sm:pl-6 py-2 sm:py-3 rounded-[2rem] border-2 border-white shadow-inner">
              <div
                className={`w-12 h-12 sm:w-16 sm:h-16 rounded-[1.5rem] ${selectedTeacher?.avatar} text-white flex items-center justify-center border-4 border-white shadow-md text-xl sm:text-2xl`}
              >
                {String(selectedTeacher?.name || '').charAt(0)}
              </div>
              {String(selectedTeacher?.name || '')}{' '}
              <span className="text-orange-400 text-lg sm:text-xl font-bold opacity-80">
                專屬課表
              </span>
            </h2>

            <div className="flex items-center gap-4 bg-gray-50 p-2.5 rounded-[2rem] border-2 border-gray-100 shadow-sm w-full sm:w-auto justify-center">
              <button
                onClick={() =>
                  setViewDate(new Date(viewDate.getTime() - 7 * 86400000))
                }
                className="p-3 sm:p-4 bg-white rounded-2xl shadow-md text-orange-500 hover:scale-110 active:scale-95 transition-all"
              >
                <ChevronLeft strokeWidth={3} />
              </button>
              <div className="relative px-2 sm:px-4 font-black text-gray-700 tracking-tight text-sm sm:text-lg flex items-center justify-center cursor-pointer hover:text-orange-500 transition-colors group">
                {String(weekDays[0].displayDate)}{' '}
                <span className="text-orange-200 px-1">~</span>{' '}
                {String(weekDays[6].displayDate)}
                <CalendarIcon
                  size={16}
                  className="ml-2 text-orange-300 group-hover:text-orange-500 hidden sm:block"
                />
                <input
                  type="date"
                  value={formatDateLocal(viewDate)}
                  onChange={(e) => {
                    const d = new Date(e.target.value);
                    if (!isNaN(d.getTime())) {
                      setViewDate(d);
                      setSelection(null);
                    }
                  }}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
              </div>
              <button
                onClick={() =>
                  setViewDate(new Date(viewDate.getTime() + 7 * 86400000))
                }
                className="p-3 sm:p-4 bg-white rounded-2xl shadow-md text-orange-500 hover:scale-110 active:scale-95 transition-all"
              >
                <ChevronRight strokeWidth={3} />
              </button>
            </div>
          </div>
          <div className="overflow-x-auto custom-scrollbar pb-4 relative">
            <table className="w-full min-w-[900px] border-separate border-spacing-3">
              <thead>
                <tr>
                  <th className="w-24 text-orange-300 font-black text-xs sm:text-sm tracking-widest uppercase">
                    Timeline
                  </th>
                  {weekDays.map((d, dIdx) => {
                    const hol = getHolidayName(d.dateStr);
                    const isToday = d.dateStr === formatDateLocal(new Date());
                    return (
                      <th
                        key={`sch-th-${d.dateStr}-${dIdx}`}
                        className={`py-6 rounded-[2.5rem] transition-all border-4 ${
                          isToday
                            ? 'bg-orange-100 border-white shadow-xl'
                            : hol || d.dayName === '六' || d.dayName === '日'
                            ? 'bg-rose-50 border-rose-100 text-rose-600'
                            : 'bg-gray-50 border-transparent text-gray-600'
                        }`}
                      >
                        <div className="text-xs sm:text-sm font-black opacity-60 mb-1">
                          {String(d.displayDate)}
                        </div>
                        <div className="text-xl sm:text-2xl font-black">
                          週{String(d.dayName)}
                        </div>
                        {hol && (
                          <div className="text-[10px] bg-rose-400 text-white font-black rounded-lg px-3 py-1 mt-3 shadow-md inline-block uppercase tracking-wider">
                            {String(hol)}
                          </div>
                        )}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {TIMES.map((time, slotIdx) => (
                  <tr key={`sch-tr-${time}`}>
                    <td className="text-center font-black text-xs sm:text-sm text-orange-200 py-4 opacity-80">
                      {String(time)}
                    </td>
                    {weekDays.map((day, dayIdx) => {
                      const ev =
                        eventsMap[
                          `${selectedTeacher.id}_${day.dateStr}_${slotIdx}`
                        ];
                      let cls =
                        'h-16 rounded-[1.8rem] cursor-pointer transition-all border-4 border-transparent relative ';
                      if (ev) {
                        const isPending = ev.status === 'pending';
                        if (ev.slotIndices[0] === slotIdx) {
                          cls +=
                            ev.type === 'unavailable'
                              ? 'bg-slate-100 border-slate-200 shadow-inner opacity-80'
                              : isPending
                              ? 'bg-amber-100 border-amber-200 shadow-lg'
                              : 'bg-teal-100 border-white shadow-lg';
                          if (isPending) cls += ' opacity-80 border-dashed ';
                          let icon =
                            ev.type === 'unavailable' ? (
                              '🚫'
                            ) : isPending ? (
                              <span className="text-amber-500 font-black">
                                ⏳
                              </span>
                            ) : (
                              <Heart
                                size={14}
                                className="fill-teal-500 text-teal-500"
                              />
                            );
                          let textCol = isPending
                            ? 'text-amber-800'
                            : 'text-gray-700';
                          const hasNote = Boolean(
                            ev.note && String(ev.note).trim() !== ''
                          );
                          return (
                            <td
                              key={`sch-td-${day.dateStr}-${slotIdx}`}
                              className={cls}
                              onClick={() =>
                                handleSlotClick(
                                  selectedTeacher.id,
                                  day.dateStr,
                                  slotIdx
                                )
                              }
                            >
                              <div
                                className={`absolute inset-0 p-4 text-xs sm:text-sm font-black flex flex-col justify-center gap-1 ${textCol}`}
                              >
                                <span className="flex items-center gap-2 truncate">
                                  {icon}{' '}
                                  <span className="truncate">
                                    {String(ev.reason || '')}
                                  </span>
                                  {hasNote && (
                                    <span
                                      title={String(ev.note || '')}
                                      className="text-sm shrink-0 ml-1"
                                    >
                                      📝
                                    </span>
                                  )}
                                </span>
                              </div>
                            </td>
                          );
                        }
                        cls +=
                          ev.type === 'unavailable'
                            ? 'bg-slate-100 border-slate-200 opacity-60'
                            : isPending
                            ? 'bg-amber-100 border-amber-200'
                            : 'bg-teal-100 border-white';
                        if (isPending) cls += ' opacity-80 border-dashed ';
                        return (
                          <td
                            key={`sch-td-${day.dateStr}-${slotIdx}`}
                            className={cls}
                            onClick={() =>
                              handleSlotClick(
                                selectedTeacher.id,
                                day.dateStr,
                                slotIdx
                              )
                            }
                          ></td>
                        );
                      }

                      return (
                        <td
                          key={`sch-td-${day.dateStr}-${slotIdx}`}
                          className={
                            cls +
                            'bg-gray-50/50 border-white/50 hover:bg-orange-50 hover:border-orange-100'
                          }
                          onClick={() =>
                            handleSlotClick(
                              selectedTeacher.id,
                              day.dateStr,
                              slotIdx
                            )
                          }
                        >
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity pointer-events-none">
                            {(currentUser?.role === 'admin' ||
                              (currentUser?.role === 'teacher' &&
                                String(currentUser.teacherId) ===
                                  String(selectedTeacher.id))) && (
                              <Plus
                                size={24}
                                className="text-orange-400"
                                strokeWidth={3}
                              />
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderTeacherPortal = () => {
    const myT = teachers.find(
      (t) => String(t.id) === String(currentUser?.teacherId)
    );
    if (!myT) return null;

    const myGroups = groupedEvents.filter(
      (g) => String(g.teacherId) === String(currentUser?.teacherId)
    );
    const pendingEvents = myGroups.filter((g) => g.status === 'pending');

    return (
      <div className="max-w-7xl mx-auto pb-20 px-4 animate-in fade-in duration-500">
        <h2 className="text-2xl font-black text-center mb-8 flex justify-center items-center gap-4">
          <div
            className={`w-12 h-12 rounded-2xl ${myT.avatar} text-white flex items-center justify-center text-xl`}
          >
            {String(myT.name || '').charAt(0)}
          </div>{' '}
          {String(myT.name || '')} 教師中心
        </h2>

        {/* ✨ 老師待確認事項提醒區塊 */}
        {pendingEvents.length > 0 && (
          <div className="mb-8 bg-amber-50 border-2 border-amber-200 rounded-[2rem] p-6 shadow-lg flex items-start gap-4">
            <div className="bg-amber-100 p-3 rounded-xl text-amber-500">
              <Bell size={24} className="animate-bounce" />
            </div>
            <div>
              <h3 className="text-lg font-black text-amber-800 mb-1">
                您有 {String(pendingEvents.length)} 筆待確認的排課申請！
              </h3>
              <p className="text-sm font-bold text-amber-600">
                請在下方歷程報表中確認，或等待管理員核准。
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 bg-white p-6 rounded-[2.5rem] shadow-xl border-2 border-teal-50 h-fit sticky top-24">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-teal-600">
              <Plus size={20} /> 新增排課 / 請假申請
            </h3>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const res = await submitBatchData(
                  teacherBatch,
                  currentUser.teacherId
                );
                if (res.success)
                  setTeacherBatch({
                    ...teacherBatch,
                    courseName: '',
                    note: '',
                  });
                showAlert(res.msg);
              }}
              className="space-y-4"
            >
              <div className="flex gap-2 bg-gray-100 p-1 rounded-2xl">
                <button
                  type="button"
                  onClick={() =>
                    setTeacherBatch({ ...teacherBatch, eventType: 'course' })
                  }
                  className={`flex-1 py-2.5 rounded-xl font-bold text-xs transition-all ${
                    teacherBatch.eventType === 'course'
                      ? 'bg-white text-teal-600 shadow-sm'
                      : 'text-gray-400'
                  }`}
                >
                  📘 上課
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setTeacherBatch({ ...teacherBatch, eventType: 'pending' })
                  }
                  className={`flex-1 py-2.5 rounded-xl font-bold text-xs transition-all ${
                    teacherBatch.eventType === 'pending'
                      ? 'bg-white text-amber-600 shadow-md'
                      : 'text-gray-400'
                  }`}
                >
                  ⏳ 待審核
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setTeacherBatch({
                      ...teacherBatch,
                      eventType: 'unavailable',
                    })
                  }
                  className={`flex-1 py-2.5 rounded-xl font-bold text-xs transition-all ${
                    teacherBatch.eventType === 'unavailable'
                      ? 'bg-white text-slate-600 shadow-md'
                      : 'text-gray-400'
                  }`}
                >
                  🚫 停課請假
                </button>
              </div>
              <input
                required={teacherBatch.eventType !== 'unavailable'}
                value={teacherBatch.courseName}
                onChange={(e) =>
                  setTeacherBatch({
                    ...teacherBatch,
                    courseName: e.target.value,
                  })
                }
                placeholder="課程名稱 / 請假理由"
                className="w-full p-3 border-2 border-teal-100 rounded-xl font-bold outline-none focus:border-teal-400"
              />
              <input
                value={teacherBatch.note}
                onChange={(e) =>
                  setTeacherBatch({ ...teacherBatch, note: e.target.value })
                }
                placeholder="📝 備註事項 (選填)"
                className="w-full p-3 border-2 border-teal-100 rounded-xl font-bold outline-none focus:border-teal-400 bg-gray-50"
              />

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-black text-gray-400 ml-1">
                    起始日期
                  </label>
                  <input
                    type="date"
                    required
                    value={teacherBatch.startDate}
                    onChange={(e) =>
                      setTeacherBatch({
                        ...teacherBatch,
                        startDate: e.target.value,
                      })
                    }
                    className="w-full p-2 border rounded-xl text-sm font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-400 ml-1">
                    結束日期
                  </label>
                  <input
                    type="date"
                    required
                    value={teacherBatch.endDate}
                    onChange={(e) =>
                      setTeacherBatch({
                        ...teacherBatch,
                        endDate: e.target.value,
                      })
                    }
                    className="w-full p-2 border rounded-xl text-sm font-bold"
                  />
                </div>
              </div>

              <div className="bg-teal-50 p-3 rounded-2xl text-center">
                <div className="flex flex-wrap gap-1.5 justify-center">
                  {[
                    { num: 1, label: '一' },
                    { num: 2, label: '二' },
                    { num: 3, label: '三' },
                    { num: 4, label: '四' },
                    { num: 5, label: '五' },
                    { num: 6, label: '六' },
                    { num: 0, label: '日' },
                  ].map((d, dIdx) => (
                    <button
                      key={`t-btn-day-${d.num}-${dIdx}`}
                      type="button"
                      onClick={() =>
                        setTeacherBatch((prev) => ({
                          ...prev,
                          daysOfWeek: prev.daysOfWeek.includes(d.num)
                            ? prev.daysOfWeek.filter((x) => x !== d.num)
                            : [...prev.daysOfWeek, d.num],
                        }))
                      }
                      className={`w-8 h-8 rounded-lg font-bold text-[10px] ${
                        teacherBatch.daysOfWeek.includes(d.num)
                          ? 'bg-teal-500 text-white shadow-sm'
                          : 'bg-white text-gray-300'
                      }`}
                    >
                      {String(d.label)}
                    </button>
                  ))}
                </div>
              </div>

              {/* 排除日期介面 */}
              <div className="bg-rose-50 p-3 rounded-2xl text-center space-y-2 border border-rose-100">
                <label className="text-[10px] font-black text-rose-800">
                  略過特定日期 (不排課)
                </label>
                <div className="flex justify-center">
                  <input
                    type="date"
                    className="p-2 border border-rose-200 rounded-xl text-xs font-bold outline-none cursor-pointer bg-white"
                    onChange={(e) => {
                      if (
                        e.target.value &&
                        !(teacherBatch.excludeDates || []).includes(
                          e.target.value
                        )
                      )
                        setTeacherBatch({
                          ...teacherBatch,
                          excludeDates: [
                            ...(teacherBatch.excludeDates || []),
                            e.target.value,
                          ],
                        });
                      e.target.value = '';
                    }}
                  />
                </div>
                {(teacherBatch.excludeDates || []).length > 0 && (
                  <div className="flex flex-wrap gap-1.5 justify-center mt-2">
                    {(teacherBatch.excludeDates || []).map((d, dIdx) => (
                      <span
                        key={`t-exc-${d}-${dIdx}`}
                        className="text-[10px] bg-rose-200 text-rose-800 px-2 py-1 rounded-lg flex items-center gap-1 font-bold shadow-sm"
                      >
                        {String(d)}{' '}
                        <button
                          type="button"
                          onClick={() =>
                            setTeacherBatch({
                              ...teacherBatch,
                              excludeDates: (
                                teacherBatch.excludeDates || []
                              ).filter((x) => String(x) !== String(d)),
                            })
                          }
                          className="hover:text-rose-600 transition-colors ml-1"
                        >
                          ✖
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="min-w-0">
                  <label className="text-[10px] font-black text-gray-400 ml-1">
                    開始(24H)
                  </label>
                  <select
                    value={teacherBatch.startTime}
                    onChange={(e) =>
                      setTeacherBatch({
                        ...teacherBatch,
                        startTime: e.target.value,
                      })
                    }
                    className="w-full p-2 rounded-xl border bg-white text-xs font-bold"
                  >
                    {TIMES.map((t, idx) => (
                      <option key={`t-t-s-${idx}`} value={t}>
                        {String(t)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="min-w-0">
                  <label className="text-[10px] font-black text-gray-400 ml-1">
                    結束(24H)
                  </label>
                  <select
                    value={teacherBatch.endTime}
                    onChange={(e) =>
                      setTeacherBatch({
                        ...teacherBatch,
                        endTime: e.target.value,
                      })
                    }
                    className="w-full p-2 rounded-xl border bg-white text-xs font-bold"
                  >
                    {getAvailableEndTimes(teacherBatch.startTime).map(
                      (t, idx) => (
                        <option key={`t-t-e-${idx}`} value={t}>
                          {String(t)}
                        </option>
                      )
                    )}
                  </select>
                </div>
              </div>
              <button
                type="submit"
                className={`w-full py-4 text-white rounded-xl font-black shadow-xl transition-all hover:-translate-y-1 bg-teal-500`}
              >
                送出申請
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 bg-white p-6 rounded-[2.5rem] shadow-xl border-2 border-blue-50">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold flex items-center gap-2 text-blue-600">
                <Database size={20} /> 我的排課歷史
              </h3>
              {selectedGroups.length > 0 && (
                <button
                  onClick={() =>
                    showConfirm(
                      `確定刪除 ${selectedGroups.length} 筆歷程？`,
                      async () => {
                        const gs = myGroups.filter((g) =>
                          selectedGroups.includes(String(g.id))
                        );
                        for (const g of gs) {
                          for (const ev of g.events || [])
                            await deleteDoc(doc(db, 'events', String(ev.id)));
                        }
                        setSelectedGroups([]);
                        showAlert('✅ 刪除成功！');
                      }
                    )
                  }
                  className="px-4 py-2 bg-rose-500 text-white font-bold rounded-xl shadow-sm text-sm"
                >
                  <Trash2 size={16} className="inline mr-1" /> 刪除
                </button>
              )}
            </div>
            <div className="overflow-x-auto max-h-[500px] overflow-y-auto custom-scrollbar border rounded-2xl">
              <table className="w-full text-left min-w-[700px]">
                <thead className="bg-blue-50 sticky top-0">
                  <tr>
                    <th className="p-4 w-12 text-center">
                      <input
                        type="checkbox"
                        className="w-4 h-4 cursor-pointer accent-blue-500"
                        checked={
                          myGroups.length > 0 &&
                          selectedGroups.length === myGroups.length
                        }
                        onChange={(e) =>
                          setSelectedGroups(
                            e.target.checked
                              ? myGroups.map((g) => String(g.id))
                              : []
                          )
                        }
                      />
                    </th>
                    <th className="p-4 text-sm font-bold text-blue-800">
                      日期 / 週期
                    </th>
                    <th className="p-4 text-sm font-bold text-blue-800">
                      時段
                    </th>
                    <th className="p-4 text-sm font-bold text-blue-800">
                      狀態
                    </th>
                    <th className="p-4 text-sm font-bold text-blue-800">
                      內容
                    </th>
                    <th className="p-4 text-sm font-bold text-blue-800 text-center">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {myGroups.map((g, gIdx) => {
                    const isChecked = selectedGroups.includes(String(g.id));
                    return (
                      <tr
                        key={`tch-hist-${g.id}-${gIdx}`}
                        className={`border-b hover:bg-blue-50/30 ${
                          isChecked ? 'bg-blue-50' : ''
                        }`}
                      >
                        <td className="p-4 text-center">
                          <input
                            type="checkbox"
                            className="w-4 h-4 cursor-pointer accent-blue-500"
                            checked={isChecked}
                            onChange={() =>
                              setSelectedGroups((prev) =>
                                prev.includes(String(g.id))
                                  ? prev.filter((x) => x !== String(g.id))
                                  : [...prev, String(g.id)]
                              )
                            }
                          />
                        </td>
                        <td className="p-4 text-xs font-bold">
                          {g.isBatch ? (
                            <span className="text-teal-600 bg-teal-50 px-1 rounded inline-block">
                              📦 {String(g.startDate || '')}~
                              {String(g.endDate || '')}
                            </span>
                          ) : (
                            <span className="text-orange-600 bg-orange-50 px-1 rounded inline-block">
                              ✨ {String(g.date || '')}
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-xs text-gray-500 font-bold">
                          {String(TIMES[g.slotIndices[0]] || '')}~
                          {String(
                            END_TIMES[
                              g.slotIndices[g.slotIndices.length - 1]
                            ] || ''
                          )}
                        </td>
                        <td className="p-4">
                          {g.status === 'pending' ? (
                            <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded-md text-[10px] font-black border border-amber-200">
                              ⏳ 審核中
                            </span>
                          ) : g.type === 'unavailable' ? (
                            <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded-md text-[10px] font-black border border-slate-200">
                              🚫 已停課
                            </span>
                          ) : (
                            <span className="bg-teal-100 text-teal-700 px-2 py-1 rounded-md text-[10px] font-black border border-teal-200">
                              📘 已確認
                            </span>
                          )}
                        </td>
                        <td className="p-4 font-bold text-gray-700 text-sm">
                          <span className="truncate block max-w-[150px]">
                            {String(g.reason || '')}
                          </span>{' '}
                          {g.note && (
                            <span title={String(g.note || '')}>📝</span>
                          )}
                        </td>
                        <td className="p-4 flex gap-2 justify-center">
                          <button
                            onClick={() => openEditModal(g)}
                            className="p-2 bg-blue-50 text-blue-500 rounded-lg shadow-sm hover:bg-blue-500 hover:text-white transition-all"
                          >
                            <Edit3 size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderAdminDashboard = () => {
    const pendingGroups = groupedEvents.filter((g) => g.status === 'pending');

    let f = groupedEvents.filter(
      (g) =>
        (!historyFilter.teacherId ||
          String(g.teacherId) === String(historyFilter.teacherId)) &&
        (!historyFilter.type ||
          String(g.type) === String(historyFilter.type)) &&
        g.status !== 'pending'
    );
    f.sort((a, b) => {
      if (historySort === 'updateDesc')
        return (b.updateTime || 0) - (a.updateTime || 0);
      if (historySort === 'updateAsc')
        return (a.updateTime || 0) - (b.updateTime || 0);
      if (historySort === 'createDesc')
        return (b.sortTime || 0) - (a.sortTime || 0);
      if (historySort === 'createAsc')
        return (a.sortTime || 0) - (b.sortTime || 0);
      if (historySort === 'dateDesc')
        return (
          new Date(b.startDate || b.date || 0).getTime() -
          new Date(a.startDate || a.date || 0).getTime()
        );
      if (historySort === 'dateAsc')
        return (
          new Date(a.startDate || a.date || 0).getTime() -
          new Date(b.startDate || b.date || 0).getTime()
        );
      return 0;
    });

    return (
      <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
        <div className="flex gap-2 p-2 bg-white rounded-2xl shadow-sm overflow-x-auto custom-scrollbar sticky top-20 z-20 border border-gray-100">
          <button
            onClick={() => setAdminTab('schedule')}
            className={`flex-1 min-w-[120px] py-3 rounded-xl font-black text-sm transition-all flex items-center justify-center gap-2 ${
              adminTab === 'schedule'
                ? 'bg-orange-500 text-white shadow-md'
                : 'text-gray-500 hover:bg-orange-50'
            }`}
          >
            <CalendarIcon size={18} /> 排課與歷程
          </button>
          <button
            onClick={() => setAdminTab('salary')}
            className={`flex-1 min-w-[120px] py-3 rounded-xl font-black text-sm transition-all flex items-center justify-center gap-2 ${
              adminTab === 'salary'
                ? 'bg-emerald-500 text-white shadow-md'
                : 'text-gray-500 hover:bg-emerald-50'
            }`}
          >
            <CircleDollarSign size={18} /> 薪資結算
          </button>
          <button
            onClick={() => setAdminTab('venueFee')}
            className={`flex-1 min-w-[120px] py-3 rounded-xl font-black text-sm transition-all flex items-center justify-center gap-2 ${
              adminTab === 'venueFee'
                ? 'bg-purple-500 text-white shadow-md'
                : 'text-gray-500 hover:bg-purple-50'
            }`}
          >
            <Dumbbell size={18} /> 場地費(重訓)
          </button>
          <button
            onClick={() => setAdminTab('attendance')}
            className={`flex-1 min-w-[120px] py-3 rounded-xl font-black text-sm transition-all flex items-center justify-center gap-2 ${
              adminTab === 'attendance'
                ? 'bg-blue-500 text-white shadow-md'
                : 'text-gray-500 hover:bg-blue-50'
            }`}
          >
            <ClipboardList size={18} /> 點名系統
          </button>
          <button
            onClick={() => setAdminTab('settings')}
            className={`flex-1 min-w-[120px] py-3 rounded-xl font-black text-sm transition-all flex items-center justify-center gap-2 ${
              adminTab === 'settings'
                ? 'bg-rose-500 text-white shadow-md'
                : 'text-gray-500 hover:bg-rose-50'
            }`}
          >
            <Shield size={18} /> 人事與系統
          </button>
        </div>

        {/* ✨ 管理員待審核提醒區 */}
        {pendingGroups.length > 0 && adminTab === 'schedule' && (
          <div className="bg-amber-50 p-8 rounded-3xl shadow-xl border-2 border-amber-200">
            <h3 className="text-2xl font-black mb-6 flex items-center gap-3 text-amber-600">
              <Bell className="animate-bounce" size={28} /> 待處理的老師申請 (
              {String(pendingGroups.length)})
            </h3>
            <div className="overflow-x-auto custom-scrollbar border-2 border-amber-100 rounded-2xl bg-white">
              <table className="w-full text-left min-w-[1000px]">
                <thead className="bg-amber-100/50">
                  <tr>
                    <th className="p-4 text-sm font-black text-amber-800">
                      申請類別
                    </th>
                    <th className="p-4 text-sm font-black text-amber-800">
                      日期範圍
                    </th>
                    <th className="p-4 text-sm font-black text-amber-800">
                      時段(24H)
                    </th>
                    <th className="p-4 text-sm font-black text-amber-800">
                      指派老師
                    </th>
                    <th className="p-4 text-sm font-black text-amber-800">
                      申請內容
                    </th>
                    <th className="p-4 text-sm font-black text-amber-800">
                      申請者
                    </th>
                    <th className="p-4 text-sm font-black text-amber-800 text-center">
                      審核操作
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pendingGroups.map((g, gIdx) => {
                    const t = teachers.find(
                      (x) => String(x.id) === String(g.teacherId)
                    );
                    return (
                      <tr
                        key={`adm-pend-${g.id}-${gIdx}`}
                        className="border-b border-amber-50 hover:bg-amber-50/30"
                      >
                        <td className="p-4">
                          {g.type === 'unavailable' ? (
                            <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded font-black text-xs border border-slate-200">
                              🚫 請假/停課
                            </span>
                          ) : (
                            <span className="bg-teal-100 text-teal-700 px-2 py-1 rounded font-black text-xs border border-teal-200">
                              📘 排課申請
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-xs font-bold text-gray-700">
                          {g.isBatch
                            ? `${String(g.startDate || '')} ~ ${String(
                                g.endDate || ''
                              )}`
                            : String(g.date || '')}
                        </td>
                        <td className="p-4 text-xs font-bold text-gray-500">
                          {String(TIMES[g.slotIndices[0]] || '')}~
                          {String(
                            END_TIMES[
                              g.slotIndices[g.slotIndices.length - 1]
                            ] || ''
                          )}
                        </td>
                        <td className="p-4 font-black text-gray-800 text-sm">
                          {t ? String(t.name || '') : '已刪除'}
                        </td>
                        <td className="p-4 text-sm font-bold text-gray-700">
                          <span className="truncate block max-w-[150px]">
                            {String(g.reason || '')}
                          </span>{' '}
                          {g.note && (
                            <span title={String(g.note || '')}>📝</span>
                          )}
                        </td>
                        <td className="p-4 text-[10px] font-black text-amber-700">
                          {String(g.createdBy || '')}
                        </td>
                        <td className="p-4 flex gap-2 justify-center">
                          <button
                            onClick={() => handleApprovePending(g)}
                            className="px-3 py-2 bg-emerald-500 text-white rounded-xl font-black text-xs shadow hover:bg-emerald-600 transition-all flex items-center gap-1"
                          >
                            <CheckCircle size={14} /> 核准
                          </button>
                          <button
                            onClick={() => openEditModal(g)}
                            className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors"
                            title="修改內容"
                          >
                            <Edit3 size={16} />
                          </button>
                          <button
                            onClick={() =>
                              showConfirm(`確定退回並刪除此申請?`, async () => {
                                for (const ev of g.events || [])
                                  await deleteDoc(
                                    doc(db, 'events', String(ev.id || ''))
                                  );
                                showAlert('已退回申請！');
                              })
                            }
                            className="p-2 bg-rose-50 text-rose-500 rounded-xl hover:bg-rose-100 transition-colors"
                            title="拒絕申請"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* --- 排課管理 Tab --- */}
        {adminTab === 'schedule' && (
          <>
            <div className="bg-white p-8 rounded-3xl shadow-xl border-2 border-teal-50">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-teal-500">
                <CheckSquare /> 批次排課 / 鎖定
              </h3>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const res = await submitBatchData(
                    adminBatch,
                    adminBatch.teacherId
                  );
                  if (res.success)
                    setAdminBatch({ ...adminBatch, courseName: '', note: '' });
                  showAlert(res.msg);
                }}
                className="space-y-4"
              >
                <div className="flex gap-2 bg-gray-50 p-1.5 rounded-2xl">
                  <button
                    type="button"
                    onClick={() =>
                      setAdminBatch({ ...adminBatch, eventType: 'course' })
                    }
                    className={`flex-1 p-3 rounded-xl border-2 font-bold transition-all ${
                      adminBatch.eventType === 'course'
                        ? 'border-teal-400 bg-white text-teal-700 shadow-sm'
                        : 'border-transparent text-gray-400'
                    }`}
                  >
                    📘 上課排程
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setAdminBatch({ ...adminBatch, eventType: 'pending' })
                    }
                    className={`flex-1 p-3 rounded-xl border-2 font-bold transition-all ${
                      adminBatch.eventType === 'pending'
                        ? 'border-amber-400 bg-white text-amber-600 shadow-sm'
                        : 'border-transparent text-gray-400'
                    }`}
                  >
                    ⏳ 待確認
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setAdminBatch({ ...adminBatch, eventType: 'unavailable' })
                    }
                    className={`flex-1 p-3 rounded-xl border-2 font-bold transition-all ${
                      adminBatch.eventType === 'unavailable'
                        ? 'border-slate-400 bg-white text-slate-700 shadow-sm'
                        : 'border-transparent text-gray-400'
                    }`}
                  >
                    🚫 停課鎖定
                  </button>
                </div>
                <select
                  value={adminBatch.teacherId}
                  onChange={(e) =>
                    setAdminBatch({ ...adminBatch, teacherId: e.target.value })
                  }
                  className="w-full p-3 rounded-xl border-2 border-teal-100 font-bold bg-white outline-none focus:border-teal-400"
                >
                  {teachers.map((t, idx) => (
                    <option key={`opt-t-${t.id}-${idx}`} value={t.id}>
                      {String(t.name)}
                    </option>
                  ))}
                </select>
                <input
                  required
                  value={adminBatch.courseName}
                  onChange={(e) =>
                    setAdminBatch({ ...adminBatch, courseName: e.target.value })
                  }
                  placeholder="名稱或事由"
                  className="w-full p-3 border-2 border-teal-100 rounded-xl font-bold outline-none focus:border-teal-400"
                />
                <input
                  value={adminBatch.note}
                  onChange={(e) =>
                    setAdminBatch({ ...adminBatch, note: e.target.value })
                  }
                  placeholder="📝 備註事項 (選填)"
                  className="w-full p-3 border-2 border-teal-100 rounded-xl font-bold outline-none focus:border-teal-400 bg-gray-50"
                />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 ml-1">
                      起始日期
                    </label>
                    <input
                      type="date"
                      required
                      value={adminBatch.startDate}
                      onChange={(e) =>
                        setAdminBatch({
                          ...adminBatch,
                          startDate: e.target.value,
                        })
                      }
                      className="w-full p-3 border-2 border-teal-100 rounded-xl outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 ml-1">
                      結束日期
                    </label>
                    <input
                      type="date"
                      required
                      value={adminBatch.endDate}
                      onChange={(e) =>
                        setAdminBatch({
                          ...adminBatch,
                          endDate: e.target.value,
                        })
                      }
                      className="w-full p-3 border-2 border-teal-100 rounded-xl outline-none"
                    />
                  </div>
                </div>
                <div className="bg-teal-50 p-4 rounded-2xl text-center space-y-3">
                  <label className="text-[10px] font-black text-teal-800 uppercase">
                    Update Cycle (重複週幾)
                  </label>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {[
                      { num: 1, label: '一' },
                      { num: 2, label: '二' },
                      { num: 3, label: '三' },
                      { num: 4, label: '四' },
                      { num: 5, label: '五' },
                      { num: 6, label: '六' },
                      { num: 0, label: '日' },
                    ].map((d, dIdx) => (
                      <button
                        key={`btn-day-${d.num}-${dIdx}`}
                        type="button"
                        onClick={() =>
                          setAdminBatch((prev) => ({
                            ...prev,
                            daysOfWeek: prev.daysOfWeek.includes(d.num)
                              ? prev.daysOfWeek.filter((x) => x !== d.num)
                              : [...prev.daysOfWeek, d.num],
                          }))
                        }
                        className={`w-10 h-10 rounded-xl font-bold transition-all ${
                          adminBatch.daysOfWeek.includes(d.num)
                            ? 'bg-teal-500 text-white shadow-md scale-110'
                            : 'bg-white text-gray-400 border border-teal-100'
                        }`}
                      >
                        {String(d.label)}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="bg-rose-50 p-3 rounded-2xl text-center space-y-2 border border-rose-100">
                  <label className="text-[10px] font-black text-rose-800">
                    略過特定日期 (不排課)
                  </label>
                  <div className="flex justify-center">
                    <input
                      type="date"
                      className="p-2 border border-rose-200 rounded-xl text-xs font-bold outline-none cursor-pointer bg-white"
                      onChange={(e) => {
                        if (
                          e.target.value &&
                          !(adminBatch.excludeDates || []).includes(
                            e.target.value
                          )
                        )
                          setAdminBatch({
                            ...adminBatch,
                            excludeDates: [
                              ...(adminBatch.excludeDates || []),
                              e.target.value,
                            ],
                          });
                        e.target.value = '';
                      }}
                    />
                  </div>
                  {(adminBatch.excludeDates || []).length > 0 && (
                    <div className="flex flex-wrap gap-1.5 justify-center mt-2">
                      {(adminBatch.excludeDates || []).map((d, dIdx) => (
                        <span
                          key={`exc-${d}-${dIdx}`}
                          className="text-[10px] bg-rose-200 text-rose-800 px-2 py-1 rounded-lg flex items-center gap-1 font-bold shadow-sm"
                        >
                          {String(d)}{' '}
                          <button
                            type="button"
                            onClick={() =>
                              setAdminBatch({
                                ...adminBatch,
                                excludeDates: (
                                  adminBatch.excludeDates || []
                                ).filter((x) => String(x) !== String(d)),
                              })
                            }
                            className="hover:text-rose-600 transition-colors ml-1"
                          >
                            ✖
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="min-w-0">
                    <label className="text-[10px] font-bold text-gray-400 ml-1">
                      開始時間(24H)
                    </label>
                    <select
                      value={adminBatch.startTime}
                      onChange={(e) =>
                        setAdminBatch({
                          ...adminBatch,
                          startTime: e.target.value,
                        })
                      }
                      className="w-full p-3 border-2 border-teal-100 rounded-xl bg-white font-bold outline-none"
                    >
                      {TIMES.map((t, idx) => (
                        <option key={`t-s-${idx}`} value={t}>
                          {String(t)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="min-w-0">
                    <label className="text-[10px] font-bold text-gray-400 ml-1">
                      結束時間(24H)
                    </label>
                    <select
                      value={adminBatch.endTime}
                      onChange={(e) =>
                        setAdminBatch({
                          ...adminBatch,
                          endTime: e.target.value,
                        })
                      }
                      className="w-full p-3 border-2 border-teal-100 rounded-xl bg-white font-bold outline-none"
                    >
                      {getAvailableEndTimes(adminBatch.startTime).map(
                        (t, idx) => (
                          <option key={`t-e-${idx}`} value={t}>
                            {String(t)}
                          </option>
                        )
                      )}
                    </select>
                  </div>
                </div>
                {adminBatch.eventType !== 'unavailable' && (
                  <div className="grid grid-cols-2 gap-3 mb-2">
                    <div className="min-w-0">
                      <label className="text-[10px] font-bold text-emerald-600 ml-1 flex items-center gap-1">
                        <CircleDollarSign size={10} /> 特殊鐘點費
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={adminBatch.customRate}
                        onChange={(e) =>
                          setAdminBatch({
                            ...adminBatch,
                            customRate: e.target.value,
                          })
                        }
                        placeholder="依預設"
                        className="w-full p-3 border-2 border-emerald-100 rounded-xl bg-white font-bold outline-none focus:border-emerald-400 text-emerald-800 placeholder-emerald-300"
                      />
                    </div>
                    <div className="min-w-0">
                      <label className="text-[10px] font-bold text-purple-600 ml-1 flex items-center gap-1">
                        <Dumbbell size={10} /> 重訓場地費
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={adminBatch.venueFee}
                        onChange={(e) =>
                          setAdminBatch({
                            ...adminBatch,
                            venueFee: e.target.value,
                          })
                        }
                        placeholder="補貼金額"
                        className="w-full p-3 border-2 border-purple-100 rounded-xl bg-white font-bold outline-none focus:border-purple-400 text-purple-800 placeholder-purple-300"
                      />
                    </div>
                  </div>
                )}
                <button
                  type="submit"
                  className={`w-full py-4 text-white rounded-xl font-black shadow-lg transition-all hover:-translate-y-1 ${
                    adminBatch.eventType === 'unavailable'
                      ? 'bg-slate-600'
                      : 'bg-teal-500'
                  }`}
                >
                  建立排程
                </button>
              </form>
            </div>

            <div className="bg-white p-8 rounded-3xl shadow-xl border-2 border-indigo-50">
              <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
                <h3 className="text-xl font-bold flex items-center gap-2 text-indigo-600">
                  <Database /> 已確認排課歷程總報表
                </h3>
                <div className="flex flex-wrap items-center gap-3 bg-gray-50 p-2 rounded-2xl border">
                  <input
                    type="text"
                    placeholder="🔍 搜尋課程名稱或備註..."
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    className="p-2 rounded-xl border-2 text-xs font-bold bg-white w-full sm:w-auto outline-none focus:border-indigo-400"
                  />
                  <select
                    value={historyFilter.teacherId}
                    onChange={(e) =>
                      setHistoryFilter({
                        ...historyFilter,
                        teacherId: e.target.value,
                      })
                    }
                    className="p-2 rounded-xl border-2 text-xs font-bold bg-white"
                  >
                    <option value="">所有對象</option>
                    {teachers.map((t, idx) => (
                      <option key={`hf-t-${t.id}-${idx}`} value={t.id}>
                        {String(t.name || '')}
                      </option>
                    ))}
                  </select>
                  <select
                    value={historyFilter.type}
                    onChange={(e) =>
                      setHistoryFilter({
                        ...historyFilter,
                        type: e.target.value,
                      })
                    }
                    className="p-2 rounded-xl border-2 text-xs font-bold bg-white"
                  >
                    <option value="">所有狀態</option>
                    <option value="course">📘 已確認</option>
                    <option value="unavailable">🚫 停課</option>
                  </select>
                  <select
                    value={historySort}
                    onChange={(e) => setHistorySort(e.target.value)}
                    className="p-2 rounded-xl border-2 text-xs font-bold text-indigo-600 bg-white"
                  >
                    <option value="updateDesc">最後修改時間 (新→舊)</option>
                    <option value="updateAsc">最後修改時間 (舊→新)</option>
                    <option value="createDesc">建立時間 (新→舊)</option>
                    <option value="createAsc">建立時間 (舊→新)</option>
                    <option value="dateDesc">上課日期 (近→遠)</option>
                    <option value="dateAsc">上課日期 (遠→近)</option>
                  </select>
                  {selectedGroups.length > 0 && (
                    <button
                      onClick={() =>
                        showConfirm(
                          `刪除選取的 ${selectedGroups.length} 筆歷程？`,
                          async () => {
                            const gs = groupedEvents.filter((g) =>
                              selectedGroups.includes(String(g.id))
                            );
                            for (const g of gs) {
                              for (const ev of g.events || [])
                                await deleteDoc(
                                  doc(db, 'events', String(ev.id))
                                );
                            }
                            setSelectedGroups([]);
                            showAlert('刪除完成！');
                          }
                        )
                      }
                      className="p-2.5 bg-rose-500 text-white rounded-xl"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
              <div className="overflow-x-auto max-h-[600px] overflow-y-auto custom-scrollbar border-2 rounded-3xl">
                <table className="w-full text-left min-w-[1300px]">
                  <thead className="bg-indigo-50 sticky top-0 z-10 shadow-sm">
                    <tr>
                      <th className="p-5 w-12 text-center">
                        <input
                          type="checkbox"
                          checked={
                            filteredHistory.length > 0 &&
                            selectedGroups.length === filteredHistory.length
                          }
                          onChange={(e) =>
                            setSelectedGroups(
                              e.target.checked
                                ? filteredHistory.map((g) => String(g.id))
                                : []
                            )
                          }
                          className="accent-indigo-500 w-4 h-4 cursor-pointer"
                        />
                      </th>
                      <th className="p-4 text-sm font-black text-indigo-800">
                        日期 / 週期
                      </th>
                      <th className="p-4 text-sm font-black text-indigo-800">
                        時段(24H)
                      </th>
                      <th className="p-4 text-sm font-black text-indigo-800">
                        時數
                      </th>
                      <th className="p-4 text-sm font-black text-indigo-800">
                        狀態
                      </th>
                      <th className="p-4 text-sm font-black text-indigo-800">
                        指派老師
                      </th>
                      <th className="p-4 text-sm font-black text-indigo-800">
                        內容
                      </th>
                      <th className="p-4 text-sm font-black text-indigo-800">
                        備註
                      </th>
                      <th className="p-4 text-sm font-black text-indigo-800">
                        最後修改
                      </th>
                      <th className="p-4 text-sm font-black text-indigo-800">
                        由誰加入
                      </th>
                      <th className="p-4 text-sm font-black text-indigo-800 text-center">
                        操作
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredHistory.map((g, gIdx) => {
                      const t = teachers.find(
                        (x) => String(x.id) === String(g.teacherId)
                      );
                      const isChecked = selectedGroups.includes(String(g.id));
                      const duration = g.slotIndices.length * 0.5;
                      return (
                        <tr
                          key={`adm-hist-${g.id}-${gIdx}`}
                          className={`border-b ${
                            isChecked ? 'bg-indigo-50/50' : 'hover:bg-gray-50'
                          }`}
                        >
                          <td className="p-4 text-center">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleGroupSelection(g.id)}
                              className="accent-indigo-500 w-4 h-4 cursor-pointer"
                            />
                          </td>
                          <td className="p-4">
                            {g.isBatch ? (
                              <div>
                                <div className="text-[9px] text-teal-600 font-black mb-1 bg-teal-50 px-1 rounded inline-block">
                                  📦 批次
                                </div>
                                <div className="font-bold text-gray-700 text-xs">
                                  {String(g.startDate || '')}~
                                  {String(g.endDate || '')}
                                </div>
                                <div className="flex gap-1 mt-1">
                                  {(g.daysOfWeek || []).map((d) => (
                                    <span
                                      key={`day-${d}`}
                                      className="text-[9px] bg-indigo-100 text-indigo-600 px-1 rounded"
                                    >
                                      週{DAY_NAMES[d]}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <div>
                                <div className="text-[9px] text-orange-600 font-black mb-1 bg-orange-50 px-1 rounded inline-block">
                                  ✨ 單次
                                </div>
                                <div className="font-bold text-gray-700 text-xs">
                                  {String(g.date || '')}
                                </div>
                              </div>
                            )}
                          </td>
                          <td className="p-4 text-xs font-bold text-gray-500">
                            {String(TIMES[g.slotIndices[0]] || '')}~
                            {String(
                              END_TIMES[
                                g.slotIndices[g.slotIndices.length - 1]
                              ] || ''
                            )}
                          </td>
                          <td className="p-4 text-xs font-black text-indigo-500">
                            {duration} hr
                          </td>
                          <td className="p-4">
                            {g.type === 'course' ? (
                              <span className="bg-teal-100 text-teal-700 px-2 py-1 rounded-md text-[10px] font-black border border-teal-200">
                                📘 已確認
                              </span>
                            ) : g.type === 'pending' ? (
                              <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded-md text-[10px] font-black border border-amber-200">
                                ⏳ 待確認
                              </span>
                            ) : (
                              <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded-md text-[10px] font-black border border-slate-200">
                                🚫 停課
                              </span>
                            )}
                          </td>
                          <td className="p-4 font-extrabold text-gray-800 text-sm">
                            {t ? String(t.name || '') : '已刪除'}
                          </td>
                          <td className="p-4 text-xs font-bold text-gray-600">
                            <span className="truncate block max-w-[150px]">
                              {String(g.reason || '')}
                            </span>
                          </td>
                          <td className="p-4 text-xs text-gray-500 truncate max-w-[120px]">
                            {String(g.note || '')}
                          </td>
                          <td className="p-4 text-[10px] font-black text-gray-400">
                            {formatDateTime(g.updateTime || 0)}
                          </td>
                          <td className="p-4">
                            <div className="text-[10px] font-black text-indigo-700 bg-indigo-50/50 px-2 py-1 rounded-lg inline-block border border-indigo-100">
                              {String(g.createdBy || '')}
                            </div>
                          </td>
                          <td className="p-4 flex gap-2 justify-center">
                            <button
                              onClick={() => openEditModal(g)}
                              className="p-2.5 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all"
                            >
                              <Edit3 size={18} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* --- 薪資結算 Tab --- */}
        {adminTab === 'salary' && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border-4 border-emerald-50">
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-8">
                <h2 className="font-black text-3xl flex items-center gap-3 text-emerald-700">
                  <Calculator size={32} /> 💰 薪資與鐘點費結算
                </h2>
                <div className="flex items-center gap-3">
                  {selectedSalaryTeachers.length > 0 && (
                    <button
                      onClick={() => {
                        const dataList = calculatedSalaryData.filter((d) =>
                          selectedSalaryTeachers.includes(String(d.teacher.id))
                        );
                        setPrintSalaryModal({
                          isOpen: true,
                          dataList,
                          monthStr: salaryMonth,
                        });
                      }}
                      className="px-4 py-2 bg-emerald-500 text-white rounded-xl font-black shadow-lg hover:bg-emerald-600 flex items-center gap-2"
                    >
                      <Printer size={18} /> 一鍵匯出 (
                      {selectedSalaryTeachers.length})
                    </button>
                  )}
                  <div className="flex items-center gap-3 bg-emerald-50 px-4 py-2 rounded-2xl border-2 border-emerald-100">
                    <span className="font-bold text-emerald-800">結算月份</span>
                    <input
                      type="month"
                      value={salaryMonth}
                      onChange={(e) => {
                        setSalaryMonth(e.target.value);
                        setSelectedSalaryTeachers([]);
                      }}
                      className="bg-white border-2 border-emerald-200 rounded-xl px-3 py-1.5 font-black text-emerald-700 outline-none cursor-pointer"
                    />
                  </div>
                </div>
              </div>
              <div className="bg-orange-50 rounded-2xl p-4 mb-8 border border-orange-100 flex flex-wrap gap-4 items-center">
                <span className="text-sm font-black text-orange-800 flex items-center gap-1">
                  <Star size={16} /> 階段達成獎金：
                </span>
                <span className="text-xs font-bold text-orange-600 bg-white px-2 py-1 rounded-lg shadow-sm border border-orange-100">
                  33-40H <span className="text-red-500">3%</span>
                </span>
                <span className="text-xs font-bold text-orange-600 bg-white px-2 py-1 rounded-lg shadow-sm border border-orange-100">
                  41-50H <span className="text-red-500">5%</span>
                </span>
                <span className="text-xs font-bold text-orange-600 bg-white px-2 py-1 rounded-lg shadow-sm border border-orange-100">
                  51-60H <span className="text-red-500">8%</span>
                </span>
                <span className="text-xs font-bold text-orange-600 bg-white px-2 py-1 rounded-lg shadow-sm border border-orange-100">
                  61-70H <span className="text-red-500">12%</span>
                </span>
                <span className="text-xs font-bold text-orange-600 bg-white px-2 py-1 rounded-lg shadow-sm border border-orange-100">
                  71H+ <span className="text-red-500">16%</span>
                </span>
              </div>
              <div className="overflow-x-auto custom-scrollbar border-2 border-emerald-100 rounded-2xl">
                <table className="w-full text-left min-w-[900px]">
                  <thead className="bg-emerald-50">
                    <tr>
                      <th className="p-4 w-12 text-center">
                        <input
                          type="checkbox"
                          checked={
                            calculatedSalaryData.length > 0 &&
                            selectedSalaryTeachers.length ===
                              calculatedSalaryData.length
                          }
                          onChange={(e) =>
                            setSelectedSalaryTeachers(
                              e.target.checked
                                ? calculatedSalaryData.map((d) =>
                                    String(d.teacher.id)
                                  )
                                : []
                            )
                          }
                          className="accent-emerald-500 w-4 h-4 cursor-pointer"
                        />
                      </th>
                      <th className="p-4 font-black text-emerald-800">
                        教師姓名
                      </th>
                      <th className="p-4 font-black text-emerald-800 text-center">
                        本月總時數
                      </th>
                      <th className="p-4 font-black text-emerald-800 text-right">
                        基本結算
                      </th>
                      <th className="p-4 font-black text-emerald-800 text-right">
                        達成獎金
                      </th>
                      <th className="p-4 font-black text-emerald-800 text-right">
                        其他加減項
                      </th>
                      <th className="p-4 font-black text-emerald-800 text-right">
                        總計薪資
                      </th>
                      <th className="p-4 font-black text-emerald-800 text-center">
                        操作
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {calculatedSalaryData.length === 0 ? (
                      <tr>
                        <td
                          colSpan="8"
                          className="p-8 text-center font-bold text-gray-400"
                        >
                          系統中目前尚未建立任何人員資料喔！
                        </td>
                      </tr>
                    ) : (
                      calculatedSalaryData.map((data, idx) => {
                        const extraTotal =
                          data.reimbursement + data.adminFee - data.deduction;
                        return (
                          <React.Fragment key={`sal-${data.teacher.id}-${idx}`}>
                            <tr
                              className={`border-b border-emerald-50 hover:bg-emerald-50/50 transition-colors ${
                                selectedSalaryTeachers.includes(
                                  String(data.teacher.id)
                                )
                                  ? 'bg-emerald-50/50'
                                  : ''
                              }`}
                            >
                              <td className="p-4 text-center">
                                <input
                                  type="checkbox"
                                  checked={selectedSalaryTeachers.includes(
                                    String(data.teacher.id)
                                  )}
                                  onChange={() =>
                                    setSelectedSalaryTeachers((prev) =>
                                      prev.includes(String(data.teacher.id))
                                        ? prev.filter(
                                            (id) =>
                                              id !== String(data.teacher.id)
                                          )
                                        : [...prev, String(data.teacher.id)]
                                    )
                                  }
                                  className="accent-emerald-500 w-4 h-4 cursor-pointer"
                                />
                              </td>
                              <td className="p-4">
                                <div className="flex items-center gap-3">
                                  <div
                                    className={`w-10 h-10 rounded-xl ${data.teacher.avatar} text-white flex items-center justify-center font-black shadow-inner`}
                                  >
                                    {String(data.teacher.name).charAt(0)}
                                  </div>
                                  <div>
                                    <div className="font-extrabold text-gray-800 text-lg">
                                      {String(data.teacher.name)}
                                    </div>
                                    <div className="text-[10px] font-bold text-gray-400">
                                      基本底薪: ${data.teacher.defaultRate}/hr
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="p-4 text-center font-black text-gray-600 text-lg">
                                {data.totalHours}{' '}
                                <span className="text-sm">hr</span>
                              </td>
                              <td className="p-4 text-right font-bold text-gray-500">
                                ${data.baseSalary.toLocaleString()}
                              </td>
                              <td className="p-4 text-right font-bold text-orange-500">
                                {data.bonus > 0 ? (
                                  <div className="flex flex-col items-end">
                                    <span>
                                      + ${data.bonus.toLocaleString()}
                                    </span>
                                    <span className="text-[10px] bg-orange-100 px-1 rounded">
                                      達成 {data.bonusPctDisplay}%
                                    </span>
                                  </div>
                                ) : (
                                  '-'
                                )}
                              </td>
                              <td
                                className="p-4 text-right font-bold cursor-pointer hover:bg-blue-50 rounded-xl transition-colors"
                                onClick={() =>
                                  setAdjModal({
                                    isOpen: true,
                                    id: `${data.teacher.id}_${salaryMonth}`,
                                    tId: data.teacher.id,
                                    tName: data.teacher.name,
                                    month: salaryMonth,
                                    reimbursements: data.reimbursements,
                                    adminFees: data.teacher.adminFees || [],
                                    deductions: data.deductions,
                                  })
                                }
                              >
                                {extraTotal !== 0 ? (
                                  <span
                                    className={
                                      extraTotal > 0
                                        ? 'text-blue-600'
                                        : 'text-rose-500'
                                    }
                                  >
                                    {extraTotal > 0 ? '+' : ''}$
                                    {extraTotal.toLocaleString()}{' '}
                                    <Edit3
                                      size={10}
                                      className="inline opacity-50"
                                    />
                                  </span>
                                ) : (
                                  <span className="text-gray-300 text-xs flex items-center justify-end gap-1">
                                    <Plus size={12} />
                                    加減項
                                  </span>
                                )}
                              </td>
                              <td className="p-4 text-right font-black text-emerald-600 text-xl">
                                ${data.totalSalary.toLocaleString()}
                              </td>
                              <td className="p-4 text-center">
                                <div className="flex justify-center gap-2">
                                  <button
                                    onClick={() =>
                                      setExpandedSalaryTeacher(
                                        expandedSalaryTeacher ===
                                          data.teacher.id
                                          ? null
                                          : data.teacher.id
                                      )
                                    }
                                    className={`px-4 py-2 rounded-xl font-bold transition-all shadow-sm flex items-center gap-1 ${
                                      expandedSalaryTeacher === data.teacher.id
                                        ? 'bg-gray-800 text-white'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                                  >
                                    明細
                                  </button>
                                  <button
                                    onClick={() =>
                                      setPrintSalaryModal({
                                        isOpen: true,
                                        dataList: [data],
                                        monthStr: salaryMonth,
                                      })
                                    }
                                    className="px-4 py-2 bg-emerald-100 text-emerald-700 rounded-xl font-black hover:bg-emerald-500 hover:text-white transition-all shadow-sm flex items-center gap-2"
                                  >
                                    <FileText size={16} /> 輸出
                                  </button>
                                </div>
                              </td>
                            </tr>
                            {expandedSalaryTeacher === data.teacher.id && (
                              <tr className="bg-gray-800 border-b-4 border-gray-900">
                                <td colSpan="8" className="p-6">
                                  <div className="bg-white rounded-2xl overflow-hidden shadow-inner max-h-80 overflow-y-auto custom-scrollbar">
                                    <table className="w-full text-xs text-left">
                                      <thead className="bg-gray-100 sticky top-0">
                                        <tr className="text-gray-500">
                                          <th className="p-3">日期</th>
                                          <th className="p-3">時間</th>
                                          <th className="p-3">課程內容</th>
                                          <th className="p-3 text-right">
                                            時數
                                          </th>
                                          <th className="p-3 text-right">
                                            計算費率
                                          </th>
                                          <th className="p-3 text-right">
                                            小計
                                          </th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-gray-100">
                                        {data.details.map((dt, i) => (
                                          <tr
                                            key={`dtl-${i}`}
                                            className="hover:bg-blue-50/30"
                                          >
                                            <td className="p-3 font-bold text-gray-700">
                                              {String(dt.date)}
                                            </td>
                                            <td className="p-3 text-gray-500 font-bold">
                                              {String(dt.time)}
                                            </td>
                                            <td className="p-3 font-bold text-blue-700">
                                              {String(dt.reason)}{' '}
                                              {dt.note && (
                                                <span className="text-[10px] bg-blue-100 px-1 rounded text-blue-600 ml-1">
                                                  📝 {String(dt.note)}
                                                </span>
                                              )}
                                            </td>
                                            <td className="p-3 text-right font-black text-gray-600">
                                              {Number(dt.hours)} hr
                                            </td>
                                            <td className="p-3 text-right font-bold text-emerald-600">
                                              <span className="text-[9px] bg-emerald-50 px-1 rounded mr-1 border border-emerald-100">
                                                {String(dt.rateType)}
                                              </span>
                                              ${Number(dt.rateApplied)}
                                            </td>
                                            <td className="p-3 text-right font-black text-gray-800">
                                              ${Number(dt.fee)}
                                              {dt.venueFee > 0 && (
                                                <span className="text-[10px] text-purple-400 ml-1 block">
                                                  + ${dt.venueFee}場地費
                                                </span>
                                              )}
                                            </td>
                                          </tr>
                                        ))}
                                        {data.reimbursements.map(
                                          (item, i) =>
                                            Number(item.amount) > 0 && (
                                              <tr
                                                key={`r-${i}`}
                                                className="bg-blue-50/30"
                                              >
                                                <td
                                                  colSpan="3"
                                                  className="p-3 font-bold text-blue-600"
                                                >
                                                  代墊費用退款{' '}
                                                  {item.note && (
                                                    <span className="text-xs text-gray-500">
                                                      ({item.note})
                                                    </span>
                                                  )}
                                                </td>
                                                <td className="p-3 text-right font-black text-gray-400">
                                                  -
                                                </td>
                                                <td className="p-3 text-right text-gray-400">
                                                  -
                                                </td>
                                                <td className="p-3 text-right font-black text-blue-600">
                                                  +$
                                                  {Number(
                                                    item.amount
                                                  ).toLocaleString()}
                                                </td>
                                              </tr>
                                            )
                                        )}
                                        {data.adminFees.map(
                                          (item, i) =>
                                            Number(item.amount) > 0 && (
                                              <tr
                                                key={`a-${i}`}
                                                className="bg-blue-50/30"
                                              >
                                                <td
                                                  colSpan="3"
                                                  className="p-3 font-bold text-blue-600"
                                                >
                                                  行政工作費用{' '}
                                                  {item.note && (
                                                    <span className="text-xs text-gray-500">
                                                      ({item.note})
                                                    </span>
                                                  )}
                                                </td>
                                                <td className="p-3 text-right font-black text-gray-400">
                                                  -
                                                </td>
                                                <td className="p-3 text-right text-gray-400">
                                                  -
                                                </td>
                                                <td className="p-3 text-right font-black text-blue-600">
                                                  +$
                                                  {Number(
                                                    item.amount
                                                  ).toLocaleString()}
                                                </td>
                                              </tr>
                                            )
                                        )}
                                        {data.deductions.map(
                                          (item, i) =>
                                            Number(item.amount) > 0 && (
                                              <tr
                                                key={`d-${i}`}
                                                className="bg-rose-50/30"
                                              >
                                                <td
                                                  colSpan="3"
                                                  className="p-3 font-bold text-rose-600"
                                                >
                                                  扣除項目{' '}
                                                  {item.note && (
                                                    <span className="text-xs text-gray-500">
                                                      ({item.note})
                                                    </span>
                                                  )}
                                                </td>
                                                <td className="p-3 text-right font-black text-gray-400">
                                                  -
                                                </td>
                                                <td className="p-3 text-right text-gray-400">
                                                  -
                                                </td>
                                                <td className="p-3 text-right font-black text-rose-600">
                                                  -$
                                                  {Number(
                                                    item.amount
                                                  ).toLocaleString()}
                                                </td>
                                              </tr>
                                            )
                                        )}
                                      </tbody>
                                    </table>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* --- ✨ 全新：重訓場地費專屬 Tab --- */}
        {adminTab === 'venueFee' && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border-4 border-purple-50">
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-8">
                <h2 className="font-black text-3xl flex items-center gap-3 text-purple-700">
                  <Dumbbell size={32} /> 🏟️ 重訓與場地費管理
                </h2>
                <div className="flex items-center gap-3 bg-purple-50 px-4 py-2 rounded-2xl border-2 border-purple-100">
                  <span className="font-bold text-purple-800">結算月份</span>
                  <input
                    type="month"
                    value={salaryMonth}
                    onChange={(e) => setSalaryMonth(e.target.value)}
                    className="bg-white border-2 border-purple-200 rounded-xl px-3 py-1.5 font-black text-purple-700 outline-none cursor-pointer"
                  />
                </div>
              </div>

              <div className="bg-rose-50 p-4 rounded-2xl mb-8 border border-rose-100 text-sm font-bold text-rose-800">
                💡
                系統已自動列出本月所有名稱包含「重訓」的課程，或者您曾經輸入過場地費的課程。您可以在此快速為每一堂課填寫該給老師的場地補貼費用。
              </div>

              {(() => {
                const venueEvents = events
                  .filter(
                    (e) =>
                      e.status === 'approved' &&
                      String(e.date).startsWith(salaryMonth) &&
                      (String(e.reason).includes('重訓') ||
                        Number(e.venueFee) > 0 ||
                        e.venueFeeSet === true)
                  )
                  .sort(
                    (a, b) =>
                      new Date(a.date).getTime() - new Date(b.date).getTime()
                  );
                const unfilledEvents = venueEvents.filter(
                  (e) =>
                    e.venueFeeSet !== true &&
                    (!e.venueFee || Number(e.venueFee) <= 0)
                );
                const filledEvents = venueEvents.filter(
                  (e) => e.venueFeeSet === true || Number(e.venueFee) > 0
                );

                return (
                  <>
                    {/* 尚未填寫的重訓課 */}
                    <div className="mb-8">
                      <h4 className="font-black text-rose-600 mb-3 flex items-center gap-2">
                        🔴 尚未填寫場地費 ({unfilledEvents.length})
                      </h4>
                      <div className="overflow-x-auto custom-scrollbar border-2 border-rose-100 rounded-2xl bg-white">
                        <table className="w-full text-left min-w-[800px]">
                          <thead className="bg-rose-50">
                            <tr>
                              <th className="p-4 font-black text-rose-800">
                                日期
                              </th>
                              <th className="p-4 font-black text-rose-800">
                                時間
                              </th>
                              <th className="p-4 font-black text-rose-800">
                                授課教師
                              </th>
                              <th className="p-4 font-black text-rose-800">
                                課程內容
                              </th>
                              <th className="p-4 font-black text-rose-800 text-right w-48">
                                設定場地費補貼 ($)
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {unfilledEvents.length === 0 ? (
                              <tr>
                                <td
                                  colSpan="5"
                                  className="p-8 text-center font-bold text-gray-400"
                                >
                                  太棒了！所有重訓課皆已設定場地費。
                                </td>
                              </tr>
                            ) : (
                              unfilledEvents.map((ev, idx) => {
                                const t = teachers.find(
                                  (x) => String(x.id) === String(ev.teacherId)
                                );
                                return (
                                  <tr
                                    key={`v-un-${ev.id}-${idx}`}
                                    className="border-b border-rose-50 hover:bg-rose-50/30 transition-colors"
                                  >
                                    <td className="p-4 font-bold text-gray-700">
                                      {ev.date}
                                    </td>
                                    <td className="p-4 font-bold text-gray-500">
                                      {TIMES[ev.slotIndices[0]]}~
                                      {
                                        END_TIMES[
                                          ev.slotIndices[
                                            ev.slotIndices.length - 1
                                          ]
                                        ]
                                      }
                                    </td>
                                    <td className="p-4 font-black text-gray-800">
                                      {t?.name || '未知'}
                                    </td>
                                    <td className="p-4 font-bold text-purple-700">
                                      {ev.reason}{' '}
                                      {ev.note && (
                                        <span className="text-[10px] ml-1 bg-purple-100 px-1 rounded text-purple-600">
                                          📝 {ev.note}
                                        </span>
                                      )}
                                    </td>
                                    <td className="p-4">
                                      <form
                                        onSubmit={async (e) => {
                                          e.preventDefault();
                                          const newFee =
                                            e.target.feeInput.value;
                                          await updateDoc(
                                            doc(db, 'events', String(ev.id)),
                                            {
                                              venueFee: Number(newFee),
                                              venueFeeSet: true,
                                            }
                                          );
                                          showAlert('✅ 場地費設定成功！');
                                        }}
                                        className="flex items-center justify-end gap-2"
                                      >
                                        <input
                                          name="feeInput"
                                          type="number"
                                          min="0"
                                          defaultValue={ev.venueFee || ''}
                                          placeholder="輸入金額"
                                          className="w-24 p-2 text-right font-black border-2 border-rose-200 rounded-xl outline-none focus:border-rose-500 bg-rose-50"
                                        />
                                        <button
                                          type="submit"
                                          className="p-2 bg-rose-100 text-rose-600 hover:bg-rose-500 hover:text-white rounded-xl transition-colors"
                                        >
                                          <Save size={18} />
                                        </button>
                                      </form>
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* 已填寫的重訓課 */}
                    <div>
                      <h4 className="font-black text-emerald-600 mb-3 flex items-center gap-2">
                        🟢 已設定完成 ({filledEvents.length})
                      </h4>
                      <div className="overflow-x-auto custom-scrollbar border-2 border-emerald-100 rounded-2xl bg-white">
                        <table className="w-full text-left min-w-[800px]">
                          <thead className="bg-emerald-50">
                            <tr>
                              <th className="p-4 font-black text-emerald-800">
                                日期
                              </th>
                              <th className="p-4 font-black text-emerald-800">
                                時間
                              </th>
                              <th className="p-4 font-black text-emerald-800">
                                授課教師
                              </th>
                              <th className="p-4 font-black text-emerald-800">
                                課程內容
                              </th>
                              <th className="p-4 font-black text-emerald-800 text-right w-48">
                                設定場地費補貼 ($)
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {filledEvents.length === 0 ? (
                              <tr>
                                <td
                                  colSpan="5"
                                  className="p-8 text-center font-bold text-gray-400"
                                >
                                  目前尚無已設定場地費的課程。
                                </td>
                              </tr>
                            ) : (
                              filledEvents.map((ev, idx) => {
                                const t = teachers.find(
                                  (x) => String(x.id) === String(ev.teacherId)
                                );
                                return (
                                  <tr
                                    key={`v-fill-${ev.id}-${idx}`}
                                    className="border-b border-emerald-50 hover:bg-emerald-50/30 transition-colors"
                                  >
                                    <td className="p-4 font-bold text-gray-700">
                                      {ev.date}
                                    </td>
                                    <td className="p-4 font-bold text-gray-500">
                                      {TIMES[ev.slotIndices[0]]}~
                                      {
                                        END_TIMES[
                                          ev.slotIndices[
                                            ev.slotIndices.length - 1
                                          ]
                                        ]
                                      }
                                    </td>
                                    <td className="p-4 font-black text-gray-800">
                                      {t?.name || '未知'}
                                    </td>
                                    <td className="p-4 font-bold text-purple-700">
                                      {ev.reason}{' '}
                                      {ev.note && (
                                        <span className="text-[10px] ml-1 bg-purple-100 px-1 rounded text-purple-600">
                                          📝 {ev.note}
                                        </span>
                                      )}
                                    </td>
                                    <td className="p-4">
                                      <form
                                        onSubmit={async (e) => {
                                          e.preventDefault();
                                          const newFee =
                                            e.target.feeInput.value;
                                          await updateDoc(
                                            doc(db, 'events', String(ev.id)),
                                            {
                                              venueFee: Number(newFee),
                                              venueFeeSet: true,
                                            }
                                          );
                                          showAlert('✅ 場地費更新成功！');
                                        }}
                                        className="flex items-center justify-end gap-2"
                                      >
                                        <input
                                          name="feeInput"
                                          type="number"
                                          min="0"
                                          defaultValue={ev.venueFee || 0}
                                          className="w-24 p-2 text-right font-black border-2 border-emerald-200 rounded-xl outline-none focus:border-emerald-500 bg-emerald-50 text-emerald-700"
                                        />
                                        <button
                                          type="submit"
                                          className="p-2 bg-emerald-100 text-emerald-600 hover:bg-emerald-500 hover:text-white rounded-xl transition-colors"
                                        >
                                          <Save size={18} />
                                        </button>
                                      </form>
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        )}

        {/* --- 點名系統 Tab --- */}
        {adminTab === 'attendance' && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border-4 border-blue-50">
              <h2 className="font-black text-3xl flex items-center gap-3 text-blue-700 mb-8">
                <BookOpen size={32} /> 🧑‍🎓 班級與學員名單建檔
              </h2>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!classModal.name.trim()) return;
                  const studentsList = classModal.studentsInput
                    .split('\n')
                    .map((s) => s.trim())
                    .filter((s) => s !== '');
                  const id =
                    classModal.id ||
                    'cls_' +
                      Date.now().toString() +
                      '_' +
                      Math.random().toString(36).substring(2, 7);
                  await setDoc(doc(db, 'classes', id), {
                    id,
                    name: classModal.name.trim(),
                    startDate: classModal.startDate,
                    endDate: classModal.endDate,
                    defaultTeacherId: classModal.defaultTeacherId,
                    totalLessons: Number(classModal.totalLessons),
                    students: studentsList,
                    isClosed: false,
                    updatedAt: Date.now(),
                  });
                  setClassModal({
                    isOpen: false,
                    id: '',
                    name: '',
                    startDate: formatDateLocal(new Date()),
                    endDate: formatDateLocal(new Date()),
                    defaultTeacherId: '',
                    totalLessons: 12,
                    studentsInput: '',
                  });
                  showAlert('✅ 班級儲存成功！');
                }}
                className="bg-blue-50 p-6 rounded-3xl border-2 border-blue-100 mb-10"
              >
                <h3 className="font-bold text-blue-800 mb-4">
                  {classModal.id ? '✏️ 編輯班級' : '✨ 新增常態班級'}
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="md:col-span-2">
                    <label className="text-[10px] font-black text-blue-400 ml-1 uppercase">
                      Class Name
                    </label>
                    <input
                      required
                      value={classModal.name}
                      onChange={(e) =>
                        setClassModal({ ...classModal, name: e.target.value })
                      }
                      placeholder="例如：2026春季 素描進階班"
                      className="w-full p-4 rounded-xl border-2 border-white focus:border-blue-400 outline-none font-bold text-gray-700 shadow-sm"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-blue-400 ml-1 uppercase">
                      Total Lessons
                    </label>
                    <input
                      required
                      type="number"
                      min="1"
                      value={classModal.totalLessons}
                      onChange={(e) =>
                        setClassModal({
                          ...classModal,
                          totalLessons: e.target.value,
                        })
                      }
                      placeholder="總堂數"
                      className="w-full p-4 rounded-xl border-2 border-white focus:border-blue-400 outline-none font-bold text-gray-700 shadow-sm text-center"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="text-[10px] font-black text-blue-400 ml-1 uppercase">
                      Start Date (開課日期)
                    </label>
                    <input
                      type="date"
                      required
                      value={classModal.startDate}
                      onChange={(e) =>
                        setClassModal({
                          ...classModal,
                          startDate: e.target.value,
                        })
                      }
                      className="w-full p-4 rounded-xl border-2 border-white focus:border-blue-400 outline-none font-bold text-gray-700 shadow-sm"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-blue-400 ml-1 uppercase">
                      End Date (結束日期)
                    </label>
                    <input
                      type="date"
                      required
                      value={classModal.endDate}
                      onChange={(e) =>
                        setClassModal({
                          ...classModal,
                          endDate: e.target.value,
                        })
                      }
                      className="w-full p-4 rounded-xl border-2 border-white focus:border-blue-400 outline-none font-bold text-gray-700 shadow-sm"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-blue-400 ml-1 uppercase">
                      Default Teacher (預設授課)
                    </label>
                    <select
                      value={classModal.defaultTeacherId}
                      onChange={(e) =>
                        setClassModal({
                          ...classModal,
                          defaultTeacherId: e.target.value,
                        })
                      }
                      className="w-full p-4 rounded-xl border-2 border-white focus:border-blue-400 outline-none font-bold text-gray-700 shadow-sm bg-white"
                    >
                      <option value="">-- 無 --</option>
                      {teachers.map((t, idx) => (
                        <option key={`cls-opt-t-${t.id}-${idx}`} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black text-blue-400 ml-1 uppercase flex items-center justify-between">
                    <span>Student List (學員名單)</span>
                    <span className="text-rose-400 bg-white px-2 rounded">
                      一行輸入一個名字，可直接從 Excel 貼上！
                    </span>
                  </label>
                  <textarea
                    value={classModal.studentsInput}
                    onChange={(e) =>
                      setClassModal({
                        ...classModal,
                        studentsInput: e.target.value,
                      })
                    }
                    placeholder="王小明&#10;陳大毛&#10;林美麗..."
                    rows="5"
                    className="w-full p-4 rounded-xl border-2 border-white focus:border-blue-400 outline-none font-bold text-gray-700 shadow-sm resize-none"
                  />
                </div>
                <div className="flex gap-3 mt-4">
                  {classModal.id && (
                    <button
                      type="button"
                      onClick={() =>
                        setClassModal({
                          isOpen: false,
                          id: '',
                          name: '',
                          startDate: formatDateLocal(new Date()),
                          endDate: formatDateLocal(new Date()),
                          defaultTeacherId: '',
                          totalLessons: 12,
                          studentsInput: '',
                        })
                      }
                      className="flex-1 py-4 bg-white text-gray-500 font-bold rounded-xl shadow-sm border border-gray-100"
                    >
                      取消編輯
                    </button>
                  )}
                  <button
                    type="submit"
                    className="flex-[2] py-4 bg-blue-500 text-white font-black rounded-xl shadow-lg shadow-blue-200 hover:bg-blue-600 transition-all"
                  >
                    儲存班級資料
                  </button>
                </div>
              </form>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {classes.map((c, cIdx) => (
                  <div
                    key={`cls-card-${c.id}-${cIdx}`}
                    className={`p-6 rounded-3xl shadow-sm border-2 transition-all relative group ${
                      c.isClosed
                        ? 'bg-gray-50 border-gray-200 opacity-80'
                        : 'bg-white border-gray-100 hover:border-blue-200'
                    }`}
                  >
                    <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={async () => {
                          const newStatus = !c.isClosed;
                          await setDoc(doc(db, 'classes', String(c.id)), {
                            ...c,
                            isClosed: newStatus,
                            updatedAt: Date.now(),
                          });
                          showAlert(
                            newStatus
                              ? `🔒 班級 [${c.name}] 已結案，將不在老師點名列表顯示。`
                              : `🔓 班級 [${c.name}] 已重新開啟！`
                          );
                        }}
                        className={`p-2 rounded-lg text-white font-bold text-xs flex items-center gap-1 ${
                          c.isClosed
                            ? 'bg-emerald-500 hover:bg-emerald-600'
                            : 'bg-slate-500 hover:bg-slate-600'
                        }`}
                      >
                        {c.isClosed ? (
                          <>
                            <Unlock size={14} /> 重新開啟
                          </>
                        ) : (
                          <>
                            <Lock size={14} /> 結案封存
                          </>
                        )}
                      </button>
                      {!c.isClosed && (
                        <button
                          onClick={() => {
                            setClassModal({
                              isOpen: true,
                              id: c.id,
                              name: c.name,
                              startDate:
                                c.startDate || formatDateLocal(new Date()),
                              endDate: c.endDate || formatDateLocal(new Date()),
                              defaultTeacherId: c.defaultTeacherId || '',
                              totalLessons: c.totalLessons,
                              studentsInput: (c.students || []).join('\n'),
                            });
                            window.scrollTo(0, 0);
                          }}
                          className="p-2 bg-blue-50 text-blue-500 rounded-lg hover:bg-blue-500 hover:text-white"
                        >
                          <Edit3 size={16} />
                        </button>
                      )}
                      <button
                        onClick={() =>
                          showConfirm(
                            `刪除班級 [${c.name}]? (連同點名紀錄都會刪除)`,
                            async () => {
                              await deleteDoc(doc(db, 'classes', c.id));
                              const atts = attendance.filter(
                                (a) => a.classId === c.id
                              );
                              for (const a of atts)
                                await deleteDoc(doc(db, 'attendance', a.id));
                              showAlert('刪除成功！');
                            }
                          )
                        }
                        className="p-2 bg-rose-50 text-rose-500 rounded-lg hover:bg-rose-500 hover:text-white"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <h3 className="font-black text-xl text-gray-800 mb-1 pr-32 flex items-center gap-2">
                      {c.isClosed && (
                        <span className="bg-slate-600 text-white text-[10px] px-2 py-0.5 rounded flex items-center gap-1">
                          <Lock size={10} /> 已結案
                        </span>
                      )}
                      {c.name}
                    </h3>
                    <div className="text-sm font-bold text-gray-400 mb-4">
                      {c.startDate} ~ {c.endDate} <br />共 {c.totalLessons} 堂課
                      • {c.students?.length || 0} 位學員
                    </div>
                    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto custom-scrollbar">
                      {(c.students || []).map((s, i) => (
                        <span
                          key={`stu-tag-${i}`}
                          className={`text-xs px-2 py-1 rounded-md font-bold ${
                            c.isClosed
                              ? 'bg-gray-200 text-gray-500'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {classes.length > 0 && (
              <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border-4 border-indigo-50">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
                  <h2 className="font-black text-2xl flex items-center gap-3 text-indigo-700">
                    <ClipboardList size={28} /> 📊 班級出缺席總表
                  </h2>
                  <div className="flex items-center gap-3">
                    <select
                      value={attendanceClass}
                      onChange={(e) => setAttendanceClass(e.target.value)}
                      className="w-full md:w-auto p-3 border-2 border-indigo-100 rounded-xl font-bold bg-indigo-50 text-indigo-800 outline-none focus:border-indigo-400"
                    >
                      <option value="" disabled>
                        選擇要查看的班級
                      </option>
                      {classes.map((c, idx) => (
                        <option key={`att-cls-opt-${c.id}-${idx}`} value={c.id}>
                          {c.isClosed ? `[已結案] ` : ''}
                          {c.name}
                        </option>
                      ))}
                    </select>
                    {/* ✨ 列印出缺席總表按鈕 */}
                    {attendanceClass && (
                      <button
                        onClick={() =>
                          setPrintAttendanceModal({
                            isOpen: true,
                            classData: classes.find(
                              (c) => c.id === attendanceClass
                            ),
                          })
                        }
                        className="px-4 py-3 bg-indigo-500 text-white rounded-xl font-black shadow-lg hover:bg-indigo-600 flex items-center gap-2"
                      >
                        <Printer size={18} /> 匯出報表
                      </button>
                    )}
                  </div>
                </div>
                {attendanceClass &&
                  (() => {
                    const cls = classes.find((c) => c.id === attendanceClass);
                    if (!cls) return null;
                    return (
                      <div className="overflow-x-auto custom-scrollbar border-2 border-indigo-100 rounded-2xl relative">
                        {cls.isClosed && (
                          <div className="absolute inset-0 bg-slate-100/50 backdrop-blur-[1px] z-20 pointer-events-none flex items-center justify-center">
                            <div className="bg-white px-6 py-3 rounded-2xl shadow-lg border-2 border-slate-200 font-black text-slate-500 flex items-center gap-2">
                              <Lock size={20} /> 此班級已結案封存
                            </div>
                          </div>
                        )}
                        <table className="w-full text-center text-sm min-w-max relative z-10">
                          <thead className="bg-indigo-50">
                            <tr>
                              <th className="p-4 font-black text-indigo-800 sticky left-0 bg-indigo-50 shadow-[1px_0_0_#e0e7ff] z-10 w-32">
                                學員姓名
                              </th>
                              {[...Array(cls.totalLessons)].map((_, i) => {
                                const attId = `${cls.id}_${i + 1}`;
                                const attRecord = attendance.find(
                                  (a) => a.id === attId
                                );
                                return (
                                  <th
                                    key={`hdr-${i}`}
                                    className="p-4 font-bold text-indigo-600 min-w-[60px]"
                                  >
                                    第{i + 1}堂{/* ✨ 後台檢視：顯示日期 */}
                                    {attRecord?.date && (
                                      <div className="text-[10px] text-indigo-400 font-normal mt-1">
                                        {attRecord.date.substring(5)}{' '}
                                        {/* 只顯示 MM-DD */}
                                      </div>
                                    )}
                                  </th>
                                );
                              })}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {(cls.students || []).map((student, sIdx) => (
                              <tr
                                key={`stu-row-${sIdx}`}
                                className="hover:bg-indigo-50/30"
                              >
                                <td className="p-4 font-extrabold text-gray-700 sticky left-0 bg-white shadow-[1px_0_0_#f3f4f6] z-10 text-left">
                                  {String(student)}
                                </td>
                                {[...Array(cls.totalLessons)].map((_, lIdx) => {
                                  const attRecord = attendance.find(
                                    (a) => a.id === `${cls.id}_${lIdx + 1}`
                                  );
                                  const status = attRecord?.records?.[student];
                                  let icon = (
                                    <span className="text-gray-300">-</span>
                                  );
                                  if (status === 'present')
                                    icon = (
                                      <span className="text-emerald-500 font-black">
                                        ✅
                                      </span>
                                    );
                                  if (status === 'absent')
                                    icon = (
                                      <span className="text-rose-500 font-black">
                                        ❌
                                      </span>
                                    );
                                  if (status === 'leave')
                                    icon = (
                                      <span className="text-amber-500 font-black">
                                        ⚠️
                                      </span>
                                    );
                                  return (
                                    <td
                                      key={`cell-${lIdx}`}
                                      className="p-4 border-l border-gray-50 bg-white"
                                    >
                                      {icon}
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                            {(cls.students || []).length === 0 && (
                              <tr>
                                <td
                                  colSpan={cls.totalLessons + 1}
                                  className="p-8 text-gray-400 font-bold"
                                >
                                  尚無學員資料
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    );
                  })()}
              </div>
            )}
          </div>
        )}

        {/* --- 系統設定 Tab --- */}
        {adminTab === 'settings' && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white p-8 rounded-3xl shadow-xl border-2 border-orange-50 flex flex-col h-full">
                <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-orange-500">
                  <User /> 人事與底薪管理
                </h3>

                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-6 mb-6">
                  {/* 教師名單 */}
                  <div>
                    <div className="text-xs font-black text-orange-800 bg-orange-100 px-3 py-1.5 rounded-lg inline-block mb-3">
                      👩‍🏫 教師名單
                    </div>
                    <div className="space-y-2">
                      {teachers
                        .filter((t) => t.role !== 'staff')
                        .map((t, idx) => (
                          <div
                            key={`set-tch-${t.id}-${idx}`}
                            className="flex justify-between items-center bg-orange-50 p-3 rounded-xl border border-orange-100"
                          >
                            <div>
                              <span className="font-bold text-gray-700 block">
                                {String(t.name || '')}
                              </span>
                              <span className="text-[10px] font-black text-orange-500">
                                預設: ${t.defaultRate || 0}/hr
                              </span>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() =>
                                  setTeacherNameModal({
                                    isOpen: true,
                                    teacher: t,
                                    newName: String(t.name || ''),
                                    newRate: t.defaultRate || 0,
                                  })
                                }
                                className="p-2 bg-white text-orange-400 rounded-lg hover:bg-orange-100"
                              >
                                <Edit3 size={16} />
                              </button>
                              <button
                                onClick={() =>
                                  showConfirm(
                                    `確定刪除 ${String(t.name || '')}?`,
                                    () =>
                                      deleteDoc(
                                        doc(db, 'teachers', String(t.id))
                                      )
                                  )
                                }
                                className="p-2 bg-white text-rose-400 rounded-lg hover:bg-rose-100"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        ))}
                      {teachers.filter((t) => t.role !== 'staff').length ===
                        0 && (
                        <div className="text-xs text-gray-400 font-bold ml-2">
                          尚無資料
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 行政人員名單 */}
                  <div>
                    <div className="text-xs font-black text-blue-800 bg-blue-100 px-3 py-1.5 rounded-lg inline-block mb-3">
                      💼 行政人員名單
                    </div>
                    <div className="space-y-2">
                      {teachers
                        .filter((t) => t.role === 'staff')
                        .map((t, idx) => (
                          <div
                            key={`set-staff-${t.id}-${idx}`}
                            className="flex justify-between items-center bg-blue-50 p-3 rounded-xl border border-blue-100"
                          >
                            <div>
                              <span className="font-bold text-gray-700 block">
                                {String(t.name || '')}
                              </span>
                              <span className="text-[10px] font-black text-blue-500">
                                預設: ${t.defaultRate || 0}/hr
                              </span>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() =>
                                  setTeacherNameModal({
                                    isOpen: true,
                                    teacher: t,
                                    newName: String(t.name || ''),
                                    newRate: t.defaultRate || 0,
                                  })
                                }
                                className="p-2 bg-white text-blue-400 rounded-lg hover:bg-blue-100"
                              >
                                <Edit3 size={16} />
                              </button>
                              <button
                                onClick={() =>
                                  showConfirm(
                                    `確定刪除 ${String(t.name || '')}?`,
                                    () =>
                                      deleteDoc(
                                        doc(db, 'teachers', String(t.id))
                                      )
                                  )
                                }
                                className="p-2 bg-white text-rose-400 rounded-lg hover:bg-rose-100"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        ))}
                      {teachers.filter((t) => t.role === 'staff').length ===
                        0 && (
                        <div className="text-xs text-gray-400 font-bold ml-2">
                          尚無資料
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!newTeacherName.trim()) return;
                    const newId =
                      Date.now().toString() +
                      '_' +
                      Math.random().toString(36).substring(2, 7);
                    setDoc(doc(db, 'teachers', newId), {
                      id: newId,
                      name: newTeacherName.trim(),
                      role: newTeacherRole,
                      avatar: 'bg-teal-400',
                      defaultRate: Number(newTeacherRate),
                    });
                    setNewTeacherName('');
                    setNewTeacherRate(500);
                    showAlert('新增人員成功！');
                  }}
                  className="bg-gray-50 p-4 rounded-2xl border border-gray-100 mt-auto"
                >
                  <div className="flex flex-wrap gap-2 mb-2">
                    <select
                      value={newTeacherRole}
                      onChange={(e) => setNewTeacherRole(e.target.value)}
                      className="p-3 border-2 border-orange-100 rounded-xl outline-none focus:border-orange-400 font-bold bg-white text-gray-700"
                    >
                      <option value="teacher">教師</option>
                      <option value="staff">行政人員</option>
                    </select>
                    <input
                      required
                      value={newTeacherName}
                      onChange={(e) => setNewTeacherName(e.target.value)}
                      placeholder="人員姓名"
                      className="flex-1 p-3 border-2 border-orange-100 rounded-xl outline-none focus:border-orange-400 font-bold"
                    />
                    <input
                      required
                      type="number"
                      value={newTeacherRate}
                      onChange={(e) => setNewTeacherRate(e.target.value)}
                      placeholder="時薪"
                      className="w-24 p-3 border-2 border-orange-100 rounded-xl outline-none focus:border-orange-400 font-bold text-center"
                    />
                  </div>
                  <button
                    type="submit"
                    className="bg-orange-500 text-white p-3 rounded-xl font-bold w-full hover:bg-orange-600 transition-colors"
                  >
                    新增人員
                  </button>
                </form>
              </div>

              <div className="bg-white p-8 rounded-3xl shadow-xl border-2 border-purple-50 flex flex-col h-full">
                <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-purple-600">
                  <CircleDollarSign /> 關鍵字鐘點費規則
                </h3>
                <p className="text-xs text-gray-500 font-bold mb-4">
                  只要課程名稱包含以下關鍵字，系統結算時就會自動套用此費率！(如果沒有符合，則以老師的預設鐘點費計算)
                </p>
                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3 mb-6">
                  {salaryRules.map((r, idx) => (
                    <div
                      key={`rule-${r.id || r.docId}-${idx}`}
                      className="flex justify-between items-center bg-purple-50 p-3 rounded-xl border border-purple-100"
                    >
                      <div>
                        <span className="text-[10px] font-black text-purple-400 bg-white px-1.5 py-0.5 rounded mr-2">
                          關鍵字
                        </span>
                        <span className="font-extrabold text-gray-700">
                          {String(r.keyword)}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-black text-purple-600">
                          ${r.rate}/hr
                        </span>
                        <button
                          onClick={() =>
                            setEditSalaryRuleModal({
                              isOpen: true,
                              id: String(r.docId || r.id),
                              keyword: r.keyword,
                              rate: r.rate,
                            })
                          }
                          className="p-2 bg-white text-blue-400 rounded-lg hover:bg-blue-100"
                        >
                          <Edit3 size={14} />
                        </button>
                        {/* ✨ 修復：使用正確的 docId 來刪除 */}
                        <button
                          onClick={() =>
                            showConfirm(`確定刪除此規則?`, () =>
                              deleteDoc(
                                doc(db, 'salaryRules', String(r.docId || r.id))
                              )
                            )
                          }
                          className="p-2 bg-white text-rose-400 rounded-lg hover:bg-rose-100"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!newSalaryRule.keyword.trim() || !newSalaryRule.rate)
                      return;
                    const newId =
                      Date.now().toString() +
                      '_' +
                      Math.random().toString(36).substring(2, 7);
                    await setDoc(doc(db, 'salaryRules', newId), {
                      id: newId,
                      keyword: newSalaryRule.keyword.trim(),
                      rate: Number(newSalaryRule.rate),
                    });
                    setNewSalaryRule({ keyword: '', rate: '' });
                    showAlert('新增規則成功！');
                  }}
                  className="mt-auto flex flex-col gap-2 bg-gray-50 p-4 rounded-2xl border border-gray-100"
                >
                  <div className="flex gap-2">
                    <input
                      required
                      value={newSalaryRule.keyword}
                      onChange={(e) =>
                        setNewSalaryRule({
                          ...newSalaryRule,
                          keyword: e.target.value,
                        })
                      }
                      placeholder="關鍵字 (例如：六合里)"
                      className="flex-[2] p-3 border-2 border-purple-100 rounded-xl outline-none focus:border-purple-400 font-bold"
                    />
                    <input
                      required
                      type="number"
                      min="0"
                      value={newSalaryRule.rate}
                      onChange={(e) =>
                        setNewSalaryRule({
                          ...newSalaryRule,
                          rate: e.target.value,
                        })
                      }
                      placeholder="時薪"
                      className="flex-1 p-3 border-2 border-purple-100 rounded-xl outline-none focus:border-purple-400 font-bold text-center"
                    />
                  </div>
                  <button
                    type="submit"
                    className="bg-purple-500 hover:bg-purple-600 text-white p-3 rounded-xl font-black transition-colors w-full"
                  >
                    新增規則
                  </button>
                </form>
              </div>
              <div className="bg-white p-8 rounded-3xl shadow-xl border-2 border-blue-50">
                <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-blue-500">
                  <Shield /> 管理員權限
                </h3>
                <div className="space-y-3 mb-6 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                  {admins.map((a, idx) => (
                    <div
                      key={`adm-${a.id}-${idx}`}
                      className="flex justify-between items-center bg-blue-50 p-3 rounded-xl"
                    >
                      <div className="font-bold text-gray-700">
                        {String(a.name || '')}{' '}
                        <span className="text-xs text-blue-400 ml-1">
                          (@{String(a.username || '')})
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() =>
                            setAdminAccountModal({
                              isOpen: true,
                              admin: a,
                              name: String(a.name || ''),
                              username: String(a.username || ''),
                              password: String(a.password || ''),
                            })
                          }
                          className="p-2 bg-white text-blue-400 rounded-lg hover:bg-blue-100"
                        >
                          <Edit3 size={16} />
                        </button>
                        {String(a.id) !== 'super_admin' && (
                          <button
                            onClick={() =>
                              showConfirm(
                                `刪除管理員 ${String(a.name || '')}?`,
                                () => deleteDoc(doc(db, 'admins', String(a.id)))
                              )
                            }
                            className="p-2 bg-white text-rose-400 rounded-lg hover:bg-rose-100"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() =>
                    setAdminAccountModal({
                      isOpen: true,
                      admin: null,
                      name: '',
                      username: '',
                      password: '',
                    })
                  }
                  className="w-full p-3 bg-blue-500 text-white rounded-xl font-bold flex items-center justify-center gap-2"
                >
                  <UserPlus size={18} /> 建立管理員
                </button>
              </div>
              <div className="bg-white p-8 rounded-3xl shadow-xl border-2 border-rose-50">
                <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-rose-500">
                  <CalendarIcon /> 自定義特殊假期管理
                </h3>
                <div className="space-y-3 max-h-64 overflow-y-auto pr-2 custom-scrollbar mb-6">
                  {customHolidays.map((h, idx) => (
                    <div
                      key={`hol-${h.date}-${idx}`}
                      className="flex justify-between items-center bg-rose-50 p-4 rounded-2xl border"
                    >
                      <div>
                        <span className="text-xs font-black text-rose-600 bg-white px-2 py-1 rounded-lg mr-3">
                          {String(h?.date || '')}
                        </span>
                        <span className="font-extrabold text-gray-700">
                          {String(h?.name || '')}
                        </span>
                      </div>
                      <button
                        onClick={() =>
                          showConfirm(`取消 ${String(h?.name || '')}?`, () =>
                            deleteDoc(
                              doc(db, 'holidays', String(h?.date || ''))
                            )
                          )
                        }
                        className="p-2 text-rose-400 hover:bg-white rounded-xl"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                </div>
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!newHoliday.name.trim()) return;
                    await setDoc(doc(db, 'holidays', newHoliday.date), {
                      date: newHoliday.date,
                      name: newHoliday.name,
                    });
                    setNewHoliday({ ...newHoliday, name: '' });
                    showAlert('設定完成！');
                  }}
                  className="flex gap-2 bg-gray-50 p-4 rounded-2xl border border-gray-100"
                >
                  <input
                    type="date"
                    required
                    value={newHoliday.date}
                    onChange={(e) =>
                      setNewHoliday({ ...newHoliday, date: e.target.value })
                    }
                    className="flex-1 p-3 border-2 border-white rounded-xl font-bold outline-none focus:border-rose-300"
                  />
                  <input
                    required
                    value={newHoliday.name}
                    onChange={(e) =>
                      setNewHoliday({ ...newHoliday, name: e.target.value })
                    }
                    placeholder="例如：校慶補假"
                    className="flex-[2] p-3 border-2 border-white rounded-xl font-bold outline-none focus:border-rose-300"
                  />
                  <button
                    type="submit"
                    className="bg-rose-400 text-white px-6 rounded-xl font-black shadow-lg"
                  >
                    新增假期
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#FFFbf5] pb-20 font-sans selection:bg-blue-200">
      <nav className="bg-white/95 backdrop-blur-xl shadow-sm p-4 sticky top-0 z-40 no-print border-b-2 border-orange-50">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div
            className="flex items-center gap-4 cursor-pointer group"
            onClick={() => setCurrentView('home')}
          >
            <div className="bg-gradient-to-br from-orange-400 to-rose-400 p-2.5 rounded-2xl text-white shadow-lg group-hover:rotate-6 transition-transform">
              <CalendarDays size={24} />
            </div>
            <div className="hidden sm:block">
              <div className="text-xl font-black text-gray-800 tracking-tighter">
                LOHAS 管理中心
              </div>
              <div className="text-[10px] font-black text-orange-500 bg-orange-50 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
                <Star size={10} className="fill-orange-500" /> 哈囉，
                {String(currentUser?.name || '訪客')}！
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            {currentUser?.role === 'admin' && currentView !== 'admin' && (
              <button
                onClick={() => {
                  setCurrentView('admin');
                  setSelectedTeacher(null);
                }}
                className="p-2.5 bg-teal-50 text-teal-600 font-bold rounded-xl hover:bg-teal-100 transition-all flex items-center gap-2"
              >
                <Shield size={20} />{' '}
                <span className="hidden sm:inline">回管理後台</span>
              </button>
            )}
            {currentUser && (
              <button
                onClick={() => {
                  setCurrentView('home');
                  setSelectedTeacher(null);
                }}
                className="p-2.5 bg-blue-50 text-blue-600 font-bold rounded-xl hover:bg-blue-100 transition-all flex items-center gap-2"
              >
                <CalendarIcon size={20} />{' '}
                <span className="hidden sm:inline">總覽首頁</span>
              </button>
            )}
            <button
              onClick={() => {
                setCurrentUser(null);
                localStorage.removeItem('lohas_user');
                setSelectedTeacher(null);
                setCurrentView('home');
              }}
              className="p-2.5 bg-gray-100 text-gray-500 font-bold rounded-xl hover:bg-rose-50 hover:text-rose-500 transition-all flex items-center gap-2"
            >
              <LogOut size={20} />{' '}
              <span className="hidden sm:inline">切換帳號/登出</span>
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-4 mt-8">
        {currentView === 'home' && renderHomeView()}
        {currentView === 'admin-login' && renderAdminLogin()}
        {currentView === 'teacher-select' && renderTeacherSelect()}
        {currentView === 'schedule' && selectedTeacher && renderScheduleView()}
        {currentView === 'attendance-home' && renderAttendanceHome()}
        {currentView === 'attendance-take' && renderAttendanceTake()}
        {currentView === 'admin' &&
          currentUser?.role === 'admin' &&
          renderAdminDashboard()}

        {/* ✨ 單日總覽與線上月曆的渲染條件 */}
        {currentView === 'daily' && renderDailyView()}
        {currentView === 'calendar' && renderOnlineCalendarView()}
        {currentView === 'teacherPortal' &&
          currentUser?.role === 'teacher' &&
          renderTeacherPortal()}
      </main>

      {/* --- 共用彈出視窗 (Modals) --- */}
      {addModal.isOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-[100] p-4 backdrop-blur-md animate-in fade-in duration-200 no-print">
          <form
            onSubmit={handleAddSubmit}
            className="bg-white p-10 rounded-[3rem] shadow-2xl max-w-sm w-full border-4 border-white animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto custom-scrollbar"
          >
            <h3 className="text-2xl font-black mb-8 text-center text-gray-800 flex items-center justify-center gap-2">
              <Sparkles className="text-orange-400" size={24} /> 新增時段
            </h3>

            {currentUser?.role === 'admin' ? (
              <div className="flex gap-2 mb-6 bg-gray-100 p-1.5 rounded-2xl">
                <button
                  type="button"
                  onClick={() =>
                    setAddModal({ ...addModal, eventType: 'course' })
                  }
                  className={`flex-1 py-3 rounded-xl font-black text-sm transition-all ${
                    addModal.eventType === 'course'
                      ? 'bg-white text-teal-600 shadow-md'
                      : 'text-gray-400'
                  }`}
                >
                  📘 一般課程
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setAddModal({ ...addModal, eventType: 'pending' })
                  }
                  className={`flex-1 py-3 rounded-xl font-black text-sm transition-all ${
                    addModal.eventType === 'pending'
                      ? 'bg-white text-amber-600 shadow-md'
                      : 'text-gray-400'
                  }`}
                >
                  ⏳ 待確認
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setAddModal({ ...addModal, eventType: 'unavailable' })
                  }
                  className={`flex-1 py-3 rounded-xl font-black text-sm transition-all ${
                    addModal.eventType === 'unavailable'
                      ? 'bg-white text-slate-600 shadow-md'
                      : 'text-gray-400'
                  }`}
                >
                  🚫 停課
                </button>
              </div>
            ) : (
              <div className="mb-6 bg-amber-50 p-3 rounded-2xl border-2 border-amber-200 text-center text-amber-700 font-black text-sm">
                ⏳ 提交排課申請 (待管理員審核)
              </div>
            )}

            <div className="bg-gray-50 p-5 rounded-2xl mb-6 text-xs font-bold text-gray-600 border-2 text-center">
              📅 {String(addModal.date)} (週
              {DAY_NAMES[parseLocalDate(addModal.date).getDay()]})
            </div>

            <label
              className={`flex items-center gap-3 p-4 mb-6 rounded-2xl border-2 cursor-pointer transition-all ${
                addModal.isRepeat
                  ? 'bg-orange-500 border-orange-600 text-white shadow-lg'
                  : 'bg-white border-gray-200 text-gray-600'
              }`}
            >
              <input
                type="checkbox"
                className="w-5 h-5 accent-orange-400"
                checked={addModal.isRepeat}
                onChange={(e) =>
                  setAddModal({ ...addModal, isRepeat: e.target.checked })
                }
              />
              <span className="font-black flex items-center gap-2">
                <Repeat size={18} /> 往後每週同一天重複
              </span>
            </label>

            {addModal.isRepeat && (
              <div className="mb-6 animate-in slide-in-from-top-2">
                <label className="text-[10px] font-black text-gray-400 ml-1 uppercase tracking-widest">
                  Repeat Until (結束日期)
                </label>
                <input
                  type="date"
                  required
                  value={addModal.endDate}
                  onChange={(e) =>
                    setAddModal({ ...addModal, endDate: e.target.value })
                  }
                  className="w-full p-4 border-2 rounded-2xl font-black bg-white focus:border-orange-400 outline-none"
                  min={addModal.date}
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="text-[10px] font-black text-gray-400 ml-1">
                  開始時間
                </label>
                <select
                  value={addModal.startTime}
                  onChange={(e) =>
                    setAddModal({ ...addModal, startTime: e.target.value })
                  }
                  className="w-full p-4 border-2 rounded-2xl font-black bg-white text-sm outline-none focus:border-orange-400"
                >
                  {TIMES.map((t, idx) => (
                    <option key={`am-st-${idx}`} value={t}>
                      {String(t)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 ml-1">
                  結束時間
                </label>
                <select
                  value={addModal.endTime}
                  onChange={(e) =>
                    setAddModal({ ...addModal, endTime: e.target.value })
                  }
                  className="w-full p-4 border-2 rounded-2xl font-black bg-white text-sm outline-none focus:border-orange-400"
                >
                  {getAvailableEndTimes(addModal.startTime).map((t, idx) => (
                    <option key={`am-et-${idx}`} value={t}>
                      {String(t)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <input
              autoFocus
              required={addModal.eventType !== 'unavailable'}
              value={addModal.reason}
              onChange={(e) =>
                setAddModal({ ...addModal, reason: e.target.value })
              }
              placeholder={
                addModal.eventType === 'unavailable'
                  ? '停課原因 (選填)'
                  : "輸入課程名稱 (重訓課請包含'重訓'二字)"
              }
              className="w-full p-4 text-lg border-2 border-gray-100 rounded-2xl mb-4 font-bold outline-none focus:border-orange-400 bg-gray-50 focus:bg-white"
            />
            <input
              value={addModal.note}
              onChange={(e) =>
                setAddModal({ ...addModal, note: e.target.value })
              }
              placeholder="📝 備註 (選填)"
              className="w-full p-4 text-sm border-2 border-gray-100 rounded-2xl mb-8 font-bold outline-none focus:border-orange-400 bg-gray-50 focus:bg-white"
            />

            {/* ✨ 整合場地費輸入框 */}
            {currentUser?.role === 'admin' &&
              addModal.eventType !== 'unavailable' &&
              !addModal.isRepeat && (
                <div className="grid grid-cols-2 gap-3 mb-8">
                  <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
                    <label className="text-[10px] font-black text-emerald-600 ml-1 uppercase flex items-center gap-1">
                      <CircleDollarSign size={12} /> 單堂鐘點費 (選填)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={addModal.customRate}
                      onChange={(e) =>
                        setAddModal({ ...addModal, customRate: e.target.value })
                      }
                      placeholder="依預設"
                      className="w-full mt-2 p-3 text-sm border-2 rounded-xl font-black outline-none border-emerald-200 focus:border-emerald-500 bg-white"
                    />
                  </div>
                  <div className="bg-purple-50 p-4 rounded-2xl border border-purple-100">
                    <label className="text-[10px] font-black text-purple-600 ml-1 uppercase flex items-center gap-1">
                      <Dumbbell size={12} /> 場地補貼 (重訓)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={addModal.venueFee}
                      onChange={(e) =>
                        setAddModal({ ...addModal, venueFee: e.target.value })
                      }
                      placeholder="輸入金額"
                      className="w-full mt-2 p-3 text-sm border-2 rounded-xl font-black outline-none border-purple-200 focus:border-purple-500 bg-white text-purple-800"
                    />
                  </div>
                </div>
              )}

            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => {
                  setAddModal({
                    isOpen: false,
                    date: '',
                    teacherId: '',
                    startTime: '08:00',
                    endTime: '08:30',
                    eventType: 'course',
                    reason: '',
                    isRepeat: false,
                    endDate: '',
                    note: '',
                    customRate: '',
                    venueFee: '',
                  });
                  setSelection(null);
                }}
                className="flex-1 p-4 bg-gray-100 rounded-2xl font-bold text-gray-500"
              >
                取消
              </button>
              <button
                type="submit"
                className="flex-[2] p-4 bg-orange-500 text-white rounded-2xl font-black shadow-lg"
              >
                確認送出
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ✨ 線上月曆專用新增 Modal */}
      {calendarAddModal.isOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-[100] p-4 backdrop-blur-md animate-in fade-in duration-200 no-print">
          <form
            onSubmit={handleCalendarAddSubmit}
            className="bg-white p-8 sm:p-10 rounded-[3rem] shadow-2xl max-w-sm w-full border-4 border-white animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto custom-scrollbar"
          >
            <h3 className="text-2xl font-black mb-8 text-center text-indigo-800 flex items-center justify-center gap-2">
              <Globe className="text-indigo-500" size={24} /> 新增線上排程
            </h3>

            {currentUser?.role === 'admin' ? (
              <div className="flex gap-2 mb-6 bg-gray-100 p-1.5 rounded-2xl">
                <button
                  type="button"
                  onClick={() =>
                    setCalendarAddModal({
                      ...calendarAddModal,
                      eventType: 'course',
                    })
                  }
                  className={`flex-1 py-3 rounded-xl font-black text-sm transition-all ${
                    calendarAddModal.eventType === 'course'
                      ? 'bg-white text-indigo-600 shadow-md'
                      : 'text-gray-400'
                  }`}
                >
                  📘 已確認
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setCalendarAddModal({
                      ...calendarAddModal,
                      eventType: 'pending',
                    })
                  }
                  className={`flex-1 py-3 rounded-xl font-black text-sm transition-all ${
                    calendarAddModal.eventType === 'pending'
                      ? 'bg-white text-amber-600 shadow-md'
                      : 'text-gray-400'
                  }`}
                >
                  ⏳ 待確認
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setCalendarAddModal({
                      ...calendarAddModal,
                      eventType: 'unavailable',
                    })
                  }
                  className={`flex-1 py-3 rounded-xl font-black text-sm transition-all ${
                    calendarAddModal.eventType === 'unavailable'
                      ? 'bg-white text-slate-600 shadow-md'
                      : 'text-gray-400'
                  }`}
                >
                  🚫 停課
                </button>
              </div>
            ) : (
              <div className="mb-6 bg-amber-50 p-3 rounded-2xl border-2 border-amber-200 text-center text-amber-700 font-black text-sm">
                ⏳ 提交排課申請 (待管理員審核)
              </div>
            )}

            <div className="bg-indigo-50 p-4 rounded-2xl mb-6 text-sm font-bold text-indigo-600 border-2 border-indigo-100 text-center">
              📅 {String(calendarAddModal.date)} (週
              {DAY_NAMES[parseLocalDate(calendarAddModal.date).getDay()]})
            </div>

            <label
              className={`flex items-center gap-3 p-4 mb-6 rounded-2xl border-2 cursor-pointer transition-all ${
                calendarAddModal.isRepeat
                  ? 'bg-indigo-500 border-indigo-600 text-white shadow-lg'
                  : 'bg-white border-gray-200 text-gray-600'
              }`}
            >
              <input
                type="checkbox"
                className="w-5 h-5 accent-indigo-400"
                checked={calendarAddModal.isRepeat}
                onChange={(e) =>
                  setCalendarAddModal({
                    ...calendarAddModal,
                    isRepeat: e.target.checked,
                  })
                }
              />
              <span className="font-black flex items-center gap-2">
                <Repeat size={18} /> 往後每週同一天重複
              </span>
            </label>

            {calendarAddModal.isRepeat && (
              <div className="mb-6 animate-in slide-in-from-top-2">
                <label className="text-[10px] font-black text-gray-400 ml-1 uppercase tracking-widest">
                  Repeat Until (結束日期)
                </label>
                <input
                  type="date"
                  required
                  value={calendarAddModal.endDate}
                  onChange={(e) =>
                    setCalendarAddModal({
                      ...calendarAddModal,
                      endDate: e.target.value,
                    })
                  }
                  className="w-full p-4 border-2 rounded-2xl font-black bg-white focus:border-indigo-400 outline-none"
                  min={calendarAddModal.date}
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="min-w-0">
                <label className="text-[10px] font-black text-gray-400 ml-1">
                  開始時間
                </label>
                <select
                  value={calendarAddModal.startTime}
                  onChange={(e) =>
                    setCalendarAddModal({
                      ...calendarAddModal,
                      startTime: e.target.value,
                    })
                  }
                  className="w-full p-3 border-2 rounded-xl font-black bg-white text-sm outline-none focus:border-indigo-400"
                >
                  {TIMES.map((t, idx) => (
                    <option key={`c-st-${idx}`} value={t}>
                      {String(t)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="min-w-0">
                <label className="text-[10px] font-black text-gray-400 ml-1">
                  結束時間
                </label>
                <select
                  value={calendarAddModal.endTime}
                  onChange={(e) =>
                    setCalendarAddModal({
                      ...calendarAddModal,
                      endTime: e.target.value,
                    })
                  }
                  className="w-full p-3 border-2 rounded-xl font-black bg-white text-sm outline-none focus:border-indigo-400"
                >
                  {getAvailableEndTimes(calendarAddModal.startTime).map(
                    (t, idx) => (
                      <option key={`c-et-${idx}`} value={t}>
                        {String(t)}
                      </option>
                    )
                  )}
                </select>
              </div>
            </div>

            <div className="mb-4">
              <label className="text-[10px] font-black text-gray-400 ml-1">
                指派老師
              </label>
              <select
                disabled={
                  currentUser?.role !== 'admin' &&
                  currentUser?.role !== 'teacher'
                }
                value={calendarAddModal.teacherId}
                onChange={(e) =>
                  setCalendarAddModal({
                    ...calendarAddModal,
                    teacherId: e.target.value,
                  })
                }
                className={`w-full p-3 border-2 rounded-xl font-black outline-none focus:border-indigo-400 ${
                  currentUser?.role !== 'admin' &&
                  currentUser?.role !== 'teacher'
                    ? 'bg-gray-100 text-gray-500'
                    : 'bg-white text-gray-800'
                }`}
                required
              >
                <option value="" disabled>
                  請選擇老師
                </option>
                {teachers.map((t, idx) => (
                  <option key={`c-teach-${t.id}-${idx}`} value={t.id}>
                    {String(t.name)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-black text-gray-400 ml-1 uppercase tracking-widest">
                課程名稱 (若要篩選顯示，請包含"線上"二字)
              </label>
              <input
                required={calendarAddModal.eventType !== 'unavailable'}
                value={calendarAddModal.reason}
                onChange={(e) =>
                  setCalendarAddModal({
                    ...calendarAddModal,
                    reason: e.target.value,
                  })
                }
                placeholder={
                  calendarAddModal.eventType === 'unavailable'
                    ? '停課原因 (選填)'
                    : '例如：線上瑜珈'
                }
                className="w-full p-4 text-lg border-2 rounded-2xl font-black outline-none focus:border-indigo-400 bg-gray-50 focus:bg-white transition-all"
              />
            </div>

            <div className="mt-4">
              <label className="text-[10px] font-black text-gray-400 ml-1 uppercase tracking-widest">
                備註 (選填)
              </label>
              <input
                value={calendarAddModal.note}
                onChange={(e) =>
                  setCalendarAddModal({
                    ...calendarAddModal,
                    note: e.target.value,
                  })
                }
                placeholder="📝 會議連結或注意事項"
                className="w-full p-3 text-sm border-2 rounded-xl font-black outline-none focus:border-indigo-400 bg-gray-50 focus:bg-white transition-all"
              />
            </div>

            {currentUser?.role === 'admin' &&
              calendarAddModal.eventType !== 'unavailable' &&
              !calendarAddModal.isRepeat && (
                <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 mt-6">
                  <label className="text-[10px] font-black text-emerald-600 ml-1 uppercase flex items-center gap-1">
                    <CircleDollarSign size={12} /> 單堂特殊鐘點費 (選填)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={calendarAddModal.customRate}
                    onChange={(e) =>
                      setCalendarAddModal({
                        ...calendarAddModal,
                        customRate: e.target.value,
                      })
                    }
                    placeholder="若不填則依預設/關鍵字計算"
                    className="w-full mt-2 p-3 text-sm border-2 rounded-xl font-black outline-none border-emerald-200 focus:border-emerald-500 bg-white"
                  />
                </div>
              )}

            <div className="flex gap-4 mt-8">
              <button
                type="button"
                onClick={() => {
                  setCalendarAddModal({
                    isOpen: false,
                    date: '',
                    teacherId: '',
                    reason: '線上課程',
                    startTime: '08:00',
                    endTime: '09:00',
                    eventType: 'course',
                    isRepeat: false,
                    endDate: '',
                    note: '',
                    customRate: '',
                    venueFee: '',
                  });
                }}
                className="flex-1 p-4 bg-gray-100 rounded-2xl font-black text-gray-500"
              >
                取消
              </button>
              <button
                type="submit"
                className="flex-[2] p-4 bg-indigo-500 text-white rounded-2xl font-black shadow-lg hover:bg-indigo-600 active:scale-95 transition-all"
              >
                確認排入
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 編輯排程 Modal (包含場地費) */}
      {adminEditModal.isOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-[120] p-4 backdrop-blur-md animate-in fade-in duration-300 no-print">
          <form
            onSubmit={handleAdminEditSubmit}
            className="bg-white p-10 rounded-[3.5rem] shadow-2xl max-w-md w-full border-4 border-white max-h-[90vh] overflow-y-auto custom-scrollbar"
          >
            <h3 className="text-2xl font-black mb-8 text-center text-gray-800 flex items-center justify-center gap-3">
              <Edit3 className="text-blue-500" /> 編輯排程紀錄
            </h3>
            <div className="flex gap-2 mb-10 bg-gray-100 p-1.5 rounded-2xl">
              <button
                type="button"
                onClick={() =>
                  setAdminEditModal({ ...adminEditModal, type: 'course' })
                }
                className={`flex-1 py-3.5 rounded-xl font-black text-sm transition-all ${
                  adminEditModal.type === 'course'
                    ? 'bg-white text-teal-600 shadow-md transform scale-105'
                    : 'text-gray-400'
                }`}
              >
                📘 已確認
              </button>
              <button
                type="button"
                onClick={() =>
                  setAdminEditModal({ ...adminEditModal, type: 'pending' })
                }
                className={`flex-1 py-3.5 rounded-xl font-black text-sm transition-all ${
                  adminEditModal.type === 'pending'
                    ? 'bg-white text-amber-600 shadow-md transform scale-105'
                    : 'text-gray-400'
                }`}
              >
                ⏳ 待確認
              </button>
              <button
                type="button"
                onClick={() =>
                  setAdminEditModal({ ...adminEditModal, type: 'unavailable' })
                }
                className={`flex-1 py-3.5 rounded-xl font-black text-sm transition-all ${
                  adminEditModal.type === 'unavailable'
                    ? 'bg-white text-slate-600 shadow-md transform scale-105'
                    : 'text-gray-400'
                }`}
              >
                🚫 停課
              </button>
            </div>
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="min-w-0">
                  <label className="text-[10px] font-black text-gray-400 ml-1 uppercase">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={adminEditModal.startDate}
                    onChange={(e) =>
                      setAdminEditModal({
                        ...adminEditModal,
                        startDate: e.target.value,
                      })
                    }
                    className="w-full p-4 border-2 rounded-2xl text-sm font-black focus:border-blue-400 outline-none"
                  />
                </div>
                {adminEditModal.group?.isBatch && (
                  <div className="min-w-0">
                    <label className="text-[10px] font-black text-gray-400 ml-1 uppercase">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={adminEditModal.endDate}
                      onChange={(e) =>
                        setAdminEditModal({
                          ...adminEditModal,
                          endDate: e.target.value,
                        })
                      }
                      className="w-full p-4 border-2 rounded-2xl text-sm font-black focus:border-blue-400 outline-none"
                    />
                  </div>
                )}
              </div>
              {adminEditModal.group?.isBatch && (
                <div className="bg-blue-50 p-5 rounded-[2rem] border-2 border-white shadow-inner">
                  <label className="text-[10px] font-black text-blue-800 mb-4 block text-center uppercase tracking-widest">
                    Update Cycle
                  </label>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {[
                      { num: 1, label: '一' },
                      { num: 2, label: '二' },
                      { num: 3, label: '三' },
                      { num: 4, label: '四' },
                      { num: 5, label: '五' },
                      { num: 6, label: '六' },
                      { num: 0, label: '日' },
                    ].map((d, dIdx) => (
                      <button
                        key={`ed-${d.num}-${dIdx}`}
                        type="button"
                        onClick={() =>
                          setAdminEditModal((prev) => ({
                            ...prev,
                            daysOfWeek: prev.daysOfWeek.includes(d.num)
                              ? prev.daysOfWeek.filter((x) => x !== d.num)
                              : [...prev.daysOfWeek, d.num],
                          }))
                        }
                        className={`w-10 h-10 rounded-xl font-black text-sm transition-all ${
                          adminEditModal.daysOfWeek.includes(d.num)
                            ? 'bg-blue-500 text-white shadow-lg'
                            : 'bg-white text-gray-300 border'
                        }`}
                      >
                        {String(d.label)}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="min-w-0">
                  <label className="text-[10px] font-black text-gray-400 ml-1 uppercase">
                    Time Start
                  </label>
                  <select
                    value={adminEditModal.startTime}
                    onChange={(e) =>
                      setAdminEditModal({
                        ...adminEditModal,
                        startTime: e.target.value,
                      })
                    }
                    className="w-full p-4 border-2 rounded-2xl font-black bg-white text-sm outline-none"
                  >
                    {TIMES.map((t, idx) => (
                      <option key={`st-${idx}`} value={t}>
                        {String(t)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="min-w-0">
                  <label className="text-[10px] font-black text-gray-400 ml-1 uppercase">
                    Time End
                  </label>
                  <select
                    value={adminEditModal.endTime}
                    onChange={(e) =>
                      setAdminEditModal({
                        ...adminEditModal,
                        endTime: e.target.value,
                      })
                    }
                    className="w-full p-4 border-2 rounded-2xl font-black bg-white text-sm outline-none"
                  >
                    {getAvailableEndTimes(adminEditModal.startTime).map(
                      (t, idx) => (
                        <option key={`et-${idx}`} value={t}>
                          {String(t)}
                        </option>
                      )
                    )}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 ml-1 flex items-center gap-1">
                  指派老師{' '}
                  <span className="text-orange-400">(可切換代課老師)</span>
                </label>
                <select
                  value={adminEditModal.teacherId}
                  onChange={(e) =>
                    setAdminEditModal({
                      ...adminEditModal,
                      teacherId: e.target.value,
                    })
                  }
                  className="w-full p-4 border-2 rounded-2xl font-black outline-none focus:border-blue-400 bg-white text-gray-800"
                >
                  {teachers.map((t, idx) => (
                    <option key={`sel-t-${idx}`} value={t.id}>
                      {String(t.name)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 ml-1 uppercase tracking-widest">
                  Description (名稱/原因)
                </label>
                <input
                  required={adminEditModal.type !== 'unavailable'}
                  value={adminEditModal.reason}
                  onChange={(e) =>
                    setAdminEditModal({
                      ...adminEditModal,
                      reason: e.target.value,
                    })
                  }
                  placeholder={
                    adminEditModal.type === 'unavailable'
                      ? '停課原因(選填)'
                      : '課程名稱'
                  }
                  className="w-full p-4 border-2 rounded-2xl font-black outline-none focus:border-blue-400 bg-gray-50 focus:bg-white"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 ml-1 uppercase tracking-widest">
                  Notes (備註)
                </label>
                <input
                  value={adminEditModal.note}
                  onChange={(e) =>
                    setAdminEditModal({
                      ...adminEditModal,
                      note: e.target.value,
                    })
                  }
                  placeholder="📝 交接事項..."
                  className="w-full p-4 text-sm border-2 rounded-2xl font-black outline-none focus:border-blue-400 bg-gray-50 focus:bg-white"
                />
              </div>

              {/* ✨ 整合場地費輸入框 */}
              {currentUser?.role === 'admin' &&
                !adminEditModal.group?.isBatch &&
                adminEditModal.type !== 'unavailable' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100">
                      <label className="text-[10px] font-black text-emerald-600 ml-1 uppercase flex items-center gap-1">
                        <CircleDollarSign size={12} /> 特殊鐘點
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={adminEditModal.customRate}
                        onChange={(e) =>
                          setAdminEditModal({
                            ...adminEditModal,
                            customRate: e.target.value,
                          })
                        }
                        placeholder="依預設"
                        className="w-full mt-1 p-2 text-sm border-2 rounded-lg font-black outline-none border-emerald-200 focus:border-emerald-500 bg-white text-emerald-800 placeholder-emerald-300"
                      />
                    </div>
                    <div className="bg-purple-50 p-3 rounded-xl border border-purple-100">
                      <label className="text-[10px] font-black text-purple-600 ml-1 uppercase flex items-center gap-1">
                        <Dumbbell size={12} /> 場地費
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={adminEditModal.venueFee}
                        onChange={(e) =>
                          setAdminEditModal({
                            ...adminEditModal,
                            venueFee: e.target.value,
                          })
                        }
                        placeholder="補貼費用"
                        className="w-full mt-1 p-2 text-sm border-2 rounded-lg font-black outline-none border-purple-200 focus:border-purple-500 bg-white text-purple-800 placeholder-purple-300"
                      />
                    </div>
                  </div>
                )}

              {adminEditModal.group && (
                <div className="text-[9px] font-black text-gray-400 bg-gray-100 p-2 rounded-lg flex items-center gap-2 border border-gray-200">
                  <Info size={12} /> 最初由{' '}
                  {String(adminEditModal.group.createdBy || '系統')} 建立
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-8">
              <button
                type="button"
                onClick={async () => {
                  showConfirm(
                    adminEditModal.group?.isBatch
                      ? '確定刪除這整批紀錄嗎？'
                      : '確定刪除此單堂課程嗎？',
                    async () => {
                      for (const ev of adminEditModal.group?.events || [])
                        await deleteDoc(doc(db, 'events', String(ev.id)));
                      setAdminEditModal({ ...adminEditModal, isOpen: false });
                      showAlert('刪除成功！');
                    }
                  );
                }}
                className="p-4 bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white rounded-2xl transition-all shadow-sm flex items-center justify-center"
                title={
                  adminEditModal.group?.isBatch ? '刪除整批' : '刪除此單筆'
                }
              >
                <Trash2 size={24} />
              </button>
              <button
                type="button"
                onClick={() =>
                  setAdminEditModal({
                    isOpen: false,
                    group: null,
                    teacherId: '',
                    reason: '',
                    startTime: '',
                    endTime: '',
                    daysOfWeek: [],
                    startDate: '',
                    endDate: '',
                    type: 'course',
                    createdBy: '',
                    note: '',
                    customRate: '',
                    venueFee: '',
                  })
                }
                className="flex-1 p-4 bg-gray-100 rounded-2xl font-black text-gray-500"
              >
                取消
              </button>
              <button
                type="submit"
                className="flex-[2] p-4 bg-blue-500 text-white rounded-2xl font-black shadow-xl hover:brightness-110 active:scale-95 transition-all"
              >
                確認修改
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 修正教師姓名 Modal */}
      {teacherNameModal.isOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 backdrop-blur-md z-[110] p-4 animate-in fade-in duration-300 no-print">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!teacherNameModal.newName.trim()) return;
              await setDoc(
                doc(db, 'teachers', String(teacherNameModal.teacher.id)),
                {
                  ...teacherNameModal.teacher,
                  name: teacherNameModal.newName.trim(),
                  defaultRate: Number(teacherNameModal.newRate),
                }
              );
              setTeacherNameModal({
                isOpen: false,
                teacher: null,
                newName: '',
                newRate: 0,
              });
              showAlert('修改成功！');
            }}
            className="bg-white p-10 rounded-[3rem] shadow-2xl max-w-sm w-full border-4 border-white text-center"
          >
            <h3 className="text-2xl font-black mb-8 text-gray-800">
              修改教師資料
            </h3>
            <div className="space-y-4 mb-10 text-left">
              <div>
                <label className="text-[10px] font-black text-gray-400 ml-1 uppercase">
                  Name
                </label>
                <input
                  autoFocus
                  required
                  value={teacherNameModal.newName}
                  onChange={(e) =>
                    setTeacherNameModal({
                      ...teacherNameModal,
                      newName: e.target.value,
                    })
                  }
                  className="w-full p-4 border-4 border-orange-50 rounded-2xl font-black text-gray-700 outline-none focus:border-orange-400 transition-all text-xl"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 ml-1 uppercase">
                  Default Rate (預設鐘點費)
                </label>
                <input
                  required
                  type="number"
                  min="0"
                  value={teacherNameModal.newRate}
                  onChange={(e) =>
                    setTeacherNameModal({
                      ...teacherNameModal,
                      newRate: e.target.value,
                    })
                  }
                  className="w-full p-4 border-4 border-orange-50 rounded-2xl font-black text-gray-700 outline-none focus:border-orange-400 transition-all text-xl"
                />
              </div>
            </div>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() =>
                  setTeacherNameModal({
                    isOpen: false,
                    teacher: null,
                    newName: '',
                    newRate: 0,
                  })
                }
                className="flex-1 p-4 bg-gray-100 rounded-2xl font-black text-gray-500"
              >
                取消
              </button>
              <button
                type="submit"
                className="flex-1 p-4 bg-orange-500 text-white rounded-2xl font-black shadow-lg"
              >
                儲存修改
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 編輯鐘點費規則 Modal */}
      {editSalaryRuleModal.isOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 backdrop-blur-md z-[110] p-4 animate-in fade-in duration-300 no-print">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (
                !editSalaryRuleModal.keyword.trim() ||
                !editSalaryRuleModal.rate
              )
                return;
              await setDoc(
                doc(db, 'salaryRules', String(editSalaryRuleModal.id)),
                {
                  id: editSalaryRuleModal.id,
                  keyword: editSalaryRuleModal.keyword.trim(),
                  rate: Number(editSalaryRuleModal.rate),
                }
              );
              setEditSalaryRuleModal({
                isOpen: false,
                id: '',
                keyword: '',
                rate: '',
              });
              showAlert('規則修改成功！');
            }}
            className="bg-white p-10 rounded-[3rem] shadow-2xl max-w-sm w-full border-4 border-white text-center"
          >
            <h3 className="text-2xl font-black mb-8 text-gray-800">
              修改鐘點費規則
            </h3>
            <div className="space-y-4 mb-10 text-left">
              <div>
                <label className="text-[10px] font-black text-gray-400 ml-1 uppercase">
                  Keyword (關鍵字)
                </label>
                <input
                  autoFocus
                  required
                  value={editSalaryRuleModal.keyword}
                  onChange={(e) =>
                    setEditSalaryRuleModal({
                      ...editSalaryRuleModal,
                      keyword: e.target.value,
                    })
                  }
                  className="w-full p-4 border-4 border-purple-50 rounded-2xl font-black text-gray-700 outline-none focus:border-purple-400 transition-all text-xl"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 ml-1 uppercase">
                  Rate (特殊時薪)
                </label>
                <input
                  required
                  type="number"
                  min="0"
                  value={editSalaryRuleModal.rate}
                  onChange={(e) =>
                    setEditSalaryRuleModal({
                      ...editSalaryRuleModal,
                      rate: e.target.value,
                    })
                  }
                  className="w-full p-4 border-4 border-purple-50 rounded-2xl font-black text-gray-700 outline-none focus:border-purple-400 transition-all text-xl"
                />
              </div>
            </div>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() =>
                  setEditSalaryRuleModal({
                    isOpen: false,
                    id: '',
                    keyword: '',
                    rate: '',
                  })
                }
                className="flex-1 p-4 bg-gray-100 rounded-2xl font-black text-gray-500"
              >
                取消
              </button>
              <button
                type="submit"
                className="flex-1 p-4 bg-purple-500 text-white rounded-2xl font-black shadow-lg"
              >
                儲存修改
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 帳號設定 Modal */}
      {adminAccountModal.isOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 backdrop-blur-md z-[110] p-4 animate-in fade-in duration-300 no-print">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const id = adminAccountModal.admin
                ? adminAccountModal.admin.id
                : 'admin_' + Date.now();
              await setDoc(doc(db, 'admins', String(id)), {
                id,
                name: adminAccountModal.name,
                username: adminAccountModal.username,
                password: adminAccountModal.password,
              });
              setAdminAccountModal({
                isOpen: false,
                admin: null,
                name: '',
                username: '',
                password: '',
              });
              showAlert('帳號儲存成功！');
            }}
            className="bg-white p-10 rounded-[3rem] shadow-2xl max-w-sm w-full border-4 border-white space-y-5"
          >
            <h3 className="text-2xl font-black mb-8 flex items-center gap-3 text-gray-700">
              <Shield className="text-blue-500" /> 帳號設定
            </h3>
            <div>
              <label className="text-[10px] font-black text-gray-400 ml-1 uppercase">
                Display Name
              </label>
              <input
                required
                value={adminAccountModal.name}
                onChange={(e) =>
                  setAdminAccountModal({
                    ...adminAccountModal,
                    name: e.target.value,
                  })
                }
                className="w-full p-4 border-2 rounded-2xl font-bold bg-gray-50 focus:bg-white focus:border-blue-400 outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-gray-400 ml-1 uppercase">
                Login Account
              </label>
              <input
                required
                value={adminAccountModal.username}
                onChange={(e) =>
                  setAdminAccountModal({
                    ...adminAccountModal,
                    username: e.target.value,
                  })
                }
                className="w-full p-4 border-2 rounded-2xl font-bold bg-gray-50 focus:bg-white focus:border-blue-400 outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-gray-400 ml-1 uppercase">
                Login Password
              </label>
              <input
                required
                type="password"
                value={adminAccountModal.password}
                onChange={(e) =>
                  setAdminAccountModal({
                    ...adminAccountModal,
                    password: e.target.value,
                  })
                }
                className="w-full p-4 border-2 rounded-2xl font-bold bg-gray-50 focus:bg-white focus:border-blue-400 outline-none"
              />
            </div>
            <div className="flex gap-4 pt-6">
              <button
                type="button"
                onClick={() =>
                  setAdminAccountModal({
                    isOpen: false,
                    admin: null,
                    name: '',
                    username: '',
                    password: '',
                  })
                }
                className="flex-1 p-4 bg-gray-100 rounded-2xl font-black text-gray-500"
              >
                取消
              </button>
              <button
                type="submit"
                className="flex-1 p-4 bg-blue-500 text-white rounded-2xl font-black shadow-lg"
              >
                確認儲存
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 提示訊息 Modal */}
      {dialog.isOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/60 z-[300] p-4 animate-in fade-in duration-200 no-print">
          <div className="bg-white p-10 rounded-[3rem] text-center max-w-sm w-full shadow-2xl border-4 border-white animate-in zoom-in-90 duration-300">
            <div
              className={`mx-auto w-24 h-24 ${
                dialog.type === 'confirm'
                  ? 'bg-rose-100 text-rose-500'
                  : 'bg-orange-100 text-orange-500'
              } rounded-[2rem] flex items-center justify-center mb-8`}
            >
              <AlertCircle size={48} strokeWidth={2.5} />
            </div>
            <p className="font-black text-xl mb-10 text-gray-800 leading-relaxed whitespace-pre-wrap">
              {String(dialog.message)}
            </p>
            <div className="flex gap-4">
              {dialog.type === 'confirm' && (
                <button
                  onClick={closeDialog}
                  className="flex-1 p-4 bg-gray-100 rounded-2xl font-bold text-gray-600"
                >
                  取消
                </button>
              )}
              <button
                onClick={() => {
                  if (dialog.onConfirm) dialog.onConfirm();
                  closeDialog();
                }}
                className={`flex-1 p-4 text-white rounded-2xl font-black shadow-lg ${
                  dialog.type === 'confirm'
                    ? 'bg-rose-500 shadow-rose-200'
                    : 'bg-orange-500 shadow-orange-200'
                }`}
              >
                確定
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- 列印區塊：薪資單 --- */}
      {printSalaryModal.isOpen &&
        printSalaryModal.dataList &&
        printSalaryModal.dataList.length > 0 && (
          <div className="fixed inset-0 bg-gray-500 flex justify-center overflow-y-auto z-[200] p-4 sm:p-10 no-print">
            <div className="bg-white max-w-4xl w-full rounded-[2rem] shadow-2xl relative flex flex-col">
              <div
                className="p-6 sm:p-10 flex-1 relative overflow-y-auto custom-scrollbar printable-area"
                id="printable-salary-slip"
              >
                {printSalaryModal.dataList.map((data, index) => (
                  <div
                    key={`print-sal-${data.teacher.id}-${index}`}
                    style={{
                      pageBreakAfter:
                        index < printSalaryModal.dataList.length - 1
                          ? 'always'
                          : 'auto',
                    }}
                    className={
                      index < printSalaryModal.dataList.length - 1
                        ? 'mb-20 pb-20 border-b-4 border-dashed border-gray-300 print:border-none print:mb-0 print:pb-0'
                        : ''
                    }
                  >
                    <div className="text-center mb-10 border-b-4 border-gray-800 pb-8">
                      <h1 className="text-4xl font-black text-gray-800 tracking-widest mb-2">
                        LOHAS 薪資確認單
                      </h1>
                      <p className="text-xl font-bold text-gray-500">
                        結算月份：
                        {String(printSalaryModal.monthStr).replace('-', '年')}月
                      </p>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-10">
                      <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                        <div className="text-xs font-black text-gray-400 mb-1">
                          教師姓名
                        </div>
                        <div className="text-2xl font-black text-gray-800">
                          {String(data.teacher.name)}
                        </div>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                        <div className="text-xs font-black text-gray-400 mb-1">
                          總授課時數
                        </div>
                        <div className="text-2xl font-black text-blue-600">
                          {Number(data.totalHours)}{' '}
                          <span className="text-sm">hr</span>
                        </div>
                      </div>
                      <div className="bg-purple-50 p-4 rounded-xl border border-purple-200">
                        <div className="text-xs font-black text-purple-400 mb-1">
                          總場地費補貼
                        </div>
                        <div className="text-2xl font-black text-purple-600">
                          ${Number(data.totalVenueFee).toLocaleString()}
                        </div>
                      </div>
                      <div className="bg-orange-50 p-4 rounded-xl border border-orange-200">
                        <div className="text-xs font-black text-orange-400 mb-1">
                          達標獎金加給
                        </div>
                        <div className="text-2xl font-black text-orange-600">
                          <span className="text-sm mr-1">
                            +{String(data.bonusPctDisplay)}%
                          </span>
                          ${Number(data.bonus).toLocaleString()}
                        </div>
                      </div>
                      <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
                        <div className="text-xs font-black text-blue-500 mb-1">
                          其他加減項總計
                        </div>
                        <div className="text-2xl font-black text-blue-700">
                          $
                          {(
                            data.reimbursement +
                            data.adminFee -
                            data.deduction
                          ).toLocaleString()}
                        </div>
                      </div>
                      <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200 md:col-span-5 flex justify-between items-center">
                        <div className="text-sm font-black text-emerald-600">
                          本月應發總計
                        </div>
                        <div className="text-4xl font-black text-emerald-600">
                          ${Number(data.totalSalary).toLocaleString()}
                        </div>
                      </div>
                    </div>

                    <h3 className="text-lg font-black text-gray-800 mb-4 border-l-4 border-blue-500 pl-3">
                      課表與時數明細
                    </h3>
                    <table className="w-full text-left text-sm mb-10 border-collapse">
                      <thead>
                        <tr className="bg-gray-100 text-gray-600">
                          <th className="p-3 border border-gray-200">日期</th>
                          <th className="p-3 border border-gray-200">時間</th>
                          <th className="p-3 border border-gray-200">
                            課程項目
                          </th>
                          <th className="p-3 border border-gray-200 text-right">
                            單堂時數
                          </th>
                          <th className="p-3 border border-gray-200 text-right">
                            計算費率
                          </th>
                          <th className="p-3 border border-gray-200 text-right">
                            小計
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {data.details.map((dt, i) => (
                          <tr key={`dtl-${i}`} className="even:bg-gray-50">
                            <td className="p-3 border border-gray-200 font-bold">
                              {String(dt.date)}
                            </td>
                            <td className="p-3 border border-gray-200 text-gray-500">
                              {String(dt.time)}
                            </td>
                            <td className="p-3 border border-gray-200 font-bold">
                              {String(dt.reason)}{' '}
                              {dt.note && (
                                <span className="text-xs text-gray-400 ml-1">
                                  ({String(dt.note)})
                                </span>
                              )}
                            </td>
                            <td className="p-3 border border-gray-200 text-right font-black">
                              {Number(dt.hours)} hr
                            </td>
                            <td className="p-3 border border-gray-200 text-right text-emerald-600">
                              ${Number(dt.rateApplied)}{' '}
                              <span className="text-[10px] text-gray-400">
                                ({String(dt.rateType)})
                              </span>
                            </td>
                            <td className="p-3 border border-gray-200 text-right font-black">
                              ${Number(dt.fee)}
                              {dt.venueFee > 0 && (
                                <span className="text-[10px] text-purple-600 ml-1 block">
                                  + ${dt.venueFee} 場地費
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}

                        {/* ✨ 在列印明細表中加入代墊、行政費、扣除項目 */}
                        {data.reimbursements.map(
                          (item, i) =>
                            Number(item.amount) > 0 && (
                              <tr key={`pr-${i}`} className="bg-blue-50/50">
                                <td
                                  colSpan="3"
                                  className="p-3 border border-gray-200 font-bold text-blue-700"
                                >
                                  代墊費用退款{' '}
                                  {item.note && (
                                    <span className="text-xs text-gray-500">
                                      ({item.note})
                                    </span>
                                  )}
                                </td>
                                <td className="p-3 border border-gray-200 text-right font-black">
                                  -
                                </td>
                                <td className="p-3 border border-gray-200 text-right text-blue-600">
                                  -
                                </td>
                                <td className="p-3 border border-gray-200 text-right font-black text-blue-700">
                                  +${Number(item.amount).toLocaleString()}
                                </td>
                              </tr>
                            )
                        )}
                        {data.adminFees.map(
                          (item, i) =>
                            Number(item.amount) > 0 && (
                              <tr key={`pa-${i}`} className="bg-blue-50/50">
                                <td
                                  colSpan="3"
                                  className="p-3 border border-gray-200 font-bold text-blue-700"
                                >
                                  行政工作費用{' '}
                                  {item.note && (
                                    <span className="text-xs text-gray-500">
                                      ({item.note})
                                    </span>
                                  )}
                                </td>
                                <td className="p-3 border border-gray-200 text-right font-black">
                                  -
                                </td>
                                <td className="p-3 border border-gray-200 text-right text-blue-600">
                                  -
                                </td>
                                <td className="p-3 border border-gray-200 text-right font-black text-blue-700">
                                  +${Number(item.amount).toLocaleString()}
                                </td>
                              </tr>
                            )
                        )}
                        {data.deductions.map(
                          (item, i) =>
                            Number(item.amount) > 0 && (
                              <tr key={`pd-${i}`} className="bg-rose-50/50">
                                <td
                                  colSpan="3"
                                  className="p-3 border border-gray-200 font-bold text-rose-700"
                                >
                                  扣除項目{' '}
                                  {item.note && (
                                    <span className="text-xs text-gray-500">
                                      ({item.note})
                                    </span>
                                  )}
                                </td>
                                <td className="p-3 border border-gray-200 text-right font-black">
                                  -
                                </td>
                                <td className="p-3 border border-gray-200 text-right text-rose-600">
                                  -
                                </td>
                                <td className="p-3 border border-gray-200 text-right font-black text-rose-700">
                                  -${Number(item.amount).toLocaleString()}
                                </td>
                              </tr>
                            )
                        )}

                        <tr>
                          <td
                            colSpan="5"
                            className="p-3 border border-gray-200 text-right font-black text-gray-500"
                          >
                            基本結算合計
                          </td>
                          <td className="p-3 border border-gray-200 text-right font-black text-gray-800">
                            ${Number(data.baseSalary).toLocaleString()}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                    <div className="flex justify-between items-end mt-20 pt-10 border-t-2 border-dashed border-gray-300">
                      <div className="text-sm font-bold text-gray-400">
                        列印時間：{formatDateTime(Date.now())}
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-black text-gray-500 mb-8">
                          教師簽收欄
                        </div>
                        <div className="w-48 border-b-2 border-gray-800"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-gray-100 p-4 rounded-b-[2rem] flex justify-between items-center gap-3 no-print">
                <div className="text-xs font-bold text-gray-500 flex items-center gap-1">
                  <Info size={14} /> 若列印按鈕無反應，請直接按鍵盤 Ctrl+P (Mac
                  為 Cmd+P)
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      setPrintSalaryModal({
                        isOpen: false,
                        dataList: [],
                        monthStr: '',
                      })
                    }
                    className="px-4 py-3 bg-white text-gray-600 font-bold rounded-xl shadow-sm hover:bg-gray-200"
                  >
                    關閉
                  </button>
                  <button
                    onClick={() => {
                      const combinedText = printSalaryModal.dataList
                        .map((d) => getSalaryText(d, printSalaryModal.monthStr))
                        .join(
                          '\n\n=========================================\n\n'
                        );
                      copyToClipboard(combinedText);
                    }}
                    className="px-4 py-3 bg-indigo-500 text-white font-black rounded-xl shadow-lg hover:bg-indigo-600 flex items-center gap-2"
                  >
                    <ClipboardList size={18} /> 複製文字
                  </button>
                  {printSalaryModal.dataList.length === 1 && (
                    <button
                      onClick={() => {
                        const text = getSalaryText(
                          printSalaryModal.dataList[0],
                          printSalaryModal.monthStr
                        );
                        window.open(
                          `mailto:?subject=LOHAS 薪資確認單 (${
                            printSalaryModal.monthStr
                          }) - ${
                            printSalaryModal.dataList[0].teacher.name
                          }&body=${encodeURIComponent(text)}`,
                          '_top'
                        );
                      }}
                      className="px-4 py-3 bg-blue-500 text-white font-black rounded-xl shadow-lg hover:bg-blue-600 flex items-center gap-2"
                    >
                      <Mail size={18} /> 寄送 Email
                    </button>
                  )}
                  <button
                    onClick={() => window.print()}
                    className="px-4 py-3 bg-emerald-500 text-white font-black rounded-xl shadow-lg hover:bg-emerald-600 flex items-center gap-2"
                  >
                    <Printer size={18} /> 列印 / PDF
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      {/* --- 隱藏的列印區塊 (點名單) --- */}
      {printAttendanceModal.isOpen && printAttendanceModal.classData && (
        <div className="fixed inset-0 bg-gray-500 flex justify-center overflow-y-auto z-[200] p-4 sm:p-10 no-print">
          <div className="bg-white max-w-5xl w-full rounded-[2rem] shadow-2xl relative flex flex-col">
            <div className="p-6 sm:p-10 flex-1 relative overflow-y-auto custom-scrollbar printable-area">
              <div className="text-center mb-10 border-b-4 border-gray-800 pb-8">
                <h1 className="text-4xl font-black text-gray-800 tracking-widest mb-2">
                  LOHAS 班級出缺席總表
                </h1>
                <p className="text-xl font-bold text-gray-500">
                  班級：{String(printAttendanceModal.classData.name)}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="text-gray-600 font-bold">
                  總堂數：{Number(printAttendanceModal.classData.totalLessons)}{' '}
                  堂
                </div>
                <div className="text-right text-gray-600 font-bold">
                  列印時間：{formatDateTime(Date.now())}
                </div>
              </div>
              <table className="w-full text-center text-sm border-collapse border border-gray-300">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-3 font-black text-gray-800 border border-gray-300">
                      學員姓名
                    </th>
                    {[
                      ...Array(printAttendanceModal.classData.totalLessons),
                    ].map((_, i) => {
                      const attId = `${printAttendanceModal.classData.id}_${
                        i + 1
                      }`;
                      const attRecord = attendance.find((a) => a.id === attId);
                      return (
                        <th
                          key={`print-hdr-${i}`}
                          className="p-3 font-bold text-gray-600 border border-gray-300 min-w-[50px]"
                        >
                          第{i + 1}堂
                          {attRecord?.date && (
                            <div className="text-[10px] font-normal text-gray-400 mt-1">
                              {attRecord.date.substring(5)}
                            </div>
                          )}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {(printAttendanceModal.classData.students || []).map(
                    (student, sIdx) => (
                      <tr key={`print-stu-${sIdx}`} className="even:bg-gray-50">
                        <td className="p-3 font-extrabold text-gray-800 border border-gray-300 text-left">
                          {String(student)}
                        </td>
                        {[
                          ...Array(printAttendanceModal.classData.totalLessons),
                        ].map((_, lIdx) => {
                          const attRecord = attendance.find(
                            (a) =>
                              a.id ===
                              `${printAttendanceModal.classData.id}_${lIdx + 1}`
                          );
                          const status = attRecord?.records?.[student];
                          let icon = '';
                          if (status === 'present') icon = '✔️';
                          if (status === 'absent') icon = '❌';
                          if (status === 'leave') icon = '⚠️';
                          return (
                            <td
                              key={`print-cell-${lIdx}`}
                              className="p-3 border border-gray-300 text-lg"
                            >
                              {icon}
                            </td>
                          );
                        })}
                      </tr>
                    )
                  )}
                </tbody>
              </table>
              <div className="mt-6 text-xs text-gray-500 font-bold flex gap-4 justify-end">
                <span>✔️ 出席</span>
                <span>❌ 缺席</span>
                <span>⚠️ 請假</span>
              </div>
            </div>
            <div className="bg-gray-100 p-4 rounded-b-[2rem] flex justify-between items-center gap-3 no-print">
              <div className="text-xs font-bold text-gray-500 flex items-center gap-1">
                <Info size={14} /> 若列印按鈕無反應，請直接按鍵盤 Ctrl+P (Mac 為
                Cmd+P)
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    setPrintAttendanceModal({ isOpen: false, classData: null })
                  }
                  className="px-6 py-3 bg-white text-gray-600 font-bold rounded-xl shadow-sm hover:bg-gray-200"
                >
                  關閉
                </button>
                <button
                  onClick={() => window.print()}
                  className="px-6 py-3 bg-indigo-500 text-white font-black rounded-xl shadow-lg hover:bg-indigo-600 flex items-center gap-2"
                >
                  <Printer size={18} /> 列印 / PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ✨ 加減項設定 Modal (支援多筆) */}
      {adjModal.isOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-[120] p-4 backdrop-blur-md animate-in fade-in duration-200 no-print">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const id = adjModal.id || `${adjModal.tId}_${adjModal.month}`;

              // 1. 儲存當月的代墊與扣款
              await setDoc(
                doc(db, 'salaryAdjustments', id),
                {
                  id,
                  teacherId: adjModal.tId,
                  month: adjModal.month,
                  reimbursements: adjModal.reimbursements
                    .map((i) => ({
                      amount: Number(i.amount) || 0,
                      note: String(i.note || ''),
                    }))
                    .filter((i) => i.amount > 0 || i.note),
                  deductions: adjModal.deductions
                    .map((i) => ({
                      amount: Number(i.amount) || 0,
                      note: String(i.note || ''),
                    }))
                    .filter((i) => i.amount > 0 || i.note),
                },
                { merge: true }
              );

              // 2. ✨ 儲存固定的行政費用到教師資料中 (跨月保留)
              const tDoc = teachers.find(
                (t) => String(t.id) === String(adjModal.tId)
              );
              if (tDoc) {
                const cleanAdminFees = adjModal.adminFees
                  .map((i) => ({
                    amount: Number(i.amount) || 0,
                    note: String(i.note || ''),
                  }))
                  .filter((i) => i.amount > 0 || i.note);
                await updateDoc(doc(db, 'teachers', String(tDoc.id)), {
                  adminFees: cleanAdminFees,
                });
              }

              setAdjModal({
                isOpen: false,
                id: '',
                tId: '',
                tName: '',
                month: '',
                reimbursements: [],
                adminFees: [],
                deductions: [],
              });
              showAlert('✅ 加減項儲存成功！');
            }}
            className="bg-white p-8 rounded-[2.5rem] shadow-2xl max-w-sm w-full border-4 border-white"
          >
            <h3 className="text-2xl font-black mb-6 text-center text-blue-700 flex items-center justify-center gap-2">
              💰 薪資加減項設定
            </h3>
            <div className="bg-blue-50 text-blue-800 font-bold p-3 rounded-xl mb-4 text-center text-sm flex flex-col gap-1">
              <span>
                {adjModal.tName} ({adjModal.month.replace('-', '年')}月)
              </span>
              <span className="text-[10px] text-blue-500 opacity-80">
                注意：行政工作費用會儲存為每月固定帶入
              </span>
            </div>

            <div className="space-y-4 mb-6 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
              {/* 代墊費用 */}
              <div className="bg-gray-50 p-4 rounded-2xl border">
                <div className="flex justify-between items-center mb-3">
                  <label className="text-xs font-black text-gray-500">
                    ➕ 代墊費用 (本月退款)
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setAdjModal({
                        ...adjModal,
                        reimbursements: [
                          ...adjModal.reimbursements,
                          { amount: '', note: '' },
                        ],
                      })
                    }
                    className="text-[10px] bg-blue-100 text-blue-600 px-2 py-1 rounded font-bold hover:bg-blue-500 hover:text-white transition-all"
                  >
                    + 新增一筆
                  </button>
                </div>
                {adjModal.reimbursements.length === 0 && (
                  <div className="text-xs text-gray-400 font-bold text-center py-2">
                    無資料
                  </div>
                )}
                {adjModal.reimbursements.map((item, i) => (
                  <div
                    key={`r-${i}`}
                    className="flex gap-2 mb-2 items-center bg-white p-2 rounded-xl border shadow-sm"
                  >
                    <span className="font-bold text-gray-400">$</span>
                    <input
                      type="number"
                      min="0"
                      value={item.amount}
                      onChange={(e) => {
                        const newItems = [...adjModal.reimbursements];
                        newItems[i].amount = e.target.value;
                        setAdjModal({ ...adjModal, reimbursements: newItems });
                      }}
                      className="w-16 p-1 border-b outline-none font-bold focus:border-blue-400"
                      placeholder="金額"
                    />
                    <input
                      value={item.note}
                      onChange={(e) => {
                        const newItems = [...adjModal.reimbursements];
                        newItems[i].note = e.target.value;
                        setAdjModal({ ...adjModal, reimbursements: newItems });
                      }}
                      placeholder="項目備註"
                      className="flex-1 w-20 p-1 border-b outline-none text-xs font-bold focus:border-blue-400"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const newItems = [...adjModal.reimbursements];
                        newItems.splice(i, 1);
                        setAdjModal({ ...adjModal, reimbursements: newItems });
                      }}
                      className="text-rose-400 hover:text-rose-600 p-1"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>

              {/* 行政費用 */}
              <div className="bg-gray-50 p-4 rounded-2xl border">
                <div className="flex justify-between items-center mb-3">
                  <label className="text-xs font-black text-gray-500">
                    ➕ 行政工作費 (每月固定)
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setAdjModal({
                        ...adjModal,
                        adminFees: [
                          ...adjModal.adminFees,
                          { amount: '', note: '' },
                        ],
                      })
                    }
                    className="text-[10px] bg-blue-100 text-blue-600 px-2 py-1 rounded font-bold hover:bg-blue-500 hover:text-white transition-all"
                  >
                    + 新增一筆
                  </button>
                </div>
                {adjModal.adminFees.length === 0 && (
                  <div className="text-xs text-gray-400 font-bold text-center py-2">
                    無資料
                  </div>
                )}
                {adjModal.adminFees.map((item, i) => (
                  <div
                    key={`a-${i}`}
                    className="flex gap-2 mb-2 items-center bg-white p-2 rounded-xl border shadow-sm"
                  >
                    <span className="font-bold text-gray-400">$</span>
                    <input
                      type="number"
                      min="0"
                      value={item.amount}
                      onChange={(e) => {
                        const newItems = [...adjModal.adminFees];
                        newItems[i].amount = e.target.value;
                        setAdjModal({ ...adjModal, adminFees: newItems });
                      }}
                      className="w-16 p-1 border-b outline-none font-bold focus:border-blue-400"
                      placeholder="金額"
                    />
                    <input
                      value={item.note}
                      onChange={(e) => {
                        const newItems = [...adjModal.adminFees];
                        newItems[i].note = e.target.value;
                        setAdjModal({ ...adjModal, adminFees: newItems });
                      }}
                      placeholder="項目備註"
                      className="flex-1 w-20 p-1 border-b outline-none text-xs font-bold focus:border-blue-400"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const newItems = [...adjModal.adminFees];
                        newItems.splice(i, 1);
                        setAdjModal({ ...adjModal, adminFees: newItems });
                      }}
                      className="text-rose-400 hover:text-rose-600 p-1"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>

              {/* 扣款項目 */}
              <div className="bg-rose-50 p-4 rounded-2xl border border-rose-100">
                <div className="flex justify-between items-center mb-3">
                  <label className="text-xs font-black text-rose-500">
                    ➖ 扣除項目 (本月扣款)
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setAdjModal({
                        ...adjModal,
                        deductions: [
                          ...adjModal.deductions,
                          { amount: '', note: '' },
                        ],
                      })
                    }
                    className="text-[10px] bg-rose-200 text-rose-700 px-2 py-1 rounded font-bold hover:bg-rose-500 hover:text-white transition-all"
                  >
                    + 新增一筆
                  </button>
                </div>
                {adjModal.deductions.length === 0 && (
                  <div className="text-xs text-rose-300 font-bold text-center py-2">
                    無資料
                  </div>
                )}
                {adjModal.deductions.map((item, i) => (
                  <div
                    key={`d-${i}`}
                    className="flex gap-2 mb-2 items-center bg-white p-2 rounded-xl border shadow-sm"
                  >
                    <span className="font-bold text-rose-400">-$</span>
                    <input
                      type="number"
                      min="0"
                      value={item.amount}
                      onChange={(e) => {
                        const newItems = [...adjModal.deductions];
                        newItems[i].amount = e.target.value;
                        setAdjModal({ ...adjModal, deductions: newItems });
                      }}
                      className="w-16 p-1 border-b outline-none font-bold text-rose-600 focus:border-rose-400"
                      placeholder="金額"
                    />
                    <input
                      value={item.note}
                      onChange={(e) => {
                        const newItems = [...adjModal.deductions];
                        newItems[i].note = e.target.value;
                        setAdjModal({ ...adjModal, deductions: newItems });
                      }}
                      placeholder="項目備註"
                      className="flex-1 w-20 p-1 border-b outline-none text-xs font-bold text-rose-600 focus:border-rose-400"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const newItems = [...adjModal.deductions];
                        newItems.splice(i, 1);
                        setAdjModal({ ...adjModal, deductions: newItems });
                      }}
                      className="text-rose-400 hover:text-rose-600 p-1"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() =>
                  setAdjModal({
                    isOpen: false,
                    id: '',
                    tId: '',
                    tName: '',
                    month: '',
                    reimbursements: [],
                    adminFees: [],
                    deductions: [],
                  })
                }
                className="flex-1 p-3 bg-gray-100 rounded-xl font-bold text-gray-500"
              >
                取消
              </button>
              <button
                type="submit"
                className="flex-[2] p-3 bg-blue-500 text-white rounded-xl font-black shadow-lg hover:bg-blue-600"
              >
                儲存設定
              </button>
            </div>
          </form>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: globalStyles }} />
    </div>
  );
}
