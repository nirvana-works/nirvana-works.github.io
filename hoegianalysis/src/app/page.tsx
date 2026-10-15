import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen gap-8 p-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-800 mb-2">회기분석 출석체크</h1>
        <p className="text-gray-500 text-lg">QR코드 기반 차수별 출석 관리</p>
      </div>

      <div className="flex flex-col gap-4 w-full max-w-xs">
        <Link
          href="/admin"
          className="block w-full text-center bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-6 rounded-xl text-lg transition-colors"
        >
          관리자로 시작하기
        </Link>
      </div>
    </main>
  );
}
