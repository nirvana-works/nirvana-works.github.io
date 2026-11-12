'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Msg } from '@/lib/volleySync';
import { VOLLEY_NAME_LIMIT, type RoomInfo } from '@/lib/volleyTypes';
import { fieldClass, yellowButtonClass } from '../formStyles';
import { NupjukVolley, type Link } from './NupjukVolley';
import { api, loadName, loadToken, saveName, saveToken } from './storage';

// 두 사람이 직접 연결(WebRTC)한다. 서버는 연결 정보(offer/answer)만 전해 주고, 게임 데이터는 서로 바로 주고받는다.
const RTC_CONFIG: RTCConfiguration = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };
const GATHER_MS = 3500;
const CONNECT_MS = 15000;

type Conn = 'waiting' | 'connecting' | 'failed';

async function fetchRoom(code: string, token: string | null, want?: string): Promise<{ ok: true; info: RoomInfo } | { ok: false; error: string; status: number }> {
  try {
    const res = await fetch(`/api/volley/rooms/${code}${want ? `?want=${want}` : ''}`, {
      cache: 'no-store',
      headers: token ? { 'x-mafia-token': token } : undefined,
    });
    const data = (await res.json().catch(() => ({}))) as RoomInfo & { error?: string };
    if (!res.ok) return { ok: false, error: data.error ?? '문제가 생겼어요.', status: res.status };
    return { ok: true, info: data };
  } catch {
    return { ok: false, error: '네트워크 오류예요.', status: 0 };
  }
}

function gathered(pc: RTCPeerConnection): Promise<void> {
  return new Promise((resolve) => {
    if (pc.iceGatheringState === 'complete') return resolve();
    const done = () => {
      pc.removeEventListener('icegatheringstatechange', check);
      resolve();
    };
    const check = () => pc.iceGatheringState === 'complete' && done();
    pc.addEventListener('icegatheringstatechange', check);
    setTimeout(done, GATHER_MS);
  });
}

