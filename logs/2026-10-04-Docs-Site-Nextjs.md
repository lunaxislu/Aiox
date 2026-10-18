---
topic: Docs Site Nextjs
description: Fumadocs·Next.js 기반 공식 문서 사이트(한국어) 구축
status: open
---

## Work Items

- [x] W1 문서 사이트 스택과 위치를 결정한다. 프레임워크(Fumadocs/Nextra)를 공식 문서로 확인하고 repo 내 위치(apps/docs 등)와 MDX 작성 방식을 정한다.
- [>] W2 aiox host yaml·install 명령 등 코드 복사 블록을 구성한다.
- [ ] W3 seo skill 기준으로 SEO·AI 검색 노출(메타데이터·sitemap·robots·structured data)을 적용한다.
- [ ] W4 배포 대상과 도메인을 결정하고 배포한다(Vercel vs Cloudflare).
- [ ] W5 랜딩 페이지를 구성하고 모션 범위를 구현한다. hero·기능 섹션·설치 블록과 스크롤 연출을 포함한다.
- [ ] W6 a→b 일방 route 완료 알림 흐름의 데모 클립을 녹화한다.

## Required Context

### Return Target

- None: independent log.

### {Global}

- 사용 skill: minimalist-ui(토큰 범위), shadcn(컴포넌트), seo(기술 SEO·AI 검색 노출), emilkowalski/skills@animate(모션 구현, 2026-10-07 설치), 전역 vercel-react-best-practices·vercel-composition-patterns. 검수 전용으로 web-design-guidelines가 설치돼 있다. marketingskills ai-seo는 SaaS 마케팅 중심이고 seo와 llms.txt 지침이 충돌해 2026-10-04 제거했다. @review-animations는 @user 결정으로 설치하지 않았다.
- 배포 후보는 아직 미검증이다. Vercel 호스팅(+Cloudflare Registrar 도메인)과 Cloudflare(OpenNext 필요)는 도입 전 공식 문서로 확인한다. 문서 프레임워크 후보의 확인 결과는 2026-10-07 entry가 소유한다.
- 문서 언어는 한국어로 작성한다(2026-10-07 @user). 영어판은 후속 과제이며 지금은 i18n 구조를 도입하지 않는다. Fumadocs 기본 dot parser가 기본 로케일의 locale suffix를 생략하므로 나중에 `.en` 파일 추가로 확장한다.
- 사이트 위치는 `apps/docs`다(2026-10-07 @user). 콘텐츠는 `docs/` owner 문서를 복제·동기화하지 않고 사용자가 읽을 수준으로 새로 작성하며, owner 문서는 사실 출처로만 쓴다.
- UI는 Fumadocs 기본 테마 구조를 유지하고 색은 내장 preset을 쓴다(2026-10-07 @user 승인). minimalist-ui는 CSS 변수로 표현되는 토큰 범위만 적용하며 bento·serif hero·스크롤 연출·Phosphor 아이콘은 랜딩 페이지에만 쓴다. 한글 본문 폰트는 Pretendard다.
- 스택은 Fumadocs 16 + Next 16 + Tailwind 4로 확정했다(2026-10-07). 소스는 `apps/docs/src/` 아래, 단 `defineDocs`는 `fumadocs-mdx`가 경로를 고정하는 패키지 루트 `source.config.ts`에 둔다. 색 preset은 `neutral`이고 한글 본문 폰트는 공식 `pretendard` 패키지의 variable dynamic-subset CSS다(`@fontsource/pretendard`는 unicode-range가 없어 2.23MB를 조건 없이 받으므로 쓰지 않는다). 폰트 변수는 `--default-font-family`에 지정한다. 애니메이션 라이브러리는 추가하지 않고 모션은 CSS로 구현하며, @animate 요구에 따라 `prefers-reduced-motion` 대체 변형과 hover 게이팅을 최초 구현에 포함하고 UI 지속시간은 300ms 이하로 둔다.

## 2026-10-04 · W1 문서 사이트 착수

사용자 요구: Next.js·MDX로 공식 문서 사이트를 영어로 먼저 작성한다. aiox host yaml과 install 명령을 복사·붙여넣기할 수 있어야 하고, SEO와 AI 검색 노출을 다루며, 배포는 Vercel(도메인 구매)과 Cloudflare 중 결정한다. `logs/2026-10-04-Web-Error-UI-UX-Review.md`와 병렬 진행한다.

