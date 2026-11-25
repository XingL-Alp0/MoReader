; MoRead per-user file association registration.
; Register directly from the installer so it does not depend on launching the
; app while files are still being written.

!macro customInstall
  WriteRegStr HKCU "Software\Classes\MoRead.Markdown" "" "Markdown 文档"
  WriteRegStr HKCU "Software\Classes\MoRead.Markdown" "FriendlyTypeName" "Markdown 文档"
  WriteRegStr HKCU "Software\Classes\MoRead.Markdown\DefaultIcon" "" '"$INSTDIR\MoRead.exe",0'
  WriteRegStr HKCU "Software\Classes\MoRead.Markdown\shell\open\command" "" '"$INSTDIR\MoRead.exe" "%1"'
  WriteRegStr HKCU "Software\Classes\MoRead.Markdown\shell\edit\command" "" '"$INSTDIR\MoRead.exe" "%1"'

  WriteRegStr HKCU "Software\Classes\.md" "" "MoRead.Markdown"
  WriteRegStr HKCU "Software\Classes\.md" "Content Type" "text/markdown"
  WriteRegStr HKCU "Software\Classes\.md" "PerceivedType" "text"
  WriteRegStr HKCU "Software\Classes\.md\OpenWithProgids" "MoRead.Markdown" ""

  WriteRegStr HKCU "Software\Classes\.markdown" "" "MoRead.Markdown"
  WriteRegStr HKCU "Software\Classes\.markdown" "Content Type" "text/markdown"
  WriteRegStr HKCU "Software\Classes\.markdown" "PerceivedType" "text"
  WriteRegStr HKCU "Software\Classes\.markdown\OpenWithProgids" "MoRead.Markdown" ""

  WriteRegStr HKCU "Software\Classes\.mdown" "" "MoRead.Markdown"
  WriteRegStr HKCU "Software\Classes\.mdown" "Content Type" "text/markdown"
  WriteRegStr HKCU "Software\Classes\.mdown" "PerceivedType" "text"
  WriteRegStr HKCU "Software\Classes\.mdown\OpenWithProgids" "MoRead.Markdown" ""

  WriteRegStr HKCU "Software\MoRead\Capabilities" "ApplicationName" "墨阅 MoRead"
  WriteRegStr HKCU "Software\MoRead\Capabilities" "ApplicationDescription" "优雅的 Markdown 阅读与编辑器"
  WriteRegStr HKCU "Software\MoRead\Capabilities" "ApplicationIcon" '"$INSTDIR\MoRead.exe",0'
  WriteRegStr HKCU "Software\MoRead\Capabilities\FileAssociations" ".md" "MoRead.Markdown"
  WriteRegStr HKCU "Software\MoRead\Capabilities\FileAssociations" ".markdown" "MoRead.Markdown"
  WriteRegStr HKCU "Software\MoRead\Capabilities\FileAssociations" ".mdown" "MoRead.Markdown"
  WriteRegStr HKCU "Software\RegisteredApplications" "MoRead" "Software\MoRead\Capabilities"

  nsExec::Exec '"$SYSDIR\ie4uinit.exe" -show'
!macroend

!macro customUnInstall
  DeleteRegKey HKCU "Software\Classes\MoRead.Markdown"
  DeleteRegKey HKCU "Software\MoRead\Capabilities"
  DeleteRegKey HKCU "Software\MoRead"
  DeleteRegValue HKCU "Software\RegisteredApplications" "MoRead"

  DeleteRegValue HKCU "Software\Classes\.md\OpenWithProgids" "MoRead.Markdown"
  DeleteRegValue HKCU "Software\Classes\.markdown\OpenWithProgids" "MoRead.Markdown"
  DeleteRegValue HKCU "Software\Classes\.mdown\OpenWithProgids" "MoRead.Markdown"

  ; Only clear each extension's legacy default if it still points at MoRead.
  ReadRegStr $0 HKCU "Software\Classes\.md" ""
  StrCmp $0 "MoRead.Markdown" 0 +2
    DeleteRegValue HKCU "Software\Classes\.md" ""
  ReadRegStr $0 HKCU "Software\Classes\.markdown" ""
  StrCmp $0 "MoRead.Markdown" 0 +2
    DeleteRegValue HKCU "Software\Classes\.markdown" ""
  ReadRegStr $0 HKCU "Software\Classes\.mdown" ""
  StrCmp $0 "MoRead.Markdown" 0 +2
    DeleteRegValue HKCU "Software\Classes\.mdown" ""
!macroend
