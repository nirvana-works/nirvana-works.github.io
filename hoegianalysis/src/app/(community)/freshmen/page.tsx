import { redirect } from 'next/navigation';

// 신입생 소개는 교수 소개로 바뀌었다. 예전 주소로 와도 새 페이지로 보낸다
export default function Page() {
  redirect('/professor');
}