skill 선정 경위: taste-skill은 plugin 설치 시 13개 skill이 함께 활성화되어 `npx skills`로 minimalist-ui만 프로젝트 범위에 설치했다. design-taste-frontend와 frontend-design plugin은 목적이 겹쳐 제외했다.

### 2026-10-07 13:25 · git 변경에서 문서 사이트 관련 범위 확인

- @user 요청: 현재 git 변경 내용에 Next.js 공식 문서 사이트를 만드는 작업이 있는지 확인한다.
- 확인한 사실(문서 사이트 관련): 변경 중 문서 사이트에 해당하는 것은 skill 설치뿐이다. `skills-lock.json`이 HEAD(`9bb944a`)의 json-canvas·obsidian-markdown 위에 minimalist-ui(leonxlnx/taste-skill)·seo(addyosmani/web-quality-skills)·shadcn(shadcn-ui/ui)·web-design-guidelines(vercel-labs/agent-skills) 4개를 추가했고, `.agents/skills/`의 같은 4개 디렉터리와 `.claude/skills/`의 symlink, 그리고 이 로그 파일이 untracked다.
- 확인한 사실(구현 없음): `next.config*` 파일 없음, 어떤 `package.json`에도 `next` 의존성 없음, `apps/docs` 없음. `apps/`는 cli·daemon·web이고 `apps/web`은 Vite 8·React 19·react-router로 Next.js가 아니다. tracked mdx 문자열은 `apps/web/.storybook/main.ts`·`packages/adapters/codex/src/relay.test.ts`·`pnpm-lock.yaml`·`logs/artifact/aiox-version9.html`에서만 나오고 문서 사이트와 무관하다.
- 판단: W1은 미결 상태 그대로다. Fumadocs/Nextra 공식 문서 확인, repo 내 위치 생성, MDX 작성 방식 결정은 아직 시작되지 않았고 working tree에는 skill 준비만 있다. W2~W4도 착수 흔적이 없다.
- 무관한 변경: `apps/cli/src/cli.ts`는 type import 순서 정렬 한 줄, `logs/2026-09-09-AIOX-TUI-Stage6-Web.md`는 2026-10-02 전역 config JSON 안내 entry, 루트 `better-sqlite3SQLite`는 2026-09-28에 생긴 0 byte 잔여 파일이다.
- 미결: `web-design-guidelines`는 lock과 symlink에 설치됐지만 `{Global}`의 사용 skill 목록에 없다. 사용 skill로 올릴지 제거할지는 @user 결정 사항이므로 Required Context를 수정하지 않았다.

### 2026-10-07 13:35 · 라이브러리·섹션 라우팅 계획 브리핑(@user 결정 대기)

