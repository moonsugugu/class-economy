import { Routes, Route, Navigate } from 'react-router-dom';
import { isConfigured } from './firebase';
import Landing from './pages/Landing.jsx';
import TeacherDashboard from './pages/teacher/TeacherDashboard.jsx';
import StudentLayout from './pages/student/StudentLayout.jsx';
import MyPage from './pages/student/MyPage.jsx';
import ShopPage from './pages/student/ShopPage.jsx';
import BankPage from './pages/student/BankPage.jsx';
import StocksPage from './pages/student/StocksPage.jsx';
import SeatsPage from './pages/student/SeatsPage.jsx';
import ReportPage from './pages/student/ReportPage.jsx';
import ClassPage from './pages/student/ClassPage.jsx';
import VisitPage from './pages/student/VisitPage.jsx';
import RoomPage from './pages/student/RoomPage.jsx';
import HeroPage from './pages/student/HeroPage.jsx';
import HeroShopPage from './pages/student/HeroShopPage.jsx';
import HeroDuelPage from './pages/student/HeroDuelPage.jsx';
import MissionsPage from './pages/student/MissionsPage.jsx';
import PaymentRequestPage from './pages/student/PaymentRequestPage.jsx';
import LotteryPage from './pages/student/LotteryPage.jsx';
import DemoRoom from './pages/DemoRoom.jsx';

function SetupGuide() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="bg-white rounded-3xl shadow-xl p-8 max-w-xl w-full space-y-4">
        <h1 className="text-3xl text-amber-600">🛠️ Firebase 설정이 필요해요</h1>
        <p className="text-gray-600">
          아직 Firebase 연결 정보가 없어서 앱을 시작할 수 없어요. 아래 순서대로 설정해 주세요.
        </p>
        <ol className="list-decimal list-inside space-y-2 text-gray-700">
          <li>
            <a className="text-blue-600 underline" href="https://console.firebase.google.com" target="_blank" rel="noreferrer">
              Firebase 콘솔
            </a>
            에서 새 프로젝트를 만들어요.
          </li>
          <li>빌드 → Authentication → 로그인 방법에서 <b>Google</b>을 사용 설정해요.</li>
          <li>빌드 → Firestore Database를 만들어요. (테스트 모드로 시작)</li>
          <li>프로젝트 설정 → 웹 앱 추가 → 구성(config) 값을 복사해요.</li>
          <li>
            프로젝트 폴더의 <code className="bg-gray-100 px-1 rounded">.env.example</code>을 복사해{' '}
            <code className="bg-gray-100 px-1 rounded">.env</code> 파일을 만들고 값을 붙여넣어요.
          </li>
          <li>개발 서버를 다시 시작하면 끝!</li>
        </ol>
      </div>
    </div>
  );
}

export default function App() {
  if (!isConfigured) return <SetupGuide />;
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/teacher" element={<TeacherDashboard />} />
      <Route path="/student" element={<StudentLayout />}>
        <Route index element={<MyPage />} />
        <Route path="shop" element={<ShopPage />} />
        <Route path="bank" element={<BankPage />} />
        <Route path="stocks" element={<StocksPage />} />
        <Route path="missions" element={<MissionsPage />} />
        <Route path="payment-request" element={<PaymentRequestPage />} />
        <Route path="lottery" element={<LotteryPage />} />
        <Route path="seats" element={<SeatsPage />} />
        <Route path="class" element={<ClassPage />} />
        <Route path="visit" element={<VisitPage />} />
        <Route path="report" element={<ReportPage />} />
        <Route path="room" element={<RoomPage />} />
        <Route path="hero" element={<HeroPage />} />
        <Route path="hero/shop" element={<HeroShopPage />} />
        <Route path="hero/duel" element={<HeroDuelPage />} />
      </Route>
      <Route path="/demo" element={<DemoRoom />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
