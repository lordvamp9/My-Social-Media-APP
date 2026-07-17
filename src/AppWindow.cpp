#include "AppWindow.h"
#include <shellapi.h>
#include <filesystem>
#include <iostream>
#include <fstream>
#include <chrono>

#pragma comment(lib, "shell32.lib")

#include <shlobj.h>
#pragma comment(lib, "ole32.lib")
#define WM_TRAYICON (WM_USER + 1)
#define IDI_APPICON 101

void LogMessage(const std::wstring& message) {
    std::wofstream logFile("debug.log", std::ios::app);
    if (logFile.is_open()) {
        logFile << message << std::endl;
    }
}

AppWindow::AppWindow(HINSTANCE hInstance)
    : m_hInstance(hInstance), m_hWnd(nullptr)
{
}

AppWindow::~AppWindow()
{
    RemoveTrayIcon();
}

bool AppWindow::Initialize(int nCmdShow)
{
    LogMessage(L"Initializing AppWindow...");
    const wchar_t CLASS_NAME[] = L"MySocialDesktopWindowClass";

    // Use default Windows application icon to bypass IconCache issues that cause the "M" to get stuck
    HICON hIconBig = LoadIcon(NULL, IDI_APPLICATION);
    HICON hIconSmall = LoadIcon(NULL, IDI_APPLICATION);

    WNDCLASSEXW wc = { };
    wc.cbSize        = sizeof(WNDCLASSEXW);
    wc.lpfnWndProc   = AppWindow::WndProc;
    wc.hInstance     = m_hInstance;
    wc.lpszClassName = CLASS_NAME;
    wc.hCursor       = LoadCursor(NULL, IDC_ARROW);
    wc.hbrBackground = (HBRUSH)(COLOR_WINDOW + 1);
    wc.hIcon         = hIconBig;
    wc.hIconSm       = hIconSmall;

    RegisterClassExW(&wc);

    // Create a standard window
    m_hWnd = CreateWindowExW(
        0, CLASS_NAME, L"MySocialDesktop",
        WS_OVERLAPPEDWINDOW,
        CW_USEDEFAULT, CW_USEDEFAULT, 1280, 800,
        NULL, NULL, m_hInstance, this
    );

    if (m_hWnd == nullptr)
    {
        LogMessage(L"CreateWindowExW failed!");
        return false;
    }

    SendMessage(m_hWnd, WM_SETICON, ICON_BIG, (LPARAM)hIconBig);
    SendMessage(m_hWnd, WM_SETICON, ICON_SMALL, (LPARAM)hIconSmall);

    SetupTrayIcon(m_hWnd);
    
    // CRITICAL: Window MUST be visible before initializing WebView2 to prevent HRESULT -2147019873 (ERROR_INVALID_STATE)
    ShowWindow(m_hWnd, nCmdShow);
    UpdateWindow(m_hWnd);

    InitializeWebView();

    LogMessage(L"AppWindow initialized successfully.");
    return true;
}

void AppWindow::SetupTrayIcon(HWND hWnd)
{
    ZeroMemory(&m_nid, sizeof(NOTIFYICONDATAW));
    m_nid.cbSize = sizeof(NOTIFYICONDATAW);
    m_nid.hWnd = hWnd;
    m_nid.uID = 1;
    m_nid.uFlags = NIF_ICON | NIF_MESSAGE | NIF_TIP;
    m_nid.uCallbackMessage = WM_TRAYICON;
    m_nid.hIcon = LoadIcon(NULL, IDI_APPLICATION);
    wcscpy_s(m_nid.szTip, L"MySocialDesktop");

    Shell_NotifyIconW(NIM_ADD, &m_nid);
}

void AppWindow::RemoveTrayIcon()
{
    Shell_NotifyIconW(NIM_DELETE, &m_nid);
}