- @user 확정 요구(변경 포함): 사이트는 `apps/web` 옆 `apps/docs`에 둔다. 문서 언어는 **한국어**이며, 2026-10-04 entry에 적힌 "영어 우선"은 이 지시로 철회됐다(변경 이유: @user 지시). 콘텐츠는 `docs/` owner 문서를 근거로 삼되 복제가 아니라 사용자가 읽을 수준으로 새로 작성한다.
- 확인한 사실(npm registry, 2026-10-07): `next` 16.4.0. `fumadocs-ui`·`fumadocs-core` 16.16.2이고 peer는 `next: 16.x.x`·`react: ^19.2.0`. `fumadocs-mdx` 15.4.6, peer `next: ^15.3.0 || ^16.0.0`·`fumadocs-core: ^16.15.3`. `nextra`·`nextra-theme-docs` 4.6.1, peer `next: >=14`·`react: >=18`·node `>=18`.
- 확인한 사실(공식 문서): Fumadocs 16은 전제 조건이 Next.js 16 + Tailwind CSS 4다(`https://fumadocs.dev/docs/manual-installation/next`). 설치는 `fumadocs-mdx fumadocs-core @types/mdx` + `fumadocs-ui`이고, `next.config.mjs`의 `createMDX()`·`lib/source.ts`의 `defineDocs`+`loader({baseUrl})`·`app/docs/layout.tsx`·`app/docs/[[...slug]]/page.tsx`·`app/api/search/route.ts` 5개 접점으로 구성된다. Fumadocs MDX는 ESM only라 config는 `.mjs`를 쓴다.
- 확인한 사실(섹션 라우팅 메커니즘, `https://fumadocs.dev/docs/headless/page-conventions`): slug는 content 디렉터리 파일 경로에서 생성되고 `index.mdx`는 폴더 루트가 된다. `meta.json`의 `pages`로 순서·`---Label---` 구분선·외부 링크·`...` 나머지·`!제외`·`...folder` 추출을 제어한다. `(group)` 폴더는 slug에 영향을 주지 않고, `root: true`는 사이드바를 분리하는 Layout Tabs, `root: "<type>"`은 버전 드롭다운이 된다. 같은 URL 중복은 금지다.
- 확인한 사실(한국어 운용): 기본 검색 ZBSearch의 기본 `multilingual` 모드는 Unicode word segmentation을 써서 모든 로케일이 설정 없이 하나의 검색 DB를 공유한다(언어별 stemming·stop-word는 적용되지 않는다, `https://fumadocs.dev/docs/headless/search/orama`). i18n은 기본 `dot` parser에서 파일명에 `.{locale}`를 붙이고 **기본 로케일은 suffix를 생략**하므로, 한국어 단독으로 시작한 뒤 나중에 `.en` 파일만 추가해 확장할 수 있다.
- 확인한 사실(repo 정합): pnpm workspace가 `apps/*`를 포함해 `apps/docs`는 자동 편입된다. `apps/web`이 이미 React 19.3.0·Tailwind 4.3.3·`@base-ui/react`·`lucide-react`를 쓰고 Fumadocs UI의 Tabs도 Base UI 기반이다. `next typegen`은 Next 15.5.0부터 있고 공식 권장 CI 형태가 `next typegen && tsc --noEmit`이다(`https://nextjs.org/docs/app/api-reference/cli/next`). 반면 `.gitignore`의 `/.next/`는 루트 고정 패턴이라 `apps/docs/.next`를 무시하지 못하고, `.oxlintrc.json`·`.oxfmtrc.json`의 `ignorePatterns`에도 `.next/**`가 없다.
- 제안(미승인, @user 결정 대기): ① 프레임워크는 Fumadocs 16 + Next 16 + Tailwind 4 채택, Nextra는 peer 범위만 확인하고 더 평가하지 않았다. ② AGENTS.md의 `@/* → ./src/*`를 지키려 `src/app`·`src/lib`·`src/content/docs` 배치. ③ URL slug는 영어, 제목·설명은 한국어. ④ Layout Tabs 없이 단일 사이드바 + `---구분선---`. ⑤ i18n·커스텀 랜딩·shadcn 중복 도입은 하지 않고 `/`는 `/docs`로 보낸다. ⑥ 1단계는 소개·설치·빠른 시작·핵심 개념·`aiox.yaml`·CLI 레퍼런스 6페이지.
- 남은 결정: 위 6개 제안의 승인 여부, 섹션 구조를 소유할 Work Item 추가 여부, 배포 대상(W4)을 지금 정할지 여부.

### 2026-10-07 17:12 · 배포 대기 확정과 UI 디자인 skill 충돌 보고

