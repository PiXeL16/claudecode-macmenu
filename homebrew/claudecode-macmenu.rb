# ABOUTME: Homebrew cask formula for installing Claude Code Menu via brew
# ABOUTME: Defines app metadata, download URL, installation steps, and uninstall cleanup
cask "claudecode-macmenu" do
  version "0.1.0"
  sha256 :no_check  # Will be calculated on first release

  url "https://github.com/PiXeL16/claudecode-macmenu/releases/download/v#{version}/Claude.Code.Menu-#{version}-arm64-mac.zip"
  name "Claude Code Menu"
  desc "Mac menu bar app for Claude Code with notifications and analytics"
  homepage "https://github.com/PiXeL16/claudecode-macmenu"

  livecheck do
    url :url
    strategy :github_latest
  end

  auto_updates false

  app "Claude Code Menu.app"

  zap trash: [
    "~/Library/Application Support/claudecode-macmenu",
    "~/Library/Preferences/com.claudecode.macmenu.plist",
    "~/Library/Logs/claudecode-macmenu",
  ]

  caveats <<~EOS
    To enable real-time notifications:
    1. Open Claude Code Menu from Applications
    2. Go to Preferences
    3. Click "Install Hooks" to set up Claude Code integration

    The app will run in your menu bar and provide:
    - Real-time notifications for Claude Code events
    - Token usage and cost tracking
    - Comprehensive analytics dashboard
  EOS
end