void AppWindow::InitializeWebView()
{
    LogMessage(L"InitializeWebView started.");

    // Determine User Data Folder in LocalAppData
    std::wstring userDataFolder = L"";
    PWSTR path = NULL;
    if (SUCCEEDED(SHGetKnownFolderPath(FOLDERID_LocalAppData, 0, NULL, &path))) {
        userDataFolder = path;
        CoTaskMemFree(path);
        userDataFolder += L"\\MySocialDesktop_v2";
        LogMessage(L"User data folder: " + userDataFolder);
    } else {
        LogMessage(L"Failed to get LocalAppData folder, fallback to default.");
    }

    // Step 1: Create Environment
    HRESULT hr = CreateCoreWebView2EnvironmentWithOptions(nullptr, userDataFolder.empty() ? nullptr : userDataFolder.c_str(), nullptr,
        Callback<ICoreWebView2CreateCoreWebView2EnvironmentCompletedHandler>(
            [this](HRESULT result, ICoreWebView2Environment* env) -> HRESULT {
                LogMessage(L"CreateCoreWebView2EnvironmentCompletedHandler invoked. Result: " + std::to_wstring(result));
                if (FAILED(result) || !env) {
                    LogMessage(L"Failed to create WebView2 Environment. HRESULT: " + std::to_wstring(result));
                    MessageBoxW(m_hWnd, (L"Failed to create WebView2 Environment. HRESULT: " + std::to_wstring(result) + L"\n\nPor favor, asegúrate de haber extraído todos los archivos del .zip en una carpeta antes de abrir la aplicación.").c_str(), L"Error", MB_ICONERROR);
                    return result;
                }
                m_webViewEnvironment = env;
                
                // Step 2: Create Controller
                LogMessage(L"Creating WebView2 Controller...");
                HRESULT hrController = env->CreateCoreWebView2Controller(m_hWnd,
                    Callback<ICoreWebView2CreateCoreWebView2ControllerCompletedHandler>(
                        [this](HRESULT result, ICoreWebView2Controller* controller) -> HRESULT {
                            LogMessage(L"CreateCoreWebView2ControllerCompletedHandler invoked. Result: " + std::to_wstring(result));
                            if (FAILED(result) || !controller) {
                                LogMessage(L"Failed to create WebView2 Controller. HRESULT: " + std::to_wstring(result));
                                MessageBoxW(m_hWnd, (L"Failed to create WebView2 Controller. HRESULT: " + std::to_wstring(result) + L"\n\nEsto suele ocurrir si hay una versión anterior de la app corriendo en segundo plano. Ve a la bandeja del sistema (junto al reloj) y cierra el icono viejo.").c_str(), L"Error", MB_ICONERROR);
                                return result;
                            }
                            m_webViewController = controller;
                            m_webViewController->get_CoreWebView2(&m_webView);

                            if (!m_webView) {
                                LogMessage(L"m_webView is null!");
                                MessageBoxW(m_hWnd, L"m_webView is null!", L"Error", MB_ICONERROR);
                                return E_FAIL;
                            }

                            LogMessage(L"WebView2 Controller created. Setting up bounds and host mapping...");
                            // Resize WebView to fit the bounds of the parent window
                            ResizeWebView();

                            // Add Virtual Host Mapping for local files
                            wchar_t exePath[MAX_PATH];
                            GetModuleFileNameW(NULL, exePath, MAX_PATH);
                            std::filesystem::path appDir = std::filesystem::path(exePath).parent_path();
                            
                            std::filesystem::path wwwDir;
                            if (std::filesystem::exists(appDir / "www")) {
                                wwwDir = appDir / "www"; // When running from extracted zip
                            } else if (std::filesystem::exists(appDir / "build" / "www")) {
                                wwwDir = appDir / "build" / "www"; // Local dev
                            } else if (std::filesystem::exists(appDir.parent_path() / "build" / "www")) {
                                wwwDir = appDir.parent_path() / "build" / "www";
                            } else if (std::filesystem::exists(appDir.parent_path().parent_path() / "build" / "www")) {
                                wwwDir = appDir.parent_path().parent_path() / "build" / "www";
                            } else {
                                wwwDir = appDir / "www";
                            }
                            LogMessage(L"Mapped wwwDir: " + wwwDir.wstring());

                            ComPtr<ICoreWebView2_3> webView3;
                            HRESULT hrAs = m_webView.As(&webView3);
                            if (SUCCEEDED(hrAs) && webView3) {
                                LogMessage(L"Setting up Virtual Host Name mapping to folder...");
                                HRESULT hrMap = webView3->SetVirtualHostNameToFolderMapping(
                                    L"vamp9.local", 
                                    wwwDir.c_str(), 
                                    COREWEBVIEW2_HOST_RESOURCE_ACCESS_KIND_ALLOW
                                );
                                LogMessage(L"Virtual Host mapping result: " + std::to_wstring(hrMap));
                            } else {
                                LogMessage(L"Failed to get ICoreWebView2_3 interface.");
                                MessageBoxW(m_hWnd, L"Failed to get ICoreWebView2_3 interface.", L"Error", MB_ICONERROR);
                            }

                            // Auto-grant permissions for everything (camera/microphone/screen capture)
                            EventRegistrationToken permissionToken;
                            m_webView->add_PermissionRequested(
                                Callback<ICoreWebView2PermissionRequestedEventHandler>(
                                    [this](ICoreWebView2* sender, ICoreWebView2PermissionRequestedEventArgs* args) -> HRESULT {
                                        args->put_State(COREWEBVIEW2_PERMISSION_STATE_ALLOW);
                                        return S_OK;
                                    }).Get(), &permissionToken);

                            // Navigate to our local app
                            LogMessage(L"Navigating to local site...");
                            m_webView->Navigate(L"https://vamp9.local/index.html");

                            // Setup message passing from JS to C++ (e.g. for native notifications)
                            m_webView->add_WebMessageReceived(
                                Callback<ICoreWebView2WebMessageReceivedEventHandler>(
                                    [this](ICoreWebView2* sender, ICoreWebView2WebMessageReceivedEventArgs* args) -> HRESULT {
                                        PWSTR message;
                                        args->TryGetWebMessageAsString(&message);
                                        std::wstring msgStr(message);
                                        LogMessage(L"Message received from Web: " + msgStr);
                                        
                                        if (msgStr == L"nudge") {
                                            // Shake the native window!
                                            RECT rect;
                                            GetWindowRect(m_hWnd, &rect);
                                            int originalX = rect.left;
                                            int originalY = rect.top;
                                            int width = rect.right - rect.left;
                                            int height = rect.bottom - rect.top;
                                            
                                            const int offsets[][2] = {
                                                { 10, 0 }, { -10, 0 }, { 0, 10 }, { 0, -10 },
                                                { 8, -8 }, { -8, 8 }, { 5, 5 }, { -5, -5 },
                                                { 3, 0 }, { -3, 0 }, { 0, 3 }, { 0, -3 }
                                            };
                                            
                                            for (auto offset : offsets) {
                                                SetWindowPos(m_hWnd, NULL, originalX + offset[0], originalY + offset[1], width, height, SWP_NOZORDER | SWP_NOACTIVATE);
                                                Sleep(25);
                                            }
                                            
                                            // Restore original position
                                            SetWindowPos(m_hWnd, NULL, originalX, originalY, width, height, SWP_NOZORDER | SWP_NOACTIVATE);
                                        } else {
                                            // Handle other messages like showing toast notifications here
                                            MessageBoxW(m_hWnd, message, L"Notificación de JS", MB_OK);
                                        }
                                        
                                        CoTaskMemFree(message);
                                        return S_OK;
                                    }).Get(), nullptr);

                            return S_OK;
                        }).Get());

                if (FAILED(hrController)) {
                    LogMessage(L"env->CreateCoreWebView2Controller failed. HRESULT: " + std::to_wstring(hrController));
                    MessageBoxW(m_hWnd, (L"env->CreateCoreWebView2Controller failed. HRESULT: " + std::to_wstring(hrController)).c_str(), L"Error", MB_ICONERROR);
                }
                return S_OK;
            }).Get());

    if (FAILED(hr)) {
        LogMessage(L"CreateCoreWebView2EnvironmentWithOptions failed. HRESULT: " + std::to_wstring(hr));
        MessageBoxW(m_hWnd, (L"CreateCoreWebView2EnvironmentWithOptions failed. HRESULT: " + std::to_wstring(hr)).c_str(), L"Error", MB_ICONERROR);
    }
}