- @user 결정: 배포(W4)는 지금 정하지 않고 대기한다. W4는 `[ ]`로 남기며 Vercel·Cloudflare 비교는 이후 요청 시 수행한다.
- 확인한 사실(Fumadocs 테마, `https://fumadocs.dev/docs/ui/theme`): Tailwind CSS v4만 지원하고 색은 CSS preset import로 고른다. 내장 preset은 neutral·black·vitepress·dusk·catppuccin·ocean·purple·solar·emerald·ruby·aspen 11종이다. `fumadocs-ui/css/shadcn.css` preset을 쓰면 Fumadocs UI가 프로젝트의 shadcn 테마 색을 그대로 채택한다. light/dark는 `next-themes`가 Root Provider에 포함되고, 폭은 `--fd-layout-width` 변수로 조정한다. 레이아웃 변형은 Docs·Notebook·Flux·Glass·Home·Spacious·Page가 있다.
- 확인한 사실(폰트): Fumadocs는 기본 폰트를 포함하지 않고 `next/font`에서 고르라고 안내한다. `apps/web`은 `@fontsource-variable/geist`를 쓰는데 Geist에는 한글 글리프가 없다.
- 확인한 사실(skill 충돌): 로컬 `.agents/skills/minimalist-ui/SKILL.md` §2가 Lucide 아이콘·gradient·그림자·Inter/Roboto를 금지하고 §3은 editorial serif 헤딩, §6은 Phosphor/Radix 아이콘과 사진·일러스트, §7은 스크롤 진입 애니메이션을 요구한다. 그러나 `fumadocs-ui` 16.16.2는 `lucide-react ^1.50.0`을 직접 의존한다(npm deps 실측). 또 같은 파일 §2의 gradient 금지와 §6·§7의 radial-gradient ambient 권장이 서로 모순된다.
- @agent 판단: minimalist-ui는 bento grid·hero·picsum 사진·스크롤 연출을 지시하는 랜딩/마케팅 editorial 프로토콜이며 문서 읽기 화면의 규격이 아니다. 이를 Fumadocs 문서 chrome에 문자 그대로 적용하면 테마를 포크해야 하고, 기성 테마를 쓰는 채택 근거 자체가 사라진다.
- 제안(미승인): ① 문서 chrome·사이드바·검색은 Fumadocs 기본 테마를 유지한다. ② minimalist-ui는 CSS 변수로 표현 가능한 토큰 범위(캔버스 off-white, border 1px `#EAEAEA`, off-black 본문, radius 8px, 그림자 제거, 본문 폭)만 적용한다. ③ bento·serif hero·스크롤 애니메이션·Phosphor 아이콘·사진은 랜딩 페이지를 만들 때만 적용하고 지금은 보류한다. ④ 색 preset은 `shadcn.css`로 `apps/web` 토큰을 공유하거나 `neutral`/`vitepress` 중 선택한다.
- 미결 확인 필요: 한글 본문 폰트. Geist로는 한국어가 플랫폼별 시스템 폴백으로 떨어진다. 후보는 Pretendard Variable(`next/font/local`)과 Noto Sans KR이며, `next/font/google` 제공 여부와 한글 variable 폰트 용량은 아직 확인하지 않았다.
- `web-design-guidelines` 분류: 로컬 SKILL.md 확인 결과 파일을 지정해 Web Interface Guidelines와 대조하는 **검수 전용** skill이며 생성 지침이 아니다. `{Global}`의 "사용 skill" 목록과 성격이 달라 제거 대상이 아니라 검수 단계 skill로 분리해 적는 것을 제안한다.

### 2026-10-07 17:46 · UI 기준 승인과 랜딩 데모 요구, 알림 문구 이의

- @user 승인: minimalist-ui는 토큰 범위로 제한한다. 색은 Fumadocs 내장 preset을 쓰고 한글 본문 폰트는 Pretendard로 한다.
- 확인한 사실(폰트 패키지): `@fontsource/pretendard` 5.3.0은 존재하고 `@fontsource-variable/pretendard`는 npm에 없다. `apps/web`이 쓰는 방식은 `@fontsource-variable/geist`이므로 Pretendard는 static weight fontsource 또는 `next/font/local` 중 하나를 골라야 한다.
- @user 요구(랜딩): 랜딩 페이지에 모션·interactive 연출을 넣는다. 참고 대상은 "t3code 메인 페이지"이며 그보다 더 깔끔한 수준을 원한다. `aiox host` 실행과 a→b route에서 b가 완료되면 a에 daemon 알림이 뜨는 흐름을 동영상으로 보여 준다. W5·W6으로 추가했다.
- 확인한 사실(그 흐름은 구현되어 있다): `packages/domain/src/messaging/delivery.ts`의 `notifiesOrigin`은 notifiable이고 send 시점에 역방향 route가 없을 때 `completed`에 origin 알림을 낸다. 역방향 route가 있으면 완료 알림을 내지 않고, `failed`는 양방향 모두 알리며 `interrupted`·`rejected`는 알리지 않는다. 각 분기는 같은 디렉터리의 `delivery.test.ts`가 고정한다. 수신측 본문에는 `ONE_WAY_NOTICE`가 붙어 회신하지 말고 수행하라고 지시한다. Web은 `apps/web/src/entities/notification/model.ts`의 `findRuntimeTab`으로 알림에서 origin 실행 탭으로 이동한다.
- @agent 이의(카피): 실제 `notificationBody`가 내는 문구는 `[AIOX] {target} finished processing your request to {target} ("…"). No reply will arrive, because there is no outbound route back to you.`다. 같은 파일의 MCP 도구 설명은 "A send result reports the delivery attempt, not completion of the requested work."이고 `docs/product/product.md`의 Observable Outcomes는 모델 자기보고나 write 성공을 작업 성공으로 선언하지 않는다. 따라서 영상 자막을 "work success!"로 쓰면 제품이 보증하지 않는 주장을 공개 사이트에 싣는다. 알림이 보증하는 것은 처리 종료이며, 자막은 실제 알림 문구를 그대로 쓰는 것을 제안한다.
- 확인하지 않은 것: 지금 2-agent 흐름을 실제로 실행해 녹화할 수 있는 상태인지는 확인하지 않았다. Stage 6 Web 작업이 진행 중이므로 W6은 녹화 전 실제 실행 확인을 선행 조건으로 둔다.
- 제안(미승인, 랜딩 구성): hero + 실제 화면 데모 클립(muted autoplay loop, poster 포함) + 기능 3~4개 섹션(스크롤 페이드) + 설치 코드 블록. bento 사진·picsum·ambient gradient는 쓰지 않는다.
- 미결: "t3code 메인 페이지"의 정확한 대상 URL을 확인하지 못했다. 모션 수준 합의 전에 @user 확인이 필요하다.

