# MySocialDesktop

A private, session-based desktop social application for Windows. Inspired by the aesthetics and real-time communication style of MSN Messenger and Discord, rebuilt as a native Windows application.

---

## Technology Stack

![C++](https://img.shields.io/badge/C++17-00599C?style=for-the-badge&logo=cplusplus&logoColor=white)
![CMake](https://img.shields.io/badge/CMake-064F8C?style=for-the-badge&logo=cmake&logoColor=white)
![WebView2](https://img.shields.io/badge/WebView2-0078D4?style=for-the-badge&logo=microsoft-edge&logoColor=white)
![Astro](https://img.shields.io/badge/Astro-BC52EE?style=for-the-badge&logo=astro&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![WebRTC](https://img.shields.io/badge/WebRTC-333333?style=for-the-badge&logo=webrtc&logoColor=white)
![PeerJS](https://img.shields.io/badge/PeerJS-F26B00?style=for-the-badge&logo=peerjs&logoColor=white)
![Zustand](https://img.shields.io/badge/Zustand-443E38?style=for-the-badge&logo=react&logoColor=white)
![NodeJS](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)
![Windows](https://img.shields.io/badge/Windows-0078D6?style=for-the-badge&logo=windows&logoColor=white)

---

## Features

- Session-based user rooms with unique room codes
- Real-time peer-to-peer text chat
- Voice and video calls via WebRTC (PeerJS)
- Discord-style call overlay with controls: Mute, Camera, Screen Share, Hang Up
- Nudge / vibration animation with retro sound effects
- System tray integration with minimize-to-tray support
- Multi-resolution application icon (taskbar and window)
- Lightweight native shell — no bundled browser engine

---

## Architecture

The application uses a **C++ Win32 shell** with an embedded **WebView2** control. This gives the performance and integration of a native Windows application while rendering the UI with modern web technologies. There is no Electron or Chromium bundled — WebView2 uses the Microsoft Edge engine already present on the system.

```
MySocialDesktop/
├── src/                    # C++ native shell
│   ├── main.cpp            # Entry point (WinMain)
│   ├── AppWindow.cpp       # Window creation, WebView2 setup, tray icon
│   └── AppWindow.h         # AppWindow class declaration
├── ui-src/                 # Web UI (Astro + React + Tailwind)
│   ├── src/
│   │   ├── components/     # React components (Chat, Sidebar, CallModal, etc.)
│   │   ├── layouts/        # Astro page layout
│   │   ├── lib/            # WebRTC, PeerJS, state management (Zustand)
│   │   ├── styles/         # Global CSS
│   │   └── pages/          # Astro pages
│   ├── public/             # Static assets (icons, backgrounds, sounds)
│   ├── astro.config.mjs    # Astro configuration (output to ../build/www)
│   └── package.json
├── res/                    # Application icon resource
│   └── app.ico
├── app.rc                  # Windows resource file (icon embedding)
└── CMakeLists.txt          # Build configuration
```

---

## Requirements

### Runtime
- Windows 10 or later (WebView2 runtime is included in Windows 11 and updated Windows 10 builds)
- If WebView2 is not present, it will be downloaded automatically on first run

### Build Dependencies
- Visual Studio 2022 (with C++ Desktop Development workload)
- CMake 3.15 or later
- Node.js 22 or later
- Git

---

## Building from Source

### 1. Build the Web UI

```bash
cd ui-src
npm install
npm run build
```

This outputs the compiled web assets to `build/www/`.

### 2. Configure the C++ project

```bash
cmake -S . -B build_cpp -G "Visual Studio 17 2022" -A x64
```

### 3. Build the executable

```bash
cmake --build build_cpp --config Release
```

The output is at `build_cpp/Release/MySocialDesktop.exe`.

---

## Running the Application

You can use the prebuilt release package. Extract it and run `MySocialDesktop.exe` directly — no installation required.

The executable expects the web assets to be at `../../build/www/` relative to itself (matching the source tree). If running from the release zip, the included folder structure handles this automatically.

---

## License

This software is not commercial. It is a personal project under the **vamp9** brand.

All rights reserved. No part of this software may be reproduced, distributed, or used in commercial products without explicit written permission from the author.

---

## Author

**vamp9**  
[github.com/lordvamp9](https://github.com/lordvamp9)
