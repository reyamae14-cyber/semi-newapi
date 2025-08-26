export interface Theme {
  id: string
  name: string
  colors: {
    primary: string
    secondary: string
    accent: string
    background: string
    text: string
  }
  gradient?: string
}

export const themes: Theme[] = [
  {
    id: "hexa-fire",
    name: "Hexa Fire",
    colors: {
      primary: "#FF6B35",
      secondary: "#FF8E53",
      accent: "#FFB366",
      background: "#1A1A1A",
      text: "#FFFFFF",
    },
    gradient: "linear-gradient(135deg, #FF6B35 0%, #FF8E53 100%)",
  },
  {
    id: "netflix",
    name: "Netflix",
    colors: {
      primary: "#E50914",
      secondary: "#B81D24",
      accent: "#F40612",
      background: "#141414",
      text: "#FFFFFF",
    },
    gradient: "linear-gradient(135deg, #E50914 0%, #B81D24 100%)",
  },
  {
    id: "discord",
    name: "Discord",
    colors: {
      primary: "#5865F2",
      secondary: "#4752C4",
      accent: "#7289DA",
      background: "#2C2F33",
      text: "#FFFFFF",
    },
    gradient: "linear-gradient(135deg, #5865F2 0%, #4752C4 100%)",
  },
  {
    id: "github",
    name: "GitHub",
    colors: {
      primary: "#0969DA",
      secondary: "#0550AE",
      accent: "#218BFF",
      background: "#0D1117",
      text: "#FFFFFF",
    },
    gradient: "linear-gradient(135deg, #0969DA 0%, #0550AE 100%)",
  },
  {
    id: "spotify",
    name: "Spotify",
    colors: {
      primary: "#1DB954",
      secondary: "#1ED760",
      accent: "#1AAE47",
      background: "#191414",
      text: "#FFFFFF",
    },
    gradient: "linear-gradient(135deg, #1DB954 0%, #1ED760 100%)",
  },
  {
    id: "terminal",
    name: "Terminal",
    colors: {
      primary: "#00FF41",
      secondary: "#00D936",
      accent: "#39FF14",
      background: "#0C0C0C",
      text: "#00FF41",
    },
    gradient: "linear-gradient(135deg, #00FF41 0%, #00D936 100%)",
  },
  {
    id: "dracula",
    name: "Dracula",
    colors: {
      primary: "#FF79C6",
      secondary: "#BD93F9",
      accent: "#F8F8F2",
      background: "#282A36",
      text: "#F8F8F2",
    },
    gradient: "linear-gradient(135deg, #FF79C6 0%, #BD93F9 100%)",
  },
  {
    id: "cyberpunk",
    name: "Cyberpunk",
    colors: {
      primary: "#00FFFF",
      secondary: "#FF00FF",
      accent: "#FFFF00",
      background: "#0A0A0A",
      text: "#00FFFF",
    },
    gradient: "linear-gradient(135deg, #00FFFF 0%, #FF00FF 100%)",
  },
]

class ThemeManager {
  private currentTheme: Theme = themes.find(t => t.id === "netflix") || themes[0]
  private listeners: ((theme: Theme) => void)[] = []

  constructor() {
    if (typeof window !== "undefined") {
      const savedTheme = localStorage.getItem("video-player-theme")
      if (savedTheme) {
        const theme = themes.find((t) => t.id === savedTheme)
        if (theme) {
          this.currentTheme = theme
        }
      } else {
        // Set Netflix as default if no saved theme
        this.currentTheme = themes.find(t => t.id === "netflix") || themes[0]
      }
    }
  }

  getCurrentTheme(): Theme {
    return this.currentTheme
  }

  setTheme(themeId: string) {
    const theme = themes.find((t) => t.id === themeId)
    if (theme) {
      this.currentTheme = theme
      if (typeof window !== "undefined") {
        localStorage.setItem("video-player-theme", themeId)
      }
      this.notifyListeners()
    }
  }

