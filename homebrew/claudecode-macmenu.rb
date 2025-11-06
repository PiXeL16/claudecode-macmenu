# ABOUTME: Homebrew cask formula for installing Claude Code Menu via brew
# ABOUTME: Defines app metadata, download URL, installation steps, and uninstall cleanup
cask "claude-code-macmenu" do
  version "0.2.0"
  sha256 "8c32f613b18f62abe8f9bae2d5f93c64803edeff34306d508d3cb9e023791a67"

  url "https://github.com/PiXeL16/claudecode-macmenu/releases/download/v#{version}/Claude-Code-Menu-#{version}-arm64-mac.zip"
  name "Claude Code Menu"
  desc "Menu bar app for Claude Code with real-time notifications and usage analytics"
  homepage "https://github.com/PiXeL16/claudecode-macmenu"

  livecheck do
    url :url
    strategy :github_latest
  end

  depends_on macos: ">= :high_sierra"
  depends_on arch: :arm64

  app "Claude Code Menu.app"

  zap trash: [
    "~/Library/Application Support/claudecode-macmenu",
    "~/Library/Preferences/com.claudecode.macmenu.plist",
    "~/Library/Logs/claudecode-macmenu",
    "~/.config/claude-code/hooks.json.backup",
  ]

  caveats <<~EOS
    To enable real-time notifications:
    1. Open Claude Code Menu from Applications
    2. The app will prompt you to install Claude Code hooks
    3. Click "Install Hooks" to set up integration

    Features:
    - Real-time notifications for Claude Code events
    - Comprehensive analytics dashboard (Cmd+A)
    - Token usage and cost tracking
  EOS
end
