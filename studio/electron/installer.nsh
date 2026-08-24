; Custom NSIS include for the TETROBOT installer (electron-builder).
; Adds a "Create a desktop shortcut" checkbox to the Finish page so the user chooses
; (instead of always creating one). The Welcome + directory-chooser + Finish pages are
; provided by electron-builder's wizard (oneClick:false, allowToChangeInstallationDirectory).

!macro customHeader
  ; (reserved for future custom branding hooks)
!macroend

; Finish-page option: a ticked checkbox that creates the desktop shortcut on finish.
!define MUI_FINISHPAGE_SHOWREADME ""
!define MUI_FINISHPAGE_SHOWREADME_TEXT "Create a desktop shortcut"
!define MUI_FINISHPAGE_SHOWREADME_FUNCTION CreateDesktopShortcutOpt

Function CreateDesktopShortcutOpt
  CreateShortCut "$DESKTOP\${PRODUCT_FILENAME}.lnk" "$INSTDIR\${PRODUCT_FILENAME}.exe"
FunctionEnd

; Remove the desktop shortcut on uninstall (harmless if it was never created).
!macro customUnInstall
  Delete "$DESKTOP\${PRODUCT_FILENAME}.lnk"
!macroend
