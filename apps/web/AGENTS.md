모든것을 구현할 때 tdd를 하지말것

UI처리를 할 때는 구조만 잡을것

구조 → 보고 → 논의 → 스타일 순서로 간다. 승인을 받고 스타일 단계로 넘어간다.

## 구조 단계

네 가지를 확정해서 보고하고 멈춘다.

- composition — 어떤 primitive가 무엇을 감싸고, 실제 어떤 DOM 태그로 렌더되는지
- 상태 — 어디에 사는지 (uncontrolled primitive / local state / URL / 부모 props)
- 경계 — 받는 props와 올려보내는 콜백
- 이벤트 — 클릭·우클릭·키보드가 각각 무엇을 하는지

className은 레이아웃이 성립하는 최소만 쓴다. 색·간격·타이포·애니메이션은 스타일 단계에 올린다.

```
나쁜 예 — 구조 단계에 스타일이 섞임
<Sidebar className="w-60 border-r bg-sidebar px-2 py-1.5">

좋은 예 — 구조만
<Sidebar>
```

### 보고 예시 — sidebar

```
Sidebar
└ SidebarContent
  └ SidebarGroup → SidebarMenu (ul)
    └ Collapsible → SidebarMenuItem (li, section마다 uncontrolled)
      ├ CollapsibleTrigger → SidebarMenuButton → Link
      │                                      click: /:section 이동·접힘 전환
      ├ SidebarMenuAction                    click: onCreate(section)
      └ CollapsibleContent
        └ SidebarMenuSub (ul)
          └ SidebarMenuSubItem (li)
            └ ContextMenu (kind === workspace일 때만 활성)
              └ ContextMenuTrigger (div)
                └ SidebarMenuSubButton → Link
                                             click: panelPath(panel)
                                             우클릭: Rename / Delete
```

props: `panels`, `onCreate`, `onRename`, `onDelete`, `sidebarWidth`, `onResizeSidebar`
패널 active 판정: URL의 `section === panel.section && panelId === panel.id`.
경로는 `src/app/router.tsx`, 패널 링크는 `panelPath(panel)`을 따른다.
섹션·항목 렌더링은 `AppSidebar` 내부에 유지한다.

여기까지 보고하고 멈춘다. `ul > div > li` 같은 잘못된 중첩, 남아도는 state, 빈 콜백은 이 트리에서 드러난다. 스타일을 입힌 뒤에 찾으면 되돌리는 비용이 커진다.

## 스타일 단계

확정된 구조 위에만 올린다. 구조를 바꿔야 하면 구조 단계로 돌아가 다시 보고한다.

## 브라우저

브라우저 사용할 때 agent-browser를 사용할 것

## 검증

포맷과 lint는 루트 설정이 소유한다. `apps/web`에 자체 prettier·oxfmt 설정을 두지 않는다.
편집 뒤에는 루트에서 돌린다. 에디터 기본값(2-space)으로 저장하면 `format:check`가 깨진다.

```sh
cd ../.. && pnpm format && pnpm format:check
```

`typecheck`와 `test`는 `apps/web`에서 바로 돌아간다. `lint`·`format`·`build` 전체는 루트에만 있다.
