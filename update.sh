#!/usr/bin/env bash
# update.sh — images/photos/ 아래 국가 폴더를 스캔해 photos.json / photos.js 생성
# 사용법: bash update.sh
# (스크립트 위치 기준으로 실행되므로 어느 폴더에서 실행해도 됨)

cd "$(dirname "$0")" || exit 1

python3 - <<'PY'
import os, json

PHOTOS_DIR = "images/photos"
OUTPUT     = "photos.json"
OUTPUT_JS  = "photos.js"
MAP_SVG    = "images/map/world.svg"
MAP_JS     = "images/map/world.js"
EXTS       = {".jpg", ".jpeg", ".png", ".webp"}

NAMES = {
    "ad":"안도라",    "ae":"아랍에미리트","af":"아프가니스탄","al":"알바니아",
    "am":"아르메니아","ao":"앙골라",      "ar":"아르헨티나",  "at":"오스트리아",
    "au":"호주",      "az":"아제르바이잔","ba":"보스니아",    "bd":"방글라데시",
    "be":"벨기에",    "bf":"부르키나파소","bg":"불가리아",    "bh":"바레인",
    "bi":"부룬디",    "bj":"베냉",        "bn":"브루나이",    "bo":"볼리비아",
    "br":"브라질",    "bs":"바하마",      "bt":"부탄",        "bw":"보츠와나",
    "by":"벨라루스",  "bz":"벨리즈",     "ca":"캐나다",      "cd":"콩고민주공화국",
    "cf":"중앙아프리카공화국","cg":"콩고","ch":"스위스",      "ci":"코트디부아르",
    "cl":"칠레",      "cm":"카메룬",      "cn":"중국",        "co":"콜롬비아",
    "cr":"코스타리카","cu":"쿠바",        "cv":"카보베르데",  "cy":"키프로스",
    "cz":"체코",      "de":"독일",        "dj":"지부티",      "dk":"덴마크",
    "do":"도미니카공화국","dz":"알제리",  "ec":"에콰도르",    "ee":"에스토니아",
    "eg":"이집트",    "er":"에리트레아",  "es":"스페인",      "et":"에티오피아",
    "fi":"핀란드",    "fj":"피지",        "fr":"프랑스",      "ga":"가봉",
    "gb":"영국",      "ge":"조지아",      "gh":"가나",        "gm":"감비아",
    "gn":"기니",      "gq":"적도기니",    "gr":"그리스",      "gt":"과테말라",  "gu":"괌",
    "gw":"기니비사우","gy":"가이아나",    "hn":"온두라스",    "hr":"크로아티아",
    "ht":"아이티",    "hu":"헝가리",      "id":"인도네시아",  "ie":"아일랜드",
    "il":"이스라엘",  "in":"인도",        "iq":"이라크",      "ir":"이란",
    "is":"아이슬란드","it":"이탈리아",    "jm":"자메이카",    "jo":"요르단",
    "jp":"일본",      "ke":"케냐",        "kg":"키르기스스탄","kh":"캄보디아",
    "ki":"키리바시",  "km":"코모로",      "kp":"북한",        "kr":"한국",
    "kw":"쿠웨이트",  "kz":"카자흐스탄",  "la":"라오스",      "lb":"레바논",
    "li":"리히텐슈타인","lk":"스리랑카",  "lr":"라이베리아",  "ls":"레소토",
    "lt":"리투아니아","lu":"룩셈부르크",  "lv":"라트비아",    "ly":"리비아",
    "ma":"모로코",    "md":"몰도바",      "me":"몬테네그로",  "mg":"마다가스카르",
    "mk":"북마케도니아","ml":"말리",      "mm":"미얀마",      "mn":"몽골",      "mp":"사이판",
    "mr":"모리타니",  "mt":"몰타",        "mu":"모리셔스",    "mv":"몰디브",
    "mw":"말라위",    "mx":"멕시코",      "my":"말레이시아",  "mz":"모잠비크",
    "na":"나미비아",  "ne":"니제르",      "ng":"나이지리아",  "ni":"니카라과",
    "nl":"네덜란드",  "no":"노르웨이",    "np":"네팔",        "nz":"뉴질랜드",
    "om":"오만",      "pa":"파나마",      "pe":"페루",        "pg":"파푸아뉴기니",
    "ph":"필리핀",    "pk":"파키스탄",    "pl":"폴란드",      "pt":"포르투갈",
    "py":"파라과이",  "qa":"카타르",      "ro":"루마니아",    "rs":"세르비아",
    "ru":"러시아",    "rw":"르완다",      "sa":"사우디아라비아","sb":"솔로몬제도",
    "sc":"세이셸",    "sd":"수단",        "se":"스웨덴",      "sg":"싱가포르",
    "si":"슬로베니아","sk":"슬로바키아",  "sl":"시에라리온",  "sn":"세네갈",
    "so":"소말리아",  "sr":"수리남",      "ss":"남수단",      "sv":"엘살바도르",
    "sy":"시리아",    "sz":"에스와티니",  "td":"차드",        "tg":"토고",
    "th":"태국",      "tj":"타지키스탄",  "tl":"동티모르",    "tm":"투르크메니스탄",
    "tn":"튀니지",    "tr":"튀르키예",    "tw":"대만",        "tz":"탄자니아",    "ua":"우크라이나",
    "ug":"우간다",    "us":"미국",        "uy":"우루과이",    "uz":"우즈베키스탄",
    "va":"바티칸",    "ve":"베네수엘라",  "vn":"베트남",      "ye":"예멘",
    "za":"남아프리카공화국","zm":"잠비아","zw":"짐바브웨",
}

countries = {}
for code in sorted(os.listdir(PHOTOS_DIR)):
    path = os.path.join(PHOTOS_DIR, code)
    if not os.path.isdir(path):
        continue
    photos = sorted(
        f for f in os.listdir(path)
        if os.path.splitext(f)[1].lower() in EXTS
    )
    name = NAMES.get(code, code.upper())
    countries[code] = {"name": name, "photos": photos}
    print(f"  [{code}] {name} — {len(photos)}장")

data = {"countries": countries}
with open(OUTPUT, "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

# 로컬 파일(file://)로 열어도 동작하도록 <script>용 JS 파일도 함께 생성
with open(OUTPUT_JS, "w", encoding="utf-8") as f:
    f.write("window.PHOTOS_DATA = ")
    json.dump(data, f, ensure_ascii=False, indent=2)
    f.write(";\n")

with open(MAP_SVG, encoding="utf-8") as f:
    svg = f.read()
with open(MAP_JS, "w", encoding="utf-8") as f:
    f.write("window.WORLD_SVG = " + json.dumps(svg, ensure_ascii=False) + ";\n")

print(f"완료: {OUTPUT}, {OUTPUT_JS}, {MAP_JS} 생성됨")
PY
