import { useEffect, useState } from 'react';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

const GUIDE_CONTENT = {
  student: {
    eyebrow: '학생용 사용 안내',
    title: '우리 반 경제나라에 오신 걸 환영해요! 🎒',
    intro: '이 앱은 학급화폐를 직접 벌고, 저축하고, 투자하고, 친구와 경쟁하며 경제를 체험하는 학급 놀이터예요. 아래 내용을 천천히 읽어 보고 원하는 메뉴부터 시작해 보세요.',
    sections: [
      {
        icon: '🏠',
        title: '마이 화면과 총자산',
        body: '마이 화면에서는 내 현금, 예금, 적금, 주식 평가액과 공간·용사 관련 지출을 확인할 수 있어요. 상단 총자산은 원화·달러와 주식 평가액을 학급화폐로 환산하고, 아직 갚지 않은 대출을 뺀 순자산으로 계산돼요.',
      },
      {
        icon: '🏪',
        title: '상점·프로필·내 공간',
        body: '학급 상점에서 선생님이 올린 물건을 사고, 내 프로필 상점에서 동물·이모티콘 프로필을 골라 사용할 수 있어요. 내 방·정원·교실·카페를 꾸미고 넓은 공간을 해금할 수 있으며, 산 아이템은 여러 개를 배치할 수 있어요. 자리꾸미기와 용사 아이템은 구매가의 50%로 환불할 수 있어요.',
      },
      {
        icon: '🏦',
        title: '은행·적금·대출',
        body: '현금을 예금에 넣으면 7일마다 이자가 쌓이고, 적금은 기간을 정해 만기 때 원금과 이자를 받아요. 대출은 정해진 한도 안에서 받을 수 있고 빌린 뒤 7일이 지나면 이자가 붙은 금액을 한 번에 갚아야 해요. 상환하지 않은 대출은 총자산에서 부채로 계산돼요.',
      },
      {
        icon: '📈',
        title: '주식 투자',
        body: '한국 주식은 원화, 미국 주식은 달러로 거래해요. 실제 시세가 반영될 수 있고 학급시세 변동에 따라 가격이 오르내려요. 주식을 팔아 이익이 생겼을 때만 설정된 세금이 붙으며, 주식 평가액은 현재 가격으로 계산돼요.',
      },
      {
        icon: '🪑',
        title: '자리 부동산',
        body: '자리 부동산에서 자리를 구입하거나 임대·경매에 참여할 수 있어요. 선생님이 고정자리 선택권 시장을 열면 순위 선택권을 사고 원하는 자리를 먼저 고를 수 있고, 경매가 열리면 다른 친구들과 입찰할 수 있어요.',
      },
      {
        icon: '⚔️',
        title: '용사키우기',
        body: '용사 상점에서 소년·소녀 용사와 헬멧, 무기, 갑옷, 장갑, 신발, 장신구, 펫을 학급화폐로 구매해요. 장비를 착용하면 전투력이 올라가고, 희귀·엘리트·전설·초월 등급에는 특별 능력이 붙을 수 있어요. 100단계 몬스터에 도전하고 10단계마다 보스가 등장해요. 하루 기본 도전 횟수를 다 쓰면 추가 비용으로 더 도전할 수 있어요.',
      },
      {
        icon: '🥊',
        title: '친구 대결·칭호·이름',
        body: '친구 대결에서는 전투력이 비슷한 친구 중 위아래 상대를 골라 전투력 비율로 승률이 정해져요. 승리하면 상대 위치에 따라 보상이 달라지고 하루 도전 횟수가 있어요. 용사 이름은 처음 한 번 무료로 바꾸고, 그다음부터는 비용이 필요해요. 보스를 정복하면 이름 앞에 칭호가 붙어요.',
      },
      {
        icon: '🏫',
        title: '학급·직업·친구 공간',
        body: '학급 메뉴에서 직업에 지원하고 선생님이 월급을 지급하면 학급화폐를 받을 수 있어요. 친구 공간에 놀러 가서 방명록을 남기면 하루 최대 5회까지 보상을 받을 수 있고, 같은 친구에게 중복으로 남길 수는 없어요. 선생님이 경제 이벤트를 발동하면 화면 맨 위 전광판으로 소식과 효과가 보여요.',
      },
      {
        icon: '🧯',
        title: '파산과 회생',
        body: '대출과 지출 때문에 순자산이 마이너스가 되면 은행 화면에서 담임 선생님께 파산을 신청할 수 있어요. 선생님이 승인하면 봉사활동 미션이 나오고, 완료 후 제출해 선생님 확인을 받으면 기본금 200을 받고 회생할 수 있어요.',
      },
    ],
  },
  teacher: {
    eyebrow: '담임 선생님용 상세 안내',
    title: '우리 반 경제나라 운영 가이드 👩‍🏫',
    intro: '선생님은 이 대시보드에서 학급화폐 경제를 설계하고 학생들의 활동을 관리할 수 있어요. 기존 학생·거래 데이터는 유지되며, 아래 기능을 순서대로 설정하면 수업에 바로 활용할 수 있습니다.',
    sections: [
      {
        icon: '🔐',
        title: '구글 로그인·학급 만들기',
        body: '구글 계정으로 로그인한 뒤 새 학급 이름을 입력해 학급을 만들어요. 학급마다 학급 코드와 학생 입장용 비밀번호가 생기며, 학생은 코드·이름·개인 4자리 비밀번호로 입장합니다. 여러 학급을 만든 경우 헤더의 선택 상자에서 관리할 학급을 바꿀 수 있어요.',
      },
      {
        icon: '⚙️',
        title: '학급 기본 설정',
        body: '설정에서 학급 이름과 화폐 단위, 화폐 1개가 실제 원화로 얼마인지, 월급, 예금 이율, 적금 이율을 정할 수 있어요. 화폐 가치를 조절하면 주식·환전·자산 평가가 학급화폐 기준으로 환산됩니다. 기존 구매·보유 데이터는 물가 설정을 바꿔도 과거 기록이 바뀌지 않아요.',
      },
      {
        icon: '💳',
        title: '대출·파산·회생 운영',
        body: '대출 이율과 학생 1명당 대출 한도를 설정할 수 있어요. 학생이 대출을 받으면 별도 대출 기록에 원금·이율·대출일·상환 예정일이 저장되고, 7일 뒤 이자가 붙은 금액을 상환합니다. 순자산이 마이너스인 학생은 파산 신청을 보내며, 파산·회생 탭에서 신청을 확인하고 봉사 미션을 승인할 수 있어요. 학생이 완료를 제출하면 회생을 승인하고 기본금 200을 지급하며 미상환 대출을 정리합니다.',
      },
      {
        icon: '🧑‍🎓',
        title: '학생 목록·자산·월급',
        body: '학생 탭에서 학생별 현금, 예금, 적금, 주식 평가액, 대출 잔액, 총 순자산, 공간 지출비, 용사 아이템비를 확인할 수 있어요. 학생을 선택해 월급을 지급하거나 금액을 직접 지급·차감할 수 있고, 직업 수당도 월급에 반영됩니다. 학생 계정을 보관해도 학생 문서와 거래 데이터는 삭제되지 않으며 필요할 때 복구할 수 있어요.',
      },
      {
        icon: '🏪',
        title: '상점·가격·세금',
        body: '상점 탭에서 학생이 구매할 상품을 등록·수정하고 구매 알림을 확인할 수 있어요. 설정의 물가 상승 방식은 금액 단위 또는 퍼센트로 정하며 학급 상점, 용사 상점, 공간 아이템에 적용됩니다. 거래별 공동기금 세율에서 월급, 상점, 자리, 공간 아이템, 용사 아이템, 주식 매수·매도 등의 세율을 따로 조정할 수 있어요. 주식 매수는 기본적으로 세금이 없고, 이익이 난 매도에만 세금이 붙습니다.',
      },
      {
        icon: '📈',
        title: '주식시장 운영',
        body: '주식 탭에서 시장을 처음 열고 한국 20종목·미국 20종목을 관리할 수 있어요. 실제 시세 반영은 실제 주식 가격과 환율을 가져오며, 랜덤 변동은 시뮬레이션 가격을 사용합니다. 수동 실제 시세 반영은 횟수와 별도이고, 실제 시세 자동변동과 랜덤 자동변동은 1분 59초마다 실행되며 각각 하루 변동 횟수를 1회 차감합니다. 설정에서 하루 변동 최대 횟수는 25회까지 정할 수 있고, 우리 반 전용 종목도 추가할 수 있어요.',
      },
      {
        icon: '⏰',
        title: '예약 시세·시장 흐름',
        body: '주식시장은 정해진 시각의 예약 시세 반영도 지원합니다. 자동변동은 선생님 주식 화면이 켜져 있는 동안 작동하며 남은 횟수가 0이 되면 자동으로 멈춥니다. 실제 시세를 불러오지 못한 경우에는 자동 실제 시세 변동이 횟수를 차감하지 않고 중지되어 데이터가 잘못 바뀌지 않도록 했어요.',
      },
      {
        icon: '💼',
        title: '직업·월급·공동기금',
        body: '직업 탭에서 학생이 지원할 직업과 수당을 관리하고, 학생 탭에서 여러 학생에게 월급을 지급할 수 있어요. 거래세는 바로 학생 화면에 보이는 공동기금에 누적하지 않고 세금 원장에 쌓이며, 공동기금 탭에서 선생님이 정산 버튼을 눌렀을 때 그동안 누적된 세금을 계산·반영합니다. 공동기금 사용과 학급 투표도 이 탭에서 관리할 수 있어요.',
      },
      {
        icon: '🪑',
        title: '자리 부동산·경매',
        body: '자리 탭에서 교실 배치도를 만들고 자리를 경매 대상으로 지정할 수 있어요. 고정자리 선택권 시장은 1~5등 순위별 기본 입찰가를 설정하고 학생들이 먼저 선택할 권리를 구매하게 합니다. 자리 경매는 선택적으로 열 수 있으며, 자리 구입·임대·이동·입찰에도 설정된 세금이 반영됩니다.',
      },
      {
        icon: '📢',
        title: '경제 이벤트 발동',
        body: '설정 화면의 경제 이벤트 발동 영역에서 지원금, 금리, 대출, 주식시장, 물가, 세금, 학급 특별 이벤트를 선택할 수 있어요. 지원금은 학생 현금에 적용되고, 금리·대출 이벤트는 은행 계산에 반영되며, 주식시장 이벤트는 시세에 실제 적용됩니다. 물가 이벤트는 상점·공간·용사 아이템 가격에 적용되고, 발동한 이벤트는 학생 화면 맨 위 전광판에 표시됩니다. 새로운 경제정책과 황금 경제 주간은 다음 이벤트 효과를 배수로 적용합니다.',
      },
      {
        icon: '🐞',
        title: '건의함·버그 신고',
        body: '건의함에서 학생이 보낸 의견과 버그 신고를 확인할 수 있어요. 개발자에게 보내기 기능을 사용하면 등록된 개발자 이메일로 내용을 전달할 수 있고, 지정된 개발자 계정으로 로그인하면 다른 학급에서 보낸 건의도 별도 영역에서 확인할 수 있습니다.',
      },
      {
        icon: '🛡️',
        title: '데이터 보존과 운영 팁',
        body: '학급·학생·계정·주식·거래는 기존 경로에 저장되며, 새 기능은 필요한 필드와 컬렉션을 추가하는 방식으로 동작합니다. 수업을 시작하기 전에 화폐 가치, 월급, 이율, 세율, 주식 변동 횟수, 용사 도전 설정을 먼저 정하고 학생들에게 학급 코드를 안내하면 운영이 편해요. 경제 이벤트는 수업의 특정 시점에 한 번씩 발동하고, 종료하거나 다음 이벤트로 교체할 수 있습니다.',
      },
    ],
  },
};