  subscribe(callback: (theme: Theme) => void) {
    this.listeners.push(callback)
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback)
    }
  }

  private notifyListeners() {
    this.listeners.forEach((listener) => listener(this.currentTheme))
  }

  applyThemeToElement(element: HTMLElement, theme?: Theme) {
    const activeTheme = theme || this.currentTheme
    element.style.setProperty("--theme-primary", activeTheme.colors.primary)
    element.style.setProperty("--theme-secondary", activeTheme.colors.secondary)
    element.style.setProperty("--theme-accent", activeTheme.colors.accent)
    element.style.setProperty("--theme-background", activeTheme.colors.background)
    element.style.setProperty("--theme-text", activeTheme.colors.text)
    if (activeTheme.gradient) {
      element.style.setProperty("--theme-gradient", activeTheme.gradient)
    }
  }

  applyThemeToVideoPlayer(iframe: HTMLIFrameElement, theme?: Theme) {
    const activeTheme = theme || this.currentTheme

    // Remove borders and apply clean styling
    iframe.style.border = "none"
    iframe.style.borderRadius = "8px"
    iframe.style.boxShadow = "none"

    // Inject CSS into iframe for comprehensive theming
    try {
      const cssRules = `
        <style id="custom-player-theme">
          /* Video player controls theming */
          .video-js .vjs-control-bar,
          .plyr__controls,
          .jwplayer .jw-controlbar,
          .flowplayer .fp-controls,
          [class*="control"],
          [class*="player-control"] {
            background: linear-gradient(180deg, transparent 0%, ${activeTheme.colors.background}dd 100%) !important;
            border-top: 1px solid ${activeTheme.colors.primary}44 !important;
          }
          
          /* Progress bars and sliders */
          .video-js .vjs-progress-control .vjs-progress-holder,
          .plyr__progress,
          .jwplayer .jw-slider-horizontal,
          .flowplayer .fp-timeline,
          [class*="progress"],
          [class*="slider"],
          [class*="seek"] {
            background: ${activeTheme.colors.background}66 !important;
          }
          
          .video-js .vjs-play-progress,
          .plyr__progress__played,
          .jwplayer .jw-progress,
          .flowplayer .fp-progress,
          [class*="progress-played"],
          [class*="progress-fill"] {
            background: ${activeTheme.gradient || activeTheme.colors.primary} !important;
          }
          
          /* Volume controls */
          .video-js .vjs-volume-level,
          .plyr__volume--display,
          .jwplayer .jw-slider-horizontal .jw-progress,
          [class*="volume-fill"] {
            background: ${activeTheme.colors.primary} !important;
          }
          
          /* Buttons and icons */
          .video-js .vjs-button,
          .plyr__control,
          .jwplayer .jw-icon,
          .flowplayer .fp-icon,
          [class*="control-button"],
          [class*="player-button"] {
            color: ${activeTheme.colors.text} !important;
            fill: ${activeTheme.colors.text} !important;
          }
          
          .video-js .vjs-button:hover,
          .plyr__control:hover,
          .jwplayer .jw-icon:hover,
          [class*="control-button"]:hover {
            color: ${activeTheme.colors.primary} !important;
            fill: ${activeTheme.colors.primary} !important;
          }
          
          /* Time displays */
          .video-js .vjs-time-control,
          .plyr__time,
          .jwplayer .jw-text,
          [class*="time-display"] {
            color: ${activeTheme.colors.text} !important;
            font-weight: 500 !important;
          }
          
          /* Settings menu */
          .video-js .vjs-menu,
          .plyr__menu,
          .jwplayer .jw-rightclick,
          [class*="settings-menu"],
          [class*="context-menu"] {
            background: ${activeTheme.colors.background}ee !important;
            border: 1px solid ${activeTheme.colors.primary}44 !important;
            backdrop-filter: blur(10px) !important;
          }
          
          .video-js .vjs-menu-item,
          .plyr__menu__item,
          [class*="menu-item"] {
            color: ${activeTheme.colors.text} !important;
          }
          
          .video-js .vjs-menu-item:hover,
          .plyr__menu__item:hover,
          [class*="menu-item"]:hover {
            background: ${activeTheme.colors.primary}22 !important;
            color: ${activeTheme.colors.primary} !important;
          }
          
          /* Loading spinner */
          .video-js .vjs-loading-spinner,
          .plyr__progress__ring,
          [class*="loading"],
          [class*="spinner"] {
            border-color: ${activeTheme.colors.primary} transparent ${activeTheme.colors.primary} transparent !important;
          }
          
          /* Subtitles/captions */
          .video-js .vjs-text-track-display,
          .plyr__captions,
          [class*="subtitle"],
          [class*="caption"] {
            color: ${activeTheme.colors.text} !important;
            text-shadow: 2px 2px 4px ${activeTheme.colors.background}aa !important;
          }
          
          /* Quality selector */
          [class*="quality"],
          [class*="resolution"] {
            background: ${activeTheme.colors.background}dd !important;
            border: 1px solid ${activeTheme.colors.primary}44 !important;
            color: ${activeTheme.colors.text} !important;
          }
          
          /* Fullscreen button special styling */
          [class*="fullscreen"] {
            color: ${activeTheme.colors.primary} !important;
          }
          
          /* Hide next/previous navigation elements */
          [class*="next"],
          [class*="prev"],
          [class*="skip"],
          [class*="forward"],
          [class*="backward"],
          .video-js .vjs-next-item,
          .video-js .vjs-prev-item,
          .plyr__control--forward,
          .plyr__control--rewind,
          .jwplayer .jw-icon-next,
          .jwplayer .jw-icon-prev,
          [data-plyr="fast-forward"],
          [data-plyr="rewind"],
          [aria-label*="next"],
          [aria-label*="previous"],
          [aria-label*="skip"],
          [title*="next"],
          [title*="previous"],
          [title*="skip"] {
            display: none !important;
            visibility: hidden !important;
            opacity: 0 !important;
          }
        </style>
      `

      // Create a blob URL for the CSS
      const blob = new Blob([cssRules], { type: "text/css" })
      const cssUrl = URL.createObjectURL(blob)

      // Store the CSS URL for potential cleanup
      iframe.setAttribute("data-theme-css", cssUrl)
    } catch (error) {
      console.log("[v0] Advanced iframe theming limited by CORS policy")
    }
  }
}

export const themeManager = new ThemeManager()
