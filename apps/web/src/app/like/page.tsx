"use client";
import { useState, useEffect } from "react";
import { useSession, useInterests } from "@/lib/session";
import { useLikes } from "@/lib/likes";
import {
  getTopics, getTopicsBySlugs, getPersonalizedFeed,
  type FeedItem,
} from "@/lib/topics";
import { feedTime } from "@/lib/time";
import type { Topic, TopicType } from "@shared/types";

const TYPE_TABS: { key: TopicType; label: string }[] = [
  { key: "person", label: "인물" },
  { key: "party", label: "정당" },
  { key: "issue", label: "이슈" },
  { key: "sports", label: "스포츠" },
  { key: "celebrity", label: "연예" },
];

// 카테고리(타입)당 선택 가능한 관심사 최대 개수
const MAX_PER_TYPE = 10;
const typeLabel = (type: TopicType) =>
  TYPE_TABS.find((t) => t.key === type)?.label ?? "이";

function FeedList({ feed }: { feed: FeedItem[] }) {
  return (
    <div className="stream">
      {feed.map(({ article: a, matched }) => (
        <div className="story" key={a.id}>
          <a className="card" href={`/article/${a.id}`}>
            <div className="kicker">{feedTime(a.published_at)}</div>
            <div className="card-title">{a.ai_headline || a.title}</div>
            {a.summary_short && <p className="summary">{a.summary_short}</p>}
            <div className="match-chips">
              {matched.map((m) => (
                <span key={m} className="match-chip">#{m}</span>
              ))}
            </div>
          </a>
        </div>
      ))}
    </div>
  );
}

export default function LikePage() {
  const { user, isLoggedIn, ready: sessionReady } = useSession();
  const { ids: likedIds, ready: likesReady } = useLikes();
  const { slugs, add, remove } = useInterests();
  const [q, setQ] = useState("");
  const [limitNotice, setLimitNotice] = useState("");

  // 추천 관심사로 한 번에 보여줄 최대 개수(전체)
  const RECO_MAX = 10;

  // 관심사
  const [mine, setMine] = useState<Topic[]>([]);
  const [browse, setBrowse] = useState<Topic[]>([]);
  const [feed, setFeed] = useState<FeedItem[]>([]);

  // 내 관심사 칩 + 관심사 맞춤 피드
  useEffect(() => {
    let alive = true;
    getTopicsBySlugs(slugs).then((t) => { if (alive) setMine(t); });
    getPersonalizedFeed(slugs).then((f) => { if (alive) setFeed(f); });
    return () => { alive = false; };
  }, [slugs]);

  // 관심사 추가 브라우즈
  // 검색어 없으면 mention_count(최근 언급 빈도) 상위 추천 10개를 카테고리 구분 없이.
  // 이미 선택한 것이 빠질 자리를 감안해 넉넉히 받아온 뒤 잘라 쓴다.
  useEffect(() => {
    let alive = true;
    const load = q
      ? getTopics({ q })
      : getTopics({ trending: true, limit: RECO_MAX + slugs.length });
    load.then((t) => { if (alive) setBrowse(t); });
    return () => { alive = false; };
  }, [q, slugs.length]);

  if (!sessionReady) return <main />;

  // 검색 중이 아니면 추천 상위 RECO_MAX개만(이미 선택한 건 제외).
  const browseList = browse
    .filter((t) => !slugs.includes(t.slug))
    .slice(0, q ? undefined : RECO_MAX);

  // 표시용 이름 — 구글 프로필 이름 > 이메일 앞부분 > "회원"
  const meta = user?.user_metadata ?? {};
  const displayName =
    (meta.full_name as string) || (meta.name as string) ||
    user?.email?.split("@")[0] || "회원";

  // 타입별 선택 개수 (제한·표시용)
  const countByType = (type: TopicType) => mine.filter((m) => m.type === type).length;

  // 카테고리당 최대 10개까지만 추가 — 초과 시 안내.
  const addTopic = (t: Topic) => {
    if (countByType(t.type) >= MAX_PER_TYPE) {
      setLimitNotice(`${typeLabel(t.type)} 관심사는 최대 ${MAX_PER_TYPE}개까지 선택할 수 있어요.`);
      return;
    }
    setLimitNotice("");
    add(t.slug);
  };

  return (
    <main>
      {!isLoggedIn && (
        <div className="sample-banner">
          <div>
            <div className="kicker">LIKE</div>
            <p>로그인하면 <b>좋아요·관심사</b>가 기기 간에 저장돼요.</p>
          </div>
          <a className="subscribe-pill" href="/me">로그인</a>
        </div>
      )}

      {/* ---------- 좋아요한 기사 모아보기 (상단 요약 → 별도 페이지) ---------- */}
      <a className="liked-summary" href="/like/saved">
        <span className="liked-summary-heart">♥</span>
        <span className="liked-summary-text">
          <b>내가 좋아한 기사 모아보기</b>
          <span className="liked-summary-sub">
            {likesReady && likedIds.length > 0
              ? `${likedIds.length}개의 기사를 저장했어요`
              : "Short 피드에서 ♥ 를 누르면 여기에 모여요"}
          </span>
        </span>
        <span className="liked-summary-arrow">→</span>
      </a>

      {/* ---------- 내 관심사 ---------- */}
      <section className="like-block">
        <div className="side-head">내 관심사</div>
        {mine.length === 0 ? (
          <p className="like-hint">아래에서 관심사를 추가하면 맞춤 피드가 만들어집니다.</p>
        ) : (
          <div className="chips">
            {mine.map((t) => (
              <button key={t.slug} className="chip chip-on" onClick={() => remove(t.slug)}>
                {t.name}<span className="chip-x">×</span>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* ---------- 관심사 추가 (추천 10 + 검색) ---------- */}
      <section className="like-block">
        <div className="side-head">{q ? "검색 결과" : `${displayName}님이 좋아할 뉴스`}</div>
        {!q && (
          <p className="like-hint">최근 뉴스에서 많이 언급된 주제예요. 검색해서 다른 주제도 추가할 수 있어요.</p>
        )}
        <input
          className="topic-search"
          placeholder="인물·정당·이슈·팀·연예인 검색"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        {limitNotice && <p className="like-limit">{limitNotice}</p>}
        <div className="chips">
          {browseList.length === 0 ? (
            <p className="like-hint">{q ? "검색 결과가 없습니다." : "추천할 관심사가 없습니다."}</p>
          ) : (
            browseList.map((t) => {
              const full = countByType(t.type) >= MAX_PER_TYPE;
              return (
                <button
                  key={t.slug}
                  className={`chip${full ? " chip-disabled" : ""}`}
                  onClick={() => addTopic(t)}
                >
                  <span className="chip-plus">+</span>{t.name}
                </button>
              );
            })
          )}
        </div>
      </section>

      {/* ---------- 관심사 맞춤 피드 ---------- */}
      <section className="like-block">
        <div className="side-head">관심사 맞춤 피드</div>
        {slugs.length === 0 ? (
          <p className="like-hint">관심사를 추가하면 여기에 알고리즘 피드가 표시됩니다.</p>
        ) : feed.length === 0 ? (
          <p className="like-hint">아직 관심사에 맞는 기사가 없습니다.</p>
        ) : (
          <FeedList feed={feed} />
        )}
      </section>
    </main>
  );
}