### 2026-10-07 19:58 · 녹화 가능 확정, t3.codes 참조 분석과 모션 skill 후보

- @user 확정: 지금 녹화 가능한 상태다. 이에 따라 W6의 "녹화 전 실제 2-agent 실행 가능 여부 확인" 선행 조건을 제거했다.
- @user 요구(참조 수준): 참조 대상은 `https://t3.codes/`이며 똑같이 만들 필요는 없다. AIOX는 Claude Code·Codex 두 vendor뿐이고 @user는 개인 인디 개발자이므로 더 심플해야 한다.
- 확인한 사실(t3.codes 구성): nav에 harness 로고 6종과 GitHub 24k+ stars, hero는 "The open-source control plane for coding agents." 헤드라인과 "Download for macOS"·"Steal our code (legally)" CTA이며 **hero 미디어는 정적 스크린샷 1장이고 영상이 아니다**. 이어 "Tolerated by over 400,000 devs" 소셜 프루프와 X 후기 마키, 기능 3섹션(BYO subscription·Git/PR workflow·Open source)이 오고 각 섹션 시각물은 실제 녹화가 아니라 mock UI와 가짜 터미널 세션이다. 가격 섹션은 없다.
- @agent 판단(차용과 배제): 가져올 구조는 hero → 기능 섹션 → 닫는 CTA → footer다. 배제할 것은 소셜 프루프 마키(없는 수치는 비워 두면 오히려 약하다), harness 로고 행(vendor가 2개뿐), 모바일 앱 링크, 가격이다. 역으로 t3.codes가 mock으로 때운 자리에 AIOX는 실제 녹화를 넣을 수 있으므로 거기서 차별화한다.
- 확인한 사실(모션 skill 후보, `npx skills find "motion animation"`): `emilkowalski/skills` repo는 stars 44,012이고 2026-10-02에 갱신됐다. 생성용 `@animate`(123.2K installs, Gen Agent Trust Hub·Socket·Snyk 감사 통과)와 검수용 `@review-animations`(205.2K), 그 밖에 `@improve-animations`·`@find-animation-opportunities`·`@animate-expo`가 있다. `@animate`는 생성 전용이고 diff 비평은 `@review-animations`가 담당한다고 자체 설명에 명시돼 있다. `@animate`가 특정 애니메이션 라이브러리를 요구하는지는 페이지가 잘려 확인하지 못했다.
- 확인한 사실(배제 후보): `heygen-com/hyperframes@*`는 AI 영상 생성, `remotion-dev/skills@*`는 프로그래매틱 영상 제작이다. 실제 화면을 녹화하기로 했으므로 둘 다 현재 요구와 맞지 않는다. `vercel-labs/agent-skills@vercel-react-view-transitions`(144K)는 스크롤 페이드 수준에 과하다.
- 제안(미승인): ① `emilkowalski/skills@animate`와 `@review-animations`를 프로젝트 범위로 설치한다(기존 `skills-lock.json` 패턴). ② 랜딩은 hero·왜·협업 데모·설치·footer 5섹션으로 하고 모션은 IntersectionObserver 스크롤 진입 페이드만 쓴다. ③ 애니메이션 라이브러리는 추가하지 않는다. `fumadocs-ui`가 내부적으로 `motion`을 의존하지만 우리 코드에서 직접 import하지 않는다.