function guideKey(role) {
  return `class-economy-guide-${role}-hidden-until`;
}

export default function FeatureGuideModal({ role }) {
  const [open, setOpen] = useState(false);
  const content = GUIDE_CONTENT[role] || GUIDE_CONTENT.student;

  useEffect(() => {
    try {
      const hiddenUntil = Number(localStorage.getItem(guideKey(role)) || 0);
      if (hiddenUntil <= Date.now()) setOpen(true);
    } catch {
      setOpen(true);
    }
  }, [role]);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  if (!open) return null;

  const close = () => setOpen(false);
  const hideForWeek = () => {
    try {
      localStorage.setItem(guideKey(role), String(Date.now() + WEEK_MS));
    } catch {
      // 브라우저 저장소를 사용할 수 없어도 이번에는 닫을 수 있어요.
    }
    close();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-3 sm:p-6" role="presentation">
      <div
        className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="feature-guide-title"
      >
        <header className="shrink-0 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 px-5 py-5 text-white sm:px-7">
          <div className="text-xs font-bold tracking-wide text-white/75">{content.eyebrow}</div>
          <h2 id="feature-guide-title" className="mt-1 text-2xl sm:text-3xl">{content.title}</h2>
          <p className="mt-2 text-sm leading-relaxed text-white/85">{content.intro}</p>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-7">
          <div className="space-y-3">
            {content.sections.map((section) => (
              <section key={section.title} className="rounded-2xl border border-indigo-100 bg-indigo-50/45 p-4">
                <h3 className="flex items-center gap-2 text-base font-bold text-indigo-800 sm:text-lg">
                  <span className="text-xl" aria-hidden="true">{section.icon}</span>
                  {section.title}
                </h3>
                <p className="mt-1.5 text-sm leading-7 text-slate-600">{section.body}</p>
              </section>
            ))}
          </div>
        </div>

        <footer className="flex shrink-0 flex-col-reverse gap-2 border-t border-gray-100 bg-white px-5 py-4 sm:flex-row sm:justify-end sm:px-7">
          <button type="button" onClick={close} className="rounded-xl border-2 border-gray-200 px-4 py-2.5 text-sm text-gray-600 transition hover:border-gray-400 hover:bg-gray-50">
            닫기
          </button>
          <button type="button" onClick={hideForWeek} className="rounded-xl bg-indigo-500 px-4 py-2.5 text-sm font-bold text-white shadow transition hover:bg-indigo-600">
            일주일 동안 열지 않기
          </button>
        </footer>
      </div>
    </div>
  );
}
