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
