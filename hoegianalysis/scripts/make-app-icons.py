"""회기랩 앱 아이콘 생성: 라임 바탕 위 루빅스 큐브 (위 노랑 · 왼쪽 파랑 · 오른쪽 흰색 스티커).
실행: python3 scripts/make-app-icons.py  →  public/icons/*.png
"""
import math, os
from PIL import Image, ImageDraw

LIME, BODY, INK = (221, 229, 166), (43, 80, 230), (0, 0, 0)
STICKER = {'top': (242, 216, 14), 'left': (76, 120, 245), 'right': (255, 255, 255)}
SS = 4  # 4배로 그린 뒤 줄여서 가장자리를 부드럽게

def render(size, scale):
    N = size * SS
    img = Image.new('RGB', (N, N), LIME)
    d = ImageDraw.Draw(img)
    a = N * scale
    cx, cy = N / 2, N / 2
    c30, s30 = math.cos(math.pi / 6), 0.5
    P = lambda x, y, z: (cx + (x - y) * c30 * a, cy + (x + y) * s30 * a - z * a)
    faces = {
        'top':   lambda u, v: P(u, v, 1),
        'right': lambda u, v: P(1, u, 1 - v),
        'left':  lambda u, v: P(u, 1, 1 - v),
    }
    line = max(2, round(a * 0.035))
    for name, f in faces.items():
        d.polygon([f(0, 0), f(1, 0), f(1, 1), f(0, 1)], fill=BODY, outline=INK, width=line)
        g = 0.07  # 스티커 사이 틈 (칸 크기 대비)
        for i in range(3):
            for j in range(3):
                u0, u1 = (i + g) / 3, (i + 1 - g) / 3
                v0, v1 = (j + g) / 3, (j + 1 - g) / 3
                d.polygon([f(u0, v0), f(u1, v0), f(u1, v1), f(u0, v1)], fill=STICKER[name], outline=INK, width=max(1, line // 2))
    # 바깥 윤곽선을 한 번 더 굵게
    hull = [P(0, 0, 1), P(1, 0, 1), P(1, 0, 0), P(1, 1, 0), P(0, 1, 0), P(0, 1, 1)]
    d.line(hull + [hull[0]], fill=INK, width=line * 2, joint='curve')
    for (x, y) in hull:  # 꼭짓점 이음새가 패이지 않도록 둥글게 메운다
        d.ellipse([x - line, y - line, x + line, y + line], fill=INK)
    return img.resize((size, size), Image.LANCZOS)

if __name__ == '__main__':
    out = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'public', 'icons')
    os.makedirs(out, exist_ok=True)
    render(192, 0.30).save(os.path.join(out, 'icon-192.png'))
    render(512, 0.30).save(os.path.join(out, 'icon-512.png'))
    render(512, 0.24).save(os.path.join(out, 'icon-maskable-512.png'))  # 안드로이드 원형·물방울 마스크 안전 영역
    render(180, 0.30).save(os.path.join(out, 'apple-touch-icon.png'))
    print('ok')
