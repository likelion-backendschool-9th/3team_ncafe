import Link from "next/link";

const VALUES = [
  {
    icon: "💬",
    title: "의견을 교류하는 커뮤니티",
    text: "기술 토론, 코드 리뷰, 진로 상담까지. 온라인 게시판과 오프라인 모임에서 자유롭게 이야기를 나눕니다.",
  },
  {
    icon: "🧑‍💻",
    title: "함께 만드는 프로젝트",
    text: "팀을 꾸려 사이드 프로젝트를 진행하고, 결과물을 공유합니다. 처음 시작하는 분도 환영합니다.",
  },
  {
    icon: "☕",
    title: "온라인 · 오프라인 공유 공간",
    text: "매장에서는 좌석과 회의실을, 온라인에서는 스터디 룸과 채팅 채널을 제공합니다.",
  },
];

const INFOS = [
  { title: "영업 시간", lines: ["평일 07:30 – 21:00", "주말 · 공휴일 09:00 – 20:00"] },
  { title: "매장 위치", lines: ["서울특별시 강남구 테헤란로 123", "뉴렉처빌딩 1층"] },
  { title: "오프라인 모임", lines: ["매주 토요일 14:00 스터디 모임", "회의실 2개 · 좌석 40석"] },
  { title: "문의", lines: ["02-1234-5678", "help@ncafe.com"] },
];

