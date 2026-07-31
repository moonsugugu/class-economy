import { useEffect, useRef, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';

// 학생을 학급으로 초대하는 QR 코드 모달.
// QR을 찍으면 학급 코드가 자동으로 채워진 입장 화면이 열려요.
export default function InviteQR({ klass, onClose }) {
  const boxRef = useRef(null);
  const [copied, setCopied] = useState('');

  const joinUrl = `${window.location.origin}/?code=${klass.code}`;

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const copy = async (text, label) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied(''), 1500);
    } catch {
      setCopied('복사 실패');
      setTimeout(() => setCopied(''), 1500);
    }
  };

  const saveImage = () => {
    const canvas = boxRef.current?.querySelector('canvas');
    if (!canvas) return;
    const a = document.createElement('a');
    a.download = `${klass.name}-초대QR.png`;
    a.href = canvas.toDataURL('image/png');
    a.click();
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center relative"
      >
        <button
          onClick={onClose}
          className="absolute right-5 top-4 text-2xl text-gray-300 hover:text-gray-500 leading-none"
          aria-label="닫기"
        >
          ×
        </button>

        <h2 className="text-2xl text-indigo-600 mb-1">📱 학생 초대 QR</h2>
        <p className="text-gray-400 text-sm mb-5">{klass.name}</p>

        <div ref={boxRef} className="inline-block bg-white p-4 rounded-2xl border-4 border-indigo-100">
          <QRCodeCanvas value={joinUrl} size={220} level="M" marginSize={2} />
        </div>

        <p className="text-gray-500 text-sm mt-5 mb-1">QR이 안 되면 이 코드를 직접 입력하세요</p>
        <button
          onClick={() => copy(klass.code, '코드')}
          title="클릭하면 복사돼요"
          className="text-4xl tracking-widest text-indigo-700 font-bold hover:bg-indigo-50 rounded-2xl px-4 py-1 transition"
        >
          {klass.code}
        </button>

        <div className="flex gap-2 mt-6">
          <button
            onClick={() => copy(joinUrl, '링크')}
            className="flex-1 rounded-2xl py-3 bg-indigo-500 hover:bg-indigo-600 text-white shadow transition"
          >
            🔗 링크 복사
          </button>
          <button
            onClick={saveImage}
            className="flex-1 rounded-2xl py-3 bg-emerald-500 hover:bg-emerald-600 text-white shadow transition"
          >
            💾 QR 저장
          </button>
        </div>

        <div className="h-6 mt-2 text-sm text-emerald-600">
          {copied && `${copied} 복사했어요!`}
        </div>
      </div>
    </div>
  );
}
