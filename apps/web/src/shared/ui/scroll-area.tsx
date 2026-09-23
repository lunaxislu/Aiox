import { ScrollArea as ScrollAreaPrimitive } from "@base-ui/react/scroll-area";

// Compose without Scrollbar when the viewport should hide its scrollbars.
export const ScrollArea = ScrollAreaPrimitive.Root;
export const ScrollAreaViewport = ScrollAreaPrimitive.Viewport;
export const ScrollAreaContent = ScrollAreaPrimitive.Content;

export const ScrollAreaScrollbar = ScrollAreaPrimitive.Scrollbar;
export const ScrollAreaThumb = ScrollAreaPrimitive.Thumb;