export function VolleyRoom({ code }: { code: string }) {
  const [phase, setPhase] = useState<'loading' | 'join' | 'ready' | 'error'>('loading');
  const [error, setError] = useState('');
  const [info, setInfo] = useState<RoomInfo | null>(null);
  const [seat, setSeat] = useState<0 | 1 | null>(null);
  const [linked, setLinked] = useState(false);
  const [everLinked, setEverLinked] = useState(false);
  const [conn, setConn] = useState<Conn>('waiting');
  const [joinName, setJoinName] = useState('');
  const [joining, setJoining] = useState(false);
  const [copied, setCopied] = useState(false);

  const tokenRef = useRef<string | null>(null);
  const subs = useRef(new Set<(m: Msg) => void>());
  const chans = useRef<{ g?: RTCDataChannel; c?: RTCDataChannel }>({});

  const send = useCallback((m: Msg, reliable = false) => {
    const ch = reliable ? chans.current.c : chans.current.g;
    if (ch?.readyState === 'open') ch.send(JSON.stringify(m));
  }, []);
  const subscribe = useCallback((fn: (m: Msg) => void) => {
    subs.current.add(fn);
    return () => {
      subs.current.delete(fn);
    };
  }, []);

  // 방 정보 불러오기 → 내 자리 확인
  useEffect(() => {
    let alive = true;
    (async () => {
      const token = loadToken(code);
      tokenRef.current = token;
      setJoinName(loadName());
      const r = await fetchRoom(code, token);
      if (!alive) return;
      if (!r.ok) {
        setError(r.error);
        return setPhase('error');
      }
      setInfo(r.info);
      if (r.info.seat !== null) {
        setSeat(r.info.seat);
        return setPhase('ready');
      }
      if (r.info.guest_name) {
        setError('이미 두 명이 모인 방이에요.');
        return setPhase('error');
      }
      setPhase('join');
    })();
    return () => {
      alive = false;
    };
  }, [code]);

  async function join(e: React.FormEvent) {
    e.preventDefault();
    setJoining(true);
    setError('');
    const res = await api<{ token: string }>(`/api/volley/rooms/${code}/join`, { name: joinName });
    setJoining(false);
    if (!res.ok) return setError(res.error);
    saveName(joinName.trim());
    saveToken(code, res.data.token);
    tokenRef.current = res.data.token;
    const r = await fetchRoom(code, res.data.token);
    if (r.ok) {
      setInfo(r.info);
      setSeat(r.info.seat);
    }
    setPhase('ready');
  }

  // 연결: 방장은 offer를 만들어 올리고 answer를 기다린다. 손님은 offer를 받아 answer를 올린다
  useEffect(() => {
    if (phase !== 'ready' || seat === null) return;
    let cancelled = false;
    let pc: RTCPeerConnection | null = null;
    let timer: ReturnType<typeof setInterval> | null = null;
    let failTimer: ReturnType<typeof setTimeout> | null = null;
    let answerApplied = false;
    let answeredOffer = '';
    let rebuilding = false;
    const open = { g: false, c: false };

    const setOpen = () => {
      const both = open.g && open.c;
      setLinked(both);
      if (both) {
        setEverLinked(true);
        setConn('connecting');
        if (failTimer) clearTimeout(failTimer);
      }
    };

    const wire = (ch: RTCDataChannel) => {
      const which = ch.label === 'c' ? 'c' : 'g';
      chans.current[which] = ch;
      ch.onopen = () => {
        open[which] = true;
        setOpen();
      };
      ch.onclose = () => {
        open[which] = false;
        setOpen();
      };
      ch.onmessage = (ev) => {
        try {
          const m = JSON.parse(String(ev.data)) as Msg;
          subs.current.forEach((fn) => fn(m));
        } catch {
          // 깨진 메시지는 버린다
        }
      };
    };

    const armFail = () => {
      if (failTimer) clearTimeout(failTimer);
      failTimer = setTimeout(() => {
        if (!cancelled && !(open.g && open.c)) {
          setConn('failed');
          if (seat === 0) void buildHost(); // 방장은 새 offer로 다시 시도
        }
      }, CONNECT_MS);
    };

    const watch = (p: RTCPeerConnection) => {
      p.onconnectionstatechange = () => {
        if (cancelled || p !== pc) return;
        if (p.connectionState === 'failed' || p.connectionState === 'closed' || p.connectionState === 'disconnected') {
          open.g = false;
          open.c = false;
          setOpen();
          if (seat === 0) setTimeout(() => !cancelled && p === pc && !(open.g && open.c) && void buildHost(), 2500);
        }
      };
    };

    const buildHost = async () => {
      if (rebuilding || cancelled) return;
      rebuilding = true;
      try {
        pc?.close();
        const p = new RTCPeerConnection(RTC_CONFIG);
        pc = p;
        answerApplied = false;
        wire(p.createDataChannel('g', { ordered: false, maxRetransmits: 0 }));
        wire(p.createDataChannel('c'));
        watch(p);
        await p.setLocalDescription(await p.createOffer());
        await gathered(p);
        if (cancelled || p !== pc) return;
        await api(`/api/volley/rooms/${code}/signal`, { kind: 'offer', sdp: p.localDescription?.sdp }, tokenRef.current);
      } finally {
        rebuilding = false;
      }
    };

    const answerOffer = async (sdp: string) => {
      pc?.close();
      const p = new RTCPeerConnection(RTC_CONFIG);
      pc = p;
      answeredOffer = sdp;
      open.g = false;
      open.c = false;
      p.ondatachannel = (ev) => wire(ev.channel);
      watch(p);
      await p.setRemoteDescription({ type: 'offer', sdp });
      await p.setLocalDescription(await p.createAnswer());
      await gathered(p);
      if (cancelled || p !== pc) return;
      await api(`/api/volley/rooms/${code}/signal`, { kind: 'answer', sdp: p.localDescription?.sdp }, tokenRef.current);
      setConn('connecting');
      armFail();
    };

    const poll = async () => {
      if (cancelled) return;
      if (seat === 0) {
        const r = await fetchRoom(code, tokenRef.current, 'answer');
        if (!r.ok || cancelled) return;
        setInfo(r.info);
        if (r.info.answer && !answerApplied && pc && pc.signalingState === 'have-local-offer') {
          answerApplied = true;
          setConn('connecting');
          armFail();
          try {
            await pc.setRemoteDescription({ type: 'answer', sdp: r.info.answer });
          } catch {
            answerApplied = false;
          }
        }
      } else {
        const r = await fetchRoom(code, tokenRef.current, 'offer');
        if (!r.ok || cancelled) return;
        setInfo(r.info);
        if (r.info.offer && r.info.offer !== answeredOffer && !(open.g && open.c)) {
          try {
            await answerOffer(r.info.offer);
          } catch {
            answeredOffer = '';
          }
        }
      }
    };

    if (seat === 0) void buildHost();
    void poll();
    timer = setInterval(poll, 1200);
    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
      if (failTimer) clearTimeout(failTimer);
      pc?.close();
      chans.current = {};
      setLinked(false);
    };
  }, [phase, seat, code]);

  const names: [string, string] = useMemo(() => [info?.host_name ?? '방장', info?.guest_name ?? '친구'], [info?.host_name, info?.guest_name]);
  const link: Link = useMemo(
    () => ({ role: seat === 1 ? 'guest' : 'host', names, target: info?.target ?? 11, linked, send, subscribe }),
    [seat, names, info?.target, linked, send, subscribe],
  );

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/games/volley/${code}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // 복사가 막힌 브라우저면 코드를 직접 알려 주세요
    }
  }

  if (phase === 'loading') return <p className="py-10 text-center text-[14px] text-inkMuted">방을 찾는 중…</p>;
  if (phase === 'error')
    return (
      <p role="alert" className="rounded-[10px] border-2 border-ink bg-white p-5 text-center text-[15px] font-bold text-seal">
        {error}
      </p>
    );

  if (phase === 'join')
    return (
      <form onSubmit={join} className="mx-auto flex w-full max-w-[420px] flex-col gap-3 rounded-[14px] border-2 border-ink bg-white p-5" noValidate>
        <h2 className="text-[20px] font-black">
          {info?.host_name}님의 방 <span className="font-latin">{code}</span>
        </h2>
        <p className="text-[13px] text-inkMuted">이름을 정하고 들어가면 바로 연결해요. {info?.target}점 선취입니다.</p>
        <label htmlFor="volley-join-name" className="text-[14px] font-bold">
          내 이름
        </label>
        <input
          id="volley-join-name"
          value={joinName}
          maxLength={VOLLEY_NAME_LIMIT}
          onChange={(e) => {
            setJoinName(e.target.value);
            setError('');
          }}
          placeholder="이름 또는 별명"
          className={fieldClass}
        />
        {error && (
          <p role="alert" className="text-[14px] text-seal">
            {error}
          </p>
        )}
        <button type="submit" disabled={joining} className={yellowButtonClass}>
          {joining ? '들어가는 중…' : '들어가기'}
        </button>
      </form>
    );

  // 아직 한 번도 연결되기 전: 코드를 알려 주고 기다린다
  if (!everLinked) {
    const hostWaiting = seat === 0 && !info?.guest_name;
    return (
      <div className="mx-auto flex w-full max-w-[420px] flex-col items-center gap-4 rounded-[14px] border-2 border-ink bg-white p-6 text-center">
        <p className="text-[13px] font-bold text-inkMuted">방 코드</p>
        <p className="font-latin text-[48px] font-semibold leading-none tracking-[0.2em]">{code}</p>
        {seat === 0 && (
          <button type="button" onClick={copyLink} className="h-11 rounded-[10px] border-2 border-ink bg-sticker px-5 text-[15px] font-bold hover:bg-[#e3c900]">
            {copied ? '복사했어요!' : '초대 링크 복사'}
          </button>
        )}
        <p className="text-[15px] font-bold">
          {conn === 'failed'
            ? '연결하지 못했어요. 다시 시도하는 중…'
            : hostWaiting
              ? '친구를 기다리는 중…'
              : conn === 'connecting'
                ? '연결하는 중…'
                : seat === 0
                  ? `${info?.guest_name}님이 들어왔어요. 연결하는 중…`
                  : '방장과 연결하는 중…'}
        </p>
        {conn === 'failed' && (
          <p className="text-[13px] leading-snug text-inkMuted">
            회사나 학교 망, 일부 공유기에서는 직접 연결이 막힐 수 있어요. 한쪽을 폰 데이터(LTE/5G)로 바꾸면 되는 경우가 많아요.
          </p>
        )}
        <p className="text-[13px] text-inkMuted">{info?.target}점 선취 · 이 창을 닫지 말고 기다려 주세요.</p>
      </div>
    );
  }

  return <NupjukVolley link={link} />;
}
