#pragma once
#include <windows.h>
#include <wrl.h>
#include <WebView2.h>
#include <string>

using namespace Microsoft::WRL;

class AppWindow
{
public:
    AppWindow(HINSTANCE hInstance);
    ~AppWindow();

    bool Initialize(int nCmdShow);
    void RunMessageLoop();

private:
    static LRESULT CALLBACK WndProc(HWND hWnd, UINT message, WPARAM wParam, LPARAM lParam);
    LRESULT HandleMessage(HWND hWnd, UINT message, WPARAM wParam, LPARAM lParam);

    void InitializeWebView();
    void ResizeWebView();
    
    // UI Helpers for custom titlebar/drag
    LRESULT HitTestNCA(HWND hWnd, WPARAM wParam, LPARAM lParam);
    
    // System Tray
    void SetupTrayIcon(HWND hWnd);
    void RemoveTrayIcon();

    HINSTANCE m_hInstance;
    HWND m_hWnd;
    NOTIFYICONDATAW m_nid;

    ComPtr<ICoreWebView2Environment> m_webViewEnvironment;
    ComPtr<ICoreWebView2Controller> m_webViewController;
    ComPtr<ICoreWebView2> m_webView;
};
