// 2026 겨울학기 개설과목 (원본: 2026_Winter_Semester_Course_Offerings_Guide, 2026.11.06 기준)
// 엑셀의 G(과목명) · J(교수) · K(분야) · M(요일) · N(시간) · R(비고) · S(수강 대상) 열을 옮기고,
// 학점은 I열 L:L:C(강의:실험:학점)의 마지막 값을 썼다.
// 학과별로 중복된 같은 행은 하나로 합쳤다.
export type Day = '월' | '화' | '수' | '목' | '금' | '토';
export type FieldKey = '금융' | 'IT경영' | '기술/조직/전략' | '기타(연수/연구)';

export interface Course {
  id: number;
  name: string;
  sub: string | null; // <> 안의 부제
  professor: string;
  credits: number; // 학점 (L:L:C의 마지막 값)
  field: FieldKey;
  days: Day[];
  time: string[]; // 요일별 수업 시간
  target: string | null; // 수강 대상 (등록 첫날 기준)
  note: string; // 비고 (강의일자 제외)
  dates: string[]; // 강의 일자
  extra: string[]; // 연수 기간·장소 같은 추가 안내
}

export const WINTER_2026_UPDATED = '2026.11.06';

export const COURSES: Course[] = [
  {
    "id": 1,
    "name": "금융윤리와 사회책임",
    "sub": null,
    "professor": "권민수",
    "field": "금융",
    "days": [
      "금",
      "토"
    ],
    "time": [
      "금 19:00~22:00",
      "토 09:00~12:00"
    ],
    "target": "DFMBA Only",
    "note": "DFMBA Only, 1년차 필수",
    "dates": [
      "1/8",
      "1/9",
      "1/15",
      "1/16",
      "1/22",
      "1/23",
      "1/29",
      "1/30"
    ],
    "extra": [],
    "credits": 1.5
  },
  {
    "id": 2,
    "name": "금융 데이터베이스",
    "sub": null,
    "professor": "이현열",
    "field": "금융",
    "days": [
      "화",
      "목"
    ],
    "time": [
      "화·목 19:00~22:00"
    ],
    "target": "DFMBA Only",
    "note": "DFMBA Only, 1년차 필수",
    "dates": [
      "12/22",
      "12/29",
      "1/5",
      "1/7",
      "1/12",
      "1/14",
      "1/19",
      "1/21"
    ],
    "extra": [],
    "credits": 1.5
  },
  {
    "id": 3,
    "name": "재무사례분석",
    "sub": null,
    "professor": "박진우",
    "field": "금융",
    "days": [
      "화",
      "목"
    ],
    "time": [
      "화·목 19:00~22:00"
    ],
    "target": "PMBA Only",
    "note": "수강신청기간: PMBA Only",
    "dates": [
      "12/22",
      "12/24",
      "12/29",
      "1/5",
      "1/7",
      "1/12",
      "1/14",
      "1/19"
    ],
    "extra": [],
    "credits": 1.5
  },
  {
    "id": 4,
    "name": "디지털금융 특수논제",
    "sub": "Introduction to Deep Learning",
    "professor": "이승희",
    "field": "금융",
    "days": [
      "월",
      "수"
    ],
    "time": [
      "월·수 19:00~22:00"
    ],
    "target": "DFMBA Only",
    "note": "수강신청기간: DFMBA Only",
    "dates": [
      "12/21",
      "12/23",
      "12/28",
      "12/30",
      "1/4",
      "1/6",
      "1/11",
      "1/13"
    ],
    "extra": [],
    "credits": 1.5
  },
  {
    "id": 5,
    "name": "디지털금융 특수논제",
    "sub": "파이썬을 활용한 데이터분석",
    "professor": "유은규",
    "field": "금융",
    "days": [
      "금",
      "토"
    ],
    "time": [
      "금 19:00~22:00",
      "토 09:00~12:00"
    ],
    "target": "DFMBA Only",
    "note": "DFMBA/FMBA/IMMS 공동수강",
    "dates": [
      "1/8",
      "1/9",
      "1/15",
      "1/16",
      "1/22",
      "1/23",
      "1/29",
      "1/30"
    ],
    "extra": [],
    "credits": 1.5
  },
  {
    "id": 6,
    "name": "기업경영실습(국내인턴십)",
    "sub": null,
    "professor": "강장구",
    "field": "기타(연수/연구)",
    "days": [],
    "time": [],
    "target": null,
    "note": "",
    "dates": [],
    "extra": [],
    "credits": 1.5
  },
  {
    "id": 7,
    "name": "혁신경영과 기업가형 경영자",
    "sub": null,
    "professor": "최병철",
    "field": "기술/조직/전략",
    "days": [
      "금",
      "토"
    ],
    "time": [
      "금 15:00~21:00",
      "토 09:00~16:00"
    ],
    "target": "EMBA Only",
    "note": "EMBA Only",
    "dates": [
      "1/16(토)",
      "1/22(금)",
      "1/23(토)",
      "1/29(금)"
    ],
    "extra": [],
    "credits": 1.5
  },
  {
    "id": 8,
    "name": "조직설계 및 혁신",
    "sub": null,
    "professor": "박상찬",
    "field": "기술/조직/전략",
    "days": [
      "화",
      "목"
    ],
    "time": [
      "화·목 19:00~22:00"
    ],
    "target": "PMBA Only",
    "note": "수강신청기간: PMBA Only",
    "dates": [
      "12/22",
      "12/29",
      "1/5",
      "1/7",
      "1/12",
      "1/14",
      "1/19",
      "1/26"
    ],
    "extra": [],
    "credits": 1.5
  },
  {
    "id": 9,
    "name": "조직디자인과 리더십",
    "sub": null,
    "professor": "박상찬",
    "field": "기술/조직/전략",
    "days": [
      "금",
      "토"
    ],
    "time": [
      "금 15:00~21:00",
      "토 09:00~16:00"
    ],
    "target": "EMBA Only",
    "note": "EMBA Only",
    "dates": [
      "1/2(토)",
      "1/8(금)",
      "1/9(토)",
      "1/15(금)"
    ],
    "extra": [],
    "credits": 1.5
  },
  {
    "id": 10,
    "name": "디지털 이노베이션",
    "sub": null,
    "professor": "양성병",
    "field": "IT경영",
    "days": [
      "화",
      "목",
      "토"
    ],
    "time": [
      "화·목 19:00~22:00",
      "토 09:00~12:00"
    ],
    "target": "PMBA Only",
    "note": "PMBA,IMMS 공동수강으로 진행하되, PMBA 우선적으로 수강신청",
    "dates": [
      "1/5(화)",
      "1/7(목)",
      "1/9(토)",
      "1/12(화)",
      "1/14(목)",
      "1/16(토)",
      "1/19(화)",
      "1/21(목)"
    ],
    "extra": [],
    "credits": 1.5
  },
  {
    "id": 11,
    "name": "인공지능 비즈니스 전략",
    "sub": null,
    "professor": "권순재",
    "field": "IT경영",
    "days": [
      "월",
      "수",
      "금"
    ],
    "time": [
      "월·수·금 19:00~22:00"
    ],
    "target": "K/TMBA Only",
    "note": "K/TMBA,PMBA,IMMS 공동수강으로 진행하되, KMBA 우선적으로 수강신청",
    "dates": [
      "12/21",
      "12/23",
      "12/28",
      "12/30",
      "1/4",
      "1/6",
      "1/8",
      "1/11",
      "1/13",
      "1/15",
      "1/18",
      "1/20",
      "1/22",
      "1/25",
      "1/27",
      "1/29"
    ],
    "extra": [],
    "credits": 3
  },
  {
    "id": 12,
    "name": "해외현장연수 I",
    "sub": null,
    "professor": "김상원",
    "field": "기타(연수/연구)",
    "days": [
      "화",
      "수",
      "목",
      "금",
      "토"
    ],
    "time": [
      "화 19:00~22:00",
      "수·목·금·토 09:00~22:00"
    ],
    "target": "PMBA Only",
    "note": "PMBA Only",
    "dates": [],
    "extra": [
      "연수기간: 1/12 19:00~22:00 홍릉,  1/27~1/30  09:00~22:00 나고야",
      "연수장소: 나고야 (일본)"
    ],
    "credits": 1.5
  },
  {
    "id": 13,
    "name": "기업경영실습(국내인턴십)",
    "sub": null,
    "professor": "박상찬",
    "field": "기타(연수/연구)",
    "days": [],
    "time": [],
    "target": null,
    "note": "",
    "dates": [],
    "extra": [],
    "credits": 1
  },
  {
    "id": 14,
    "name": "국제경영실습(해외인턴십)",
    "sub": null,
    "professor": "박상찬",
    "field": "기타(연수/연구)",
    "days": [],
    "time": [],
    "target": null,
    "note": "",
    "dates": [],
    "extra": [],
    "credits": 1
  }
];