void AppWindow::ResizeWebView()
{
    if (m_webViewController != nullptr) {
        RECT bounds;
        GetClientRect(m_hWnd, &bounds);
        m_webViewController->put_Bounds(bounds);
    }
}

LRESULT CALLBACK AppWindow::WndProc(HWND hWnd, UINT message, WPARAM wParam, LPARAM lParam)
{
    AppWindow* pThis = nullptr;

    if (message == WM_NCCREATE)
    {
        CREATESTRUCT* pCreate = (CREATESTRUCT*)lParam;
        pThis = (AppWindow*)pCreate->lpCreateParams;
        SetWindowLongPtr(hWnd, GWLP_USERDATA, (LONG_PTR)pThis);
    }
    else
    {
        pThis = (AppWindow*)GetWindowLongPtr(hWnd, GWLP_USERDATA);
    }

    if (pThis)
    {
        return pThis->HandleMessage(hWnd, message, wParam, lParam);
    }

    return DefWindowProcW(hWnd, message, wParam, lParam);
}

LRESULT AppWindow::HandleMessage(HWND hWnd, UINT message, WPARAM wParam, LPARAM lParam)
{
    switch (message)
    {
    case WM_SIZE:
        ResizeWebView();
        break;
    case WM_CLOSE:
        // Minimize to tray instead of closing
        ShowWindow(hWnd, SW_HIDE);
        return 0;
    case WM_TRAYICON:
        if (lParam == WM_LBUTTONDBLCLK) {
            ShowWindow(hWnd, SW_RESTORE);
            SetForegroundWindow(hWnd);
        }
        else if (lParam == WM_RBUTTONUP) {
            HMENU hMenu = CreatePopupMenu();
            if (hMenu) {
                InsertMenuW(hMenu, 0, MF_BYPOSITION | MF_STRING, 1, L"Restaurar");
                InsertMenuW(hMenu, 1, MF_BYPOSITION | MF_STRING, 2, L"Cerrar");
                
                POINT pt;
                GetCursorPos(&pt);
                
                SetForegroundWindow(hWnd);
                TrackPopupMenu(hMenu, TPM_BOTTOMALIGN | TPM_LEFTALIGN, pt.x, pt.y, 0, hWnd, NULL);
                DestroyMenu(hMenu);
            }
        }
        break;
    case WM_COMMAND:
        {
            int wmId = LOWORD(wParam);
            if (wmId == 1) { // Restaurar
                ShowWindow(hWnd, SW_RESTORE);
                SetForegroundWindow(hWnd);
            }
            else if (wmId == 2) { // Cerrar
                RemoveTrayIcon();
                DestroyWindow(hWnd);
            }
        }
        break;
    case WM_DESTROY:
        PostQuitMessage(0);
        break;
    default:
        return DefWindowProcW(hWnd, message, wParam, lParam);
    }
    return 0;
}

void AppWindow::RunMessageLoop()
{
    MSG msg;
    while (GetMessageW(&msg, nullptr, 0, 0))
    {
        TranslateMessage(&msg);
        DispatchMessageW(&msg);
    }
}