### 2026-10-07 20:06 · animate skill 설치와 apps/docs 스캐폴드 위임

- @user 결정: 모션 skill은 `@animate` 하나만 설치한다(`@review-animations`는 설치하지 않음). `apps/docs` 스캐폴드는 subagent에 위임한다. 랜딩 모션은 지금 구현하지 않고 임의 gradient 배경에 `AIOX` 문구만 임시로 넣는다.
- 확인한 사실(설치 결과): `emilkowalski/skills@animate`를 프로젝트 범위로 설치했다. `skills-lock.json`에 `skills/animate/SKILL.md` 항목이 추가되고 `.agents/skills/animate/`(SKILL.md 207줄 + RECIPES.md)와 `.claude/skills/animate` symlink가 생겼다. CLI가 보고한 보안 감사는 Gen Safe·Socket 0 alerts·Snyk Low Risk다.
- 확인한 사실(`@animate` 내용, 이전 entry의 "라이브러리 요구 여부 미확인"을 해소): 라이브러리를 강제하지 않는다. "Cheapest tool that works. Don't install a motion library for a fade."를 명시하고 hover·CSS-on-mount는 CSS, 예정된 모션은 CSS animation, springs·exit·gesture만 Motion(`motion.dev`)으로 올리는 단계 표를 둔다. 따라서 애니메이션 라이브러리를 추가하지 않는 기존 판단과 충돌하지 않는다.
- 확인한 사실(토큰 충돌): `@animate`는 강한 ease-out 토큰으로 `cubic-bezier(0.23, 1, 0.32, 1)`를 지정하고 "코드베이스에 토큰이 있으면 포크하지 말고 그것을 쓰라"고 요구한다. 반면 minimalist-ui §7은 `cubic-bezier(0.16, 1, 0.3, 1)`를 지정한다. 둘 다 강한 ease-out이지만 값이 다르므로 랜딩 모션을 구현할 때 한쪽을 토큰 정본으로 정해야 한다. 지금은 모션을 구현하지 않으므로 미결로 둔다.
- 확인한 사실(필수 요구 추가): `@animate`는 `prefers-reduced-motion` 대체 변형과 `@media (hover: hover) and (pointer: fine)` hover 게이팅을 후속이 아니라 최초 구현에 포함할 것을 요구하고, UI 지속시간 300ms 상한·`transition: all` 금지·`scale(0)` 금지를 자체 체크리스트로 둔다. W5 구현 기준에 포함한다.
- @agent 결정(위임 전 확정, 이전 entry의 미승인 제안 6개를 처리): ① Fumadocs 16 + Next 16 + Tailwind 4 채택, Nextra 미채택. ② 소스는 `apps/docs/src/` 아래에 두어 `@/* → ./src/*`를 지킨다. ③ slug는 영어, title·description은 한국어. ④ Layout Tabs 없이 단일 사이드바 + `meta.json` 구분선. ⑤ 색 preset은 `neutral`(`apps/web/components.json`의 baseColor가 neutral). ⑥ Pretendard는 `@fontsource/pretendard` 400/500/700으로 쓴다 — `apps/web`의 `@fontsource-variable/geist` 패턴을 따르고 `next/font/local`로 폰트 파일을 vendoring하지 않는다. ⑦ 1단계 6페이지 중 `index.mdx`·`aiox-yaml.mdx`만 내용을 쓰고 나머지 4개는 frontmatter + 플레이스홀더로 둔다.
- @agent 결정(변경): 이전 제안 ⑤의 "`/`는 `/docs`로 보낸다"는 철회했다. @user가 랜딩에 임시 gradient 플레이스홀더를 요구했으므로 `/`는 자체 페이지가 되고 `/docs`가 문서 루트다.
- @agent 판단(검색 설정): Fumadocs 공식 Next 설치 예제는 `createFromSource(source, { language: 'english' })`를 싣지만 한국어 사이트에서 영어 stemming을 켤 이유가 없고 기본 `multilingual` 모드가 Unicode word segmentation으로 한국어를 처리하므로 `language` 옵션 없이 쓰도록 지시했다.
- 위임 범위(subagent, 로그·commit·`docs/`·`apps/web`·`packages/**` 쓰기 금지): `apps/docs` 생성과 위 스펙 구현, 그리고 monorepo 정합 3건 — `.gitignore`에 루트 비고정 `.next/` 추가(현재 `/.next/`는 `apps/docs/.next`를 무시하지 못한다), `.oxlintrc.json`·`.oxfmtrc.json` `ignorePatterns`에 `.next/**` 추가. 검증은 `pnpm --filter @aiox/docs build`·`typecheck`·루트 `lint`·`format:check`·`git status` 5개를 실제 실행으로 요구했다.
- @agent 판단(빌드 예외): `apps/docs`의 `build`는 `next build`, `typecheck`는 `next typegen && tsc --noEmit`이다. AGENTS.md의 "빌드는 tsup"은 Next.js 앱에 적용할 수 없는 예외이며 `apps/web`이 이미 `vite build`로 같은 예외를 쓰고 있다.
- 미결(이 entry에서 해소하지 않음): gradient 플레이스홀더는 minimalist-ui §2의 gradient 금지와 정면으로 충돌한다. @user가 임시로 지시한 것이므로 그대로 구현하되 W5에서 실제 랜딩으로 대체할 때 제거 대상이다. 또 `@review-animations` 미설치로 모션 diff 검수 수단이 없으므로 W5 구현 시 재검토한다.

