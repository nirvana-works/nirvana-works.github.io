'use client';

import Link from 'next/link';
import { useState } from 'react';
import { yellowButtonClass } from '@/components/community/formStyles';
import { Field } from './Field';

const EMPTY = { email: '', name: '', cohort: '', nickname: '', password: '', confirm: '', message: '' };
const MESSAGE_MAX = 200;

// 회원 가입 신청. 보내면 '승인 대기' 안내로 바뀐다
export function SignupForm() {
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    setError('');
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (form.password !== form.confirm) {
      setError('비밀번호 확인이 달라요.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/member/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, confirm: undefined }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) setError(data.error ?? '가입 신청을 하지 못했어요.');
      else setDone(true);
    } catch {
      setError('네트워크 오류로 신청하지 못했어요. 다시 시도해 주세요.');
    }
    setLoading(false);
  }

  if (done)
    return (
      <div className="rounded-[14px] border-2 border-ink bg-white p-5 text-center shadow-[4px_4px_0_#000]">
        <p className="text-[20px] font-black">가입 신청 완료!</p>
        <p className="mt-2 text-[14px] leading-relaxed text-inkMuted">
          운영자가 확인하고 승인하면 로그인할 수 있어요.
          <br />
          승인되면 운영자가 따로 알려 드릴게요.
        </p>
        <Link href="/" className="mt-4 inline-block text-[14px] font-bold underline underline-offset-4">
          홈으로
        </Link>
      </div>
    );

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <Field label="카이스트 메일" type="email" inputMode="email" autoComplete="email" placeholder="you@kaist.ac.kr" value={form.email} onChange={set('email')} required />
      <div className="grid grid-cols-2 gap-3">
        <Field label="이름" autoComplete="name" value={form.name} onChange={set('name')} required />
        <Field label="기수" placeholder="예: 14기" value={form.cohort} onChange={set('cohort')} required />
      </div>
      <Field label="별명" hint="화면에는 별명만 보여요. 이름·메일은 운영자만 봐요." value={form.nickname} onChange={set('nickname')} required />
      <Field label="비밀번호" type="password" autoComplete="new-password" hint="8자 이상" value={form.password} onChange={set('password')} required />
      <Field label="비밀번호 확인" type="password" autoComplete="new-password" value={form.confirm} onChange={set('confirm')} required />
      <label className="flex flex-col gap-1.5">
        <span className="flex items-baseline justify-between text-[14px] font-bold">
          교수님께 한마디
          <span className="text-[12px] font-normal text-inkMuted">
            선택 · {[...form.message].length}/{MESSAGE_MAX}
          </span>
        </span>
        <textarea
          rows={3}
          maxLength={MESSAGE_MAX}
          placeholder="예: 교수님, 이번 학기도 잘 부탁드립니다!"
          value={form.message}
          onChange={set('message')}
          className="w-full resize-none rounded-[8px] border-2 border-ink bg-sticker/20 px-3 py-2.5 text-[16px] leading-snug focus:border-cube focus:outline-none"
        />
      </label>
      {error && <p className="text-[14px] font-bold text-seal">{error}</p>}
      <button type="submit" disabled={loading} className={yellowButtonClass}>
        {loading ? '보내는 중…' : '가입 신청'}
      </button>
      <p className="text-center text-[14px]">
        이미 회원이에요?{' '}
        <Link href="/login" className="font-bold underline underline-offset-4">
          로그인
        </Link>
      </p>
    </form>
  );
}
