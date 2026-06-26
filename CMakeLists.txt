cmake_minimum_required(VERSION 3.15)
project(MySocialDesktop CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Fetch WebView2 Nuget Package
include(FetchContent)
FetchContent_Declare(
  webview2
  URL "https://www.nuget.org/api/v2/package/Microsoft.Web.WebView2/1.0.2592.51"
)
FetchContent_MakeAvailable(webview2)

add_executable(MySocialDesktop WIN32 
    src/main.cpp 
    src/AppWindow.cpp
    app.rc
)

target_include_directories(MySocialDesktop PRIVATE ${webview2_SOURCE_DIR}/build/native/include)

if(CMAKE_SIZEOF_VOID_P EQUAL 8)
    target_link_directories(MySocialDesktop PRIVATE ${webview2_SOURCE_DIR}/build/native/x64)
else()
    target_link_directories(MySocialDesktop PRIVATE ${webview2_SOURCE_DIR}/build/native/x86)
endif()

target_link_libraries(MySocialDesktop PRIVATE 
    WebView2Loader.dll.lib 
    user32.lib 
    gdi32.lib 
    ole32.lib 
    shlwapi.lib
    shell32.lib
)

# Copy WebView2Loader.dll to output directory
if(CMAKE_SIZEOF_VOID_P EQUAL 8)
    add_custom_command(TARGET MySocialDesktop POST_BUILD
        COMMAND ${CMAKE_COMMAND} -E copy_if_different
        "${webview2_SOURCE_DIR}/build/native/x64/WebView2Loader.dll"
        "$<TARGET_FILE_DIR:MySocialDesktop>")
else()
    add_custom_command(TARGET MySocialDesktop POST_BUILD
        COMMAND ${CMAKE_COMMAND} -E copy_if_different
        "${webview2_SOURCE_DIR}/build/native/x86/WebView2Loader.dll"
        "$<TARGET_FILE_DIR:MySocialDesktop>")
endif()