### 2026-10-07 20:23 · apps/docs 스캐폴드 완료 검증과 폰트 전달 방식 수정

- 확인한 사실(스캐폴드 완료): subagent가 `apps/docs`에 19개 파일을 만들고 루트 `.gitignore`·`.oxlintrc.json`·`.oxfmtrc.json`을 수정했다. 상위 agent가 독립 재실행으로 검증했다 — `next build` 성공(prerender-manifest 실측: `/`·`/docs`·`/docs/{installation,quickstart,concepts,aiox-yaml,cli}` 전부 생성), `typecheck`(`next typegen && tsc --noEmit`) 통과, 루트 `lint` error 0건, `format:check` 통과, 빌드 생성물 4종(`.next`·`.source`·`next-env.d.ts`·`tsconfig.tsbuildinfo`) 모두 `git check-ignore` ignored다.
- 확인한 사실(스펙과 다른 구현, 근거 타당): `defineDocs`는 `src/lib/source.ts`가 아니라 패키지 루트 `source.config.ts`에 있다. `fumadocs-mdx` 15.4.6이 config 경로를 `source.config.ts`로 고정하기 때문이다. 따라서 접점은 5개가 아니라 6개이고 `src/lib/source.ts`는 `loader({ baseUrl: "/docs" })`만 갖는다.
- 확인한 사실(예상하지 못한 생성물): `fumadocs-mdx`는 패키지 루트 `.source/`에 코드를 생성하고 이것이 `lint` error 1건·`format:check` 4건을 냈다. 세 루트 파일의 ignore 목록에 `.next/**`와 함께 `.source/**`를 넣어 해소했다. `.gitignore`에는 `.source/`를 추가했다.
- 확인한 사실(oxfmt는 `.mdx`를 포맷한다): 위임 지시에 "`.mdx`는 oxfmt 대상이 아니다"라고 적은 것은 틀렸다. oxfmt가 fenced code block 내부 YAML 인덴트와 markdown 표 정렬까지 건드려 `aiox-yaml.mdx`의 YAML이 2-space에서 4-space로 재인덴트됐다. subagent가 repo의 `yaml` 패키지로 양쪽을 파싱 비교해 의미 동일(`parsed-equal: true`, 인덴트 폭만 다름)을 확인했고 `docs/specs/aiox-host.md`의 YAML 예시도 4-space이므로 그대로 수용했다.
- 확인한 사실(`tsconfig.base.json` 플래그 유지): `strict`·`noUncheckedIndexedAccess`·`exactOptionalPropertyTypes`·`verbatimModuleSyntax`·`noEmitOnError` 전부 끄지 않고 통과한다. 추가한 것은 `skipLibCheck: true` 하나이고 `--skipLibCheck false` 실측 결과 error 8건 전부 의존성 `.d.ts`에서 나왔다(`next` 5건은 우리가 로드하지 않는 lib 타입, `fumadocs-mdx` 1건은 미설치 optional peer, `fumadocs-core` 1건은 상속된 `exactOptionalPropertyTypes` 때문에 `LLMsOptions`가 `StringifyOptions` 확장에 실패). 소스 error는 0건이고 사유는 `apps/docs/tsconfig.json` 주석에 있다.
- @agent 수정(폰트 결함, `{Global}` 결정 변경): `@fontsource/pretendard` 5.3.0은 `@font-face`에 `unicode-range`가 전혀 없고 `latin`이라는 파일명과 달리 완성형 한글 11,172자를 포함한 전체 폰트를 담는다(subagent의 fontTools cmap 실측, 상위 agent가 `grep unicode-range` 0건과 파일 크기로 재확인). weight 3개 = **2.23MB woff2가 조건 없이 다운로드**된다. 한국어가 렌더되기는 하지만 문서 사이트 성능 결함이다.
- @agent 수정(해소 방법): 공식 `pretendard` 1.3.9 npm 패키지로 교체했다. `dist/web/variable/pretendardvariable-dynamic-subset.css`는 variable 축(`font-weight: 45 920`) 하나로 모든 weight를 덮고 92개 `unicode-range` 파일로 분할돼 있다. 실측 — 이 사이트 콘텐츠의 distinct codepoint 413개는 92개 중 **14개 파일 357KB만 히트**한다(2.23MB → 357KB, 6.2배 감소). `--default-font-family`는 `"Pretendard Variable"`로 바꿨고 `build`·`typecheck`·`lint`·`format:check` 재실행 전부 통과했다. `{Global}`의 "`@fontsource/pretendard` 400/500/700" 결정은 이 측정으로 철회한다.
- @agent 수정(ignore 중복 제거): subagent가 추가한 비고정 `.next/`가 루트까지 덮으므로 기존 `/.next/` 한 줄은 죽은 패턴이 되어 삭제했다.
- 확인한 사실(폰트 변수 위치): `--font-sans`가 아니라 `--default-font-family`에 지정해야 한다. Fumadocs `preset.css`·`neutral.css`에는 body font-family 선언이 아예 없고 Tailwind 4 preflight가 `html`에 `--theme(--default-font-family, ...)`를 적용한다.
- 확인한 사실(런타임): production 서버 실측으로 `/docs`가 `<title>AIOX 소개 | AIOX 문서</title>`를 내고(title template 동작), `/api/search?query=설치`가 `/docs/installation`을 breadcrumbs `["Docs","시작하기"]`와 함께 반환한다. ZBSearch 기본 multilingual 모드로 한국어 검색과 `meta.json` 구분선이 모두 동작함을 확인했다.
- 확인한 사실(콘텐츠): `index.mdx`는 `docs/product/product.md`(Status: Current)와 `docs/aiox-tui-product.md`(Status: Target)의 상태 차이를 반영해 macOS·Linux·Windows를 "지원 목표", WSL을 "네이티브와 구분해 검증"으로 적고 완료 기능으로 서술하지 않는다. 마지막 단락은 "보냈다/도착했다/작업이 성공했다"를 구분하고 소켓 쓰기 성공이나 모델 자기보고를 작업 성공으로 표시하지 않는다고 밝혀, 2026-10-07 17:46 entry의 알림 문구 이의와 정합한다. `aiox-yaml.mdx` 스키마는 `packages/config/src/host.ts`의 `parseHostManifest`와 `packages/protocol/src/configuration.ts`의 `parseHostLayout` 구현에서 확인했다.
- 미결(W5로 넘김): 임시 랜딩 `src/app/page.tsx`는 minimalist-ui가 금지하는 요소 둘을 쓴다 — gradient 배경(§2)과 `rounded-full` 버튼(§2). 또 `hover:bg-white/90`가 `@animate`가 요구하는 `@media (hover: hover) and (pointer: fine)` 게이팅 없이 걸려 있다(색 전환이라 모션 위험은 낮다). 모두 @user의 임시 지시 범위이며 W5에서 실제 랜딩으로 교체할 때 제거한다.
- 남은 작업: `installation`·`quickstart`·`concepts`·`cli` 4페이지는 frontmatter와 한 줄 플레이스홀더만 있다(W2). sitemap·robots(W3), 배포 설정(W4), i18n, `test` 스크립트는 추가하지 않았다.
