"use client";

import { useTheme } from "next-themes";
import { Toaster } from "sonner";

/**
 * Centered toasts with glass-style cards. Uses Sonner `top-center` so
 * notifications align with the main chat column visually.
 */
export function AppToaster() {
  const { resolvedTheme } = useTheme();
  const sonnerTheme =
    resolvedTheme === "dark"
      ? "dark"
      : resolvedTheme === "light"
        ? "light"
        : "system";

  return (
    <Toaster
      theme={sonnerTheme}
      position="top-center"
      richColors
      closeButton
      expand={false}
      gap={10}
      offset={16}
      mobileOffset={{ top: "calc(0.75rem + env(safe-area-inset-top))" }}
      visibleToasts={5}
      toastOptions={{
        duration: 4200,
        classNames: {
          toast:
            "group toast !w-[min(calc(100vw-2rem-env(safe-area-inset-left)-env(safe-area-inset-right)),22rem)] !rounded-xl !border !border-border/70 !bg-background/90 !py-3 !pl-4 !pr-10 !shadow-lg !backdrop-blur-xl supports-[backdrop-filter]:!bg-background/75 dark:!border-border/60",
          title: "!text-sm !font-semibold !leading-snug !pr-0 !text-foreground",
          description:
            "!text-sm !leading-relaxed !text-muted-foreground !mt-0.5 !pr-0",
          actionButton:
            "!ml-2 !shrink-0 !rounded-lg !bg-primary !px-3 !py-1.5 !text-sm !font-medium !text-primary-foreground !transition-opacity hover:!opacity-90",
          cancelButton: "!rounded-lg !text-sm",
          closeButton:
            "!flex !h-8 !w-8 !items-center !justify-center !border-0 !bg-transparent !p-0 !text-muted-foreground !opacity-90 !transition-opacity hover:!bg-muted/80 hover:!opacity-100 [&_svg]:!block [&_svg]:!shrink-0",
          success: "!border-emerald-500/20 dark:!border-emerald-400/25",
          error: "!border-destructive/35",
          warning: "!border-amber-500/25",
          info: "!border-sky-500/25",
        },
      }}
      className="!left-1/2 !right-auto !w-auto !max-w-none !-translate-x-1/2 !px-[max(0.75rem,env(safe-area-inset-left))] sm:!px-4"
    />
  );
}