export default function AboutPage() {
  return (
    <div className="display:flex flex-direction:column gap:11">
      {/* ----- 히어로 (규격 없음 → 유틸리티) ----- */}
      <section className="padding-y:8 text-align:center">
        <span className="m3-badge badge:inline badge-color:primary">ABOUT NCAFE</span>
        <h1 className="margin-top:5 font-size:heading-lg md:font-size:heading-xl font-weight:bold line-height:tight letter-spacing:tight">
          코드와 커피가 만나는 곳,
          <br />
          개발자를 위한 공유 카페
        </h1>
        <p
          className="max-width:ex margin-x:auto margin-top:6 font-size:body-lg line-height:loose color:text-muted"
          style={{ "--max-width-ex": "40rem" }}
        >
          NCafe는 개발자, 학생, 그리고 코딩에 관심 있는 누구나 모여 의견을 나누고 함께 프로젝트를 진행하는 온라인 ·
          오프라인 공유 카페를 표방하는 가상의 커피숍입니다.
        </p>
      </section>

      {/* ----- 가치: m3-grid + m3-card(avatar·header·content) ----- */}
      <section>
        <div className="margin-bottom:7">
          <h2 className="font-size:heading-md font-weight:bold letter-spacing:tight">NCafe가 지향하는 것</h2>
          <p className="margin-top:2 font-size:body-sm color:text-muted">
            커피 한 잔을 매개로 사람과 코드가 연결되는 공간을 꿈꿉니다.
          </p>
        </div>
        <ul className="m3-grid grid-cols:3">
          {VALUES.map((v) => (
            <li key={v.title} className="m3-card card:outlined">
              <div className="card-header">
                <span className="card-avatar" aria-hidden="true">
                  {v.icon}
                </span>
                <div className="card-titles">
                  <h3 className="card-headline">{v.title}</h3>
                </div>
              </div>
              <p className="card-content">{v.text}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* ----- 학습 템플릿 안내: m3-card card-layout:horizontal + card-media ----- */}
      <section className="m3-card card:outlined card-layout:horizontal">
        <div className="flex:1 min-width:0">
          <div className="card-header">
            <div className="card-titles">
              <span className="m3-badge badge:inline badge-color:primary">FOR LEARNERS</span>
              <h2 className="card-headline">이 사이트는 기술 교육을 위한 템플릿입니다</h2>
            </div>
          </div>
          <div className="card-content">
            <p>
              NCafe는 실제로 운영되는 카페가 아니라, 개발을 배우는 과정에서 사용하는 실습용 프론트 템플릿입니다. 메뉴
              조회 · 상세 · 장바구니 · 좋아요 · 관리자 페이지 등 실무에서 자주 등장하는 화면을 순수한 HTML과 CSS로 담아
              두었기 때문에, 어떤 기술 스택으로도 같은 화면을 구현하며 학습할 수 있습니다.
            </p>
            <ul className="display:flex flex-direction:column gap:3 margin-top:6 padding-top:6 border-width:0 border-width-top:1 border-style:solid border-color:border">
              <li>
                <strong className="display:inline-block min-width:ex color:text" style={{ "--min-width-ex": "5rem" }}>
                  프론트엔드
                </strong>{" "}
                React, Vue, Angular, Svelte, 순수 HTML/JS 등 어떤 것이든
              </li>
              <li>
                <strong className="display:inline-block min-width:ex color:text" style={{ "--min-width-ex": "5rem" }}>
                  백엔드
                </strong>{" "}
                Java/Spring, Python/Django·FastAPI, Node.js, .NET 등 자유롭게 선택
              </li>
              <li>
                <strong className="display:inline-block min-width:ex color:text" style={{ "--min-width-ex": "5rem" }}>
                  학습 흐름
                </strong>{" "}
                정적 화면 → 컴포넌트화 → API 연동 → AI 도구를 활용한 개발
              </li>
            </ul>
          </div>
        </div>
        <div className="card-media align-self:center padding:8 display:none md:display:block">
          <img src="/images/menus/americano.svg" alt="" />
        </div>
      </section>

      {/* ----- 뉴렉처 소개: m3-card(avatar 로고·header·content·actions) ----- */}
      <section className="m3-card card:outlined card-size:large">
        <div className="card-header">
          <span className="card-avatar">
            <img src="/images/newlecture.jpg" alt="뉴렉처 로고" />
          </span>
          <div className="card-titles">
            <h2 className="card-headline">뉴렉처에서 만들었습니다</h2>
          </div>
        </div>
        <p className="card-content">
          뉴렉처(NewLecture)는 AI를 만들고, AI를 이용해 개발하는 모든 전문 개발자를 양성하는 교육 기관입니다. 특정
          언어나 프레임워크에 머무르지 않고 프로그래밍 기초부터 웹 · 백엔드 · AI 개발까지 폭넓게 다루며, NCafe는 그 교육
          과정에서 함께 사용하는 실습 템플릿입니다.
        </p>
        <div className="card-actions">
          <a href="https://www.newlecture.com" target="_blank" rel="noreferrer" className="m3-btn">
            newlecture.com ↗
          </a>
          <a href="https://www.youtube.com/@newlec1" target="_blank" rel="noreferrer" className="m3-btn btn:outlined">
            YouTube 채널 ↗
          </a>
        </div>
      </section>

      {/* ----- 공간 안내: m3-grid grid-cols:4 + m3-card compact ----- */}
      <section>
        <div className="margin-bottom:7">
          <h2 className="font-size:heading-md font-weight:bold letter-spacing:tight">공간 안내</h2>
          <p className="margin-top:2 font-size:body-sm color:text-muted">
            가상의 매장이지만, 실제 서비스처럼 정보를 구성했습니다.
          </p>
        </div>
        <ul className="m3-grid grid-cols:4">
          {INFOS.map((info) => (
            <li key={info.title} className="m3-card card:outlined card-size:compact">
              <div className="card-header">
                <div className="card-titles">
                  <h3 className="card-headline">{info.title}</h3>
                </div>
              </div>
              <p className="card-content">
                {info.lines[0]}
                <br />
                {info.lines[1]}
              </p>
            </li>
          ))}
        </ul>
      </section>

      {/* ----- CTA (규격 없음 → 페이지 CSS 띠) ----- */}
      <section className="padding-y:10 padding-x:7 border-radius:5 background-color:primary-subtle text-align:center">
        <h2 className="font-size:heading-md font-weight:bold letter-spacing:tight">지금 NCafe에 함께하세요</h2>
        <p className="margin-top:3 color:text-muted">회원가입 후 메뉴를 주문하고, 커뮤니티에 참여해 보세요.</p>
        <div className="display:flex flex-wrap:wrap justify-content:center gap:3 margin-top:7">
          <Link href="/signup" className="m3-btn btn-size:md">
            회원가입
          </Link>
          <Link href="/menus" className="m3-btn btn:outlined btn-size:md">
            메뉴 보러가기
          </Link>
        </div>
      </section>
    </div>
  );
}
