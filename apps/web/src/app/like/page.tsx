"use client";
import { useState } from "react";
import { useSession, useInterests } from "@/lib/session";
import {
  getTopics, getTopicsBySlugs, getPersonalizedFeed, getSampleTopics, topicName, SAMPLE_SLUGS,
  type FeedItem,
} from "@/lib/topics";
import type { TopicType } from "@shared/types";

const TYPE_TABS: { key: TopicType; label: string }[] = [
  { key: "person", label: "인물" },
  { key: "party", label: "정당" },
  { key: "issue", label: "이슈" },
  { key: "sports", label: "스포츠" },
  { key: "celebrity", label: "연예" },
];

function timeLabel(iso: string) {
  return new Date(iso).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function FeedList({ feed, kicker }: { feed: FeedItem[]; kicker: string }) {
  return (
    <div className="stream">
      {feed.map(({ article: a, matched }) => (
        <div className="story" key={a.id}>
          <div className="ts">{timeLabel(a.published_at)}</div>
          <a className="card" href={`/article/${a.id}`}>
            <div className="kicker">{kicker}</div>
            <div className="card-title">{a.ai_headline || a.title}</div>
            {a.summary_short && <p className="summary">{a.summary_short}</p>}
            <div className="match-chips">
              {matched.map((m) => (
                <span key={m} className="match-chip">#{topicName(m)}</span>
              ))}
            </div>
          </a>
        </div>
      ))}
    </div>
  );
}

export default function LikePage() {
  const { isLoggedIn, ready, login } = useSession();
  const { slugs, add, remove } = useInterests();
  const [tab, setTab] = useState<TopicType>("issue");
  const [q, setQ] = useState("");
  const [sample, setSample] = useState<string[]>(SAMPLE_SLUGS);

  if (!ready) return <main />;

  // ---------- 비로그인: 샘플 미리보기 ----------
  if (!isLoggedIn) {
    const sampleTopics = getSampleTopics();
    const feed = getPersonalizedFeed(sample);
    const toggle = (s: string) =>
      setSample((p) => (p.includes(s) ? p.filter((x) => x !== s) : [...p, s]));
    const startWithSample = () => {
      sample.forEach(add); // 선택한 샘플을 내 관심사로 저장
      login();
    };

    return (
      <main>
        <div className="sample-banner">
          <div>
            <div className="kicker">LIKE · 미리보기</div>
            <p>로그인하면 이 관심사로 <b>내 맞춤 피드</b>를 저장해요.</p>
          </div>
          <button className="subscribe-pill" onClick={startWithSample}>로그인하고 시작</button>
        </div>

        <section className="like-block">
          <div className="side-head">지금 뜨는 관심사</div>
          <div className="chips">
            {sampleTopics.map((t) => {
              const on = sample.includes(t.slug);
              return (
                <button
                  key={t.slug}
                  className={`chip${on ? " chip-on" : ""}`}
                  onClick={() => toggle(t.slug)}
                >
                  {on ? <>{t.name}<span className="chip-x">×</span></> : <><span className="chip-plus">+</span>{t.name}</>}
                </button>
              );
            })}
          </div>
        </section>

        <section className="like-block">
          <div className="side-head">샘플 피드</div>
          {feed.length === 0 ? (
            <p className="like-hint">위에서 관심사를 선택하면 샘플 피드가 표시됩니다.</p>
          ) : (
            <FeedList feed={feed} kicker="SAMPLE" />
          )}
        </section>
      </main>
    );
  }

  // ---------- 로그인: 내 맞춤 피드 ----------
  const mine = getTopicsBySlugs(slugs);
  const browse = getTopics({ type: tab, q: q || undefined, trending: true })
    .filter((t) => !slugs.includes(t.slug));
  const feed = getPersonalizedFeed(slugs);

  return (
    <main>
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

      <section className="like-block">
        <div className="side-head">관심사 추가</div>
        <input
          className="topic-search"
          placeholder="인물·정당·이슈·팀·연예인 검색"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        {!q && (
          <div className="type-tabs">
            {TYPE_TABS.map((t) => (
              <button
                key={t.key}
                className={`type-tab${tab === t.key ? " active" : ""}`}
                onClick={() => setTab(t.key)}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}
        <div className="chips">
          {browse.length === 0 ? (
            <p className="like-hint">검색 결과가 없습니다.</p>
          ) : (
            browse.map((t) => (
              <button key={t.slug} className="chip" onClick={() => add(t.slug)}>
                <span className="chip-plus">+</span>{t.name}
              </button>
            ))
          )}
        </div>
      </section>

      <section className="like-block">
        <div className="side-head">맞춤 피드</div>
        {slugs.length === 0 ? (
          <p className="like-hint">관심사를 추가하면 여기에 알고리즘 피드가 표시됩니다.</p>
        ) : feed.length === 0 ? (
          <p className="like-hint">아직 관심사에 맞는 기사가 없습니다.</p>
        ) : (
          <FeedList feed={feed} kicker="FOR YOU" />
        )}
      </section>
    </main>
  );
}
