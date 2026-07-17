#include <windows.h>
#include <objbase.h>
#include "AppWindow.h"

int APIENTRY wWinMain(_In_ HINSTANCE hInstance,
                     _In_opt_ HINSTANCE hPrevInstance,
                     _In_ LPWSTR    lpCmdLine,
                     _In_ int       nCmdShow)
{
    // Initialize COM
    HRESULT hr = CoInitializeEx(nullptr, COINIT_APARTMENTTHREADED | COINIT_DISABLE_OLE1DDE);
    if (FAILED(hr))
    {
        return FALSE;
    }

    // Prevent multiple instances
    HANDLE hMutex = CreateMutexW(NULL, TRUE, L"MySocialDesktop_SingleInstance_Mutex");
    if (GetLastError() == ERROR_ALREADY_EXISTS)
    {
        // Find existing window and bring to front
        HWND hExisting = FindWindowW(L"MySocialDesktopWindowClass", L"MySocialDesktop");
        if (hExisting) {
            ShowWindow(hExisting, SW_RESTORE);
            SetForegroundWindow(hExisting);
        }
        CoUninitialize();
        return 0;
    }

    AppWindow app(hInstance);

    if (!app.Initialize(nCmdShow))
    {
        CoUninitialize();
        return FALSE;
    }

    app.RunMessageLoop();

    CoUninitialize();
    return 0;
}
